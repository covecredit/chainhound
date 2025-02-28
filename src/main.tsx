import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only register service worker in production and if supported
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we're running in a WebContainer environment (StackBlitz)
    const isWebContainer = window.location.hostname.includes('stackblitz') || 
                           window.location.hostname.includes('webcontainer') ||
                           window.location.hostname === 'localhost';
    
    if (!isWebContainer) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check for updates on each page load
          registration.update();
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is installed but waiting
                  if (confirm('New version available! Reload to update?')) {
                    // Tell the service worker to skipWaiting
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    // Reload the page
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
        
      // Handle controller change (when skipWaiting is called)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
      });
    } else {
      console.log('Service Worker not registered: running in WebContainer environment');
    }
  });
}

// Add cache-busting timestamp to prevent caching issues
const timestamp = new Date().getTime();
const script = document.createElement('script');
script.type = 'text/javascript';
script.text = `window.appVersion = "${timestamp}";`;
document.head.appendChild(script);

// Add event listener for online/offline status
window.addEventListener('online', () => {
  console.log('Application is online');
  document.dispatchEvent(new CustomEvent('app-online'));
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  document.dispatchEvent(new CustomEvent('app-offline'));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);