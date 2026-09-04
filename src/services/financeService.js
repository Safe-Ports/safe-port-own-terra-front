import api, { TIMEOUT_ARCHIVO } from "./api";

export const financeService = {
  summary: (period = "month") => api.get("/finance/summary", { params: { period } }).then((r) => r.data),
  transactions: ({ period = "month", page = 1, limit = 50 } = {}) =>
    api.get("/finance/transactions", { params: { period, page, limit } }).then((r) => r.data),
  // responseType "blob": el archivo viaja binario, no como JSON.
  exportTransactions: ({ period = "month", format = "csv" } = {}) =>
    api.get("/finance/transactions/export", { params: { period, format }, responseType: "blob", timeout: TIMEOUT_ARCHIVO }).then((r) => r.data),
  updateCashPosition: (body) => api.put("/finance/cash-position", body).then((r) => r.data),
  budgets: (periodMonth) => api.get("/finance/budgets", { params: { period_month: periodMonth } }).then((r) => r.data),
  upsertBudget: (body) => api.put("/finance/budgets", body).then((r) => r.data),
};
