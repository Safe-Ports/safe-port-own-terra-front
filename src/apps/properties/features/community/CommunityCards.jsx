import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { HiBanknotes, HiBuildingOffice2, HiCalendarDays, HiCheckCircle, HiExclamationTriangle, HiInboxStack, HiListBullet, HiMagnifyingGlass, HiPlus, HiScale, HiSquares2X2, HiUsers, HiXMark } from "react-icons/hi2";
import propertiesService from "@/services/propertiesService";
import { communityReferenceImage } from "./communityImages";
import { mediaQueryKey } from "../media/MediaGallery";
import { COMMUNITY_KIND_LABEL, communityAlerts } from "./communityModel";
import "./community-catalog.css";

const ALERT_ICON = { setup: HiExclamationTriangle, charges: HiBanknotes, reservations: HiCalendarDays, packages: HiInboxStack, votes: HiScale };
const ALERT_WEIGHT = { danger: 3, warning: 2, info: 1 };
const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
const PAGE = 24;
const VIEW_KEY = "ownterra_community_catalog_view";
const SORTS = [["attention", "Lo que requiere atención"], ["name", "Nombre (A–Z)"], ["units", "Más unidades"]];
const STATUS = [["all", "Todas"], ["pending", "Con pendientes"], ["clear", "Al día"]];

/** Minúsculas y sin acentos: "Jacarandás" encuentra "jacarandas". */
export const normalize = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Filtra y ordena el catálogo. Exportado para probarlo sin pintar tarjetas. */
export function filterCommunities(rows, { query = "", kind = "all", status = "all", sort = "attention" } = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const found = rows.filter((row) => {
    if (kind !== "all" && row.community.kind !== kind) return false;
    if (status === "pending" && !row.alerts.length) return false;
    if (status === "clear" && row.alerts.length) return false;
    return words.every((word) => row.haystack.includes(word));
  });
  const byName = (a, b) => a.community.name.localeCompare(b.community.name, "es");
  return found.sort(sort === "name" ? byName : sort === "units" ? (a, b) => b.units - a.units || byName(a, b) : (a, b) => b.urgency - a.urgency || byName(a, b));
}

// Portada = primera imagen de la galería del inmueble. Comparte la caché con
// MediaGallery: al subir o cambiar la portada, la tarjeta se actualiza sola.
// Sólo se piden las portadas de las tarjetas visibles, no de todo el catálogo.
function useCommunityCovers(communities) {
  // Sin inmueble no hay galería; además, varias llaves `undefined` chocarían en caché.
  const withMedia = communities.filter((community) => community.inmuebleId);
  const results = useQueries({
    queries: withMedia.map((community) => ({
      queryKey: mediaQueryKey("inmueble", community.inmuebleId),
      queryFn: async () => { const assets = await propertiesService.media.list("inmueble", community.inmuebleId); if (!Array.isArray(assets)) throw new Error("La galería recibió una respuesta inesperada."); return assets; },
      enabled: Boolean(community.inmuebleId),
      staleTime: 4 * 60 * 1000,
      retry: false,
    })),
  });
  return Object.fromEntries(withMedia.map((community, index) => {
    const image = (results[index]?.data || []).find((asset) => asset.content_type?.startsWith("image/") && asset.url);
    return [community.id, image?.url || ""];
  }));
}

function readView() { try { return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; } catch { return "cards"; } }

function AlertButtons({ row, onAlert }) {
  return row.alerts.length ? row.alerts.map((alert) => {
    const Icon = ALERT_ICON[alert.key];
    const text = alert.amount ? `${alert.label} · ${money(alert.amount)}` : alert.label;
    return <button type="button" key={alert.key} className={`community-alert ${alert.tone}`} onClick={() => onAlert(row.community, alert)} title={text} aria-label={`${row.community.name}: ${text}`}>
      <Icon aria-hidden="true" />{alert.count ? <span>{alert.count}</span> : null}
    </button>;
  }) : <span className="community-card-clear"><HiCheckCircle aria-hidden="true" /> Sin pendientes</span>;
}

function CommunityCards({ onCreate, communities, selectedId, expanded = false, onSelect, onOpenUnits, onAlert, data }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("attention");
  const [view, setView] = useState(readView);
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef(null);

  // Una sola pasada sobre unidades y relaciones (antes se filtraba todo por cada tarjeta).
  const rows = useMemo(() => {
    const unitsByRoot = new Map();
    data.units.forEach((unit) => { if (unit.status !== "archived") unitsByRoot.set(unit.propertyId, (unitsByRoot.get(unit.propertyId) || 0) + 1); });
    const peopleByCommunity = new Map();
    data.personUnitRelations.forEach((relation) => {
      if (relation.status === "archived") return;
      if (!peopleByCommunity.has(relation.communityId)) peopleByCommunity.set(relation.communityId, new Set());
      peopleByCommunity.get(relation.communityId).add(relation.personId);
    });
    const propertyById = new Map((data.properties || []).map((property) => [property.id, property]));
    return communities.map((community) => {
      const alerts = communityAlerts({ community, units: data.units, relations: data.personUnitRelations, charges: data.condoCharges, packages: data.packages, reservations: data.reservations, votes: data.votes });
      const property = propertyById.get(community.propertyId);
      return {
        community,
        alerts,
        units: unitsByRoot.get(community.propertyId) || 0,
        people: peopleByCommunity.get(community.id)?.size || 0,
        urgency: alerts.reduce((sum, alert) => sum + (ALERT_WEIGHT[alert.tone] || 0) * 10 + (alert.count || 1), 0),
        place: [property?.city, property?.state].filter(Boolean).join(", "),
        haystack: normalize([community.name, COMMUNITY_KIND_LABEL[community.kind], property?.address, property?.city, property?.state].join(" ")),
      };
    });
  }, [communities, data]);

  const kinds = useMemo(() => [...new Set(communities.map((community) => community.kind).filter(Boolean))], [communities]);
  const visible = useMemo(() => filterCommunities(rows, { query, kind, status, sort }), [rows, query, kind, status, sort]);
  const shown = visible.slice(0, limit);
  const covers = useCommunityCovers(view === "cards" ? shown.map((row) => row.community) : []);
  const filtered = Boolean(query.trim()) || kind !== "all" || status !== "all";
  const pendingCount = rows.filter((row) => row.alerts.length).length;

  useEffect(() => { setLimit(PAGE); }, [query, kind, status, sort]);
  useEffect(() => { try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* sin almacenamiento: vuelve a tarjetas */ } }, [view]);
  // "/" lleva a la búsqueda, como en la mayoría de los catálogos.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || /input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable) return;
      event.preventDefault(); searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const clear = () => { setQuery(""); setKind("all"); setStatus("all"); searchRef.current?.focus(); };

  return <div className="community-catalog">
    <div className="community-catalog-bar" role="search">
      <label className="community-catalog-search">
        <HiMagnifyingGlass aria-hidden="true" />
        <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && query) { event.stopPropagation(); setQuery(""); } }} placeholder="Buscar por nombre, tipo o ciudad" aria-label="Buscar comunidad" />
        {query ? <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Borrar búsqueda"><HiXMark /></button> : <kbd aria-hidden="true">/</kbd>}
      </label>
      <div className="community-catalog-status" role="radiogroup" aria-label="Filtrar por pendientes">
        {STATUS.map(([key, label]) => <button type="button" role="radio" key={key} aria-checked={status === key} onClick={() => setStatus(key)}>{label}{key === "pending" && pendingCount ? <i>{pendingCount}</i> : null}</button>)}
      </div>
      {kinds.length > 1 ? <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Tipo de comunidad"><option value="all">Todos los tipos</option>{kinds.map((value) => <option key={value} value={value}>{COMMUNITY_KIND_LABEL[value] || value}</option>)}</select> : null}
      <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar">{SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <div className="community-catalog-view" role="radiogroup" aria-label="Vista">
        <button type="button" role="radio" aria-checked={view === "cards"} onClick={() => setView("cards")} aria-label="Tarjetas" title="Tarjetas"><HiSquares2X2 /></button>
        <button type="button" role="radio" aria-checked={view === "list"} onClick={() => setView("list")} aria-label="Lista" title="Lista"><HiListBullet /></button>
      </div>
      {onCreate ? <button type="button" className="community-catalog-create" onClick={onCreate}><HiPlus aria-hidden="true" /> Crear comunidad</button> : null}
    </div>
    <p className="community-catalog-count" aria-live="polite">{filtered ? `${visible.length} de ${rows.length} comunidades` : `${rows.length} ${rows.length === 1 ? "comunidad" : "comunidades"}`}{sort === "attention" && pendingCount ? " · primero las que necesitan atención" : ""}</p>

    {!visible.length ? <div className="community-catalog-empty"><HiMagnifyingGlass aria-hidden="true" /><strong>Ninguna comunidad coincide{query.trim() ? ` con “${query.trim()}”` : ""}</strong><p>Prueba con otra palabra o quita los filtros.</p><button type="button" onClick={clear}>Quitar filtros</button></div>
      : view === "list" ? <div className="community-list-view" role="table" aria-label="Comunidades">
        <div role="row" className="community-list-head"><span role="columnheader">Comunidad</span><span role="columnheader">Unidades</span><span role="columnheader">Personas</span><span role="columnheader">Pendientes</span><span role="columnheader"><span className="sr-only">Acciones</span></span></div>
        {shown.map((row) => <div role="row" key={row.community.id} className={row.community.id === selectedId ? "is-selected" : ""}>
          <span role="cell"><button type="button" className="community-list-name" onClick={() => onSelect(row.community.id)}><strong>{row.community.name}</strong><small>{COMMUNITY_KIND_LABEL[row.community.kind] || "Comunidad"}{row.place ? ` · ${row.place}` : ""}</small></button></span>
          <span role="cell">{row.units}</span>
          <span role="cell">{row.people}</span>
          <span role="cell" className="community-list-alerts"><AlertButtons row={row} onAlert={onAlert} /></span>
          <span role="cell"><button type="button" className="community-list-open" onClick={() => (onOpenUnits || onSelect)(row.community.id)} aria-label={`Ver unidades de ${row.community.name}`}>Ver unidades →</button></span>
        </div>)}
      </div>
      : <section className="community-cards" aria-label="Comunidades">
        {shown.map((row) => {
          const { community } = row;
          const selected = community.id === selectedId;
          const cover = covers[community.id] || communityReferenceImage(community.id).src;
          return <article key={community.id} className={`community-card ${selected ? "is-selected" : ""}`}>
            <button type="button" className="community-card-main" onClick={() => onSelect(community.id)} aria-pressed={selected} aria-expanded={selected ? expanded : undefined} aria-controls={selected ? "community-detail" : undefined}>
              <span className="community-card-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <HiBuildingOffice2 aria-hidden="true" />}</span>
              <span className="community-card-copy">
                <strong>{community.name}</strong>
                <small>{COMMUNITY_KIND_LABEL[community.kind] || "Comunidad"}</small>{!covers[community.id] ? <small className="community-card-reference" aria-hidden="true">Foto sugerida</small> : null}
                <span className="community-card-counts">
                  <i title="Unidades"><HiBuildingOffice2 aria-hidden="true" /> {row.units}<span className="sr-only"> unidades</span></i>
                  <i title="Personas vinculadas"><HiUsers aria-hidden="true" /> {row.people}<span className="sr-only"> personas vinculadas</span></i>
                </span>
              </span>
              {selected ? <b className="community-card-badge">Seleccionada</b> : null}
            </button>
            <button type="button" className="community-card-units" onClick={() => (onOpenUnits || onSelect)(community.id)} aria-label={`Ver unidades de ${community.name}`}>Ver unidades →</button>
            <footer className="community-card-alerts"><AlertButtons row={row} onAlert={onAlert} /></footer>
          </article>;
        })}
      </section>}

    {visible.length > shown.length ? <button type="button" className="community-catalog-more" onClick={() => setLimit((value) => value + PAGE)}>Mostrar {Math.min(PAGE, visible.length - shown.length)} más · quedan {visible.length - shown.length}</button> : null}
  </div>;
}

export default CommunityCards;
