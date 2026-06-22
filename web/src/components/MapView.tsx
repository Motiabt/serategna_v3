import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  kind?: 'job' | 'worker' | 'me' | 'pin';
}

interface Props {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
const SPAN = 0.06; // fallback view span in degrees

let mapsPromise: Promise<any> | null = null;
function loadMaps(): Promise<any> {
  if (!KEY) return Promise.reject(new Error('no key'));
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.maps) return resolve(w.google);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
    s.async = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function MapView({ markers = [], center, zoom = 13, height = 200, onPick, className = '' }: Props) {
  const c = center ?? markers[0] ?? { lat: 8.9939, lng: 38.7894 };
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(onPick ? c : null);

  // Real Google Maps path
  useEffect(() => {
    if (!KEY || !ref.current) return;
    let map: any;
    let cleanup = () => {};
    loadMaps()
      .then((google) => {
        if (!ref.current) return;
        map = new google.maps.Map(ref.current, {
          center: c,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_STYLE,
        });
        markers.forEach((m) => new google.maps.Marker({ position: m, map, title: m.label }));
        let picked: any;
        if (onPick) {
          picked = new google.maps.Marker({ position: c, map, draggable: true });
          const set = (ll: any) => {
            setPin({ lat: ll.lat(), lng: ll.lng() });
            onPick(ll.lat(), ll.lng());
          };
          map.addListener('click', (e: any) => {
            picked.setPosition(e.latLng);
            set(e.latLng);
          });
          picked.addListener('dragend', (e: any) => set(e.latLng));
        }
        setReady(true);
        cleanup = () => {};
      })
      .catch(() => setReady(false));
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.lat, c.lng, zoom]);

  function fallbackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const lng = c.lng + (x - 0.5) * SPAN;
    const lat = c.lat - (y - 0.5) * SPAN;
    setPin({ lat, lng });
    onPick(lat, lng);
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPin({ lat, lng });
      onPick?.(lat, lng);
    });
  }

  // Google Maps container (rendered, becomes visible when ready)
  if (KEY) {
    return (
      <div className={`relative overflow-hidden rounded-3xl ${className}`} style={{ height }}>
        <div ref={ref} className="h-full w-full" />
        {onPick && (
          <button onClick={useMyLocation} className="glass-pill absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink">
            <LocateFixed className="h-3.5 w-3.5" /> My location
          </button>
        )}
        {!ready && <div className="absolute inset-0 animate-pulse bg-mist" />}
      </div>
    );
  }

  // Styled fallback "map" — functional picker, no key required
  const place = (m: { lat: number; lng: number }) => ({
    left: `${Math.max(6, Math.min(94, 50 + ((m.lng - c.lng) / SPAN) * 100))}%`,
    top: `${Math.max(6, Math.min(94, 50 - ((m.lat - c.lat) / SPAN) * 100))}%`,
  });

  return (
    <div
      onClick={fallbackClick}
      className={`relative overflow-hidden rounded-3xl border border-white/60 ${onPick ? 'cursor-crosshair' : ''} ${className}`}
      style={{
        height,
        backgroundImage:
          'linear-gradient(rgba(8,145,178,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.10) 1px, transparent 1px), radial-gradient(120% 90% at 30% 10%, #cffafe, transparent 60%), radial-gradient(120% 90% at 90% 90%, #dbeafe, transparent 60%)',
        backgroundSize: '26px 26px, 26px 26px, 100% 100%, 100% 100%',
        backgroundColor: '#eef2f7',
      }}
    >
      {markers.map((m, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={place(m)}>
          <div className={`flex flex-col items-center ${m.kind === 'me' ? 'text-accent-600' : 'text-brand-700'}`}>
            <MapPin className="h-6 w-6 drop-shadow" fill={m.kind === 'worker' ? '#06b6d4' : '#fff'} />
            {m.label && <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow">{m.label}</span>}
          </div>
        </div>
      ))}
      {pin && (
        <div className="absolute -translate-x-1/2 -translate-y-full" style={place(pin)}>
          <MapPin className="h-7 w-7 text-rose-600 drop-shadow" fill="#fff" />
        </div>
      )}
      <div className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-muted backdrop-blur">
        {onPick ? 'Tap to drop a pin' : 'Map'}
      </div>
      {onPick && (
        <button onClick={(e) => { e.stopPropagation(); useMyLocation(); }} className="glass-pill absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ink">
          <LocateFixed className="h-3.5 w-3.5" /> My location
        </button>
      )}
    </div>
  );
}

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'water', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'poi.park', stylers: [{ color: '#e0f2fe' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
];
