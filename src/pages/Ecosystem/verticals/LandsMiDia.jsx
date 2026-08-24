import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";

/* Lo que "Mi Día" le debe a OwnTerra Lands (cobranza de lotes) vive aquí, no
   en Dia.jsx: Mi Día es transversal — la usa cualquier rol de cualquier app —
   así que solo debe conocer generalidades (agenda, tareas, notificaciones).
   Cada vertical aporta sus propias tarjetas, y Dia.jsx las monta solo si el
   usuario tiene acceso a esa app (canAccessApp). Cuando Construction/Properties
   tengan su propio "Mi Día", siguen este mismo patrón: un archivo aparte bajo
   verticals/, nunca mezclado en el componente compartido. */

export function useLandsOverdue(enabled) {
  const { data } = useQuery({
    queryKey: ["payments-overdue"],
    queryFn: () => paymentService.overdue(),
    enabled,
  });
  const overdueItems = enabled ? data?.items ?? [] : [];
  const totalOverdue = overdueItems.reduce((s, o) => s + Number(o.amount || 0), 0);
  return { overdueItems, totalOverdue };
}

/* Franja compacta, no una tarjeta protagonista: Mi Día solo avisa que algo de
   Lands necesita atención — el detalle (cliente, lote, cuota) vive en /pagos,
   a un clic de distancia. */
export function LandsAlertStrip({ overdueItems, totalOverdue, onReview }) {
  const hasOverdue = overdueItems.length > 0;
  return (
    <div className={`md-alert ${hasOverdue ? "" : "ok"}`}>
      <span className="md-alert-ico">
        <svg><use href={hasOverdue ? "#eco-n-warning" : "#eco-n-check"} /></svg>
      </span>
      <div className="md-alert-text">
        {hasOverdue ? (
          <>
            <b>{overdueItems.length} pago{overdueItems.length > 1 ? "s" : ""} vencido{overdueItems.length > 1 ? "s" : ""}</b>
            {" "}por ${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 0 })} en OwnTerra Lands.
          </>
        ) : (
          "Sin pagos vencidos en OwnTerra Lands."
        )}
      </div>
      {hasOverdue && <button className="md-kpi-cta" onClick={onReview}>Revisar ahora</button>}
    </div>
  );
}
