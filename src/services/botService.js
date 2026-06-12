import axios from "axios";

export const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "http://127.0.0.1:8001";

const botApi = axios.create({
  baseURL: BOT_API_URL,
  timeout: 20000,
});

export function sendMessageToBot(message) {
  return botApi.post("/chat", { message }).then((r) => r.data);
}

export function createSupportTicket(ticketData) {
  return botApi.post("/support/tickets", ticketData).then((r) => r.data);
}

export function getSupportTicketMessages(ticketId) {
  return botApi.get(`/support/tickets/${ticketId}/messages`).then((r) => r.data);
}

export function sendSupportTicketMessage(ticketId, messageData) {
  return botApi.post(`/support/tickets/${ticketId}/messages`, messageData).then((r) => r.data);
}

export function markSupportTicketMessagesRead(ticketId) {
  return botApi
    .patch(`/support/tickets/${ticketId}/messages/read`, { reader_type: "client" })
    .then((r) => r.data);
}

export const botService = {
  health: () => botApi.get("/health").then((r) => r.data),
  chat: sendMessageToBot,
  createTicket: createSupportTicket,
  getTicketMessages: getSupportTicketMessages,
  sendTicketMessage: sendSupportTicketMessage,
  markTicketMessagesRead: markSupportTicketMessagesRead,
  sendMessageToBot,
  createSupportTicket,
  getSupportTicketMessages,
  sendSupportTicketMessage,
  markSupportTicketMessagesRead,
};

export default botService;
