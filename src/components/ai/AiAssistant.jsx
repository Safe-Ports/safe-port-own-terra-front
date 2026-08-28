import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowPath,
  HiArrowsPointingOut,
  HiCheckBadge,
  HiChevronRight,
  HiCurrencyDollar,
  HiMapPin,
  HiPaperAirplane,
  HiShieldCheck,
  HiSparkles,
  HiXMark,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { aiAssistantService } from "@/services/aiAssistantService";
import "./aiAssistant.css";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy tu asistente de Ownterra Lands. Puedo ayudarte a consultar inventario, comparar lotes y preparar información comercial.",
};

const SUGGESTIONS = [
  { label: "Buscar lotes", prompt: "Muéstrame lotes disponibles en Tapalpa" },
  { label: "Precalificar cliente", prompt: "Quiero precalificar a un cliente" },
  { label: "Redactar anuncio", prompt: "Redacta un anuncio para un terreno en Tapalpa" },
];

function money(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function timeLabel(value) {
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(
    value ? new Date(value) : new Date()
  );
}

function PropertyCard({ property, onAsk }) {
  return (
    <article className="ota-property-card">
      <div className="ota-property-visual" aria-hidden="true">
        <span className="ota-property-status"><HiCheckBadge /> {property.status}</span>
        <div className="ota-property-landmark">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="ota-property-body">
        <p className="ota-property-development">{property.development}</p>
        <div className="ota-property-heading">
          <h4>{property.name}</h4>
          <strong>{money(property.price)}</strong>
        </div>
        <p className="ota-property-location"><HiMapPin /> {property.location}</p>
        <div className="ota-property-facts">
          <span><HiArrowsPointingOut /> <b>{property.surface_m2} m²</b><small>{property.dimensions}</small></span>
          <span><HiCurrencyDollar /> <b>{money(property.price_per_m2)}</b><small>por m²</small></span>
        </div>
        <div className="ota-property-amenities">
          {(property.amenities || []).slice(0, 3).map((amenity) => <span key={amenity}>{amenity}</span>)}
        </div>
        <button type="button" className="ota-property-more" onClick={() => onAsk(property)}>
          Consultar detalles <HiChevronRight />
        </button>
      </div>
    </article>
  );
}

function ActionCard({ action, onReview }) {
  return (
    <div className="ota-action-card">
      <span className="ota-action-icon"><HiShieldCheck /></span>
      <div>
        <small>Requiere confirmación</small>
        <strong>{action.title}</strong>
        <p>{action.entity_label}</p>
      </div>
      <button type="button" onClick={() => onReview(action)}>Revisar</button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="ota-message ota-message--assistant" aria-label="Ownterra AI está escribiendo">
      <span className="ota-avatar"><HiSparkles /></span>
      <div className="ota-typing"><i /><i /><i /></div>
    </div>
  );
}

function Message({ message, onAskProperty, onReviewAction }) {
  const assistant = message.role === "assistant";
  return (
    <div className={`ota-message ota-message--${assistant ? "assistant" : "user"}`}>
      {assistant && <span className="ota-avatar"><HiSparkles /></span>}
      <div className="ota-message-content">
        <div className={`ota-bubble${message.error ? " ota-bubble--error" : ""}`}>{message.content}</div>
        {message.properties?.length > 0 && (
          <div className="ota-property-list">
            {message.properties.map((property) => (
              <PropertyCard key={property.id} property={property} onAsk={onAskProperty} />
            ))}
          </div>
        )}
        {message.pendingAction && <ActionCard action={message.pendingAction} onReview={onReviewAction} />}
        <time>{timeLabel(message.createdAt)}</time>
      </div>
    </div>
  );
}

export default function AiAssistant({ service = aiAssistantService }) {
  const { currentUser } = useAppContext();
  const storageKey = useMemo(() => `ownterra_ai_chat_${currentUser?.id || "session"}`, [currentUser?.id]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`ownterra_ai_chat_${currentUser?.id || "session"}`));
      return Array.isArray(saved) && saved.length ? saved : [WELCOME_MESSAGE];
    } catch {
      return [WELCOME_MESSAGE];
    }
  });
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("ownterra:support-open", close);
    return () => window.removeEventListener("ownterra:support-open", close);
  }, []);

  function toggle() {
    setOpen((previous) => {
      const next = !previous;
      if (next) {
        window.dispatchEvent(new Event("ownterra:ai-open"));
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      return next;
    });
  }

  function resetConversation() {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setInput("");
  }

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await service.sendMessage({
        conversationId,
        message: clean,
        messages: nextMessages
          .filter((item) => item.id !== WELCOME_MESSAGE.id && !item.error)
          .slice(-20)
          .map(({ role, content }) => ({ role, content })),
      });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, result.message]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "No pude responder en este momento. Intenta de nuevo en unos segundos.",
          error: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onInput(event) {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      send();
    }
  }

  async function confirmAction() {
    if (!activeAction || confirming) return;
    setConfirming(true);
    try {
      const result = await service.confirmAction(activeAction);
      setMessages((current) => [
        ...current.map((message) => (
          message.pendingAction?.id === activeAction.id
            ? { ...message, pendingAction: null }
            : message
        )),
        {
          id: `confirmation-${Date.now()}`,
          role: "assistant",
          content: result.message || "La acción fue confirmada correctamente.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setActiveAction(null);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `confirmation-error-${Date.now()}`,
          role: "assistant",
          content: "No se pudo completar la acción. No se realizó ningún cambio.",
          error: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setActiveAction(null);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`ota-fab${open ? " is-open" : ""}`}
        onClick={toggle}
        aria-label={open ? "Cerrar Ownterra AI" : "Abrir Ownterra AI"}
        aria-expanded={open}
      >
        {open ? <HiXMark /> : <HiSparkles />}
        {!open && <span>AI</span>}
      </button>

      {open && (
        <section className="ota-panel" aria-label="Chat de Ownterra AI">
          <header className="ota-header">
            <div className="ota-header-mark"><HiSparkles /></div>
            <div>
              <h2>Ownterra AI</h2>
              <p><i /> En línea <span>· Asistente de Lands</span></p>
            </div>
            <button type="button" onClick={resetConversation} title="Nueva conversación" aria-label="Nueva conversación">
              <HiArrowPath />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
              <HiXMark />
            </button>
          </header>

          {service.isDemo && (
            <div className="ota-demo-notice"><HiSparkles /> Vista previa · datos simulados</div>
          )}

          <div className="ota-messages" aria-live="polite">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onAskProperty={(property) => send(`Dame más detalles de ${property.name} en ${property.development}`)}
                onReviewAction={setActiveAction}
              />
            ))}
            {messages.length === 1 && (
              <div className="ota-suggestions">
                <p>Prueba preguntando:</p>
                {SUGGESTIONS.map((suggestion) => (
                  <button type="button" key={suggestion.label} onClick={() => send(suggestion.prompt)}>
                    {suggestion.label}<HiChevronRight />
                  </button>
                ))}
              </div>
            )}
            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          <footer className="ota-composer">
            <div>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={onInput}
                onKeyDown={onKeyDown}
                placeholder="Pregunta sobre lotes, clientes o ventas..."
                disabled={loading}
                aria-label="Mensaje para Ownterra AI"
              />
              <button type="button" onClick={() => send()} disabled={!input.trim() || loading} aria-label="Enviar mensaje">
                <HiPaperAirplane />
              </button>
            </div>
            <small>La IA puede cometer errores. Verifica los datos importantes.</small>
          </footer>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(activeAction)}
        title={activeAction?.title || "Confirmar acción"}
        subtitle="Ownterra AI nunca realiza cambios sin tu autorización."
        icon={<HiShieldCheck />}
        confirmLabel={service.isDemo ? "Probar confirmación" : "Confirmar cambio"}
        busy={confirming}
        onConfirm={confirmAction}
        onCancel={() => setActiveAction(null)}
      >
        <div className="ota-confirm-content">
          <span>Acción solicitada</span>
          <strong>{activeAction?.description}</strong>
          <p>{activeAction?.entity_label}</p>
          <div><HiShieldCheck /> El cambio se enviará por un endpoint autenticado y quedará sujeto a tus permisos.</div>
        </div>
      </ConfirmDialog>
    </>
  );
}
