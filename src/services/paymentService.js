import api from "./api";

export const paymentService = {
  list: (params = {}) => api.get("/payments", { params }).then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data),
  markPaid: (id, body) => api.post(`/payments/${id}/mark-paid`, body).then((r) => r.data),
  // Cobra sobre el contrato, no sobre una cuota: el monto se reparte entre las que cubra.
  collect: (contractId, body) => api.post(`/contracts/${contractId}/collect`, body).then((r) => r.data),
  // El comprobante se adjunta al cobro, no a la cuota: un solo papel puede
  // respaldar varias mensualidades.
  uploadCollectReceipt: (receiptId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/payments/receipts/${receiptId}/upload-receipt`, fd).then((r) => r.data);
  },
  uploadReceipt: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/payments/${id}/upload-receipt`, fd).then((r) => r.data);
  },
  reverse: (id, body) => api.post(`/payments/${id}/reverse-payment`, body).then((r) => r.data),
  sendReminder: (id, body) => api.post(`/payments/${id}/send-reminder`, body).then((r) => r.data),
  // Las cifras de las tarjetas se agregan en la base: sumarlas sobre la lista
  // paginada dejaba los totales cortos apenas la organización pasaba el tope.
  kpis: (params = {}) => api.get("/payments/kpis", { params }).then((r) => r.data),
  upcoming: (params = {}) => api.get("/payments/upcoming", { params }).then((r) => r.data),
  overdue: (params = {}) => api.get("/payments/overdue", { params }).then((r) => r.data),
};
