<llm-snippet-file>service-worker.js</llm-snippet-file>
// Nome do cache
const CACHE_NAME = 'cifras-fm-v1';

// Arquivos para cache
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './songs.json',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
    'https://image.winudf.com/v2/image1/amVzdXMuZGlvcy5jYW5jaW9uZXMuY3Jpc3RpYW5hLm9yYWNpb24uYmlibGlhLnJlbGlnaW9uX3NjcmVlbl8wXzE1NDgxNTM0MjhfMDIy/screen-0.jpg?fakeurl=1&type=.jpg'
];

// Instalar o service worker e cachear arquivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Limpar caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('Removendo cache antigo', key);
                    return caches.delete(key);
                }
            }));
        })
    );

    // Garantir que o service worker seja ativado imediatamente
    self.clients.claim();
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', event => {
    // Verificar se a requisição é do mesmo origem ou dos CDNs permitidos
    if (event.request.url.startsWith(self.location.origin) ||
        event.request.url.includes('cdn.jsdelivr.net') ||
        event.request.url.includes('cdnjs.cloudflare.com')) {

        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Se a resposta for válida, clonar e armazenar no cache
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Se offline, tentar responder do cache
                    return caches.match(event.request);
                })
        );
    }
});

// Sincronizar dados quando o dispositivo ficar online novamente
self.addEventListener('sync', event => {
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

// Função para sincronizar favoritos (simulação)
function syncFavorites() {
    return new Promise((resolve, reject) => {
        // Aqui você implementaria a sincronização real com um servidor, se necessário
        console.log('Sincronizando favoritos...');
        resolve();
    });
}
