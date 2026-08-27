import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { HiSquares2X2 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { VERTICAL_APP_CATALOG } from "@/services/permissions";

/**
 * Dónde entra cada vertical. El catálogo define qué apps existen; esto sólo
 * dice a qué pantalla lleva cada una.
 */
const APP_ROUTE = {
  lands: "/dashboard",
  finanzas: "/finanzas",
  homes: "/construccion",
  neighb: "/ecosistema",
};

/**
 * Lanzador de aplicaciones, al estilo del menú de cuadrícula de Google: desde
 * cualquier vertical se salta a otra sin pasar por el Hub.
 *
 * Lista únicamente las apps VERTICALES en producción — `VERTICAL_APP_CATALOG`
 * ya filtra por `vertical && live`, así que sumar una vertical nueva no
 * requiere tocar este archivo. El Core queda fuera: no es una app a la que se
 * "entra", y sus accesos (Mi Día, Calendario, Perfil) ya están en esta misma
 * barra, al lado del botón.
 */
export default function AppLauncher() {
  const navigate = useNavigate();
  const { canAccessApp, showToast } = useAppContext();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Se mide antes del paint para que no se vea saltar desde la esquina.
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return;
    const b = btnRef.current.getBoundingClientRect();
    const p = popRef.current.getBoundingClientRect();
    let left = b.right - p.width;           // alineado a la derecha del botón
    if (left + p.width > window.innerWidth - 12) left = window.innerWidth - p.width - 12;
    if (left < 12) left = 12;
    setPos({ left, top: b.bottom + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const go = (app) => {
    if (!canAccessApp(app.key)) {
      showToast(`Tu usuario no tiene acceso a ${app.name}`, "warning");
      return;
    }
    setOpen(false);
    navigate(APP_ROUTE[app.key] || "/ecosistema");
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`app-launcher-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Aplicaciones del ecosistema"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Aplicaciones"
      >
        <HiSquares2X2 aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="app-launcher-pop"
          role="menu"
          style={pos ? { left: pos.left, top: pos.top } : { opacity: 0 }}
        >
          <div className="alp-title">Aplicaciones</div>
          <div className="alp-grid">
            {VERTICAL_APP_CATALOG.map((app) => (
              <button
                key={app.key}
                type="button"
                role="menuitem"
                className={`alp-item${canAccessApp(app.key) ? "" : " is-off"}`}
                onClick={() => go(app)}
                title={app.desc}
              >
                <span className="alp-ico">
                  <svg><use href={`#${app.icon}`} /></svg>
                </span>
                {/* "OwnTerra Lands" → "Lands": el prefijo se repite en todas y
                    no distingue una app de otra. */}
                <span className="alp-lbl">{app.name.replace(/^OwnTerra /, "")}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
