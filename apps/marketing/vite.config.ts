import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react() as any],
  server: {
    port: 3000,
    allowedHosts: ['bebsayik.com', 'www.bebsayik.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
