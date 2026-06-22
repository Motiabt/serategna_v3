import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Settings2, MessageCircle, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, User } from '../lib/auth';
import { useI18n, LANGS, Lang } from '../lib/i18n';
import { BrandMark } from '../components/ui';
import { PhoneShell } from '../components/Shell';

type Step = 'phone' | 'code';
type FlowMode = 'login' | 'register';

const DEMO = [
  { label: 'Janani', sub: 'Client', phone: '+251922000001' },
  { label: 'Hanna', sub: 'Worker · T1', phone: '+251911000001' },
  { label: 'Meron', sub: 'Worker · T0', phone: '+251911000007' },
  { label: 'Ops', sub: 'Admin', phone: '+251900000000' },
];

export function Login() {
  const { setSession } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();

  const [flow, setFlow] = useState<FlowMode>('login');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [regLang, setRegLang] = useState<Lang>(lang);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestOtp(p = phone) {
    setError('');
    setBusy(true);
    try {
      const res = await api.post<{ devCode?: string }>('/api/auth/otp/request', { phone: p, purpose: flow });
      setPhone(p);
      setDevCode(res.devCode ?? null);
      if (res.devCode) setCode(res.devCode);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const payload = flow === 'register' ? { phone, code, name, role, language: regLang, acceptTerms } : { phone, code };
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(`/api/auth/${flow}`, payload);
      setSession(res.user, res.accessToken, res.refreshToken);
      nav(res.user.roles.admin ? '/admin' : '/app/home', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(p: string) {
    setFlow('login');
    setPhone(p);
    await requestOtp(p);
  }

  return (
    <PhoneShell>
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-6 no-scrollbar">
        {/* Glass toolbar */}
        <div className="flex items-center justify-between">
          <div className="glass-pill flex items-center gap-2 px-2 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70"><Settings2 className="h-4 w-4 text-ink" /></span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70"><MessageCircle className="h-4 w-4 text-ink" /></span>
            <span className="pr-1 text-sm font-semibold text-ink">Serategna</span>
          </div>
          <div className="glass-pill flex gap-1 px-1 py-1">
            {LANGS.map((l) => (
              <button key={l.key} onClick={() => setLang(l.key)} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${lang === l.key ? 'bg-ink text-white' : 'text-muted'}`}>
                {l.key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="mt-10 flex flex-col items-center text-center">
          <BrandMark size={72} />
          <h1 className="mt-6 text-3xl font-extrabold leading-tight text-ink">
            {flow === 'login' ? 'Welcome back' : 'Join Serategna'}
          </h1>
          <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-muted">
            {t('tagline')}. The work-to-credit platform for Ethiopia's real economy.
          </p>
        </div>

        {/* Form */}
        <div className="mt-8 flex-1">
          {step === 'phone' && (
            <div className="space-y-3 animate-fade-up">
              {flow === 'register' && (
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              )}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className="input pl-11" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 9.. .. .. .." inputMode="tel" />
              </div>

              {flow === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {(['client', 'worker'] as const).map((r) => (
                      <button key={r} onClick={() => setRole(r)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${role === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>
                        {r === 'client' ? 'Hire workers' : 'Find work'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGS.map((l) => (
                      <button key={l.key} onClick={() => setRegLang(l.key)} className={`rounded-2xl border px-2 py-2.5 text-xs font-semibold ${regLang === l.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setAcceptTerms(!acceptTerms)} className="flex items-start gap-2.5 text-left">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${acceptTerms ? 'border-brand-600 bg-brand-600 text-white' : 'border-black/15 bg-white'}`}>
                      {acceptTerms && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs text-muted">I accept the <a href="/api/legal/terms" target="_blank" className="font-semibold text-brand-700">Terms</a> & <a href="/api/legal/privacy" target="_blank" className="font-semibold text-brand-700">Privacy Policy</a>. I understand I work as an independent contractor.</span>
                  </button>
                </>
              )}

              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button className="btn-brand w-full" disabled={busy || !phone || (flow === 'register' && (!name || !acceptTerms))} onClick={() => requestOtp()}>
                Send code <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-3 animate-fade-up">
              <p className="text-center text-sm text-muted">
                Code sent to <span className="font-semibold text-ink">{phone}</span>
              </p>
              <input
                className="input text-center text-2xl font-bold tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
              />
              {devCode && (
                <p className="rounded-2xl bg-brand-50 px-3 py-2 text-center text-xs text-brand-700">
                  Dev mode — code auto-filled: <b>{devCode}</b>
                </p>
              )}
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button className="btn-brand w-full" disabled={busy || code.length !== 6} onClick={submit}>
                {flow === 'login' ? t('signIn') : t('signUp')} <ArrowRight className="h-4 w-4" />
              </button>
              <button className="w-full text-center text-sm text-muted" onClick={() => setStep('phone')}>← Change number</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6">
          <button
            className="w-full text-center text-sm text-muted"
            onClick={() => { setFlow(flow === 'login' ? 'register' : 'login'); setStep('phone'); setError(''); }}
          >
            {flow === 'login' ? (<>New here? <span className="font-semibold text-brand-700">Create an account</span></>) : (<>Have an account? <span className="font-semibold text-brand-700">Sign in</span></>)}
          </button>

          <p className="mb-2 mt-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">Try a demo account</p>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO.map((d) => (
              <button key={d.phone} onClick={() => demoLogin(d.phone)} className="action-chip">
                <p className="text-sm font-bold text-ink">{d.label}</p>
                <p className="text-xs text-muted">{d.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
