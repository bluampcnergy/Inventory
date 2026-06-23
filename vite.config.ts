import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    const openRouterKey = env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(openRouterKey)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});