import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import './support.css'

const BOT_URL = import.meta.env.VITE_BOT_API_URL || 'http://localhost:8001'
const TICKET_KEY = 'sp_support_ticket_id'
const POLL_MS = 10_000
// Revisión de fondo del punto rojo, con el panel cerrado — antes era una sola vez
// (2s tras montar o cerrar el panel), así que si soporte respondía mientras el
// usuario seguía navegando la app sin volver a tocar el widget, nunca se enteraba.
// 5s: se siente prácticamente instantáneo sin convertir el widget en una fuente de
// tráfico constante — la corre CADA usuario con sesión abierta, en cualquier
// pantalla, todo el tiempo, la mayoría sin tocar soporte nunca.
const UNREAD_POLL_MS = 5_000

const STATUS_LABELS = {
  open: 'Abierto',
  in_progress: 'En atención',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function StatusBadge({ status }) {
  return <span className={`sp-badge sp-badge--${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

// ── Icons ──────────────────────────────────────────────────────────────────

const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconTicket = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-4V7a2 2 0 0 1 2-2z" />
  </svg>
)
const IconAgent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

// ── Views ──────────────────────────────────────────────────────────────────

function MenuView({ onSelect, unreadCount }) {
  return (
    <div className="sp-body">
      <div className="sp-menu-welcome">
        <strong>¿Cómo podemos ayudarte?</strong>
        Estamos aquí para resolver tus dudas.
      </div>
      <div className="sp-divider" />
      <button className="sp-menu-item" onClick={() => onSelect('create-ticket')}>
        <span className="sp-menu-item-ico"><IconTicket /></span>
        <span>
          <span className="sp-menu-item-label">Crear ticket</span>
          <span className="sp-menu-item-sub">Reporta un problema o consulta</span>
        </span>
        <span className="sp-menu-arrow">›</span>
      </button>
      <button className="sp-menu-item" onClick={() => onSelect('create-agent')}>
        <span className="sp-menu-item-ico"><IconAgent /></span>
        <span>
          <span className="sp-menu-item-label">Hablar con agente</span>
          <span className="sp-menu-item-sub">Chat en vivo con el equipo</span>
        </span>
        <span className="sp-menu-arrow">›</span>
      </button>
      <button className="sp-menu-item" onClick={() => onSelect('list')}>
        <span className="sp-menu-item-ico"><IconList /></span>
        <span>
          <span className="sp-menu-item-label">
            Mis tickets
            {unreadCount > 0 && <span className="sp-unread-dot" style={{ marginLeft: 6 }} />}
          </span>
          <span className="sp-menu-item-sub">
            {unreadCount > 0
              ? `${unreadCount} respuesta${unreadCount === 1 ? '' : 's'} nueva${unreadCount === 1 ? '' : 's'} de soporte`
              : 'Ver estado de tus solicitudes'}
          </span>
        </span>
        <span className="sp-menu-arrow">›</span>
      </button>
    </div>
  )
}

function CreateView({ botFetch, onCreated }) {
  const [description, setDescription] = useState('')
  const [device, setDevice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const lockRef = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (lockRef.current) return
    lockRef.current = true
    setError(null)
    setLoading(true)
    try {
      const ticket = await botFetch('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ description, device, intent: 'general_support' }),
      })
      onCreated(ticket)
    } catch (err) {
      setError(err.message)
      lockRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="sp-body">
      <form className="sp-form" onSubmit={handleSubmit}>
        {error && <div className="sp-form-error">{error}</div>}
        <div className="sp-field">
          <label className="sp-label">Descripción del problema</label>
          <textarea
            className="sp-textarea"
            placeholder="Describe tu problema con el mayor detalle posible…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required minLength={10} maxLength={2000}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Dispositivo / Plataforma</label>
          <input
            className="sp-input"
            type="text"
            placeholder="Ej. Chrome en Mac, Safari en iPhone…"
            value={device}
            onChange={e => setDevice(e.target.value)}
            required maxLength={120}
          />
        </div>
        <button className="sp-submit" type="submit" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar ticket'}
        </button>
      </form>
    </div>
  )
}

/* "Hablar con agente" — el ticket se crea al enviar el primer mensaje */
function AgentChatView({ botFetch, onCreated }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const lockRef = useRef(false)   // guard síncrono — setSending es async

  async function sendFirst() {
    if (!text.trim() || lockRef.current) return
    lockRef.current = true
    setSending(true)
    setError(null)
    try {
      const ua = navigator.userAgent
      const device = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'Navegador web'
      // Un solo request: crea ticket + primer mensaje de forma atómica
      const ticket = await botFetch('/support/tickets/agent-chat', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim(), device }),
      })
      onCreated(ticket)
    } catch (err) {
      setError(err.message)
      lockRef.current = false
      setSending(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFirst() }
  }

  return (
    <div className="sp-thread">
      <div className="sp-messages">
        <div className="sp-thread-empty">
          Un agente se unirá pronto.{'\n'}Escribe tu mensaje para comenzar.
        </div>
        {error && <div style={{ padding: '0 14px' }}><div className="sp-form-error">{error}</div></div>}
      </div>
      <div className="sp-input-bar">
        <textarea
          className="sp-msg-input"
          rows={1}
          placeholder="Escribe tu consulta…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
          autoFocus
        />
        <button className="sp-send-btn" onClick={sendFirst} disabled={!text.trim() || sending}>
          {sending
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'sp-spin .7s linear infinite' }} />
            : <IconSend />}
        </button>
      </div>
    </div>
  )
}

function ListView({ botFetch, onSelectTicket }) {
  const [all, setAll] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    botFetch('/support/tickets/mine')
      .then(setAll)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [botFetch])

  if (loading) return <div className="sp-body"><div className="sp-list-empty">Cargando…</div></div>

  const active = all.filter(t => t.status === 'open' || t.status === 'in_progress')
  const shown = showAll ? all : active
  const histCount = all.length - active.length

  return (
    <div className="sp-body">
      {shown.length === 0 && (
        <div className="sp-list-empty">
          {showAll ? 'No tienes tickets aún.' : 'No tienes tickets activos.'}
        </div>
      )}
      {shown.length > 0 && (
        <div className="sp-list">
          {shown.map(t => (
            <button
              key={t.id}
              className={`sp-ticket-row${t.unread_count > 0 ? ' has-unread' : ''}`}
              onClick={() => onSelectTicket(t)}
            >
              <div className="sp-ticket-info">
                <div className="sp-ticket-id">#{t.id.slice(0, 8).toUpperCase()}</div>
                <div className="sp-ticket-desc">{t.description}</div>
                <div className="sp-ticket-date">{formatDate(t.created_at)}</div>
              </div>
              <div className="sp-ticket-right">
                <StatusBadge status={t.status} />
                {t.unread_count > 0 && <span className="sp-unread-dot" />}
              </div>
            </button>
          ))}
        </div>
      )}
      {!showAll && histCount > 0 && (
        <button className="sp-history-btn" onClick={() => setShowAll(true)}>
          Ver historial completo ({histCount})
        </button>
      )}
      {showAll && histCount > 0 && (
        <button className="sp-history-btn" onClick={() => setShowAll(false)}>
          ↑ Ocultar historial
        </button>
      )}
    </div>
  )
}

function ThreadView({ ticketId, botFetch }) {
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const sendLock = useRef(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [t, msgs] = await Promise.all([
          botFetch(`/support/tickets/${ticketId}`),
          botFetch(`/support/tickets/${ticketId}/messages`),
        ])
        if (!active) return
        setTicket(t)
        setMessages(msgs)
        botFetch(`/support/tickets/${ticketId}/messages/read`, { method: 'PATCH' }).catch(() => {})
      } catch {}
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { active = false; clearInterval(timer) }
  }, [ticketId, botFetch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  async function sendMessage() {
    if ((!text.trim() && !imageFile) || sendLock.current) return
    sendLock.current = true
    setSending(true)
    try {
      let msg
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        if (text.trim()) fd.append('caption', text.trim())
        msg = await botFetch(`/support/tickets/${ticketId}/messages/upload`, {
          method: 'POST',
          body: fd,
        })
        clearImage()
      } else {
        msg = await botFetch(`/support/tickets/${ticketId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: text.trim() }),
        })
      }
      setMessages(prev => [...prev, msg])
      setText('')
    } catch {}
    sendLock.current = false
    setSending(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="sp-thread">
      <div className="sp-messages">
        {messages.length === 0 && (
          <div className="sp-thread-empty">
            {ticket?.intent === 'agent_chat'
              ? 'Un agente se unirá pronto.\nEscribe tu consulta mientras esperas.'
              : 'Tu ticket fue creado. El equipo responderá en breve.'}
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`sp-msg sp-msg--${msg.sender}`}>
            <span className="sp-msg-author">
              {msg.sender === 'user' ? 'Tú' : (msg.author_name ?? 'Soporte OwnTerra')}
            </span>
            <div className="sp-msg-bubble">
              {msg.image_url && (
                <img
                  src={`${BOT_URL}${msg.image_url}`}
                  alt="imagen adjunta"
                  className="sp-msg-img"
                  onClick={() => window.open(`${BOT_URL}${msg.image_url}`, '_blank')}
                />
              )}
              {msg.content && <span>{msg.content}</span>}
            </div>
            <span className="sp-msg-time">{formatTime(msg.created_at)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {ticket?.status === 'closed' && (
        <div className="sp-closed-banner">
          Ticket cerrado por el equipo de soporte.
        </div>
      )}

      {ticket?.status !== 'closed' && (
        <>
          {imagePreview && (
            <div className="sp-img-preview-bar">
              <img src={imagePreview} className="sp-img-preview-thumb" alt="preview" />
              <span className="sp-img-preview-name">{imageFile?.name}</span>
              <button className="sp-img-preview-clear" onClick={clearImage} title="Quitar">✕</button>
            </div>
          )}
          <div className="sp-input-bar">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="sp-img-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen"
              disabled={sending}
            >
              <IconImage />
            </button>
            <textarea
              className="sp-msg-input"
              rows={1}
              placeholder={imageFile ? 'Añadir descripción (opcional)…' : ticket?.status === 'resolved' ? 'Ticket resuelto — escribe para reabrir' : 'Escribe un mensaje…'}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button className="sp-send-btn" onClick={sendMessage} disabled={(!text.trim() && !imageFile) || sending}>
              {sending
                ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'sp-spin .7s linear infinite' }} />
                : <IconSend />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function SupportWidget() {
  const { currentUser } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState('menu')  // menu | create | connecting | list | thread
  const [activeTicketId, setActiveTicketId] = useState(() => localStorage.getItem(TICKET_KEY))
  // Los tickets con unread_count > 0 detectados por la revisión de fondo — no solo
  // un booleano: al abrir el widget, esto es lo que permite llevar al usuario
  // directo al ticket (o a la lista) en vez de a un menú genérico que no dice nada
  // de si hay algo nuevo.
  const [unreadTickets, setUnreadTickets] = useState([])

  const botFetch = useCallback(async (path, options = {}) => {
    const isFormData = options.body instanceof FormData
    const res = await fetch(`${BOT_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${currentUser?.token}`,
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Error de soporte')
    }
    return res.json()
  }, [currentUser?.token])

  // Punto rojo cuando el panel está cerrado — revisión continua (no solo una vez),
  // para que se vea aunque el usuario siga navegando la app sin volver a tocar el
  // widget en el momento exacto en que soporte responde.
  useEffect(() => {
    if (isOpen || !currentUser) return
    const check = () => {
      botFetch('/support/tickets/mine')
        .then(tickets => setUnreadTickets(tickets.filter(t => t.unread_count > 0)))
        .catch(() => {})
    }
    const initial = setTimeout(check, 2000)
    const interval = setInterval(check, UNREAD_POLL_MS)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [isOpen, currentUser, botFetch])

  function handleMenuSelect(action) {
    if (action === 'create-ticket') setView('create')
    else if (action === 'create-agent') setView('agent-chat')
    else if (action === 'list') setView('list')
  }

  function handleCreated(ticket) {
    setActiveTicketId(ticket.id)
    localStorage.setItem(TICKET_KEY, ticket.id)
    setView('thread')
  }

  function handleSelectTicket(ticket) {
    setActiveTicketId(ticket.id)
    localStorage.setItem(TICKET_KEY, ticket.id)
    setView('thread')
  }

  function goBack() {
    setView('menu')
  }

  // Al abrir el widget con algo sin leer, lleva directo a eso — no al menú genérico.
  // Antes, ver el punto rojo y luego un menú de opciones sin ninguna pista dejaba al
  // usuario sin saber si era de un ticket o de otra cosa.
  function handleToggle() {
    setIsOpen(prevOpen => {
      const next = !prevOpen
      if (next && unreadTickets.length > 0) {
        if (unreadTickets.length === 1) {
          const t = unreadTickets[0]
          setActiveTicketId(t.id)
          localStorage.setItem(TICKET_KEY, t.id)
          setView('thread')
        } else {
          setView('list')
        }
      }
      return next
    })
  }

  const HEAD = {
    menu:         { title: 'Soporte OwnTerra', sub: null },
    create:       { title: 'Crear ticket', sub: null },
    'agent-chat': { title: 'Chat con agente', sub: null },
    list:         { title: 'Mis tickets', sub: null },
    thread:       { title: 'Chat de soporte', sub: activeTicketId ? `#${activeTicketId.slice(0, 8).toUpperCase()}` : null },
  }
  const { title, sub } = HEAD[view] ?? HEAD.menu

  if (!currentUser) return null

  return (
    <>
      {/* Botón flotante — toggle */}
      <button className="sp-btn" onClick={handleToggle} aria-label="Soporte">
        <IconChat />
        {unreadTickets.length > 0 && !isOpen && <span className="sp-btn-dot" />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="sp-panel">
          <div className="sp-head">
            {view !== 'menu' && (
              <button className="sp-head-back" onClick={goBack} aria-label="Volver">
                <IconBack />
              </button>
            )}
            <div>
              <div className="sp-head-title">{title}</div>
              {sub && <span className="sp-head-sub">{sub}</span>}
            </div>
            <button className="sp-head-close" onClick={() => { setIsOpen(false); setView('menu') }} aria-label="Cerrar">
              ✕
            </button>
          </div>

          {view === 'menu'       && <MenuView onSelect={handleMenuSelect} unreadCount={unreadTickets.length} />}
          {view === 'create'     && <CreateView botFetch={botFetch} onCreated={handleCreated} />}
          {view === 'agent-chat' && <AgentChatView botFetch={botFetch} onCreated={handleCreated} />}
          {view === 'list'       && <ListView botFetch={botFetch} onSelectTicket={handleSelectTicket} />}
          {view === 'thread' && activeTicketId && <ThreadView ticketId={activeTicketId} botFetch={botFetch} />}
        </div>
      )}
    </>
  )
}
