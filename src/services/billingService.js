import api from "./api";

export const billingService = {
  getPlans: () =>
    api.get("/billing/plans").then((r) => r.data),

  getSubscription: () =>
    api.get("/billing/subscription").then((r) => r.data),

  // Inicia Stripe Checkout y devuelve la URL a la que redirigir al usuario.
  startCheckout: (priceId) =>
    api.post("/billing/checkout", { price_id: priceId }).then((r) => r.data.url),

  // Abre el Billing Portal de Stripe (gestionar/cancelar) y devuelve la URL.
  openPortal: () =>
    api.post("/billing/portal").then((r) => r.data.url),
};
