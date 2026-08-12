import { lazy } from "react";

/**
 * `React.lazy` que se auto-recupera de fallos TRANSITORIOS al descargar un chunk.
 *
 * Contexto: durante un deploy, la purga de caché de Cloudflare deja el edge vacío
 * un instante; el primer fetch de un chunk en esa ventana puede fallar con
 * "Failed to fetch dynamically imported module" aunque el archivo exista. Antes
 * eso reventaba a la pantalla de error. Ahora:
 *
 *   1. Reintenta el import con backoff (por defecto 2 reintentos). Un blip de red
 *      o de deploy se resuelve solo en el 2º intento, sin que el usuario vea nada.
 *   2. Si tras los reintentos sigue fallando (caso real: el shell es viejo y el
 *      chunk ya no existe con ese hash), fuerza UNA recarga para tomar la versión
 *      nueva. Una guardia en sessionStorage evita el bucle de recargas.
 *
 * Se mantiene además el listener global `vite:preloadError` en main.jsx como red
 * de seguridad para los preloads que no pasan por aquí.
 */
export function lazyWithRetry(factory, { retries = 5, delay = 600 } = {}) {
  return lazy(
    () =>
      new Promise((resolve, reject) => {
        const attempt = (n) => {
          factory()
            .then(resolve)
            .catch((err) => {
              // Reintenta con backoff creciente (~9s en total). La ventana en la que
              // un chunk no está disponible durante un deploy suele durar pocos
              // segundos; reintentar la aguanta SIN recargar (menos disruptivo).
              if (n < retries) {
                setTimeout(() => attempt(n + 1), delay * (n + 1));
                return;
              }
              // Último recurso, tras agotar los reintentos: recarga una vez para
              // tomar el index.html nuevo (guardia anti-bucle en sessionStorage).
              const KEY = "chunk_reload_at";
              const last = Number(sessionStorage.getItem(KEY) || 0);
              if (Date.now() - last > 20000) {
                sessionStorage.setItem(KEY, String(Date.now()));
                window.location.reload();
                return; // la página se está recargando; no resolvemos ni rechazamos
              }
              reject(err);
            });
        };
        attempt(0);
      })
  );
}
