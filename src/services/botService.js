import axios from "axios";

export const BOT_BASE_URL = import.meta.env.VITE_BOT_API_URL || "http://127.0.0.1:8001";

const botApi = axios.create({
  baseURL: BOT_BASE_URL,
  timeout: 20000,
});

export const botService = {
  health: () => botApi.get("/health").then((r) => r.data),
  chat: (message) => botApi.post("/chat", { message }).then((r) => r.data),
  createTicket: (body) => botApi.post("/support/tickets", body).then((r) => r.data),
  listTickets: () => botApi.get("/support/tickets").then((r) => r.data),
};

export default botService;
