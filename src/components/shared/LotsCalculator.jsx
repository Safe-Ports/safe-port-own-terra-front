import { useId, useState } from "react";
import {
  CURRENCY,
  PACKAGE_SIZE,
  LARGE_OPERATION_LOTS,
  MAX_QUOTE_LOTS,
  STANDARD_PLAN,
  ENTERPRISE_PLAN,
  EXTRA_PACKAGE_TIERS,
  discountPct,
  estimateSubscription,
} from "@/services/landsPricing";

const MIN_LOTS = 1;
const PRESETS = [100, 250, 500, 1000, 2500, 5000];

const fmtMoney = (amount) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const fmtInt = (n) => new Intl.NumberFormat("es-MX").format(n);

// Una tarjeta por tramo, en lotes: los dos planes y luego los paquetes extra.
const tierCards = (() => {
  const cards = [
    { title: `Hasta ${fmtInt(STANDARD_PLAN.lots)} lotes`, price: STANDARD_PLAN.price, unit: `plan ${STANDARD_PLAN.name}`, pct: 0 },
    {
      title: `${fmtInt(STANDARD_PLAN.lots + 1)}–${fmtInt(ENTERPRISE_PLAN.lots)} lotes`,
      price: ENTERPRISE_PLAN.price,
      unit: `plan ${ENTERPRISE_PLAN.name}`,
      pct: 0,
    },
  ];
  let fromLot = ENTERPRISE_PLAN.lots + 1;
  for (const t of EXTRA_PACKAGE_TIERS) {
    const title = t.upToLots == null
      ? `Desde el lote ${fmtInt(fromLot)}`
      : `${fmtInt(fromLot)}–${fmtInt(t.upToLots)} lotes`;
    if (t.upToLots != null) fromLot = t.upToLots + 1;
    cards.push({ title, price: t.unitPrice, unit: `por paquete de ${PACKAGE_SIZE}`, pct: discountPct(t.unitPrice) });
  }
  return cards;
})();

/**
 * Cotizador para operaciones de 1 a MAX_QUOTE_LOTS lotes: recomienda el plan
 * que conviene y, arriba de los lotes del Empresarial, suma paquetes de
 * PACKAGE_SIZE lotes con descuento graduado por volumen. No cobra: `onQuote`
 * recibe el estimado para pedir la cotización a ventas, que confirma el precio.
 */
function LotsCalculator({ initialLots = 250, onQuote }) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(initialLots));
  const lots = Math.min(Math.max(Math.floor(Number(draft)) || 0, MIN_LOTS), MAX_QUOTE_LOTS);
  const overMax = Number(draft) > MAX_QUOTE_LOTS;
  const estimate = estimateSubscription(lots);

  return (
    <div className="lc">
      <div className="pp-head">
        <h3 className="pp-title">Cotiza tu operación</h3>
        <p className="pp-sub">
          Dinos cuántos lotes manejas y te recomendamos el plan que te conviene. Arriba de{" "}
          {fmtInt(ENTERPRISE_PLAN.lots)} lotes sumas paquetes de {PACKAGE_SIZE}, con descuento por volumen a partir
          del lote {fmtInt(LARGE_OPERATION_LOTS + 1)}.
        </p>
      </div>

      <div className="lc-card">
        <div className="lc-input">
          <label htmlFor={inputId} className="lc-label">¿Cuántos lotes maneja tu operación?</label>
          <div className="lc-number">
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={MIN_LOTS}
              max={MAX_QUOTE_LOTS}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setDraft(String(lots))}
            />
            <span>lotes</span>
          </div>
          <input
            type="range"
            className="lc-range"
            min={MIN_LOTS}
            max={MAX_QUOTE_LOTS}
            step={10}
            value={lots}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Ajustar número de lotes"
          />
          <div className="lc-range-scale" aria-hidden="true">
            <span>{fmtInt(MIN_LOTS)}</span>
            <span>{fmtInt(MAX_QUOTE_LOTS)}</span>
          </div>
          <div className="lc-presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`lc-chip${lots === p ? " is-active" : ""}`}
                onClick={() => setDraft(String(p))}
              >
                {fmtInt(p)} lotes
              </button>
            ))}
          </div>
          <div className="lc-tiers">
            {tierCards.map((t) => (
              <div key={t.title} className={`lc-tier${t.pct > 0 ? " lc-tier--large" : ""}`}>
                <span className="lc-tier-title">{t.title}</span>
                <span className="lc-tier-price">{fmtMoney(t.price)} <small>{t.unit}</small></span>
                {t.pct > 0 && <span className="pp-badge">{t.pct}% menos</span>}
              </div>
            ))}
          </div>
          {overMax && (
            <p className="lc-note">
              Cotizamos hasta {fmtInt(MAX_QUOTE_LOTS)} lotes; para más, solicita una cotización personalizada.
            </p>
          )}
        </div>

        <div className="lc-summary" aria-live="polite">
          <div className="lc-summary-label">Te conviene el plan {estimate.plan.name}</div>
          <div className="pp-price">
            <span className="pp-amount">{fmtMoney(estimate.total)}</span>
            <span className="pp-per">{CURRENCY}/mes + IVA</span>
          </div>
          <p className="lc-summary-pkgs">
            Cubre hasta <b>{fmtInt(estimate.coveredLots)}</b> lotes
            {estimate.spareLots > 0 && (
              <span className="lc-spare">Te quedan {fmtInt(estimate.spareLots)} lotes libres para crecer</span>
            )}
          </p>

          <ul className="lc-lines">
            {estimate.lines.map((l) => (
              <li key={l.key}>
                <span>
                  {l.label}
                  <small>{l.detail}</small>
                </span>
                <b>{fmtMoney(l.subtotal)}</b>
              </li>
            ))}
            {estimate.savings > 0 && (
              <li className="lc-savings">
                <span>Descuento por operación grande</span>
                <b>−{fmtMoney(estimate.savings)}</b>
              </li>
            )}
          </ul>
          <div className="lc-perlot">Equivale a {fmtMoney(estimate.perLot)} por lote al mes</div>

          <button
            type="button"
            className="pp-cta"
            disabled={!onQuote}
            onClick={() => onQuote?.(estimate)}
          >
            Solicitar cotización
          </button>
          <p className="lc-note">Precio estimado. Un asesor te confirma la cotización final.</p>
        </div>
      </div>
    </div>
  );
}

export default LotsCalculator;
