import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages uses a project-site subpath. Capacitor bundles run from the
// native WebView root, so use a root base only for Android builds.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  base: isCapacitorBuild ? '/' : '/FNI-Cells-Connect/',
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
