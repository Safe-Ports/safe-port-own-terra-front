import api from "./api";

// Suscripción del calendario (feed .ics). El usuario pega esta URL una vez en
// Google/Apple/Outlook y sus eventos de OwnTerra aparecen solos (una vía).
export const calendarService = {
  getSubscription: () => api.get("/calendar/subscription").then((r) => r.data),
  rotate: () => api.post("/calendar/subscription/rotate").then((r) => r.data),

  // Integración OAuth con Google (para crear eventos con videollamada de Meet).
  googleStatus: () => api.get("/calendar/google/status").then((r) => r.data),
  googleConnect: () => api.post("/calendar/google/connect").then((r) => r.data),
  googleDisconnect: () => api.post("/calendar/google/disconnect").then((r) => r.data),
};
