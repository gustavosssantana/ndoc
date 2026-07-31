import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Em produção na Vercel não há proxy: /api/* resolve para as funções em api/.
 * Localmente, rode `vercel dev` (porta 3000) e o proxy abaixo encaminha para lá.
 */
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
