// SMS delivery behind a swappable provider seam.
//
// In dev (no provider configured) it logs to the console so OTP flows work
// with zero setup. In production set SMS_PROVIDER + credentials and codes are
// delivered over a real gateway. Built-in providers:
//
//   SMS_PROVIDER=ethiotelecom   Ethio Telecom enterprise/bulk SMS gateway —
//                               ETHIOTEL_SMS_URL, ETHIOTEL_SENDER, and either
//                               ETHIOTEL_TOKEN or ETHIOTEL_USERNAME/PASSWORD.
//   SMS_PROVIDER=http           generic JSON gateway (AfroMessage / Geez SMS) —
//                               SMS_GATEWAY_URL, SMS_API_KEY, SMS_SENDER
//   SMS_PROVIDER=twilio         Twilio REST — SMS_ACCOUNT_SID, SMS_AUTH_TOKEN,
//                               SMS_SENDER (from number)
//
// Failures never throw to the caller — they are logged and surfaced via the
// returned boolean so callers can fall back to another channel.

import { logger } from './logger.js';

const PROVIDER = (process.env.SMS_PROVIDER ?? 'console').toLowerCase();

export interface SmsResult {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
}

export const smsConfigured = PROVIDER !== 'console' && PROVIDER !== 'none';

/**
 * Normalise an Ethiopian number to MSISDN form `2519XXXXXXXX` (no '+'), which
 * is what Ethio Telecom's gateway expects. Accepts +251…, 0…, or bare 9….
 */
export function normalizeEthioMsisdn(phone: string): string {
  let p = (phone ?? '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '251' + p.slice(1); // 0911234567 -> 251911234567
  else if (p.length === 9 && /^[97]/.test(p)) p = '251' + p; // 9.. (Ethio Telecom) / 7.. (Safaricom)
  return p;
}

/**
 * Is this a real Ethiopian MOBILE number on a licensed network?
 *   Ethio Telecom → +2519XXXXXXXX (09…)
 *   Safaricom ET  → +2517XXXXXXXX (07…)
 * (Format/prefix check. True registration is confirmed by the carrier at SMS
 * delivery — an unregistered number's OTP simply fails to deliver.)
 */
export function isEthiopianMobile(phone: string): boolean {
  return /^251[97]\d{8}$/.test(normalizeEthioMsisdn(phone));
}

async function viaEthioTelecom(to: string, body: string): Promise<SmsResult> {
  const url = process.env.ETHIOTEL_SMS_URL;
  const sender = process.env.ETHIOTEL_SENDER ?? process.env.SMS_SENDER ?? 'Serategna';
  const token = process.env.ETHIOTEL_TOKEN;
  const username = process.env.ETHIOTEL_USERNAME;
  const password = process.env.ETHIOTEL_PASSWORD;
  if (!url || (!token && !(username && password))) {
    return { ok: false, provider: 'ethiotelecom', error: 'ETHIOTEL_SMS_URL + ETHIOTEL_TOKEN (or ETHIOTEL_USERNAME/PASSWORD) not set' };
  }
  const msisdn = normalizeEthioMsisdn(to);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Ethio Telecom bulk-SMS payload. Field names follow the common enterprise
  // gateway contract; include several aliases so it works across gateway
  // versions. Confirm exact field names against your onboarding packet.
  const payload: Record<string, unknown> = {
    from: sender, sender, to: msisdn, msisdn, recipient: msisdn,
    message: body, text: body, content: body,
  };
  if (!token && username) { payload.username = username; payload.password = password; }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as { messageId?: string; id?: string; message_id?: string; status?: string };
  if (!res.ok) return { ok: false, provider: 'ethiotelecom', error: `gateway ${res.status}` };
  return { ok: true, provider: 'ethiotelecom', id: data.messageId ?? data.message_id ?? data.id };
}

async function viaHttp(to: string, body: string): Promise<SmsResult> {
  const url = process.env.SMS_GATEWAY_URL;
  const key = process.env.SMS_API_KEY;
  if (!url || !key) return { ok: false, provider: 'http', error: 'SMS_GATEWAY_URL / SMS_API_KEY not set' };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ to, from: process.env.SMS_SENDER ?? 'Serategna', message: body, text: body }),
  });
  if (!res.ok) return { ok: false, provider: 'http', error: `gateway ${res.status}` };
  const data = (await res.json().catch(() => ({}))) as { id?: string; message_id?: string };
  return { ok: true, provider: 'http', id: data.id ?? data.message_id };
}

async function viaTwilio(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.SMS_ACCOUNT_SID;
  const token = process.env.SMS_AUTH_TOKEN;
  const from = process.env.SMS_SENDER;
  if (!sid || !token || !from) return { ok: false, provider: 'twilio', error: 'Twilio credentials not set' };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok) return { ok: false, provider: 'twilio', error: data.message ?? `twilio ${res.status}` };
  return { ok: true, provider: 'twilio', id: data.sid };
}

/** Send one SMS. Never throws; returns a result describing what happened. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  try {
    if (PROVIDER === 'ethiotelecom') return await viaEthioTelecom(to, body);
    if (PROVIDER === 'http') return await viaHttp(to, body);
    if (PROVIDER === 'twilio') return await viaTwilio(to, body);
    // console / none — dev fallback
    logger.info('sms.console', { to, body });
    return { ok: true, provider: 'console' };
  } catch (err) {
    logger.error('sms.error', { to, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, provider: PROVIDER, error: err instanceof Error ? err.message : String(err) };
  }
}
