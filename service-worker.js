// A basic service worker for PWA functionality

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Pre-caching assets can be done here if needed
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
});

self.addEventListener('fetch', (event) => {
  // For a simple app, we can use a network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback can be handled here if you have a cached offline page
    })
  );
});
