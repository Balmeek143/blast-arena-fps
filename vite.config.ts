import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './client',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: true
  }
});
