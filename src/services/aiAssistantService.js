import api from "./api";

const DEMO_DELAY_MS = 650;

const DEMO_PROPERTIES = [
  {
    id: "demo-encinos-18",
    name: "Lote 18",
    development: "Tierra de Encinos",
    location: "Tapalpa, Jalisco",
    status: "Disponible",
    surface_m2: 320,
    dimensions: "12 × 26.67 m",
    price: 768000,
    price_per_m2: 2400,
    amenities: ["Casa club", "Acceso controlado", "Áreas verdes"],
  },
  {
    id: "demo-tapalpa-07",
    name: "Lote 07",
    development: "Tapalpa Reserva",
    location: "Tapalpa, Jalisco",
    status: "Disponible",
    surface_m2: 450,
    dimensions: "15 × 30 m",
    price: 1350000,
    price_per_m2: 3000,
    amenities: ["Vista al bosque", "Servicios ocultos", "Senderos"],
  },
];

function id(prefix = "ai") {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function demoReply(message) {
  const query = message.toLocaleLowerCase("es-MX");

  if (/vendid|apartad|reservad|cambiar.*estado|marcar.*lote/.test(query)) {
    return {
      conversation_id: "demo-conversation",
      message: {
        id: id(),
        role: "assistant",
        content: "Puedo preparar ese cambio, pero necesito tu confirmación antes de enviarlo al sistema.",
        pending_action: {
          id: id("action"),
          type: "change_lot_status",
          title: "Cambiar estado del lote",
          description: "Marcar Lote 5 como vendido",
          entity_label: "Lote 5 · Tierra de Encinos",
          target_value: "Vendido",
          confirmation_token: "demo-only",
        },
      },
    };
  }

  if (/lote|terreno|tapalpa|encinos|presupuesto|disponible/.test(query)) {
    return {
      conversation_id: "demo-conversation",
      message: {
        id: id(),
        role: "assistant",
        content: "Encontré 2 opciones disponibles que podrían ajustarse a tu búsqueda. Los datos que ves son simulados para revisar el frontend.",
        properties: DEMO_PROPERTIES,
      },
    };
  }

  if (/precalif|cliente|financiamiento|mensualidad/.test(query)) {
    return {
      conversation_id: "demo-conversation",
      message: {
        id: id(),
        role: "assistant",
        content: "Para preparar una precalificación necesito tres datos: presupuesto mensual, enganche disponible y plazo preferido. No guardaré ni modificaré información sin que revises el resultado.",
      },
    };
  }

  if (/anuncio|publicaci|redacta|copy/.test(query)) {
    return {
      conversation_id: "demo-conversation",
      message: {
        id: id(),
        role: "assistant",
        content: "Borrador: Vive rodeado de naturaleza en Tapalpa. Descubre terrenos con acceso controlado, amplias áreas verdes y alternativas de financiamiento. Agenda una visita y encuentra el espacio ideal para tu proyecto.",
      },
    };
  }

  return {
    conversation_id: "demo-conversation",
    message: {
      id: id(),
      role: "assistant",
      content: "Puedo ayudarte a consultar inventario, comparar lotes, precalificar prospectos o preparar textos comerciales. ¿Qué necesitas revisar?",
    },
  };
}

export function normalizeAiResponse(payload) {
  const source = payload?.message || payload || {};
  return {
    id: source.id || id(),
    role: "assistant",
    content: source.content || source.text || "No recibí contenido para mostrar.",
    properties: Array.isArray(source.properties) ? source.properties : [],
    pendingAction: source.pending_action || source.pendingAction || null,
    createdAt: source.created_at || new Date().toISOString(),
  };
}

export const aiAssistantService = {
  // El backend ya existe: el mock solo se activa de forma explícita.
  isDemo: import.meta.env.VITE_AI_DEMO_MODE === "true",

  async sendMessage({ messages, message, conversationId }) {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
      const response = demoReply(message);
      return {
        conversationId: response.conversation_id,
        message: normalizeAiResponse(response),
      };
    }

    const { data } = await api.post("/chat-ai", {
      messages,
      message,
      conversation_id: conversationId || null,
    }, { timeout: 30000 });
    return {
      conversationId: data.conversation_id || conversationId || null,
      message: normalizeAiResponse(data),
    };
  },

  async confirmAction(action) {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      return {
        status: "demo",
        message: "Confirmación registrada en la demostración. No se modificó ningún lote.",
      };
    }

    const { data } = await api.post(`/chat-ai/actions/${action.id}/confirm`, {
      confirmation_token: action.confirmation_token,
    });
    return data;
  },
};
