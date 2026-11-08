import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project-site URL:
// https://jk-larbi.github.io/FNI-Cells-Connect/
export default defineConfig({
  base: '/FNI-Cells-Connect/',
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: true,
  },
});
