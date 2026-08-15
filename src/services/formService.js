import api from "./api";

const formService = {
  list: () => api.get("/forms/templates").then((r) => r.data),
  get: (id) => api.get(`/forms/templates/${id}`).then((r) => r.data),
  create: (data) => api.post("/forms/templates", data).then((r) => r.data),
  update: (id, data) => api.put(`/forms/templates/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/forms/templates/${id}`),
  togglePublish: (id) => api.patch(`/forms/templates/${id}/publish`).then((r) => r.data),
  getSubmissions: (id, params = {}) =>
    api.get(`/forms/templates/${id}/submissions`, { params }).then((r) => r.data),
  removeSubmission: (subId) => api.delete(`/forms/submissions/${subId}`),

  publicGet: (slug) => api.get(`/public/forms/${slug}`).then((r) => r.data),
  publicSubmit: (slug, data) => api.post(`/public/forms/${slug}/submit`, data).then((r) => r.data),
};

export { formService };
