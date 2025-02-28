import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// The Lord's Prayer - only output during build process
const lordsPrayer = `
Our Father, who art in heaven,
hallowed be thy name;
thy kingdom come;
thy will be done on earth as it is in heaven.
Give us this day our daily bread;
and forgive us our trespasses
as we forgive those who trespass against us;
and lead us not into temptation,
but deliver us from evil.
Amen.
`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lords-prayer',
      buildStart() {
        console.log('\n\n' + lordsPrayer + '\n\n');
      },
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        banner: '/* ' + lordsPrayer + ' */',
      },
    },
  },
});