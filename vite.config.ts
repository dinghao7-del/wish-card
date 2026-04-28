import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
  server: {
    hmr: true,
    port: 3000,
    host: '0.0.0.0',
  },
});
