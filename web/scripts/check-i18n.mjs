// CI guard: every literal `t('key')` used in the UI must exist in the i18n
// dictionary. A missing key silently renders the raw key name to users (that's
// how ~50 broken strings hid before the dictionary was rebuilt), so we fail the
// build instead. Dynamic keys — t(someVar) / t(MAP[x] as any) — are skipped
// because they can't be checked statically.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const dictPath = join(root, 'lib', 'i18n.tsx');

// Defined keys: lines like `  keyName: { ... }` at the top level of the T object.
const dictSrc = readFileSync(dictPath, 'utf8');
const defined = new Set();
for (const m of dictSrc.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)) defined.add(m[1]);

// Walk src/**/*.tsx and collect literal t('...') / t("...") references.
const referenced = new Map(); // key -> first file it appears in
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) { if (name !== 'node_modules') walk(p); continue; }
    if (!/\.tsx?$/.test(name)) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g)) {
      if (!referenced.has(m[1])) referenced.set(m[1], p.replace(root, 'src'));
    }
  }
}
walk(root);

const missing = [...referenced.entries()].filter(([k]) => !defined.has(k));
if (missing.length) {
  console.error(`\n✗ i18n check failed — ${missing.length} key(s) used but not defined in lib/i18n.tsx:\n`);
  for (const [k, file] of missing) console.error(`   ${k}  (first seen ${file})`);
  console.error('');
  process.exit(1);
}
console.log(`✓ i18n check passed — ${referenced.size} referenced keys, all defined (${defined.size} in dictionary).`);
