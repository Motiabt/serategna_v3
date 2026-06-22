export function etb(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `ETB ${Math.round(n).toLocaleString('en-US')}`;
}

export function relTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}

// Countdown until a job's application deadline. Returns null if no/invalid date.
export function closesIn(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const min = Math.round(diff / 60000);
  if (min < 60) return `Closes in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Closes in ${hr}h`;
  const day = Math.round(hr / 24);
  return `Closes in ${day}d`;
}

// Lightweight Ethiopian-calendar conversion (spec: dual calendars everywhere).
// Uses the Amete Mihret epoch offset; good enough for date display.
const ETHIOPIC_EPOCH_OFFSET = 2796; // days from Julian
export function toEthiopian(g: Date): { year: number; month: number; day: number; label: string } {
  const months = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
  ];
  const jdn = gregorianToJDN(g.getFullYear(), g.getMonth() + 1, g.getDate());
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1461);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  void ETHIOPIC_EPOCH_OFFSET;
  return { year, month, day, label: `${day} ${months[month - 1] ?? ''} ${year}` };
}

function gregorianToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

export function dualDate(d: Date = new Date()): string {
  const greg = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${greg} · ${toEthiopian(d).label}`;
}
