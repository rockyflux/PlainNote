import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/web',
  build: {
    outDir: '../../dist/static',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3123',
      '/raw': 'http://127.0.0.1:3123',
    },
  },
});
