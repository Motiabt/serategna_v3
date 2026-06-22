// Employment taxonomy — covers the full spectrum from informal day-work to
// formal permanent placement.

export interface EmploymentType {
  key: string;
  label: string;
  am: string;
  om: string;
  desc: string;
  defaultRate: 'fixed' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  requiresContract: boolean;
  requiresEscrow: boolean;
  group?: boolean;
}

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  {
    key: 'gig',
    label: 'Gig / One-off',
    am: 'ነጠላ ሥራ',
    om: 'Hojii Tokkee',
    desc: 'A single task paid on completion. Escrow-protected.',
    defaultRate: 'fixed',
    requiresContract: false,
    requiresEscrow: true,
  },
  {
    key: 'short_term',
    label: 'Short-run / Daily',
    am: 'የቀን ሥራ',
    om: 'Hojii Guyyaa',
    desc: 'A few hours to a few days, paid per day or per task.',
    defaultRate: 'daily',
    requiresContract: false,
    requiresEscrow: true,
  },
  {
    key: 'contract',
    label: 'Fixed-term Contract',
    am: 'የውል ሥራ',
    om: 'Hojii Waliigaltee',
    desc: 'A defined period with a signed contract and milestones.',
    defaultRate: 'monthly',
    requiresContract: true,
    requiresEscrow: true,
  },
  {
    key: 'permanent',
    label: 'Permanent / Salaried',
    am: 'ቋሚ ሥራ',
    om: 'Hojii Dhaabbataa',
    desc: 'Ongoing employment with a signed contract. Placement service.',
    defaultRate: 'monthly',
    requiresContract: true,
    requiresEscrow: false,
  },
  {
    key: 'group_hire',
    label: 'Group Hire',
    am: 'የቡድን ቅጥር',
    om: 'Qacarrii Garee',
    desc: 'Hire several workers for one job (events, moving, harvest).',
    defaultRate: 'daily',
    requiresContract: false,
    requiresEscrow: true,
    group: true,
  },
];

export const RATE_LABEL: Record<string, string> = {
  fixed: 'total',
  hourly: 'per hour',
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
};

export function employmentType(key: string): EmploymentType {
  return EMPLOYMENT_TYPES.find((e) => e.key === key) ?? EMPLOYMENT_TYPES[0];
}
