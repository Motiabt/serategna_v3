import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The codebase uses NodeNext-style ".js" specifiers on TS files. Strip the
  // extension on relative imports so Vite resolves the real ".ts" source.
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' }],
  },
  test: {
    // A dedicated, isolated SQLite DB so tests never touch dev/prod data.
    // NODE_ENV=test also disables rate limiters so repeated logins don't throttle.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      OTP_DEV_MODE: 'true',
      SMS_PROVIDER: 'console',
    },
    // SQLite is single-writer — run test files sequentially to avoid contention.
    fileParallelism: false,
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
