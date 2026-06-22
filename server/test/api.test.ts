import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

const CLIENT = '+251922000001';
const WORKER = '+251911000001';
const ADMIN = '+251900000000';

async function login(phone: string): Promise<string> {
  const otp = await request(app).post('/api/auth/otp/request').send({ phone, purpose: 'login' });
  expect(otp.status).toBe(200);
  const code = otp.body.devCode as string;
  const res = await request(app).post('/api/auth/login').send({ phone, code });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('health & readiness', () => {
  it('GET /health is ok', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });
  it('GET /ready confirms DB connectivity', async () => {
    const r = await request(app).get('/ready');
    expect(r.status).toBe(200);
    expect(r.body.db).toBe('up');
  });
  it('attaches an x-request-id to every response', async () => {
    const r = await request(app).get('/health');
    expect(r.headers['x-request-id']).toBeTruthy();
  });
});

describe('auth (OTP + JWT)', () => {
  it('issues a token for a valid OTP', async () => {
    const token = await login(WORKER);
    expect(token.length).toBeGreaterThan(20);
  });
  it('rejects a wrong OTP code', async () => {
    await request(app).post('/api/auth/otp/request').send({ phone: WORKER, purpose: 'login' });
    const r = await request(app).post('/api/auth/login').send({ phone: WORKER, code: '000000' });
    expect(r.status).toBe(401);
  });
});

describe('authorization', () => {
  it('blocks an unauthenticated admin call (401)', async () => {
    const r = await request(app).get('/api/admin/kpis');
    expect(r.status).toBe(401);
  });
  it('blocks a worker from the admin console (403)', async () => {
    const t = await login(WORKER);
    const r = await request(app).get('/api/admin/kpis').set(bearer(t));
    expect(r.status).toBe(403);
  });
  it('lets an admin in', async () => {
    const t = await login(ADMIN);
    const r = await request(app).get('/api/admin/reconciliation').set(bearer(t));
    expect(r.status).toBe(200);
    expect(r.body.balanced).toBe(true); // ledger reconciles to variance 0
  });
});

describe('money rules', () => {
  it('rejects a job posted below the wage floor (400)', async () => {
    const t = await login(CLIENT);
    await request(app).post('/api/subscription/subscribe').set(bearer(t)).send({ plan: 'monthly' });
    const r = await request(app)
      .post('/api/jobs')
      .set(bearer(t))
      .send({ category: 'home_cleaning', vertical: 'home', title: 'Underpaid maid', subCity: 'Bole', pricingMode: 'fixed', fixedPrice: 50, rateType: 'monthly', employmentType: 'permanent' });
    expect(r.status).toBe(400);
  });
});

describe('pagination & error handling', () => {
  it('clamps an excessive feed limit', async () => {
    const t = await login(WORKER);
    const r = await request(app).get('/api/jobs/feed?limit=99999').set(bearer(t));
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeLessThanOrEqual(100);
  });
  it('returns 400 (not 500) on bad input', async () => {
    const t = await login(CLIENT);
    const r = await request(app).post('/api/jobs').set(bearer(t)).send({ title: 'x' });
    expect(r.status).toBe(400);
  });
  it('returns 404 for an unknown route', async () => {
    const r = await request(app).get('/api/this-does-not-exist');
    expect(r.status).toBe(404);
  });
});

describe('public & reference surfaces', () => {
  it('serves 3 enterprise packages', async () => {
    const r = await request(app).get('/api/enterprise/packages');
    expect(r.status).toBe(200);
    expect(r.body.length).toBe(3);
  });
  it('captures a public lead', async () => {
    const r = await request(app).post('/api/enterprise/lead').send({ kind: 'enterprise', name: 'Vitest QA', contact: '+251900000111' });
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(true);
  });
  it('serves the no-login income passport', async () => {
    const t = await login(WORKER);
    const me = await request(app).get('/api/auth/me').set(bearer(t));
    const r = await request(app).get(`/api/public/worker/${me.body.id ?? me.body.user?.id}`);
    expect(r.status).toBe(200);
    expect(r.body.name).toBeTruthy();
  });
});
