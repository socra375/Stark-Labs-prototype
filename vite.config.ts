import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Relative base so the built bundle works regardless of the path it's served from
  // (e.g. a GitHub Pages project site at /<repo-name>/) without needing per-host config.
  base: './',
  server: { port: 5173, host: true },
  build: { target: 'es2022', sourcemap: true },
});
