import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { CATEGORIES, rolesForGroup } from '../lib/catalog.js';
import { TAXONOMY } from '../lib/taxonomy.js';
import { EMPLOYMENT_TYPES } from '../lib/employment.js';
import { SUB_CITY_COORDS } from '../lib/geo.js';
import { wageFloors, feeBreakdown, LIVING_WAGE } from '../lib/wage.js';
import { ah } from '../middleware/auth.js';

export const catalogRouter = Router();

export const SUB_CITIES = Object.keys(SUB_CITY_COORDS);

// Domestic / housemaid groups — Serategna's primary informal-sector focus.
export const DOMESTIC_GROUPS = ['home_cleaning', 'care_domestic'];

// ── Categories = 20 taxonomy groups (trilingual; domestic flagged) ───────────
catalogRouter.get('/categories', (_req, res) =>
  res.json(CATEGORIES.map((c) => ({ ...c, domestic: DOMESTIC_GROUPS.includes(c.key) }))),
);

// ── Living-wage floor (prorated) ─────────────────────────────────────────────
catalogRouter.get('/living-wage', (req, res) => {
  const liveIn = String(req.query.liveIn ?? '') === 'true';
  res.json({ ...wageFloors(liveIn), monthlyBase: LIVING_WAGE.monthly, liveInMonthly: LIVING_WAGE.liveInMonthly, liveIn });
});

// ── Transparent fee preview (anti-delala) ────────────────────────────────────
catalogRouter.get(
  '/fee-preview',
  ah(async (req, res) => {
    const q = z
      .object({
        amount: z.coerce.number().positive(),
        vertical: z.string().default('home'),
        accountType: z.string().optional(),
      })
      .parse(req.query);
    res.json(feeBreakdown(q.amount, q.vertical, q.accountType));
  }),
);

// Full taxonomy (groups + roles) for search / CV / filters
catalogRouter.get('/taxonomy', (_req, res) => res.json(TAXONOMY));

// Roles (specializations) for a group
catalogRouter.get('/roles', (req, res) => {
  const group = String(req.query.group ?? '');
  res.json(rolesForGroup(group));
});

// Sub-cities with centroids (for the map picker default center)
catalogRouter.get('/sub-cities', (_req, res) =>
  res.json(SUB_CITIES.map((name) => ({ name, ...SUB_CITY_COORDS[name] }))),
);

catalogRouter.get('/employment-types', (_req, res) => res.json(EMPLOYMENT_TYPES));

// ── Fair-price band for a category + sub-city (spec B2.1) ────────────────────
catalogRouter.get(
  '/price-band',
  ah(async (req, res) => {
    const { category, subCity } = z
      .object({ category: z.string(), subCity: z.string().default('Bole') })
      .parse(req.query);
    const band = await prisma.priceBand.findUnique({
      where: { category_subCity: { category, subCity } },
    });
    const fallback = CATEGORIES.find((c) => c.key === category);
    res.json(
      band ?? { category, subCity, low: fallback?.bandLow ?? 0, high: fallback?.bandHigh ?? 0 },
    );
  }),
);
