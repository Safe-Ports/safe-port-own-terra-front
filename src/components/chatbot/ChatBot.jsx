import { useEffect, useRef, useState } from "react";
import {
  HiChatBubbleLeftRight,
  HiChevronDown,
  HiPaperAirplane,
  HiTicket,
  HiXMark,
} from "react-icons/hi2";
import {
  createSupportTicket,
  sendMessageToBot,
} from "@/services/botService";
import "./ChatBot.css";

const initialMessages = [
  {
    id: "bot-welcome",
    role: "bot",
    text: "Hola, soy el asistente de Own Terra. Puedo ayudarte con lotes, disponibilidad y soporte.",
  },
];

function makeId(prefix = "msg") {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function BotLotCards({ lots = [] }) {
  if (!lots.length) return null;

  return (
    <div className="ot-bot-lots">
      {lots.map((lot) => (
        <article className="ot-bot-lot" key={lot.id || lot.name}>
          <div className="ot-bot-lot-top">
            <strong>{lot.name || "Lote"}</strong>
            <span>{lot.status_label || lot.status || "Disponible"}</span>
          </div>
          <div className="ot-bot-lot-meta">
            <span>{lot.area_m2 || 0} m2</span>
            <span>{formatMoney(lot.price_mxn)}</span>
          </div>
          {lot.location ? <p>{lot.location}</p> : null}
        </article>
      ))}
    </div>
  );
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

function TicketForm({ support, lastUserMessage, onCancel, onCreated, onError }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: lastUserMessage || "",
    device: "",
    screenshot: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.description.trim().length >= 10 &&
    form.device.trim();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        description: form.description.trim(),
        device: form.device.trim(),
        screenshot: form.screenshot.trim(),
        intent: support?.intent || "general_support",
        severity: support?.severity || "low",
      });
      onCreated(ticket);
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
        placeholder="Correo"
        type="email"
      />
      <textarea
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        placeholder="Descripción del problema"
      />
      <input
        value={form.device}
        onChange={(event) => setForm((prev) => ({ ...prev, device: event.target.value }))}
        placeholder="Dispositivo"
      />
      <input
        value={form.screenshot}
        onChange={(event) => setForm((prev) => ({ ...prev, screenshot: event.target.value }))}
        placeholder="Captura opcional o URL"
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

  return (
    <div className={`ot-chat-row ${isUser ? "is-user" : "is-bot"}`}>
      <div className="ot-chat-bubble">
        <p>{message.text}</p>
        {!isUser ? <BotLotCards lots={message.payload?.lots} /> : null}
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
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketContext, setTicketContext] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isOpen, messages, isLoading, ticketContext]);

  async function handleSend(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError("");
    setTicketContext(null);
    setLastUserMessage(text);
    setMessages((prev) => [...prev, { id: makeId("user"), role: "user", text }]);
    setIsLoading(true);

    try {
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
    } catch {
      setError("No se pudo conectar con el asistente. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleTicketCreated(ticket) {
    setTicketContext(null);
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("ticket"),
        role: "bot",
        text: `Ticket creado correctamente\nID: ${ticket.id}\nEstado: ${ticket.status}`,
      },
    ]);
  }

  return (
    <div className={`ot-chatbot ${isOpen ? "is-open" : ""}`}>
      {isOpen ? (
        <section className="ot-chat-window" aria-label="Asistente Own Terra">
          <header className="ot-chat-header">
            <div>
              <span>Asistente Own Terra</span>
              <small>Soporte y consulta de lotes</small>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar asistente">
              <HiXMark />
            </button>
          </header>

          <div className="ot-chat-messages">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onGenerateTicket={(payload) => setTicketContext(payload)}
              />
            ))}
            {isLoading ? (
              <div className="ot-chat-row is-bot">
                <div className="ot-chat-bubble ot-chat-loading">Consultando...</div>
              </div>
            ) : null}
            {error ? <div className="ot-chat-error">{error}</div> : null}
            {ticketContext ? (
              <TicketForm
                support={ticketContext.support}
                lastUserMessage={lastUserMessage}
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
              placeholder="Escribe tu mensaje"
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
