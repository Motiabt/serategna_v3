// Send one real SMS through the configured provider to confirm delivery.
//
//   node scripts/send-test-sms.mjs +251911234567 "Serategna test"
//
// Reads SMS_PROVIDER + credentials from your environment / .env. With
// SMS_PROVIDER=ethiotelecom this hits the live Ethio Telecom gateway.
import 'dotenv/config';
import { sendSms, normalizeEthioMsisdn } from '../src/lib/sms.ts';

const to = process.argv[2];
const msg = process.argv[3] ?? 'Serategna test message. If you received this, SMS is working.';
if (!to) {
  console.error('Usage: node scripts/send-test-sms.mjs <phone> [message]');
  process.exit(1);
}

console.log(`provider = ${process.env.SMS_PROVIDER ?? 'console'}`);
console.log(`to       = ${to}  (msisdn: ${normalizeEthioMsisdn(to)})`);
const r = await sendSms(to, msg);
console.log('result   =', r);
process.exit(r.ok ? 0 : 1);
