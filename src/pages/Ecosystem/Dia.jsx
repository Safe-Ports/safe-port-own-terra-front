import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "./EcoLayout";

const APP_META = {
  lands: { name: "Lands", color: "#6FAF6B", live: true },
  neighb: { name: "Neighborhoods", color: "#355E3B", live: false },
  homes: { name: "Homes", color: "#A7CBA1", live: false },
};

/* Mock front — consolidado de todas las apps del ecosistema. */
const VISITS = [
  { t: "09:00", name: "María González Ruiz", meta: "Visita · Lote 14 · Mz 3, Bosques", app: "lands", status: "completed" },
  { t: "11:30", name: "Carlos Ramírez Soto", meta: "Llamada de seguimiento · Depto 204", app: "neighb", status: "completed" },
  { t: "13:00", name: "Jorge Méndez Lara", meta: "Firma de contrato · Casa 8, Altavista", app: "homes", status: "active" },
  { t: "16:00", name: "Sofía Herrera Pino", meta: "Recorrido de obra · Lote 21", app: "lands", status: "upcoming" },
];

const SIGNATURES = [
  { doc: "Contrato compraventa · Lote 7", who: "Carlos Ramírez", app: "lands", prio: "alta" },
  { doc: "Reglamento de colonos", who: "Laura Sánchez", app: "neighb", prio: "media" },
  { doc: "Escritura · Casa 8", who: "Jorge Méndez", app: "homes", prio: "baja" },
];

const OVERDUE = [
  { who: "Carlos Ramírez", concept: "Lote 7 · Pago 8/36", amount: "$12,500", late: 3, app: "lands" },
  { who: "Pedro Díaz", concept: "Lote 3 · Pago 11/24", amount: "$24,600", late: 9, app: "lands" },
];

const NOTIF_GROUPS = [
  { key: "hoy", label: "Hoy", items: [
    { ico: "💳", text: "Pago recibido de María González · $15,000", time: "hace 1 h", app: "lands" },
    { ico: "✍️", text: "Jorge firmó el contrato CT-2301", time: "hace 3 h", app: "homes" },
  ] },
  { key: "ayer", label: "Ayer", items: [
    { ico: "📅", text: "Nueva visita programada · Lote 22", time: "hace 1 día", app: "lands" },
    { ico: "📄", text: "Actualización en el expediente de Ana López", time: "hace 1 día", app: "neighb" },
  ] },
  { key: "semana", label: "Esta semana", items: [
    { ico: "🏗️", text: "Sofía Herrera completó recorrido de obra", time: "hace 2 días", app: "lands" },
    { ico: "🔔", text: "Recordatorio: reunión de comité", time: "hace 3 días", app: "homes" },
  ] },
];

const STATUS_DOT = { completed: "✓", active: "", upcoming: "", pending: "" };
const QUICK = [{ ico: "📅", label: "Visita" }, { ico: "✍️", label: "Firma" }, { ico: "💰", label: "Cobro" }, { ico: "📄", label: "Documento" }];

function AppTag({ app }) {
  const a = APP_META[app];
  return <span className="md-tag"><span className="dot" style={{ background: a.color }} />{a.name}</span>;
}

function EcosystemDia() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [ntab, setNtab] = useState("Todas");

  const firstName = (currentUser?.name || "Laura").split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const emoji = hour < 12 ? "👋" : hour < 19 ? "🌤️" : "🌙";

  const total = VISITS.length;
  const done = VISITS.filter((v) => v.status === "completed").length;
  const pct = Math.round((done / total) * 100);
  const totalOverdue = OVERDUE.reduce((s, o) => s + Number(o.amount.replace(/[^0-9]/g, "")), 0);

  const motiv = done === total
    ? "¡Completaste todas tus visitas del día! 🎉 Excelente trabajo."
    : OVERDUE.length > 0
      ? `Vas muy bien — cierra el día recuperando ${OVERDUE.length} pago${OVERDUE.length > 1 ? "s" : ""} pendiente${OVERDUE.length > 1 ? "s" : ""}. 💪`
      : `Llevas ${done} de ${total} visitas. ¡Tú puedes con el resto! 🚀`;

  const open = (app) => APP_META[app]?.live && navigate("/dashboard");
  const tabs = ["Todas", "Hoy", "Ayer", "Esta semana"];
  const tabKey = { Hoy: "hoy", Ayer: "ayer", "Esta semana": "semana" };
  const shownGroups = ntab === "Todas" ? NOTIF_GROUPS : NOTIF_GROUPS.filter((g) => g.key === tabKey[ntab]);

  return (
    <EcoLayout active="miday" title="Mi Día" subtitle="Tu jornada consolidada en el ecosistema">

      {/* HERO motivador */}
      <div className="md-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-greet">{greet}, {firstName} {emoji}</div>
          <div className="md-greet-sub">{motiv}</div>
        </div>
        <div className="md-prog">
          <div className="md-prog-top">
            <span className="md-prog-label">Progreso del día</span>
            <span className="md-prog-pct">{pct}%</span>
          </div>
          <div className="md-prog-bar"><div className="md-prog-fill" style={{ width: `${pct}%` }} /></div>
          <div className="md-prog-meta">{done} de {total} visitas realizadas</div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-qa-label">Acciones rápidas</div>
          <div className="md-qa">
            {QUICK.map((q) => (
              <button key={q.label} className="md-qa-btn" onClick={() => q.label === "Documento" && navigate("/ecosistema/documentos")}>
                <span>{q.ico}</span>{q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="md-kpis">
        <div className="md-kpi">
          <span className="md-kpi-ico">📅</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Visitas hoy</div>
            <div className="md-kpi-val">{VISITS.length}</div>
            <div className="md-kpi-sub">Agendadas en todas las apps</div>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">✍️</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Firmas pendientes</div>
            <div className="md-kpi-val">{SIGNATURES.length}</div>
            <div className="md-kpi-sub">Esperando rúbrica</div>
          </div>
        </div>
        <div className="md-kpi danger">
          <span className="md-kpi-badge">Urgente</span>
          <span className="md-kpi-ico">⚠️</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Pagos vencidos</div>
            <div className="md-kpi-val">{OVERDUE.length}</div>
            <div className="md-kpi-sub">${totalOverdue.toLocaleString("en-US")} por cobrar</div>
            <button className="md-kpi-cta">Revisar ahora</button>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">🔔</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Notificaciones</div>
            <div className="md-kpi-val">{NOTIF_GROUPS.reduce((s, g) => s + g.items.length, 0)}</div>
            <div className="md-kpi-sub">Nuevas hoy</div>
          </div>
        </div>
      </div>

      <div className="md-grid">
        {/* AGENDA */}
        <div className="md-card">
          <div className="md-card-head">
            <div>
              <div className="md-card-title">Agenda del día</div>
              <div className="md-card-sub">visitas, llamadas y firmas</div>
            </div>
            <a className="sh-link" href="#">Ver agenda completa →</a>
          </div>
          {VISITS.map((v, i) => (
            <div key={i} className={`md-visit ${v.status === "active" ? "is-active" : ""}`}>
              <div className="md-time"><b>{v.t}</b><span>HRS</span></div>
              <div className="md-st"><span className={`md-sdot ${v.status}`}>{STATUS_DOT[v.status]}</span></div>
              <div className="md-info">
                <div className="md-name">{v.name}</div>
                <div className="md-meta">{v.meta}</div>
              </div>
              <AppTag app={v.app} />
              {APP_META[v.app].live
                ? <span className="md-open" onClick={() => open(v.app)}>Ver expediente →</span>
                : <span className="md-open" style={{ opacity: .5, cursor: "default" }}>Ver detalle →</span>}
            </div>
          ))}
          <div className="md-legend">
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#6FAF6B" }}>✓</span>Completada</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#1E3D2B" }} />En curso</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "transparent", border: "2px solid var(--border2)" }} />Próxima</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "transparent", border: "2px solid var(--border2)" }} />Pendiente</span>
          </div>
        </div>

        {/* FIRMAS + PAGOS */}
        <div className="md-side">
          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">Firmas pendientes</div>
              <a className="sh-link" href="#">Ver todas →</a>
            </div>
            {SIGNATURES.map((s, i) => (
              <div key={i} className="md-row">
                <span className={`md-prio ${s.prio}`}>{s.prio.charAt(0).toUpperCase() + s.prio.slice(1)}</span>
                <span className="md-row-ico" style={{ background: "rgba(111,175,107,.12)" }}>✍️</span>
                <div className="md-row-info">
                  <div className="md-row-name">{s.doc}</div>
                  <div className="md-row-meta">{s.who}</div>
                </div>
                <AppTag app={s.app} />
                <button className="md-btn">Firmar</button>
              </div>
            ))}
          </div>

          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">Pagos vencidos</div>
              <a className="sh-link" href="#">Ver cobranza →</a>
            </div>
            {OVERDUE.map((o, i) => (
              <div key={i} className="md-row">
                <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
                <div className="md-row-info">
                  <div className="md-row-name">{o.who}</div>
                  <div className="md-row-meta">{o.concept} · <AppTag app={o.app} /></div>
                </div>
                <span className="md-late">{o.late} días vencido</span>
                <span className="md-amount">{o.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NOTIFICACIONES */}
      <div className="md-card" style={{ marginBottom: 30 }}>
        <div className="md-card-head" style={{ marginBottom: 16 }}>
          <div className="md-card-title">Notificaciones</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="seg">
              {tabs.map((t) => <span key={t} className={ntab === t ? "on" : ""} onClick={() => setNtab(t)}>{t}</span>)}
            </div>
            <a className="sh-link" href="#">Marcar todas como leídas</a>
          </div>
        </div>
        <div className="md-ngrid">
          {shownGroups.map((g) => (
            <div key={g.key}>
              <div className="md-ngroup-label">{g.label}</div>
              {g.items.map((n, i) => (
                <div key={i} className="md-row">
                  <span className="md-row-ico" style={{ background: "var(--bg2)" }}>{n.ico}</span>
                  <div className="md-row-info">
                    <div className="md-row-name" style={{ whiteSpace: "normal" }}>{n.text}</div>
                    <div className="md-row-meta">{n.time}</div>
                  </div>
                  <AppTag app={n.app} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </EcoLayout>
  );
}

export default EcosystemDia;
