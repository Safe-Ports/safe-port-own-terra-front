import api from "./api";

export const contractService = {
  // Lotes que volvieron al inventario: por contrato cancelado o apartado soltado.
  releases: (limit = 50) => api.get("/contracts/releases", { params: { limit } }).then(r => r.data),
  // Monto y comprobante juntos: quien liquida ya tiene el papel en la mano.
  settleRelease: ({ kind, refId, refunded, file }) => {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("ref_id", refId);
    fd.append("refunded", String(refunded));
    if (file) fd.append("file", file);
    return api.post("/contracts/releases/settle", fd).then(r => r.data);
  },
  list: (params = {}) => api.get("/contracts", { params }).then((r) => r.data),
  get: (id) => api.get(`/contracts/${id}`).then((r) => r.data),
  create: (body) => api.post("/contracts", body).then((r) => r.data),
  update: (id, body) => api.patch(`/contracts/${id}`, body).then((r) => r.data),
  cancel: (id, body) => api.post(`/contracts/${id}/cancel`, body),
  approve: (id) => api.post(`/contracts/${id}/approve`).then((r) => r.data),
  reject: (id, reason) => api.post(`/contracts/${id}/reject`, { reason }).then((r) => r.data),
  complete: (id) => api.post(`/contracts/${id}/complete`).then((r) => r.data),
  delete: (id) => api.delete(`/contracts/${id}`),
  downloadPdf: async (id) => {
    const response = await api.get(`/contracts/${id}/pdf`, { responseType: "blob" });
    return response.data;
  },
};
