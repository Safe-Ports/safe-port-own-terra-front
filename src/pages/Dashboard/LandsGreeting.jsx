import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { dashboardService } from "@/services/dashboardService";
import SkyScene, { greeting, skyPeriod } from "@/components/shared/SkyScene";
import "./lands-greeting.css";

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const today = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

/* Saludo de la Actividad de Lands, el mismo cielo que el inicio de Properties.
   Cuenta lo que espera una decisión este mes (la misma bandeja del Resumen
   rápido) y lleva a la pantalla donde se resuelve lo más urgente. */
export default function LandsGreeting() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { data } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => dashboardService.kpis(6),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  const now = new Date();
  const period = skyPeriod(now.getHours());
  const firstName = currentUser?.name?.split(" ")[0] || "equipo";
  const q = data?.quick;

  // Ordenado por urgencia: la mora primero, luego apartados que vencen y al final lo que toca cobrar.
  const decisions = q ? [
    q.overdue_clients?.value && { title: `${q.overdue_clients.value} ${q.overdue_clients.value === 1 ? "cliente en mora" : "clientes en mora"}`, cta: "Revisar pagos", to: "/pagos" },
    q.reservations_expiring?.value && { title: `${q.reservations_expiring.value} ${q.reservations_expiring.value === 1 ? "apartado por vencer" : "apartados por vencer"}`, cta: "Ver apartados", to: "/fraccionamientos" },
    q.due_this_month?.value && { title: `${money(q.due_this_month.amount)} por cobrar este mes`, cta: "Ver cobranza", to: "/pagos" },
  ].filter(Boolean) : [];

  return (
    <section className={`lg-hero sky-host is-${period}`}>
      <SkyScene period={period} kind="land" />
      <p className="lg-date">{today.format(now).toUpperCase()}</p>
      <h1>{greeting(now.getHours())}, {firstName}.</h1>
      <p className="lg-lede">
        {!q ? "Revisando lo que tienes pendiente este mes…"
          : decisions.length
            ? <>Hay <strong>{decisions.length} {decisions.length === 1 ? "cosa" : "cosas"}</strong> que requieren tu atención: {decisions.map((d) => d.title).join(", ")}.</>
            : "No hay pendientes que requieran tu decisión. Todo está al corriente."}
      </p>
      <div className="lg-actions">
        <button type="button" className="lg-primary" onClick={() => navigate(decisions[0]?.to || "/fraccionamientos")}>
          {decisions[0]?.cta || "Abrir fraccionamientos"}
        </button>
        <button type="button" className="lg-ghost" onClick={() => navigate(decisions.length ? "/fraccionamientos" : "/clientes")}>
          {decisions.length ? "Ir a fraccionamientos" : "Ver clientes"}
        </button>
      </div>
    </section>
  );
}
