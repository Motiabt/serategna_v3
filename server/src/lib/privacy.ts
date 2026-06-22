// Confidentiality helpers (spec E1, Proclamation 1321/2024). Personal contact
// details are masked by default and only revealed to the owner, an admin, or an
// engaged counterparty on an active job.

export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const tail = phone.slice(-3);
  const head = phone.slice(0, Math.min(4, phone.length - 3));
  return `${head}${'•'.repeat(Math.max(2, phone.length - head.length - 3))}${tail}`;
}

export function maskName(name?: string | null): string {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.map((p, i) => (i === 0 ? p : `${p[0] ?? ''}.`)).join(' ');
}

/** Reveal a counterparty's phone only when engaged on an active job. */
export function phoneFor(
  viewerId: string,
  ownerId: string,
  phone: string,
  opts: { isAdmin?: boolean; engaged?: boolean } = {},
): string {
  if (opts.isAdmin || viewerId === ownerId || opts.engaged) return phone;
  return maskPhone(phone);
}
