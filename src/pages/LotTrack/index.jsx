import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { HiEye, HiXMark } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { lotService } from "@/services/lotService";
import { currency } from "@/services/formatters";
import EmptyState from "@/components/ui/EmptyState";
import useEscapeKey from "@/hooks/useEscapeKey";
import "./lotTrack.css";

const STATUS_META = {
  available: { label: "Disponible", cls: "ok" },
  reserved:  { label: "Apartado",   cls: "warn" },
  sold:      { label: "Vendido",    cls: "sold" },
};

const STATUS_FILTERS = [
  { value: "",          label: "Todos los estados" },
  { value: "reserved",  label: "Apartados" },
  { value: "available", label: "Disponibles" },
  { value: "sold",      label: "Vendidos" },
];

const SORTS = [
  { value: "recent",   label: "Más recientes primero" },
  { value: "expiring", label: "Por vencer primero" },
  { value: "code",     label: "Por código de lote" },
];

const PER_PAGE = 15;

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** "hace 2 h", "ayer", "hace 5 d" — cuánto hace que el lote se movió. */
function sinceLabel(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} d`;
  const months = Math.round(days / 30);
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

/** "402.00" → "402 m²" (los lotes se capturan con 2 decimales que casi nunca se usan). */
function area(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${n % 1 === 0 ? n : n.toFixed(2)} m²`;
}

/** Días que faltan para `iso`; negativo si ya pasó. null si no hay fecha. */
function daysLeft(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function vencLabel(iso) {
  const d = daysLeft(iso);
  if (d === null) return null;
  if (d < 0) return { text: `venció hace ${Math.abs(d)}d`, tone: "urgent" };
  if (d === 0) return { text: "vence hoy", tone: "urgent" };
  if (d <= 3) return { text: `en ${d} día${d === 1 ? "" : "s"}`, tone: "urgent" };
  if (d <= 7) return { text: `en ${d} días`, tone: "soon" };
  return { text: `en ${d} días`, tone: "calm" };
}

function Person({ name, kind }) {
  if (!name) return <span className="lt-dash">—</span>;
  return (
    <div className="lt-person">
      <div className={`lt-av${kind === "client" ? " client" : ""}`}>{initials(name)}</div>
      <span>{name}</span>
    </div>
  );
}

/**
 * Quién apartó y quién cerró, en una sola celda. Cuando son personas distintas
 * se muestran las dos con una flecha y la etiqueta "Split": es el caso de
 * comisión compartida, que es justo el dato que no se podía ver en ningún lado.
 */
function Journey({ row }) {
  const { reserved_by_name: res, closed_by_name: closed } = row;
  if (!res && !closed) return <span className="lt-dash">Sin actividad</span>;
  if (res && closed && res !== closed) {
    return (
      <div className="lt-journey">
        <Person name={res} />
        <span className="lt-arrow">→</span>
        <Person name={closed} />
        <span className="lt-split">Split</span>
      </div>
    );
  }
  // Disponible con historial = el apartado se cayó. Se atenúa para no confundirlo
  // con uno vigente: el lote está libre, esto es solo el rastro de quien lo intentó.
  const stale = row.status === "available" && !closed;
  return (
    <div className={`lt-journey${stale ? " stale" : ""}`}>
      <Person name={closed || res} />
      {stale && <span className="lt-stale-tag">apartado vencido</span>}
    </div>
  );
}

/**
 * Una fila de la tabla. Va memoizada porque abrir el popover de contacto o el
 * panel de historial cambia el estado de la página, y sin esto React volvía a
 * renderizar las hasta 100 filas —con sus avatares y pastillas— en cada click.
 * Los handlers llegan estables desde arriba (useCallback) para que la
 * comparación de props sirva de algo.
 */
const LotRow = memo(function LotRow({ row, onOpenRow, onOpenContact }) {
  const meta = STATUS_META[row.status] || STATUS_META.available;
  const venc = row.status === "reserved" ? vencLabel(row.reserved_until) : null;
  const since = sinceLabel(row.last_activity);
  const stale = row.status === "available" && !row.closed_by_name;

  return (
    <tr
      className={venc?.tone === "urgent" ? "urgent" : venc?.tone === "soon" ? "soon" : ""}
      tabIndex={0}
      onClick={() => onOpenRow(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenRow(row); }
      }}
    >
      <td className="lt-first">
        <div className="lt-code">{row.code}</div>
        <div className="lt-cell-sub">{row.inmueble_name}</div>
      </td>
      <td>
        <span className={`lt-pill ${meta.cls}`}><span className="lt-dot" />{meta.label}</span>
      </td>
      <td><Journey row={row} /></td>
      <td>
        {row.client_name ? (
          <div className={`lt-client-cell${stale ? " stale" : ""}`}>
            <Person name={row.client_name} kind="client" />
            <button
              className="lt-eye"
              title={`Ver contacto de ${row.client_name}`}
              aria-label={`Ver contacto de ${row.client_name}`}
              onClick={(e) => {
                e.stopPropagation();  // no abrir el drawer del lote
                onOpenContact(e.currentTarget, row);
              }}
            >
              <HiEye />
            </button>
          </div>
        ) : <span className="lt-dash">—</span>}
      </td>
      <td>
        {venc ? <span className={`lt-venc ${venc.tone}`}>{venc.text}</span>
              : <span className="lt-dash">—</span>}
      </td>
      <td>
        {since
          ? <span className="lt-since" title={new Date(row.last_activity).toLocaleString("es-MX")}>{since}</span>
          : <span className="lt-dash">—</span>}
      </td>
      <td className="lt-num">
        {row.price_contado ? currency(row.price_contado) : <span className="lt-dash">—</span>}
      </td>
      <td><span className="lt-chev">›</span></td>
    </tr>
  );
});

/** Ficha de contacto del cliente, anclada al ojito de la fila. */
function ContactPopover({ anchor, row, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  // useLayoutEffect y no useEffect: mide y posiciona ANTES de que el navegador
  // pinte. Con useEffect el popover alcanzaba a pintarse invisible en su posición
  // por defecto y sólo en el frame siguiente saltaba a su lugar — un frame perdido
  // en cada apertura, que es lo que se sentía como lentitud.
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    let left = a.left - 8;
    let top = a.bottom + 7;
    if (left + p.width > window.innerWidth - 12) left = window.innerWidth - p.width - 12;
    if (left < 12) left = 12;
    // Si no cabe abajo, se voltea hacia arriba.
    if (top + p.height > window.innerHeight - 12) top = a.top - p.height - 7;
    if (top < 12) top = 12;
    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    const away = (e) => {
      if (!ref.current?.contains(e.target) && !anchor?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", away);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  // Portal a body: el contenedor de la página crea un stacking context propio y
  // ahí un position:fixed queda atrapado por debajo de la barra superior.
  return createPortal(
    <div
      ref={ref}
      className="lt-pop"
      style={pos ? { left: pos.left, top: pos.top } : { opacity: 0 }}
      role="dialog"
    >
      <div className="lt-pop-head">
        <div className="lt-av client">{initials(row.client_name)}</div>
        <div className="lt-pop-id">
          <div className="lt-pop-name">{row.client_name}</div>
          {row.client_type && (
            <span className={`lt-pop-type ${row.client_type}`}>
              {row.client_type === "buyer" ? "Comprador" : row.client_type === "tenant" ? "Inquilino" : "Lead"}
            </span>
          )}
        </div>
      </div>
      <div className="lt-pop-row">
        <span className="lt-pop-k">Correo</span>
        <span className="lt-pop-v">{row.client_email || "—"}</span>
      </div>
      <div className="lt-pop-row">
        <span className="lt-pop-k">Teléfono</span>
        <span className="lt-pop-v">{row.client_phone || "—"}</span>
      </div>
    </div>,
    document.body
  );
}

/** Panel lateral con la historia completa del lote. */
function TimelineDrawer({ row, onClose }) {
  const { showError } = useAppContext();
  const { data: events = [], isLoading, isError, error } = useQuery({
    queryKey: ["lot-timeline", row?.id],
    queryFn: () => lotService.timeline(row.id),
    enabled: !!row?.id,
  });

  useEscapeKey(onClose, !!row);

  useEffect(() => {
    if (isError) showError(error, "No se pudo cargar el historial del lote");
  }, [isError, error, showError]);

  if (!row) return null;

  const meta = STATUS_META[row.status] || STATUS_META.available;
  const venc = vencLabel(row.reserved_until);

  const facts = [
    row.reserved_by_name && ["Apartó", row.reserved_by_name],
    row.client_name && ["Cliente", row.client_name],
    row.closed_by_name && ["Cerró la venta", row.closed_by_name],
    row.buyer_name && ["Comprador", row.buyer_name],
    row.reserved_until && ["Vence", new Date(row.reserved_until).toLocaleDateString("es-MX")],
    row.contract_number && ["Contrato", row.contract_number],
    row.price_contado && ["Precio", currency(row.price_contado)],
    area(row.area_m2) && ["Superficie", area(row.area_m2)],
  ].filter(Boolean).slice(0, 4);

  // Portal a body por la misma razón que el popover: el stacking context de la
  // página dejaría el drawer por debajo de la barra superior.
  return createPortal(
    <>
      <div className="lt-overlay" onClick={onClose} />
      <aside className="lt-drawer" aria-label={`Historial del lote ${row.code}`}>
        <div className="lt-dr-head">
          <div className="lt-dr-top">
            {/* El código suele venir como "MZ4-L02": se parte por el guión para
                que quepa en dos líneas en vez de cortarse a mitad de palabra. */}
            <div className="lt-dr-badge">
              {row.code.split("-").map((part, i) => <span key={i}>{part}</span>)}
            </div>
            <div className="lt-dr-id">
              <div className="lt-dr-name">{row.code}</div>
              <div className="lt-dr-meta">
                {row.inmueble_name}
                {area(row.area_m2) ? ` · ${area(row.area_m2)}` : ""}
              </div>
            </div>
            <button className="lt-dr-close" onClick={onClose} aria-label="Cerrar">
              <HiXMark />
            </button>
          </div>
          <div className="lt-dr-status">
            <span className={`lt-pill ${meta.cls}`}><span className="lt-dot" />{meta.label}</span>
            {venc && <span className={`lt-venc ${venc.tone}`}>{venc.text}</span>}
          </div>
          {facts.length > 0 && (
            <div className="lt-dr-facts">
              {facts.map(([k, v]) => (
                <div className="lt-fact" key={k}>
                  <div className="lt-fact-k">{k}</div>
                  <div className="lt-fact-v">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lt-dr-body">
          <div className="lt-dr-sect">Historial del lote</div>
          {isLoading ? (
            <div className="lt-tl-empty">Cargando historial…</div>
          ) : events.length === 0 ? (
            <div className="lt-tl-empty">Sin movimientos registrados.</div>
          ) : (
            <div className="lt-feed">
              {events.map((e, i) => (
                <div className="lt-ev" key={i} data-tone={e.tone}>
                  {/* El texto viene ya redactado del backend, con <b> en los
                      nombres propios; no hay entrada de usuario sin escapar. */}
                  <div className="lt-ev-txt" dangerouslySetInnerHTML={{ __html: e.text }} />
                  <div className="lt-ev-time">
                    {new Date(e.at).toLocaleString("es-MX", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                  {e.detail && <div className="lt-ev-card">{e.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}

export default function LotTrackPage() {
  const { fracs = [], showError } = useAppContext();
  const [statusFilter, setStatusFilter] = useState("");
  const [fracFilter, setFracFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState(null);
  const [contact, setContact] = useState(null); // {anchor, row}

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Estables entre renders: son lo que permite que LotRow (memo) no se
  // vuelva a renderizar cada vez que se abre el contacto o el historial.
  const openRowHandler = useCallback((row) => setOpenRow(row), []);
  const openContactHandler = useCallback((anchor, row) => {
    setContact((c) => (c?.row.id === row.id ? null : { anchor, row }));
  }, []);
  const closeContact = useCallback(() => setContact(null), []);
  const closeRow = useCallback(() => setOpenRow(null), []);

  // Volver a la primera página al cambiar cualquier filtro: si estabas en la 4 y
  // el nuevo filtro deja 2 páginas, la consulta traería una página vacía.
  useEffect(() => { setPage(1); }, [statusFilter, fracFilter, debounced, sort]);

  const params = useMemo(() => ({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(fracFilter ? { inmueble_id: fracFilter } : {}),
    ...(debounced ? { search: debounced } : {}),
    sort,
    page,
    limit: PER_PAGE,
  }), [statusFilter, fracFilter, debounced, sort, page]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["lot-track", params],
    queryFn: () => lotService.track(params),
    // La página anterior queda en pantalla mientras llega la nueva, para que la
    // tabla no parpadee a vacío en cada paso del paginador.
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (isError) showError(error, "No se pudo cargar el track de lotes");
  }, [isError, error, showError]);

  const rows = data?.items || [];
  const totalRows = data?.total || 0;
  const totalPages = data?.pages || 1;
  const firstShown = totalRows === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const lastShown = Math.min(page * PER_PAGE, totalRows);

  return (
    <div className="lt-page">
      <div className="lt-header">
        <div>
          <h1 className="lt-title">Track de lotes</h1>
          <p className="lt-sub">
            Quién apartó cada lote, para qué cliente y quién cerró la venta.
          </p>
        </div>
      </div>

      <div className="lt-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`lt-filter${statusFilter === f.value ? " on" : ""}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <select
          className="lt-select"
          value={fracFilter}
          onChange={(e) => setFracFilter(e.target.value)}
        >
          <option value="">Todos los fraccionamientos</option>
          {fracs.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          className="lt-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Ordenar por"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          className="lt-search"
          placeholder="Buscar lote, cliente o vendedor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="lt-loading">Cargando lotes…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin lotes que mostrar"
          description={
            debounced || statusFilter || fracFilter
              ? "Ningún lote coincide con los filtros aplicados."
              : "Cuando cargues lotes y empieces a apartarlos, su seguimiento aparece aquí."
          }
        />
      ) : (
        <>
          <div className="lt-tablewrap">
            <table className="lt-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Estado</th>
                  <th>Recorrido · apartó → cerró</th>
                  <th>Cliente</th>
                  <th>Vence</th>
                  <th>Movimiento</th>
                  <th>Monto</th>
                  <th aria-label="Ver historial" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LotRow
                    key={row.id}
                    row={row}
                    onOpenRow={openRowHandler}
                    onOpenContact={openContactHandler}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="lt-foot">
            <span className="lt-count">
              {totalRows === 0
                ? "Sin lotes"
                : `${firstShown}–${lastShown} de ${totalRows} lote${totalRows === 1 ? "" : "s"}`}
            </span>
            {totalPages > 1 && (
              <div className="lt-pager">
                <button
                  className="lt-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  ← Anterior
                </button>
                <span className="lt-page-num">Página {page} de {totalPages}</span>
                <button
                  className="lt-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
          <div className="lt-hint">
            Click en la fila para el historial del lote · click en el ojito para el contacto del cliente
          </div>
        </>
      )}

      {contact && (
        <ContactPopover anchor={contact.anchor} row={contact.row} onClose={closeContact} />
      )}
      {openRow && <TimelineDrawer row={openRow} onClose={closeRow} />}
    </div>
  );
}
