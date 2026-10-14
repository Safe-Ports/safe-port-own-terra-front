import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./dialog-portal.css";

// Conserva el ámbito de tema sin introducir un ancestro que atrape el overlay.
// El contenedor vive en body; su caja no participa en el layout.
function DialogPortal({ children, ...props }) {
  const overlayRef = useRef(null);
  const previousRef = useRef(typeof document !== "undefined" ? document.activeElement : null);
  const [theme, setTheme] = useState("");

  useEffect(() => {
    const overlay = overlayRef.current;
    const previous = previousRef.current;
    const layout = document.querySelector(".eco-root:not(.dialog-theme), .app-shell:not(.dialog-theme)");
    setTheme(layout?.classList.contains("eco-root") ? `eco-root ${layout.classList.contains("properties-focus") ? "properties-focus" : ""}` : layout?.classList.contains("app-shell") ? "app-shell" : "");
    const focusable = () => [...overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1).filter(el => !el.hidden && el.getAttribute("aria-hidden") !== "true" && el.getClientRects().length > 0);
    const dialog = overlay.querySelector('[role="dialog"]');
    if (dialog && !dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
    if (!overlay.contains(document.activeElement)) (focusable()[0] || dialog)?.focus();
    const trap = event => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    overlay.addEventListener("keydown", trap);
    return () => { overlay.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus(); };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(<div className={`dialog-theme ${theme}`.trim()}><div ref={overlayRef} {...props}>{children}</div></div>, document.body);
}

export default DialogPortal;
