import api from "./api";

export const appointmentService = {
  list: (params = {}) => api.get("/appointments", { params }).then((r) => r.data),
  create: (body) => api.post("/appointments", body).then((r) => r.data),
  update: (id, body) => api.patch(`/appointments/${id}`, body).then((r) => r.data),
  cancel: (id) => api.delete(`/appointments/${id}`),
};
