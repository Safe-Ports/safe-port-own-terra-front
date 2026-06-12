import { useEffect, useRef, useState } from "react";
import {
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiChevronDown,
  HiPaperAirplane,
  HiTicket,
  HiXMark,
} from "react-icons/hi2";
import {
  createSupportTicket,
  getSupportTicketMessages,
  markSupportTicketMessagesRead,
  sendSupportTicketMessage,
  sendMessageToBot,
} from "@/services/botService";
import { useAppContext } from "@/context/AppContext";
import "./ChatBot.css";

const DEFAULT_DEVICE = "No especificado";
const ACTIVE_TICKET_STORAGE_KEY = "ownterra_active_support_ticket";
const SUPPORT_POLL_INTERVAL = 10_000;
const TICKET_STATUS_LABELS = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
  closed: "Cerrado",
};
const TERMINAL_TICKET_STATUS = new Set(["resolved", "closed"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TICKET_CLOSURE_MESSAGES = {
  resolved: "Tu ticket fue marcado como resuelto.\n\nSi el problema continúa, puedes iniciar una nueva consulta con el asistente.",
  closed: "Este ticket fue cerrado por el equipo de soporte.\n\nEl asistente virtual vuelve a estar disponible si necesitas crear una nueva consulta.",
  timeout: "El tiempo de atención en este chat ha finalizado.\n\nEl seguimiento continuará por correo electrónico. Te recomendamos revisar tu bandeja de entrada y correo no deseado.\n\nPuedes iniciar una nueva consulta con el asistente si necesitas más ayuda.",
  unavailable: "El caso de soporte activo ya no está disponible.\n\nEl asistente virtual vuelve a estar disponible si necesitas crear una nueva consulta.",
};

const initialMessages = [
  {
    id: "bot-welcome",
    role: "bot",
    text: "Hola, soy el asistente de soporte de Own Terra. Cuéntame qué problema tienes con la app y te ayudaré a resolverlo o generar un ticket.",
  },
];

function makeId(prefix = "msg") {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTicketFolio(ticketId) {
  const id = String(ticketId || "");
  return id.length > 8 ? `${id.slice(0, 8)}…` : id || "Pendiente";
}

function getTicketStatusLabel(status) {
  return TICKET_STATUS_LABELS[String(status || "").toLowerCase()] || "Registrado";
}

function getStoredActiveTicketId() {
  try {
    return window.localStorage.getItem(ACTIVE_TICKET_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeActiveTicketId(ticketId) {
  try {
    window.localStorage.setItem(ACTIVE_TICKET_STORAGE_KEY, ticketId);
  } catch {
    // El ticket sigue activo durante la sesión aunque el navegador bloquee storage.
  }
}

function clearStoredActiveTicketId() {
  try {
    window.localStorage.removeItem(ACTIVE_TICKET_STORAGE_KEY);
  } catch {
    // El estado en memoria se limpia aunque el navegador bloquee storage.
  }
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

function normalizeTicketPayload(payload) {
  if (Array.isArray(payload)) {
    return { messages: payload, meta: {} };
  }

  const meta = payload || {};
  const messages = meta.messages || meta.data?.messages || meta.results || [];
  return {
    messages: Array.isArray(messages) ? messages : [],
    meta,
  };
}

function getTicketMetaValue(meta, key) {
  return meta?.[key] ?? meta?.ticket?.[key] ?? meta?.support_ticket?.[key] ?? meta?.data?.[key] ?? meta?.data?.ticket?.[key];
}

function getMessageText(message) {
  return String(message?.message || message?.text || message?.content || "").toLowerCase();
}

function isFalseLike(value) {
  return value === false || String(value).toLowerCase() === "false";
}

function getTicketClosureReason(meta, messages = []) {
  const status = String(
    getTicketMetaValue(meta, "status") ||
    getTicketMetaValue(meta, "ticket_status") ||
    ""
  ).toLowerCase();
  const liveChatActive = getTicketMetaValue(meta, "live_chat_active");
  const closedReason = String(
    getTicketMetaValue(meta, "live_chat_closed_reason") ||
    getTicketMetaValue(meta, "closed_reason") ||
    ""
  ).toLowerCase();
  const hasTimeoutMessage = messages.some((message) => (
    String(message?.sender_type || "").toLowerCase() === "system" &&
    getMessageText(message).includes("timeout")
  ));

  if (closedReason === "timeout" || hasTimeoutMessage) return "timeout";
  if (TERMINAL_TICKET_STATUS.has(status)) return status;
  if (isFalseLike(liveChatActive)) return closedReason === "timeout" ? "timeout" : (TERMINAL_TICKET_STATUS.has(status) ? status : "closed");

  return "";
}

function toChatMessage(ticketMessage) {
  const roleBySender = {
    client: "user",
    agent: "agent",
    system: "system",
  };
  const messageKey = ticketMessage.id || `${ticketMessage.created_at || ""}-${ticketMessage.sender_type || "system"}-${ticketMessage.message || ""}`;

  return {
    id: `support-${messageKey}`,
    role: roleBySender[ticketMessage.sender_type] || "system",
    text: ticketMessage.message,
    payload: { ticketMessage },
  };
}

function mergeTicketMessages(currentMessages, ticketMessages) {
  const knownIds = new Set(currentMessages.map((message) => message.id));
  const newMessages = ticketMessages
    .map(toChatMessage)
    .filter((message) => !knownIds.has(message.id));

  if (!newMessages.length) return currentMessages;

  const regularMessages = currentMessages.filter((message) => !message.payload?.ticketMessage);
  const supportMessages = [
    ...currentMessages.filter((message) => message.payload?.ticketMessage),
    ...newMessages,
  ].sort((a, b) => (
    String(a.payload.ticketMessage.created_at).localeCompare(String(b.payload.ticketMessage.created_at))
  ));

  return [...regularMessages, ...supportMessages];
}

function makeSystemMessage(text, prefix = "system") {
  return {
    id: makeId(prefix),
    role: "system",
    text,
  };
}

function BotSupportBlock({ support }) {
  if (!support) return null;

  return (
    <div className="ot-bot-support">
      <div className="ot-bot-support-head">
        <strong>{support.title}</strong>
        <span>{support.severity}</span>
      </div>
      {support.steps?.length ? (
        <ol>
          {support.steps.map((step, index) => (
            <li key={`${step}-${index}`}>{step}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function TicketForm({ support, lastUserMessage, authenticatedEmail, onCancel, onCreated, onError }) {
  const [form, setForm] = useState({
    name: "",
    email: authenticatedEmail || "",
    alternateEmail: "",
    description: lastUserMessage || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const alternateEmail = form.alternateEmail.trim();

  const canSubmit =
    form.name.trim() &&
    isValidEmail(form.email) &&
    (!alternateEmail || isValidEmail(alternateEmail)) &&
    form.description.trim().length >= 10;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        alternate_email: alternateEmail,
        description: form.description.trim(),
        device: DEFAULT_DEVICE,
        screenshot: "",
        intent: support?.intent || "general_support",
        severity: support?.severity || "low",
      });
      onCreated(ticket, Boolean(alternateEmail));
    } catch {
      onError("No se pudo crear el ticket. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ot-ticket-form" onSubmit={handleSubmit}>
      <div className="ot-ticket-title">
        <HiTicket />
        <span>Generar ticket</span>
      </div>
      <input
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        placeholder="Nombre"
      />
      <input
        value={form.email}
        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        placeholder="Correo electrónico"
        readOnly={Boolean(authenticatedEmail)}
        type="email"
      />
      <div className="ot-ticket-secondary-field">
        <input
          value={form.alternateEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, alternateEmail: event.target.value }))}
          placeholder="Correo alternativo de contacto"
          type="email"
        />
        <small>Úsalo solo si no tienes acceso al correo de tu cuenta.</small>
      </div>
      <textarea
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        placeholder="Descripción del problema"
      />
      <div className="ot-ticket-actions">
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear ticket"}
        </button>
      </div>
    </form>
  );
}

function ChatMessage({ message, onGenerateTicket }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";
  const isSystem = message.role === "system";
  const ticketConfirmation = message.payload?.ticketConfirmation;
  const senderName = message.payload?.ticketMessage?.sender_name;
  const usesAlternateEmail = message.payload?.usesAlternateEmail;

  return (
    <div className={`ot-chat-row ${isUser ? "is-user" : isAgent ? "is-agent" : isSystem ? "is-system" : "is-bot"}`}>
      <div className={`ot-chat-bubble ${ticketConfirmation ? "ot-ticket-success" : ""}`}>
        {isAgent && senderName ? <small className="ot-chat-sender">{senderName}</small> : null}
        {ticketConfirmation ? (
          <>
            <div className="ot-ticket-success-title">
              <HiCheckCircle />
              <strong>Solicitud enviada</strong>
            </div>
            <p>Tu reporte fue registrado correctamente. Un agente de soporte dará seguimiento a tu caso.</p>
            <div className="ot-ticket-success-meta">
              <span>Folio: <strong>{ticketConfirmation.folio}</strong></span>
              <span>Estado: <strong>{ticketConfirmation.status}</strong></span>
            </div>
            <div className="ot-ticket-success-note">
              Si no estás en línea cuando el agente responda, también podremos contactarte por correo.
              {usesAlternateEmail ? (
                <>
                  <br />
                  También usaremos tu correo alternativo si no tienes acceso al principal.
                </>
              ) : null}
            </div>
          </>
        ) : <p>{message.text}</p>}
        {!isUser ? <BotSupportBlock support={message.payload?.support} /> : null}
        {!isUser && message.payload?.ticket?.suggested ? (
          <button className="ot-ticket-trigger" type="button" onClick={() => onGenerateTicket(message.payload)}>
            <HiTicket />
            Generar ticket
          </button>
        ) : null}
        {!isUser && message.payload?.disclaimer ? (
          <div className="ot-bot-disclaimer">{message.payload.disclaimer}</div>
        ) : null}
      </div>
    </div>
  );
}

function ChatBot() {
  const { currentUser } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketContext, setTicketContext] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(getStoredActiveTicketId);
  const messagesEndRef = useRef(null);
  const pollInFlightRef = useRef(false);

  function closeActiveSupportTicket(reason = "closed") {
    clearStoredActiveTicketId();
    setActiveTicketId("");
    setTicketContext(null);
    setMessages((prev) => [
      ...prev,
      makeSystemMessage(TICKET_CLOSURE_MESSAGES[reason] || TICKET_CLOSURE_MESSAGES.closed, `ticket-${reason}`),
    ]);
  }

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isOpen, messages, isLoading, ticketContext]);

  useEffect(() => {
    if (!activeTicketId) return undefined;

    let isActive = true;

    async function pollTicketMessages() {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      try {
        const ticketPayload = await getSupportTicketMessages(activeTicketId);
        if (!isActive) return;

        const { messages: ticketMessages, meta } = normalizeTicketPayload(ticketPayload);
        setMessages((prev) => mergeTicketMessages(prev, ticketMessages));

        const closureReason = getTicketClosureReason(meta, ticketMessages);
        if (closureReason) {
          closeActiveSupportTicket(closureReason);
          return;
        }

        if (ticketMessages.some((message) => message.sender_type === "agent" && !message.read_by_client)) {
          await markSupportTicketMessagesRead(activeTicketId);
        }
      } catch (pollError) {
        if (!isActive) return;

        const closureReason = getTicketClosureReason(pollError.response?.data, []);
        if (closureReason) {
          closeActiveSupportTicket(closureReason);
        } else if (pollError.response?.status === 404) {
          closeActiveSupportTicket("unavailable");
        }
      } finally {
        pollInFlightRef.current = false;
      }
    }

    pollTicketMessages();
    const pollTimer = window.setInterval(pollTicketMessages, SUPPORT_POLL_INTERVAL);

    return () => {
      isActive = false;
      window.clearInterval(pollTimer);
    };
  }, [activeTicketId]);

  async function handleSend(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError("");
    setTicketContext(null);
    setIsLoading(true);

    try {
      if (activeTicketId) {
        const data = await sendSupportTicketMessage(activeTicketId, {
          sender_type: "client",
          sender_name: currentUser?.name || "Cliente Own Terra",
          sender_email: currentUser?.email || "sin-correo@ownterra.local",
          message: text,
        });
        const { messages: sentMessages, meta } = normalizeTicketPayload(data);
        const nextMessages = sentMessages.length ? sentMessages : [data.message].filter(Boolean);
        setMessages((prev) => mergeTicketMessages(prev, nextMessages));

        const closureReason = getTicketClosureReason(meta, nextMessages);
        if (closureReason) closeActiveSupportTicket(closureReason);
        return;
      }

      setLastUserMessage(text);
      setMessages((prev) => [...prev, { id: makeId("user"), role: "user", text }]);
      const data = await sendMessageToBot(text);
      setMessages((prev) => [
        ...prev,
        {
          id: makeId("bot"),
          role: "bot",
          text: data.response || "Listo, ya revisé tu consulta.",
          payload: data,
        },
      ]);
    } catch (sendError) {
      const closureReason = getTicketClosureReason(sendError.response?.data, []);
      if (activeTicketId && closureReason) {
        closeActiveSupportTicket(closureReason);
      } else {
        setError(activeTicketId
          ? "No se pudo enviar el mensaje a soporte. Intenta nuevamente."
          : "No se pudo conectar con el asistente. Intenta nuevamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleTicketCreated(ticket, usesAlternateEmail = false) {
    setTicketContext(null);
    const closureReason = getTicketClosureReason(ticket, []);
    if (ticket.id && !closureReason) {
      setActiveTicketId(ticket.id);
      storeActiveTicketId(ticket.id);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("ticket"),
        role: "bot",
        payload: {
          ticketConfirmation: {
            folio: getTicketFolio(ticket.id),
            status: getTicketStatusLabel(ticket.status),
          },
          usesAlternateEmail,
        },
      },
      ...(closureReason ? [makeSystemMessage(TICKET_CLOSURE_MESSAGES[closureReason], `ticket-${closureReason}`)] : []),
    ]);
  }

  return (
    <div className={`ot-chatbot ${isOpen ? "is-open" : ""}`}>
      {isOpen ? (
        <section className="ot-chat-window" aria-label="Asistente Own Terra">
          <header className="ot-chat-header">
            <div>
              <span>Asistente Own Terra</span>
              <small>{activeTicketId ? "Caso de soporte activo" : "Soporte técnico de la plataforma"}</small>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar asistente">
              <HiXMark />
            </button>
          </header>

          <div className="ot-chat-messages">
            {activeTicketId ? (
              <div className="ot-active-ticket-notice">
                <strong>Caso de soporte activo · {getTicketFolio(activeTicketId)}</strong>
                <span>Un agente podrá responderte por este chat o por correo.</span>
              </div>
            ) : null}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onGenerateTicket={(payload) => setTicketContext(payload)}
              />
            ))}
            {isLoading ? (
              <div className="ot-chat-row is-bot">
                <div className="ot-chat-bubble ot-chat-loading">
                  {activeTicketId ? "Enviando..." : "Consultando..."}
                </div>
              </div>
            ) : null}
            {error ? <div className="ot-chat-error">{error}</div> : null}
            {ticketContext ? (
              <TicketForm
                support={ticketContext.support}
                lastUserMessage={lastUserMessage}
                authenticatedEmail={currentUser?.email}
                onCancel={() => setTicketContext(null)}
                onCreated={handleTicketCreated}
                onError={setError}
              />
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="ot-chat-input" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={activeTicketId ? "Escribe un mensaje para soporte" : "Describe el problema que tienes"}
              aria-label="Mensaje para el asistente"
            />
            <button type="submit" disabled={!input.trim() || isLoading} aria-label="Enviar mensaje">
              <HiPaperAirplane />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="ot-chat-fab"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Ocultar asistente" : "Abrir asistente"}
      >
        {isOpen ? <HiChevronDown /> : <HiChatBubbleLeftRight />}
        <span>Ayuda</span>
      </button>
    </div>
  );
}

export default ChatBot;
