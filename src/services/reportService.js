import api, { TIMEOUT_ARCHIVO } from "./api";

export const reportService = {
  sales: (params = {}) =>
    api.get("/reports/sales", { params }).then((r) => r.data),

  collection: (params = {}) =>
    api.get("/reports/collection", { params }).then((r) => r.data),

  inventory: () =>
    api.get("/reports/inventory").then((r) => r.data),

  downloadSales: (params = {}) =>
    api.get("/reports/sales", { params, responseType: "blob", timeout: TIMEOUT_ARCHIVO }).then((r) => r.data),
};
