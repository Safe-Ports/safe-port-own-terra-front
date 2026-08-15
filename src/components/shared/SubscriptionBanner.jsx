import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { billingService } from "@/services/billingService";

const DAY = 1000 * 60 * 60 * 24;
const daysUntil = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);

/**
 * Banner fijo que avisa cuando la suscripción necesita atención (vencida, pago
 * fallido, prueba por terminar, o cancelación programada). Se muestra en todo el
 * app vía los layouts. No renderiza nada cuando todo está en orden.
 */
function SubscriptionBanner() {
  const { currentUser, canUseFeature } = useAppContext();

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  if (!sub) return null;

  let tone = null;
  let msg = null;
  let dest = "/planes"; // por defecto, la página de planes (suscribir/renovar)
  let cta = "Ver planes";

  if (["cancelled", "unpaid"].includes(sub.status)) {
    tone = "error";
    msg = "Tu suscripción expiró. Renueva para poder crear y editar.";
  } else if (sub.status === "past_due") {
    tone = "warn";
    msg = "Tu último pago falló. Actualiza tu método de pago para no perder el acceso.";
    dest = "/configuracion"; // para gestionar la tarjeta en el portal
    cta = "Actualizar pago";
  } else if (sub.status === "active" && sub.cancel_at_period_end) {
    tone = "warn";
    msg = "Tu suscripción está programada para cancelarse. Vuelve a elegir tu plan para continuar.";
    dest = "/planes";
    cta = "Ver planes y reactivar";
  } else if (sub.status === "trialing" && sub.trial_end) {
    const d = daysUntil(sub.trial_end);
    if (d <= 0) {
      tone = "error";
      msg = "Tu prueba terminó. Suscríbete para seguir editando.";
    } else if (d <= 5) {
      tone = "warn";
      msg = `Tu prueba termina en ${d} día${d === 1 ? "" : "s"}. Suscríbete para no perder el acceso.`;
    }
  }

  if (!msg) return null;

  const isAdmin = canUseFeature("core.config");

  return (
    <div className={`sub-banner sub-banner--${tone}`} role="status">
      <span className="sub-banner__msg">⚠️ {msg}</span>
      {isAdmin ? (
        <button
          type="button"
          className="sub-banner__btn"
          onClick={() => window.open(dest, "_blank", "noopener,noreferrer")}
        >
          {cta}
        </button>
      ) : (
        <span className="sub-banner__hint">Contacta a un administrador para regularizarla.</span>
      )}
    </div>
  );
}

export default SubscriptionBanner;
