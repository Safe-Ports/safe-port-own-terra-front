import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { HiSquares2X2 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

/**
 * Servicios transversales del ecosistema: los que comparten todas las apps,
 * los mismos que el Hub lista bajo "Servicios compartidos por todas las apps
 * core".
 *
 * Las verticales (Lands, Finanzas como app, Construction…) no van acá: a esas
 * se entra desde el Hub o desde su propio menú. Este lanzador es para lo que se
 * necesita SIN salir de la vertical en la que estás trabajando.
 *
 * `gate` decide si el usuario lo tiene habilitado; sin `gate`, está para todos.
 */
const SERVICES = [
  { key: "finanzas",    label: "Finanzas",     icon: "eco-n-chart",    to: "/finanzas",                gate: (c) => c.canAccessApp("finanzas") },
  { key: "agenda",      label: "Calendario",   icon: "eco-n-calendar", to: "/ecosistema/agenda" },
  { key: "mi-dia",      label: "Mi Día",       icon: "eco-n-sun",      to: "/ecosistema/mi-dia" },
  { key: "formularios", label: "Formularios",  icon: "eco-n-forms",    to: "/ecosistema/formularios",  gate: (c) => c.canUseFeature("core.forms") },
  { key: "proveedores", label: "Proveedores",  icon: "eco-n-box",      to: "/ecosistema/proveedores",  gate: (c) => c.canUseFeature("core.providers") },
  { key: "vault",       label: "Vault",        icon: "eco-n-vault",    to: "/ecosistema/documentos",   gate: (c) => c.canUseFeature("core.vault") },
];

/**
 * Lanzador de servicios del ecosistema, al estilo del menú de cuadrícula de
 * Google: da acceso a lo transversal —agenda, documentos, formularios— sin
 * tener que volver al Hub y perder el contexto de la vertical.
 */
export default function AppLauncher() {
  const navigate = useNavigate();
  const ctx = useAppContext();
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

  const go = (svc) => {
    if (svc.gate && !svc.gate(ctx)) {
      ctx.showToast(`Tu usuario no tiene acceso a ${svc.label}`, "warning");
      return;
    }
    setOpen(false);
    navigate(svc.to);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`app-launcher-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Servicios del ecosistema"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Servicios del ecosistema"
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
          <div className="alp-title">Servicios del ecosistema</div>
          <div className="alp-grid">
            {SERVICES.map((svc) => (
              <button
                key={svc.key}
                type="button"
                role="menuitem"
                className={`alp-item${svc.gate && !svc.gate(ctx) ? " is-off" : ""}`}
                onClick={() => go(svc)}
                title={svc.label}
              >
                <span className="alp-ico">
                  <svg><use href={`#${svc.icon}`} /></svg>
                </span>
                <span className="alp-lbl">{svc.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
