// Service Worker - 只缓存引擎大文件，HTML/CSS/JS走网络
const CACHE_NAME = 'chinese-chess-engine-v1';
// 只缓存引擎大文件（49MB的pikafish.data等），HTML/CSS/JS不缓存以确保更新
const CACHE_URLS = [
  './engine/pikafish.js',
  './engine/pikafish-worker.js',
  './engine/pikafish.wasm',
  './engine/pikafish.data',
  './audio/37c95d208d4789ac9574b7b9e9b6b646.m4a',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS).catch((err) => {
        console.warn('Service Worker: 部分文件缓存失败', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  var url = event.request.url;
  // 只对引擎文件和音频文件使用缓存优先策略
  var isEngineFile = url.indexOf('engine/') !== -1 || url.indexOf('audio/') !== -1;
  
  if (isEngineFile) {
    // 缓存优先：有缓存直接返回，无缓存才请求网络
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // 后台更新缓存
          fetch(event.request).then((res) => {
            if (res.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, res.clone());
              });
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, res.clone());
            });
          }
          return res;
        });
      })
    );
  }
  // 非引擎文件（HTML/CSS/JS）不走Service Worker，直接用浏览器默认行为
});
