import api from "./api";

export const calculatorService = {
  list:     (params = {})  => api.get("/calculators", { params }).then(r => r.data),
  getActive:(app_key = "lands") => api.get("/calculators/active", { params: { app_key } }).then(r => r.data),
  create:   (body)         => api.post("/calculators", body).then(r => r.data),
  update:   (id, body)     => api.patch(`/calculators/${id}`, body).then(r => r.data),
  activate: (id)           => api.post(`/calculators/${id}/activate`).then(r => r.data),
  delete:   (id)           => api.delete(`/calculators/${id}`),
  analyze:  (formula)      => api.post("/calculators/analyze", { formula }).then(r => r.data),
  test:     (formula, variables) => api.post("/calculators/test", { formula, variables }).then(r => r.data),
};
