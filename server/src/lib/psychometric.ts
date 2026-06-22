// Lightweight psychometric assessment taken at onboarding. Measures the traits
// most predictive of reliable domestic/service work — conscientiousness,
// integrity, punctuality, resilience. The resulting reliability index feeds the
// Serategna Score and the matching algorithm (transparent, documented).

export interface PsyQuestion {
  id: string;
  trait: 'conscientiousness' | 'integrity' | 'punctuality' | 'resilience' | 'care';
  en: string;
  am: string;
  om: string;
  reverse?: boolean; // reverse-scored item (guards against straight-lining)
}

// 1–5 Likert (Strongly disagree → Strongly agree).
export const PSY_QUESTIONS: PsyQuestion[] = [
  { id: 'q1', trait: 'conscientiousness', en: 'I finish what I start, even when it is hard.', am: 'የጀመርኩትን ሥራ ከባድ ቢሆንም እጨርሳለሁ።', om: "Hojii jalqabe, yoo ulfaatu illee nan xumura." },
  { id: 'q2', trait: 'punctuality', en: 'I am always on time for work.', am: 'ለሥራ ሁልጊዜ በሰዓቱ እደርሳለሁ።', om: 'Yeroo hundaa hojiif yeroon gaʼa.' },
  { id: 'q3', trait: 'integrity', en: 'I would return money or items left by mistake.', am: 'በስህተት የተተወ ገንዘብ ወይም ዕቃ እመልሳለሁ።', om: 'Maallaqa ykn meeshaa dogoggoraan hafe nan deebisa.' },
  { id: 'q4', trait: 'care', en: 'I treat a client’s home as if it were my own.', am: 'የደንበኛን ቤት እንደ የራሴ እንክባከባለሁ።', om: 'Mana maamilaa akka kan kootiitti nan kunuunsa.' },
  { id: 'q5', trait: 'resilience', en: 'I stay calm and polite when a client is upset.', am: 'ደንበኛ ቢበሳጭ እንኳ ተረጋግቼ በትህትና እቆያለሁ።', om: 'Yeroo maamilaan aaru illee tasgabbaaʼee obsaan nan jiraadha.' },
  { id: 'q6', trait: 'conscientiousness', en: 'I often leave tasks unfinished.', am: 'ብዙ ጊዜ ሥራዎችን ሳልጨርስ እተዋለሁ።', om: 'Yeroo baayʼee hojii utuun hin xumuriin nan dhiisa.', reverse: true },
  { id: 'q7', trait: 'integrity', en: 'It is okay to skip steps if no one is watching.', am: 'ማንም ካላየ ደረጃዎችን መዝለል ችግር የለውም።', om: 'Namni yoo hin ilaalle tarkaanfii dabruun rakkoo hin qabu.', reverse: true },
  { id: 'q8', trait: 'punctuality', en: 'I plan my day so I am never rushed.', am: 'ቀኔን አቅጄ ስለማስተናግድ አልቸኩልም።', om: 'Guyyaa koo karoorfadhee waan hojjedhuuf hin ariifadhu.' },
];

/** Compute a 0–100 reliability index + per-trait scores from 1–5 answers. */
export function scorePsychometric(answers: { q: string; value: number }[]) {
  const byId = new Map(answers.map((a) => [a.q, a.value]));
  const traitTotals: Record<string, { sum: number; n: number }> = {};
  let total = 0;
  let n = 0;
  for (const q of PSY_QUESTIONS) {
    const raw = byId.get(q.id);
    if (raw == null) continue;
    const v = q.reverse ? 6 - raw : raw; // normalize reverse items
    total += v;
    n += 1;
    traitTotals[q.trait] = traitTotals[q.trait] ?? { sum: 0, n: 0 };
    traitTotals[q.trait].sum += v;
    traitTotals[q.trait].n += 1;
  }
  const reliabilityIndex = n ? Math.round(((total / n - 1) / 4) * 100) : 0; // 1..5 → 0..100
  const traits: Record<string, number> = {};
  for (const [t, { sum, n: tn }] of Object.entries(traitTotals)) {
    traits[t] = Math.round(((sum / tn - 1) / 4) * 100);
  }
  return { reliabilityIndex, traits };
}
