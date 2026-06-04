import api from "./api";

export const reportService = {
  sales: (params = {}) =>
    api.get("/reports/sales", { params }).then((r) => r.data),

  collection: (params = {}) =>
    api.get("/reports/collection", { params }).then((r) => r.data),

  inventory: () =>
    api.get("/reports/inventory").then((r) => r.data),

  downloadSales: (params = {}) =>
    api.get("/reports/sales", { params, responseType: "blob" }).then((r) => r.data),
};
