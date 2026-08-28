import api from "./api";

export const paymentService = {
  list: (params = {}) => api.get("/payments", { params }).then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data),
  markPaid: (id, body) => api.post(`/payments/${id}/mark-paid`, body).then((r) => r.data),
  // Cobra sobre el contrato, no sobre una cuota: el monto se reparte entre las que cubra.
  collect: (contractId, body) => api.post(`/contracts/${contractId}/collect`, body).then((r) => r.data),
  reverse: (id, body) => api.post(`/payments/${id}/reverse-payment`, body).then((r) => r.data),
  sendReminder: (id, body) => api.post(`/payments/${id}/send-reminder`, body).then((r) => r.data),
  upcoming: (params = {}) => api.get("/payments/upcoming", { params }).then((r) => r.data),
  overdue: (params = {}) => api.get("/payments/overdue", { params }).then((r) => r.data),
};
