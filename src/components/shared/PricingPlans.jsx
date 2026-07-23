import { useState } from "react";

// Copy de marketing de cada plan. Los features son texto; el precio real viene de
// Stripe (prop `plans`). Enterprise es "contáctanos" (sin precio en Stripe aún).
const PRO_FEATURES = [
  "Lotes y fraccionamientos ilimitados",
  "Contratos con amortización automática",
  "CRM de clientes y prospectos",
  "Pagos, cobranza y recordatorios",
  "Documentos y expedientes en la nube",
  "Reportes y exportación",
  "Usuarios del equipo ilimitados",
  "Soporte por correo",
];

const ENTERPRISE_FEATURES = [
  "Todo lo del plan Pro",
  "Onboarding y migración asistida",
  "Soporte prioritario dedicado",
  "Integraciones a la medida",
  "Capacitación para tu equipo",
];

const INTERVAL_LABEL = { month: "/mes", year: "/año" };

function fmtMoney(amount, currency) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: (currency || "mxn").toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `$${Math.round(amount / 100)}`;
  }
}

const Check = () => (
  <svg className="pp-check" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Cuadrícula de planes elegante (estilo pricing SaaS) con la paleta de OwnTerra.
 * Muestra el plan Pro (precio real desde Stripe) y una tarjeta Enterprise de contacto.
 * Si hay planes con más de un intervalo (mensual/anual), aparece el toggle.
 */
function PricingPlans({
  plans = [],
  busyKey,
  ctaLabel = "Suscribirme",
  currentPlan = null,
  currentPlanCancelling = false,
  onSelect,
  onReactivate,
  onContact,
}) {
  const intervals = [...new Set(plans.map((p) => p.interval))];
  const hasAnnual = intervals.includes("month") && intervals.includes("year");
  const [interval, setInterval] = useState(intervals.includes("month") ? "month" : intervals[0]);

  const pro = plans.find((p) => p.interval === (hasAnnual ? interval : intervals[0]));

  // Ahorro anual (si existen ambos)
  let savePct = null;
  if (hasAnnual) {
    const m = plans.find((p) => p.interval === "month");
    const y = plans.find((p) => p.interval === "year");
    if (m?.amount && y?.amount) savePct = Math.round((1 - y.amount / (m.amount * 12)) * 100);
  }

  return (
    <div className="pp">
      <div className="pp-head">
        <h3 className="pp-title">Elige tu plan</h3>
        <p className="pp-sub">Impulsa la gestión de tu inmobiliaria. Cancela cuando quieras.</p>
        {hasAnnual && (
          <>
            <div className="pp-toggle" role="tablist">
              <button className={interval === "month" ? "active" : ""} onClick={() => setInterval("month")}>Mensual</button>
              <button className={interval === "year" ? "active" : ""} onClick={() => setInterval("year")}>Anual</button>
            </div>
            {savePct > 0 && <div className="pp-save">Ahorra {savePct}% al pagar anual</div>}
          </>
        )}
      </div>

      <div className="pp-grid">
        {/* Pro — recomendado */}
        <div className="pp-card pp-card--rec">
          <div className="pp-ribbon">Recomendado</div>
          <div className="pp-name">OwnTerra <b>Pro</b></div>
          <div className="pp-tagline">Todo lo que necesitas para operar sin límites.</div>
          <div className="pp-price">
            {pro?.amount != null ? (
              <>
                <span className="pp-amount">{fmtMoney(pro.amount, pro.currency)}</span>
                <span className="pp-per">{INTERVAL_LABEL[pro.interval] || ""}</span>
              </>
            ) : (
              <span className="pp-amount pp-amount--sm">Plan de pago</span>
            )}
          </div>
          {currentPlan === "pro" && currentPlanCancelling ? (
            // Plan actual pero programado a cancelarse: ofrecer reactivar.
            <button className="pp-cta" disabled={busyKey !== null} onClick={() => onReactivate?.()}>
              {busyKey === "reactivate" ? "Reactivando…" : "Reactivar suscripción"}
            </button>
          ) : currentPlan === "pro" ? (
            <button className="pp-cta" disabled aria-disabled="true">
              Plan actual
            </button>
          ) : (
            <button
              className="pp-cta"
              disabled={!pro || busyKey !== null}
              onClick={() => pro && onSelect?.(pro.price_id)}
            >
              {busyKey === pro?.price_id ? "Redirigiendo…" : ctaLabel}
            </button>
          )}
          <ul className="pp-feats">
            {PRO_FEATURES.map((f) => (
              <li key={f}><Check /> {f}</li>
            ))}
          </ul>
        </div>

        {/* Enterprise — contacto */}
        <div className="pp-card">
          <div className="pp-name">OwnTerra <b>Enterprise</b></div>
          <div className="pp-tagline">Para operaciones grandes o multi-sucursal.</div>
          <div className="pp-price">
            <span className="pp-amount pp-amount--sm">A tu medida</span>
          </div>
          <button className="pp-cta pp-cta--ghost" onClick={() => onContact?.()}>
            Contáctanos
          </button>
          <ul className="pp-feats">
            {ENTERPRISE_FEATURES.map((f) => (
              <li key={f}><Check /> {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PricingPlans;
