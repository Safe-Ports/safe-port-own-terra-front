import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import EmptyState from "@/components/ui/EmptyState";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import Button from "@/components/Button";
import { lotService } from "@/services/lotService";
import { appointmentService } from "@/services/appointmentService";
import { currency } from "@/services/formatters";
import useEscapeKey from "@/hooks/useEscapeKey";
import "./fracs.css";

const LOT_COLORS = {
  available: { label: "Disponible", className: "available", color: "#6FAF6B" },
  reserved: { label: "Apartado", className: "reserved", color: "#B98C58" },
  sold: { label: "Vendido", className: "sold", color: "#C0392B" },
};

const SERVICES = [
  { k: "agua", lbl: "Agua potable" },
  { k: "luz", lbl: "Energia electrica" },
  { k: "drenaje", lbl: "Drenaje" },
  { k: "gas", lbl: "Gas natural" },
  { k: "internet", lbl: "Internet/Fibra" },
  { k: "pavimento", lbl: "Pavimento" },
];

const LOT_CODE_COLLATOR = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });

function compareLotsByCode(a, b) {
  return LOT_CODE_COLLATOR.compare(String(a.code || ""), String(b.code || ""));
}

function calcMonthly(priceF, enganche, tasaAnual, plazo) {
  const pv = Number(priceF) - Number(enganche);
  if (pv <= 0 || plazo <= 0) return 0;
  if (Number(tasaAnual) === 0) return pv / plazo;
  const r = Number(tasaAnual) / 100 / 12;
  return (pv * r) / (1 - Math.pow(1 + r, -plazo));
}

function generateAmort(priceF, enganche, tasaAnual, plazo) {
  const pv = Number(priceF) - Number(enganche);
  if (pv <= 0 || plazo <= 0) return [];
  const r = Number(tasaAnual) / 100 / 12;
  const payment = r === 0 ? pv / plazo : (pv * r) / (1 - Math.pow(1 + r, -plazo));
  const rows = [];
  let balance = pv;
  for (let i = 1; i <= plazo; i += 1) {
    const interest = balance * r;
    const capital = payment - interest;
    const newBalance = Math.max(0, balance - capital);
    rows.push({ n: i, saldoInicial: balance, capital, interes: interest, cuota: payment, saldoFinal: newBalance });
    balance = newBalance;
  }
  return rows;
}


async function fetchAllFracLots(inmuebleId) {
  const limit = 200;
  const firstPage = await lotService.list({ inmueble_id: inmuebleId, page: 1, limit });
  const totalPages = firstPage.pages || 1;

  if (totalPages <= 1) return firstPage.items || [];

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      lotService
        .list({ inmueble_id: inmuebleId, page: index + 2, limit })
        .then((response) => response.items || [])
    )
  );

  return [...(firstPage.items || []), ...remainingPages.flat()];
}

function StatusBadge({ status }) {
  const meta = LOT_COLORS[status] || LOT_COLORS.available;
  return (
    <span className={`frac-status-badge ${meta.className}`}>
      <i />
      {meta.label}
    </span>
  );
}

/* Tiempo restante de un apartado → texto + tono (ok/amber/red). */
function reservationLeft(untilISO) {
  if (!untilISO) return null;
  const ms = new Date(untilISO) - Date.now();
  if (ms <= 0) return { text: "Apartado vencido", tone: "red" };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days === 0) return { text: `Vence hoy · ${hours} h`, tone: "red" };
  if (days <= 2) return { text: `Vence en ${days} d ${hours} h`, tone: "amber" };
  return { text: `Vence en ${days} días`, tone: "ok" };
}

/* Date → valor para <input type="datetime-local"> en hora local. */
function toLocalInput(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function MapViewer({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const onWheel = useCallback((event) => {
    event.preventDefault();
    setScale((s) => Math.min(8, Math.max(0.5, s - event.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="frac-map-viewer" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="frac-map-toolbar">
        <span>Plano de referencia</span>
        <div>
          <button onClick={() => setScale((s) => Math.min(8, s + 0.25))}>+</button>
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>-</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>{Math.round(scale * 100)}%</button>
          <button onClick={onClose}>x</button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="frac-map-canvas"
        onMouseDown={(event) => {
          dragging.current = true;
          last.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseMove={(event) => {
          if (!dragging.current) return;
          setOffset((o) => ({ x: o.x + event.clientX - last.current.x, y: o.y + event.clientY - last.current.y }));
          last.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
      >
        <img
          src={src}
          alt="Plano"
          draggable={false}
          style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})` }}
        />
      </div>
    </div>
  );
}

function FracsPage() {
  const {
    fracs,
    selectedFracId,
    setSelectedFracId,
    exportAppData,
    showToast,
    showError,
    setDraftProject,
    fracsResetKey,
  } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  // Qué proyecto está ABIERTO en esta vista (galería vs. detalle). Es local a la
  // página: el `selectedFracId` global se auto-reselecciona en el contexto (lo usan
  // los contratos), así que no sirve para "sin selección". null = galería.
  const [openFracId, setOpenFracId] = useState(null);

  const openFrac = (id) => { setOpenFracId(id); setSelectedFracId(id); };

  // Arrancamos siempre en la galería y volvemos a ella cuando cambia el set.
  useEffect(() => {
    setOpenFracId(null);
  }, [fracsResetKey]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [activeTab, setActiveTab] = useState("ficha");
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [showCotizador, setShowCotizador] = useState(false);
  const [cotPrecioF, setCotPrecioF] = useState(0);
  const [cotEnganche, setCotEnganche] = useState(0);
  const [cotTasa, setCotTasa] = useState(12);
  const [cotPlazo, setCotPlazo] = useState(96);
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptDraft, setApptDraft] = useState({ contact_name: "", contact_phone: "", date: "", time: "", notes: "" });
  const [apptSaving, setApptSaving] = useState(false);
  const [apartarOpen, setApartarOpen] = useState(false);
  const [apartarUntil, setApartarUntil] = useState("");   // datetime-local
  const [apartarBusy, setApartarBusy] = useState(false);
  useEscapeKey(() => {
    if (showCotizador) setShowCotizador(false);
    else if (showLotModal) setShowLotModal(false);
  }, showCotizador || showLotModal);

  const selectedFrac = fracs.find((f) => f.id === openFracId) || null;

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ["lots", selectedFrac?.id],
    queryFn: () => fetchAllFracLots(selectedFrac.id),
    enabled: !!selectedFrac?.id,
  });
  const lots = lotsData || [];

  const { data: apptData = [], refetch: refetchAppts } = useQuery({
    queryKey: ["appointments", selectedLotId],
    queryFn: () => appointmentService.list({ lot_id: selectedLotId, upcoming_only: true }),
    enabled: !!selectedLotId,
  });

  const selectedLot = lots.find((lot) => lot.id === selectedLotId) || null;
  const resLeft = selectedLot?.status === "reserved" ? reservationLeft(selectedLot.reserved_until) : null;
  const sections = useMemo(() => [...new Set(lots.map((lot) => lot.section || "General"))], [lots]);

  const filteredLots = useMemo(
    () =>
      lots
        .filter((lot) => {
          const matchesStatus = statusFilter === "all" || lot.status === statusFilter;
          const matchesSection = !sectionFilter || (lot.section || "General") === sectionFilter;
          const haystack = `${lot.code} ${lot.section || ""}`.toLowerCase();
          const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
          return matchesStatus && matchesSection && matchesSearch;
        })
        .sort(compareLotsByCode),
    [lots, statusFilter, sectionFilter, search]
  );

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return fracs;
    return fracs.filter((frac) => frac.name.toLowerCase().includes(q));
  }, [fracs, projectSearch]);

  const stats = useMemo(() => ({
    total: lots.length,
    available: lots.filter((lot) => lot.status === "available").length,
    reserved: lots.filter((lot) => lot.status === "reserved").length,
    sold: lots.filter((lot) => lot.status === "sold").length,
  }), [lots]);

  const monthly = calcMonthly(cotPrecioF, cotEnganche, cotTasa, cotPlazo);
  const financed = Math.max(0, Number(cotPrecioF) - Number(cotEnganche));
  const quoteTotal = monthly > 0 ? monthly * Number(cotPlazo) + Number(cotEnganche) : 0;

  useEffect(() => {
    setSelectedLotId(null);
    setStatusFilter("all");
    setSearch("");
    setSectionFilter("");
    setActiveTab("ficha");
    setShowLotModal(false);
  }, [selectedFrac?.id]);

  useEffect(() => {
    if (!selectedLotId && lots[0]) setSelectedLotId(lots[0].id);
  }, [lots, selectedLotId]);

  useEffect(() => {
    if (!selectedLot) return;
    setCotPrecioF(Number(selectedLot.price_financiado || selectedLot.price_contado || 0));
    setCotEnganche(0);
  }, [selectedLot?.id]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setShowLotModal(false);
        setShowCotizador(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!fracs.length) {
    return (
      <EmptyState
        icon="▦"
        title="Sin fraccionamientos creados"
        description="Carga un plano, arma la matriz de lotes y crea tu primer proyecto desde la seccion Carga de Lotes."
        action={<Link className="mobile-primary-button" to="/lotes">Ir a Carga de Lotes</Link>}
      />
    );
  }

  if (!selectedFrac) {
    return (
      <div className="frac-gallery-page">
        <header className="frac-gallery-head">
          <div className="frac-gallery-heading">
            <div className="frac-eyebrow">OwnTerra Lands</div>
            <h1>Proyectos</h1>
            <p>{fracs.length} fraccionamiento{fracs.length === 1 ? "" : "s"} activo{fracs.length === 1 ? "" : "s"}. Elige uno para ver su plano, inventario de lotes y cotizador.</p>
          </div>
          <label className="frac-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>
            <input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Buscar proyecto" />
          </label>
        </header>

        {filteredProjects.length ? (
          <div className="frac-gallery-grid">
            {filteredProjects.map((frac) => (
              <button
                key={frac.id}
                className="frac-gallery-card"
                onClick={() => openFrac(frac.id)}
              >
                <span className="frac-gallery-thumb">
                  {frac.image_url
                    ? <img src={frac.image_url} alt={`Plano de ${frac.name}`} loading="lazy" />
                    : <span className="frac-gallery-thumb-empty">🗺️</span>}
                </span>
                <span className="frac-gallery-body">
                  <span className="frac-gallery-name">{frac.name}</span>
                  <span className="frac-gallery-meta">
                    <span>{frac.total_lots ?? 0} lotes</span>
                    {frac.created_at ? <span>{new Date(frac.created_at).toLocaleDateString("es-MX")}</span> : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="frac-gallery-empty">No hay proyectos que coincidan con “{projectSearch}”.</div>
        )}

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Fraccionamientos"
        subtitle="Gestión táctil de tu inventario de lotes con plano interactivo."
        steps={[
          { title: "Seleccionar proyecto", text: "La galería muestra todos tus fraccionamientos con la miniatura de su plano. Haz clic en uno para ver su plano interactivo y la matriz de lotes; usa la flecha ‹ Proyectos para volver." },
          { title: "Plano interactivo", text: "Usa el scroll o pinch para hacer zoom. Haz clic en el plano para ver los lotes superpuestos con su estado (disponible, apartado, vendido)." },
          { title: "Filtrar lotes", text: "Los botones de estado en la barra superior filtran los lotes visibles en el plano. Combínalos con la búsqueda por sección o código." },
          { title: "Ficha de lote", text: "Selecciona un lote para ver su ficha completa: medidas, servicios disponibles, precio de contado y financiado, y vendedor asignado." },
          { title: "Cotizador integrado", text: "Desde la ficha del lote puedes abrir el cotizador para simular el plan de pagos con amortización francesa o alemana." },
          { title: "Agendar visita", text: "El botón 'Agendar' en la ficha del lote crea una cita en la agenda central vinculada al lote y al contacto del prospecto." },
        ]}
      />
    </div>
    );
  }

  const openLot = (lot) => {
    setSelectedLotId(lot.id);
    setShowLotModal(true);
    setActiveTab("ficha");
  };

  const openEditor = () => {
    const sectionMap = {};
    lots.forEach((lot) => {
      const sec = lot.section || "General";
      if (!sectionMap[sec]) sectionMap[sec] = { id: `sec_${sec}`, name: sec, lots: [] };
      sectionMap[sec].lots.push({
        id: lot.id,
        _backendId: lot.id,
        _orig: {
          status: lot.status || "available",
          code: lot.code ?? "",
          area: lot.area_m2 ?? "",
          price: lot.price_contado ?? "",
          priceFinanciado: lot.price_financiado ?? "",
          frente: lot.frente_ml ?? "",
          fondo: lot.fondo_ml ?? "",
          servicios: JSON.stringify(lot.services || {}),
        },
        code: lot.code,
        status: lot.status || "available",
        area: lot.area_m2 ?? "",
        price: lot.price_contado ?? "",
        priceFinanciado: lot.price_financiado ?? "",
        frente: lot.frente_ml ?? "",
        fondo: lot.fondo_ml ?? "",
        servicios: lot.services || {},
      });
    });
    setDraftProject({
      mode: "editor",
      name: selectedFrac.name,
      mapUrl: selectedFrac.image_url || "",
      cadProcessing: false,
      sections: Object.values(sectionMap),
      _editingFracId: selectedFrac.id,
    });
    navigate("/lotes");
  };


  const saveAppointment = async () => {
    if (!selectedLot || !apptDraft.contact_name.trim() || !apptDraft.date || !apptDraft.time) return;
    setApptSaving(true);
    try {
      await appointmentService.create({
        lot_id: selectedLot.id,
        contact_name: apptDraft.contact_name.trim(),
        contact_phone: apptDraft.contact_phone.trim() || undefined,
        scheduled_at: new Date(`${apptDraft.date}T${apptDraft.time}`).toISOString(),
        notes: apptDraft.notes.trim() || undefined,
      });
      await refetchAppts();
      setApptDraft({ contact_name: "", contact_phone: "", date: "", time: "", notes: "" });
      setShowApptForm(false);
      showToast("Cita agendada");
    } catch (err) {
      showError(err, "Error al agendar la cita");
    } finally {
      setApptSaving(false);
    }
  };

  // ── Apartado con expiración ──────────────────────────────────────────────
  const reserveLot = async () => {
    if (!selectedLot || !apartarUntil) return;
    setApartarBusy(true);
    try {
      await lotService.update(selectedLot.id, {
        status: "reserved",
        reserved_until: new Date(apartarUntil).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setApartarOpen(false); setApartarUntil("");
      showToast("Lote apartado");
    } catch (err) {
      showError(err, "No se pudo apartar el lote");
    } finally {
      setApartarBusy(false);
    }
  };

  const extendReservation = async () => {
    if (!selectedLot || !apartarUntil) return;
    setApartarBusy(true);
    try {
      await lotService.update(selectedLot.id, {
        reserved_until: new Date(apartarUntil).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setApartarOpen(false); setApartarUntil("");
      showToast("Vencimiento actualizado");
    } catch (err) {
      showError(err, "No se pudo extender el apartado");
    } finally {
      setApartarBusy(false);
    }
  };

  const releaseLot = async () => {
    if (!selectedLot) return;
    setApartarBusy(true);
    try {
      await lotService.update(selectedLot.id, { status: "available" });
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      showToast("Lote liberado");
    } catch (err) {
      showError(err, "No se pudo liberar el lote");
    } finally {
      setApartarBusy(false);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await appointmentService.cancel(id);
      await refetchAppts();
      showToast("Cita cancelada");
    } catch (err) {
      showError(err, "Error al cancelar");
    }
  };

  return (
    <div className="frac-page frac-page-detail">
      <section className="frac-workspace">
        <div className="frac-detail-bar">
          <button className="frac-back" onClick={() => setOpenFracId(null)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 5 8l5 5"/></svg>
            Proyectos
          </button>
          <div className="frac-detail-head">
            <div className="frac-eyebrow">OwnTerra Lands</div>
            <h1>{selectedFrac.name}</h1>
          </div>
          <div className="frac-hero-actions">
            <Button variant="secondary" onClick={() => selectedFrac.image_url && setShowMapViewer(true)} disabled={!selectedFrac.image_url}>Ver plano</Button>
            <Button variant="secondary" onClick={openEditor}>Editar</Button>
            <Button variant="secondary" onClick={() => exportAppData("lots")}>Exportar</Button>
          </div>
        </div>

        <div className="frac-kpis">
          <article className="frac-kpi deep"><span>Total lotes</span><strong>{stats.total}</strong><small>{sections.length} secciones</small></article>
          <article className="frac-kpi available"><span>Disponibles</span><strong>{stats.available}</strong><small>{stats.total ? Math.round((stats.available / stats.total) * 100) : 0}% inventario</small></article>
          <article className="frac-kpi reserved"><span>Apartados</span><strong>{stats.reserved}</strong><small>seguimiento activo</small></article>
          <article className="frac-kpi sold"><span>Vendidos</span><strong>{stats.sold}</strong><small>cerrados</small></article>
        </div>

        <div className="frac-filters">
          <div className="frac-segment">
            {[
              ["all", "Todos"],
              ["available", "Disponible"],
              ["reserved", "Apartado"],
              ["sold", "Vendido"],
            ].map(([value, label]) => (
              <button key={value} className={statusFilter === value ? "on" : ""} onClick={() => setStatusFilter(value)}>
                {value !== "all" ? <i className={`frac-dot ${LOT_COLORS[value].className}`} /> : null}
                {label}
              </button>
            ))}
          </div>
          <select className="frac-field" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
            <option value="">Todas las secciones</option>
            {sections.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>
          <label className="frac-search grow">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lote o manzana" />
          </label>
          {(statusFilter !== "all" || sectionFilter || search) && (
            <button className="frac-clear" onClick={() => { setStatusFilter("all"); setSectionFilter(""); setSearch(""); }}>Limpiar</button>
          )}
        </div>

        <div className="frac-matrix-grid">
          <article className="frac-panel frac-plan-panel">
            <div className="frac-panel-head">
              <div>
                <div className="frac-panel-title">Plano de referencia</div>
                <div className="frac-panel-sub">Vista del fraccionamiento</div>
              </div>
              <button className="frac-icon-btn" onClick={() => selectedFrac.image_url && setShowMapViewer(true)} disabled={!selectedFrac.image_url}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 5 1 1 5 1"/><polyline points="11 1 15 1 15 5"/><polyline points="15 11 15 15 11 15"/><polyline points="5 15 1 15 1 11"/></svg>
              </button>
            </div>
            <div className="frac-plan-body" onClick={() => selectedFrac.image_url && setShowMapViewer(true)}>
              {selectedFrac.image_url ? (
                <img src={selectedFrac.image_url} alt="Plano" />
              ) : (
                <div className="frac-plan-empty">
                  <strong>Sin plano</strong>
                  <span>Sube uno al crear el fraccionamiento</span>
                </div>
              )}
              {selectedFrac.image_url ? <span className="frac-zoom-badge">Zoom</span> : null}
            </div>
            <div className="frac-legend">
              <span><i className="available" />Disponible</span>
              <span><i className="reserved" />Apartado</span>
              <span><i className="sold" />Vendido</span>
            </div>
          </article>

          <article className="frac-panel frac-lots-panel">
            <div className="frac-panel-head">
              <div>
                <div className="frac-panel-title">Matriz de lotes</div>
                <div className="frac-panel-sub">Selecciona un lote para revisar ficha, gestion y cotizacion</div>
              </div>
              <StatusBadge status="available" />
            </div>
            <div className="frac-lots-scroll">
              {lotsLoading ? (
                <div className="frac-empty">Cargando lotes...</div>
              ) : (
                <>
                  {sections.filter((section) => !sectionFilter || section === sectionFilter).map((section) => {
                    const sectionLots = filteredLots.filter((lot) => (lot.section || "General") === section);
                    if (!sectionLots.length) return null;
                    return (
                      <section className="frac-section" key={section}>
                        <div className="frac-section-head">
                          <span>{section}</span>
                          <small>{sectionLots.length} lotes</small>
                        </div>
                        <div className="frac-lot-grid">
                          {sectionLots.map((lot) => {
                            const meta = LOT_COLORS[lot.status] || LOT_COLORS.available;
                            const precio = lot.price_contado || lot.price_financiado;
                            return (
                              <button
                                key={lot.id}
                                className={`frac-lot-tile ${meta.className} ${lot.id === selectedLot?.id ? "active" : ""}`}
                                onClick={() => openLot(lot)}
                              >
                                <i />
                                <strong>{lot.code}</strong>
                                <span>{lot.area_m2 ? `${lot.area_m2} m2` : "Sin area"}</span>
                                {precio ? <em className="frac-lot-price">{currency(precio)}</em> : null}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                  {!filteredLots.length ? <div className="frac-empty">Sin lotes que coincidan</div> : null}
                </>
              )}
            </div>
          </article>
        </div>
      </section>

      <article className={`frac-quote ${quoteOpen ? "open" : "collapsed"}`}>
        <button className="frac-quote-head" onClick={() => setQuoteOpen((value) => !value)}>
          <span className="frac-quote-icon">$</span>
          <span>
            <strong>Cotizador rapido</strong>
            <small>{selectedLot ? `Lote ${selectedLot.code}` : "Selecciona un lote"}</small>
          </span>
          <svg className="frac-quote-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
        </button>
        <div className="frac-quote-body">
          <div className="frac-quote-result">
            <span>Mensualidad estimada</span>
            <strong>{monthly > 0 ? currency(Math.round(monthly)) : "--"}</strong>
            <small>{cotPlazo} meses / {cotTasa}% anual</small>
          </div>
          <div className="frac-quote-rows">
            <span>Precio financiado <strong>{currency(Number(cotPrecioF || 0))}</strong></span>
            <span>Enganche <strong>{currency(Number(cotEnganche || 0))}</strong></span>
            <span>A financiar <strong>{currency(Math.round(financed))}</strong></span>
            <span>Total estimado <strong>{currency(Math.round(quoteTotal || 0))}</strong></span>
          </div>
          <button className="frac-quote-full" onClick={() => setShowCotizador(true)} disabled={!selectedLot}>Abrir cotizador completo</button>
        </div>
      </article>

      {showLotModal && selectedLot ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowLotModal(false)}>
          <article className="frac-lot-modal">
            <div className="frac-modal-head">
              <div className="frac-modal-id">{selectedLot.code}</div>
              <div>
                <h2>Detalle del lote</h2>
                <p>{selectedFrac.name} / {selectedLot.section || "General"} / {selectedLot.area_m2 || 0} m2</p>
              </div>
              <StatusBadge status={selectedLot.status} />
              {resLeft ? <span className={`frac-countdown ${resLeft.tone}`}>{resLeft.text}</span> : null}
              <button className="frac-modal-close" onClick={() => setShowLotModal(false)}>×</button>
            </div>
            <div className="frac-modal-body">
              <div className="frac-tabs">
                {["ficha", "gestion", "documentos"].map((tab) => (
                  <button key={tab} className={activeTab === tab ? "on" : ""} onClick={() => setActiveTab(tab)}>
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === "ficha" ? (
                <>
                  <div className="frac-detail-grid">
                    <div><strong>{selectedLot.frente_ml || "--"}</strong><span>Frente ML</span></div>
                    <div><strong>{selectedLot.fondo_ml || "--"}</strong><span>Fondo ML</span></div>
                    <div><strong>{selectedLot.area_m2 || "--"}</strong><span>Superficie m2</span></div>
                    {selectedLot.price_contado
                      ? <div className="frac-detail-price"><strong>{currency(selectedLot.price_contado)}</strong><span>Precio Contado</span></div>
                      : null}
                    {selectedLot.price_financiado
                      ? <div className="frac-detail-price"><strong>{currency(selectedLot.price_financiado)}</strong><span>Precio Financiado</span></div>
                      : null}
                  </div>

                  <div className="frac-services">
                    {SERVICES.map((service) => {
                      const on = !!(selectedLot.services?.[service.k]);
                      return (
                        <label key={service.k} className="frac-service">
                          <span>{service.lbl}</span>
                          <input type="checkbox" checked={on} readOnly disabled />
                          <i className={on ? "on" : ""} />
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {activeTab === "gestion" ? (
                <div className="frac-management">
                  <div className="frac-section-label">Estado actual</div>
                  <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <StatusBadge status={selectedLot.status} />
                    {resLeft ? <span className={`frac-countdown ${resLeft.tone}`}>{resLeft.text}</span> : null}
                  </div>

                  {/* Apartado con expiración */}
                  {selectedLot.status === "reserved" ? (
                    <div className="frac-apartar">
                      <div className="frac-apartar-meta">
                        Apartado desde {selectedLot.reserved_at ? new Date(selectedLot.reserved_at).toLocaleDateString("es-MX") : "—"}
                        {" · "}vence {selectedLot.reserved_until ? new Date(selectedLot.reserved_until).toLocaleString("es-MX") : "—"}
                      </div>
                      <div className="frac-apartar-btns">
                        <button onClick={() => { setApartarOpen((v) => !v); setApartarUntil(selectedLot.reserved_until ? toLocalInput(new Date(selectedLot.reserved_until)) : ""); }}>
                          {apartarOpen ? "Cancelar" : "Extender vencimiento"}
                        </button>
                        <button className="frac-apartar-release" onClick={releaseLot} disabled={apartarBusy}>Liberar lote</button>
                      </div>
                    </div>
                  ) : selectedLot.status === "available" ? (
                    <div className="frac-apartar">
                      <button className="frac-apartar-cta" onClick={() => { setApartarOpen((v) => !v); if (!apartarOpen) setApartarUntil(toLocalInput(new Date(Date.now() + 7 * 86400000))); }}>
                        {apartarOpen ? "Cancelar" : "🔖 Apartar lote"}
                      </button>
                    </div>
                  ) : null}

                  {apartarOpen && selectedLot.status !== "sold" ? (
                    <div className="frac-apartar-form">
                      <label className="frac-appt-lbl">Vence el</label>
                      <div className="frac-apartar-presets">
                        {[[3, "3 días"], [7, "7 días"], [15, "15 días"], [30, "30 días"]].map(([n, l]) => (
                          <button type="button" key={n} onClick={() => setApartarUntil(toLocalInput(new Date(Date.now() + n * 86400000)))}>{l}</button>
                        ))}
                      </div>
                      <input
                        type="datetime-local"
                        className="frac-apartar-input"
                        value={apartarUntil}
                        min={toLocalInput(new Date())}
                        onChange={(e) => setApartarUntil(e.target.value)}
                      />
                      <Button
                        variant="primary"
                        onClick={selectedLot.status === "reserved" ? extendReservation : reserveLot}
                        disabled={apartarBusy || !apartarUntil}
                      >
                        {apartarBusy ? "Guardando..." : selectedLot.status === "reserved" ? "Guardar vencimiento" : "Confirmar apartado"}
                      </Button>
                    </div>
                  ) : null}

                  <div className="frac-actions-list">
                    {selectedLot.status !== "sold" ? <button onClick={() => navigate("/contratos")}>Registrar venta</button> : null}
                    <button onClick={() => setShowApptForm((value) => !value)}>Agendar cita</button>
                    <button onClick={openEditor}>Editar en Carga de Lotes</button>
                  </div>
                  {showApptForm ? (
                    <div className="frac-appointment-form">
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">Contacto</label>
                        <input value={apptDraft.contact_name} onChange={(event) => setApptDraft((p) => ({ ...p, contact_name: event.target.value }))} placeholder="Nombre del contacto" />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">Telefono</label>
                        <input value={apptDraft.contact_phone} onChange={(event) => setApptDraft((p) => ({ ...p, contact_phone: event.target.value }))} placeholder="Opcional" />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">Fecha</label>
                        <input type="date" value={apptDraft.date} onChange={(event) => setApptDraft((p) => ({ ...p, date: event.target.value }))} />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">Hora</label>
                        <input type="time" value={apptDraft.time} onChange={(event) => setApptDraft((p) => ({ ...p, time: event.target.value }))} />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">Notas</label>
                        <textarea rows="2" value={apptDraft.notes} onChange={(event) => setApptDraft((p) => ({ ...p, notes: event.target.value }))} placeholder="Contexto de la visita" />
                      </div>
                      <Button variant="primary" onClick={saveAppointment} disabled={apptSaving || !apptDraft.contact_name.trim() || !apptDraft.date || !apptDraft.time}>
                        {apptSaving ? "Guardando..." : "Guardar cita"}
                      </Button>
                    </div>
                  ) : null}
                  {apptData.length ? (
                    <div className="frac-appointments">
                      {apptData.map((appt) => (
                        <div key={appt.id}>
                          <strong>{appt.contact_name}</strong>
                          <span>{new Date(appt.scheduled_at).toLocaleString("es-MX")}</span>
                          <button onClick={() => cancelAppointment(appt.id)}>Cancelar</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "documentos" ? (
                <InlineDocumentsPanel entityType="lot" entityId={selectedLot.id} entityLabel={`${selectedFrac.name} / ${selectedLot.code}`} />
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      {showCotizador && selectedLot ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowCotizador(false)}>
          <article className="frac-calculator-modal">
            <div className="frac-modal-head">
              <div className="frac-modal-id">$</div>
              <div>
                <h2>Cotizador</h2>
                <p>{selectedFrac.name} / {selectedLot.code}</p>
              </div>
              <button className="frac-modal-close" onClick={() => setShowCotizador(false)}>×</button>
            </div>
            <div className="frac-calculator-body">
              <aside className="frac-calculator-controls">
                {[
                  ["Precio financiado", cotPrecioF, setCotPrecioF, 1000],
                  ["Enganche", cotEnganche, setCotEnganche, 1000],
                  ["Tasa anual (%)", cotTasa, setCotTasa, 0.5],
                  ["Plazo (meses)", cotPlazo, setCotPlazo, 12],
                ].map(([label, value, setter, step]) => (
                  <label key={label}>
                    <span>{label}</span>
                    <input type="number" value={value} step={step} onChange={(event) => setter(Number(event.target.value))} />
                  </label>
                ))}
                <div className="frac-quote-result">
                  <span>Mensualidad</span>
                  <strong>{monthly > 0 ? currency(Math.round(monthly)) : "--"}</strong>
                  <small>A financiar {currency(Math.round(financed))}</small>
                </div>
              </aside>
              <div className="frac-amort-table">
                <table>
                  <thead>
                    <tr>
                      {["#", "Saldo inicial", "Capital", "Interes", "Cuota", "Saldo final"].map((head) => <th key={head}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {generateAmort(cotPrecioF, cotEnganche, cotTasa, cotPlazo).map((row) => (
                      <tr key={row.n}>
                        <td>{row.n}</td>
                        <td>{currency(Math.round(row.saldoInicial))}</td>
                        <td>{currency(Math.round(row.capital))}</td>
                        <td>{currency(Math.round(row.interes))}</td>
                        <td>{currency(Math.round(row.cuota))}</td>
                        <td>{currency(Math.round(row.saldoFinal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>
      ) : null}



      {showMapViewer && selectedFrac.image_url ? <MapViewer src={selectedFrac.image_url} onClose={() => setShowMapViewer(false)} /> : null}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Fraccionamientos"
        subtitle="Gestión táctil de tu inventario de lotes con plano interactivo."
        steps={[
          { title: "Seleccionar proyecto", text: "La galería muestra todos tus fraccionamientos con la miniatura de su plano. Haz clic en uno para ver su plano interactivo y la matriz de lotes; usa la flecha ‹ Proyectos para volver." },
          { title: "Plano interactivo", text: "Usa el scroll o pinch para hacer zoom. Haz clic en el plano para ver los lotes superpuestos con su estado (disponible, apartado, vendido)." },
          { title: "Filtrar lotes", text: "Los botones de estado en la barra superior filtran los lotes visibles en el plano. Combínalos con la búsqueda por sección o código." },
          { title: "Ficha de lote", text: "Selecciona un lote para ver su ficha completa: medidas, servicios disponibles, precio de contado y financiado, y vendedor asignado." },
          { title: "Cotizador integrado", text: "Desde la ficha del lote puedes abrir el cotizador para simular el plan de pagos con amortización francesa o alemana." },
          { title: "Agendar visita", text: "El botón 'Agendar' en la ficha del lote crea una cita en la agenda central vinculada al lote y al contacto del prospecto." },
        ]}
      />
    </div>
  );
}

export default FracsPage;
