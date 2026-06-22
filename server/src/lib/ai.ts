// Serategna AI helpers. These run fully on-device/offline using the platform's
// own verified data (no external dependency, no PII leaving Ethiopia). The
// `provider` seam lets a hosted LLM be added later behind the same functions.

import { prisma } from './prisma.js';
import { computeScore } from './score.js';
import { CATEGORIES, ALL_ROLES } from './catalog.js';
import { employmentType, RATE_LABEL } from './employment.js';

export interface GeneratedCv {
  name: string;
  headline: string;
  summary: string;
  contact: { phone: string; subCity: string; language: string };
  verification: string;
  skills: string[];
  stats: { label: string; value: string }[];
  experience: { title: string; period: string; detail: string }[];
  highlights: string[];
}

/** Build a professional CV from the worker's verified Serategna record. */
export async function generateCv(workerId: string): Promise<GeneratedCv> {
  const [user, profile, jobs, ratings, score] = await Promise.all([
    prisma.user.findUnique({ where: { id: workerId } }),
    prisma.workerProfile.findUnique({ where: { userId: workerId } }),
    prisma.job.findMany({
      where: { workerId, status: 'confirmed' },
      orderBy: { confirmedAt: 'desc' },
    }),
    prisma.rating.findMany({ where: { rateeId: workerId } }),
    computeScore(workerId),
  ]);
  if (!user) throw new Error('Worker not found');

  const cats: string[] = profile ? JSON.parse(profile.categories) : [];
  const roleKeys: string[] = profile ? JSON.parse(profile.roles ?? '[]') : [];
  const roleLabels = roleKeys.map((rk) => ALL_ROLES.find((r) => r.k === rk)?.en).filter(Boolean) as string[];
  const catLabels = [...roleLabels, ...cats.map((c) => CATEGORIES.find((x) => x.key === c)?.en ?? c)];
  const totalEarned = jobs.reduce((a, j) => a + (j.agreedPrice ?? 0), 0);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;
  const tags = Array.from(new Set(ratings.flatMap((r) => JSON.parse(r.tags) as string[])));

  const primary = catLabels[0] ?? 'Service professional';
  const headline = `${primary} · Verified Serategna worker`;
  const summary =
    `Reliable ${catLabels.join(', ') || 'service'} professional based in ${profile?.subCity ?? 'Addis Ababa'}. ` +
    `${jobs.length} completed and client-confirmed jobs on Serategna with a ${avgRating.toFixed(1)}/5 average rating ` +
    `and a Serategna Score of ${score.score} (${score.band}). ` +
    (user.tier >= 1 ? 'Fayda-verified identity. ' : '') +
    'Punctual, professional, and platform-vetted.';

  // group confirmed jobs by category into "experience" lines
  const byCat: Record<string, { count: number; last?: Date | null }> = {};
  for (const j of jobs) {
    byCat[j.category] = byCat[j.category] ?? { count: 0, last: null };
    byCat[j.category].count += 1;
    if (!byCat[j.category].last || (j.confirmedAt && j.confirmedAt > byCat[j.category].last!))
      byCat[j.category].last = j.confirmedAt;
  }
  const experience = Object.entries(byCat).map(([cat, v]) => ({
    title: CATEGORIES.find((c) => c.key === cat)?.en ?? cat,
    period: v.last ? `through ${new Date(v.last).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '',
    detail: `${v.count} completed ${v.count === 1 ? 'job' : 'jobs'}, all client-confirmed via escrow.`,
  }));

  return {
    name: user.name,
    headline,
    summary,
    contact: { phone: user.phone, subCity: profile?.subCity ?? 'Addis Ababa', language: user.language },
    verification: user.tier >= 1 ? 'Fayda-verified (Tier 1)' : 'Phone-verified (Tier 0)',
    skills: catLabels.length ? catLabels : ['General services'],
    stats: [
      { label: 'Jobs completed', value: String(jobs.length) },
      { label: 'Avg. rating', value: avgRating ? `${avgRating.toFixed(1)}/5` : '—' },
      { label: 'Serategna Score', value: String(score.score) },
      { label: 'Verified income', value: `ETB ${totalEarned.toLocaleString()}` },
    ],
    experience,
    highlights: [
      ...(tags.length ? [`Praised for: ${tags.slice(0, 4).join(', ')}`] : []),
      `${score.band[0].toUpperCase()}${score.band.slice(1)} Serategna Score (${score.score}/850)`,
      'Verified on-platform earnings history — a first formal income proof.',
    ],
  };
}

export interface JobDraft {
  title: string;
  description: string;
  suggestedLow: number;
  suggestedHigh: number;
  rateType: string;
  formality: string;
  durationLabel: string | null;
  scope: string[];
}

/** Turn a rough request into a polished, structured job post. */
export async function draftJob(input: {
  prompt: string;
  category: string;
  subCity: string;
  employmentType: string;
}): Promise<JobDraft> {
  const cat = CATEGORIES.find((c) => c.key === input.category);
  const et = employmentType(input.employmentType);
  const band = await prisma.priceBand.findUnique({
    where: { category_subCity: { category: input.category, subCity: input.subCity } },
  });
  const low = band?.low ?? cat?.bandLow ?? 0;
  const high = band?.high ?? cat?.bandHigh ?? 0;

  const clean = input.prompt.trim().replace(/\s+/g, ' ');
  const catName = cat?.en ?? 'service';
  const title =
    clean.length > 3
      ? clean.charAt(0).toUpperCase() + clean.slice(1, 60)
      : `${catName} needed in ${input.subCity}`;

  const durationLabel =
    et.key === 'permanent' ? 'Permanent' : et.key === 'contract' ? '3 months (renewable)' : et.key === 'short_term' ? '1–3 days' : null;

  const scope = buildScope(input.category, clean);

  const description =
    `${title}. ` +
    `${et.label} ${et.requiresEscrow ? '(escrow-protected payment)' : '(placement with signed contract)'} ` +
    `in ${input.subCity}. ` +
    (clean.length > 3 ? `Details: ${clean}. ` : '') +
    `Fair-price guidance: ETB ${low.toLocaleString()}–${high.toLocaleString()} ${RATE_LABEL[et.defaultRate]}. ` +
    `Workers are Fayda-verified and rated.`;

  return {
    title,
    description,
    suggestedLow: low,
    suggestedHigh: high,
    rateType: et.defaultRate,
    formality: et.key === 'permanent' || et.key === 'contract' ? 'formal' : 'informal',
    durationLabel,
    scope,
  };
}

// ── CV import: parse free text / uploaded CV → structured profile ────────────
export interface ParsedCv {
  categories: string[];
  roles: string[];
  matchedTitles: string[];
  bio: string;
}

export function parseCvText(text: string): ParsedCv {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
  const groups = new Set<string>();
  const roles = new Set<string>();
  const titles: string[] = [];
  for (const r of ALL_ROLES) {
    // match on significant words from the English role label
    const words = r.en.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
    const hit = words.some((w) => hay.includes(` ${w} `)) ||
      hay.includes(` ${r.en.toLowerCase().split(' ')[0]} `);
    if (hit) {
      roles.add(r.k);
      groups.add(r.group);
      titles.push(r.en);
    }
  }
  // also detect group names directly
  for (const c of CATEGORIES) {
    if (hay.includes(` ${c.en.toLowerCase().split(' ')[0]} `)) groups.add(c.key);
  }
  const bio = text.trim().replace(/\s+/g, ' ').slice(0, 280);
  return {
    categories: [...groups].slice(0, 6),
    roles: [...roles].slice(0, 12),
    matchedTitles: titles.slice(0, 12),
    bio,
  };
}

// ── Business license import: parse text → company profile (point 4) ──────────
export interface ParsedLicense {
  companyName: string;
  sector: string;
  licenseNo: string;
  tin: string;
  region: string;
  subCity: string;
}

export function parseLicenseText(text: string): ParsedLicense {
  const lines = text.split(/[\n;|]/).map((l) => l.trim()).filter(Boolean);
  const grab = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };
  const tin = grab(/\bTIN[:\s#]*([0-9]{6,})/i) || grab(/tax\s*id[:\s#]*([0-9]{6,})/i);
  const licenseNo = grab(/licen[cs]e\s*(?:no|number|#)?[:\s#]*([A-Z0-9\/-]{4,})/i);
  const region = grab(/region[:\s]*([A-Za-z ]{3,})/i) || grab(/(Addis Ababa|Oromia|Amhara|Tigray|Sidama)/i);
  const subCity = grab(/sub[-\s]?city[:\s]*([A-Za-z ]{3,})/i);
  const sectorKw = ['construction', 'cleaning', 'catering', 'logistics', 'retail', 'technology', 'consulting', 'transport', 'security', 'agriculture', 'health', 'education'];
  const sector = sectorKw.find((s) => text.toLowerCase().includes(s)) ?? '';
  // company name: first non-keyword line, or line before "PLC"/"Trading"
  const nameLine = lines.find((l) => /plc|trading|enterprise|company|p\.?l\.?c|s\.?c/i.test(l)) ?? lines[0] ?? 'Company';
  return {
    companyName: nameLine.replace(/^(company|name)[:\s]*/i, '').slice(0, 80),
    sector: sector ? sector[0].toUpperCase() + sector.slice(1) : '',
    licenseNo,
    tin,
    region,
    subCity,
  };
}

function buildScope(category: string, prompt: string): string[] {
  const base: Record<string, string[]> = {
    home_cleaning: ['Sweep, mop and dust all rooms', 'Clean kitchen and bathrooms', 'Take out waste'],
    skilled_construction: ['Assess the work area', 'Supply minor materials', 'Complete to standard & clean up'],
    repairs_technical: ['Diagnose the issue', 'Supply minor parts', 'Test and confirm the fix'],
    delivery_logistics: ['Collect the item on time', 'Handle with care', 'Confirm delivery with the recipient'],
    micro_gigs: ['Collect the item on time', 'Handle with care', 'Confirm completion'],
    food_hospitality: ['Agree the menu', 'Shop for ingredients if needed', 'Prepare and serve'],
  };
  const items = base[category] ?? ['Complete the work to an agreed standard', 'Be punctual and professional', 'Clean up afterwards'];
  if (prompt.length > 3) items.unshift(prompt.charAt(0).toUpperCase() + prompt.slice(1));
  return items.slice(0, 4);
}
