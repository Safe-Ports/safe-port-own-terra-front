import api from "./api";

const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export const documentService = {
  list: (params = {}) => api.get("/documents", { params }).then((r) => r.data),
  forEntity: (entityType, entityId) =>
    api.get("/documents/for-entity", { params: { entity_type: entityType, entity_id: entityId } }).then((r) => r.data),
  upload: (file, { name, category = "otro", entityType, entityId, folderId, notes } = {}) => {
    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams({ name: name || file.name, category });
    if (entityType) params.set("entity_type", entityType);
    if (entityId) params.set("entity_id", entityId);
    if (folderId) params.set("folder_id", folderId);
    if (notes) params.set("notes", notes);
    return api.post(`/documents/upload?${params}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  update: (id, body) => api.patch(`/documents/${id}`, body).then((r) => r.data),
  move: (id, folderId) => api.patch(`/documents/${id}`, { folder_id: folderId ?? null }).then((r) => r.data),
  delete: (id) => api.delete(`/documents/${id}`),
  downloadUrl: (id) => `${BASE}/documents/${id}/download`,
};

// entity_type values the backend accepts:
// contract | client | inventory_unit | inmueble
export function toBackendEntityType(frontendType) {
  if (frontendType === "lot") return "inventory_unit";
  return frontendType;
}
