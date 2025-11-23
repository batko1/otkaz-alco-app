import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base path to ensure assets load correctly on any GitHub Pages URL
  base: './', 
  build: {
    outDir: 'dist',
  },
  define: {
    // Polyfill for libraries that might reference process.env
    'process.env': {}
  }
});
