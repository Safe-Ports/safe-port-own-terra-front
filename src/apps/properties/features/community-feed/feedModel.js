// Muro de la comunidad: la administración publica (avisos, urgentes, eventos,
// mantenimiento, comunidad) y los vecinos reaccionan y comentan. Cada vecino se
// muestra como "Laura M. · Casa 202": se siente comunidad sin exponer el nombre completo.
// Contrato: docs/2026-10-14_properties-muro-comunidad-contrato-backend.md (carpeta docs del workspace).

export const POST_KINDS = {
  announcement: { label: "Aviso", tone: "blue" },
  urgent: { label: "Urgente", tone: "red" },
  event: { label: "Evento", tone: "violet" },
  maintenance: { label: "Mantenimiento", tone: "amber" },
  community: { label: "Comunidad", tone: "green" },
};
export const POST_KIND_ORDER = ["announcement", "urgent", "event", "maintenance", "community"];

/** El tipo viene del backend; mientras no exista, un comunicado urgente se lee como "Urgente". */
export const postKind = (post) => (POST_KINDS[post.kind] ? post.kind : post.is_urgent ? "urgent" : "announcement");

// Reacciones estilo Facebook, sin emojis (regla de Own Terra): ícono y color por tipo.
export const REACTIONS = [
  ["like", "Me gusta"],
  ["love", "Me encanta"],
  ["haha", "Me divierte"],
  ["wow", "Me asombra"],
  ["sad", "Me entristece"],
  ["angry", "Me enoja"],
];
export const reactionLabel = (type) => Object.fromEntries(REACTIONS)[type] || "Reaccionar";

/** "Laura Méndez (prueba)" + "Casa 202" -> "Laura M. · Casa 202". */
export function shortName(fullName = "") {
  const words = fullName.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Vecino";
  return words.length > 1 ? `${words[0]} ${words[1][0]}.` : words[0];
}
export const neighborLabel = (author) => (author?.is_admin ? "Administración" : author?.anonymous || !author?.name ? `Vecino de ${author?.unit_label || "la comunidad"}` : `${shortName(author.name)}${author.unit_label ? ` · ${author.unit_label}` : ""}`);
export const initials = (name = "") => name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";

/** Resumen de reacciones: las 3 más frecuentes y el total. */
export function reactionSummary(counts = {}) {
  const ranked = Object.entries(counts).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  return { top: ranked.slice(0, 3).map(([type]) => type), total: ranked.reduce((sum, [, value]) => sum + value, 0) };
}

/** "Tú y 3 vecinos más", "Tú", "4 vecinos". */
export function reactionSentence(total, mine) {
  if (!total) return "";
  if (mine) return total === 1 ? "Tú" : `Tú y ${total - 1} ${total - 1 === 1 ? "vecino más" : "vecinos más"}`;
  return `${total} ${total === 1 ? "vecino" : "vecinos"}`;
}

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "12 oct". */
export function timeAgo(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  const minutes = Math.floor((now - date) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  if (hours < 48) return "ayer";
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export const COMMENT_MAX = 500;
export function validateComment(text) {
  const clean = text.trim();
  if (!clean) return "Escribe un comentario.";
  if (clean.length > COMMENT_MAX) return `Máximo ${COMMENT_MAX} caracteres.`;
  return "";
}

export function validatePost(draft) {
  const errors = {};
  if (!draft.title?.trim()) errors.title = "Escribe un título.";
  if (!draft.body?.trim()) errors.body = "Escribe el mensaje.";
  if (draft.kind === "event" && !draft.eventAt) errors.eventAt = "Indica cuándo es el evento.";
  return errors;
}
