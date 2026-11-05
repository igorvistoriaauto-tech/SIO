// Service worker do SIO
// Estratégia "rede primeiro": sempre busca a versão mais nova no servidor (GitHub).
// A cópia guardada só é usada quando o aparelho está sem internet.
const CACHE = 'sio-cache-v1';
const ARQUIVOS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.all(ARQUIVOS.map((arquivo) => cache.add(arquivo).catch(() => {})))
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
            .then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Firebase, bibliotecas externas etc. continuam indo direto para a rede
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req.url, { cache: 'no-cache' })
            .then((resposta) => {
                if (resposta && resposta.ok) {
                    const copia = resposta.clone();
                    caches.open(CACHE).then((cache) => cache.put(req.url, copia));
                }
                return resposta;
            })
            .catch(() =>
                caches.match(req.url, { ignoreSearch: true }).then((guardado) => {
                    if (guardado) return guardado;
                    if (req.mode === 'navigate') return caches.match('./index.html');
                    return Response.error();
                })
            )
    );
});
