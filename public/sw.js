/* Service worker mínimo — necessário para instalar o app no desktop (PWA). */
const CACHE_VERSION = 'vendalume-fe-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
