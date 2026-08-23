import api from "./api";

export const providerService = {
  list: (params = {}) => api.get("/providers", { params }).then((r) => r.data),
  create: (body) => api.post("/providers", body).then((r) => r.data),
  update: (id, body) => api.patch(`/providers/${id}`, body).then((r) => r.data),
  archive: (id) => api.delete(`/providers/${id}`),
};
