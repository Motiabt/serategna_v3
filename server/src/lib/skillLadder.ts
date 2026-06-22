// Skill → income ladder. Suggests the next verifiable certification for a
// worker's trade, the typical wage uplift, and what it unlocks. Turns the app
// into an economic-mobility path (not just a job board).

export interface LadderStep { cert: string; institution: string; upliftPct: number; unlocks: string }

const LADDERS: Record<string, LadderStep[]> = {
  home_cleaning: [
    { cert: 'Housekeeping & Home Management L-II', institution: 'Addis Ababa TVET College', upliftPct: 25, unlocks: 'Permanent & live-in housemaid roles' },
    { cert: 'Childcare & First Aid', institution: 'Ethiopian Red Cross', upliftPct: 20, unlocks: 'Nanny & childcare jobs' },
  ],
  care_domestic: [
    { cert: 'Elderly & Patient Care L-II', institution: 'TVET / Red Cross', upliftPct: 30, unlocks: 'Caregiver & nurse-aide roles' },
    { cert: 'First Aid &  CPR', institution: 'Ethiopian Red Cross', upliftPct: 15, unlocks: 'Institutional care positions' },
  ],
  food_hospitality: [
    { cert: 'Food Safety & Hygiene', institution: 'TVET College', upliftPct: 20, unlocks: 'Hotel & restaurant kitchens' },
    { cert: 'Professional Cooking L-II', institution: 'Catering & Tourism TI', upliftPct: 35, unlocks: 'Cook & chef roles' },
  ],
  skilled_construction: [
    { cert: 'COC Trade Certification', institution: 'Federal TVET Agency', upliftPct: 30, unlocks: 'Licensed-trade contracts' },
  ],
  delivery_logistics: [
    { cert: 'Driving Licence (3rd grade)', institution: 'Transport Authority', upliftPct: 40, unlocks: 'Driver & courier roles' },
  ],
  security_safety: [
    { cert: 'Security Guard Certification', institution: 'Licensed training centre', upliftPct: 25, unlocks: 'Institutional security posts' },
  ],
};

export function skillLadder(categories: string[], existingCertNames: string[]): LadderStep[] {
  const have = existingCertNames.map((c) => c.toLowerCase());
  const out: LadderStep[] = [];
  const seen = new Set<string>();
  for (const cat of categories) {
    for (const step of LADDERS[cat] ?? []) {
      const key = step.cert.toLowerCase();
      const alreadyHave = have.some((h) => h.includes(step.cert.split(' ')[0].toLowerCase()));
      if (!alreadyHave && !seen.has(key)) { seen.add(key); out.push(step); }
    }
  }
  return out.slice(0, 4);
}
