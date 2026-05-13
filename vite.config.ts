import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  root: '.',
  server: {
    hmr: true,
    port: 3000,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
    exclude: [],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@google/genai') || id.includes('@supabase')) return 'vendor-ai-data';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('date-fns') || id.includes('i18next')) return 'vendor-utils';
          return undefined;
        },
      },
    },
  },
});
