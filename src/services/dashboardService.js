import api from "./api";

export const dashboardService = {
  stats:           (period = "month") => api.get("/dashboard/stats",           { params: { period } }).then(r => r.data),
  midia:           ()                 => api.get("/dashboard/midia").then(r => r.data),
  teamPerformance: (period = "month") => api.get("/dashboard/team-performance", { params: { period } }).then(r => r.data),
};
