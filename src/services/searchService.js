import api from "./api";

export const searchService = {
  search: (q, { limit = 5, types } = {}) => {
    const params = { q, limit };
    if (types) params.types = types;
    return api.get("/search", { params }).then((r) => r.data);
  },
};
