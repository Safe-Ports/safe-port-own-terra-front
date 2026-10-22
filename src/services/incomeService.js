import api from "./api";

export const INCOME_CAT = {
  venta:     "Venta",
  renta:     "Renta",
  servicio:  "Servicio",
  comision:  "Comisión",
  otro:      "Otro",
};

export const incomeService = {
  list:        (params = {}) => api.get("/incomes", { params }).then(r => r.data),
  // La cobranza de lotes no se copia acá: se lee de la caja de cobros y se
  // presenta junto a los ingresos manuales.
  collections: (months = 3)  => api.get("/incomes/collections", { params: { months } }).then(r => r.data),
  summary:     ()            => api.get("/incomes/summary").then(r => r.data),
  create:      (body)        => api.post("/incomes", body).then(r => r.data),
  update:      (id, body)    => api.patch(`/incomes/${id}`, body).then(r => r.data),
  remove:      (id)          => api.delete(`/incomes/${id}`),
  receipt:     (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/incomes/${id}/receipt`, fd).then(r => r.data);
  },
};
