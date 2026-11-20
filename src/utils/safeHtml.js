/**
 * Utilidades para no inyectar HTML con datos de usuario (auditoría 2026-11-12, A1).
 *
 * Los tokens de sesión viven en localStorage: cualquier XSS equivale a robar la
 * cuenta. Por eso ningún texto que venga de la API o del usuario se pinta como
 * HTML; se escapa al armar plantillas o se convierte en segmentos de texto.
 */

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa un valor para interpolarlo dentro de una plantilla HTML. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

const ENTITY_DECODES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITY_DECODES[entity]);
}

/**
 * Convierte un texto con marcado `<b>…</b>` (como el del historial del lote) en
 * segmentos `{ text, bold }` para pintarlos como TEXTO con React.
 *
 * Solo `<b>` se interpreta; cualquier otra etiqueta queda como texto literal y
 * nunca se ejecuta. Las entidades básicas se decodifican para que el texto se
 * vea igual cuando el backend empiece a escapar los nombres.
 */
export function boldMarkupSegments(markup) {
  if (markup === null || markup === undefined) return [];
  const source = String(markup);
  const segments = [];
  const pattern = /<b>([\s\S]*?)<\/b>/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) {
      segments.push({ text: decodeEntities(source.slice(last, match.index)), bold: false });
    }
    segments.push({ text: decodeEntities(match[1]), bold: true });
    last = pattern.lastIndex;
  }
  if (last < source.length) {
    segments.push({ text: decodeEntities(source.slice(last)), bold: false });
  }
  return segments;
}
