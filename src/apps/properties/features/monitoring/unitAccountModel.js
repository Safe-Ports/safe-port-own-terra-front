import { outstanding, reportForCharge } from "../collections/collectionsModel";

const OPEN = new Set(["pending", "partial", "overdue"]);
// Orden de la cuenta: primero lo que espera una decisión, luego lo vencido, lo
// pendiente y al final lo ya cobrado o condonado.
const RANK = { reported: 0, overdue: 1, partial: 2, pending: 3, paid: 4, waived: 5 };

/**
 * Estado de cuenta de una unidad: sus cargos con el estado que ve la
 * administración ("reported" cuando el residente ya subió un comprobante) y los
 * totales que importan para cobrar. `settledLimit` recorta el historial cobrado.
 */
export function unitAccount({ charges = [], reports = [], unitId, settledLimit = 3 }) {
  const rows = charges.filter((charge) => charge.unitId === unitId).map((charge) => {
    const report = reportForCharge(reports, charge.id);
    const open = OPEN.has(charge.status);
    const state = open && report?.status === "submitted" ? "reported" : charge.status;
    return { ...charge, state, open, due: open ? outstanding(charge) : 0, report };
  }).sort((a, b) => (RANK[a.state] ?? 9) - (RANK[b.state] ?? 9) || String(a.dueDate).localeCompare(String(b.dueDate)));
  const openRows = rows.filter((row) => row.open);
  const settled = rows.filter((row) => !row.open);
  return {
    rows: [...openRows, ...settled.slice(-settledLimit).reverse()],
    hiddenSettled: Math.max(0, settled.length - settledLimit),
    pending: openRows.reduce((sum, row) => sum + row.due, 0),
    overdue: openRows.filter((row) => row.status === "overdue").reduce((sum, row) => sum + row.due, 0),
    toReview: openRows.filter((row) => row.state === "reported").length,
    paid: settled.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0),
  };
}
