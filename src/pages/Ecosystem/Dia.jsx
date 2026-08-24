import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { dashboardService } from "@/services/dashboardService";
import { appointmentService } from "@/services/appointmentService";
import { taskService } from "@/services/taskService";
import EcoLayout from "./EcoLayout";
import TasksBoard from "./TasksBoard";
import OnboardingChecklist from "@/components/shared/OnboardingChecklist";
import GuideModal from "@/components/shared/GuideModal";
import { useLandsOverdue, LandsOverdueKpi, LandsOverdueCard } from "./verticals/LandsMiDia";

const TOUR_STEPS = [
  {
    title: "Bienvenido al Ecosistema OwnTerra",
    text: "Este es tu hub central. Desde aquí controlas todas las aplicaciones, tu agenda, documentos y finanzas en un solo lugar. El menú lateral izquierdo es tu punto de partida para navegar.",
  },
  {
    title: "☀️ Mi Día",
    text: "La vista que ves ahora. Muestra tu progreso diario: citas agendadas, tareas prioritarias y pagos vencidos. Es tu resumen ejecutivo cada mañana.",
  },
  {
    title: "📅 Agenda",
    text: "Administra visitas, llamadas y firmas de contratos. Puedes crear citas, asignarles clientes y verlas en vista de semana o lista. Está sincronizada con todas las apps del ecosistema.",
  },
  {
    title: "⚡ Acciones rápidas",
    text: "Los botones 'Visita' y 'Documento' en la barra de bienvenida te llevan directamente al módulo correspondiente sin buscar en el menú.",
  },
  {
    title: "📊 Apps",
    text: "El lanzador de aplicaciones del ecosistema — OwnTerra Lands, Finanzas y las que se vayan sumando.",
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


const APP_META = {
  lands: { name: "Lands", color: "#6FAF6B", live: true },
  neighb: { name: "Properties", color: "#355E3B", live: false },
  homes: { name: "Homes", color: "#A7CBA1", live: false },
};

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

function toDateLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function EcosystemDia() {
  const navigate = useNavigate();
  const { currentUser, canAccessApp } = useAppContext();
  const [showTour, setShowTour] = useState(false);

  // Mi Día es transversal: solo conoce agenda, tareas y notificaciones. Lo que
  // es de Lands (cobranza) vive en ./verticals/LandsMiDia y se monta nada más
  // si el usuario tiene esa app — así no se vuelve a mezclar negocio de una
  // vertical dentro de este componente compartido.
  const hasLands = canAccessApp("lands");

  const { data: midia } = useQuery({
    queryKey: ["dashboard-midia"],
    queryFn: () => dashboardService.midia(),
  });

  const { data: rawAppts = [] } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () => appointmentService.list({ upcoming_only: true }),
  });

  const { overdueItems, totalOverdue } = useLandsOverdue(hasLands);

  // Tareas reales del tablero (no las derivadas de midia) para el KPI.
  const { data: tasksData = [] } = useQuery({ queryKey: ["tasks"], queryFn: taskService.list });
  const openTasks = tasksData.filter((t) => t.status !== "done").length;

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
  const done = todayAppts.filter((a) => a.status === "completed").length;
  const pct = totalAppts > 0 ? Math.round((done / totalAppts) * 100) : 0;
  const agendaAppts = todayAppts.length ? todayAppts : rawAppts.slice(0, 4);
  const showingUpcoming = todayAppts.length === 0 && agendaAppts.length > 0;

  const motiv = done === totalAppts && totalAppts > 0
    ? "¡Completaste todas tus citas del día! 🎉 Excelente trabajo."
    : hasLands && overdueItems.length > 0
      ? `Vas muy bien — cierra el día recuperando ${overdueItems.length} pago${overdueItems.length > 1 ? "s" : ""} pendiente${overdueItems.length > 1 ? "s" : ""}. 💪`
      : totalAppts > 0
        ? `Llevas ${done} de ${totalAppts} citas. ¡Tú puedes con el resto! 🚀`
        : "Sin citas para hoy. Buen momento para planificar. 📋";

  // Acciones rápidas: solo lo genuinamente cotidiano para cualquier rol. Nada
  // específico de una vertical (ni siquiera condicionado) — eso vive en las
  // tarjetas de abajo, no aquí.
  const quickActions = [
    { ico: "📅", label: "Visita", to: "/ecosistema/agenda" },
    { ico: "📄", label: "Documento", to: "/ecosistema/documentos" },
  ];

  return (
    <EcoLayout active="miday" title="Mi Día" subtitle="Tu jornada consolidada en el ecosistema" onGuide={() => setShowTour(true)}>

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
            {quickActions.map((q) => (
              <button key={q.label} className="md-qa-btn" onClick={() => navigate(q.to)}>
                <span>{q.ico}</span>{q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Onboarding: se muestra solo si faltan pasos y no se cerró */}
      <OnboardingChecklist />

      {/* KPIs — genéricos siempre; cada vertical suma las suyas si aplica */}
      <div className="md-kpis" style={!hasLands ? { gridTemplateColumns: "repeat(2, 1fr)" } : undefined}>
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
            <div className="md-kpi-val">{openTasks}</div>
            <div className="md-kpi-sub">Sin terminar en tu tablero</div>
          </div>
        </div>
        {hasLands && (
          <LandsOverdueKpi overdueItems={overdueItems} totalOverdue={totalOverdue} onReview={() => navigate("/pagos")} />
        )}
      </div>

      <div className="md-grid" style={!hasLands ? { gridTemplateColumns: "1fr" } : undefined}>
        {/* AGENDA DEL DÍA */}
        <div className="md-card">
          <div className="md-card-head">
            <div>
              <div className="md-card-title">{showingUpcoming ? "Próximas citas" : "Agenda del día"}</div>
              <div className="md-card-sub">
                {showingUpcoming ? "sin citas hoy · mostrando las siguientes" : "visitas, llamadas y firmas"}
              </div>
            </div>
            <button className="sh-link" onClick={() => navigate("/ecosistema/agenda")}>Ver agenda completa →</button>
          </div>
          {agendaAppts.length ? agendaAppts.map((a) => {
            const appKey = a.app_key || "lands";
            const appOk = !!APP_META[appKey];
            return (
              <div key={a.id} className={`md-visit ${a.status === "confirmed" ? "is-active" : ""}`}>
                <div className="md-time">
                  <b>{toTime(a.scheduled_at)}</b>
                  <span>{showingUpcoming ? toDateLabel(a.scheduled_at) : "HRS"}</span>
                </div>
                <div className="md-st">
                  <span className={`md-sdot ${a.status}`}>{a.status === "confirmed" ? "✓" : ""}</span>
                </div>
                <div className="md-info">
                  <div className="md-name">{a.title || a.contact_name || "—"}</div>
                  <div className="md-meta">{a.client_name || ""}{a.notes ? ` · ${a.notes}` : ""}</div>
                </div>
                {appOk && <AppTag app={appKey} />}
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

        {/* Widgets por vertical (las tareas ahora viven en el tablero full-width de abajo) */}
        {hasLands && (
          <div className="md-side">
            <LandsOverdueCard overdueItems={overdueItems} onSeeAll={() => navigate("/pagos")} />
          </div>
        )}
      </div>

      <GuideModal
        open={showTour}
        onClose={() => setShowTour(false)}
        title="Recorrido del Ecosistema"
        subtitle="Un vistazo a todo lo que puedes hacer desde aquí."
        steps={TOUR_STEPS}
      />

      {/* TABLERO DE TAREAS (personal) */}
      <TasksBoard />
    </EcoLayout>
  );
}

export default EcosystemDia;
