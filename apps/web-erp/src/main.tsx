import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

// Register PWA Service Worker in supported browser environments
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Bebsayik PWA] Service Worker registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('[Bebsayik PWA] Service Worker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
