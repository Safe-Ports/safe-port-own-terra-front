import api from "./api";

export const activityService = {
  recent: () =>
    api.get("/activity/recent").then((r) => r.data),

  list: (params = {}) =>
    api.get("/activity", { params }).then((r) => r.data),
};
