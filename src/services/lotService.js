import api from "./api";

export const lotService = {
  list: (params = {}) => api.get("/lots", { params }).then((r) => r.data),
  get: (id) => api.get(`/lots/${id}`).then((r) => r.data),
  create: (body) => api.post("/lots", body).then((r) => r.data),
  bulkCreate: (body) => api.post("/lots/bulk", body, { timeout: 120000 }).then((r) => r.data),
  importTemplate: (format = "xlsx") =>
    api.get("/lots/import-template", { params: { format }, responseType: "blob" }).then((r) => r.data),
  update: (id, body) => api.patch(`/lots/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/lots/${id}`),
};
