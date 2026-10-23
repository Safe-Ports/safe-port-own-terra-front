// Cobranza con comprobante: el residente REPORTA un pago con su evidencia y la
// administración lo confirma o lo rechaza. Un reporte nunca marca un cargo como
// pagado por sí solo: sólo la aprobación crea el pago (settlement) en el backend.
// Contrato completo: docs/2026-10-14_properties-cobranza-contrato-front-backend.md (carpeta docs del workspace).

export const REPORT_STATUS = {
  submitted: { label: "En revisión", tone: "progress" },
  approved: { label: "Confirmado", tone: "ok" },
  rejected: { label: "Rechazado", tone: "due" },
  cancelled: { label: "Cancelado", tone: "muted" },
};

export const PAYMENT_METHODS = [
  ["transfer", "Transferencia"],
  ["deposit", "Depósito en banco o tienda"],
  ["cash", "Efectivo en administración"],
  ["card", "Tarjeta"],
  ["other", "Otro"],
];
export const methodLabel = (value) => Object.fromEntries(PAYMENT_METHODS)[value] || value || "Sin método";

export const EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(value) || 0);
export const outstanding = (charge) => Math.max(0, Number(charge.amount) - Number(charge.paid_amount ?? charge.paidAmount ?? 0));

/** Validación del reporte que envía el residente. Devuelve { campo: mensaje }. */
export function validateReport(draft, today = new Date().toISOString().slice(0, 10)) {
  const errors = {};
  if (!draft.chargeIds?.length) errors.chargeIds = "Elige al menos un cargo que estás pagando.";
  if (!(Number(draft.amount) > 0)) errors.amount = "Escribe el monto que pagaste.";
  if (!draft.paidOn) errors.paidOn = "Indica la fecha del pago.";
  else if (draft.paidOn > today) errors.paidOn = "La fecha no puede ser futura.";
  if (!draft.method) errors.method = "Elige cómo pagaste.";
  if (!draft.file) errors.file = "Adjunta la foto o PDF de tu comprobante.";
  else if (!EVIDENCE_TYPES.includes(draft.file.type)) errors.file = "Sube una imagen (JPG, PNG, WEBP o HEIC) o un PDF.";
  else if (draft.file.size > EVIDENCE_MAX_BYTES) errors.file = "El archivo pesa más de 10 MB.";
  return errors;
}

/** Último reporte que cubre un cargo (el más reciente manda). */
export function reportForCharge(reports, chargeId) {
  return reports
    .filter((report) => report.charge_ids.includes(chargeId) && report.status !== "cancelled")
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

/** Cargos que todavía se pueden reportar: con saldo y sin un reporte en revisión. */
export function reportableCharges(charges, reports) {
  return charges.filter((charge) => outstanding(charge) > 0 && reportForCharge(reports, charge.id)?.status !== "submitted");
}

/** Aviso para el inicio del residente según el estado de sus reportes recientes. */
export function reportNotices(reports, now = new Date()) {
  const recent = (value) => (now - new Date(value)) / 86400000 <= 7;
  return reports.flatMap((report) => {
    const amount = money(report.amount, report.currency);
    if (report.status === "submitted") return [{ key: `report-${report.id}`, rank: 2.5, tone: "calm", icon: "charge", section: "charges", label: "Pago en revisión", title: `Tu pago de ${amount} está en revisión`, detail: "La administración revisará tu comprobante." }];
    if (report.status === "approved" && recent(report.reviewed_at)) return [{ key: `report-${report.id}`, rank: 6, tone: "ok", icon: "charge", section: "charges", label: "Pago confirmado", title: `Tu pago de ${amount} fue confirmado`, detail: "Gracias. Ya se aplicó a tu estado de cuenta." }];
    if (report.status === "rejected" && recent(report.reviewed_at)) return [{ key: `report-${report.id}`, rank: 0.5, tone: "alert", icon: "charge", section: "charges", label: "Comprobante rechazado", title: "No pudimos validar tu comprobante", detail: report.rejection_reason || "Revisa el motivo y repórtalo de nuevo." }];
    return [];
  });
}

/* ── Política de cobranza por comunidad ────────────────────────────────────
   Recordatorios y recargos los configura la administración. Los recargos van
   APAGADOS por omisión: su monto y sus días de gracia dependen del reglamento
   o de la asamblea de cada comunidad, no los decide el sistema. */
export const DEFAULT_POLICY = {
  auto_generate: { enabled: false, day_of_month: 1 },
  reminders: { before_days: [3], on_due_date: true, after_days: [3, 15] },
  channels: { in_app: true, email: true },
  late_fee: { enabled: false, kind: "fixed", value: null, grace_days: 5 },
};

export function normalizePolicy(policy) {
  const base = structuredClone(DEFAULT_POLICY);
  if (!policy) return base;
  return {
    auto_generate: { ...base.auto_generate, ...policy.auto_generate },
    reminders: { ...base.reminders, ...policy.reminders },
    channels: { ...base.channels, ...policy.channels },
    late_fee: { ...base.late_fee, ...policy.late_fee },
  };
}

export function validatePolicy(policy) {
  const errors = {};
  const day = Number(policy.auto_generate.day_of_month);
  if (policy.auto_generate.enabled && !(day >= 1 && day <= 28)) errors.day_of_month = "Elige un día entre el 1 y el 28.";
  const days = [...policy.reminders.before_days, ...policy.reminders.after_days];
  if (days.some((value) => !(Number.isInteger(value) && value > 0 && value <= 60))) errors.reminders = "Usa días enteros entre 1 y 60.";
  if (policy.late_fee.enabled) {
    const value = Number(policy.late_fee.value);
    if (!(value > 0)) errors.late_fee_value = "Escribe el monto o porcentaje del recargo.";
    else if (policy.late_fee.kind === "percent" && value > 100) errors.late_fee_value = "El porcentaje no puede pasar de 100.";
    const grace = Number(policy.late_fee.grace_days);
    if (!(Number.isInteger(grace) && grace >= 0 && grace <= 60)) errors.grace_days = "Usa entre 0 y 60 días de gracia.";
  }
  return errors;
}

/** "3 días antes, el día de vencimiento y 3 y 15 días después" */
export function remindersSummary(reminders) {
  const join = (values) => values.length > 1 ? `${values.slice(0, -1).join(", ")} y ${values.at(-1)}` : `${values[0]}`;
  const parts = [];
  if (reminders.before_days.length) parts.push(`${join(reminders.before_days)} ${reminders.before_days.at(-1) === 1 ? "día" : "días"} antes`);
  if (reminders.on_due_date) parts.push("el día de vencimiento");
  if (reminders.after_days.length) parts.push(`${join(reminders.after_days)} ${reminders.after_days.at(-1) === 1 ? "día" : "días"} después`);
  return parts.length ? parts.join(", ").replace(/, ([^,]*)$/, " y $1") : "Sin recordatorios";
}

/** Ejemplo legible del recargo para que la administración vea qué configuró. */
export function lateFeeExample(lateFee, sampleAmount = 1850) {
  if (!lateFee.enabled || !(Number(lateFee.value) > 0)) return "Sin recargos por atraso.";
  const fee = lateFee.kind === "percent" ? sampleAmount * Number(lateFee.value) / 100 : Number(lateFee.value);
  const grace = Number(lateFee.grace_days) || 0;
  return `Una cuota de ${money(sampleAmount)} sin pagar ${grace ? `${grace} ${grace === 1 ? "día" : "días"} después de vencer` : "al vencer"} genera un recargo de ${money(fee)}, una sola vez por cargo.`;
}
