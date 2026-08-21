/* BULK26 — service worker
 *
 * Rutas relativas a propósito: en GitHub Pages la app cuelga de /<repo>/, no de
 * la raíz, así que cualquier ruta absoluta rompería el registro y la caché.
 *
 * Al tocar index.html hay que subir VERSION: es lo que dispara el borrado de la
 * caché vieja en 'activate' y el aviso de recarga en la app.
 */
const VERSION    = 'bulk26-v1';
const SHELL      = VERSION + '-shell';
const FONTS      = VERSION + '-fonts';
const SHELL_URLS = [
  './',
  './index.html',
  './chart.umd.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      // addAll es atómico: si un recurso falla no se instala nada. Se piden de
      // uno en uno para que un 404 puntual no deje la app sin caché entera.
      .then(c => Promise.all(SHELL_URLS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isFont = url =>
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tipografías de Google: se sirven de caché y se refrescan por detrás, así la
  // app conserva su tipografía sin conexión tras la primera carga con red.
  if (isFont(url)) {
    e.respondWith(
      caches.open(FONTS).then(c =>
        c.match(req).then(hit => {
          const net = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navegación: primero la red, para que una versión nueva entre en cuanto haya
  // cobertura; si no hay, el index cacheado. Sin esto el gimnasio sin señal deja
  // la app en blanco.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', {ignoreSearch: true})
                       .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Estáticos propios: caché primero, que no cambian sin subir VERSION.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
