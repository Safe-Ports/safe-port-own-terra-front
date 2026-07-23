import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CREATABLE_APPS, TYPES, buildAppointmentBody } from "./agendaShared";

const POPOVER_WIDTH = 300;
const GAP = 8;

function formatSlotLabel(date, time) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${label} · ${time}`;
}

// Popover ligero de "crear rápido" al hacer clic en una celda vacía de la
// rejilla horaria — fecha/hora vienen fijas por la celda clicada, así que no
// necesita validación de campos (a diferencia del modal completo).
function AgendaQuickCreate({ date, time, anchorRect, onClose, onSubmit, onMore }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("evento");
  const [app, setApp] = useState("core");
  const [submitting, setSubmitting] = useState(false);
  const [style, setStyle] = useState({ position: "fixed", top: anchorRect.top, left: anchorRect.right + GAP, visibility: "hidden" });
  const boxRef = useRef(null);
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = anchorRect.right + GAP;
    if (left + rect.width > window.innerWidth - 8) {
      left = anchorRect.left - rect.width - GAP;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));

    let top = anchorRect.top;
    if (top + rect.height > window.innerHeight - 8) {
      top = window.innerHeight - rect.height - 8;
    }
    top = Math.max(8, top);

    setStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [anchorRect]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (!boxRef.current?.contains(e.target)) onClose(); };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = buildAppointmentBody({ title, date, time, type, app, client: "", context: "", owner: "" });
      await onSubmit(body);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={boxRef} className="ag-quickcreate" style={{ ...style, width: POPOVER_WIDTH }} onMouseDown={(e) => e.stopPropagation()}>
      <form onSubmit={handleSubmit}>
        <div className="ag-quickcreate-slot">{formatSlotLabel(date, time)}</div>
        <input
          ref={titleRef}
          className="ag-quickcreate-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Añadir título"
        />
        <div className="ag-quickcreate-row">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={app} onChange={(e) => setApp(e.target.value)}>
            {CREATABLE_APPS.map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}
          </select>
        </div>
        <div className="ag-quickcreate-foot">
          <button type="button" className="ag-quickcreate-more" onClick={() => onMore(date, time)}>Más opciones</button>
          <button type="submit" className="ag-primary" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AgendaQuickCreate;
