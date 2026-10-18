import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react() as any],
  server: {
    port: 3002,
    allowedHosts: ['admin.bebsayik.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
