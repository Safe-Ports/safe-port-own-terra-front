import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useAppContext } from "@/context/AppContext";
import { replayTour } from "@/components/tour/GuidedTour";
import { TOURS } from "@/tours/definitions";

// Los "hidden" son continuaciones de otro tour (encadenadas por waitFor: la parte 2,
// 3... de un mismo flujo) — el usuario las ve como UN solo recorrido, así que no se
// listan por separado.
const VISIBLE_TOURS = TOURS.filter((t) => !t.hidden);

/**
 * Lista de tours guiados, con check de completado e "Iniciar"/"Repetir" por cada
 * uno. Vive DENTRO de GuideModal (el botón "❓ Guías") a propósito: es transversal a
 * toda la app, así que cualquier página con ese botón la muestra automáticamente,
 * sin que cada página tenga que montarla por su cuenta.
 */
function GuidedToursSection({ onClose }) {
  const { currentUser, canUseFeature } = useAppContext();
  const navigate = useNavigate();
  const seenTours = currentUser?.tours_seen || [];
  // Solo los recorridos de pantallas a las que este usuario entra: ofrecerle uno
  // que termina en "sin acceso" es peor que no ofrecerlo.
  const tours = VISIBLE_TOURS.filter((t) => !t.gate || canUseFeature(t.gate));

  // Relanzar un tour: si vive en una ruta concreta, navega ahí primero y lo dispara
  // cuando la pantalla ya existe (si no, no habría elementos que iluminar). Los
  // manual-only (sin `route`, como Restricciones) se lanzan de inmediato, aquí mismo.
  const iniciarTour = (tour) => {
    // Imprescindible cerrar Guías aquí, explícito: el modal usa z-index 9999 y el
    // tour 45 a propósito (para que los modales de la app queden siempre encima de
    // un tour corriendo) — si el modal se queda abierto, tapa al tour para siempre.
    // Para un tour con ruta esto suele resolverse solo al navegar (la página que
    // contiene el modal se desmonta), pero para uno sin ruta (Restricciones, que no
    // navega a ningún lado) el modal jamás se cerraría por su cuenta.
    onClose();
    if (tour.route) {
      navigate(tour.route);
      setTimeout(() => replayTour(tour.key), 400);
    } else {
      replayTour(tour.key);
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 6, paddingTop: 14 }}>
      <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>
        🧭 Tours guiados
      </div>
      <div className="space-y-2">
        {tours.map((tour) => {
          const done = seenTours.includes(tour.key);
          return (
            <div
              key={tour.key}
              className="d-row"
              style={{ alignItems: "center", cursor: "pointer" }}
              onClick={() => iniciarTour(tour)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iniciarTour(tour); }}
            >
              <span className="d-lbl" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">{done ? "✅" : "⬜"}</span>
                <span>
                  <div style={{ fontWeight: 600 }}>{tour.label}</div>
                  <div style={{ fontSize: ".76rem", color: "var(--mu, #83867C)" }}>{tour.description}</div>
                </span>
              </span>
              <button
                type="button"
                className="btn-s"
                onClick={(e) => { e.stopPropagation(); iniciarTour(tour); }}
              >
                {done ? "Repetir" : "Iniciar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GuideModal({ open, onClose, title, subtitle, steps }) {
  useEscapeKey(onClose, open);

  if (!open) return null;
  return createPortal(
    <div className="guide-overlay" onClick={onClose}>
      <div
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="guide-head">
          <div className="guide-icon">?</div>
          <div className="guide-head-text">
            <div className="guide-title">{title}</div>
            {subtitle && <div className="guide-sub">{subtitle}</div>}
          </div>
          <button className="guide-close-x" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="guide-body">
          {steps.map(({ title: t, text }, i) => (
            <div key={i} className="guide-step">
              <div className="guide-step-num">{i + 1}</div>
              <div className="guide-step-content">
                <div className="guide-step-title">{t}</div>
                <div className="guide-step-text">{text}</div>
              </div>
            </div>
          ))}
          <GuidedToursSection onClose={onClose} />
        </div>
        <div className="guide-foot">
          <button className="guide-ok" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
