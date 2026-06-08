import api from "./api";

export const clientService = {
  list:      (params = {})  => api.get("/clients", { params }).then(r => r.data),
  get:       (id)           => api.get(`/clients/${id}`).then(r => r.data),
  create:    (body)         => api.post("/clients", body).then(r => r.data),
  update:    (id, body)     => api.patch(`/clients/${id}`, body).then(r => r.data),
  updateStage: (id, pipeline_stage) => api.patch(`/clients/${id}/stage`, { pipeline_stage }).then(r => r.data),
  delete:    (id)           => api.delete(`/clients/${id}`),
  contracts: (id)           => api.get(`/clients/${id}/contracts`).then(r => r.data),
  payments:  (id, params = {}) => api.get(`/clients/${id}/payments`, { params }).then(r => r.data),
  statement: (id)           => api.get(`/clients/${id}/statement`).then(r => r.data),
  statementPdf: (id)        => api.get(`/clients/${id}/statement/pdf`, { responseType: "blob" }).then(r => r.data),
  sendStatement: (id, body = {}) => api.post(`/clients/${id}/statement/send-email`, body).then(r => r.data),
  getApps:   (id)           => api.get(`/clients/${id}/apps`).then(r => r.data),
  assignApp: (id, appKey)   => api.post(`/clients/${id}/apps/${appKey}`).then(r => r.data),
  removeApp: (id, appKey)   => api.delete(`/clients/${id}/apps/${appKey}`),
};
