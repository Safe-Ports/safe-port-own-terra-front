import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { billingService } from "@/services/billingService";
import PricingPlans from "@/components/shared/PricingPlans";

/**
 * Página dedicada de planes, a pantalla completa (estilo upsell de Google One /
 * Claude) con la paleta de OwnTerra. Se abre desde Configuración o el banner.
 */
function PricingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError, showToast } = useAppContext();
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

  const reactivate = async () => {
    if (!window.confirm("¿Reactivar la suscripción? Se seguirá renovando y no se cancelará.")) return;
    setBusy("reactivate");
    try {
      await billingService.reactivate();
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      showToast("Suscripción reactivada. Se seguirá renovando.");
    } catch (err) {
      showError(err, "No se pudo reactivar la suscripción");
    } finally {
      setBusy(null);
    }
  };

  const contactSales = () => {
    window.location.href = "mailto:ventas@own-terra.com?subject=Interesado en OwnTerra Enterprise";
  };

  const close = () => navigate("/configuracion");
  const isSubscribed = subscription && ["active", "past_due"].includes(subscription.status);

  return (
    <div className="pricing-page">
      <div className="pricing-topbar">
        <div className="pricing-brand">
          <img src="/ownterra ecosistem.png" alt="OwnTerra" onError={(e) => (e.currentTarget.style.display = "none")} />
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
          onReactivate={reactivate}
          onContact={contactSales}
        />
        {plans.length === 0 && (
          <p className="pricing-empty">Aún no hay planes de pago configurados.</p>
        )}
      </div>
    </div>
  );
}

export default PricingPage;
