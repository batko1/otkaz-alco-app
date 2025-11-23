import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ВАЖНО: Это должно совпадать с названием репозитория (otkaz-alco-app)
  base: '/otkaz-alco-app/', 
  build: {
    outDir: 'dist',
  },
  define: {
    // Полифил для process.env, чтобы избежать ошибки "process is not defined" в браузере
    'process.env': {}
  }
});