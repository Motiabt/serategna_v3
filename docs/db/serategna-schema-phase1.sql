-- ============================================================================
-- SERATEGNA — Phase 1 Database Schema
-- PostgreSQL 16 + PostGIS
-- Reference: Master Specification v3.0, Part B3.2 (escrow ledger) and B3.3
--             (core data model table)
--
-- Scope: everything required for Sprints S1–S12 (Part E2) — the marketplace,
-- escrow ledger, tiered identity, agents, ratings, disputes and SoS.
-- Phase 2/3 additions (Score engine, consent ledger, equb, etc.) live in
-- serategna-schema-phase2-3.sql and are layered on top of these tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Helper: generic updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- USERS & AUTH
-- ============================================================================

-- One row per phone number. role flags allow a single person to be a
-- worker, client and/or agent at once (common in practice — a delala
-- agent often also takes jobs).
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone               VARCHAR(20) NOT NULL UNIQUE,
    phone_verified_at   TIMESTAMPTZ,
    is_worker           BOOLEAN NOT NULL DEFAULT false,
    is_client           BOOLEAN NOT NULL DEFAULT false,
    is_agent            BOOLEAN NOT NULL DEFAULT false,
    language            VARCHAR(2) NOT NULL DEFAULT 'am'
                          CHECK (language IN ('am','om','en')),
    -- Tiered identity per B2.2
    tier                SMALLINT NOT NULL DEFAULT 0
                          CHECK (tier IN (0,1,2)),
    fayda_id_ciphertext BYTEA,            -- app-layer encrypted Fayda number (E1)
    fayda_status        VARCHAR(12) NOT NULL DEFAULT 'none'
                          CHECK (fayda_status IN ('none','pending','verified')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_phone ON users(phone);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- JWT refresh tokens: 30-day, single-use rotation (E1)
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    rotated_from_id UUID REFERENCES refresh_tokens(id),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);


-- ============================================================================
-- PROFILES
-- ============================================================================

CREATE TABLE client_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_type    VARCHAR(10) NOT NULL DEFAULT 'household'
                      CHECK (profile_type IN ('household','business')),
    display_name    VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved addresses for clients (and home base for workers, via worker_profiles)
CREATE TABLE addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           VARCHAR(60),                -- e.g. "Home", "Office"
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    sub_city        VARCHAR(60),
    raw_address     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);

-- worker_profiles: per B3.3 — categories[], bio, service_radius, sub_city,
-- availability, instant_dispatch, female_client_only_flag, vouched_by
CREATE TABLE worker_profiles (
    user_id                     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    categories                  TEXT[] NOT NULL DEFAULT '{}',
    bio_text                    TEXT,
    bio_voice_ref               TEXT,             -- storage ref for voice-note bio
    service_radius_m            INTEGER NOT NULL DEFAULT 5000,
    sub_city                    VARCHAR(60),
    home_location                GEOGRAPHY(Point, 4326),
    availability                JSONB NOT NULL DEFAULT '{}'::jsonb,
    instant_dispatch             BOOLEAN NOT NULL DEFAULT false,
    female_client_only_flag      BOOLEAN NOT NULL DEFAULT false,
    vouched_by_user_id           UUID REFERENCES users(id),   -- agent or worker id
    completion_rate              NUMERIC(5,4),     -- cached, recomputed from jobs/ratings
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_worker_profiles_location ON worker_profiles USING GIST(home_location);
CREATE INDEX idx_worker_profiles_categories ON worker_profiles USING GIN(categories);

CREATE TRIGGER trg_worker_profiles_updated_at
    BEFORE UPDATE ON worker_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- AGENTS (delala) — B1 item 4, B3.3
-- ============================================================================

CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    territory           TEXT[] NOT NULL DEFAULT '{}',   -- sub-cities covered
    onboarding_count    INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(10) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive')),
    recruited_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- IDENTITY VERIFICATION — Tiered gate, B2.2
-- ============================================================================

CREATE TABLE verification_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_refs        TEXT[] NOT NULL DEFAULT '{}',
    reviewer_id     UUID REFERENCES users(id),
    decision        VARCHAR(10) NOT NULL DEFAULT 'pending'
                      CHECK (decision IN ('pending','approved','rejected')),
    mosip_txn_id    VARCHAR(64),               -- populated once MOSIP API access is granted
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at      TIMESTAMPTZ
);
CREATE INDEX idx_verification_queue_decision ON verification_queue(decision);
CREATE INDEX idx_verification_queue_user ON verification_queue(user_id);


-- ============================================================================
-- JOBS — lifecycle state machine, B2.1 / B3.3
-- ============================================================================

CREATE TABLE jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES users(id),
    assigned_worker_id  UUID REFERENCES users(id),
    category            VARCHAR(60) NOT NULL,
    description         TEXT,                       -- text or transcribed voice note
    media_refs          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- photos, voice-note refs
    location            GEOGRAPHY(Point, 4326) NOT NULL,
    sub_city            VARCHAR(60),

    pricing_mode        VARCHAR(5) NOT NULL CHECK (pricing_mode IN ('fixed','bid')),
    listed_price        NUMERIC(12,2),
    price_band_min      NUMERIC(12,2),              -- fair-price guidance band shown to client
    price_band_max      NUMERIC(12,2),

    -- accept -> travel -> start -> complete -> confirm, with disputed/cancelled/refunded branches
    status              VARCHAR(20) NOT NULL DEFAULT 'posted'
                          CHECK (status IN (
                              'posted','accepted','traveling','started',
                              'completed','confirmed','disputed','cancelled','refunded'
                          )),

    source              VARCHAR(10) NOT NULL DEFAULT 'app'
                          CHECK (source IN ('app','telegram')),

    accepted_at         TIMESTAMPTZ,
    travel_started_at   TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    start_geo           GEOGRAPHY(Point, 4326),     -- geo-stamp on start
    completed_at        TIMESTAMPTZ,
    complete_geo        GEOGRAPHY(Point, 4326),     -- geo-stamp on completion
    photo_proof_refs    JSONB NOT NULL DEFAULT '[]'::jsonb,
    confirmed_at        TIMESTAMPTZ,                -- client confirmation or 24h auto-confirm

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_worker ON jobs(assigned_worker_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Agent commission ledger link (B3.3: agents.commission ledger link)
CREATE TABLE agent_commissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES users(id),
    job_id          UUID REFERENCES jobs(id),          -- null for onboarding commission
    commission_type VARCHAR(20) NOT NULL
                      CHECK (commission_type IN ('onboarding','transaction_share')),
    amount          NUMERIC(12,2) NOT NULL,
    period_month    DATE,
    status          VARCHAR(10) NOT NULL DEFAULT 'accrued'
                      CHECK (status IN ('accrued','paid')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_worker ON agent_commissions(worker_id);


-- ============================================================================
-- BIDS / NEGOTIATION — B3.3 "bids / job_threads"
-- ============================================================================

CREATE TABLE bids (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id   UUID NOT NULL REFERENCES users(id),
    amount      NUMERIC(12,2) NOT NULL,
    message     TEXT,
    status      VARCHAR(10) NOT NULL DEFAULT 'offered'
                  CHECK (status IN ('offered','countered','accepted','rejected','withdrawn')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bids_job ON bids(job_id);
CREATE INDEX idx_bids_worker ON bids(worker_id);

CREATE TRIGGER trg_bids_updated_at
    BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Negotiation history preserved in full — this is the "pricing intelligence
-- corpus" referenced in B3.3, used later to build per-category/sub-city
-- fair-price bands.
CREATE TABLE negotiation_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id      UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id),
    message     TEXT,
    amount      NUMERIC(12,2),       -- counter-offer amount, if any
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_negotiation_messages_bid ON negotiation_messages(bid_id);


-- ============================================================================
-- ESCROW LEDGER — B3.2, the heart of Phase 1
-- ============================================================================

-- Append-only double-entry journal. Every row is ONE LEG of a transaction;
-- two (or more) rows sharing a txn_id must net to zero per currency.
-- Accounts per B3.2: client_funds_in_escrow, worker_payable,
-- platform_commission, guarantee_reserve, refunds.
CREATE TABLE ledger_entries (
    id                   BIGSERIAL PRIMARY KEY,
    txn_id               UUID NOT NULL,
    account_type         VARCHAR(24) NOT NULL CHECK (account_type IN (
                             'client_funds_in_escrow',
                             'worker_payable',
                             'platform_commission',
                             'guarantee_reserve',
                             'refunds'
                         )),
    direction            VARCHAR(6) NOT NULL CHECK (direction IN ('debit','credit')),
    owner_user_id        UUID REFERENCES users(id),   -- worker/client this leg belongs to, where relevant
    amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency             CHAR(3) NOT NULL DEFAULT 'ETB',
    job_id               UUID REFERENCES jobs(id),
    external_ref         VARCHAR(120),                -- aggregator/bank reference
    reversal_of_entry_id BIGINT REFERENCES ledger_entries(id),  -- corrections only
    posted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entries_txn ON ledger_entries(txn_id);
CREATE INDEX idx_ledger_entries_job ON ledger_entries(job_id);
CREATE INDEX idx_ledger_entries_owner ON ledger_entries(owner_user_id);
CREATE INDEX idx_ledger_entries_account_type ON ledger_entries(account_type);

-- ----------------------------------------------------------------------------
-- Append-only enforcement (E1: "no UPDATE or DELETE grants at the database
-- role level"). Replace app_write_role with the actual role the API connects
-- as, and run this AFTER the role exists. Corrections must be new rows that
-- reference reversal_of_entry_id, never UPDATE/DELETE of existing rows.
--
--   REVOKE UPDATE, DELETE ON ledger_entries FROM app_write_role;
--   GRANT INSERT, SELECT ON ledger_entries TO app_write_role;
-- ----------------------------------------------------------------------------


-- Per-job escrow state machine: FUNDED -> HELD -> RELEASED -> PAID_OUT,
-- with DISPUTED / REFUNDED branches (B3.2). One row per job; the ledger
-- entries are the source of truth, this table is the fast-lookup projection.
CREATE TABLE job_escrow_states (
    job_id          UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    state           VARCHAR(12) NOT NULL DEFAULT 'funded'
                      CHECK (state IN ('funded','held','released','paid_out','disputed','refunded')),
    amount          NUMERIC(12,2) NOT NULL,
    funded_at       TIMESTAMPTZ,
    held_at         TIMESTAMPTZ,
    released_at     TIMESTAMPTZ,
    paid_out_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_job_escrow_states_updated_at
    BEFORE UPDATE ON job_escrow_states
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Worker withdrawals to their own Telebirr/bank account (B3.3)
CREATE TABLE payouts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id           UUID NOT NULL REFERENCES users(id),
    destination_type    VARCHAR(10) NOT NULL CHECK (destination_type IN ('telebirr','bank')),
    destination_ref     TEXT NOT NULL,        -- app-layer encrypted account/number
    amount              NUMERIC(12,2) NOT NULL,
    status              VARCHAR(12) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','completed','failed')),
    external_ref        VARCHAR(120),
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);
CREATE INDEX idx_payouts_worker ON payouts(worker_id);
CREATE INDEX idx_payouts_status ON payouts(status);


-- ============================================================================
-- RATINGS — B3.3
-- ============================================================================

CREATE TABLE ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES jobs(id),
    rater_id    UUID NOT NULL REFERENCES users(id),
    ratee_id    UUID NOT NULL REFERENCES users(id),
    stars       SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    tags        TEXT[] NOT NULL DEFAULT '{}',
    text        TEXT,
    repeat_pair BOOLEAN NOT NULL DEFAULT false,   -- computed: same client/worker pair, prior job exists
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, rater_id)
);
CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);


-- ============================================================================
-- DISPUTES — B3.3, 48h SLA per B1
-- ============================================================================

CREATE TABLE disputes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id           UUID NOT NULL REFERENCES jobs(id),
    opener_id        UUID NOT NULL REFERENCES users(id),
    reason           VARCHAR(40) NOT NULL,
    description      TEXT,
    evidence_refs    JSONB NOT NULL DEFAULT '[]'::jsonb,
    mediator_id      UUID REFERENCES users(id),
    status           VARCHAR(12) NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','in_review','resolved','escalated')),
    resolution       VARCHAR(40),
    resolution_notes TEXT,
    sla_due_at       TIMESTAMPTZ NOT NULL,        -- opened_at + 48h
    opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ
);
CREATE INDEX idx_disputes_job ON disputes(job_id);
CREATE INDEX idx_disputes_status ON disputes(status);


-- ============================================================================
-- SAFETY — SoS, B2.1 / B3.3 / E1
-- ============================================================================

CREATE TABLE sos_events (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                 UUID REFERENCES jobs(id),
    triggered_by_user_id   UUID NOT NULL REFERENCES users(id),
    trigger_type           VARCHAR(10) NOT NULL CHECK (trigger_type IN ('button','silent')),
    gps_trail              GEOGRAPHY(LineString, 4326),
    -- Encrypted with the emergency-response provider's public key; Serategna
    -- cannot decrypt this (E1). audio_ref is a storage pointer only.
    audio_ref              TEXT,
    alert_chain            JSONB NOT NULL DEFAULT '[]'::jsonb,   -- log of contacts/escalations
    account_freeze_applied BOOLEAN NOT NULL DEFAULT false,
    status                 VARCHAR(10) NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','resolved')),
    triggered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at            TIMESTAMPTZ
);
CREATE INDEX idx_sos_events_user ON sos_events(triggered_by_user_id);
CREATE INDEX idx_sos_events_status ON sos_events(status);


-- ============================================================================
-- NOTIFICATIONS — FCM + SMS fallback + Telegram (B3.1)
-- ============================================================================

CREATE TABLE notifications_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('push','sms','telegram')),
    template_key    VARCHAR(60) NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          VARCHAR(10) NOT NULL DEFAULT 'sent'
                      CHECK (status IN ('sent','failed','delivered')),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_log_user ON notifications_log(user_id);


-- ============================================================================
-- END OF PHASE 1 SCHEMA
-- See serategna-schema-phase2-3.sql for Score engine, consent ledger,
-- guarantors, EWA/nano-loans (Phase 2) and equb/insurance/business
-- accounts/diaspora (Phase 3).
-- ============================================================================
