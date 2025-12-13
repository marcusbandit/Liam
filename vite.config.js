import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This is the main vite config for development
// The renderer config is in vite.renderer.config.mjs for Electron Forge
export default defineConfig({
  plugins: [react()],
  base: './',
  root: './src/renderer',
  server: {
    port: 5173,
  },
  build: {
    outDir: '../../dist',
  },
});
