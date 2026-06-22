// Categories are now the 20 taxonomy groups (trilingual). Roles are the ~250
// specializations within them. This keeps the whole app on one localized
// taxonomy for posting, search, filters and CV building.
import { TAXONOMY, ALL_ROLES, taxonomyCategories, TAX_CATEGORY_KEYS } from './taxonomy.js';

export interface Category {
  key: string;
  en: string;
  am: string;
  om: string;
  icon: string;
  vertical: string;
  bandLow: number;
  bandHigh: number;
}

export const CATEGORIES: Category[] = taxonomyCategories().map((c) => ({
  key: c.key,
  en: c.en,
  am: c.am,
  om: c.om,
  icon: c.icon,
  vertical: c.vertical,
  bandLow: c.bandLow,
  bandHigh: c.bandHigh,
}));

export const CATEGORY_KEYS = TAX_CATEGORY_KEYS;

export function rolesForGroup(groupKey: string) {
  return TAXONOMY.find((g) => g.key === groupKey)?.roles ?? [];
}

export function findRole(roleKey: string) {
  return ALL_ROLES.find((r) => r.k === roleKey);
}

export { TAXONOMY, ALL_ROLES };
