import { useEffect, useState } from "react";
import "./network-activity.css";
import "./loading-screen.css";

/**
 * Pantalla de carga con la marca, para cuando todavía no hay nada que mostrar
 * (se descarga la sección o se valida la sesión). Antes las páginas públicas
 * —portal de residentes, formularios, cotizaciones— se quedaban en blanco
 * mientras tanto; con red lenta parecía que el enlace no servía.
 */
export default function LoadingScreen({ message = "Cargando…", compact = false }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`load-screen${compact ? " is-compact" : ""}`} role="status" aria-live="polite">
      <img className="load-mark" src="/brand/ownterra-mark-color.svg" alt="" />
      <span className="net-spinner load-spinner" aria-hidden="true" />
      <p className="load-text">{message}</p>
      {slow && <p className="load-slow">La conexión está lenta. Seguimos cargando; no cierres la página.</p>}
    </div>
  );
}
