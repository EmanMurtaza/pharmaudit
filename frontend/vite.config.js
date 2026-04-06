import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Strip /api prefix before forwarding to backend
        // (mirrors Vercel's experimentalServices routePrefix behaviour)
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
