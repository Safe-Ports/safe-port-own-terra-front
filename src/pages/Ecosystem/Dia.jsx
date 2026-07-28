import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { dashboardService } from "@/services/dashboardService";
import { appointmentService } from "@/services/appointmentService";
import { paymentService } from "@/services/paymentService";
import { notificationService } from "@/services/notificationService";
import { useLocale } from "@/i18n";
import EcoLayout from "./EcoLayout";
import GuideModal from "@/components/shared/GuideModal";

const TOUR_STEPS = [
  {
    title: "Bienvenido al Ecosistema OwnTerra",
    text: "Este es tu hub central. Desde aquí controlas todas las aplicaciones, tu agenda, documentos y finanzas en un solo lugar. El menú lateral izquierdo es tu punto de partida para navegar.",
  },
  {
    title: "☀️ Mi Día",
    text: "La vista que ves ahora. Muestra tu progreso diario: citas agendadas, tareas prioritarias, pagos vencidos y alertas recientes. Es tu resumen ejecutivo cada mañana.",
  },
  {
    title: "📅 Agenda",
    text: "Administra visitas, llamadas y firmas de contratos. Puedes crear citas, asignarles clientes y verlas en vista de semana o lista. Está sincronizada con todas las apps del ecosistema.",
  },
  {
    title: "⚡ Acciones rápidas",
    text: "Los botones 'Visita', 'Cobro' y 'Documento' en la barra de bienvenida te llevan directamente al módulo correspondiente sin buscar en el menú.",
  },
  {
    title: "📊 Panel General",
    text: "Vista de métricas globales: ingresos, actividad reciente y estadísticas del negocio. Ideal para revisiones semanales o presentaciones de resultados.",
  },
  {
    title: "🔒 OwnTerra Vault",
    text: "Bóveda centralizada de documentos. Organiza contratos, identificaciones, escrituras y planos en carpetas jerárquicas. Todos los documentos de tus clientes viven aquí.",
  },
  {
    title: "👥 Clientes del core",
    text: "El directorio maestro de identidades. Cada cliente tiene un perfil único que se comparte entre todas las apps. Aquí puedes vincularlos a Lands, Properties o Homes.",
  },
  {
    title: "🛡️ Equipo",
    text: "Gestiona los usuarios de tu organización: roles, permisos y acceso por aplicación. Solo los administradores pueden modificar esta sección.",
  },
  {
    title: "💹 Estados Financieros",
    text: "Resumen de ingresos, gastos y flujo de caja de tu operación. Registra egresos y consulta el estado económico en tiempo real.",
  },
  {
    title: "🏡 OwnTerra Lands",
    text: "La app principal de gestión inmobiliaria: fraccionamientos, lotes, contratos de compraventa y cobranza. Accede desde el menú lateral bajo 'Aplicaciones'.",
  },
  {
    title: "🔔 Alertas y pendientes",
    text: "Al final de Mi Día ves todas tus notificaciones agrupadas por fecha. Puedes marcarlas como leídas individualmente o todas de una vez con el enlace 'Marcar todas como leídas'.",
  },
];

const TOUR_STEPS_EN = [
  { title: "Welcome to the OwnTerra Ecosystem", text: "Your central hub for applications, schedules, documents, and finances. Use the left navigation to move through the ecosystem." },
  { title: "☀️ My Day", text: "Your daily executive summary with appointments, priority tasks, overdue payments, and recent alerts." },
  { title: "📅 Calendar", text: "Manage visits, calls, and signings, assign clients, and use day, week, or month views." },
  { title: "⚡ Quick actions", text: "Visit, Payment, and Document take you directly to the corresponding workflow." },
  { title: "📊 Overview", text: "Review global metrics, revenue, recent activity, and business statistics." },
  { title: "🔒 OwnTerra Vault", text: "Organize contracts, identification, deeds, and plans in one central vault." },
  { title: "👥 Core clients", text: "Manage unique client identities shared across all applications." },
  { title: "🛡️ Team", text: "Manage users, roles, permissions, and application access." },
  { title: "💹 Financial statements", text: "Review revenue, overdue collections, and the financial health of your operation." },
  { title: "🏡 OwnTerra Lands", text: "Open developments, lots, contracts, and collections from Applications." },
  { title: "🔔 Alerts and pending items", text: "Review notifications grouped by date and mark them as read." },
];

const APP_META = {
  lands: { name: "Lands", color: "#6FAF6B", live: true },
  neighb: { name: "Properties", color: "#355E3B", live: false },
  homes: { name: "Homes", color: "#A7CBA1", live: false },
};

function AppTag({ app }) {
  const a = APP_META[app] || APP_META.lands;
  return <span className="md-tag"><span className="dot" style={{ background: a.color }} />{a.name}</span>;
}

function fmtRelative(iso, t) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return t("dia.minsAgo").replace("{n}", m);
  const h = Math.floor(m / 60);
  if (h < 24) return t("dia.hoursAgo").replace("{n}", h);
  return t("dia.daysAgo").replace("{n}", Math.floor(h / 24));
}

function toTime(iso, dateLocale) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toDateLabel(iso, dateLocale) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

function localizeTask(task, t) {
  const count = task.title?.match(/^\d+/)?.[0] || "0";
  if (task.id === "admin_no_seller") return { ...task, title: t("dia.taskNoSeller").replace("{n}", count), subtitle: t("dia.taskDistribute") };
  if (task.id === "admin_inactive") return { ...task, title: t("dia.taskInactive").replace("{n}", count) };
  if (task.id === "admin_overdue") return { ...task, title: t("dia.taskOverdueTeam").replace("{n}", count) };
  if (task.id === "admin_expiring") return { ...task, title: t("dia.taskExpiring").replace("{n}", count) };
  return task;
}

function EcosystemDia() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser } = useAppContext();
  const { locale, localeTag, format, t } = useLocale();
  const [showTour, setShowTour] = useState(false);

  const QUICK = [
    { ico: "📅", label: t("dia.qaVisit"),    key: "visit" },
    { ico: "💰", label: t("dia.qaPayment"),  key: "payment" },
    { ico: "📄", label: t("dia.qaDocument"), key: "document" },
  ];

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
  const unreadNotifs = notifs.filter((notification) => !notification.is_read);

  const markReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: () => qc.setQueryData(["notifications"], (current) => current ? {
      ...current,
      items: (current.items ?? []).map((notification) => ({ ...notification, is_read: true })),
    } : current),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const firstName = midia?.user_first_name || (currentUser?.name || "").split(" ")[0] || "";
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? t("dia.morning") : h < 19 ? t("dia.afternoon") : t("dia.evening");
  })();
  const emoji = (() => { const h = new Date().getHours(); return h < 12 ? "👋" : h < 19 ? "🌤️" : "🌙"; })();

  const todayAppts = rawAppts.filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const totalAppts = todayAppts.length;
  const done = todayAppts.filter((a) => a.status === "completed").length;
  const pct = totalAppts > 0 ? Math.round((done / totalAppts) * 100) : 0;
  const agendaAppts = todayAppts.length ? todayAppts : rawAppts.slice(0, 4);
  const showingUpcoming = todayAppts.length === 0 && agendaAppts.length > 0;

  const totalOverdue = overdueItems.reduce((s, o) => s + Number(o.amount || 0), 0);

  const unreadCount = unreadNotifs.length;
  const tasksCount = midia?.tasks?.length ?? 0;

  const now = Date.now();
  const todayNotifs = unreadNotifs.filter((n) => now - new Date(n.created_at).getTime() < 86400000);
  const yesterdayNotifs = unreadNotifs.filter((n) => {
    const d = now - new Date(n.created_at).getTime();
    return d >= 86400000 && d < 172800000;
  });
  const weekNotifs = unreadNotifs.filter((n) => {
    const d = now - new Date(n.created_at).getTime();
    return d >= 172800000 && d < 604800000;
  });

  const NOTIF_GROUPS = [
    { key: "hoy",    label: t("dia.groupToday"),     items: todayNotifs },
    { key: "ayer",   label: t("dia.groupYesterday"),  items: yesterdayNotifs },
    { key: "semana", label: t("dia.groupWeek"),       items: weekNotifs },
  ].filter((g) => g.items.length > 0);

  const shownGroups = NOTIF_GROUPS;

  const motiv = done === totalAppts && totalAppts > 0
    ? t("dia.motivComplete")
    : overdueItems.length > 0
      ? (overdueItems.length === 1
          ? t("dia.motivOverdueSingle").replace("{n}", overdueItems.length)
          : t("dia.motivOverduePlural").replace("{n}", overdueItems.length))
      : totalAppts > 0
        ? t("dia.motivProgress").replace("{done}", done).replace("{total}", totalAppts)
        : t("dia.motivEmpty");

  const open = (app) => APP_META[app]?.live && navigate("/dashboard");

  return (
    <EcoLayout active="miday" title={t("dia.title")} subtitle={t("dia.subtitle")} onGuide={() => setShowTour(true)}>

      {/* HERO motivador */}
      <div className="md-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-greet">{greeting}{firstName ? `, ${firstName}` : ""} {emoji}</div>
          <div className="md-greet-sub">{motiv}</div>
        </div>
        <div className="md-prog">
          <div className="md-prog-top">
            <span className="md-prog-label">{t("dia.dayProgress")}</span>
            <span className="md-prog-pct">{pct}%</span>
          </div>
          <div className="md-prog-bar"><div className="md-prog-fill" style={{ width: `${pct}%` }} /></div>
          <div className="md-prog-meta">
            {t("dia.apptsDone").replace("{done}", done).replace("{total}", totalAppts)}
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="md-qa-label">{t("dia.quickActionsLabel")}</div>
          <div className="md-qa">
            {QUICK.map((q) => (
              <button
                key={q.key}
                className="md-qa-btn"
                onClick={() =>
                  q.key === "document" ? navigate("/ecosistema/documentos")
                  : q.key === "visit"  ? navigate("/ecosistema/agenda")
                  : q.key === "payment" ? navigate("/pagos")
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
            <div className="md-kpi-label">{t("dia.kpiAppts")}</div>
            <div className="md-kpi-val">{totalAppts}</div>
            <div className="md-kpi-sub">{t("dia.kpiApptsSub")}</div>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">📊</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">{t("dia.kpiTasks")}</div>
            <div className="md-kpi-val">{midia?.tasks?.length ?? "—"}</div>
            <div className="md-kpi-sub">{t("dia.kpiTasksSub")}</div>
          </div>
        </div>
        <div className="md-kpi danger">
          {overdueItems.length > 0 && <span className="md-kpi-badge">{t("dia.urgent")}</span>}
          <span className="md-kpi-ico">⚠️</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">{t("dia.kpiOverdue")}</div>
            <div className="md-kpi-val">{overdueItems.length}</div>
            <div className="md-kpi-sub">{format.currency(totalOverdue, "MXN", { maximumFractionDigits: 0 })} {t("dia.collect")}</div>
            <button className="md-kpi-cta" onClick={() => navigate("/pagos")}>{t("dia.reviewNow")}</button>
          </div>
        </div>
        <div className="md-kpi">
          <span className="md-kpi-ico">🔔</span>
          <div className="md-kpi-body">
            <div className="md-kpi-label">{t("dia.kpiAlerts")}</div>
            <div className="md-kpi-val">{unreadCount}</div>
            <div className="md-kpi-sub">{unreadCount} {t("dia.unread")} · {tasksCount} {t("dia.tasks")}</div>
          </div>
        </div>
      </div>

      <div className="md-grid">
        {/* AGENDA DEL DÍA */}
        <div className="md-card">
          <div className="md-card-head">
            <div>
              <div className="md-card-title">{showingUpcoming ? t("dia.upcomingAppts") : t("dia.todayAgenda")}</div>
              <div className="md-card-sub">
                {showingUpcoming ? t("dia.upcomingNote") : t("dia.todayNote")}
              </div>
            </div>
            <button className="sh-link" onClick={() => navigate("/ecosistema/agenda")}>{t("dia.viewFullAgenda")}</button>
          </div>
          {agendaAppts.length ? agendaAppts.map((a) => {
            const appKey = a.app_key || "lands";
            const appOk = !!APP_META[appKey];
            return (
              <div key={a.id} className={`md-visit ${a.status === "confirmed" ? "is-active" : ""}`}>
                <div className="md-time">
                  <b>{toTime(a.scheduled_at, localeTag)}</b>
                  <span>{showingUpcoming ? toDateLabel(a.scheduled_at, localeTag) : t("dia.hrs")}</span>
                </div>
                <div className="md-st">
                  <span className={`md-sdot ${a.status}`}>{a.status === "confirmed" ? "✓" : ""}</span>
                </div>
                <div className="md-info">
                  <div className="md-name">{a.title || a.contact_name || "—"}</div>
                  <div className="md-meta">{a.client_name || ""}{a.notes ? ` · ${a.notes}` : ""}</div>
                </div>
                {appOk && <AppTag app={appKey} />}
                {APP_META[appKey]?.live
                  ? <span className="md-open" onClick={() => open(appKey)}>{t("dia.viewFile")}</span>
                  : <span className="md-open" style={{ opacity: .5, cursor: "default" }}>{t("dia.viewDetail")}</span>}
              </div>
            );
          }) : (
            <div className="md-empty-state" style={{ padding: "24px 0", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              {t("dia.noAppts")}{" "}
              <button className="sh-link" style={{ fontSize: 13 }} onClick={() => navigate("/ecosistema/agenda")}>
                {t("dia.schedule")}
              </button>
            </div>
          )}
          <div className="md-legend">
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#6FAF6B" }}>✓</span>{t("dia.legendConfirmed")}</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "#1E3D2B" }} />{t("dia.legendOngoing")}</span>
            <span className="md-legend-item"><span className="md-legend-dot" style={{ background: "transparent", border: "2px solid var(--border2)" }} />{t("dia.legendPending")}</span>
          </div>
        </div>

        {/* TAREAS + PAGOS */}
        <div className="md-side">
          {/* Tareas prioritarias */}
          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">{t("dia.priorityTasks")}</div>
              <button className="sh-link" onClick={() => navigate("/dashboard")}>{t("dia.viewDashboard")}</button>
            </div>
            {midia?.tasks?.slice(0, 4).map((rawTask) => {
              const task = localizeTask(rawTask, t);
              return <div key={task.id || task.title} className="md-row">
                <span className="md-row-ico" style={{ background: "var(--bg2)" }}>{task.icon}</span>
                <div className="md-row-info">
                  <div className="md-row-name">{task.title}</div>
                  {task.subtitle && <div className="md-row-meta">{task.subtitle}</div>}
                </div>
                <span className={`md-prio ${task.priority === "urgent" ? "alta" : task.priority === "warn" ? "media" : "baja"}`}>
                  {task.priority === "urgent" ? t("dia.prioUrgent") : task.priority === "warn" ? t("dia.prioMedium") : t("dia.prioLow")}
                </span>
              </div>;
            }) || (
              <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>{t("dia.noTasks")}</div>
            )}
          </div>

          {/* Pagos vencidos */}
          <div className="md-card">
            <div className="md-card-head">
              <div className="md-card-title">{t("dia.overdueTitle")}</div>
              <button className="sh-link" onClick={() => navigate("/pagos")}>{t("dia.viewPayments")}</button>
            </div>
            {overdueItems.slice(0, 4).map((o) => (
              <div key={o.id} className="md-row">
                <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
                <div className="md-row-info">
                  <div className="md-row-name">{o.client?.name || "—"}</div>
                  <div className="md-row-meta">
                    {o.lot?.code ? `${o.lot.code} · ` : ""}{t("dia.paymentLabel")} {o.installment_n}
                  </div>
                </div>
                <span className="md-late">{o.days_late} {t("dia.daysLate")}</span>
                <span className="md-amount">{format.currency(o.amount || 0, "MXN", { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            {overdueItems.length === 0 && (
              <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>{t("dia.noOverdue")}</div>
            )}
          </div>
        </div>
      </div>

      <GuideModal
        open={showTour}
        onClose={() => setShowTour(false)}
        title={t("dia.tourTitle")}
        subtitle={t("dia.tourSubtitle")}
        steps={locale === "en" ? TOUR_STEPS_EN : TOUR_STEPS}
      />

      {/* ALERTAS Y PENDIENTES */}
      <div className="md-card" style={{ marginBottom: 30 }}>
        <div className="md-card-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="md-card-title">
              {t("dia.alertsTitle")} {unreadCount > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: "var(--danger)", color: "#fff", borderRadius: 10, padding: "1px 6px", marginLeft: 6 }}>{unreadCount}</span>}
            </div>
            <div className="md-card-sub">{t("dia.alertsSub")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {unreadCount > 0 && <button className="sh-link" onClick={() => markReadMutation.mutate()} disabled={markReadMutation.isPending}>{t("dia.markAllRead")}</button>}
          </div>
        </div>
        <div className="md-ngrid">
          {shownGroups.length ? shownGroups.map((g) => (
            <div key={g.key}>
              <div className="md-ngroup-label">{g.label}</div>
              {g.items.map((n) => (
                <div key={n.id} className="md-row" style={{ opacity: n.is_read ? 0.6 : 1 }}>
                  <span className="md-row-ico" style={{ background: "var(--bg2)" }}>🔔</span>
                  <div className="md-row-info">
                    <div className="md-row-name" style={{ whiteSpace: "normal" }}>{n.message || n.title || t("dia.notification")}</div>
                    <div className="md-row-meta">{fmtRelative(n.created_at, t)}</div>
                  </div>
                  {!n.is_read && (
                    <button className="sh-link" style={{ fontSize: 11 }} onClick={() => notificationService.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))}>
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          )) : (
            <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" }}>
              {t("dia.noNotifs")}
            </div>
          )}
        </div>
      </div>
    </EcoLayout>
  );
}

export default EcosystemDia;
