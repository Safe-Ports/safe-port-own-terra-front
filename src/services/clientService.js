import api from "./api";

export const clientService = {
  list: (params = {}) => api.get("/clients", { params }).then((r) => r.data),
  get: (id) => api.get(`/clients/${id}`).then((r) => r.data),
  create: (body) => api.post("/clients", body).then((r) => r.data),
  update: (id, body) => api.patch(`/clients/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/clients/${id}`),
};
