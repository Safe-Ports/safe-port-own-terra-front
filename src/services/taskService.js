import api from "./api";

export const taskService = {
  list: () => api.get("/tasks").then((r) => r.data),
  create: (body) => api.post("/tasks", body).then((r) => r.data),
  update: (id, body) => api.patch(`/tasks/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`),
};
