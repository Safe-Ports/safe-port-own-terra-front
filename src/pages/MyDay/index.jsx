import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { dashboardService } from "@/services/dashboardService";
import { appointmentService } from "@/services/appointmentService";
import { compactCurrency, currency } from "@/services/formatters";

const PRIORITY_STYLE = {
  urgent: { border: "border-[#F0C0BC]", bg: "bg-[#FDECEA]", dot: "bg-[#C0392B]" },
  warn:   { border: "border-[#F0DCB8]", bg: "bg-[#FEF3E2]", dot: "bg-[#E67E22]" },
  info:   { border: "border-[#C9D9E8]", bg: "bg-[#E8F1FA]", dot: "bg-[#2980B9]" },
  low:    { border: "border-line",      bg: "bg-[#fffdf8]", dot: "bg-[#8C8070]" },
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-4">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#8C8070]">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[#8C8070]">{sub}</div>}
    </div>
  );
}

function TaskCard({ task, onNavigate }) {
  const s = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low;
  const action = task.actions?.[0];
  return (
    <div className={`rounded-2xl border px-5 py-4 ${s.border} ${s.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg leading-none">{task.icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#1A1410]">{task.title}</div>
            {task.subtitle && <div className="mt-0.5 text-xs text-[#5C5040]">{task.subtitle}</div>}
          </div>
        </div>
        {action && (
          <button
            className="tb-btn tb-s shrink-0"
            onClick={() => onNavigate(action)}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

const LOCAL_TASKS_KEY = "myday_manual_tasks";

function loadLocalTasks() {
  try { return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || "[]"); }
  catch { return []; }
}

function saveLocalTasks(tasks) {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

function MisTargetasPanel({ dashboardTasks }) {
  const qc = useQueryClient();

  /* appointments */
  const { data: appts = [] } = useQuery({
    queryKey: ["appointments-upcoming"],
    queryFn: () => appointmentService.list({ upcoming_only: true }),
    staleTime: 60_000,
  });

  const cancelMut = useMutation({
    mutationFn: (id) => appointmentService.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments-upcoming"] }),
  });

  /* payment-alert tasks from dashboard */
  const paymentTasks = (dashboardTasks || []).filter(
    (t) => (t.priority === "urgent" || t.priority === "warn") &&
      (t.id?.includes("payment") || t.id?.includes("pago") || t.id?.includes("overdue") ||
       t.title?.toLowerCase().includes("pago") || t.title?.toLowerCase().includes("vencido"))
  );

  /* manual local tasks */
  const [localTasks, setLocalTasks] = useState(loadLocalTasks);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { saveLocalTasks(localTasks); }, [localTasks]);

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setLocalTasks((prev) => [{ id: Date.now(), text, done: false }, ...prev]);
    setDraft("");
    inputRef.current?.focus();
  };

  const toggleTask = (id) =>
    setLocalTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const deleteTask = (id) =>
    setLocalTasks((prev) => prev.filter((t) => t.id !== id));

  const APPT_PRIORITY = { border: "border-[#C9D9E8]", bg: "bg-[#E8F1FA]" };

  return (
    <div className="card flex flex-col gap-0 overflow-hidden">
      <div className="card-hd">
        <div className="card-title">Mis tareas del día</div>
      </div>
      <div className="card-body flex flex-col gap-4">

        {/* Quick-add */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="min-w-0 flex-1 rounded-xl border border-line bg-[#fffdf8] px-3 py-2 text-sm text-[#1A1410] placeholder:text-[#8C8070] focus:outline-none focus:ring-2 focus:ring-[#2A7A50]/40"
            placeholder="Nueva tarea…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          />
          <button
            className="tb-btn tb-s shrink-0"
            onClick={addTask}
            disabled={!draft.trim()}
          >
            + Añadir
          </button>
        </div>

        {/* Manual tasks */}
        {localTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#8C8070]">Mis tareas</div>
            {localTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-line bg-[#fffdf8] px-3 py-2">
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold transition-colors ${
                    t.done
                      ? "border-[#2A7A50] bg-[#2A7A50] text-white"
                      : "border-[#DED5C8] bg-white text-transparent"
                  }`}
                >
                  ✓
                </button>
                <span className={`min-w-0 flex-1 text-sm ${t.done ? "text-[#8C8070] line-through" : "text-[#1A1410]"}`}>
                  {t.text}
                </span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="shrink-0 text-[#8C8070] hover:text-[#C0392B] text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming appointments */}
        {appts.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#8C8070]">Citas próximas</div>
            {appts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border px-3 py-2.5 ${APPT_PRIORITY.border} ${APPT_PRIORITY.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#1A1410]">
                      📅 {a.contact_name}
                    </div>
                    <div className="mt-0.5 text-xs text-[#5C5040]">
                      {new Date(a.scheduled_at).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {a.contact_phone ? ` · ${a.contact_phone}` : ""}
                    </div>
                    {a.notes && <div className="mt-0.5 text-xs text-[#8C8070]">{a.notes}</div>}
                  </div>
                  <button
                    onClick={() => cancelMut.mutate(a.id)}
                    disabled={cancelMut.isPending}
                    className="shrink-0 text-[#8C8070] hover:text-[#C0392B] text-xs leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment alerts */}
        {paymentTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#8C8070]">Alertas de pago</div>
            {paymentTasks.map((t, i) => {
              const s = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.low;
              return (
                <div key={t.id || i} className={`rounded-xl border px-3 py-2.5 ${s.border} ${s.bg}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm leading-none">{t.icon || "💳"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A1410]">{t.title}</div>
                      {t.subtitle && <div className="mt-0.5 text-xs text-[#5C5040]">{t.subtitle}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {localTasks.length === 0 && appts.length === 0 && paymentTasks.length === 0 && (
          <div className="py-4 text-center text-sm text-[#8C8070]">
            Sin tareas pendientes
          </div>
        )}

      </div>
    </div>
  );
}

function UpcomingRow({ item }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-[#1A1410]">{item.label}</div>
        {item.subtitle && <div className="text-xs text-[#8C8070]">{item.subtitle}</div>}
      </div>
      {item.date && (
        <div className="text-right text-xs font-semibold text-[#5C5040]">
          {new Date(item.date + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
        </div>
      )}
    </div>
  );
}

function MyDayPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-midia"],
    queryFn: dashboardService.midia,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const handleAction = (action) => {
    if (action?.url) navigate(action.url);
    else if (action?.type === "payment") navigate("/pagos");
    else if (action?.type === "contract") navigate("/contratos");
    else if (action?.type === "client") navigate("/clientes");
    else if (action?.type === "document") navigate("/documentos");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#8C8070] text-sm">
        Cargando Mi Día...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-[#C0392B] text-sm">
        Error al cargar el panel. Intenta recargar la página.
      </div>
    );
  }

  const kpis = data.kpis || {};
  const tasks = data.tasks || [];
  const upcoming = data.upcoming || [];
  const pulse = data.team_pulse || [];

  const urgentCount = tasks.filter((t) => t.priority === "urgent").length;

  return (
    <div className="space-y-4">

      {/* ── HERO BANNER ── */}
      <div
        className="rounded-3xl px-7 py-7 text-white"
        style={{ background: "linear-gradient(135deg,#1A3428 0%,#2A7A50 60%,#1A3428 100%)" }}
      >
        <div className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/60">
          {data.date_long}
        </div>
        <div className="font-['Playfair_Display'] text-[2.1rem] font-normal leading-tight">
          {data.greeting}, {data.user_first_name}
        </div>
        <div className="mt-2 text-sm text-white/70">
          El equipo ha cerrado{" "}
          <span className="font-bold text-white">
            {compactCurrency(kpis.monthly_revenue ?? 0)}
          </span>{" "}
          históricamente
          {urgentCount > 0 && (
            <>
              {" "}·{" "}
              <span className="font-bold text-[#F4A460]">
                {urgentCount} {urgentCount === 1 ? "alerta urgente" : "alertas urgentes"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Tareas Críticas"
          value={tasks.filter((t) => t.priority === "urgent" || t.priority === "warn").length}
          sub="acción inmediata"
          color="text-[#C0392B]"
        />
        <KpiCard
          label="Ingresos del Mes"
          value={compactCurrency(kpis.monthly_revenue ?? 0)}
          sub={`${kpis.monthly_sales_count ?? 0} ventas`}
          color="text-[#2A7A50]"
        />
        <KpiCard
          label="Equipo Activo"
          value={kpis.team_size_active ?? 0}
          sub="vendedores"
          color="text-[#1A1410]"
        />
        <KpiCard
          label="Pagos Vencidos"
          value={kpis.overdue_count ?? 0}
          sub={kpis.overdue_total_amount ? compactCurrency(kpis.overdue_total_amount) : undefined}
          color="text-[#B8860B]"
        />
      </div>

      {/* ── TASKS + ACTIVITY ── */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">

        {/* Tasks */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C8070]">
            Tareas prioritarias
          </div>
          {tasks.length === 0 && (
            <div className="rounded-2xl border border-line bg-[#f7f3ed] px-5 py-6 text-center text-sm text-[#8C8070]">
              ✅ Sin tareas pendientes
            </div>
          )}
          {tasks.map((task, i) => (
            <TaskCard key={task.id || i} task={task} onNavigate={handleAction} />
          ))}
        </div>

        {/* Business task panel */}
        <MisTargetasPanel dashboardTasks={tasks} />
      </div>

      {/* ── UPCOMING + TEAM PULSE ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Upcoming */}
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Próximos vencimientos</div>
          </div>
          <div className="card-body space-y-2">
            {upcoming.length === 0 && (
              <div className="py-4 text-center text-sm text-[#8C8070]">Sin vencimientos próximos</div>
            )}
            {upcoming.map((item, i) => (
              <UpcomingRow key={i} item={item} />
            ))}
          </div>
        </div>

        {/* Team Pulse (admin only) */}
        {pulse.length > 0 && (
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Pulso del equipo</div>
            </div>
            <div className="card-body space-y-2">
              {pulse.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: member.color || "#2A7A50" }}
                  >
                    {member.initials || member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#1A1410]">{member.name}</div>
                    <div className="text-xs text-[#8C8070]">
                      {member.sales_count} venta{member.sales_count !== 1 ? "s" : ""} · {compactCurrency(member.revenue)}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#8C8070]">#{member.rank}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default MyDayPage;
