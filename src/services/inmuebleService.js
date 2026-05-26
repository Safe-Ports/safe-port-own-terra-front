import api from "./api";

export const inmuebleService = {
  list: (params = {}) => api.get("/inmuebles", { params }).then((r) => r.data),
  get: (id) => api.get(`/inmuebles/${id}`).then((r) => r.data),
  create: (body) => api.post("/inmuebles", body).then((r) => r.data),
  update: (id, body) => api.patch(`/inmuebles/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/inmuebles/${id}`),
};
