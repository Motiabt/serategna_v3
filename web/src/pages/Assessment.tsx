import { useEffect, useState } from 'react';
import { Brain, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n, loc } from '../lib/i18n';
import { Spinner } from '../components/ui';
import { useToast } from '../lib/toast';
import { BackHeader } from './_shared';

const LIKERT = [
  { v: 1, label: 'Strongly disagree' },
  { v: 2, label: 'Disagree' },
  { v: 3, label: 'Neutral' },
  { v: 4, label: 'Agree' },
  { v: 5, label: 'Strongly agree' },
];

export function Assessment() {
  const { lang } = useI18n();
  const toast = useToast();
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<any[]>('/api/credentials/psychometric/questions').then(setQuestions).catch(() => setQuestions([]));
    api.get<any>('/api/credentials/psychometric/mine').then(setResult).catch(() => undefined);
  }, []);

  async function submit() {
    setBusy(true);
    try {
      const payload = Object.entries(answers).map(([q, value]) => ({ q, value }));
      const r = await api.post<any>('/api/credentials/psychometric', { answers: payload });
      setResult(r);
      toast.success('Assessment complete — added to your profile');
    } finally {
      setBusy(false);
    }
  }

  if (questions === null) return <Spinner />;
  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Reliability assessment" />
      <p className="px-5 pt-1 text-sm text-muted">A short, honest self-assessment. It builds your reliability index — part of your Serategna Score and matching.</p>

      {result && (
        <div className="mx-5 mt-3 card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Brain className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Reliability index: {result.reliabilityIndex}/100</p>
              <p className="text-xs text-muted">You can retake it any time to update your profile.</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-brand-600" />
          </div>
        </div>
      )}

      <div className="space-y-4 px-5 pt-4">
        {questions.map((q, i) => (
          <div key={q.id} className="card p-4">
            <p className="text-sm font-semibold text-ink">{i + 1}. {loc(q, lang)}</p>
            <div className="mt-3 flex justify-between gap-1">
              {LIKERT.map((l) => (
                <button
                  key={l.v}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: l.v }))}
                  className={`flex h-9 flex-1 items-center justify-center rounded-xl text-sm font-bold ${answers[q.id] === l.v ? 'bg-brand-600 text-white' : 'bg-mist text-muted'}`}
                  aria-label={l.label}
                >
                  {l.v}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted"><span>Disagree</span><span>Agree</span></div>
          </div>
        ))}
      </div>

      <div className="px-5 pt-4">
        <button onClick={submit} disabled={busy || !allAnswered} className="btn-brand w-full">{result ? 'Update assessment' : 'Submit assessment'}</button>
      </div>
    </div>
  );
}
