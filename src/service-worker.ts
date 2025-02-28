// This is a basic service worker implementation for ChainHound
// It will be responsible for background data fetching and caching

const CACHE_NAME = 'chainhound-cache-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential files
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        '/favicon.svg',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event: any) => {
  // Skip cross-origin requests and API requests
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('infura.io') ||
      event.request.url.includes('cloudflare-eth.com') ||
      event.request.url.includes('ankr.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If the network is unavailable, serve the offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return null;
        });
    })
  );
});

// Background sync for transaction data
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactionData());
  }
});

// Function to sync transaction data in the background
async function syncTransactionData() {
  // This would be implemented to fetch updated blockchain data
  console.log('Background sync: Updating transaction data');
  
  // In a real implementation, this would:
  // 1. Fetch new blockchain data from the Ethereum node
  // 2. Update the cached data
  // 3. Notify the application of changes if it's open
}

// Message handling from the main application
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'CACHE_NEW_TRANSACTION') {
    // Cache a new transaction that the user has viewed
    const transaction = event.data.transaction;
    
    caches.open(CACHE_NAME).then((cache) => {
      const url = `/api/transactions/${transaction.hash}`;
      cache.put(url, new Response(JSON.stringify(transaction)));
    });
  }
});

export {};