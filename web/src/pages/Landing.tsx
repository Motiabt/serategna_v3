import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Star, MapPin, Wallet, BadgeCheck, ArrowRight, Phone, Mail, Building2, Home, TrendingUp, Apple, Play,
} from 'lucide-react';
import { BrandMark } from '../components/ui';

export function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-black/[0.05] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-lg font-extrabold tracking-tight">Serategna</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => nav('/enterprises')} className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink hover:bg-mist sm:block">Enterprises</button>
            <button onClick={() => nav('/login')} className="btn-brand px-4 py-2 text-sm">Open the app <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero mx-auto mt-6 max-w-5xl rounded-[2rem] px-6 py-14 sm:px-12 sm:py-20">
          <p className="text-sm font-semibold text-brand-200">ሰራተኛ · Worker</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Verified work. Fair pay. A financial identity for Ethiopia's real economy.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/80">
            Hire trusted workers — from housemaids to tradespeople — without the delala. Workers build a portable Serategna Score that unlocks credit. No held funds, no broker cut.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => nav('/login')} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-ink">Get started <ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => nav('/enterprises')} className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur">For institutions</button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">No broker fee</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Guarantor (ዋስ) backed</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Minimum wage enforced</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Trilingual AM · OM · EN</span>
          </div>
        </div>
      </section>

      {/* Housemaid highlight */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <div>
            <span className="pill bg-brand-50 text-brand-700"><Home className="h-3 w-3" /> Permanent housemaids</span>
            <h2 className="mt-3 text-2xl font-extrabold">The trusted way to hire a maid</h2>
            <p className="mt-2 text-muted">Delalas are expensive, opaque, and leave maids underpaid. Serategna fixes all three: vetted & rated workers, a mandatory legal guarantor (ዋስ), a guaranteed fair wage, and a flat ETB 100/month — no commission.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['No broker fee — ever', 'Guarantor (ዋስ) required for every maid', 'Minimum living wage enforced', 'Agree in-app, sign the legal contract in person'].map((t) => (
                <li key={t} className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-600" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, t: 'Fayda-verified' },
              { icon: Star, t: 'Rated & reviewed' },
              { icon: TrendingUp, t: 'Serategna Score' },
              { icon: Wallet, t: 'Paid directly' },
            ].map((c) => (
              <div key={c.t} className="card flex flex-col items-center gap-2 p-6 text-center">
                <c.icon className="h-7 w-7 text-brand-600" />
                <span className="text-sm font-semibold">{c.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two sides */}
      <section className="bg-mist py-14">
        <div className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2">
          <div className="card p-7">
            <h3 className="text-xl font-extrabold">For workers</h3>
            <p className="mt-2 text-sm text-muted">Find work near you, keep 100% of your pay, and build a verified income record + Score that unlocks loans, certifications and a shareable income passport.</p>
            <button onClick={() => nav('/login')} className="btn-ghost mt-4">Find work</button>
          </div>
          <div className="card p-7">
            <h3 className="text-xl font-extrabold">For employers</h3>
            <p className="mt-2 text-sm text-muted">Post jobs, swipe to shortlist verified workers, pay directly, and hire with confidence — escrow-free, broker-free, with deadlines and dispute support.</p>
            <button onClick={() => nav('/login')} className="btn-ghost mt-4">Hire someone</button>
          </div>
        </div>
      </section>

      {/* Enterprises strip */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="hero flex flex-col items-start gap-4 rounded-[2rem] p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-200"><Building2 className="h-4 w-4" /> Enterprises</span>
            <h2 className="mt-2 text-2xl font-extrabold">Hiring at scale? We'll pool & manage talent for you.</h2>
            <p className="mt-1 text-sm text-white/80">Bulk posting, private talent pools, manager seats, or a fully Serategna-managed service — by agreement.</p>
          </div>
          <button onClick={() => nav('/enterprises')} className="shrink-0 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-ink">See packages</button>
        </div>
      </section>

      {/* Download + contact */}
      <section className="border-t border-black/[0.05] bg-ink py-12 text-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2.5"><BrandMark size={32} /><span className="text-lg font-extrabold">Serategna</span></div>
            <p className="mt-3 max-w-sm text-sm text-white/60">The work-to-credit operating system for Ethiopia's real economy.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => nav('/login')} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold"><Apple className="h-4 w-4" /> App Store</button>
              <button onClick={() => nav('/login')} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold"><Play className="h-4 w-4" /> Google Play</button>
            </div>
          </div>
          <div className="text-sm text-white/70">
            <p className="font-semibold text-white">Contact & call center</p>
            <p className="mt-2 flex items-center gap-2"><Phone className="h-4 w-4 text-brand-400" /> +251 960 00 00 00 · short code 8294</p>
            <p className="mt-1.5 flex items-center gap-2"><Mail className="h-4 w-4 text-brand-400" /> support@serategna.et</p>
            <p className="mt-1.5 flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-400" /> Bole Sub-city, Addis Ababa</p>
            <p className="mt-1.5 text-xs text-white/40">Mon–Sat, 8:00–20:00 (EAT)</p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-white/30">© 2026 Serategna · Mo Creatives · Addis Ababa</p>
      </section>
    </div>
  );
}
