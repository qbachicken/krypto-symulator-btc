// Podbij CACHE_VERSION przy każdej zmianie plików aplikacji.
// Zmiana tego pliku powoduje, że przeglądarka instaluje nowego service workera,
// który usuwa stare cache i przeładowuje otwarte karty.
const CACHE_VERSION = 'v5';
const CACHE_PREFIX = 'kryptosymulator-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Zewnętrzne biblioteki i czcionki: cache'owane w tle (stale-while-revalidate)
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' omija HTTP cache przeglądarki, więc zawsze pobieramy świeże pliki
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(new Request(url, { cache: 'reload' })).then((res) => {
            if (!res.ok) throw new Error(`Nie udało się pobrać ${url}: ${res.status}`);
            return cache.put(url, res);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const oldKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME);
      await Promise.all(oldKeys.map((k) => caches.delete(k)));
      await self.clients.claim();

      // Aktualizacja istniejącej instalacji: przeładuj otwarte karty,
      // żeby użytkownik od razu dostał nowy kod (a nie dopiero przy kolejnym wejściu).
      // Przy pierwszej instalacji nie ma starych cache, więc nic nie przeładowujemy.
      if (oldKeys.length > 0) {
        const windows = await self.clients.matchAll({ type: 'window' });
        windows.forEach((client) => client.navigate(client.url).catch(() => {}));
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API CoinGecko: zawsze prosto z sieci, bez cache (aplikacja sama obsługuje błędy)
  if (url.hostname.endsWith('coingecko.com')) return;

  // Pliki aplikacji: network-first (zawsze świeże), cache tylko jako zapas offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(url.href, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
    );
    return;
  }

  // Biblioteki z CDN i czcionki: stale-while-revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            // res.ok jest false dla odpowiedzi "opaque", a te też chcemy zapisać
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })
    );
  }
});
