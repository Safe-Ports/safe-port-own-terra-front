import { useEffect, useState } from "react";
import { HiOutlineSignalSlash, HiOutlineSignal } from "react-icons/hi2";
import "./connection-banner.css";
import "./network-activity.css";

const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

/**
 * Aviso fijo cuando el dispositivo se queda sin internet. Antes no había ninguno:
 * cada pantalla fallaba por su lado con "No pudimos conectar con el servidor" y
 * un código OT-NET, o con la pantalla de "Algo se rompió" si el corte llegaba al
 * abrir una sección, y la persona no sabía que el problema era su conexión.
 * Al volver la red avisa unos segundos; React Query recarga los datos solo.
 */
export default function ConnectionBanner() {
  const [online, setOnline] = useState(isOnline);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    let timer;
    const goOffline = () => { window.clearTimeout(timer); setRecovered(false); setOnline(false); };
    const goOnline = () => {
      setOnline(true);
      setRecovered(true);
      timer = window.setTimeout(() => setRecovered(false), 4000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (online && !recovered) return null;
  return (
    <div className={`conn-banner ${online ? "is-back" : "is-offline"}`} role={online ? "status" : "alert"}>
      {online ? <HiOutlineSignal aria-hidden="true" /> : <HiOutlineSignalSlash aria-hidden="true" />}
      {!online && <span className="net-spinner" aria-hidden="true" />}
      <span>
        {online
          ? "Volvió la conexión. Ya puedes seguir trabajando."
          : "Sin conexión a internet. Reconectando… Lo que guardes no se enviará hasta que vuelva."}
      </span>
    </div>
  );
}
