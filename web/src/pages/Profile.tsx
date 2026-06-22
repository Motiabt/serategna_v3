import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Globe, MapPin, Check, ChevronRight, ShieldAlert, FileText, UserCheck, ScrollText, Sparkles, QrCode, Copy, Share2, Sun, Moon, Headphones, Phone, Mail, Clock, Building2, CreditCard, Award } from 'lucide-react';
import { useToast } from '../lib/toast';
import { useTheme } from '../lib/theme';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n, LANGS, loc } from '../lib/i18n';
import { Avatar, Pill, Spinner, Sheet } from '../components/ui';
import { CategoryIcon } from '../components/icons';
import { PageHeader, ModeSwitch } from './_shared';

interface Category { key: string; en: string; am: string; om: string; icon: string }

export function Profile() {
  const { user, mode, logout, refreshUser } = useAuth();
  const { lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${user?.id}` : '';
  async function shareProfile() {
    if (navigator.share) { try { await navigator.share({ title: 'My Serategna verified profile', url: publicUrl }); } catch { /* cancelled */ } }
    else { await navigator.clipboard?.writeText(publicUrl); toast.success('Profile link copied'); }
  }
  const [cats, setCats] = useState<Category[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [bizProfile, setBizProfile] = useState<any>(null);
  const [licText, setLicText] = useState('');
  const [licBusy, setLicBusy] = useState(false);
  const [bizAbout, setBizAbout] = useState('');
  const [bizSaving, setBizSaving] = useState(false);
  const [ent, setEnt] = useState<any>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [cb, setCb] = useState({ name: '', contact: '', message: '' });
  const [cbBusy, setCbBusy] = useState(false);
  const [cbDone, setCbDone] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/api/catalog/categories').then(setCats).catch(() => undefined);
    if (user?.roles.worker) {
      api.get<any>('/api/auth/me').then((d) => setProfile(d.workerProfile)).catch(() => undefined);
    }
    if (user?.accountType === 'business' || user?.accountType === 'sme') {
      api.get<any>('/api/ai/business-profile').then((d) => { setBizProfile(d); setBizAbout(d?.about ?? ''); }).catch(() => undefined);
    }
    api.get<any>('/api/enterprise/me').then((d) => setEnt(d?.enterprise ?? null)).catch(() => undefined);
  }, [user]);

  function uploadLogo(file: File) {
    if (file.size > 250 * 1024) { toast.error('Logo too large — keep it under 250KB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const p = await api.patch<any>('/api/ai/business-profile', { logoUrl: String(reader.result) });
        setBizProfile(p);
        toast.success('Logo updated');
      } catch { toast.error('Could not save logo'); }
    };
    reader.readAsDataURL(file);
  }
  async function saveBizAbout() {
    setBizSaving(true);
    try {
      const p = await api.patch<any>('/api/ai/business-profile', { about: bizAbout });
      setBizProfile(p);
      toast.success('Company intro saved');
    } catch { toast.error('Could not save'); }
    finally { setBizSaving(false); }
  }

  function openSupport() {
    setSupportOpen(true);
    setCbDone(false);
    setCb({ name: user?.name ?? '', contact: user?.phone ?? '', message: '' });
    if (!contact) api.get<any>('/api/enterprise/contact').then(setContact).catch(() => undefined);
  }
  async function requestCallback() {
    setCbBusy(true);
    try {
      await api.post('/api/enterprise/lead', { kind: 'callback', name: cb.name, contact: cb.contact, message: cb.message });
      setCbDone(true);
      toast.success('Callback requested — we’ll ring you back');
    } catch {
      toast.error('Could not send request');
    } finally {
      setCbBusy(false);
    }
  }

  async function importLicense() {
    setLicBusy(true);
    try {
      const res = await api.post<any>('/api/ai/license-import', { text: licText });
      setBizProfile(res.profile);
      setLicText('');
    } finally {
      setLicBusy(false);
    }
  }

  async function saveProfile(patch: any) {
    const updated = await api.patch<any>('/api/profiles/me/worker', patch);
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function toggleCategory(key: string) {
    const current: string[] = profile?.categories ?? [];
    const next = current.includes(key) ? current.filter((c) => c !== key) : [...current, key];
    saveProfile({ categories: next });
  }

  if (!user) return <Spinner />;
  const tierLabel = ['Provisional (Tier 0)', 'Fayda-Verified (Tier 1)', 'Credit-Ready (Tier 2)'][user.tier] ?? 'Tier 0';

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title="Profile" />

      <div className="px-5">
        <div className="card flex items-center gap-4 p-5">
          <Avatar name={user.name} size={56} />
          <div className="flex-1">
            <p className="text-lg font-bold text-ink">{user.name}</p>
            <p className="text-xs text-muted">{user.phone}</p>
            <div className="mt-1.5 flex gap-1.5">
              {user.faydaStatus === 'verified' ? (
                <Pill tone="brand"><ShieldCheck className="h-3 w-3" /> Verified</Pill>
              ) : (
                <Pill tone="amber">{user.faydaStatus === 'pending' ? 'Verification pending' : 'Unverified'}</Pill>
              )}
              <Pill>{tierLabel}</Pill>
            </div>
          </div>
        </div>
      </div>

      {/* One account — switch roles freely (worker ⇄ employer) */}
      {!user.roles.admin && (
        <div className="px-5 pt-4">
          <div className="card p-4">
            <p className="text-sm font-bold text-ink">How you're using Serategna</p>
            <p className="mb-3 text-xs text-muted">One account — switch anytime. Be a worker, an employer, or both.</p>
            <ModeSwitch variant="full" />
          </div>
        </div>
      )}

      {user.faydaStatus !== 'verified' && (
        <div className="px-5 pt-4">
          <button onClick={() => nav('/app/verify')} className="card flex w-full items-center gap-3 p-4 text-left">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Verify your identity (Fayda)</p>
              <p className="text-xs text-muted">Unlock withdrawals, the Verified badge & credit.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted" />
          </button>
        </div>
      )}

      {user.roles.admin && (
        <div className="px-5 pt-4">
          <button onClick={() => nav('/admin')} className="card flex w-full items-center gap-3 p-4 text-left">
            <ShieldAlert className="h-6 w-6 text-amber-accent" />
            <div className="flex-1"><p className="text-sm font-semibold text-ink">Admin console</p><p className="text-xs text-muted">Verifications · disputes · SoS · reconciliation</p></div>
            <ChevronRight className="h-4 w-4 text-muted" />
          </button>
        </div>
      )}

      {/* Account type (clients) */}
      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">Account type</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['household', 'business', 'sme', 'diaspora'] as const).map((a) => (
            <button
              key={a}
              onClick={async () => { await api.patch('/api/auth/account-type', { accountType: a }); await refreshUser(); }}
              className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold capitalize ${user.accountType === a ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}
            >
              {a}
              {(a === 'business' || a === 'sme') && <span className="block text-[10px] font-normal text-muted">5% take-rate · invoicing</span>}
              {a === 'diaspora' && <span className="block text-[10px] font-normal text-muted">book for family in Ethiopia</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Business license import (company accounts) */}
      {(user.accountType === 'business' || user.accountType === 'sme') && (
        <div className="px-5 pt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Company profile</h2>
          {bizProfile ? (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-mist ring-1 ring-black/[0.05]">
                  {bizProfile.logoUrl ? (
                    <img src={bizProfile.logoUrl} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[8px] font-semibold text-white">Edit</span>
                </label>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{bizProfile.companyName}</p>
                  <p className="truncate text-xs text-muted">{[bizProfile.sector, bizProfile.region, bizProfile.subCity].filter(Boolean).join(' · ') || 'Tap the logo to upload'}</p>
                </div>
              </div>
              <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Logo &amp; intro appear on your job posts</p>
              <textarea className="input min-h-[70px] resize-none" maxLength={600} value={bizAbout} onChange={(e) => setBizAbout(e.target.value)} placeholder="Briefly introduce your company to candidates — what you do, your team, what it's like to work with you." />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {bizProfile.verified && <Pill tone="brand"><ShieldCheck className="h-3 w-3" /> Licensed</Pill>}
                {bizProfile.licenseNo && <Pill>Lic {bizProfile.licenseNo}</Pill>}
                {bizProfile.tin && <Pill>TIN ••••{String(bizProfile.tin).slice(-3)}</Pill>}
                <button onClick={saveBizAbout} disabled={bizSaving || bizAbout === (bizProfile.about ?? '')} className="btn-brand ml-auto px-4 py-2 text-xs">{bizSaving ? 'Saving…' : 'Save intro'}</button>
              </div>
              {!bizProfile.licenseNo && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-accent"><ShieldAlert className="h-3 w-3" /> Organizations must add a business license &amp; TIN to be verified. Paste your license to auto-fill.</p>
              )}
            </div>
          ) : (
            <div className="card p-4">
              <p className="mb-2 text-sm text-muted">Set up your company profile — add a logo and a short intro that candidates see on your job posts.</p>
              <textarea className="input min-h-[80px] resize-none" value={licText} onChange={(e) => setLicText(e.target.value)} placeholder="Paste your business license to auto-fill (e.g. ABC Trading PLC · License No: AA/12345 · TIN: 0012345678 · Region: Addis Ababa · Sector: Cleaning)" />
              <button onClick={importLicense} disabled={licBusy || licText.length < 10} className="btn-brand mt-3 w-full">Build from license</button>
              <button
                onClick={async () => { const p = await api.patch<any>('/api/ai/business-profile', { companyName: user.name }); setBizProfile(p); setBizAbout(p?.about ?? ''); }}
                className="btn-ghost mt-2 w-full text-sm"
              >
                Or set up manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents & tools */}
      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">Documents & tools</h2>
        <div className="card divide-y divide-black/5 overflow-hidden">
          {user.roles.worker && (
            <LinkRow icon={<QrCode className="h-5 w-5 text-brand-600" />} label="Share verified profile" sub="Your income passport — link & QR" onClick={() => setShareOpen(true)} />
          )}
          {user.roles.worker && (
            <LinkRow icon={<Sparkles className="h-5 w-5 text-accent-500" />} label="Smart CV Builder" sub="Build a CV from your verified record" onClick={() => nav('/app/cv')} />
          )}
          <LinkRow icon={<FileText className="h-5 w-5 text-brand-600" />} label="Contracts" sub="View & e-sign agreements" onClick={() => nav('/app/contracts')} />
          {user.roles.worker && (
            <LinkRow icon={<ScrollText className="h-5 w-5 text-brand-600" />} label="Certifications" sub="Add & verify skills certificates" onClick={() => nav('/app/certifications')} />
          )}
          {user.roles.worker && (
            <LinkRow icon={<Sparkles className="h-5 w-5 text-accent-500" />} label="Reliability assessment" sub="Psychometric — boosts your Score" onClick={() => nav('/app/assessment')} />
          )}
          {user.roles.worker && (
            <LinkRow icon={<UserCheck className="h-5 w-5 text-brand-600" />} label="የስራ ዋስ · Work guarantor" sub="Wastina — required to hire maids; backs credit" onClick={() => nav('/app/guarantors')} />
          )}
          {user.roles.worker && (
            <LinkRow icon={<CreditCard className="h-5 w-5 text-brand-600" />} label="Credit & advances" sub="Turn verified work into borrowing power" onClick={() => nav('/app/credit')} />
          )}
          {user.roles.worker && (
            <LinkRow icon={<Award className="h-5 w-5 text-brand-600" />} label="Employment certificate" sub="Verifiable income & work proof — print/share" onClick={() => window.open(`/cert/${user.id}`, '_blank')} />
          )}
          {ent && (
            <LinkRow icon={<Building2 className="h-5 w-5 text-brand-600" />} label="Enterprise console" sub={`${ent.name} · seats, talent pool & bulk hiring`} onClick={() => nav('/app/enterprise')} />
          )}
          <LinkRow icon={<Headphones className="h-5 w-5 text-brand-600" />} label="Help & support" sub="Call center · request a callback" onClick={openSupport} />
          {mode !== 'worker' && (
            <LinkRow icon={<Building2 className="h-5 w-5 text-accent-500" />} label="Enterprises" sub="Bulk hiring & talent pooling for institutions" onClick={() => nav('/enterprises')} />
          )}
          <LinkRow icon={<ScrollText className="h-5 w-5 text-muted" />} label="Terms & Privacy" sub="Policies · data rights" onClick={() => nav('/app/legal')} />
        </div>
      </div>

      {mode === 'worker' && profile && (
        <div className="px-5 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Your trades</h2>
            {saved && <span className="flex items-center gap-1 text-xs text-brand-600"><Check className="h-3 w-3" /> Saved</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = (profile.categories ?? []).includes(c.key);
              return (
                <button key={c.key} onClick={() => toggleCategory(c.key)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-white text-muted shadow-card'}`}>
                  <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" /> {loc(c, lang)}
                </button>
              );
            })}
          </div>

          <div className="mt-5 card p-4">
            <button
              onClick={() => navigator.geolocation?.getCurrentPosition((pos) => saveProfile({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
              className="btn-ghost mb-3 w-full text-sm"
            >
              <MapPin className="h-4 w-4 text-brand-600" /> Use my current location
            </button>
            <label className="label flex items-center gap-1"><MapPin className="h-3 w-3" /> Service radius: {profile.serviceRadiusKm} km</label>
            <input type="range" min={1} max={30} value={profile.serviceRadiusKm}
              onChange={(e) => setProfile({ ...profile, serviceRadiusKm: Number(e.target.value) })}
              onMouseUp={(e) => saveProfile({ serviceRadiusKm: Number((e.target as HTMLInputElement).value) })}
              onTouchEnd={(e) => saveProfile({ serviceRadiusKm: Number((e.target as HTMLInputElement).value) })}
              className="w-full accent-brand-600" />
            <ToggleRow label="Available for work" value={profile.availability !== 'offline'} onChange={(v) => saveProfile({ availability: v ? 'available' : 'offline' })} />
            <ToggleRow label="Instant dispatch (on-demand)" value={profile.instantDispatch} onChange={(v) => saveProfile({ instantDispatch: v })} />
            <ToggleRow label="Verified-female clients only" value={profile.femaleClientOnly} onChange={(v) => saveProfile({ femaleClientOnly: v })} />
          </div>
        </div>
      )}

      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">Appearance</h2>
        <div className="grid grid-cols-2 gap-2">
          {([['light', Sun, 'Light'], ['dark', Moon, 'Dark']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTheme(key)} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${theme === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/[0.06] bg-white text-muted'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink"><Globe className="h-4 w-4" /> Language</h2>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l.key} onClick={() => setLang(l.key)} className={`rounded-2xl border px-2 py-3 text-xs font-semibold ${lang === l.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-black/5 bg-white text-muted'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        <button onClick={() => { logout(); nav('/login'); }} className="btn-ghost w-full text-rose-600">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Your verified income passport">
        <p className="text-sm text-muted">Share this with any employer or lender — it proves your Serategna jobs, income, score & ratings. No login needed to view.</p>
        <div className="mt-4 flex justify-center">
          <img
            alt="Profile QR"
            className="h-44 w-44 rounded-2xl border border-black/5 bg-white p-2"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(publicUrl)}`}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-mist px-3 py-2.5">
          <span className="flex-1 truncate text-xs text-muted">{publicUrl}</span>
          <button onClick={async () => { await navigator.clipboard?.writeText(publicUrl); toast.success('Link copied'); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-soft"><Copy className="h-4 w-4" /></button>
        </div>
        <button onClick={shareProfile} className="btn-brand mt-3 w-full"><Share2 className="h-4 w-4" /> Share my profile</button>
        <button onClick={() => window.open(publicUrl, '_blank')} className="btn-ghost mt-2 w-full">Preview profile ↗</button>
      </Sheet>

      <Sheet open={supportOpen} onClose={() => setSupportOpen(false)} title="Help & support">
        {contact && (
          <div className="card space-y-3 p-4 text-sm">
            <a href={`tel:${contact.callCenter.replace(/\s/g, '')}`} className="flex items-center gap-2 font-semibold text-ink"><Phone className="h-4 w-4 text-brand-600" /> {contact.callCenter} <span className="text-muted">· {contact.shortCode}</span></a>
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-ink"><Mail className="h-4 w-4 text-brand-600" /> {contact.email}</a>
            <p className="flex items-center gap-2 text-muted"><MapPin className="h-4 w-4 text-brand-600" /> {contact.address}</p>
            <p className="flex items-center gap-2 text-muted"><Clock className="h-4 w-4 text-brand-600" /> {contact.hours}</p>
          </div>
        )}
        {cbDone ? (
          <div className="mt-4 rounded-2xl bg-brand-50 p-5 text-center">
            <Check className="mx-auto h-7 w-7 text-brand-600" />
            <p className="mt-2 text-sm font-semibold text-ink">We’ll call you back soon.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-ink">Request a callback</p>
            <div><label className="label">Name</label><input className="input" value={cb.name} onChange={(e) => setCb({ ...cb, name: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={cb.contact} onChange={(e) => setCb({ ...cb, contact: e.target.value })} placeholder="+251…" /></div>
            <div><label className="label">What do you need help with?</label><textarea className="input min-h-[70px] resize-none" value={cb.message} onChange={(e) => setCb({ ...cb, message: e.target.value })} /></div>
            <button onClick={requestCallback} disabled={cbBusy || cb.name.length < 2 || cb.contact.length < 5} className="btn-brand w-full"><Headphones className="h-4 w-4" /> Request callback</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function LinkRow({ icon, label, sub, onClick }: { icon: ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mist">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </button>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-black/5 py-3 first:border-0">
      <span className="text-sm text-ink">{label}</span>
      <button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-brand-600' : 'bg-sand'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
