import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { HiSquares2X2 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

/**
 * Las verticales del ecosistema. Son destinos "grandes": entrar a una cambia
 * el espacio de trabajo entero, por eso van separadas de los servicios.
 *
 * `live: false` son las que aún no existen; se muestran apagadas para que se
 * sepa que vienen, en vez de esconderlas.
 */
const APPS = [
  { key: "lands",  label: "Lands",        icon: "eco-g-lands",  to: "/dashboard",    gate: (c) => c.canAccessApp("lands") },
  { key: "homes",  label: "Construction", icon: "eco-g-homes",  to: "/construccion", live: false },
  { key: "neighb", label: "Properties",   icon: "eco-g-neighb", to: "/ecosistema",   live: false },
];

/**
 * Servicios transversales: los que comparten todas las apps, los mismos que el
 * Hub agrupa bajo "Servicios compartidos por todas las apps core".
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

  const blocked = (item) => item.live === false || (item.gate && !item.gate(ctx));

  const go = (item) => {
    if (item.live === false) {
      ctx.showToast(`${item.label} todavía no está disponible`, "warning");
      return;
    }
    if (item.gate && !item.gate(ctx)) {
      ctx.showToast(`Tu usuario no tiene acceso a ${item.label}`, "warning");
      return;
    }
    setOpen(false);
    navigate(item.to);
  };

  const renderGrid = (items) => (
    <div className="alp-grid">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`alp-item${blocked(item) ? " is-off" : ""}`}
          onClick={() => go(item)}
          title={item.live === false ? `${item.label} — próximamente` : item.label}
        >
          <span className="alp-ico">
            <svg><use href={`#${item.icon}`} /></svg>
          </span>
          <span className="alp-lbl">{item.label}</span>
          {item.live === false && <span className="alp-soon">Pronto</span>}
        </button>
      ))}
    </div>
  );

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
          <div className="alp-title">Aplicaciones</div>
          {renderGrid(APPS)}

          <div className="alp-sep" />

          <div className="alp-title">Servicios del ecosistema</div>
          {renderGrid(SERVICES)}
        </div>,
        document.body
      )}
    </>
  );
}
