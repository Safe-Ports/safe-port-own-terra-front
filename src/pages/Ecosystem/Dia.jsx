import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { dashboardService } from "@/services/dashboardService";
import { appointmentService } from "@/services/appointmentService";
import { paymentService } from "@/services/paymentService";
import { notificationService } from "@/services/notificationService";
import EcoLayout from "./EcoLayout";

const APP_META = {
  lands: { name: "Lands", color: "#6FAF6B", live: true },
  neighb: { name: "Neighborhoods", color: "#355E3B", live: false },
  homes: { name: "Homes", color: "#A7CBA1", live: false },
};

const QUICK = [{ ico: "📅", label: "Visita" }, { ico: "✍️", label: "Firma" }, { ico: "💰", label: "Cobro" }, { ico: "📄", label: "Documento" }];

function AppTag({ app }) {
  const a = APP_META[app] || APP_META.lands;
  return <span className="md-tag"><span className="dot" style={{ background: a.color }} />{a.name}</span>;
}

function fmtRelative(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} día(s)`;
}

function toTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function EcosystemDia() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser } = useAppContext();
  const [ntab, setNtab] = useState("Todas");

  const { data: midia } = useQuery({
    queryKey: ["dashboard-midia"],
    queryFn: () => dashboardService.midia(),
  });

  const { data: rawAppts = [] } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () => appointmentService.list({ upcoming_only: true }),
  });

  const { data: overdueData } = useQuery({
    queryKey: ["payments-overdue"],
    queryFn: () => paymentService.overdue(),
  });
  const overdueItems = overdueData?.items ?? [];

  const { data: notifsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list({ limit: 20 }),
  });
  const notifs = notifsData?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const firstName = midia?.user_first_name || (currentUser?.name || "").split(" ")[0] || "Bienvenido";
  const greeting = midia?.greeting || (() => {
    const h = new Date().getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  })();
  const emoji = (() => { const h = new Date().getHours(); return h < 12 ? "👋" : h < 19 ? "🌤️" : "🌙"; })();

  const todayAppts = rawAppts.filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const totalAppts = todayAppts.length;
  const done = todayAppts.filter((a) => a.status === "confirmed").length;
  const pct = totalAppts > 0 ? Math.round((done / totalAppts) * 100) : 0;

  const totalOverdue = overdueItems.reduce((s, o) => s + Number(o.amount || 0), 0);

  const unreadCount = notifs.filter((n) => !n.read_at).length;

  // Group notifications by recency
  const now = Date.now();
  const todayNotifs = notifs.filter((n) => now - new Date(n.created_at).getTime() < 86400000);
  const yesterdayNotifs = notifs.filter((n) => {
    const d = now - new Date(n.created_at).getTime();
    return d >= 86400000 && d < 172800000;
  });
  const weekNotifs = notifs.filter((n) => {
    const d = now - new Date(n.created_at).getTime();
    return d >= 172800000 && d < 604800000;
  });

  const NOTIF_GROUPS = [
    { key: "hoy", label: "Hoy", items: todayNotifs },
    { key: "ayer", label: "Ayer", items: yesterdayNotifs },
    { key: "semana", label: "Esta semana", items: weekNotifs },
  ].filter((g) => g.items.length > 0);

  const tabs = ["Todas", "Hoy", "Ayer", "Esta semana"];
  const tabKey = { Hoy: "hoy", Ayer: "ayer", "Esta semana": "semana" };
  const shownGroups = ntab === "Todas" ? NOTIF_GROUPS : NOTIF_GROUPS.filter((g) => g.key === tabKey[ntab]);

  const motiv = done === totalAppts && totalAppts > 0
    ? "¡Completaste todas tus citas del día! 🎉 Excelente trabajo."
    : overdueItems.length > 0
      ? `Vas muy bien — cierra el día recuperando ${overdueItems.length} pago${overdueItems.length > 1 ? "s" : ""} pendiente${overdueItems.length > 1 ? "s" : ""}. 💪`
      : totalAppts > 0
        ? `Llevas ${done} de ${totalAppts} citas. ¡Tú puedes con el resto! 🚀`
        : "Sin citas para hoy. Buen momento para planificar. 📋";

  const open = (app) => APP_META[app]?.live && navigate("/dashboard");

  return (
    <EcoLayout active="miday" title="Mi Día" subtitle="Tu jornada consolidada en el ecosistema">

      {/* HERO motivador */}
      <div className="md-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-greet">{greeting}, {firstName} {emoji}</div>
          <div className="md-greet-sub">{motiv}</div>
        </div>
        <div className="md-prog">
          <div className="md-prog-top">
            <span className="md-prog-label">Progreso del día</span>
            <span className="md-prog-pct">{pct}%</span>
          </div>
          <div className="md-prog-bar"><div className="md-prog-fill" style={{ width: `${pct}%` }} /></div>
          <div className="md-prog-meta">{done} de {totalAppts} citas realizadas</div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-qa-label">Acciones rápidas</div>
          <div className="md-qa">
            {QUICK.map((q) => (
              <button
                key={q.label}
                className="md-qa-btn"
                onClick={() =>
                  q.label === "Documento" ? navigate("/ecosistema/documentos")
                  : q.label === "Visita" ? navigate("/ecosistema/agenda")
                  : q.label === "Cobro" ? navigate("/pagos")
                  : undefined
                }
              >
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
            <div className="md-kpi-label">Citas hoy</div>
            <div className="md-kpi-val">{totalAppts}</div>
            <div className="md-kpi-sub">Agendadas en todas las apps</div>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">📊</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Tareas pendientes</div>
            <div className="md-kpi-val">{midia?.tasks?.length ?? "—"}</div>
            <div className="md-kpi-sub">Acciones prioritarias</div>
          </div>
        </div>
        <div className="md-kpi danger">
          {overdueItems.length > 0 && <span className="md-kpi-badge">Urgente</span>}
          <span className="md-kpi-ico">⚠️</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Pagos vencidos</div>
            <div className="md-kpi-val">{overdueItems.length}</div>
            <div className="md-kpi-sub">${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 0 })} por cobrar</div>
            <button className="md-kpi-cta" onClick={() => navigate("/pagos")}>Revisar ahora</button>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">🔔</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">Notificaciones</div>
            <div className="md-kpi-val">{unreadCount}</div>
            <div className="md-kpi-sub">Sin leer</div>
          </div>
        </div>
      </div>

      <div className="md-grid">
        {/* AGENDA DEL DÍA */}
        <div className="md-card">
          <div className="md-card-head">
            <div>
              <div className="md-card-title">Agenda del día</div>
              <div className="md-card-sub">visitas, llamadas y firmas</div>
            </div>
            <button className="sh-link" onClick={() => navigate("/ecosistema/agenda")}>Ver agenda completa →</button>
          </div>
          {todayAppts.length ? todayAppts.map((a) => {
            const appKey = a.app_key || "lands";
            const appOk = !!APP_META[appKey];
            return (
              <div key={a.id} className={`md-visit ${a.status === "confirmed" ? "is-active" : ""}`}>
                <div className="md-time"><b>{toTime(a.scheduled_at)}</b><span>HRS</span></div>
                <div className="md-st">
                  <span className={`md-sdot ${a.status}`}>{a.status === "confirmed" ? "✓" : ""}</span>
                </div>
                <div className="md-info">
                  <div className="md-name">{a.title || a.contact_name || "—"}</div>
                  <div className="md-meta">{a.client_name || ""}{a.notes ? ` · ${a.notes}` : ""}</div>
                </div>
                {appOk && <AppTag app={appKey} />}
                {APP_META[appKey]?.live
                  ? <span className="md-open" onClick={() => open(appKey)}>Ver expediente →</span>
                  : <span className="md-open" style={{ opacity: .5, cursor: "default" }}>Ver detalle →</span>}
              </div>
            );
          }) : (
            <div className="md-empty-state" style={{ padding: "24px 0", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              Sin citas para hoy.{" "}
              <button className="sh-link" style={{ fontSize: 13 }} onClick={() => navigate("/ecosistema/agenda")}>
                Agendar →
              </button>
            </div>
          )}
          <div className="md-legend">
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#6FAF6B" }}>✓</span>Confirmada</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#1E3D2B" }} />En curso</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "transparent", border: "2px solid var(--border2)" }} />Pendiente</span>
          </div>
        </div>

        {/* TAREAS + PAGOS */}
        <div className="md-side">
          {/* Tareas prioritarias de Mi Día */}
          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">Tareas prioritarias</div>
              <button className="sh-link" onClick={() => navigate("/dashboard")}>Ver dashboard →</button>
            </div>
            {midia?.tasks?.slice(0, 4).map((t) => (
              <div key={t.id || t.title} className="md-row">
                <span className="md-row-ico" style={{ background: "var(--bg2)" }}>{t.icon}</span>
                <div className="md-row-info">
                  <div className="md-row-name">{t.title}</div>
                  {t.subtitle && <div className="md-row-meta">{t.subtitle}</div>}
                </div>
                <span className={`md-prio ${t.priority === "urgent" ? "alta" : t.priority === "warn" ? "media" : "baja"}`}>
                  {t.priority === "urgent" ? "Urgente" : t.priority === "warn" ? "Media" : "Baja"}
                </span>
              </div>
            )) || (
              <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>Sin tareas pendientes.</div>
            )}
          </div>

          {/* Pagos vencidos */}
          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">Pagos vencidos</div>
              <button className="sh-link" onClick={() => navigate("/pagos")}>Ver cobranza →</button>
            </div>
            {overdueItems.slice(0, 4).map((o) => (
              <div key={o.id} className="md-row">
                <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
                <div className="md-row-info">
                  <div className="md-row-name">{o.client?.name || "—"}</div>
                  <div className="md-row-meta">
                    {o.lot?.code ? `${o.lot.code} · ` : ""}Pago {o.installment_n}
                  </div>
                </div>
                <span className="md-late">{o.days_late} días</span>
                <span className="md-amount">${Number(o.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
              </div>
            ))}
            {overdueItems.length === 0 && (
              <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>Sin pagos vencidos. 🎉</div>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICACIONES */}
      <div className="md-card" style={{ marginBottom: 30 }}>
        <div className="md-card-head" style={{ marginBottom: 16 }}>
          <div className="md-card-title">Notificaciones {unreadCount > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: "var(--danger)", color: "#fff", borderRadius: 10, padding: "1px 6px", marginLeft: 6 }}>{unreadCount}</span>}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="seg">
              {tabs.map((t) => <span key={t} className={ntab === t ? "on" : ""} onClick={() => setNtab(t)}>{t}</span>)}
            </div>
            <button className="sh-link" onClick={() => markReadMutation.mutate()}>Marcar todas como leídas</button>
          </div>
        </div>
        <div className="md-ngrid">
          {shownGroups.length ? shownGroups.map((g) => (
            <div key={g.key}>
              <div className="md-ngroup-label">{g.label}</div>
              {g.items.map((n) => (
                <div key={n.id} className="md-row" style={{ opacity: n.read_at ? 0.6 : 1 }}>
                  <span className="md-row-ico" style={{ background: "var(--bg2)" }}>🔔</span>
                  <div className="md-row-info">
                    <div className="md-row-name" style={{ whiteSpace: "normal" }}>{n.message || n.title || "Notificación"}</div>
                    <div className="md-row-meta">{fmtRelative(n.created_at)}</div>
                  </div>
                  {!n.read_at && (
                    <button className="sh-link" style={{ fontSize: 11 }} onClick={() => notificationService.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))}>
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          )) : (
            <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" }}>
              {ntab === "Todas" ? "Sin notificaciones recientes." : `Sin notificaciones de "${ntab}".`}
            </div>
          )}
        </div>
      </div>
    </EcoLayout>
  );
}

export default EcosystemDia;
