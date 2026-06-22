import { ReactNode, useEffect, useRef, useState } from 'react';
import { X, Heart, Info, RotateCcw } from 'lucide-react';

export interface DeckHelpers {
  like: () => void;
  skip: () => void;
  details: () => void;
}

interface Props<T> {
  items: T[];
  keyOf: (t: T) => string;
  renderFront: (t: T, h: DeckHelpers) => ReactNode;
  renderBack?: (t: T) => ReactNode;
  onLike: (t: T) => void;
  onSkip: (t: T) => void;
  onDetails: (t: T) => void;
  likeLabel?: string;
  emptyTitle?: string;
  emptySub?: string;
}

const ACCENT = '#22D3EE';

export function SwipeDeck<T>({
  items, keyOf, renderFront, renderBack, onLike, onSkip, onDetails, likeLabel = 'Like', emptyTitle = 'Nothing here', emptySub,
}: Props<T>) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);

  const remaining = items.slice(index);

  function go(dir: 1 | -1, item: T) {
    if (dir === 1) onLike(item);
    else onSkip(item);
    setIndex((i) => i + 1);
  }

  if (remaining.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Heart className="h-7 w-7" />
        </div>
        <p className="text-lg font-extrabold text-ink">{emptyTitle}</p>
        {emptySub && <p className="text-sm text-muted">{emptySub}</p>}
        {items.length > 0 && (
          <button onClick={() => setIndex(0)} className="btn-ghost mt-1"><RotateCcw className="h-4 w-4" /> Start over</button>
        )}
      </div>
    );
  }

  const top = remaining[0];

  return (
    <div className="flex flex-1 flex-col px-5 pt-3">
      <div className="relative mx-auto h-[440px] w-full max-w-sm">
        {remaining.slice(0, 3).map((item, i) => {
          if (i === 0) {
            return (
              <TopCard key={keyOf(item)} onResolve={(dir) => go(dir, item)}>
                {(h) => renderFront(item, { ...h, details: () => onDetails(item) })}
              </TopCard>
            );
          }
          return (
            <div
              key={keyOf(item)}
              className="absolute inset-x-0 top-0 mx-auto overflow-hidden rounded-[2rem] bg-charcoal p-5 text-white shadow-card"
              style={{
                height: 408,
                transform: `translateY(${i * 16}px) scale(${1 - i * 0.045})`,
                zIndex: 10 - i,
                opacity: 0.5 - i * 0.12,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
            >
              {renderBack ? renderBack(item) : null}
            </div>
          );
        })}
      </div>

      {/* Dating-app action bar */}
      <div className="mt-6 flex items-center justify-center gap-4">
        {index > 0 && (
          <button onClick={() => setIndex((i) => Math.max(0, i - 1))} aria-label="Rewind" className="btn flex h-11 w-11 items-center justify-center rounded-full bg-white p-0 text-amber-accent shadow-card">
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => go(-1, top)} aria-label="Pass" className="btn flex h-16 w-16 items-center justify-center rounded-full bg-white p-0 text-crimson shadow-card ring-1 ring-black/[0.04]">
          <X className="h-7 w-7" strokeWidth={2.5} />
        </button>
        <button onClick={() => onDetails(top)} aria-label="Details" className="btn flex h-12 w-12 items-center justify-center rounded-full bg-ink p-0 text-white shadow-card">
          <Info className="h-5 w-5" />
        </button>
        <button onClick={() => go(1, top)} aria-label={likeLabel} className="btn flex h-16 w-16 items-center justify-center rounded-full p-0 text-white shadow-[0_10px_28px_-8px_rgba(6,182,212,0.7)]" style={{ background: 'linear-gradient(160deg,#22D3EE,#0891B2)' }}>
          <Heart className="h-7 w-7" strokeWidth={2.5} fill="currentColor" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-muted">Swipe right to {likeLabel.toLowerCase()} · left to pass</p>
    </div>
  );
}

function TopCard({ onResolve, children }: { onResolve: (dir: 1 | -1) => void; children: (h: DeckHelpers) => ReactNode }) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [leaving, setLeaving] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDx(e.clientX - start.current.x);
    setDy(e.clientY - start.current.y);
  };
  const onUp = () => {
    if (!start.current) return;
    if (Math.abs(dx) > 110) {
      const dir = dx > 0 ? 1 : -1;
      setLeaving(dir);
      setTimeout(() => onResolve(dir), 200);
    } else { setDx(0); setDy(0); }
    start.current = null;
  };

  const offsetX = leaving ? leaving * 640 : dx;
  const dragging = start.current != null;
  // Stamp opacity scales with drag distance — classic dating-app feel.
  const likeOp = Math.max(0, Math.min(1, dx / 110));
  const skipOp = Math.max(0, Math.min(1, -dx / 110));

  const helpers: DeckHelpers = {
    like: () => { setLeaving(1); setTimeout(() => onResolve(1), 200); },
    skip: () => { setLeaving(-1); setTimeout(() => onResolve(-1), 200); },
    details: () => {},
  };

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className="absolute inset-x-0 top-0 mx-auto flex flex-col cursor-grab touch-none select-none overflow-hidden rounded-[2rem] p-5 text-ink shadow-float active:cursor-grabbing"
      style={{
        background: `radial-gradient(130% 120% at 100% 0%, rgba(255,255,255,0.45) 0%, transparent 42%), linear-gradient(165deg, #5EEAFB 0%, ${ACCENT} 55%, #06B6D4 100%)`,
        height: 408,
        zIndex: 20,
        transform: `translate(${offsetX}px, ${leaving ? 0 : dy * 0.4}px) rotate(${offsetX / 18}deg)`,
        transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* LIKE / NOPE stamps (rotated, scale with drag) */}
      <span
        className="pointer-events-none absolute left-6 top-7 z-30 rounded-xl border-[3px] border-emerald-500 px-3 py-1 text-lg font-extrabold uppercase tracking-wider text-emerald-500"
        style={{ opacity: likeOp, transform: `rotate(-14deg) scale(${0.8 + likeOp * 0.3})` }}
      >
        Like
      </span>
      <span
        className="pointer-events-none absolute right-6 top-7 z-30 rounded-xl border-[3px] px-3 py-1 text-lg font-extrabold uppercase tracking-wider"
        style={{ opacity: skipOp, transform: `rotate(14deg) scale(${0.8 + skipOp * 0.3})`, color: '#E11D48', borderColor: '#E11D48' }}
      >
        Nope
      </span>
      {children(helpers)}
    </div>
  );
}
