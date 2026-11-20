import { useState } from "react";
import { STANDARD_PLAN, ENTERPRISE_PLAN } from "@/services/landsPricing";

/**
 * Planes de OwnTerra Lands: prueba + Estándar + Empresarial (montos en
 * services/landsPricing.js). Las operaciones de más de 600 lotes se cotizan.
 *
 * Los copys/límites viven aquí; el PRECIO y el COBRO los define Stripe. Cada tier
 * se enlaza a su propio Price ID vía el backend (`GET /billing/plans`, que devuelve
 * `plan` = slug del tier + `amount`/`currency` reales). El precio mostrado usa el de
 * Stripe cuando está disponible y cae al de marketing (`price`) solo como respaldo,
 * así panel y cobro nunca se desincronizan.
 *
 * Para conectar cada tier: crea los precios en Stripe (MXN) y pon sus IDs en las
 * env vars del backend (slugs `estandar` y `empresarial`).
 */
const CURRENCY = "MXN"; // respaldo de moneda si Stripe aún no reporta la real

const DASH = "—";

// Filas de la matriz comparativa (orden = la tabla de la propuesta).
const MATRIX_ROWS = [
  { key: "usuarios", label: "Usuarios incluidos", hint: "Admins o vendedores" },
  { key: "inmuebles", label: "Inmuebles", hint: "Fraccionamientos" },
  { key: "lotes", label: "Lotes (total de la cuenta)" },
  { key: "formularios", label: "Formularios de llenado" },
  { key: "calculadoras", label: "Calculadoras" },
  { key: "reportes", label: "Reportes" },
  { key: "dashboard", label: "Dashboard de desempeño" },
  { key: "almacenamiento", label: "Almacenamiento de documentos" },
  { key: "bot", label: "Bot de soporte" },
  { key: "movil", label: "App móvil para vendedores" },
];

// `key` = slug del tier (debe coincidir con el `plan` del backend). `price` es solo
// respaldo de marketing; el monto real llega de Stripe.
const PLANS = [
  {
    key: "trial",
    name: "Prueba",
    badge: "14 días",
    tagline: "Explora OwnTerra sin límites ni tarjeta.",
    price: 0,
    highlights: [
      "Todo ilimitado durante la prueba",
      "Usuarios, inmuebles y lotes sin tope",
      "Formularios y calculadoras sin tope",
      "Sin tarjeta · solo dura hasta la fecha",
    ],
    limits: {
      usuarios: "Ilimitado", inmuebles: "Ilimitado", lotes: "Ilimitado", formularios: "Ilimitado",
      calculadoras: "Ilimitado", reportes: "Ilimitado", dashboard: true,
      almacenamiento: "Ilimitado", bot: false, movil: false,
    },
  },
  {
    key: STANDARD_PLAN.key,
    name: STANDARD_PLAN.name,
    recommended: true,
    tagline: "Para inmobiliarias y desarrolladoras en operación.",
    price: STANDARD_PLAN.price,
    highlights: [
      "10 usuarios del equipo",
      `${STANDARD_PLAN.lots} lotes en total`,
      "Formularios y calculadoras ilimitados",
      "15 GB · Bot prioritario · App móvil",
    ],
    limits: {
      usuarios: "10", inmuebles: "Ilimitados", lotes: String(STANDARD_PLAN.lots), formularios: "Ilimitados",
      calculadoras: "Ilimitadas", reportes: "Ilimitados", dashboard: true,
      almacenamiento: "15 GB", bot: "Bot prioritario", movil: true,
    },
  },
  {
    key: ENTERPRISE_PLAN.key,
    name: ENTERPRISE_PLAN.name,
    tagline: "Para grupos y constructoras.",
    price: ENTERPRISE_PLAN.price,
    highlights: [
      "Usuarios e inmuebles ilimitados",
      `${ENTERPRISE_PLAN.lots} lotes en total`,
      "Formularios y calculadoras ilimitados",
      "25 GB · Bot dedicado · App móvil",
    ],
    limits: {
      usuarios: "Ilimitados", inmuebles: "Ilimitados", lotes: String(ENTERPRISE_PLAN.lots),
      formularios: "Ilimitados", calculadoras: "Ilimitadas", reportes: "Ilimitados",
      dashboard: true, almacenamiento: "25 GB", bot: "Bot dedicado", movil: true,
    },
  },
];

function fmtMoney(amount, currency) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: (currency || CURRENCY).toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

const Check = () => (
  <svg className="pp-check" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Celda de la matriz: bool → check/—, string → texto.
function MatrixCell({ value }) {
  if (value === true) return <span className="pp-mx-yes"><Check /></span>;
  if (value === false || value == null) return <span className="pp-mx-no">{DASH}</span>;
  const ilim = /ilimitad/i.test(value);
  return <span className={ilim ? "pp-mx-ilim" : "pp-mx-val"}>{value}</span>;
}

/**
 * Panel de planes de OwnTerra: 2 tiers de pago + prueba + tabla comparativa.
 * `plans` (de `GET /billing/plans`) aporta el price_id, monto y moneda reales por
 * tier, emparejados por `plan` (slug). Compatible con Pricing/index.jsx.
 */
function PricingPlans({
  plans = [],
  busyKey,
  ctaLabel = "Suscribirme",
  currentPlan = null,
  currentPlanCancelling = false,
  onSelect,
}) {
  const [showMatrix, setShowMatrix] = useState(false);
  // Plan seleccionado (resaltado) y si su información está desplegada. Arranca
  // en el recomendado, cerrado: lo que incluye cada plan solo se ve al darle clic.
  const [selectedKey, setSelectedKey] = useState(
    () => (PLANS.find((p) => p.recommended) || PLANS[0]).key
  );
  const [infoOpen, setInfoOpen] = useState(false);
  const selectPlan = (key) => {
    if (key === selectedKey) {
      setInfoOpen((v) => !v);
    } else {
      setSelectedKey(key);
      setInfoOpen(true);
    }
  };

  // Índice de precios de Stripe por slug de tier.
  const priceByKey = Object.fromEntries((plans || []).map((p) => [p.plan, p]));
  // Respaldo legacy: si el backend aún devuelve un único plan "pro", úsalo para todos
  // los tiers de pago (todas las tarjetas cobrarían ese precio hasta configurar tiers).
  const legacyPaid = priceByKey.pro || null;

  // Vista precalculada por plan. Se muestra siempre el precio oficial; si el de
  // Stripe no coincide (precio viejo en el backend), no se vende hasta corregirlo
  // para que nadie pague un monto distinto al anunciado.
  const view = PLANS.map((plan) => {
    const backend = priceByKey[plan.key] || (plan.price > 0 ? legacyPaid : null);
    const priceMismatch = backend?.amount != null && backend.amount !== plan.price * 100;
    const currency = backend?.currency || CURRENCY;
    return {
      ...plan,
      priceId: priceMismatch ? null : backend?.price_id || null,
      priceMismatch,
      amount: plan.price,
      currency,
    };
  });

  const isCurrent = (plan) =>
    !!currentPlan &&
    (currentPlan === plan.key || (plan.recommended && currentPlan === "pro"));

  return (
    <div className="pp">
      <div className="pp-head">
        <h3 className="pp-title">Elige el plan de tu inmobiliaria</h3>
        <p className="pp-sub">Crece a tu ritmo. Cambia o cancela cuando quieras.</p>
      </div>

      <div className="pp-grid pp-grid--3">
        {view.map((plan) => {
          const paid = plan.price > 0;
          const current = isCurrent(plan);
          const canBuy = !!plan.priceId;
          const selected = selectedKey === plan.key;
          const open = selected && infoOpen;

          return (
            <div
              key={plan.key}
              className={`pp-card${selected ? " pp-card--selected" : ""}${current ? " pp-card--current" : ""}`}
              onClick={(e) => {
                // El botón de compra no cambia la selección.
                if (!e.target.closest(".pp-cta")) selectPlan(plan.key);
              }}
            >
              {plan.recommended && <div className="pp-ribbon">Recomendado</div>}

              <button
                type="button"
                className="pp-toggle"
                aria-expanded={open}
                aria-controls={`pp-feats-${plan.key}`}
              >
                <span className="pp-name">
                  OwnTerra <b>{plan.name}</b>
                  {plan.badge && <span className="pp-badge">{plan.badge}</span>}
                </span>
                <span className="pp-tagline">{plan.tagline}</span>
              </button>

              <div className="pp-price">
                {paid ? (
                  <>
                    <span className="pp-cur">$</span>
                    <span className="pp-amount">
                      {new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(plan.amount)}
                    </span>
                    <span className="pp-per">{(plan.currency || CURRENCY).toUpperCase()}/mes + IVA</span>
                  </>
                ) : (
                  <span className="pp-amount pp-amount--sm">Gratis</span>
                )}
              </div>

              {!paid ? (
                <button className="pp-cta pp-cta--ghost" disabled aria-disabled="true">
                  {current ? "Tu prueba activa" : "Incluido al registrarte"}
                </button>
              ) : current && !currentPlanCancelling ? (
                <button className="pp-cta" disabled aria-disabled="true">
                  Plan actual
                </button>
              ) : (
                <button
                  className="pp-cta"
                  disabled={!canBuy || busyKey !== null}
                  onClick={() => canBuy && onSelect?.(plan.priceId)}
                  title={!canBuy ? "Este plan aún no tiene precio configurado en Stripe" : undefined}
                >
                  {canBuy && busyKey === plan.priceId ? "Redirigiendo…" : ctaLabel}
                </button>
              )}
              {paid && !current && plan.priceMismatch && (
                <p className="pp-note">Precio en actualización. Muy pronto podrás contratarlo.</p>
              )}

              <button
                type="button"
                className="pp-more"
                aria-expanded={open}
                aria-controls={`pp-feats-${plan.key}`}
              >
                {open ? "Ocultar" : "Ver qué incluye"}
                <span className={`pp-chev${open ? " up" : ""}`} aria-hidden="true">▾</span>
              </button>

              {open && (
                <ul className="pp-feats" id={`pp-feats-${plan.key}`}>
                  {plan.highlights.map((f) => (
                    <li key={f}><Check /> {f}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabla comparativa (la propuesta, celda por celda) */}
      <div className="pp-compare">
        <button
          type="button"
          className="pp-compare-toggle"
          onClick={() => setShowMatrix((v) => !v)}
          aria-expanded={showMatrix}
        >
          {showMatrix ? "Ocultar" : "Ver"} comparativa detallada
          <span className={`pp-chev${showMatrix ? " up" : ""}`} aria-hidden="true">▾</span>
        </button>

        {showMatrix && (
          <div className="pp-matrix-wrap">
            <table className="pp-matrix">
              <thead>
                <tr>
                  <th className="pp-mx-feature">Incluye</th>
                  {view.map((p) => (
                    <th key={p.key} className={p.key === selectedKey ? "is-rec" : ""}>
                      {p.name}
                      {p.price > 0 && (
                        <span className="pp-mx-price">
                          {fmtMoney(p.amount, p.currency)}/mes
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="pp-mx-feature">
                      {row.label}
                      {row.hint && <span className="pp-mx-hint">{row.hint}</span>}
                    </th>
                    {view.map((p) => (
                      <td key={p.key} className={p.key === selectedKey ? "is-rec" : ""}>
                        <MatrixCell value={p.limits[row.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default PricingPlans;
