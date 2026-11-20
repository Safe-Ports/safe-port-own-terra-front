/**
 * Modelo de precio de Lands (MXN, más IVA).
 *
 * - Galería principal: Prueba (gratis), Estándar y Empresarial, cada uno con un
 *   tope de lotes por organización.
 * - Cotizador (de 1 a MAX_QUOTE_LOTS lotes): recomienda el plan que conviene.
 *   Hasta los lotes del Estándar, Estándar; hasta los del Empresarial,
 *   Empresarial; arriba, Empresarial + paquetes extra de PACKAGE_SIZE lotes con
 *   precio graduado (EXTRA_PACKAGE_TIERS). Al Estándar no se le suman paquetes:
 *   saldría más barato que el Empresarial. Ventas confirma el precio final, y
 *   arriba de MAX_QUOTE_LOTS la cotización es personalizada.
 *   No hay paquetes sueltos para operaciones chicas.
 *
 * Precio graduado: cada paquete se cobra según el tramo en el que cae su
 * último lote, como un impuesto por tramos. Así el descuento solo aplica a lo
 * que pasa del umbral y un lote extra nunca abarata la cuenta completa.
 * Se traduce a un Price de Stripe con `billing_scheme=tiered` y
 * `tiers_mode=graduated`, con `quantity` = paquetes extra.
 *
 * El cobro real lo define Stripe; si cambian los montos ahí, actualizar aquí y
 * en el sitio público (safe-ports-website/src/data/business.js).
 */
export const CURRENCY = "MXN";
export const PACKAGE_SIZE = 50;
export const PACKAGE_PRICE = 100;
export const LARGE_OPERATION_LOTS = 600;
export const MAX_QUOTE_LOTS = 5000;

export const STANDARD_PLAN = { key: "estandar", name: "Estándar", price: 6000, lots: 250 };
export const ENTERPRISE_PLAN = { key: "empresarial", name: "Empresarial", price: 8000, lots: 500 };

// Paquetes extra sobre el Empresarial. `upToLots` = último lote del tramo
// (inclusive); `null` = sin límite. PENDIENTE DE PRODUCTO: % de descuento.
export const EXTRA_PACKAGE_TIERS = [
  { upToLots: LARGE_OPERATION_LOTS, unitPrice: PACKAGE_PRICE },
  { upToLots: null, unitPrice: 80 }, // más de 600 lotes: 20% menos por paquete
];

export const discountPct = (unitPrice) => Math.round((1 - unitPrice / PACKAGE_PRICE) * 100);

export function packagesFor(lots) {
  const n = Math.max(0, Math.floor(Number(lots) || 0));
  return Math.max(1, Math.ceil(n / PACKAGE_SIZE));
}

/** Plan que conviene para `lots`: el Estándar si le alcanza, si no el Empresarial. */
export function planFor(lots) {
  return lots <= STANDARD_PLAN.lots ? STANDARD_PLAN : ENTERPRISE_PLAN;
}

/**
 * Estimado mensual para `lots` lotes: el plan que conviene y, si pasa de los
 * lotes del Empresarial, paquetes extra agrupados por tramo.
 */
export function estimateSubscription(lots, tiers = EXTRA_PACKAGE_TIERS) {
  const requestedLots = Math.max(0, Math.floor(Number(lots) || 0));
  const plan = planFor(requestedLots);
  const extraLots = Math.max(0, requestedLots - plan.lots);
  const packages = extraLots > 0 ? Math.ceil(extraLots / PACKAGE_SIZE) : 0;
  const coveredLots = plan.lots + packages * PACKAGE_SIZE;

  const lines = [
    { key: "plan", label: `Plan ${plan.name}`, detail: `Incluye ${plan.lots} lotes`, subtotal: plan.price },
  ];

  let fromLot = plan.lots + 1;
  for (const tier of tiers) {
    if (fromLot > coveredLots) break;
    const tierEnd = tier.upToLots == null ? coveredLots : Math.min(tier.upToLots, coveredLots);
    if (tierEnd < fromLot) continue;
    const count = Math.ceil((tierEnd - fromLot + 1) / PACKAGE_SIZE);
    const toLot = fromLot + count * PACKAGE_SIZE - 1;
    lines.push({
      key: `tier-${fromLot}`,
      label: `Lotes ${fromLot}–${toLot}`,
      detail: `${count} × paquete de ${PACKAGE_SIZE} a $${tier.unitPrice}`,
      packages: count,
      unitPrice: tier.unitPrice,
      subtotal: count * tier.unitPrice,
      discounted: tier.unitPrice < PACKAGE_PRICE,
    });
    fromLot = toLot + 1;
  }

  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const listPrice = plan.price + packages * PACKAGE_PRICE;

  return {
    requestedLots,
    plan,
    packages,
    coveredLots,
    spareLots: coveredLots - requestedLots,
    lines,
    total,
    savings: listPrice - total,
    perLot: total / coveredLots,
    isLargeOperation: lines.some((l) => l.discounted),
  };
}
