// Enterprise offering: detailed packages, pre-vetted talent pools, specialist
// talent services, and a managed option. Commercial terms are enterprise-grade
// and finalised in a signed agreement; manager/admin ROLE ACCESS is provisioned
// only after that agreement is in place. Prices are illustrative list prices.

export const ENTERPRISE_PACKAGES = [
  {
    key: 'team',
    name: 'Team',
    priceLabel: 'ETB 12,000 / month',
    priceNote: 'billed annually · + one-time ETB 10,000 onboarding',
    forWho: 'Growing SMEs, offices & guest houses',
    seats: 3,
    postsPerMonth: 40,
    talentPool: 'Shared pool (8,000+ vetted)',
    roleAccess: '1 admin + 2 manager seats — provisioned on signed agreement',
    sla: 'Next-business-day support',
    popular: false,
    managed: false,
    features: [
      'Up to 40 job posts / month',
      '3 seats (1 admin + 2 managers) — role access on agreement',
      'Shared, pre-vetted talent pool (8,000+)',
      'Bulk posting & candidate shortlists',
      'Consolidated, VAT-compliant invoicing',
      'Hiring analytics dashboard',
      'Next-business-day priority support',
    ],
  },
  {
    key: 'institution',
    name: 'Institution',
    priceLabel: 'ETB 45,000 / month',
    priceNote: 'billed annually · + one-time ETB 40,000 onboarding',
    forWho: 'Hospitals, hotels, schools, factories, real-estate',
    seats: 8,
    postsPerMonth: 250,
    talentPool: 'Private branded pool + specialist access',
    roleAccess: '2 admins + 6 manager seats with granular permissions',
    sla: '4-hour response · dedicated account manager',
    popular: true,
    managed: false,
    features: [
      'Up to 250 posts / month across locations',
      '8 seats with granular role-based permissions',
      'Private, branded talent pool you build & retain',
      'Access to Special Talent services (vetted specialists)',
      'Bulk rosters, shift scheduling & re-hire lists',
      'Dedicated account manager · 4-hour SLA',
      'Guarantor (ዋስ) & contract handling at scale',
      'API access + analytics & compliance exports',
    ],
  },
  {
    key: 'managed',
    name: 'Serategna-Managed',
    priceLabel: 'From ETB 150,000 / month',
    priceNote: 'custom scope — set in the service agreement',
    forWho: 'Institutions who want us to run recruitment end-to-end',
    seats: 0,
    postsPerMonth: -1,
    talentPool: 'Full managed pool + exclusive specialists',
    roleAccess: 'A single accountable point of contact + an executive dashboard',
    sla: 'SLA-backed delivery & replacements',
    popular: false,
    managed: true,
    features: [
      'We recruit, vet, roster & replace — fully managed',
      'Exclusive access to top specialist talent',
      'Single accountable point of contact',
      'Guarantor, contract & payroll-handoff handling',
      'SLA-backed delivery with guaranteed replacements',
      'Background & reference checks on request',
      'Monthly executive reporting & QBRs',
      'Payable amount set by agreement',
    ],
  },
];

// Pre-vetted talent pools enterprises can draw from (counts refreshed monthly).
export const TALENT_POOLS = [
  { key: 'domestic', label: 'Housekeeping & domestic', count: 9200 },
  { key: 'facility', label: 'Facility & cleaning crews', count: 6400 },
  { key: 'security', label: 'Security & guarding', count: 3100 },
  { key: 'hospitality', label: 'Hospitality & catering', count: 4800 },
  { key: 'trades', label: 'Skilled trades', count: 5200 },
  { key: 'care', label: 'Care & health support', count: 2700 },
  { key: 'logistics', label: 'Logistics & delivery', count: 4100 },
];

// Premium, individually vetted specialists (priced per placement / by agreement).
export const SPECIAL_TALENTS = [
  { key: 'exec_housekeeper', label: 'Executive housekeepers', note: 'Estate & residence management, references verified' },
  { key: 'caregiver', label: 'Certified caregivers & nurse aides', note: 'Institution-certified, background-checked' },
  { key: 'head_chef', label: 'Head chefs & private cooks', note: 'Hotel/restaurant-grade, tasting on request' },
  { key: 'security_lead', label: 'Trained security & close protection', note: 'Licensed, vetted, guarantor-backed' },
  { key: 'master_trades', label: 'Master electricians & plumbers', note: 'Licensed trades for institutional sites' },
  { key: 'event_crew', label: 'Event & banquet crews', note: 'Trained teams mobilised on short notice' },
];

// "Updated data" headline metrics for the enterprise mini-site.
export const ENTERPRISE_STATS = {
  asOf: 'Updated June 2026',
  vettedTalent: '35,500+',
  specialists: '1,800+',
  institutionsServed: '120+',
  avgTimeToRoster: '48 hrs',
  retention90d: '92%',
  subCitiesCovered: 11,
};

export const CONTACT = {
  callCenter: '+251 960 00 00 00',
  shortCode: '8294',
  email: 'support@serategna.et',
  enterpriseEmail: 'enterprise@serategna.et',
  address: 'Bole Sub-city, Addis Ababa, Ethiopia',
  hours: 'Mon–Sat, 8:00–20:00 (EAT)',
};
