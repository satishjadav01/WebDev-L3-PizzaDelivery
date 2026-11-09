import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const DEFAULT_API_TARGET = 'http://localhost:4000';
const DEFAULT_DEV_PORT = 5173;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: DEFAULT_DEV_PORT,
      // Same-origin in development, so the API needs no CORS round-trips.
      proxy: { '/api': { target: env.VITE_DEV_API_TARGET || DEFAULT_API_TARGET, changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
    },
  };
});
