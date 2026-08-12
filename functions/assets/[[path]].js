// Cloudflare Pages Function. Solo se ejecuta para rutas /assets/* que NO existen
// como archivo estático (los que existen se sirven directo, sin invocar esto).
//
// Antes, un chunk viejo pedido tras un deploy caía al fallback SPA (index.html,
// 200 text/html) y, por el header `immutable` de /assets/*, Cloudflare lo cacheaba
// como si fuera el JS → "Expected a JavaScript module but got text/html" y el sitio
// quedaba roto hasta el próximo deploy. El `_redirects` intentaba dar 404 pero Pages
// ignora el status 404 ahí; esta función SÍ devuelve un 404 real (sin caché), así
// nunca se envenena la caché y el front se auto-recupera (lazyWithRetry).
export const onRequest = () =>
  new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
