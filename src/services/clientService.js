import api, { TIMEOUT_ARCHIVO } from "./api";

export const clientService = {
  // Fase 2 de la migración: la cartera con su Clave Cliente, que es lo que
  // después permite cruzar los contratos.
  importCsv: (file, { dry_run = false } = {}) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("dry_run", String(dry_run));
    return api.post("/clients/import", fd).then(r => r.data);
  },
  importTemplate: () =>
    api.get("/clients/import/template", { responseType: "blob" }).then(r => r.data),
  list:      (params = {})  => api.get("/clients", { params }).then(r => r.data),
  get:       (id)           => api.get(`/clients/${id}`).then(r => r.data),
  create:    (body)         => api.post("/clients", body).then(r => r.data),
  update:    (id, body)     => api.patch(`/clients/${id}`, body).then(r => r.data),
  updateStage: (id, pipeline_stage) => api.patch(`/clients/${id}/stage`, { pipeline_stage }).then(r => r.data),
  delete:    (id)           => api.delete(`/clients/${id}`),
  contracts: (id)           => api.get(`/clients/${id}/contracts`).then(r => r.data),
  payments:  (id, params = {}) => api.get(`/clients/${id}/payments`, { params }).then(r => r.data),
  statement: (id)           => api.get(`/clients/${id}/statement`).then(r => r.data),
  statementPdf: (id)        => api.get(`/clients/${id}/statement/pdf`, { responseType: "blob", timeout: TIMEOUT_ARCHIVO }).then(r => r.data),
  sendStatement: (id, body = {}) => api.post(`/clients/${id}/statement/send-email`, body).then(r => r.data),
  getApps:   (id)           => api.get(`/clients/${id}/apps`).then(r => r.data),
  assignApp: (id, appKey)   => api.post(`/clients/${id}/apps/${appKey}`).then(r => r.data),
  removeApp: (id, appKey)   => api.delete(`/clients/${id}/apps/${appKey}`),
};
