import { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { api } from '../lib/api';

export function SafetyButton({ jobId }: { jobId?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function trigger(triggerType: 'button' | 'silent') {
    setState('sending');
    let coords: { lat?: number; lng?: number } = {};
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }),
      );
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      /* location optional */
    }
    try {
      await api.post('/api/sos/trigger', { jobId, triggerType, ...coords });
      setState('sent');
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('idle');
    }
  }

  return (
    <button
      onClick={() => trigger('button')}
      onContextMenu={(e) => {
        e.preventDefault();
        trigger('silent');
      }}
      disabled={state !== 'idle'}
      className={`btn w-full ${
        state === 'sent' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {state === 'sent' ? (
        <>
          <Check className="h-5 w-5" /> Emergency dispatched
        </>
      ) : (
        <>
          <ShieldAlert className="h-5 w-5" /> {state === 'sending' ? 'Sending…' : 'SoS — Get help now'}
        </>
      )}
    </button>
  );
}
