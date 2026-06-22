import { app } from './app.js';
import { config } from './config.js';
import { smsConfigured } from './lib/sms.js';

app.listen(config.port, () => {
  console.log(`\n  ሰራተኛ  Serategna API  ·  http://localhost:${config.port}`);
  console.log(`  env=${config.env}  ·  cors=${config.corsOrigins.join(', ')}`);
  console.log(`  sms=${smsConfigured ? process.env.SMS_PROVIDER : 'console (dev)'}  ·  otpDevMode=${config.otpDevMode}\n`);
});
