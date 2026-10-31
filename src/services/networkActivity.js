/**
 * Peticiones a la API en curso, para mostrar que la app está trabajando cuando
 * la red va lenta. Antes una petición de 8 s se veía como una pantalla congelada
 * y la persona volvía a dar clic (duplicando guardados) o cerraba la app.
 *
 * Cada cliente de axios se engancha con `trackAxios`. Las que generan archivos
 * (PDF, Excel, importaciones: timeout largo) cuentan para la barra de progreso,
 * pero no para el aviso de "conexión lenta": que tarden es normal.
 */

let nextId = 1;
const pending = new Map();
const listeners = new Set();
const DEFAULT_TIMEOUT = 15000;

function emit() {
  listeners.forEach((fn) => fn());
}

export function startRequest({ expectSlow = false } = {}) {
  const id = nextId;
  nextId += 1;
  pending.set(id, { startedAt: Date.now(), expectSlow });
  emit();
  return id;
}

export function endRequest(id) {
  if (pending.delete(id)) emit();
}

/** La petición normal (no de archivo) más antigua en curso, o null. */
export function snapshot(now = Date.now()) {
  let oldest = null;
  let oldestNormal = null;
  pending.forEach(({ startedAt, expectSlow }) => {
    if (oldest === null || startedAt < oldest) oldest = startedAt;
    if (!expectSlow && (oldestNormal === null || startedAt < oldestNormal)) oldestNormal = startedAt;
  });
  return {
    count: pending.size,
    longestMs: oldest === null ? 0 : now - oldest,
    longestNormalMs: oldestNormal === null ? 0 : now - oldestNormal,
  };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function trackAxios(instance) {
  instance.interceptors.request.use((config) => {
    config.__activityId = startRequest({ expectSlow: (config.timeout ?? DEFAULT_TIMEOUT) > DEFAULT_TIMEOUT });
    return config;
  });
  instance.interceptors.response.use(
    (response) => { endRequest(response.config?.__activityId); return response; },
    (error) => { endRequest(error?.config?.__activityId); return Promise.reject(error); },
  );
  return instance;
}

/** Solo para pruebas. */
export function resetNetworkActivity() {
  pending.clear();
  emit();
}
