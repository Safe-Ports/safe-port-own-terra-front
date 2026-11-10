import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { billingService } from "@/services/billingService";
import PricingPlans from "@/components/shared/PricingPlans";
import LotsCalculator from "@/components/shared/LotsCalculator";

/**
 * Página dedicada de planes, a pantalla completa (estilo upsell de Google One /
 * Claude) con la paleta de OwnTerra. Se abre desde Configuración o el banner.
 *
 * Galería principal (prueba, Estándar, Empresarial) con checkout de Stripe; la
 * calculadora (operaciones de más de 600 lotes) queda a la vista debajo.
 */
function PricingPage() {
  const navigate = useNavigate();
  const { showError } = useAppContext();
  const [busy, setBusy] = useState(null);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: billingService.getPlans,
  });

  // Abre Stripe en pestaña nueva (patrón seguro anti pop-up: se abre en el clic).
  const startCheckout = async (priceId) => {
    const win = window.open("", "_blank");
    if (win) {
      win.opener = null;
      win.document.write(
        "<title>Redirigiendo…</title><body style='font-family:system-ui;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;color:#555'>Redirigiendo a Stripe…</body>"
      );
    }
    setBusy(priceId);
    try {
      const url = await billingService.startCheckout(priceId);
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
      showError(err, "No se pudo iniciar el pago");
    } finally {
      setBusy(null);
    }
  };

  // Cotizaciones: van a ventas por correo con los lotes (y el estimado, si viene
  // de la calculadora de operación grande).
  const sendQuoteRequest = (lots, estimate = null) => {
    const subject = `Cotización OwnTerra Lands · ${lots} lotes`;
    const body = [
      `Hola, quiero una cotización personalizada para una operación de ${lots} lotes.`,
      estimate &&
        `Estimado de la calculadora: $${estimate.total.toLocaleString("es-MX")} MXN/mes + IVA (cubre ${estimate.coveredLots} lotes).`,
    ].filter(Boolean).join("\n");
    window.location.href = `mailto:ventas@own-terra.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const requestQuote = (estimate) => sendQuoteRequest(estimate.requestedLots, estimate);

  const [customLots, setCustomLots] = useState("");
  const customLotsValue = Math.floor(Number(customLots));
  const canSendCustom = customLotsValue > 0;

  const close = () => navigate("/configuracion");
  const isSubscribed = subscription && ["active", "past_due"].includes(subscription.status);

  return (
    <div className="pricing-page">
      <div className="pricing-topbar">
        <div className="pricing-brand">
          <img src="/brand/ownterra-mark-color.svg" alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
          <span>OwnTerra</span>
        </div>
        <button type="button" className="pricing-close" onClick={close} aria-label="Cerrar">✕</button>
      </div>

      <div className="pricing-body">
        <PricingPlans
          plans={plans}
          busyKey={busy}
          currentPlan={isSubscribed ? subscription.plan : null}
          currentPlanCancelling={isSubscribed && subscription.cancel_at_period_end}
          ctaLabel={subscription?.status === "trialing" ? "Suscribirme" : isSubscribed ? "Cambiar a este plan" : "Renovar"}
          onSelect={startCheckout}
        />
        {plans.length === 0 && (
          <p className="pricing-empty">Aún no hay planes de pago configurados.</p>
        )}

        <div className="pricing-large">
          <LotsCalculator onQuote={requestQuote} />
        </div>

        <form
          className="pricing-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSendCustom) sendQuoteRequest(customLotsValue);
          }}
        >
          <p>
            Si este presupuesto no satisface tus necesidades, envíanos la cantidad de lotes de tu operación y con
            gusto te generamos una cotización personalizada.
          </p>
          <div className="pricing-custom-row">
            <label className="sr-only" htmlFor="pricing-custom-lots">Lotes de tu operación</label>
            <input
              id="pricing-custom-lots"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Lotes de tu operación"
              value={customLots}
              onChange={(e) => setCustomLots(e.target.value)}
            />
            <button type="submit" className="pp-cta" disabled={!canSendCustom}>
              Solicitar cotización personalizada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PricingPage;
