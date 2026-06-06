import api from "./api";

export const CAT_LABEL = {
  nomina:        "Nómina",
  servicios:     "Servicios",
  impuestos:     "Impuestos",
  proveedores:   "Proveedores",
  mantenimiento: "Mantenimiento",
  otro:          "Otro",
};

export const CAT_STYLE = {
  nomina:        { bg: "#e8f7ee", color: "#116b39" },
  servicios:     { bg: "#D5ECC0", color: "#2A5020" },
  impuestos:     { bg: "#fdecea", color: "#c0392b" },
  proveedores:   { bg: "#f0ede5", color: "#5c4a32" },
  mantenimiento: { bg: "#fef3e2", color: "#9d6b18" },
  otro:          { bg: "#ede8e0", color: "#6f5c4e" },
};

export const expenseService = {
  list:   (params = {}) => api.get("/expenses", { params }).then(r => r.data),
  create: (body)        => api.post("/expenses", body).then(r => r.data),
  update: (id, body)    => api.patch(`/expenses/${id}`, body).then(r => r.data),
  delete: (id)          => api.delete(`/expenses/${id}`),
  markPaid: (id) => api.patch(`/expenses/${id}`, {
    status: "paid",
    paid_date: new Date().toISOString().split("T")[0],
  }).then(r => r.data),
};
