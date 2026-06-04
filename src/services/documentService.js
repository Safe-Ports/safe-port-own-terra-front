import api, { BASE_URL } from "./api";

const MIME_EXTENSIONS = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function blobFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download failed");
  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type") || "",
  };
}

export const documentService = {
  list: (params = {}) => api.get("/documents", { params }).then((r) => r.data),
  get: (id) => api.get(`/documents/${id}`).then((r) => r.data),
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
  downloadUrl: (id) => `${BASE_URL}/documents/${id}/download`,
  fetchBlob: async (id, { directUrl, inline = false } = {}) => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        params: { inline },
        responseType: "blob",
      });
      return {
        blob: response.data,
        contentType: response.headers?.["content-type"] || response.data?.type || "",
      };
    } catch (error) {
      if (!directUrl) throw error;
      return blobFromUrl(directUrl);
    }
  },
};

export function filenameForDocument(document) {
  const name = document?.name || "documento";
  if (/\.[a-z0-9]{2,8}$/i.test(name)) return name;
  const ext = MIME_EXTENSIONS[document?.mime_type];
  return ext ? `${name}.${ext}` : name;
}

// entity_type values the backend accepts:
// contract | client | inventory_unit | inmueble
export function toBackendEntityType(frontendType) {
  if (frontendType === "lot") return "inventory_unit";
  return frontendType;
}
