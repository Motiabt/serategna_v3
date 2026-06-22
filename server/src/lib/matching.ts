// Interlinked relevance scoring used in BOTH directions: ranking workers for a
// client's search, and ranking jobs in a worker's feed. One formula → a clear,
// consistent "best match" path for employees and employers alike.

export interface MatchInput {
  distanceKm: number | null;
  categoryMatch: boolean;
  roleMatch: boolean; // exact specialization match (strongest signal)
  rating: number; // 0–5 (0 = unknown)
  score: number; // 300–850
  verified: boolean; // Fayda Tier 1+
  available?: boolean;
  recencyDays?: number; // for jobs: how fresh the post is
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Relevance is SKILL-FIRST so the ≥80% gate means "relevant skill", not "nearby".
 * An exact specialization (role) or category match clears 80 on its own; quality
 * signals (proximity, Score, rating, verification, freshness) refine the ranking.
 * Engaged (busy) workers are discounted so they drop out of new matching.
 */
export function matchScore(p: MatchInput, radiusKm = 15): number {
  const fit = p.roleMatch ? 75 : p.categoryMatch ? 68 : 12;
  const proximity = p.distanceKm == null ? 0.6 : clamp(1 - p.distanceKm / radiusKm);
  const score = clamp((p.score - 300) / 550);
  const rating = p.rating > 0 ? clamp((p.rating - 1) / 4) : 0.6;
  const verified = p.verified ? 1 : 0.5;
  const freshness = p.recencyDays == null ? 0.6 : clamp(1 - p.recencyDays / 14);

  const quality =
    (proximity * 0.35 + score * 0.3 + rating * 0.2 + verified * 0.1 + freshness * 0.05) * 25;
  let v = fit + quality;
  if (p.available === false) v *= 0.6;
  return Math.round(Math.max(0, Math.min(100, v)));
}

/** Transparent, objective explanation of WHY a match scores as it does. */
export function matchReasons(p: MatchInput, radiusKm = 15): string[] {
  const r: string[] = [];
  if (p.roleMatch) r.push('Exact specialization');
  else if (p.categoryMatch) r.push('Category match');
  if (p.distanceKm != null && p.distanceKm <= radiusKm * 0.4) r.push('Nearby');
  if (p.score >= 740) r.push('Elite score');
  else if (p.score >= 670) r.push('Strong score');
  if (p.rating >= 4.8) r.push('Top rated');
  if (p.verified) r.push('Fayda-verified');
  if (p.available === false) r.push('Currently engaged');
  return r;
}
