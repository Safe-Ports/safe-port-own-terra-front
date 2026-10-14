/**
 * Centro de Recaudación (Stripe Connect) — capa de datos.
 * Endpoints reales bajo /api/v1/recaudacion (ver ESPEC_RECAUDACION.md §4).
 */
import api from "./api";

const B = "/recaudacion";

// El backend identifica cada pago por su UUID; el tablero muestra una referencia
// corta y estable derivada de él.
const withRef = (p) => ({ ...p, ref: `TX-${String(p.id).replace(/-/g, "").slice(0, 6).toUpperCase()}` });

export const recaudacionService = {
  // GET /config → { test_mode, connect_ready }
  getConfig: () => api.get(`${B}/config`).then((r) => r.data),

  // ── Cuentas ────────────────────────────────────────────────────────────────
  listCuentas: () => api.get(`${B}/cuentas`).then((r) => r.data),

  // POST /cuentas/onboarding { alias_interno } → { cuenta_id, onboarding_url }
  startOnboarding: ({ alias_interno }) =>
    api.post(`${B}/cuentas/onboarding`, { alias_interno }).then((r) => r.data),

  // GET /cuentas/{id}/onboarding-link → { cuenta_id, onboarding_url }
  refreshOnboardingLink: (id) => api.get(`${B}/cuentas/${id}/onboarding-link`).then((r) => r.data),

  // POST /cuentas/{id}/dashboard-link → { url }
  dashboardLink: (id) => api.post(`${B}/cuentas/${id}/dashboard-link`).then((r) => r.data),

  // DELETE /cuentas/{id}
  disableCuenta: (id) => api.delete(`${B}/cuentas/${id}`),

  // ── Links ──────────────────────────────────────────────────────────────────
  listLinks: (params = {}) => api.get(`${B}/links`, { params }).then((r) => r.data),

  // POST /links
  //  reusable → { tipo:'reusable', concepto, descripcion?, cuenta_id, monto?, metodos }
  //  unico    → { tipo:'unico', concepto, descripcion?, cuenta_id, monto, metodos,
  //               cliente_nombre, cliente_email?, vigencia_horas }
  createLink: (draft) => {
    const body = {
      tipo: draft.tipo,
      concepto: draft.concepto,
      cuenta_id: draft.cuenta_id,
      metodos: draft.metodos,
    };
    if (draft.descripcion) body.descripcion = draft.descripcion;
    if (draft.monto != null && draft.monto !== "") body.monto = Number(draft.monto);
    if (draft.tipo === "unico") {
      body.cliente_nombre = draft.cliente_nombre;
      if (draft.cliente_email) body.cliente_email = draft.cliente_email;
      body.vigencia_horas = Number(draft.vigencia_horas) || 24;
    }
    return api.post(`${B}/links`, body).then((r) => r.data);
  },

  // PATCH /links/{id} { estado }  (solo reusable)
  toggleLink: (id, activo) =>
    api.patch(`${B}/links/${id}`, { estado: activo ? "activo" : "inactivo" }).then((r) => r.data),

  // POST /links/{id}/expirar  (solo unico pendiente)
  expireLink: (id) => api.post(`${B}/links/${id}/expirar`).then((r) => r.data),

  // ── Tablero ────────────────────────────────────────────────────────────────
  // GET /pagos → { items, total, page, limit, pages }
  listPagos: (params = {}) =>
    api.get(`${B}/pagos`, { params }).then((r) => ({
      ...r.data,
      items: (r.data.items || []).map(withRef),
    })),

  // GET /stats → { volumen_procesado_centavos, transacciones_exitosas, variacion_pct }
  getStats: (params = {}) => api.get(`${B}/stats`, { params }).then((r) => r.data),
};
