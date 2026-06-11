import api from "./api";

export const calculatorService = {
  list: (params = {}) => api.get("/calculators", { params }).then((r) => r.data),
  getActive: (appKey = "lands") => api.get("/calculators/active", { params: { app_key: appKey } }).then((r) => r.data),
  testFormula: (formula, variables) => api.post("/calculators/test", { formula, variables }).then((r) => r.data),
};
