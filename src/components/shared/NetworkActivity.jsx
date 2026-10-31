import { useEffect, useState } from "react";
import { snapshot, subscribe } from "@/services/networkActivity";
import "./network-activity.css";

// Por debajo de esto no se muestra nada: una carga rápida con barra parpadea.
export const SHOW_BAR_AFTER_MS = 600;
// A partir de aquí se le explica a la persona por qué tarda.
export const SLOW_AFTER_MS = 5000;

/**
 * Señal visible de que la app sigue trabajando: una barra fina arriba cuando
 * una petición tarda más de lo normal y, si pasa de unos segundos, un aviso de
 * "conexión lenta". Sin internet no se muestra: ahí manda ConnectionBanner.
 */
export default function NetworkActivity() {
  const [state, setState] = useState(() => snapshot());

  useEffect(() => {
    let timer = null;
    const refresh = () => {
      const next = snapshot();
      setState(next);
      window.clearTimeout(timer);
      // Mientras haya algo en curso se re-evalúa: el tiempo avanza aunque no
      // empiece ni termine ninguna petición.
      if (next.count > 0) timer = window.setTimeout(refresh, 400);
    };
    const unsubscribe = subscribe(refresh);
    refresh();
    return () => { unsubscribe(); window.clearTimeout(timer); };
  }, []);

  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
  const showBar = state.count > 0 && state.longestMs >= SHOW_BAR_AFTER_MS;
  const slow = state.count > 0 && state.longestNormalMs >= SLOW_AFTER_MS;
  if (!showBar) return null;

  return (
    <>
      <div className="net-bar" role="progressbar" aria-label="Cargando" />
      {slow && (
        <div className="net-slow" role="status">
          <span className="net-spinner" aria-hidden="true" />
          Tu conexión está lenta. Seguimos cargando, no cierres la página.
        </div>
      )}
    </>
  );
}
