import { z } from 'zod';

// Hard ceiling so no request can ever ask the DB for an unbounded result set.
export const MAX_PAGE = 100;
export const DEFAULT_PAGE = 30;
// For internal candidate scans (e.g. the match feed) we still bound the fetch,
// but allow a larger window before in-memory filtering/ranking.
export const MAX_SCAN = 300;

/**
 * Parse, then CLAMP, `?limit` / `?offset` from a query object into Prisma
 * `{ take, skip }`. Unknown query keys are ignored, so it composes with any
 * route-specific query parsing. Invalid values fall back to the default; an
 * over-max limit is clamped down to `max` (never returns an unbounded set).
 */
export function pageParams(query: unknown, def = DEFAULT_PAGE, max = MAX_PAGE): { take: number; skip: number } {
  const q = z
    .object({
      limit: z.coerce.number().int().catch(def),
      offset: z.coerce.number().int().catch(0),
    })
    .parse(query ?? {});
  const take = Math.min(max, Math.max(1, q.limit || def));
  const skip = Math.min(100000, Math.max(0, q.offset || 0));
  return { take, skip };
}
