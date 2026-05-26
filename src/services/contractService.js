import api from "./api";

export const contractService = {
  list: (params = {}) => api.get("/contracts", { params }).then((r) => r.data),
  get: (id) => api.get(`/contracts/${id}`).then((r) => r.data),
  create: (body) => api.post("/contracts", body).then((r) => r.data),
  update: (id, body) => api.patch(`/contracts/${id}`, body).then((r) => r.data),
  cancel: (id, body) => api.post(`/contracts/${id}/cancel`, body),
  complete: (id) => api.post(`/contracts/${id}/complete`).then((r) => r.data),
  delete: (id) => api.delete(`/contracts/${id}`),
  downloadPdf: (id) => `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"}/contracts/${id}/pdf`,
};
