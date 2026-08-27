import api from "./api";

export const lotService = {
  list: (params = {}) => api.get("/lots", { params }).then((r) => r.data),
  get: (id) => api.get(`/lots/${id}`).then((r) => r.data),
  create: (body) => api.post("/lots", body).then((r) => r.data),
  bulkCreate: (body) => api.post("/lots/bulk", body, { timeout: 120000 }).then((r) => r.data),
  importTemplate: (format = "xlsx") =>
    api.get("/lots/import-template", { params: { format }, responseType: "blob" }).then((r) => r.data),
  importCsv: (file, { fraccionamiento_id, mode = "tolerant", dry_run = false } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (fraccionamiento_id) form.append("fraccionamiento_id", fraccionamiento_id);
    form.append("mode", mode);
    if (dry_run) form.append("dry_run", "true");
    return api.post("/lots/import-csv", form, { timeout: 120000 }).then((r) => r.data);
  },
  update: (id, body) => api.patch(`/lots/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/lots/${id}`),
  // Track de lotes: filas del dashboard (quién apartó, para quién, quién cerró)
  // más el conteo por estado que alimenta el gráfico de barras.
  track: (params = {}) => api.get("/lots/track", { params }).then((r) => r.data),
  timeline: (id) => api.get(`/lots/${id}/timeline`).then((r) => r.data),
  // Descarga con las columnas de la plantilla, así que el archivo se puede
  // volver a subir por el importador.
  matrixExport: (params = {}) =>
    api.get("/lots/matrix-export", { params, responseType: "blob" }).then((r) => r.data),
};
