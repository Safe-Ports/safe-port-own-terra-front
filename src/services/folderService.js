import api from "./api";

export const folderService = {
  list: () => api.get("/document-folders").then((r) => r.data),
  create: (body) => api.post("/document-folders", body).then((r) => r.data),
  update: (id, body) => api.patch(`/document-folders/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/document-folders/${id}`),
};
