import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Honour a launcher-assigned PORT (preview/autoPort); default to 5173 for
    // local dev. /api is proxied server-side, so the web port can be anything.
    port: Number(process.env.PORT) || 5173,
    host: true, // expose on LAN so you can scan the QR and open on your phone
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Rewrite origin so Express CORS allows requests arriving via the
            // LAN IP (e.g. from the mobile WebView at 172.x.x.x:5173).
            proxyReq.setHeader('origin', 'http://localhost:5173');
          });
        },
      },
    },
  },
});
