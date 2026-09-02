import api from "./api";

export const inmuebleService = {
  list: (params = {}) => api.get("/inmuebles", { params }).then((r) => r.data),
  get: (id) => api.get(`/inmuebles/${id}`).then((r) => r.data),
  create: (body) => api.post("/inmuebles", body).then((r) => r.data),
  update: (id, body) => api.patch(`/inmuebles/${id}`, body).then((r) => r.data),
  // force: archivar aunque haya ventas con cobranza abierta. Sin él la API
  // responde 409 con la lista de esos contratos, para poder confirmarlo a la vista.
  delete: (id, { force = false } = {}) =>
    api.delete(`/inmuebles/${id}`, { params: force ? { force: true } : {} }),
  uploadMap: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/inmuebles/${id}/upload-map`, form).then((r) => r.data);
  },
};
