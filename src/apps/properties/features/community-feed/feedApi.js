import propertiesPortalService from "@/services/propertiesPortalService";
import propertiesService from "@/services/propertiesService";

/* Capa social del muro (tipo de publicación, reacciones y comentarios).
 *
 * Las publicaciones SON los comunicados reales del backend (`announcements`). Lo que
 * todavía no existe en properties-back es la capa social; mientras tanto vive en
 * VISTA PREVIA en este navegador, ligada al id real del comunicado. Cuando el backend
 * publique los endpoints del contrato, basta con poner FEED_API_READY en true.
 *
 * La vista previa sólo se comparte dentro del MISMO origen (host y puerto).
 */
export const FEED_API_READY = false;

const KEY = "ownterra_preview_community_feed";
const read = () => { try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (value) => { try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { throw new Error("El navegador no tiene espacio para la vista previa."); } window.dispatchEvent(new Event("ownterra-preview-feed")); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 150));

export function onFeedPreviewChange(callback) {
  const handler = (event) => { if (!event.key || event.key === KEY) callback(); };
  window.addEventListener("storage", handler);
  window.addEventListener("ownterra-preview-feed", callback);
  return () => { window.removeEventListener("storage", handler); window.removeEventListener("ownterra-preview-feed", callback); };
}

/** Une el comunicado real con su capa social (vista previa) en la forma del contrato. */
function enrich(post, viewerKey, { staff = false } = {}) {
  const social = read()[post.id] || {};
  const reactions = social.reactions || {};
  const counts = {};
  Object.values(reactions).forEach((type) => { counts[type] = (counts[type] || 0) + 1; });
  const comments = (social.comments || []).filter((comment) => staff || !comment.hidden);
  return {
    ...post,
    kind: post.kind || social.kind || null,
    event_at: post.event_at || social.event_at || null,
    reaction_counts: post.reaction_counts || counts,
    my_reaction: post.my_reaction ?? reactions[viewerKey] ?? null,
    reactors: post.reactors || Object.entries(reactions).map(([key, type]) => ({ type, ...(social.people?.[key] || {}) })),
    comment_count: post.comment_count ?? comments.filter((comment) => !comment.hidden).length,
    comments: post.comments || comments,
  };
}

function update(postId, change) {
  const all = read();
  all[postId] = change(all[postId] || {});
  write(all);
}

/* ── Residente (portal) ───────────────────────────────────────────────── */
export const portalFeed = {
  /** `viewer`: { personaId, name, unitLabel } de la persona del portal. */
  decorate(posts, viewer) {
    return FEED_API_READY ? posts : posts.map((post) => enrich(post, `p:${viewer?.personaId || "me"}`));
  },
  async react(postId, type, viewer) {
    if (FEED_API_READY) return type ? propertiesPortalService.reactToAnnouncement(postId, type) : propertiesPortalService.removeAnnouncementReaction(postId);
    const key = `p:${viewer?.personaId || "me"}`;
    update(postId, (social) => {
      const reactions = { ...(social.reactions || {}) };
      if (type) reactions[key] = type; else delete reactions[key];
      return { ...social, reactions, people: { ...(social.people || {}), [key]: { name: viewer?.name, unit_label: viewer?.unitLabel } } };
    });
    return delay(null);
  },
  async comment(postId, body, viewer) {
    if (FEED_API_READY) return propertiesPortalService.commentAnnouncement(postId, body);
    const comment = { id: uid(), body: body.trim(), created_at: new Date().toISOString(), hidden: false, mine: true, author: { name: viewer?.name, unit_label: viewer?.unitLabel } };
    update(postId, (social) => ({ ...social, comments: [...(social.comments || []), comment] }));
    return delay(comment);
  },
};

/* ── Administración ───────────────────────────────────────────────────── */
export const staffFeed = {
  decorate(posts) {
    return FEED_API_READY ? posts : posts.map((post) => enrich(post, "staff", { staff: true }));
  },
  /** Guarda el tipo de publicación de un comunicado recién creado (vista previa). */
  async setKind(postId, kind, eventAt) {
    if (FEED_API_READY) return null;
    update(postId, (social) => ({ ...social, kind, event_at: eventAt || null }));
    return delay(null);
  },
  async reply(postId, body) {
    if (FEED_API_READY) return propertiesService.announcements.comment(postId, body);
    const comment = { id: uid(), body: body.trim(), created_at: new Date().toISOString(), hidden: false, author: { is_admin: true } };
    update(postId, (social) => ({ ...social, comments: [...(social.comments || []), comment] }));
    return delay(comment);
  },
  async setCommentHidden(postId, commentId, hidden) {
    if (FEED_API_READY) return propertiesService.announcements.hideComment(postId, commentId, hidden);
    update(postId, (social) => ({ ...social, comments: (social.comments || []).map((comment) => comment.id === commentId ? { ...comment, hidden } : comment) }));
    return delay(null);
  },
};
