import { useState } from "react";
import { LuAngry, LuCalendarDays, LuEye, LuEyeOff, LuFileText, LuFrown, LuHeart, LuLaugh, LuMegaphone, LuMessageCircle, LuPartyPopper, LuSend, LuShieldCheck, LuSmilePlus, LuSparkles, LuThumbsUp, LuTriangleAlert, LuWrench } from "react-icons/lu";
import { COMMENT_MAX, POST_KINDS, REACTIONS, initials, neighborLabel, postKind, reactionLabel, reactionSentence, reactionSummary, timeAgo, validateComment } from "./feedModel";
import "./community-feed.css";

const REACTION_ICON = { like: LuThumbsUp, love: LuHeart, haha: LuLaugh, wow: LuSparkles, sad: LuFrown, angry: LuAngry };
const KIND_ICON = { announcement: LuMegaphone, urgent: LuTriangleAlert, event: LuCalendarDays, maintenance: LuWrench, community: LuPartyPopper };
const AUDIENCE = { all: "Toda la comunidad", owners: "Propietarios", residents: "Residentes", tenants: "Inquilinos" };

export function ReactionIcon({ type, size = "md" }) {
  const Icon = REACTION_ICON[type] || LuThumbsUp;
  return <span className={`feed-reaction is-${type} is-${size}`} aria-hidden="true"><Icon/></span>;
}

function Avatar({ author }) {
  if (author?.is_admin) return <span className="feed-avatar is-admin" aria-hidden="true"><LuShieldCheck/></span>;
  return <span className="feed-avatar" aria-hidden="true">{initials(author?.name || author?.unit_label)}</span>;
}

const LONG = 280;

/**
 * Publicación del muro. `mode="resident"` reacciona y comenta; `mode="staff"` ve
 * el detalle, responde como Administración y puede ocultar comentarios.
 */
function PostCard({ post, mode = "resident", communityName, viewer, onReact, onComment, onHideComment, read, onMarkRead, marking, readError, busy }) {
  const kind = postKind(post);
  const KindIcon = KIND_ICON[kind];
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const { top, total } = reactionSummary(post.reaction_counts);
  const mine = post.my_reaction;
  const comments = post.comments || [];
  const visibleComments = showAll ? comments : comments.slice(-2);
  const long = (post.body || "").length > LONG;
  const staff = mode === "staff";

  const choose = (type) => { setPicker(false); onReact?.(mine === type ? null : type); };
  const send = async (event) => {
    event.preventDefault();
    const problem = validateComment(draft);
    if (problem) { setError(problem); return; }
    setError("");
    try { await onComment?.(draft); setDraft(""); setShowAll(true); }
    catch (failure) { setError(failure.response?.data?.error?.message || failure.message || "No pudimos publicar tu comentario."); }
  };

  return <article className={`feed-post is-${kind}`} aria-label={post.title}>
    {kind === "urgent" ? <p className="feed-urgent-band"><LuTriangleAlert/> Aviso urgente</p> : null}
    <header className="feed-post-head">
      <Avatar author={{ is_admin: true }}/>
      <div><strong>Administración{communityName ? ` · ${communityName}` : ""}</strong><small>{timeAgo(post.published_at || post.created_at)} · {AUDIENCE[post.audience] || "Toda la comunidad"}</small></div>
      <span className={`feed-kind is-${POST_KINDS[kind].tone}`}><KindIcon/> {POST_KINDS[kind].label}</span>
    </header>

    <div className="feed-post-body">
      <h3>{post.title}</h3>
      <p>{long && !expanded ? `${post.body.slice(0, LONG).trimEnd()}… ` : post.body}{long ? <button type="button" className="feed-more" onClick={() => setExpanded((open) => !open)}>{expanded ? " Ver menos" : "Ver más"}</button> : null}</p>
      {kind === "event" && post.event_at ? <div className="feed-event"><span><b>{new Date(post.event_at).toLocaleDateString("es-MX", { day: "numeric" })}</b><small>{new Date(post.event_at).toLocaleDateString("es-MX", { month: "short" })}</small></span><div><strong>{new Date(post.event_at).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</strong><small>{new Date(post.event_at).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}</small></div></div> : null}
      {post.attachments?.length ? <ul className="feed-attachments">{post.attachments.map((file, index) => <li key={file.url || index}><a href={file.url} target="_blank" rel="noreferrer"><LuFileText/> {file.filename || file.name || "Documento"}</a></li>)}</ul> : null}
    </div>

    {total || post.comment_count || staff ? <div className="feed-stats">
      {total ? <span className="feed-stats-reactions" title={top.map(reactionLabel).join(", ")}><span className="feed-stack">{top.map((type) => <ReactionIcon key={type} type={type} size="sm"/>)}</span>{reactionSentence(total, Boolean(mine))}</span> : <span/>}
      <span className="feed-stats-right">
        {post.comment_count ? <button type="button" onClick={() => setShowAll(true)}>{post.comment_count} {post.comment_count === 1 ? "comentario" : "comentarios"}</button> : null}
        {staff ? <span><LuEye/> {post.readCount ?? post.read_count ?? 0} {(post.readCount ?? post.read_count ?? 0) === 1 ? "lectura" : "lecturas"}</span> : null}
      </span>
    </div> : null}

    {!staff ? <div className="feed-actions">
      <div className="feed-react" onMouseLeave={() => setPicker(false)} onKeyDown={(event) => { if (event.key === "Escape") setPicker(false); }}>
        {picker ? <div className="feed-picker" role="group" aria-label="Elegir reacción">
          {REACTIONS.map(([type, label]) => <button type="button" key={type} onClick={() => choose(type)} aria-label={label} aria-pressed={mine === type} title={label}><ReactionIcon type={type} size="lg"/></button>)}
        </div> : null}
        <button type="button" className={`feed-action ${mine ? `is-active is-${mine}` : ""}`} onClick={() => choose(mine || "like")} onMouseEnter={() => setPicker(true)} aria-label={mine ? `Quitar reacción ${reactionLabel(mine)}` : "Me gusta"} disabled={busy}>
          {mine ? <ReactionIcon type={mine} size="sm"/> : <LuThumbsUp/>}<span>{mine ? reactionLabel(mine) : "Me gusta"}</span>
        </button>
        <button type="button" className="feed-action-more" onClick={() => setPicker((open) => !open)} aria-label="Más reacciones" aria-expanded={picker}><LuSmilePlus/></button>
      </div>
      <label className="feed-action" htmlFor={`comment-${post.id}`}><LuMessageCircle/><span>Comentar</span></label>
      {onMarkRead ? (read ? <i className="feed-read">Leído</i> : <button type="button" className="feed-mark-read" disabled={marking} onClick={onMarkRead}>{marking ? "Guardando…" : "Marcar leído"}</button>) : null}
    </div> : null}
    {readError ? <p className="feed-error" role="alert">{readError}</p> : null}

    {(comments.length || onComment) ? <section className="feed-comments" aria-label={`Comentarios de ${post.title}`}>
      {comments.length > 2 && !showAll ? <button type="button" className="feed-more" onClick={() => setShowAll(true)}>Ver los {comments.length} comentarios</button> : null}
      {visibleComments.map((comment) => <div key={comment.id} className={`feed-comment ${comment.hidden ? "is-hidden" : ""}`}>
        <Avatar author={comment.author}/>
        <div>
          <p className="feed-bubble"><strong>{neighborLabel(comment.author)}</strong>{comment.body}</p>
          <small>{timeAgo(comment.created_at)}{comment.hidden ? " · Oculto para los vecinos" : ""}{staff && !comment.author?.is_admin ? <button type="button" onClick={() => onHideComment?.(comment.id, !comment.hidden)}>{comment.hidden ? <><LuEye/> Mostrar</> : <><LuEyeOff/> Ocultar</>}</button> : null}</small>
        </div>
      </div>)}
      {onComment ? <form className="feed-compose" onSubmit={send}>
        <Avatar author={staff ? { is_admin: true } : { name: viewer?.name, unit_label: viewer?.unitLabel }}/>
        <input id={`comment-${post.id}`} value={draft} maxLength={COMMENT_MAX} onChange={(event) => setDraft(event.target.value)} placeholder={staff ? "Responder como Administración…" : "Escribe un comentario…"} aria-label={`Comentar en ${post.title}`}/>
        <button type="submit" aria-label="Publicar comentario" disabled={!draft.trim()}><LuSend/></button>
      </form> : null}
      {error ? <p className="feed-error" role="alert">{error}</p> : null}
    </section> : null}
  </article>;
}

export default PostCard;
