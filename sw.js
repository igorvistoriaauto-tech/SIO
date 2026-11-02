// Service worker do SIO - permite instalar o app e usar sem internet
const CACHE = 'sio-v1';
const ARQUIVOS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];
const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE).then(function(cache) {
            // Guarda a biblioteca de PDF para funcionar sem internet
            const guardaJsPdf = cache.add(new Request(JSPDF, { mode: 'no-cors' })).catch(function() {});
            return Promise.all([cache.addAll(ARQUIVOS), guardaJsPdf]);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(nomes) {
            return Promise.all(nomes.filter(function(n) { return n !== CACHE; }).map(function(n) { return caches.delete(n); }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const mesmaOrigem = url.origin === self.location.origin;

    if (mesmaOrigem) {
        // Arquivos do próprio sistema: tenta a internet primeiro (pega atualizações) e usa o guardado se estiver sem conexão
        event.respondWith(
            fetch(req).then(function(resp) {
                const copia = resp.clone();
                caches.open(CACHE).then(function(cache) { cache.put(req, copia); });
                return resp;
            }).catch(function() {
                return caches.match(req).then(function(r) {
                    return r || caches.match('./index.html');
                });
            })
        );
        return;
    }

    if (req.url === JSPDF) {
        // Biblioteca de PDF: usa a guardada primeiro
        event.respondWith(
            caches.match(req).then(function(r) {
                return r || fetch(req).then(function(resp) {
                    const copia = resp.clone();
                    caches.open(CACHE).then(function(cache) { cache.put(req, copia); });
                    return resp;
                });
            })
        );
    }
});
