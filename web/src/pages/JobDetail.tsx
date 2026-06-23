import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Send, Star, CheckCircle2, Wallet, Truck, Play, Camera, ShieldAlert, ShieldCheck, FileText, Clock, Phone, MessageCircle, Navigation, Check, Gavel, Lock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { etb, relTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Avatar, Pill, Spinner, Sheet } from '../components/ui';
import { CategoryIcon } from '../components/icons';
import { SafetyButton } from '../components/SafetyButton';
import { MapView } from '../components/MapView';
import { iconFor, EMP_KEY } from './Home';

export function JobDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState('');
  const [bidSheet, setBidSheet] = useState(false);
  const [rateSheet, setRateSheet] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<any>(`/api/jobs/${id}`).then(setJob).catch(() => setError('Job not found'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Taxi-style live tracking: poll while active; the worker shares GPS.
  useEffect(() => {
    if (!job || !['enroute', 'started'].includes(job.status)) return;
    const amWorker = job.worker?.id === user?.id;
    const poll = setInterval(load, 8000);
    let watchId: number | undefined;
    if (amWorker && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => api.post(`/api/jobs/${id}/track`, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => undefined),
        undefined,
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }
    return () => { clearInterval(poll); if (watchId != null) navigator.geolocation.clearWatch(watchId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, id, user?.id]);

  if (error) return <div className="p-6 text-muted">{error}</div>;
  if (!job) return <Spinner />;

  const isClient = job.client?.id === user?.id;
  const isWorker = job.worker?.id === user?.id;
  const myRated = (job.ratings ?? []).some((r: any) => r.raterId === user?.id);

  const ACT_MSG: Record<string, string> = {
    enroute: "You're on your way — sharing live location",
    start: 'Job started',
    complete: 'Marked complete — awaiting payment',
    'mark-paid': 'Payment recorded',
    finalize: 'Finalized — you\'re free for new jobs',
    'accept-bid': 'Worker hired',
  };
  async function act(path: string, body?: any) {
    setError('');
    try {
      await api.post(`/api/jobs/${id}/${path}`, body ?? {});
      if (ACT_MSG[path]) toast.success(ACT_MSG[path]);
      load();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Action failed';
      setError(m);
      toast.error(m);
    }
  }

  async function sendMsg() {
    if (!msg.trim()) return;
    await api.post(`/api/jobs/${id}/messages`, { body: msg });
    setMsg('');
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-6">
        <button onClick={() => nav(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-card">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Pill tone="brand">{job.status}</Pill>
        {job.employmentType && job.employmentType !== 'gig' && <Pill tone="lime">{EMP_KEY[job.employmentType] ? t(EMP_KEY[job.employmentType]) : job.employmentType}{job.positions > 1 ? ` · ${job.positions}` : ''}</Pill>}
        {job.paymentMode === 'escrow' && job.escrowState !== 'none' && <Pill tone="sky">escrow: {job.escrowState}</Pill>}
        {job.guarantorRequired && <Pill tone="amber">ዋስ required</Pill>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3 no-scrollbar">
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-brand-600">
              <CategoryIcon icon={iconFor(job.category)} className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-ink">{job.title}</h1>
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {job.subCity}</p>
            </div>
          </div>
          {job.description && <p className="mt-3 text-sm text-muted">{job.description}</p>}
          {(job.startsAt || job.endsAt) && (
            <div className="mt-3 rounded-2xl bg-sand px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                <span className="text-xs font-semibold text-ink">Start</span>
                <span className="ml-auto text-xs text-muted">{job.startsAt ? fmtTime(job.startsAt) : 'Flexible'}</span>
              </div>
              <div className="my-0.5 ml-[4px] h-4 w-0.5 bg-brand-200" />
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink bg-white" />
                <span className="text-xs font-semibold text-ink">Finish</span>
                <span className="ml-auto text-xs text-muted">{job.endsAt ? fmtTime(job.endsAt) : 'Open-ended'}</span>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
            <span className="text-xs text-muted">{job.agreedPrice ? 'Agreed price' : 'Fair-price band'}</span>
            <span className="font-bold text-ink">
              {job.agreedPrice ? etb(job.agreedPrice) : `${etb(job.priceBandLow)}–${job.priceBandHigh}`}
            </span>
          </div>
        </div>

        {/* Posting company brand ("ad") */}
        {job.company && (job.company.logoUrl || job.company.about) && (
          <div className="mt-3 card flex items-start gap-3 p-4">
            {job.company.logoUrl ? (
              <img src={job.company.logoUrl} alt={job.company.name} className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-black/[0.05]" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-brand-600 text-sm font-extrabold">{job.company.name?.[0] ?? 'C'}</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Posted by</p>
              <p className="flex items-center gap-1 text-sm font-bold text-ink">
                <span className="truncate">{job.company.name}</span>
                {job.company.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
              </p>
              {job.company.verified && <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Licensed business</span>}
              {job.company.about && <p className="mt-1 text-xs leading-relaxed text-muted">{job.company.about}</p>}
            </div>
          </div>
        )}

        {/* Tracking interior (delivery / taxi style) */}
        {job.worker && job.status !== 'open' && (
          <TrackingCard job={job} isWorker={isWorker} onChat={() => document.getElementById('msg-thread')?.scrollIntoView({ behavior: 'smooth' })} />
        )}

        {/* Contract */}
        {job.worker && (isClient || isWorker) && (
          <div className="mt-3">
            <ContractCard jobId={job.id} requiresContract={job.requiresContract} />
          </div>
        )}

        {/* Bids (client view, open job) */}
        {isClient && job.status === 'open' && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-bold text-ink">Bids ({job.bids?.length ?? 0})</h2>
            <div className="space-y-2">
              {(job.bids ?? []).map((b: any) => (
                <div key={b.id} className="card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{b.worker?.name}</p>
                    <p className="truncate text-xs text-muted">{b.message || 'No message'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-ink">{etb(b.amount)}</p>
                    {b.status === 'pending' ? (
                      <button onClick={() => act('accept-bid', { bidId: b.id })} className="text-xs font-semibold text-brand-700">Accept</button>
                    ) : (
                      <span className="text-xs capitalize text-muted">{b.status}</span>
                    )}
                  </div>
                </div>
              ))}
              {(job.bids ?? []).length === 0 && <p className="rounded-2xl bg-white p-3 text-sm text-muted shadow-card">No bids yet.</p>}
            </div>
          </div>
        )}

        {/* Ratings summary on confirmed */}
        {job.status === 'confirmed' && (job.ratings ?? []).length > 0 && (
          <div className="mt-4 card p-4">
            <h2 className="mb-2 text-sm font-bold text-ink">Ratings</h2>
            {job.ratings.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="flex">{Array.from({ length: r.stars }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" />)}</span>
                <span className="text-muted">{r.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message thread */}
        {job.worker && (
          <div className="mt-4" id="msg-thread">
            <h2 className="mb-2 text-sm font-bold text-ink">Messages</h2>
            <div className="space-y-2">
              {(job.messages ?? []).map((m: any) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'ml-auto bg-brand-600 text-white' : 'bg-white text-ink shadow-card'}`}>
                    <p>{m.body}</p>
                    <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{relTime(m.createdAt)}</p>
                  </div>
                );
              })}
              {(job.messages ?? []).length === 0 && <p className="text-xs text-muted">Negotiate the price and details here.</p>}
            </div>
            <div className="mt-2 flex gap-2">
              <input className="input flex-1" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message…" onKeyDown={(e) => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} className="btn-primary px-4"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {/* Safety check-in (worker) + SoS on active jobs */}
        {isWorker && ['enroute', 'started'].includes(job.status) && (
          <button
            onClick={async () => { try { const r = await api.post<any>(`/api/safety/checkin`, { jobId: job.id, status: 'arrived' }); toast.success(r.contactNotified ? 'Your guarantor was notified you arrived safe' : 'Check-in recorded'); } catch { toast.error('Could not check in'); } }}
            className="btn-ghost mt-4 w-full"
          >
            <CheckCircle2 className="h-4 w-4 text-brand-600" /> I arrived safe — notify my guarantor
          </button>
        )}
        {(isWorker || isClient) && ['enroute', 'started'].includes(job.status) && (
          <div className="mt-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-muted"><ShieldAlert className="h-3 w-3" /> Safety — long-press for silent alert</p>
            <SafetyButton jobId={job.id} />
          </div>
        )}

        {/* Wage proof: the payment reference, once recorded */}
        {job.paymentRef && ['paid', 'confirmed'].includes(job.status) && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-xs text-brand-700">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Payment recorded · ref <b>{job.paymentRef}</b>{job.status === 'confirmed' ? ' · added to verified income' : ''}
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <ActionBar
        job={job}
        isClient={isClient}
        isWorker={isWorker}
        myRated={myRated}
        onBid={() => setBidSheet(true)}
        onRate={() => setRateSheet(true)}
        onPay={() => setPaySheet(true)}
        act={act}
      />

      <BidSheet open={bidSheet} onClose={() => setBidSheet(false)} job={job} onDone={() => { setBidSheet(false); load(); }} />
      <RateSheet open={rateSheet} onClose={() => setRateSheet(false)} jobId={job.id} onDone={() => { setRateSheet(false); load(); }} />
      <PaySheet open={paySheet} onClose={() => setPaySheet(false)} job={job} onDone={() => { setPaySheet(false); load(); }} act={act} />
    </div>
  );
}

function ContractCard({ jobId, requiresContract }: { jobId: string; requiresContract?: boolean }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const c = await api.post<any>(`/api/contracts/from-job/${jobId}`);
      nav(`/app/contract/${c.id}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={open} disabled={busy} className="card flex w-full items-center gap-3 p-4 text-left">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600"><FileText className="h-5 w-5" /></div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{requiresContract ? 'Sign the contract' : 'Service agreement'}</p>
        <p className="text-xs text-muted">Generate & e-sign (Proclamation 1205/2020)</p>
      </div>
      <ChevronLeft className="h-4 w-4 rotate-180 text-muted" />
    </button>
  );
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const TRACK_STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'enroute', label: 'En route' },
  { key: 'started', label: 'Working' },
  { key: 'completed', label: 'Completed' },
  { key: 'confirmed', label: 'Confirmed' },
];

function TrackingCard({ job, isWorker, onChat }: { job: any; isWorker: boolean; onChat: () => void }) {
  const order = ['accepted', 'enroute', 'started', 'completed', 'confirmed'];
  const current = order.indexOf(job.status === 'disputed' ? 'completed' : job.status);
  const live = job.tracking;
  const other = isWorker ? job.client : job.worker;
  const enrouteOrStarted = ['enroute', 'started'].includes(job.status);

  return (
    <div className="mt-3 card overflow-hidden">
      {/* status timeline */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink"><Navigation className="h-4 w-4 text-brand-600" /> Tracking</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-700">{job.status}</span>
        </div>
        <div className="flex items-center">
          {TRACK_STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${done ? 'bg-brand-600 text-white' : 'bg-mist text-muted'}`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`mt-1 text-[9px] font-medium ${done ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
                </div>
                {i < TRACK_STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < current ? 'bg-brand-600' : 'bg-mist'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* live ETA bar (courier style) */}
      {enrouteOrStarted && (
        <div className="mx-4 mb-3 rounded-2xl bg-ink px-4 py-3 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{live ? `${live.distanceKm} km` : '—'}</span>
            <span className="flex items-center gap-1 font-bold text-feature">
              <Truck className="h-4 w-4" /> {job.status === 'started' ? 'On site · working' : live ? `~${live.etaMin} min` : (isWorker ? 'Sharing GPS…' : 'Locating…')}
            </span>
            <span className="text-white/60">{live?.updatedAt ? `${new Date(Date.now() + (live.etaMin ?? 0) * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '—'}</span>
          </div>
          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="absolute left-0 top-0 h-full rounded-full bg-feature transition-all" style={{ width: job.status === 'started' ? '100%' : live ? `${Math.max(8, Math.min(92, 100 - (live.distanceKm / 8) * 100))}%` : '8%' }} />
          </div>
        </div>
      )}

      {/* map */}
      {job.lat && (
        <MapView
          height={180}
          center={live ? { lat: live.liveLat, lng: live.liveLng } : { lat: job.lat, lng: job.lng }}
          markers={[
            { lat: job.lat, lng: job.lng, label: 'Job', kind: 'job' },
            ...(live ? [{ lat: live.liveLat, lng: live.liveLng, label: 'Worker', kind: 'worker' as const }] : []),
          ]}
        />
      )}

      {/* contact row — phone unlocks only after the agreement is signed */}
      {other && (
        <div className="flex items-center gap-3 border-t border-black/5 p-4">
          <Avatar name={other.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{other.name}</p>
            {job.contactsUnlocked ? (
              <p className="truncate text-xs text-muted">{isWorker ? 'Client' : 'Your worker'}{other.phone ? ` · ${other.phone}` : ''}</p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-amber-accent">{job.contactsLockedReason ?? 'Contact hidden until the agreement is signed'}</p>
            )}
          </div>
          <button onClick={onChat} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink"><MessageCircle className="h-4 w-4" /></button>
          {job.contactsUnlocked && other.phone ? (
            <a href={`tel:${other.phone}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><Phone className="h-4 w-4" /></a>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-muted" title="Sign the agreement to call"><Lock className="h-4 w-4" /></span>
          )}
        </div>
      )}
    </div>
  );
}

function PartyCard({ role, name }: { role: string; name?: string }) {
  return (
    <div className="card flex flex-1 items-center gap-2 p-3">
      <Avatar name={name ?? '?'} size={34} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-muted">{role}</p>
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
      </div>
    </div>
  );
}

function ActionBar({ job, isClient, isWorker, myRated, onBid, onRate, onPay, act }: any) {
  let content: React.ReactNode = null;
  const s = job.status;

  if (s === 'open' && !isClient) {
    content = <button onClick={onBid} className="btn-brand w-full"><Gavel className="h-4 w-4" /> Apply / place a bid</button>;
  } else if (s === 'open' && isClient) {
    content = <p className="text-center text-sm text-muted">Waiting for applicants — accept one above.</p>;
  } else if (s === 'accepted' && isWorker) {
    content = <button onClick={() => act('enroute', geo())} className="btn-brand w-full"><Truck className="h-4 w-4" /> I'm on my way</button>;
  } else if (s === 'accepted' && isClient) {
    content = <p className="text-center text-sm text-muted">Hired ✓ — the worker will head over. You'll see them live on the map.</p>;
  } else if (s === 'enroute' && isWorker) {
    content = <button onClick={() => act('start', geo())} className="btn-brand w-full"><Play className="h-4 w-4" /> Start the job</button>;
  } else if (s === 'started' && isWorker) {
    content = <button onClick={() => act('complete', { photoProofRef: 'photo_proof' })} className="btn-brand w-full"><Camera className="h-4 w-4" /> Mark work complete</button>;
  } else if ((s === 'enroute' || s === 'started') && isClient) {
    content = <p className="text-center text-sm text-muted">Tracking your worker above.</p>;
  } else if (s === 'completed' && isClient) {
    content = <button onClick={onPay} className="btn-brand w-full"><Wallet className="h-4 w-4" /> Pay {job.worker?.name?.split(' ')[0]} directly · {etb(job.agreedPrice)}</button>;
  } else if (s === 'completed' && isWorker) {
    content = <p className="text-center text-sm text-muted">Work submitted — waiting for the employer to pay you directly.</p>;
  } else if (s === 'paid' && isWorker) {
    content = <button onClick={() => act('finalize')} className="btn-brand w-full"><CheckCircle2 className="h-4 w-4" /> I received payment — finalize</button>;
  } else if (s === 'paid' && isClient) {
    content = <p className="text-center text-sm text-muted">Payment sent — waiting for the worker to confirm & finalize.</p>;
  } else if (s === 'confirmed' && (isClient || isWorker) && !myRated) {
    content = <button onClick={onRate} className="btn-primary w-full"><Star className="h-4 w-4" /> Rate {isClient ? 'worker' : 'client'}</button>;
  } else if (s === 'confirmed') {
    content = <p className="text-center text-sm text-brand-600">Job complete · worker paid directly ✓</p>;
  }

  if (!content) return null;
  return <div className="shrink-0 border-t border-black/5 bg-white/90 px-5 py-4 backdrop-blur">{content}</div>;
}

function geo(): any {
  return { lat: 9.0108, lng: 38.7613 };
}

function BidSheet({ open, onClose, job, onDone }: any) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    setError('');
    try {
      await api.post(`/api/jobs/${job.id}/bids`, { amount: Number(amount), message });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Place your bid">
      <p className="mb-3 text-sm text-muted">Fair-price band: {etb(job.priceBandLow)}–{job.priceBandHigh}</p>
      <label className="label">Your price (ETB)</label>
      <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" />
      <label className="label mt-3">Message</label>
      <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I can come today at 2pm" />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button onClick={submit} disabled={!amount} className="btn-brand mt-4 w-full">Submit bid</button>
    </Sheet>
  );
}

function PaySheet({ open, onClose, job, onDone, act }: any) {
  const [method, setMethod] = useState('telebirr');
  const [txRef, setTxRef] = useState('');
  const methods = [
    { k: 'telebirr', label: 'Telebirr' },
    { k: 'cbe_birr', label: 'CBE Birr' },
    { k: 'bank', label: 'Bank transfer' },
    { k: 'cash', label: 'Cash' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={`Pay ${job.worker?.name ?? 'worker'} directly`}>
      <div className="info mb-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Serategna never holds your money. You pay the worker directly — the worker keeps 100%. Confirm once you've sent <b>{etb(job.agreedPrice)}</b>.</span>
      </div>
      <label className="label">How did you pay?</label>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button key={m.k} onClick={() => setMethod(m.k)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${method === m.k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>{m.label}</button>
        ))}
      </div>
      {method !== 'cash' && (
        <>
          <label className="label mt-3">Transaction reference <span className="text-muted">(wage proof)</span></label>
          <input className="input" value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="e.g. Telebirr txn ID" />
        </>
      )}
      <button onClick={() => act('mark-paid', { method, txRef: txRef || undefined }).then(onDone)} className="btn-brand mt-4 w-full"><Wallet className="h-4 w-4" /> I've paid {etb(job.agreedPrice)}</button>
    </Sheet>
  );
}

function RateSheet({ open, onClose, jobId, onDone }: any) {
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  async function submit() {
    await api.post('/api/ratings', { jobId, stars, text, tags: [] });
    onDone();
  }
  return (
    <Sheet open={open} onClose={onClose} title="Leave a rating">
      <div className="flex justify-center gap-2 py-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => setStars(s)}>
            <Star className={`h-8 w-8 ${s <= stars ? 'fill-amber-accent text-amber-accent' : 'text-sand'}`} />
          </button>
        ))}
      </div>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional comment" />
      <button onClick={submit} className="btn-brand mt-4 w-full">Submit rating</button>
    </Sheet>
  );
}
