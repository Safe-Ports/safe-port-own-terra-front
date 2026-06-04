import { useMemo, useState } from "react";
import { HiChatBubbleLeftRight, HiPaperAirplane, HiTicket, HiWrenchScrewdriver } from "react-icons/hi2";
import botService from "@/services/botService";
import { currency } from "@/services/formatters";

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hola, soy el asistente de OwnTerra. Puedo ayudarte con lotes, precios, disponibilidad o soporte tecnico de la app.",
  },
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-[0_14px_30px_rgba(24,18,14,.07)] ${
          isUser
            ? "bg-[#1E3D2B] text-white"
            : "border border-[#E7E4DB] bg-white/90 text-[#2D2F2A]"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.text}</div>
      </div>
    </div>
  );
}

function LotCard({ lot }) {
  return (
    <article className="rounded-[22px] border border-[#DCDAD2] bg-[#FBFAF6] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[#1E3D2B]">{lot.name}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#83867C]">{lot.id}</div>
        </div>
        <span className="rounded-full bg-[#EEF6F1] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#355E3B]">
          {lot.status_label || lot.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Area</div>
          <div className="mt-1 font-semibold text-[#1E3D2B]">{lot.area_m2} m2</div>
        </div>
        <div>
          <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Precio</div>
          <div className="mt-1 font-semibold text-[#1E3D2B]">{currency(lot.price_mxn)}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-[#43453F]">{lot.location}</div>
      {lot.description ? <div className="mt-2 text-sm text-[#6E7168]">{lot.description}</div> : null}
    </article>
  );
}

function TicketForm({ support, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
    device: "",
    screenshot: "",
  });

  const canSubmit = form.name && form.email && form.description.length >= 10 && form.device;

  return (
    <form
      className="rounded-[24px] border border-[#DCDAD2] bg-white/90 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          ...form,
          screenshot: form.screenshot || null,
          intent: support?.intent || "general_support",
          severity: support?.severity || "low",
        });
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <HiTicket className="text-lg text-[#1E3D2B]" />
        <div className="text-sm font-bold text-[#1E3D2B]">Crear ticket de soporte</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="mobile-input" placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        <input className="mobile-input" placeholder="Correo" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
        <input className="mobile-input" placeholder="Dispositivo" value={form.device} onChange={(event) => setForm((prev) => ({ ...prev, device: event.target.value }))} />
        <input className="mobile-input" placeholder="URL de captura opcional" value={form.screenshot} onChange={(event) => setForm((prev) => ({ ...prev, screenshot: event.target.value }))} />
      </div>
      <textarea
        className="mobile-input mt-3 min-h-[96px] resize-none"
        placeholder="Describe el problema"
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
      />
      <button className="mobile-primary-button mt-3 w-full" disabled={!canSubmit || isSubmitting}>
        <HiTicket className="text-lg" />
        {isSubmitting ? "Creando ticket..." : "Enviar ticket"}
      </button>
    </form>
  );
}

function AssistantPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [latestResponse, setLatestResponse] = useState(null);
  const [ticketCreated, setTicketCreated] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [error, setError] = useState("");

  const quickPrompts = useMemo(
    () => [
      "Hola, que puedes hacer?",
      "Hay lotes disponibles?",
      "No puedo iniciar sesion",
      "Tengo un error de pago",
    ],
    []
  );

  async function sendMessage(messageText = input) {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setInput("");
    setError("");
    setTicketCreated(null);
    setIsSending(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);

    try {
      const response = await botService.chat(trimmed);
      setLatestResponse(response);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: response.response }]);
    } catch {
      setError("No pude conectar con el bot. Revisa que este corriendo en el puerto 8001.");
    } finally {
      setIsSending(false);
    }
  }

  async function createTicket(body) {
    setIsCreatingTicket(true);
    setError("");

    try {
      const ticket = await botService.createTicket(body);
      setTicketCreated(ticket);
    } catch {
      setError("No se pudo crear el ticket. Intenta de nuevo en unos segundos.");
    } finally {
      setIsCreatingTicket(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[#DCDAD2] bg-[linear-gradient(150deg,#1E3D2B,#121A16)] p-5 text-[#FBFAF6] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#BFD8C8]">Asistente conectado</div>
            <div className="mt-2 font-['Playfair_Display'] text-[1.9rem] leading-none">OwnTerra Bot</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <HiChatBubbleLeftRight className="text-xl" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
        <div className="rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex h-[52vh] min-h-[420px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isSending ? <MessageBubble message={{ role: "assistant", text: "Consultando..." }} /> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-[#DCDAD2] bg-[#FBFAF6] px-3 py-2 text-xs font-semibold text-[#355E3B]"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <input
                className="mobile-input flex-1"
                placeholder="Escribe tu pregunta"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button className="mobile-primary-button aspect-square w-[48px] justify-center px-0" disabled={!input.trim() || isSending} aria-label="Enviar">
                <HiPaperAirplane className="text-lg" />
              </button>
            </form>
          </div>
        </div>

        <aside className="space-y-4">
          {error ? (
            <div className="rounded-[22px] border border-[#F0C9C2] bg-[#FDECEA] p-4 text-sm font-semibold text-[#8A2D24]">{error}</div>
          ) : null}

          {latestResponse?.lots?.length ? (
            <section className="space-y-3">
              {latestResponse.lots.map((lot) => (
                <LotCard key={lot.id} lot={lot} />
              ))}
            </section>
          ) : null}

          {latestResponse?.support ? (
            <section className="rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
              <div className="mb-3 flex items-center gap-2">
                <HiWrenchScrewdriver className="text-lg text-[#1E3D2B]" />
                <h2 className="text-sm font-bold text-[#1E3D2B]">{latestResponse.support.title}</h2>
              </div>
              <div className="space-y-2">
                {latestResponse.support.steps.map((step, index) => (
                  <div key={`${step}-${index}`} className="rounded-[18px] border border-[#E7E4DB] bg-[#FBFAF6] p-3 text-sm text-[#43453F]">
                    {index + 1}. {step}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {latestResponse?.ticket?.suggested ? (
            <TicketForm support={latestResponse.support} onSubmit={createTicket} isSubmitting={isCreatingTicket} />
          ) : null}

          {ticketCreated ? (
            <div className="rounded-[22px] border border-[#C8DDD0] bg-[#EEF6F1] p-4 text-sm text-[#1E3D2B]">
              <div className="font-bold">Ticket creado</div>
              <div className="mt-1 font-mono text-xs">{ticketCreated.id}</div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

export default AssistantPage;
