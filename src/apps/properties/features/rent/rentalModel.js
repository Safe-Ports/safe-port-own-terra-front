export const RENTAL_PROSPECT_STATUS = Object.freeze({
  new: "Nuevo",
  contacted: "Contactado",
  visit: "Visita",
  application: "Expediente",
  approved: "Aprobado",
  rejected: "Descartado",
});

export const RENTAL_LEASE_STATUS = Object.freeze({
  upcoming: "Próximo",
  active: "Activo",
  ended: "Terminado",
  archived: "Archivado",
});

export const RENTAL_PAYMENT_STATUS = Object.freeze({
  pending: "Por cobrar",
  partial: "Pago parcial",
  paid: "Registrado",
  overdue: "Vencido",
});

export const RENTAL_INSPECTION_STATUS = Object.freeze({
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
});

const id = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}`;
const clean = (value) => String(value || "").trim();
const amount = (value) => Number(value) || 0;

export function validateRentalProspect(draft) {
  const errors = {};
  if (!clean(draft.name)) errors.name = "Ingresa el nombre del prospecto.";
  if (!clean(draft.unitId)) errors.unitId = "Selecciona la unidad de interés.";
  if (amount(draft.budget) <= 0) errors.budget = "Ingresa un presupuesto mayor a cero.";
  if (!clean(draft.desiredMoveIn)) errors.desiredMoveIn = "Selecciona la fecha deseada.";
  if (!clean(draft.phone) && !clean(draft.email)) errors.contact = "Ingresa teléfono o correo.";
  return errors;
}

export function createRentalProspect(draft) {
  const errors = validateRentalProspect(draft);
  if (Object.keys(errors).length) throw new Error("Completa los datos obligatorios del prospecto.");
  return {
    id: id("rental-prospect"),
    name: clean(draft.name),
    phone: clean(draft.phone),
    email: clean(draft.email).toLowerCase(),
    unitId: clean(draft.unitId),
    source: clean(draft.source) || "Directo",
    budget: amount(draft.budget),
    desiredMoveIn: clean(draft.desiredMoveIn),
    status: "new",
    notes: clean(draft.notes),
    createdAt: new Date().toISOString(),
  };
}

export function validateRentalTenant(draft) {
  const errors = {};
  if (!clean(draft.name)) errors.name = "Ingresa el nombre o razón social.";
  if (!clean(draft.phone) && !clean(draft.email)) errors.contact = "Ingresa teléfono o correo.";
  return errors;
}

export function createRentalTenant(draft) {
  const errors = validateRentalTenant(draft);
  if (Object.keys(errors).length) throw new Error("Completa los datos obligatorios del inquilino.");
  return {
    id: id("rental-tenant"),
    personType: draft.personType || "individual",
    name: clean(draft.name),
    phone: clean(draft.phone),
    email: clean(draft.email).toLowerCase(),
    emergencyContact: clean(draft.emergencyContact),
    documentSummary: clean(draft.documentSummary),
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

export function validateRentalLease(draft, currentLeases = []) {
  const errors = {};
  if (!clean(draft.tenantId)) errors.tenantId = "Selecciona un inquilino.";
  if (!clean(draft.unitId)) errors.unitId = "Selecciona una unidad.";
  if (!clean(draft.startDate)) errors.startDate = "Selecciona la fecha inicial.";
  if (!clean(draft.endDate)) errors.endDate = "Selecciona la fecha final.";
  if (draft.startDate && draft.endDate && draft.startDate >= draft.endDate) {
    errors.endDate = "La fecha final debe ser posterior a la inicial.";
  }
  if (amount(draft.rent) <= 0) errors.rent = "Ingresa una renta mayor a cero.";
  const dueDay = Number(draft.dueDay);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    errors.dueDay = "El día de pago debe estar entre 1 y 28.";
  }
  const overlaps = currentLeases.some((lease) =>
    lease.unitId === draft.unitId &&
    ["active", "upcoming"].includes(lease.status) &&
    draft.startDate <= lease.endDate && draft.endDate >= lease.startDate
  );
  if (overlaps) errors.unitId = "La unidad ya tiene un contrato vigente en esas fechas.";
  return errors;
}

export function createRentalLease(draft, currentLeases = []) {
  const errors = validateRentalLease(draft, currentLeases);
  if (Object.keys(errors).length) throw new Error("Revisa los datos del contrato.");
  return {
    id: id("rental-lease"),
    tenantId: clean(draft.tenantId),
    unitId: clean(draft.unitId),
    startDate: draft.startDate,
    endDate: draft.endDate,
    rent: amount(draft.rent),
    deposit: amount(draft.deposit),
    depositStatus: amount(draft.deposit) > 0 ? "held" : "not_registered",
    dueDay: Number(draft.dueDay),
    frequency: "monthly",
    includedServices: clean(draft.includedServices),
    signedDocumentName: clean(draft.signedDocumentName),
    status: draft.status || "active",
    createdAt: new Date().toISOString(),
  };
}

export function createRentalPayment(draft) {
  if (!clean(draft.leaseId) || amount(draft.amount) <= 0 || !clean(draft.period)) {
    throw new Error("Completa contrato, periodo e importe.");
  }
  return {
    id: id("rental-payment"),
    leaseId: clean(draft.leaseId),
    period: clean(draft.period),
    amount: amount(draft.amount),
    dueDate: clean(draft.dueDate),
    paidAt: clean(draft.paidAt) || new Date().toISOString().slice(0, 10),
    method: clean(draft.method) || "transfer",
    evidenceName: clean(draft.evidenceName),
    status: draft.status || "paid",
    note: clean(draft.note),
    createdAt: new Date().toISOString(),
  };
}

export function createRentalInspection(draft) {
  if (!clean(draft.leaseId) || !clean(draft.unitId) || !clean(draft.scheduledAt)) {
    throw new Error("Completa contrato, unidad y fecha de inspección.");
  }
  return {
    id: id("rental-inspection"),
    leaseId: clean(draft.leaseId),
    unitId: clean(draft.unitId),
    type: draft.type || "periodic",
    scheduledAt: draft.scheduledAt,
    status: "scheduled",
    checklist: clean(draft.checklist),
    evidenceCount: 0,
    notes: clean(draft.notes),
    createdAt: new Date().toISOString(),
  };
}

export function completeRentalInspection(inspection, evidenceCount = 0) {
  return {
    ...inspection,
    status: "completed",
    evidenceCount: Math.max(0, Number(evidenceCount) || 0),
    completedAt: new Date().toISOString(),
  };
}

export function rentalCollectionSummary(leases, payments, period) {
  const active = leases.filter((lease) => lease.status === "active");
  const expected = active.reduce((sum, lease) => sum + lease.rent, 0);
  const collected = payments
    .filter((payment) => payment.period === period && payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const partial = payments
    .filter((payment) => payment.period === period && payment.status === "partial")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const overdue = payments
    .filter((payment) => payment.period === period && payment.status === "overdue")
    .reduce((sum, payment) => sum + payment.amount, 0);
  return { expected, collected: collected + partial, overdue, outstanding: Math.max(0, expected - collected - partial) };
}
