import { useState } from "react";

/**
 * Planes de OwnTerra (propuesta "Own terraLand"), 3 tiers de pago + prueba.
 *
 * Los copys/límites viven aquí; el PRECIO y el COBRO los define Stripe. Cada tier
 * se enlaza a su propio Price ID vía el backend (`GET /billing/plans`, que devuelve
 * `plan` = slug del tier + `amount`/`currency` reales). El precio mostrado usa el de
 * Stripe cuando está disponible y cae al de marketing (`price`) solo como respaldo,
 * así panel y cobro nunca se desincronizan.
 *
 * Para conectar cada tier: crea 3 precios en Stripe y pon sus IDs en las env.
 * vars STRIPE_PRICE_ID_ESTANDAR / _CRECIMIENTO / _PROFESIONAL.
 */
const CURRENCY = "MXN"; // respaldo si Stripe aún no reporta la moneda real

const DASH = "—";

// Filas de la matriz comparativa (orden = la tabla de la propuesta).
const MATRIX_ROWS = [
  { key: "usuarios", label: "Usuarios incluidos", hint: "Admins o vendedores" },
  { key: "inmuebles", label: "Inmuebles", hint: "Fraccionamientos" },
  { key: "lotes", label: "Lotes por inmueble" },
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
    tagline: "Explora OwnTerra sin tarjeta.",
    price: 0,
    highlights: [
      "1 usuario",
      "1 inmueble · 10 lotes",
      "5 formularios · 1 calculadora",
      "10 reportes · 1 GB",
    ],
    limits: {
      usuarios: "1", inmuebles: "1", lotes: "10", formularios: "5",
      calculadoras: "1", reportes: "10", dashboard: false,
      almacenamiento: "1 GB", bot: false, movil: false,
    },
  },
  {
    key: "estandar",
    name: "Estándar",
    tagline: "Para inmobiliarias que arrancan.",
    price: 99,
    highlights: [
      "5 usuarios del equipo",
      "3 inmuebles · 25 lotes c/u",
      "Reportes y dashboard ilimitados",
      "10 GB · Bot de soporte · App móvil",
    ],
    limits: {
      usuarios: "5", inmuebles: "3", lotes: "25", formularios: "5",
      calculadoras: "2", reportes: "Ilimitados", dashboard: true,
      almacenamiento: "10 GB", bot: "Bot de soporte", movil: true,
    },
  },
  {
    key: "crecimiento",
    name: "Crecimiento",
    recommended: true,
    tagline: "Para desarrolladoras en expansión.",
    price: 149,
    highlights: [
      "10 usuarios del equipo",
      "5 inmuebles · 50 lotes c/u",
      "Formularios y calculadoras ilimitados",
      "50 GB · Bot prioritario · App móvil",
    ],
    limits: {
      usuarios: "10", inmuebles: "5", lotes: "50", formularios: "Ilimitados",
      calculadoras: "Ilimitadas", reportes: "Ilimitados", dashboard: true,
      almacenamiento: "50 GB", bot: "Bot prioritario", movil: true,
    },
  },
  {
    key: "profesional",
    name: "Profesional",
    tagline: "Para grupos y constructoras.",
    price: 249,
    highlights: [
      "Usuarios e inmuebles ilimitados",
      "250 lotes por inmueble",
      "Formularios y calculadoras ilimitados",
      "100 GB · Bot dedicado · App móvil",
    ],
    limits: {
      usuarios: "Ilimitados", inmuebles: "Ilimitados", lotes: "250",
      formularios: "Ilimitados", calculadoras: "Ilimitadas", reportes: "Ilimitados",
      dashboard: true, almacenamiento: "100 GB", bot: "Bot dedicado", movil: true,
    },
  },
];

// Lo que llega después (solo tiers altos), de la propuesta.
const SOON = [
  "Carga de archivos CAD",
  "Módulo de virtualización de lotes",
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
 * Panel de planes de OwnTerra: 3 tiers de pago + prueba + tabla comparativa.
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
  onContact,
}) {
  const [showMatrix, setShowMatrix] = useState(true);

  // Índice de precios de Stripe por slug de tier.
  const priceByKey = Object.fromEntries((plans || []).map((p) => [p.plan, p]));
  // Respaldo legacy: si el backend aún devuelve un único plan "pro", úsalo para todos
  // los tiers de pago (todas las tarjetas cobrarían ese precio hasta configurar tiers).
  const legacyPaid = priceByKey.pro || null;

  // Vista precalculada por plan (precio real de Stripe con respaldo de marketing).
  const view = PLANS.map((plan) => {
    const backend = priceByKey[plan.key] || (plan.price > 0 ? legacyPaid : null);
    const amount = backend?.amount != null ? backend.amount / 100 : plan.price;
    const currency = backend?.currency || CURRENCY;
    return { ...plan, priceId: backend?.price_id || null, amount, currency };
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

      <div className="pp-grid pp-grid--4">
        {view.map((plan) => {
          const paid = plan.price > 0;
          const current = isCurrent(plan);
          const canBuy = !!plan.priceId;

          return (
            <div
              key={plan.key}
              className={`pp-card${plan.recommended ? " pp-card--rec" : ""}${current ? " pp-card--current" : ""}`}
            >
              {plan.recommended && <div className="pp-ribbon">Recomendado</div>}

              <div className="pp-name">
                OwnTerra <b>{plan.name}</b>
                {plan.badge && <span className="pp-badge">{plan.badge}</span>}
              </div>
              <div className="pp-tagline">{plan.tagline}</div>

              <div className="pp-price">
                {paid ? (
                  <>
                    <span className="pp-cur">$</span>
                    <span className="pp-amount">
                      {new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(plan.amount)}
                    </span>
                    <span className="pp-per">{(plan.currency || CURRENCY).toUpperCase()}/mes</span>
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
                  {busyKey === plan.priceId ? "Redirigiendo…" : ctaLabel}
                </button>
              )}

              <ul className="pp-feats">
                {plan.highlights.map((f) => (
                  <li key={f}><Check /> {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Add-on disponible en cualquier plan */}
      <div className="pp-addon">
        <span className="pp-addon-icon" aria-hidden="true">＋</span>
        <span className="pp-addon-text">
          <b>Paquetes de +100 lotes</b> por <b>$10</b> — disponibles en cualquier plan.
        </span>
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
                    <th key={p.key} className={p.recommended ? "is-rec" : ""}>
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
                      <td key={p.key} className={p.recommended ? "is-rec" : ""}>
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

      {/* Próximamente (solo tiers altos) + contacto ventas */}
      <div className="pp-soon">
        <div className="pp-soon-title">Próximamente en Profesional / Enterprise</div>
        <ul className="pp-soon-list">
          {SOON.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="pp-soon-cta">
          ¿Necesitas algo a la medida u operación multi-sucursal?{" "}
          <button type="button" className="pp-link" onClick={() => onContact?.()}>
            Habla con ventas
          </button>
        </p>
      </div>
    </div>
  );
}

export default PricingPlans;
