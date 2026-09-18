import api from "./api";

export const jobTitleService = {
  list: () => api.get("/employees/job-titles").then((r) => r.data),
  create: (name) => api.post("/employees/job-titles", { name }).then((r) => r.data),
};
