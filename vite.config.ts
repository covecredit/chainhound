import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'service-worker': resolve(__dirname, 'src/service-worker.ts'),
      },
      output: {
        entryFileNames: (assetInfo) => {
          return assetInfo.name === 'service-worker' 
            ? 'service-worker.js' 
            : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: {
    historyApiFallback: true,
  },
});