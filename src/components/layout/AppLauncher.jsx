import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { HiSquares2X2 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

/**
 * Apps del ecosistema alcanzables desde cualquier vertical.
 *
 * `gate` decide si el usuario la tiene habilitada; una app sin `gate` está
 * disponible para todos. `live: false` son las verticales que todavía no
 * existen: se muestran apagadas para que se sepa que vienen, en vez de
 * esconderlas y que nadie sepa que el ecosistema es más grande.
 */
const APPS = [
  { key: "core",     label: "Ecosistema",   icon: "eco-brand",       to: "/ecosistema" },
  { key: "lands",    label: "Lands",        icon: "eco-g-lands",     to: "/dashboard",              gate: (c) => c.canAccessApp("lands") },
  { key: "finanzas", label: "Finanzas",     icon: "eco-g-finanzas",  to: "/finanzas",               gate: (c) => c.canAccessApp("finanzas") },
  { key: "vault",    label: "Vault",        icon: "eco-n-vault",     to: "/ecosistema/documentos",  gate: (c) => c.canUseFeature("core.vault") },
  { key: "homes",    label: "Construction", icon: "eco-g-homes",     to: "/construccion",           live: false },
  { key: "neighb",   label: "Properties",   icon: "eco-g-neighb",    to: "/ecosistema",             live: false },
];

/** Accesos del core que no son apps, pero se usan a diario. */
const SHORTCUTS = [
  { label: "Mi Día",     icon: "eco-n-sun",      to: "/ecosistema/mi-dia" },
  { label: "Calendario", icon: "eco-n-calendar", to: "/ecosistema/agenda" },
  { label: "Equipo",     icon: "eco-n-users",    to: "/ecosistema/equipo",   gate: (c) => c.canUseFeature("core.team") },
  { label: "Clientes",   icon: "eco-n-users",    to: "/ecosistema/clientes", gate: (c) => c.canUseFeature("core.clients") },
];

/**
 * Lanzador de aplicaciones del ecosistema, al estilo del menú de cuadrícula de
 * Google: desde cualquier vertical se puede saltar a otra sin pasar por el Hub.
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
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", () => setOpen(false));
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

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

  const visibleShortcuts = SHORTCUTS.filter((s) => !s.gate || s.gate(ctx));

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
            {APPS.map((app) => {
              const blocked = app.live === false || (app.gate && !app.gate(ctx));
              return (
                <button
                  key={app.key}
                  type="button"
                  role="menuitem"
                  className={`alp-item${blocked ? " is-off" : ""}`}
                  onClick={() => go(app)}
                  title={app.live === false ? `${app.label} — próximamente` : app.label}
                >
                  <span className="alp-ico">
                    <svg><use href={`#${app.icon}`} /></svg>
                  </span>
                  <span className="alp-lbl">{app.label}</span>
                  {app.live === false && <span className="alp-soon">Pronto</span>}
                </button>
              );
            })}
          </div>

          {visibleShortcuts.length > 0 && (
            <>
              <div className="alp-sep" />
              <div className="alp-title">Accesos</div>
              <div className="alp-grid">
                {visibleShortcuts.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    role="menuitem"
                    className="alp-item"
                    onClick={() => go(s)}
                  >
                    <span className="alp-ico neutral">
                      <svg><use href={`#${s.icon}`} /></svg>
                    </span>
                    <span className="alp-lbl">{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
