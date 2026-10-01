/* TYELA service worker - simplified PWA (installable + push notifications).
   No offline playback: API calls, video embeds and cross-origin assets are
   always fetched from the network. Only same-origin static assets are cached. */

const CACHE_NAME = 'tyela-v1'
const PRECACHE = ['/', '/manifest.json', '/icons/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch cross-origin traffic (API, avatars and any external CDN).
  if (url.origin !== self.location.origin) return

  // API + socket polling → always fresh.
  if (url.pathname.startsWith('/api/')) return

  // Video embeds → always fresh.
  if (request.destination === 'iframe' || url.pathname.includes('/embed/')) return

  // Navigations (HTML documents): network-first so every deploy is picked up,
  // falling back to the cached shell only when offline.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
    )
    return
  }

  // Static assets (hashed JS/CSS/images): cache-first, fill on first visit.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
    })
  )
})

// Push notifications -------------------------------------------------------

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    /* non-JSON payload - use defaults */
  }

  const options = {
    body: data.message || 'New notification from TYELA',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'tyela-notification',
    renotify: true,
    data: {
      url: data.url || '/dashboard',
      sessionId: data.sessionId || null
    }
  }

  event.waitUntil(self.registration.showNotification(data.title || 'TYELA', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.split('#')[0] === targetUrl.split('#')[0] && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return null
    })
  )
})