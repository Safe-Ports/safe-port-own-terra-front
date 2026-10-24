import { useEffect, useState } from "react";
import { LuCalendarDays, LuMegaphone, LuPartyPopper, LuShieldCheck, LuTriangleAlert, LuWrench } from "react-icons/lu";
import { useAppContext } from "@/context/AppContext";
import { FEED_API_READY, onFeedPreviewChange, staffFeed } from "./feedApi";
import { POST_KINDS, POST_KIND_ORDER, validatePost } from "./feedModel";
import PostCard from "./PostCard";
import "./community-feed.css";

const KIND_ICON = { announcement: LuMegaphone, urgent: LuTriangleAlert, event: LuCalendarDays, maintenance: LuWrench, community: LuPartyPopper };
const EMPTY = { kind: "announcement", title: "", body: "", audience: "all", eventAt: "" };

/** Muro de la comunidad del lado de la administración: publicar, ver reacciones y moderar comentarios. */
function StaffFeed({ community, announcements, onPublish }) {
  const { showToast } = useAppContext();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => (FEED_API_READY ? undefined : onFeedPreviewChange(() => setVersion((value) => value + 1))), []);
  const posts = staffFeed.decorate(announcements, version);

  const publish = async (event) => {
    event.preventDefault();
    const found = validatePost(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const created = await onPublish({ title: draft.title.trim(), body: draft.body.trim(), audience: draft.audience, isUrgent: draft.kind === "urgent" });
      if (created?.id) await staffFeed.setKind(created.id, draft.kind, draft.kind === "event" ? draft.eventAt : null);
      setDraft(EMPTY);
      showToast("Publicado en el muro de la comunidad", "success");
    } catch (failure) {
      showToast(failure.response?.data?.error?.message || failure.message, "warning");
    } finally { setSaving(false); }
  };
  const guard = async (action) => { try { await action(); } catch (failure) { showToast(failure.response?.data?.error?.message || failure.message, "warning"); throw failure; } };

  return <section className="condo-module feed-staff" aria-label="Muro de la comunidad">
    <header>
      <div><span>Comunidad</span><h2>Muro de {community?.name || "la comunidad"}</h2><p>Lo que publiques aparece en el portal y en la app de los vecinos. Ellos pueden reaccionar y comentar; tú respondes como Administración y puedes ocultar comentarios.</p></div>
      {!FEED_API_READY ? <em className="collections-preview-badge" title="Reacciones, comentarios y tipo de publicación se guardan en este navegador hasta que properties-back publique los endpoints.">Vista previa</em> : null}
    </header>

    <div className="feed-layout">
      <form className="feed-composer" onSubmit={publish} noValidate aria-busy={saving}>
        <div className="feed-composer-head"><span className="feed-avatar is-admin" aria-hidden="true"><LuShieldCheck/></span><div><strong>Crear publicación</strong><small>Como Administración</small></div></div>
        <div className="feed-kind-picker" role="radiogroup" aria-label="Tipo de publicación">
          {POST_KIND_ORDER.map((kind) => { const Icon = KIND_ICON[kind]; return <button type="button" role="radio" key={kind} aria-checked={draft.kind === kind} className={`is-${POST_KINDS[kind].tone}`} onClick={() => setDraft({ ...draft, kind })}><Icon/> {POST_KINDS[kind].label}</button>; })}
        </div>
        <label><span>Título</span><input value={draft.title} maxLength={200} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={draft.kind === "event" ? "Ej. Posada de la comunidad" : "Ej. Corte de agua el sábado"} aria-invalid={Boolean(errors.title)}/>{errors.title ? <em className="feed-error">{errors.title}</em> : null}</label>
        <label><span>Mensaje</span><textarea rows="4" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Cuéntale a la comunidad…" aria-invalid={Boolean(errors.body)}/>{errors.body ? <em className="feed-error">{errors.body}</em> : null}</label>
        <div className="feed-composer-row">
          {draft.kind === "event" ? <label><span>Fecha y hora</span><input type="datetime-local" value={draft.eventAt} onChange={(event) => setDraft({ ...draft, eventAt: event.target.value })} aria-invalid={Boolean(errors.eventAt)}/>{errors.eventAt ? <em className="feed-error">{errors.eventAt}</em> : null}</label> : null}
          <label><span>Para</span><select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}><option value="all">Toda la comunidad</option><option value="owners">Propietarios</option><option value="residents">Residentes</option></select></label>
        </div>
        <button type="submit" className="feed-publish" disabled={saving}>{saving ? "Publicando…" : "Publicar"}</button>
      </form>

      <div className="feed-list">
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} mode="staff" communityName={community?.name}
          onComment={(body) => guard(() => staffFeed.reply(post.id, body))}
          onHideComment={(commentId, hidden) => guard(() => staffFeed.setCommentHidden(post.id, commentId, hidden))}/>)
          : <div className="feed-empty"><LuMegaphone/><strong>Todavía no hay publicaciones</strong><p>Publica el primer aviso o evento: los vecinos lo verán al abrir su portal.</p></div>}
      </div>
    </div>
  </section>;
}

export default StaffFeed;
