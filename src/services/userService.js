import api from "./api";

export const userService = {
  list: (params = {}) => api.get("/users", { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (body) => api.post("/users", body).then((r) => r.data),
  update: (id, body) => api.patch(`/users/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`).then((r) => r.data),
  uploadAvatar: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/users/${id}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  getApps: (id) => api.get(`/users/${id}/apps`).then((r) => r.data),
  upsertApp: (id, appKey, body) => api.put(`/users/${id}/apps/${appKey}`, { ...body, app_key: appKey }).then((r) => r.data),
  removeApp: (id, appKey) => api.delete(`/users/${id}/apps/${appKey}`),
};
