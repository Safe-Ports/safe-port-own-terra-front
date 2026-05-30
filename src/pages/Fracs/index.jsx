import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import EmptyState from "@/components/ui/EmptyState";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import Button from "@/components/Button";
import { lotService } from "@/services/lotService";
import { appointmentService } from "@/services/appointmentService";
import { currency } from "@/services/formatters";
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

function makeDraft(lot) {
  return {
    frente: lot?.frente_ml ?? "",
    fondo: lot?.fondo_ml ?? "",
    services: {
      agua: false,
      luz: false,
      drenaje: false,
      gas: false,
      internet: false,
      pavimento: false,
      ...(lot?.services || {}),
    },
  };
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
    deleteFrac,
    exportAppData,
    showToast,
    setDraftProject,
    currentUser,
  } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [activeTab, setActiveTab] = useState("ficha");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [showCotizador, setShowCotizador] = useState(false);
  const [cotPrecioF, setCotPrecioF] = useState(0);
  const [cotEnganche, setCotEnganche] = useState(0);
  const [cotTasa, setCotTasa] = useState(12);
  const [cotPlazo, setCotPlazo] = useState(96);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmName, setConfirmName] = useState("");
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptDraft, setApptDraft] = useState({ contact_name: "", contact_phone: "", scheduled_at: "", notes: "" });
  const [apptSaving, setApptSaving] = useState(false);

  const selectedFrac = fracs.find((f) => f.id === selectedFracId) || fracs[0] || null;

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ["lots", selectedFrac?.id],
    queryFn: () => lotService.list({ inmueble_id: selectedFrac.id, limit: 200 }).then((r) => r.items),
    enabled: !!selectedFrac?.id,
  });
  const lots = lotsData || [];

  const { data: apptData = [], refetch: refetchAppts } = useQuery({
    queryKey: ["appointments", selectedLotId],
    queryFn: () => appointmentService.list({ lot_id: selectedLotId, upcoming_only: true }),
    enabled: !!selectedLotId,
  });

  const selectedLot = lots.find((lot) => lot.id === selectedLotId) || null;
  const sections = useMemo(() => [...new Set(lots.map((lot) => lot.section || "General"))], [lots]);

  const filteredLots = useMemo(() => lots.filter((lot) => {
    const matchesStatus = statusFilter === "all" || lot.status === statusFilter;
    const matchesSection = !sectionFilter || (lot.section || "General") === sectionFilter;
    const haystack = `${lot.code} ${lot.section || ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
    return matchesStatus && matchesSection && matchesSearch;
  }), [lots, statusFilter, sectionFilter, search]);

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
    setEditMode(false);
    setActiveTab("ficha");
    setShowLotModal(false);
    setShowDeleteConfirm(false);
  }, [selectedFrac?.id]);

  useEffect(() => {
    if (!selectedLotId && lots[0]) setSelectedLotId(lots[0].id);
  }, [lots, selectedLotId]);

  useEffect(() => {
    if (!selectedLot) return;
    setDraft(makeDraft(selectedLot));
    setEditMode(false);
    setCotPrecioF(Number(selectedLot.price_financiado || selectedLot.price_contado || 0));
    setCotEnganche(0);
  }, [selectedLot?.id]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setShowLotModal(false);
        setPendingStatus(null);
        setShowCotizador(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!selectedFrac) {
    return (
      <EmptyState
        icon="▦"
        title="Sin fraccionamientos creados"
        description="Carga un plano, arma la matriz de lotes y crea tu primer proyecto desde la seccion Carga de Lotes."
        action={<Link className="mobile-primary-button" to="/lotes">Ir a Carga de Lotes</Link>}
      />
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
      mapUrl: "",
      cadProcessing: false,
      sections: Object.values(sectionMap),
      _editingFracId: selectedFrac.id,
    });
    navigate("/lotes");
  };

  const saveDraft = async () => {
    if (!selectedLot || !draft) return;
    setSaving(true);
    try {
      await lotService.update(selectedLot.id, {
        frente_ml: draft.frente !== "" ? Number(draft.frente) : null,
        fondo_ml: draft.fondo !== "" ? Number(draft.fondo) : null,
        services: draft.services,
      });
      await queryClient.invalidateQueries({ queryKey: ["lots", selectedFrac?.id] });
      setEditMode(false);
      showToast("Lote actualizado");
    } catch {
      showToast("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const requestStatusChange = (lotId, fromStatus, toStatus) => {
    if (fromStatus === toStatus) return;
    setPendingStatus({ lotId, from: fromStatus, to: toStatus });
    setConfirmName(currentUser?.name || "");
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      await lotService.update(pendingStatus.lotId, { status: pendingStatus.to });
      await queryClient.invalidateQueries({ queryKey: ["lots", selectedFrac?.id] });
      showToast(`Estado actualizado: ${LOT_COLORS[pendingStatus.to]?.label || pendingStatus.to}`);
    } catch {
      showToast("Error al cambiar estado");
    } finally {
      setPendingStatus(null);
      setConfirmName("");
    }
  };

  const saveAppointment = async () => {
    if (!selectedLot || !apptDraft.contact_name.trim() || !apptDraft.scheduled_at) return;
    setApptSaving(true);
    try {
      await appointmentService.create({
        lot_id: selectedLot.id,
        contact_name: apptDraft.contact_name.trim(),
        contact_phone: apptDraft.contact_phone.trim() || undefined,
        scheduled_at: new Date(apptDraft.scheduled_at).toISOString(),
        notes: apptDraft.notes.trim() || undefined,
      });
      await refetchAppts();
      setApptDraft({ contact_name: "", contact_phone: "", scheduled_at: "", notes: "" });
      setShowApptForm(false);
      showToast("Cita agendada");
    } catch {
      showToast("Error al agendar la cita");
    } finally {
      setApptSaving(false);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await appointmentService.cancel(id);
      await refetchAppts();
      showToast("Cita cancelada");
    } catch {
      showToast("Error al cancelar");
    }
  };

  return (
    <div className="frac-page">
      <aside className="frac-projects frac-panel">
        <div className="frac-panel-head">
          <div>
            <div className="frac-panel-title">Proyectos</div>
            <div className="frac-panel-sub">Fraccionamientos activos</div>
          </div>
        </div>
        <div className="frac-panel-body">
          <label className="frac-search">
            <span>⌕</span>
            <input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Buscar proyecto" />
          </label>
          <div className="frac-project-list">
            {filteredProjects.map((frac) => (
              <button
                key={frac.id}
                className={`frac-project-item ${frac.id === selectedFrac.id ? "active" : ""}`}
                onClick={() => setSelectedFracId(frac.id)}
              >
                <span className="frac-project-mark">{frac.name.slice(0, 2).toUpperCase()}</span>
                <span className="frac-project-copy">
                  <span className="frac-project-name">{frac.name}</span>
                  <span className="frac-project-meta">
                    {frac.total_lots ?? 0} lotes
                    {frac.created_at ? ` / ${new Date(frac.created_at).toLocaleDateString("es-MX")}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="frac-workspace">
        <div className="frac-hero-grid">
          <article className="frac-hero">
            <div className="frac-eyebrow">OwnTerra Lands</div>
            <h1>{selectedFrac.name}</h1>
            <p>Inventario territorial consolidado con lectura rapida de disponibilidad, plano de referencia, detalle tecnico y cotizador comercial por lote.</p>
            <div className="frac-hero-actions">
              <Button variant="secondary" onClick={openEditor}>Editar matriz</Button>
              <Button variant="secondary" onClick={() => selectedFrac.map_image_url && setShowMapViewer(true)} disabled={!selectedFrac.map_image_url}>Ver plano</Button>
              <Button variant="secondary" onClick={exportAppData}>Exportar</Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>Eliminar</Button>
            </div>
          </article>

          <div className="frac-kpis">
            <article className="frac-kpi deep"><span>Total lotes</span><strong>{stats.total}</strong><small>{sections.length} secciones</small></article>
            <article className="frac-kpi available"><span>Disponibles</span><strong>{stats.available}</strong><small>{stats.total ? Math.round((stats.available / stats.total) * 100) : 0}% inventario</small></article>
            <article className="frac-kpi reserved"><span>Apartados</span><strong>{stats.reserved}</strong><small>seguimiento activo</small></article>
            <article className="frac-kpi sold"><span>Vendidos</span><strong>{stats.sold}</strong><small>cerrados</small></article>
          </div>
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
            <span>⌕</span>
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
              <button className="frac-icon-btn" onClick={() => selectedFrac.map_image_url && setShowMapViewer(true)} disabled={!selectedFrac.map_image_url}>⛶</button>
            </div>
            <div className="frac-plan-body" onClick={() => selectedFrac.map_image_url && setShowMapViewer(true)}>
              {selectedFrac.map_image_url ? (
                <img src={selectedFrac.map_image_url} alt="Plano" />
              ) : (
                <div className="frac-plan-empty">
                  <strong>Sin plano</strong>
                  <span>Sube uno al crear el fraccionamiento</span>
                </div>
              )}
              {selectedFrac.map_image_url ? <span className="frac-zoom-badge">Zoom</span> : null}
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
                            return (
                              <button
                                key={lot.id}
                                className={`frac-lot-tile ${meta.className} ${lot.id === selectedLot?.id ? "active" : ""}`}
                                onClick={() => openLot(lot)}
                              >
                                <i />
                                <strong>{lot.code}</strong>
                                <span>{lot.area_m2 ? `${lot.area_m2} m2` : "Sin area"}</span>
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
          <b>⌄</b>
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

      {showLotModal && selectedLot && draft ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowLotModal(false)}>
          <article className="frac-lot-modal">
            <div className="frac-modal-head">
              <div className="frac-modal-id">{selectedLot.code}</div>
              <div>
                <h2>Detalle del lote</h2>
                <p>{selectedFrac.name} / {selectedLot.section || "General"} / {selectedLot.area_m2 || 0} m2</p>
              </div>
              <StatusBadge status={selectedLot.status} />
              <button className="frac-modal-close" onClick={() => setShowLotModal(false)}>x</button>
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
                    <div><strong>{draft.frente || "--"}</strong><span>Frente ML</span></div>
                    <div><strong>{draft.fondo || "--"}</strong><span>Fondo ML</span></div>
                    <div><strong>{selectedLot.area_m2 || "--"}</strong><span>Superficie m2</span></div>
                  </div>

                  <div className="frac-editbar">
                    <span>{editMode ? "Modo edicion" : "Ficha tecnica"}</span>
                    {!editMode ? (
                      <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>Editar</Button>
                    ) : (
                      <div>
                        <Button variant="primary" size="sm" onClick={saveDraft} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                        <Button variant="secondary" size="sm" onClick={() => { setDraft(makeDraft(selectedLot)); setEditMode(false); }}>Cancelar</Button>
                      </div>
                    )}
                  </div>

                  <div className="frac-form-grid">
                    {[
                      ["frente", "Frente (ml)"],
                      ["fondo", "Fondo (ml)"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          type="number"
                          value={draft[key]}
                          disabled={!editMode}
                          onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="frac-services">
                    {SERVICES.map((service) => {
                      const on = !!draft.services[service.k];
                      return (
                        <label key={service.k} className="frac-service">
                          <span>{service.lbl}</span>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!editMode}
                            onChange={(event) => setDraft((prev) => ({ ...prev, services: { ...prev.services, [service.k]: event.target.checked } }))}
                          />
                          <i className={on ? "on" : ""} />
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {activeTab === "gestion" ? (
                <div className="frac-management">
                  <div className="frac-section-label">Estado del lote</div>
                  <div className="frac-status-options">
                    {Object.entries(LOT_COLORS).map(([status, meta]) => (
                      <button
                        key={status}
                        className={`${meta.className} ${selectedLot.status === status ? "on" : ""}`}
                        onClick={() => requestStatusChange(selectedLot.id, selectedLot.status, status)}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                  <div className="frac-actions-list">
                    {selectedLot.status !== "sold" ? <button onClick={() => navigate("/contratos")}>Registrar venta</button> : null}
                    <button onClick={() => setShowApptForm((value) => !value)}>Agendar cita</button>
                    <button onClick={() => showToast("PDF en desarrollo")}>Imprimir ficha</button>
                  </div>
                  {showApptForm ? (
                    <div className="frac-appointment-form">
                      <input value={apptDraft.contact_name} onChange={(event) => setApptDraft((p) => ({ ...p, contact_name: event.target.value }))} placeholder="Nombre del contacto" />
                      <input value={apptDraft.contact_phone} onChange={(event) => setApptDraft((p) => ({ ...p, contact_phone: event.target.value }))} placeholder="Telefono" />
                      <input type="datetime-local" value={apptDraft.scheduled_at} onChange={(event) => setApptDraft((p) => ({ ...p, scheduled_at: event.target.value }))} />
                      <textarea value={apptDraft.notes} onChange={(event) => setApptDraft((p) => ({ ...p, notes: event.target.value }))} placeholder="Notas" />
                      <Button variant="primary" onClick={saveAppointment} disabled={apptSaving || !apptDraft.contact_name.trim() || !apptDraft.scheduled_at}>
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
              <button className="frac-modal-close" onClick={() => setShowCotizador(false)}>x</button>
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

      {pendingStatus && selectedLot ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setPendingStatus(null)}>
          <article className="frac-confirm-modal">
            <div className="frac-modal-head">
              <div>
                <h2>Confirmar cambio</h2>
                <p>{selectedFrac.name} / {selectedLot.code}</p>
              </div>
              <button className="frac-modal-close" onClick={() => setPendingStatus(null)}>x</button>
            </div>
            <div className="frac-confirm-body">
              <div className="frac-status-transition">
                <StatusBadge status={pendingStatus.from} />
                <span>→</span>
                <StatusBadge status={pendingStatus.to} />
              </div>
              <label>
                <span>Confirmado por</span>
                <input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder="Nombre del responsable" />
              </label>
              <div className="frac-confirm-actions">
                <Button variant="secondary" onClick={() => setPendingStatus(null)}>Cancelar</Button>
                <Button variant="primary" onClick={confirmStatusChange} disabled={!confirmName.trim()}>Confirmar cambio</Button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowDeleteConfirm(false)}>
          <article className="frac-confirm-modal">
            <div className="frac-modal-head danger">
              <div>
                <h2>Eliminar fraccionamiento</h2>
                <p>{selectedFrac.name}</p>
              </div>
              <button className="frac-modal-close" onClick={() => setShowDeleteConfirm(false)}>x</button>
            </div>
            <div className="frac-confirm-body">
              <p>Esta accion eliminara el proyecto seleccionado. Confirma solo si ya no debe aparecer en OwnTerra Lands.</p>
              <div className="frac-confirm-actions">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
                <Button variant="danger" onClick={() => { deleteFrac(selectedFrac.id); setShowDeleteConfirm(false); }}>Eliminar</Button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {showMapViewer && selectedFrac.map_image_url ? <MapViewer src={selectedFrac.map_image_url} onClose={() => setShowMapViewer(false)} /> : null}
    </div>
  );
}

export default FracsPage;
