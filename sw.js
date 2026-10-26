/* BULK26 — service worker
 *
 * Rutas relativas a propósito: en GitHub Pages la app cuelga de /<repo>/, no de
 * la raíz, así que cualquier ruta absoluta rompería el registro y la caché.
 *
 * En cada despliegue que toque cualquier archivo hay que subir CACHE_VERSION:
 * el navegador solo instala un service worker nuevo si sw.js cambia byte a byte,
 * y es la instalación la que vuelve a descargar el shell y dispara el aviso de
 * recarga en la app. Las cachés solo guardan archivos de la app; los datos del
 * usuario viven en localStorage y ningún cambio de versión los toca.
 */
const CACHE_VERSION = 'bulk26-v2';
const CACHE_PREFIX  = 'bulk26-';
const SHELL         = CACHE_VERSION + '-shell';
const FONTS         = CACHE_VERSION + '-fonts';
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
      // cache:'reload' salta la caché HTTP (GitHub Pages da max-age=600): sin
      // esto una versión recién subida podía guardarse con el index anterior.
      .then(c => Promise.all(SHELL_URLS.map(u =>
        c.add(new Request(u, {cache: 'reload'})).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // Solo cachés propias y de otra versión: en <usuario>.github.io todos los
      // repos comparten origen, y por tanto también Cache Storage.
      .then(ks => Promise.all(ks
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== SHELL && k !== FONTS)
        .map(k => caches.delete(k))))
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
          // Un 404 o 5xx (p. ej. a mitad de un despliegue) no debe sustituir al
          // index que sirve la app sin conexión.
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html', {ignoreSearch: true})
                       .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Estáticos propios: caché primero, que no cambian sin subir CACHE_VERSION.
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
  if (e.data === 'version' && e.source) e.source.postMessage({version: CACHE_VERSION});
});
