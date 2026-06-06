import api from "./api";

export const orgService = {
  get: () =>
    api.get("/organization").then((r) => r.data),

  update: (data) =>
    api.patch("/organization", data).then((r) => r.data),

  listUsers: (params = {}) =>
    api.get("/users", { params }).then((r) => r.data),

  createUser: (data) =>
    api.post("/users", data).then((r) => r.data),

  updateUser: (id, data) =>
    api.patch(`/users/${id}`, data).then((r) => r.data),

  resetPassword: (id) =>
    api.post(`/users/${id}/reset-password`).then((r) => r.data),

  deleteUser: (id) =>
    api.delete(`/users/${id}`),
};
