export const RESERVATION_STATUS_LABEL = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "Hospedado",
  checked_out: "Salida realizada",
  cancelled: "Cancelada",
};

export const HOUSEKEEPING_STATUS_LABEL = {
  dirty: "Por limpiar",
  cleaning: "En limpieza",
  inspection: "Por inspeccionar",
  ready: "Lista",
};

export const EMPTY_HOSPITALITY_RESERVATION = {
  guestName: "", guestEmail: "", guestPhone: "", unitId: "",
  checkIn: "2026-08-28", checkOut: "2026-08-30", guests: 2,
  channel: "Directa", nightlyRate: 2400, deposit: 0, notes: "",
};

export function nightsBetween(checkIn, checkOut) {
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function validateHospitalityReservation(draft, reservations = []) {
  const errors = {};
  if (!draft.guestName?.trim()) errors.guestName = "Ingresa el nombre del huésped.";
  if (!draft.unitId) errors.unitId = "Selecciona una unidad.";
  if (!draft.checkIn) errors.checkIn = "Selecciona la fecha de llegada.";
  if (!draft.checkOut) errors.checkOut = "Selecciona la fecha de salida.";
  if (draft.checkIn && draft.checkOut && nightsBetween(draft.checkIn, draft.checkOut) < 1) errors.checkOut = "La salida debe ser posterior a la llegada.";
  const overlap = reservations.some((item) => item.unitId === draft.unitId && item.status !== "cancelled"
    && draft.checkIn < item.checkOut && draft.checkOut > item.checkIn);
  if (overlap) errors.unitId = "La unidad ya está reservada durante esas fechas.";
  return errors;
}

export function createHospitalityReservation(draft, reservations = []) {
  const errors = validateHospitalityReservation(draft, reservations);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  return {
    id: globalThis.crypto?.randomUUID?.() || `stay-${Date.now()}`,
    folio: `OT-H-${String(Date.now()).slice(-5)}`,
    ...draft,
    guestName: draft.guestName.trim(),
    guests: Number(draft.guests) || 1,
    nightlyRate: Number(draft.nightlyRate) || 0,
    deposit: Number(draft.deposit) || 0,
    nights,
    total: nights * (Number(draft.nightlyRate) || 0),
    paid: Number(draft.deposit) || 0,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
}

export function nextReservationStatus(status) {
  return ({ pending: "confirmed", confirmed: "checked_in", checked_in: "checked_out" })[status] || status;
}

export function nextHousekeepingStatus(status) {
  return ({ dirty: "cleaning", cleaning: "inspection", inspection: "ready" })[status] || status;
}
