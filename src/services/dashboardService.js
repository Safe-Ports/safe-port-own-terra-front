import api from "./api";

export const dashboardService = {
  stats:           (period = "month") => api.get("/dashboard/stats",           { params: { period } }).then(r => r.data),
  midia:           ()                 => api.get("/dashboard/midia").then(r => r.data),
  // Cifras del panel general, agregadas en la base (no sobre listas paginadas).
  kpis:            (months = 6)        => api.get("/dashboard/kpis", { params: { months } }).then(r => r.data),
  teamPerformance: (period = "month") => api.get("/dashboard/team-performance", { params: { period } }).then(r => r.data),
};
