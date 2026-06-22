import { prisma } from '../src/lib/prisma.js';
import { ACCOUNTS, post, splitJob } from '../src/lib/ledger.js';
import { snapshotScore } from '../src/lib/score.js';
import { CATEGORIES } from '../src/lib/catalog.js';

const SUB_CITIES = ['Bole', 'Yeka'];

// Addis Ababa sub-city approximate centroids
const COORDS: Record<string, { lat: number; lng: number }> = {
  Bole: { lat: 9.0108, lng: 38.7895 },
  Yeka: { lat: 9.0411, lng: 38.8003 },
};

function jitter(base: { lat: number; lng: number }) {
  return { lat: base.lat + (Math.random() - 0.5) * 0.03, lng: base.lng + (Math.random() - 0.5) * 0.03 };
}

async function reset() {
  // order matters for FK constraints
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.psychometricResult.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.guarantor.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.savedItem.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.enterpriseTalent.deleteMany();
  await prisma.enterpriseMember.deleteMany();
  await prisma.enterprise.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.sosEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.scoreSnapshot.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.job.deleteMany();
  await prisma.priceBand.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
}

async function seedPriceBands() {
  for (const c of CATEGORIES) {
    for (const sc of SUB_CITIES) {
      const spread = 1 + (sc === 'Bole' ? 0.1 : 0);
      await prisma.priceBand.create({
        data: {
          category: c.key,
          subCity: sc,
          low: Math.round(c.bandLow * spread),
          high: Math.round(c.bandHigh * spread),
        },
      });
    }
  }
}

interface WorkerSpec {
  phone: string;
  name: string;
  categories: string[]; // taxonomy group keys
  roles: string[]; // specialization role keys
  subCity: string;
  tier: number;
  language: string;
  femaleClientOnly?: boolean;
  history: number[]; // agreed prices of past confirmed jobs
}

const WORKERS: WorkerSpec[] = [
  { phone: '+251911000001', name: 'Hanna Tesfaye', categories: ['home_cleaning'], roles: ['house_cleaner', 'laundry_iron'], subCity: 'Bole', tier: 1, language: 'am', femaleClientOnly: true, history: [400, 450, 380, 500, 420, 460] },
  { phone: '+251911000003', name: 'Dawit Bekele', categories: ['skilled_construction', 'repairs_technical'], roles: ['plumber'], subCity: 'Bole', tier: 1, language: 'am', history: [900, 1200, 800, 1100] },
  { phone: '+251911000004', name: 'Gadisa Lemi', categories: ['skilled_construction'], roles: ['electrician'], subCity: 'Yeka', tier: 1, language: 'om', history: [1500, 1300, 1600, 1200, 1400] },
  { phone: '+251911000005', name: 'Sara Girma', categories: ['home_cleaning', 'care_domestic'], roles: ['house_cleaner', 'nanny'], subCity: 'Bole', tier: 1, language: 'am', femaleClientOnly: true, history: [350, 400, 380] },
  { phone: '+251911000006', name: 'Yonas Alemu', categories: ['delivery_logistics', 'micro_gigs'], roles: ['moto_rider', 'errand_runner'], subCity: 'Bole', tier: 1, language: 'en', history: [150, 200, 180, 220, 160, 190, 210] },
  { phone: '+251911000007', name: 'Meron Haile', categories: ['food_hospitality', 'home_cleaning'], roles: ['private_chef'], subCity: 'Yeka', tier: 0, language: 'am', history: [600, 500] },
  { phone: '+251911000008', name: 'Tadesse Wolde', categories: ['skilled_construction'], roles: ['painter'], subCity: 'Yeka', tier: 0, language: 'am', history: [2000] },
  { phone: '+251911000009', name: 'Liya Solomon', categories: ['agriculture_rural', 'home_cleaning'], roles: ['gardener'], subCity: 'Bole', tier: 1, language: 'om', femaleClientOnly: true, history: [400, 350, 420, 380] },
];

async function main() {
  console.log('Resetting database…');
  await reset();
  await seedPriceBands();

  // Admin
  await prisma.user.create({
    data: {
      phone: '+251900000000',
      name: 'Serategna Ops',
      isClient: false,
      isAdmin: true,
      adminRole: 'super_admin',
      tier: 1,
      faydaStatus: 'verified',
    },
  });

  // Agents (delala)
  const agentUser = await prisma.user.create({
    data: {
      phone: '+251911100001',
      name: 'Abebe Kebede (Agent)',
      isAgent: true,
      tier: 1,
      faydaStatus: 'verified',
      agentProfile: { create: { territory: 'Bole', onboardingCount: 12 } },
    },
  });

  // Clients — including Janani from the reference design + a diaspora client
  const janani = await prisma.user.create({
    data: { phone: '+251922000001', name: 'Janani', language: 'en', tier: 1, faydaStatus: 'verified' },
  });
  const diaspora = await prisma.user.create({
    data: { phone: '+12025550111', email: 'ryan@example.com', name: 'Ryan (Diaspora)', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'diaspora' },
  });
  // an SME/business client
  const biz = await prisma.user.create({
    data: { phone: '+251922000003', name: 'Kaldis Cafe (SME)', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'business' },
  });

  // A LICENSED ORGANISATION (vs. Janani the individual). Organisations carry a
  // business licence + TIN + the legal docs; individuals don't. This one has a
  // full, verified company profile (logo + intro) that brands its job posts.
  const orgLogo =
    'data:image/svg+xml;base64,' +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#0A192F"/><text x="32" y="43" font-family="Arial" font-size="30" font-weight="bold" fill="#22D3EE" text-anchor="middle">S</text></svg>',
    ).toString('base64');
  const org = await prisma.user.create({
    data: { phone: '+251960000002', name: 'Sabegn Facility Services PLC', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'business' },
  });
  await prisma.businessProfile.create({
    data: {
      userId: org.id,
      companyName: 'Sabegn Facility Services PLC',
      sector: 'Facility & cleaning services',
      licenseNo: 'AA/BL/0142/2017',
      tin: '0098765432',
      region: 'Addis Ababa',
      subCity: 'Bole',
      about:
        'Addis-based facility-services company. We recruit, vet and place cleaners, housekeepers, guards and support staff with households, offices and institutions — guarantor-backed and fairly paid.',
      logoUrl: orgLogo,
      verified: true,
    },
  });

  // Active employer subscriptions (so demo employers can post; ETB 100/mo or 1000/yr)
  const mk = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1);
  for (const u of [janani, diaspora, biz, org]) {
    await prisma.subscription.create({
      data: { userId: u.id, role: 'employer', plan: 'monthly', status: 'active', currentPeriodEnd: periodEnd, monthAnchor: mk, postsThisMonth: 1 },
    });
  }
  await prisma.user.create({
    data: { phone: '+251922000002', name: 'Marta Assefa', language: 'am', tier: 1, faydaStatus: 'verified' },
  });
  const clients = [janani, diaspora];

  // Workers + their history (run real jobs through the ledger)
  const workerIds: Record<string, string> = {};
  for (const w of WORKERS) {
    const base = COORDS[w.subCity] ?? COORDS.Bole;
    const loc = jitter(base);
    const user = await prisma.user.create({
      data: {
        phone: w.phone,
        name: w.name,
        language: w.language,
        isWorker: true,
        tier: w.tier,
        faydaStatus: w.tier >= 1 ? 'verified' : 'none',
        faydaNumber: w.tier >= 1 ? `FYD${Math.floor(Math.random() * 1e9)}` : null,
        workerProfile: {
          create: {
            categories: JSON.stringify(w.categories),
            roles: JSON.stringify(w.roles),
            bio: `Experienced ${w.roles[0] ?? w.categories[0]} professional in ${w.subCity}.`,
            subCity: w.subCity,
            lat: loc.lat,
            lng: loc.lng,
            femaleClientOnly: w.femaleClientOnly ?? false,
            vouchedById: agentUser.id,
          },
        },
      },
    });
    workerIds[w.name] = user.id;

    // Replay history as confirmed jobs (Tier 0 keeps earnings in escrow ledger)
    for (let i = 0; i < w.history.length; i++) {
      const price = w.history[i];
      const cat = w.categories[0];
      const vertical = CATEGORIES.find((c) => c.key === cat)?.vertical ?? 'home';
      const client = clients[i % clients.length];
      const daysAgo = (w.history.length - i) * 9;
      const when = new Date(Date.now() - daysAgo * 86400000);
      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          workerId: user.id,
          category: cat,
          vertical,
          title: `${cat} job`,
          subCity: w.subCity,
          lat: loc.lat,
          lng: loc.lng,
          pricingMode: 'bid',
          agreedPrice: price,
          status: 'confirmed',
          paymentMode: 'direct',
          escrowState: 'none',
          paidAt: when,
          startedAt: when,
          completedAt: when,
          confirmedAt: when,
          createdAt: when,
        },
      });
      // Direct (off-platform) payment record — Serategna holds nothing.
      await post([
        { debitAccount: ACCOUNTS.DIRECT_EMPLOYER, creditAccount: ACCOUNTS.DIRECT_WORKER, amount: price, jobId: job.id, ownerId: user.id, memo: 'Seed: direct payment' },
      ]);
      // two-way rating
      const stars = 4 + (Math.random() > 0.4 ? 1 : 0);
      await prisma.rating.create({
        data: { jobId: job.id, raterId: client.id, rateeId: user.id, stars, tags: JSON.stringify(['punctual', 'thorough']), text: 'Great work' },
      });
    }

    // refresh rolling stats + score history
    const completed = w.history.length;
    const agg = await prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: user.id } });
    await prisma.workerProfile.update({
      where: { userId: user.id },
      data: { jobsCompleted: completed, completionRate: 1, avgRating: agg._avg.stars ?? 0 },
    });
    // build a small score trend
    for (let k = 0; k < 4; k++) await snapshotScore(user.id);
  }

  // Open jobs for the live feed
  const openSpecs = [
    { cat: 'home_cleaning', role: 'deep_clean', title: 'Deep clean 2-bedroom apartment', subCity: 'Bole', client: janani, employmentType: 'gig', formality: 'informal', positions: 1, durationLabel: null as string | null },
    { cat: 'skilled_construction', role: 'plumber', title: 'Fix leaking kitchen sink', subCity: 'Bole', client: janani, employmentType: 'gig', formality: 'informal', positions: 1, durationLabel: null },
    { cat: 'home_cleaning', role: 'live_in_keeper', title: 'Full-time live-in housemaid', subCity: 'Bole', client: janani, employmentType: 'permanent', formality: 'formal', positions: 1, durationLabel: 'Permanent', guarantorRequired: true },
    { cat: 'skilled_construction', role: 'electrician', title: 'Site electrician — 3 month contract', subCity: 'Yeka', client: clients[1], employmentType: 'contract', formality: 'formal', positions: 1, durationLabel: '3 months' },
    { cat: 'delivery_logistics', role: 'furniture_mover', title: 'Need 5 workers for office move (1 day)', subCity: 'Bole', client: diaspora, employmentType: 'group_hire', formality: 'informal', positions: 5, durationLabel: '1 day' },
    { cat: 'food_hospitality', role: 'catering_staff', title: 'Catering help for wedding (weekend)', subCity: 'Yeka', client: janani, employmentType: 'short_term', formality: 'informal', positions: 3, durationLabel: '2 days' },
    // Organisation-posted (branded as a company "ad" on the feed)
    { cat: 'home_cleaning', role: 'office_cleaner', title: 'Office cleaners — 6 positions (contract)', subCity: 'Bole', client: org, employmentType: 'group_hire', formality: 'formal', positions: 6, durationLabel: '12 months' },
    { cat: 'home_cleaning', role: 'live_in_keeper', title: 'Managed live-in housekeepers for clients', subCity: 'Bole', client: org, employmentType: 'permanent', formality: 'formal', positions: 1, durationLabel: 'Permanent', guarantorRequired: true },
  ];
  for (const o of openSpecs) {
    const band = await prisma.priceBand.findUnique({ where: { category_subCity: { category: o.cat, subCity: o.subCity } } });
    const base = COORDS[o.subCity] ?? COORDS.Bole;
    const loc = jitter(base);
    const vertical = CATEGORIES.find((c) => c.key === o.cat)?.vertical ?? 'home';
    const job = await prisma.job.create({
      data: {
        clientId: o.client.id,
        category: o.cat,
        role: o.role,
        vertical,
        title: o.title,
        description: 'Posted via Serategna. Fair-price band shown.',
        subCity: o.subCity,
        lat: loc.lat,
        lng: loc.lng,
        pricingMode: 'bid',
        priceBandLow: band?.low ?? 0,
        priceBandHigh: band?.high ?? 0,
        status: 'open',
        employmentType: o.employmentType,
        formality: o.formality,
        positions: o.positions,
        durationLabel: o.durationLabel,
        requiresContract: o.employmentType === 'contract' || o.employmentType === 'permanent',
        guarantorRequired: !!(o as any).guarantorRequired,
        liveIn: o.role === 'live_in_keeper',
      },
    });
    // a couple of bids from matching workers
    const matching = WORKERS.filter((w) => w.categories.includes(o.cat)).slice(0, 2);
    for (const m of matching) {
      await prisma.bid.create({
        data: {
          jobId: job.id,
          workerId: workerIds[m.name],
          amount: Math.round(((band?.low ?? 300) + (band?.high ?? 600)) / 2),
          message: 'I can do this today.',
        },
      });
    }
  }

  // Demo: guarantors (ዋስ), verified certifications & psychometric results
  for (const name of ['Hanna Tesfaye', 'Sara Girma']) {
    await prisma.guarantor.create({
      data: { workerId: workerIds[name], name: 'Abebe Kebede', phone: '+251911100001', relationship: 'family', amountCap: 5000, status: 'active' },
    });
  }
  await prisma.certification.create({
    data: { userId: workerIds['Hanna Tesfaye'], name: 'Housekeeping & Home Management Level II', institution: 'Addis Ababa TVET College', refNo: 'AA-TVET-2023-0481', year: '2023', status: 'verified', decidedAt: new Date() },
  });
  await prisma.certification.create({
    data: { userId: workerIds['Sara Girma'], name: 'Childcare & First Aid', institution: 'Ethiopian Red Cross', refNo: 'ERC-FA-1190', year: '2024', status: 'pending' },
  });
  await prisma.psychometricResult.create({
    data: { userId: workerIds['Hanna Tesfaye'], answers: '[]', reliabilityIndex: 88, traits: JSON.stringify({ conscientiousness: 90, integrity: 92, punctuality: 85, resilience: 84, care: 88 }) },
  });
  await prisma.psychometricResult.create({
    data: { userId: workerIds['Sara Girma'], answers: '[]', reliabilityIndex: 82, traits: JSON.stringify({ conscientiousness: 84, integrity: 88, punctuality: 80, resilience: 78, care: 86 }) },
  });

  // One active in-progress job for Janani
  const hanna = workerIds['Hanna Tesfaye'];
  const activeJob = await prisma.job.create({
    data: {
      clientId: janani.id,
      workerId: hanna,
      category: 'home_cleaning',
      role: 'house_cleaner',
      vertical: 'home',
      title: "Today's cleaning session",
      subCity: 'Bole',
      lat: COORDS.Bole.lat,
      lng: COORDS.Bole.lng,
      pricingMode: 'bid',
      agreedPrice: 450,
      status: 'started',
      paymentMode: 'direct',
      escrowState: 'none',
      startedAt: new Date(),
      liveLat: 8.999,
      liveLng: 38.787,
      liveAt: new Date(),
    },
  });
  void activeJob;

  // A pending verification (for the admin queue demo)
  const meron = workerIds['Meron Haile'];
  await prisma.verificationRequest.create({
    data: { userId: meron, faydaNumber: 'FYD550123987', status: 'pending' },
  });
  await prisma.user.update({ where: { id: meron }, data: { faydaStatus: 'pending' } });

  // ── Sample ENTERPRISES (multi-seat, end-to-end) ────────────────────────────
  // Sabegn = the licensed org, now a full enterprise account: admin + manager
  // seats (role access), a shared talent pool, and its posted jobs.
  const orgLogo2 =
    'data:image/svg+xml;base64,' +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#0A192F"/><text x="32" y="43" font-family="Arial" font-size="30" font-weight="bold" fill="#22D3EE" text-anchor="middle">S</text></svg>',
    ).toString('base64');
  const selam = await prisma.user.create({ data: { phone: '+251960000003', name: 'Selam Tadesse (HR)', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'business' } });
  const bereket = await prisma.user.create({ data: { phone: '+251960000004', name: 'Bereket Alemu (Ops)', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'business' } });
  const sabegn = await prisma.enterprise.create({
    data: {
      name: 'Sabegn Facility Services PLC',
      ownerId: org.id,
      packageKey: 'institution',
      status: 'active',
      seats: 8,
      agreementRef: 'AGR-2026-0042',
      logoUrl: orgLogo2,
      about: 'Institutional facility-services provider — cleaning, housekeeping, security and support staff across Addis Ababa.',
    },
  });
  await prisma.enterpriseMember.createMany({
    data: [
      { enterpriseId: sabegn.id, userId: org.id, role: 'admin', title: 'Account admin' },
      { enterpriseId: sabegn.id, userId: selam.id, role: 'manager', title: 'HR manager' },
      { enterpriseId: sabegn.id, userId: bereket.id, role: 'manager', title: 'Operations manager' },
    ],
  });
  // shared talent pool (a few vetted cleaning/care workers)
  for (const nm of ['Hanna Tesfaye', 'Sara Girma', 'Liya Solomon']) {
    if (workerIds[nm]) {
      await prisma.enterpriseTalent.create({ data: { enterpriseId: sabegn.id, workerId: workerIds[nm], note: 'Vetted · prior placements' } });
    }
  }

  // A second, smaller enterprise on the Team package (admin only)
  const adeyOwner = await prisma.user.create({ data: { phone: '+251960000005', name: 'Adey Abeba Hospitality PLC', language: 'en', tier: 1, faydaStatus: 'verified', accountType: 'business' } });
  await prisma.businessProfile.create({
    data: { userId: adeyOwner.id, companyName: 'Adey Abeba Hospitality PLC', sector: 'Hotels & hospitality', licenseNo: 'AA/BL/0319/2018', tin: '0076543210', region: 'Addis Ababa', subCity: 'Kirkos', about: 'Boutique hotel group hiring hospitality and housekeeping staff.', logoUrl: orgLogo2, verified: true },
  });
  const adey = await prisma.enterprise.create({
    data: { name: 'Adey Abeba Hospitality PLC', ownerId: adeyOwner.id, packageKey: 'team', status: 'active', seats: 3, agreementRef: 'AGR-2026-0067', logoUrl: orgLogo2, about: 'Boutique hotel group.' },
  });
  await prisma.enterpriseMember.create({ data: { enterpriseId: adey.id, userId: adeyOwner.id, role: 'admin', title: 'Account admin' } });
  // give both enterprise owners + new managers active employer subscriptions
  for (const u of [selam, bereket, adeyOwner]) {
    await prisma.subscription.create({ data: { userId: u.id, role: 'employer', plan: 'monthly', status: 'active', currentPeriodEnd: periodEnd, monthAnchor: mk, postsThisMonth: 0 } });
  }

  console.log('Seed complete.');
  console.log('  Admin   : +251900000000');
  console.log('  Client  : +251922000001 (Janani — individual)');
  console.log('  Org     : +251960000002 (Sabegn PLC — enterprise ADMIN)');
  console.log('  Org mgr : +251960000003 / +251960000004 (Sabegn manager seats)');
  console.log('  Worker  : +251911000001 (Hanna, Tier 1)');
  console.log('  Worker  : +251911000007 (Meron, Tier 0)');
  console.log('  OTP     : returned by /api/auth/otp/request in dev mode');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
