import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import EmptyState from "@/components/ui/EmptyState";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { lotService } from "@/services/lotService";
import { appointmentService } from "@/services/appointmentService";
import { currency } from "@/services/formatters";

const LOT_COLORS = {
  available: { bg: "#dcfce7", border: "#86efac", text: "#15803d", barColor: "#1a56db" },
  sold:      { bg: "#fee2e2", border: "#fca5a5", text: "#dc2626", barColor: "#dc2626" },
  reserved:  { bg: "#fef3c7", border: "#fcd34d", text: "#b45309", barColor: "#b45309" },
};

const STATUS_LABELS = { available: "Disponible", sold: "Vendido", reserved: "Apartado" };
const STATUS_ICONS  = { available: "🟢", sold: "🔴", reserved: "🟡" };

const SERVICES = [
  { k: "agua",      ico: "💧", lbl: "Agua potable" },
  { k: "luz",       ico: "⚡", lbl: "Energía eléctrica" },
  { k: "drenaje",   ico: "🚿", lbl: "Drenaje" },
  { k: "gas",       ico: "🔥", lbl: "Gas natural" },
  { k: "internet",  ico: "📡", lbl: "Internet/Fibra" },
  { k: "pavimento", ico: "🛣️", lbl: "Pavimento" },
];

function calcMonthly(priceF, enganche, tasaAnual, plazo) {
  const pv = Number(priceF) - Number(enganche);
  if (pv <= 0 || plazo <= 0) return 0;
  if (tasaAnual === 0) return pv / plazo;
  const r = tasaAnual / 100 / 12;
  return (pv * r) / (1 - Math.pow(1 + r, -plazo));
}

function generateAmort(priceF, enganche, tasaAnual, plazo) {
  const pv = Number(priceF) - Number(enganche);
  if (pv <= 0 || plazo <= 0) return [];
  const r = tasaAnual / 100 / 12;
  const payment = r === 0 ? pv / plazo : (pv * r) / (1 - Math.pow(1 + r, -plazo));
  const rows = [];
  let balance = pv;
  for (let i = 1; i <= plazo; i++) {
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
    frente: lot.frente_ml ?? "",
    fondo:  lot.fondo_ml ?? "",
    services: { agua: false, luz: false, drenaje: false, gas: false, internet: false, pavimento: false, ...(lot.services || {}) },
  };
}

function MapViewer({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setScale((s) => Math.min(8, Math.max(0.5, s - e.deltaY * 0.001)));
  }, []);

  const onMouseDown = (e) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setOffset((o) => ({ x: o.x + e.clientX - last.current.x, y: o.y + e.clientY - last.current.y }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(8,10,8,.85)", display: "flex", flexDirection: "column" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(0,0,0,.4)", gap: 10, flexShrink: 0 }}>
        <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".7rem", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" }}>
          🗺 Plano de referencia
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setScale((s) => Math.min(8, s + 0.25))}
            style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <button onClick={reset}
            style={{ background: "rgba(255,255,255,.12)", border: "none", color: "rgba(255,255,255,.7)", borderRadius: 8, padding: "0 10px", height: 32, fontSize: ".68rem", fontWeight: 700, cursor: "pointer", letterSpacing: ".05em" }}>
            {Math.round(scale * 100)}%
          </button>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      </div>
      {/* canvas */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: dragging.current ? "grabbing" : "grab", userSelect: "none" }}
      >
        <img
          src={src}
          alt="Plano"
          draggable={false}
          style={{ maxWidth: "none", transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "center center", transition: dragging.current ? "none" : "transform .1s ease" }}
        />
      </div>
    </div>
  );
}

function FracsPage() {
  const { fracs, selectedFracId, setSelectedFracId, deleteFrac, exportAppData, showToast, setDraftProject, currentUser } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter]   = useState("all");
  const [search, setSearch]               = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(null);

  const [activeTab, setActiveTab] = useState("ficha");
  const [editMode, setEditMode]   = useState(false);
  const [draft, setDraft]         = useState(null);
  const [saving, setSaving]       = useState(false);

  const [cotEnganche, setCotEnganche] = useState(0);
  const [cotTasa, setCotTasa]         = useState(12);
  const [cotPlazo, setCotPlazo]       = useState(96);
  const [showCotizador, setShowCotizador] = useState(false);
  const [cotPrecioF, setCotPrecioF]       = useState(0);

  // Status confirmation modal
  const [pendingStatus, setPendingStatus] = useState(null); // { lotId, from, to }
  const [confirmName, setConfirmName]     = useState("");

  // Appointment scheduling
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptDraft, setApptDraft]       = useState({ contact_name: "", contact_phone: "", scheduled_at: "", notes: "" });
  const [apptSaving, setApptSaving]     = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const sections = useMemo(() => [...new Set(lots.map((l) => l.section || "General"))], [lots]);

  const filteredLots = useMemo(() => lots.filter((lot) => {
    const matchesStatus  = statusFilter === "all" || lot.status === statusFilter;
    const matchesSection = !sectionFilter || (lot.section || "General") === sectionFilter;
    const matchesSearch  = !search.trim() || `${lot.code} ${lot.section || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSection && matchesSearch;
  }), [lots, statusFilter, sectionFilter, search]);

  const selectedLot = lots.find((l) => l.id === selectedLotId) || null;

  useEffect(() => {
    if (selectedLot) {
      setDraft(makeDraft(selectedLot));
      setEditMode(false);
      setCotEnganche(0);
      setCotPrecioF(Number(selectedLot.price_financiado || selectedLot.price_contado || 0));
    }
  }, [selectedLot?.id]);

  if (!selectedFrac) {
    return (
      <EmptyState
        icon="🗺️"
        title="Sin fraccionamientos creados"
        description="Carga un plano, arma la matriz de lotes y crea tu primer proyecto desde la sección Carga de Lotes."
        action={<Link className="mobile-primary-button" to="/lotes">Ir a Carga de Lotes</Link>}
      />
    );
  }

  const saveDraft = async () => {
    if (!selectedLot || !draft) return;
    setSaving(true);
    try {
      await lotService.update(selectedLot.id, {
        frente_ml: draft.frente !== "" ? Number(draft.frente) : null,
        fondo_ml:  draft.fondo  !== "" ? Number(draft.fondo)  : null,
        services:  draft.services,
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
      showToast(`Estado actualizado → ${STATUS_LABELS[pendingStatus.to]}`);
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

  const sc = LOT_COLORS[selectedLot?.status] || LOT_COLORS.available;
  const priceF = Number(selectedLot?.price_financiado || 0);
  const monthly = calcMonthly(priceF || Number(selectedLot?.price_contado || 0), cotEnganche, cotTasa, cotPlazo);

  const statsAvailable = lots.filter((l) => l.status === "available").length;
  const statsSold      = lots.filter((l) => l.status === "sold").length;
  const statsReserved  = lots.filter((l) => l.status === "reserved").length;

  const openEditor = () => {
    const sectionMap = {};
    lots.forEach((lot) => {
      const sec = lot.section || "General";
      if (!sectionMap[sec]) sectionMap[sec] = { id: `sec_${sec}`, name: sec, lots: [] };
      const lotDraft = {
        id:              lot.id,
        _backendId:      lot.id,
        _orig: {
          area:            lot.area_m2 ?? "",
          price:           lot.price_contado ?? "",
          priceFinanciado: lot.price_financiado ?? "",
          frente:          lot.frente_ml ?? "",
          fondo:           lot.fondo_ml ?? "",
          servicios:       JSON.stringify(lot.services || {}),
        },
        code:            lot.code,
        status:          lot.status || "available",
        area:            lot.area_m2 ?? "",
        price:           lot.price_contado ?? "",
        priceFinanciado: lot.price_financiado ?? "",
        frente:          lot.frente_ml ?? "",
        fondo:           lot.fondo_ml ?? "",
        servicios:       lot.services || {},
      };
      sectionMap[sec].lots.push(lotDraft);
    });
    setDraftProject({
      mode:             "editor",
      name:             selectedFrac.name,
      mapUrl:           "",
      cadProcessing:    false,
      sections:         Object.values(sectionMap),
      _editingFracId:   selectedFrac.id,
    });
    navigate("/lotes");
  };


  return (
    <>
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]" style={{ minHeight: "calc(100vh - 6rem)" }}>

      {/* ── LEFT: frac list ── */}
      <div className="card" style={{ marginBottom: 0, alignSelf: "start" }}>
        <div className="card-hd">
          <div className="card-title">🏘️ Proyectos</div>
        </div>
        <div className="card-body space-y-3">
          {fracs.map((frac) => (
            <button
              key={frac.id}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                frac.id === selectedFrac.id ? "border-[#2A7A50] bg-[var(--tan-lt)]" : "border-line bg-[#fffdf8]"
              }`}
              onClick={() => setSelectedFracId(frac.id)}
            >
              <div className="font-semibold text-[#1A1410]">{frac.name}</div>
              <div className="mt-1 text-xs text-[#8C8070]">
                {frac.total_lots ?? 0} lotes · {frac.created_at ? new Date(frac.created_at).toLocaleDateString("es-MX") : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: main content ── */}
      <div className="flex flex-col gap-3" style={{ minWidth: 0 }}>

        {/* Top strip */}
        <div
          style={{
            borderRadius: 22,
            border: "1.5px solid #DED5C8",
            background: "linear-gradient(150deg,#1A3428,#101511)",
            padding: "14px 18px",
            color: "#F7F3ED",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: ".64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "#D9B07D" }}>
              Fraccionamiento activo
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", lineHeight: 1.1, marginTop: 4 }}>
              {selectedFrac.name}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { lbl: "Total", val: lots.length, col: "#F7F3ED" },
                { lbl: "Disp.", val: statsAvailable, col: "#86efac" },
                { lbl: "Vend.", val: statsSold,      col: "#fca5a5" },
                { lbl: "Res.",  val: statsReserved,   col: "#fcd34d" },
              ].map((chip) => (
                <div key={chip.lbl} style={{ borderRadius: 12, background: "rgba(255,255,255,.1)", padding: "6px 12px", textAlign: "center", minWidth: 48 }}>
                  <div style={{ fontSize: ".58rem", color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".1em" }}>{chip.lbl}</div>
                  <div style={{ fontWeight: 800, fontSize: ".9rem", color: chip.col, marginTop: 2 }}>{chip.val}</div>
                </div>
              ))}
            </div>
            <button className="btn-s" onClick={openEditor} style={{ color: "#F7F3ED", borderColor: "rgba(255,255,255,.2)", background: "rgba(255,255,255,.08)" }}>
              ✏ Editar
            </button>
            <button className="btn-s" onClick={exportAppData} style={{ color: "#F7F3ED", borderColor: "rgba(255,255,255,.2)", background: "rgba(255,255,255,.08)" }}>
              ⬇ Exportar
            </button>
            {showDeleteConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(192,57,43,.18)", border: "1.5px solid rgba(192,57,43,.5)", borderRadius: 10, padding: "4px 10px" }}>
                <span style={{ fontSize: ".68rem", color: "#ffd3cf", fontWeight: 600 }}>¿Eliminar "{selectedFrac.name}"?</span>
                <button
                  onClick={() => { deleteFrac(selectedFrac.id); setShowDeleteConfirm(false); }}
                  style={{ background: "#C0392B", border: "none", color: "#fff", borderRadius: 7, padding: "3px 10px", fontSize: ".68rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#F7F3ED", borderRadius: 7, padding: "3px 8px", fontSize: ".68rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="btn-dan" onClick={() => setShowDeleteConfirm(true)}>🗑 Eliminar</button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            borderRadius: 18,
            border: "1.5px solid #DED5C8",
            background: "#FBF7F1",
            padding: "10px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            {[
              ["all",       "Todos"],
              ["available", "🟢 Disponible"],
              ["sold",      "🔴 Vendido"],
              ["reserved",  "🟡 Apartado"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                className={`mobile-chip ${statusFilter === val ? "is-active" : ""}`}
                onClick={() => setStatusFilter(val)}
                style={{ whiteSpace: "nowrap" }}
              >
                {lbl}
              </button>
            ))}
          </div>
          <select
            className="mobile-input"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            style={{ flex: "0 0 auto", width: "auto", minWidth: 120, padding: "5px 10px", fontSize: ".78rem" }}
          >
            <option value="">Todas las secciones</option>
            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="mobile-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lote..."
            style={{ flex: 1, minWidth: 120, padding: "5px 10px", fontSize: ".78rem" }}
          />
        </div>

        {/* Matrix row: plano + lotes */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

          {/* ── PLANO DE REFERENCIA ── */}
          <div
            style={{
              width: 220,
              flexShrink: 0,
              borderRadius: 18,
              border: "1.5px solid #DED5C8",
              background: "#fff",
              overflow: "hidden",
              maxHeight: "calc(100vh - 18rem)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #EDE8E0" }}>
              <div style={{ fontSize: ".58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#8A7A69" }}>
                🗺 Plano de referencia
              </div>
            </div>
            <div
              style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0EDE6", minHeight: 160, cursor: selectedFrac.map_image_url ? "zoom-in" : "default", position: "relative" }}
              onClick={() => selectedFrac.map_image_url && setShowMapViewer(true)}
            >
              {selectedFrac.map_image_url ? (
                <>
                  <img
                    src={selectedFrac.map_image_url}
                    alt="Plano"
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                  <div style={{ position: "absolute", bottom: 6, right: 7, background: "rgba(0,0,0,.45)", borderRadius: 6, padding: "2px 6px", fontSize: ".55rem", color: "#fff", fontWeight: 600, letterSpacing: ".04em", pointerEvents: "none" }}>
                    🔍 Ver
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 16, color: "#9b8478" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8, opacity: .4 }}>🗺️</div>
                  <div style={{ fontSize: ".62rem", lineHeight: 1.4 }}>
                    Sin plano<br />
                    <span style={{ opacity: .7 }}>Sube uno al crear el fraccionamiento</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "7px 10px", borderTop: "1px solid #EDE8E0", background: "#FDFAF6" }}>
              <div style={{ fontSize: ".6rem", color: "#8A7A69", marginBottom: 4, fontWeight: 600 }}>Leyenda</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  { color: "#dcfce7", border: "#86efac", lbl: "Disponible" },
                  { color: "#fef3c7", border: "#fcd34d", lbl: "Apartado" },
                  { color: "#fee2e2", border: "#fca5a5", lbl: "Vendido" },
                ].map((item) => (
                  <div key={item.lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, border: `1px solid ${item.border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: ".58rem", color: "#5c4033" }}>{item.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── LOT MATRIX ── */}
          <div
            style={{
              flex: 1,
              borderRadius: 22,
              border: "1.5px solid #DED5C8",
              background: "#fff",
              padding: 14,
              maxHeight: "calc(100vh - 18rem)",
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            {lotsLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#8A7A69", fontSize: ".82rem" }}>Cargando lotes...</div>
            ) : (
              <>
                {sections
                  .filter((sec) => !sectionFilter || sec === sectionFilter)
                  .map((sec) => {
                    const sectionLots = filteredLots.filter((l) => (l.section || "General") === sec);
                    if (sectionLots.length === 0) return null;
                    return (
                      <div key={sec} style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#8A7A69", marginBottom: 8 }}>
                          {sec} · {sectionLots.length} lotes
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {sectionLots.map((lot) => {
                            const c = LOT_COLORS[lot.status] || LOT_COLORS.available;
                            const isSelected = lot.id === selectedLot?.id;
                            return (
                              <button
                                key={lot.id}
                                onClick={() => { setSelectedLotId(lot.id); setShowLotModal(true); }}
                                style={{
                                  borderRadius: 9,
                                  padding: "7px 10px",
                                  minWidth: 68,
                                  cursor: "pointer",
                                  border: isSelected ? `2px solid ${c.barColor}` : `1.5px solid ${c.border}`,
                                  background: isSelected ? c.barColor : c.bg,
                                  color: isSelected ? "#fff" : c.text,
                                  textAlign: "center",
                                  fontFamily: "DM Sans, sans-serif",
                                  transition: "all .12s",
                                  boxShadow: isSelected ? `0 4px 12px ${c.barColor}40` : "none",
                                }}
                              >
                                <div style={{ fontWeight: 800, fontSize: ".82rem" }}>{lot.code}</div>
                                <div style={{ fontSize: ".6rem", marginTop: 2, opacity: .8 }}>
                                  {lot.area_m2 ? `${lot.area_m2}m²` : "—"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                {filteredLots.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "#8A7A69", fontSize: ".82rem" }}>
                    Sin lotes que coincidan
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── MAP VIEWER MODAL ── */}
          {showMapViewer && selectedFrac?.map_image_url && (
            <MapViewer src={selectedFrac.map_image_url} onClose={() => setShowMapViewer(false)} />
          )}

          {/* ── LOT DETAIL MODAL ── */}
          {showLotModal && selectedLot && draft && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,12,10,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={(e) => { if (e.target === e.currentTarget) { setShowLotModal(false); setEditMode(false); setShowCotizador(false); } }}
            >
            <div
              style={{
                width: "min(640px, 100%)",
                height: "min(740px, 92vh)",
                borderRadius: 22,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 40px 80px rgba(0,0,0,.4)",
              }}
            >
              {/* Modal header */}
              <div style={{ background: "linear-gradient(135deg,#1a3428,#101511)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "#D9B07D", marginBottom: 2 }}>Detalle del Lote</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: "#F7F3ED", lineHeight: 1.1 }}>
                    {selectedFrac.name} · {selectedLot.code}
                  </div>
                </div>
                <button
                  onClick={() => { setShowLotModal(false); setEditMode(false); setShowCotizador(false); }}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.12)", color: "#F7F3ED", border: "1px solid rgba(255,255,255,.2)", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>

              {/* Status hero card */}
              <div
                style={{
                  margin: "12px 12px 0",
                  borderRadius: 13,
                  background: sc.bg,
                  border: `1.5px solid ${sc.border}`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div style={{ height: 4, background: sc.barColor }} />
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", color: "#0f1f3d", lineHeight: 1 }}>
                        {selectedLot.code}
                      </div>
                      <div style={{ fontSize: ".68rem", color: "#7b93b8", marginTop: 3 }}>
                        {selectedLot.area_m2 ?? 0} m² · {selectedFrac.name}
                      </div>
                    </div>
                    <span
                      style={{
                        background: sc.bg,
                        color: sc.text,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: ".62rem",
                        fontWeight: 800,
                        letterSpacing: ".5px",
                        textTransform: "uppercase",
                        border: `1.5px solid ${sc.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {STATUS_ICONS[selectedLot.status]} {STATUS_LABELS[selectedLot.status]}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "7px 10px", border: "1px solid rgba(200,200,200,.3)" }}>
                      <div style={{ fontSize: ".55rem", color: "#9b8478", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Contado</div>
                      <div style={{ fontWeight: 800, fontSize: ".9rem", color: "#1a56db" }}>
                        {selectedLot.price_contado ? currency(Number(selectedLot.price_contado)) : "—"}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "7px 10px", border: "1px solid rgba(200,200,200,.3)" }}>
                      <div style={{ fontSize: ".55rem", color: "#9b8478", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Financiado</div>
                      <div style={{ fontWeight: 800, fontSize: ".9rem", color: sc.barColor }}>
                        {selectedLot.price_financiado ? currency(Number(selectedLot.price_financiado)) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs nav */}
              <div style={{ display: "flex", borderBottom: "1.5px solid #e8e0d8", margin: "8px 12px 0", gap: 2, flexShrink: 0 }}>
                {[
                  { id: "ficha",     ico: "📐", lbl: "Ficha Técnica" },
                  { id: "gestion",   ico: "👤", lbl: "Gestión" },
                  { id: "cotizador", ico: "🧮", lbl: "Cotizador" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      padding: "6px 3px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: ".6rem",
                      fontWeight: 700,
                      color: activeTab === tab.id ? sc.barColor : "#9b8478",
                      borderBottom: activeTab === tab.id ? `2.5px solid ${sc.barColor}` : "2.5px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                      whiteSpace: "nowrap",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    {tab.ico} {tab.lbl}
                  </button>
                ))}
              </div>

              {/* Edit mode bar */}
              {!editMode ? (
                <div style={{ background: "rgba(107,66,38,.06)", borderBottom: "1px solid rgba(107,66,38,.12)", padding: "5px 13px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: ".68rem", color: "#5c4033", fontWeight: 600 }}>📐 Ficha técnica</span>
                  <button
                    onClick={() => setEditMode(true)}
                    style={{ marginLeft: "auto", padding: "2px 9px", borderRadius: 5, background: "transparent", color: "#5c4033", border: "1px solid #d5c8b8", fontSize: ".62rem", fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                  >
                    ✏ Editar
                  </button>
                </div>
              ) : (
                <div style={{ background: "rgba(45,90,71,.07)", borderBottom: "1px solid rgba(45,90,71,.18)", padding: "5px 13px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: ".68rem", color: "#2d5a47", fontWeight: 700 }}>✏ Modo edición</span>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    style={{ marginLeft: "auto", padding: "3px 11px", borderRadius: 6, background: "#2d5a47", color: "#fff", border: "none", fontSize: ".66rem", fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", opacity: saving ? .6 : 1 }}
                  >
                    {saving ? "Guardando..." : "✓ Guardar"}
                  </button>
                  <button
                    onClick={() => { setDraft(makeDraft(selectedLot)); setEditMode(false); }}
                    style={{ padding: "3px 10px", borderRadius: 6, background: "transparent", color: "#9b8478", border: "1px solid #d5c8b8", fontSize: ".66rem", fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

                {/* ── FICHA TÉCNICA ── */}
                {activeTab === "ficha" && (
                  <div style={{ padding: "12px 13px" }}>
                    {/* Medidas */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                        📏 Medidas Perimetrales
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                        {[
                          { ico: "↔", lbl: "Frente", val: draft.frente ? `${draft.frente} ml` : "—" },
                          { ico: "↕", lbl: "Fondo",  val: draft.fondo  ? `${draft.fondo} ml`  : "—" },
                          { ico: "⊡", lbl: "Superficie", val: selectedLot.area_m2 ? `${selectedLot.area_m2} m²` : "—" },
                        ].map((m) => (
                          <div key={m.lbl} style={{ background: "#f7f3ed", border: "1.5px solid #e8e0d8", borderRadius: 9, padding: "8px 6px", textAlign: "center" }}>
                            <div style={{ fontSize: ".95rem", marginBottom: 2 }}>{m.ico}</div>
                            <div style={{ fontWeight: 800, fontSize: ".82rem", color: "#0f1f3d" }}>{m.val}</div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", marginTop: 1 }}>{m.lbl}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { key: "frente", lbl: "Frente (ml)", placeholder: "ej. 10.5" },
                          { key: "fondo",  lbl: "Fondo (ml)",  placeholder: "ej. 17.0" },
                        ].map((f) => (
                          <div key={f.key}>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{f.lbl}</div>
                            <input
                              type="number"
                              value={draft[f.key]}
                              placeholder={f.placeholder}
                              disabled={!editMode}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                              style={{
                                width: "100%",
                                padding: "6px 9px",
                                border: `1.5px solid ${editMode ? sc.barColor : "#e8e0d8"}`,
                                borderRadius: 7,
                                fontSize: ".76rem",
                                fontFamily: "DM Sans, sans-serif",
                                color: "#0f1f3d",
                                background: editMode ? "#fff" : "#f7f3ed",
                                outline: "none",
                                opacity: editMode ? 1 : .65,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Servicios */}
                    <div>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                        🔌 Servicios Disponibles
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {SERVICES.map((sv) => {
                          const on = draft.services[sv.k];
                          return (
                            <div
                              key={sv.k}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                background: on ? "rgba(45,122,79,.06)" : "#f7f3ed",
                                border: `1.5px solid ${on ? "rgba(45,122,79,.2)" : "#e8e0d8"}`,
                                borderRadius: 8,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".74rem", color: "#0f1f3d", fontWeight: 600 }}>
                                {sv.ico} {sv.lbl}
                              </div>
                              <label style={{ position: "relative", display: "inline-block", width: 34, height: 18, cursor: editMode ? "pointer" : "default" }}>
                                <input
                                  type="checkbox"
                                  checked={!!on}
                                  disabled={!editMode}
                                  onChange={(e) => setDraft((prev) => ({ ...prev, services: { ...prev.services, [sv.k]: e.target.checked } }))}
                                  style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                                />
                                <span style={{ position: "absolute", inset: 0, borderRadius: 18, background: on ? sc.barColor : "#d1d5db", transition: "background .2s" }} />
                                <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── GESTIÓN ── */}
                {activeTab === "gestion" && (
                  <div style={{ padding: "12px 13px" }}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                        🏷️ Estado del Lote
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { s: "available", ico: "🟢", lbl: "Disponible", bg: "#dcfce7", bc: "#86efac", tc: "#15803d" },
                          { s: "reserved",  ico: "🟡", lbl: "Apartado",   bg: "#fef3c7", bc: "#fcd34d", tc: "#b45309" },
                          { s: "sold",      ico: "🔴", lbl: "Vendido",    bg: "#fee2e2", bc: "#fca5a5", tc: "#dc2626" },
                        ].map((opt) => {
                          const isActive = selectedLot.status === opt.s;
                          return (
                            <button
                              key={opt.s}
                              onClick={() => requestStatusChange(selectedLot.id, selectedLot.status, opt.s)}
                              style={{
                                flex: 1,
                                padding: "8px 4px",
                                borderRadius: 9,
                                border: `2px solid ${isActive ? opt.bc : "#e8e0d8"}`,
                                background: isActive ? opt.bg : "#f7f3ed",
                                cursor: "pointer",
                                fontFamily: "DM Sans, sans-serif",
                                fontSize: ".65rem",
                                fontWeight: 800,
                                color: isActive ? opt.tc : "#9b8478",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              {opt.ico}<span>{opt.lbl}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                        📋 Acciones
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selectedLot.status === "available" && (
                          <>
                            <button
                              onClick={() => navigate("/contratos")}
                              style={{ width: "100%", padding: 9, borderRadius: 9, background: sc.barColor, color: "#fff", border: "none", fontWeight: 700, fontSize: ".76rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                            >
                              🏠 Registrar Venta →
                            </button>
                            <button
                              onClick={() => { setShowApptForm((v) => !v); }}
                              style={{ width: "100%", padding: 8, borderRadius: 9, background: "#f7f3ed", color: "#0f1f3d", border: "1.5px solid #e8e0d8", fontWeight: 600, fontSize: ".74rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                            >
                              📅 Agendar Cita
                            </button>
                          </>
                        )}
                        {selectedLot.status === "reserved" && (
                          <>
                            <button
                              onClick={() => navigate("/contratos")}
                              style={{ width: "100%", padding: 9, borderRadius: 9, background: "#b45309", color: "#fff", border: "none", fontWeight: 700, fontSize: ".76rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                            >
                              ✅ Confirmar Venta →
                            </button>
                            <button
                              onClick={() => requestStatusChange(selectedLot.id, selectedLot.status, "available")}
                              style={{ width: "100%", padding: 8, borderRadius: 9, background: "#fee2e2", color: "#dc2626", border: "1.5px solid #fca5a5", fontWeight: 600, fontSize: ".74rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                            >
                              ✕ Cancelar Reserva
                            </button>
                          </>
                        )}
                        {selectedLot.status === "sold" && (
                          <button
                            onClick={() => navigate("/contratos")}
                            style={{ width: "100%", padding: 9, borderRadius: 9, background: "#f7f3ed", color: "#0f1f3d", border: "1.5px solid #e8e0d8", fontWeight: 700, fontSize: ".76rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                          >
                            📄 Ver Contrato →
                          </button>
                        )}
                        <button
                          onClick={() => showToast("PDF en desarrollo")}
                          style={{ width: "100%", padding: 8, borderRadius: 9, background: "#f7f3ed", color: "#0f1f3d", border: "1.5px solid #e8e0d8", fontWeight: 600, fontSize: ".74rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                        >
                          🖨 Imprimir Ficha
                        </button>
                      </div>
                    </div>

                    {/* ── Appointment form ── */}
                    {showApptForm && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                          📅 Nueva Cita
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          <div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Nombre del contacto *</div>
                            <input
                              type="text"
                              value={apptDraft.contact_name}
                              onChange={(e) => setApptDraft((p) => ({ ...p, contact_name: e.target.value }))}
                              placeholder="Nombre completo"
                              style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e0d8", borderRadius: 8, fontSize: ".78rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#fff", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Teléfono</div>
                            <input
                              type="tel"
                              value={apptDraft.contact_phone}
                              onChange={(e) => setApptDraft((p) => ({ ...p, contact_phone: e.target.value }))}
                              placeholder="Opcional"
                              style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e0d8", borderRadius: 8, fontSize: ".78rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#fff", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Fecha y hora *</div>
                            <input
                              type="datetime-local"
                              value={apptDraft.scheduled_at}
                              onChange={(e) => setApptDraft((p) => ({ ...p, scheduled_at: e.target.value }))}
                              style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e0d8", borderRadius: 8, fontSize: ".78rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#fff", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Notas</div>
                            <textarea
                              value={apptDraft.notes}
                              onChange={(e) => setApptDraft((p) => ({ ...p, notes: e.target.value }))}
                              placeholder="Observaciones (opcional)"
                              rows={2}
                              style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e0d8", borderRadius: 8, fontSize: ".78rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => { setShowApptForm(false); setApptDraft({ contact_name: "", contact_phone: "", scheduled_at: "", notes: "" }); }}
                              style={{ flex: 1, padding: "7px", borderRadius: 8, background: "#f7f3ed", color: "#9b8478", border: "1.5px solid #e8e0d8", fontWeight: 600, fontSize: ".72rem", cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveAppointment}
                              disabled={apptSaving || !apptDraft.contact_name.trim() || !apptDraft.scheduled_at}
                              style={{ flex: 2, padding: "7px", borderRadius: 8, background: (!apptDraft.contact_name.trim() || !apptDraft.scheduled_at || apptSaving) ? "#d1d5db" : "#1a56db", color: "#fff", border: "none", fontWeight: 700, fontSize: ".72rem", cursor: (!apptDraft.contact_name.trim() || !apptDraft.scheduled_at || apptSaving) ? "not-allowed" : "pointer", fontFamily: "DM Sans,sans-serif", transition: "background .15s" }}
                            >
                              {apptSaving ? "Guardando..." : "✓ Guardar cita"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Upcoming appointments list ── */}
                    {apptData.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#9b8478", marginBottom: 8 }}>
                          🗓 Citas programadas ({apptData.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {apptData.map((appt) => (
                            <div
                              key={appt.id}
                              style={{ background: "#f7f3ed", border: "1.5px solid #e8e0d8", borderRadius: 10, padding: "9px 10px" }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: ".76rem", color: "#0f1f3d", marginBottom: 2 }}>
                                    {appt.contact_name}
                                  </div>
                                  {appt.contact_phone && (
                                    <div style={{ fontSize: ".66rem", color: "#9b8478" }}>📞 {appt.contact_phone}</div>
                                  )}
                                  <div style={{ fontSize: ".66rem", color: "#1a56db", marginTop: 3, fontWeight: 600 }}>
                                    🗓 {new Date(appt.scheduled_at).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                  {appt.notes && (
                                    <div style={{ fontSize: ".62rem", color: "#9b8478", marginTop: 3, fontStyle: "italic" }}>{appt.notes}</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => cancelAppointment(appt.id)}
                                  style={{ width: 22, height: 22, borderRadius: 6, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: ".7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "DM Sans,sans-serif" }}
                                  title="Cancelar cita"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <InlineDocumentsPanel
                      entityType="lot"
                      entityId={selectedLot.id}
                      entityLabel={`${selectedFrac.name} · ${selectedLot.code}`}
                    />
                  </div>
                )}

                {/* ── COTIZADOR ── */}
                {activeTab === "cotizador" && (
                  <div style={{ padding: "12px 13px" }}>
                    <button
                      onClick={() => setShowCotizador(true)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 11,
                        background: "linear-gradient(135deg,#1a3428,#101511)",
                        color: "#F7F3ED",
                        border: "none",
                        fontWeight: 700,
                        fontSize: ".8rem",
                        cursor: "pointer",
                        fontFamily: "DM Sans, sans-serif",
                        marginBottom: 12,
                        letterSpacing: ".02em",
                      }}
                    >
                      🧮 Abrir Cotizador completo
                      <span style={{ fontSize: ".7rem", opacity: .7, fontWeight: 400 }}>⛶</span>
                    </button>

                    {monthly > 0 && (
                      <div style={{ background: "linear-gradient(135deg,rgba(26,86,219,.08),transparent)", border: "1.5px solid rgba(26,86,219,.2)", borderRadius: 11, padding: "11px 13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", textTransform: "uppercase", letterSpacing: ".5px" }}>Mensualidad estimada</div>
                            <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "#1a56db", marginTop: 2 }}>{currency(Math.round(monthly))}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: ".58rem", color: "#9b8478", textTransform: "uppercase", letterSpacing: ".5px" }}>Total {cotPlazo} meses</div>
                            <div style={{ fontWeight: 700, fontSize: ".88rem", color: "#0f1f3d", marginTop: 2 }}>{currency(Math.round(monthly * cotPlazo))}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: ".64rem", color: "#9b8478", textAlign: "center", marginTop: 10 }}>
                      Ajusta los parámetros dentro del cotizador
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── COTIZADOR MODAL ── */}
    {showCotizador && selectedLot && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,12,10,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowCotizador(false); }}
      >
        <div
          style={{
            width: "min(960px, 100%)",
            height: "min(680px, 90vh)",
            borderRadius: 20,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,.4)",
          }}
        >
          {/* Modal header */}
          <div style={{ background: "linear-gradient(135deg,#1a3428,#101511)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: "1.4rem" }}>🧮</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: "#F7F3ED", lineHeight: 1.1 }}>
                Cotizador — {selectedLot.code}
              </div>
              <div style={{ fontSize: ".66rem", color: "rgba(247,243,237,.55)", marginTop: 2 }}>
                {selectedFrac.name} · {selectedLot.area_m2 ?? 0} m²
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button
                onClick={() => showToast("PDF en desarrollo")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,.12)", color: "#F7F3ED", border: "1px solid rgba(255,255,255,.2)", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}
              >
                ⬇ PDF
              </button>
              <button
                onClick={() => showToast("Email en desarrollo")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,.12)", color: "#F7F3ED", border: "1px solid rgba(255,255,255,.2)", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}
              >
                ✉ Email
              </button>
              <button
                onClick={() => setShowCotizador(false)}
                style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.12)", color: "#F7F3ED", border: "1px solid rgba(255,255,255,.2)", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Modal body */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* Left: parameters */}
            <div style={{ width: 280, flexShrink: 0, borderRight: "1.5px solid #e8e0d8", padding: "18px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "#9b8478", marginBottom: 10 }}>
                  Parámetros de financiamiento
                </div>
                {[
                  { lbl: "Precio financiado ($)", val: cotPrecioF, set: setCotPrecioF, step: 1000 },
                  { lbl: "Enganche ($)",           val: cotEnganche, set: setCotEnganche, step: 1000 },
                  { lbl: "Tasa anual (%)",          val: cotTasa,     set: setCotTasa,     step: 0.5 },
                  { lbl: "Plazo (meses)",           val: cotPlazo,    set: setCotPlazo,    step: 12 },
                ].map((f) => (
                  <div key={f.lbl} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: ".6rem", color: "#9b8478", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{f.lbl}</div>
                    <input
                      type="number"
                      value={f.val}
                      step={f.step}
                      onChange={(e) => f.set(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e0d8", borderRadius: 9, fontSize: ".9rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#f7f3ed", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>

              {/* Summary card */}
              {(() => {
                const pv = cotPrecioF - cotEnganche;
                const m = calcMonthly(cotPrecioF, cotEnganche, cotTasa, cotPlazo);
                const totalPagos = m * cotPlazo;
                const totalIntereses = totalPagos - pv;
                return m > 0 ? (
                  <div>
                    <div
                      style={{
                        borderRadius: 13,
                        background: "linear-gradient(135deg,#1a3428,#101511)",
                        padding: "14px 16px",
                        color: "#F7F3ED",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: ".58rem", color: "rgba(247,243,237,.5)", textTransform: "uppercase", letterSpacing: ".5px" }}>Mensualidad</div>
                          <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "#F7F3ED", lineHeight: 1, marginTop: 3 }}>{currency(Math.round(m))}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: ".58rem", color: "rgba(247,243,237,.5)", textTransform: "uppercase", letterSpacing: ".5px" }}>A financiar</div>
                          <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "#D9B07D", lineHeight: 1, marginTop: 3 }}>{currency(Math.round(pv))}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { lbl: "Total intereses", val: totalIntereses, col: "#dc2626" },
                        { lbl: "Enganche",        val: cotEnganche,    col: "#0f1f3d" },
                        { lbl: "Total a pagar",   val: totalPagos + cotEnganche, col: "#15803d", bold: true },
                      ].map((row) => (
                        <div key={row.lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "#f7f3ed", borderRadius: 8, border: "1px solid #e8e0d8" }}>
                          <span style={{ fontSize: ".75rem", color: "#5c4033", fontWeight: row.bold ? 700 : 500 }}>{row.lbl}</span>
                          <span style={{ fontSize: ".82rem", fontWeight: 800, color: row.col }}>{currency(Math.round(row.val))}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "#fffbf0", border: "1px solid #fcd34d", borderRadius: 8, fontSize: ".66rem", color: "#92400e" }}>
                      💡 Modifica los campos para recalcular en tiempo real
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Right: amortization table */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {(() => {
                const rows = generateAmort(cotPrecioF, cotEnganche, cotTasa, cotPlazo);
                if (rows.length === 0) return (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9b8478", fontSize: ".82rem" }}>
                    Ingresa los parámetros para ver la tabla
                  </div>
                );
                const totalCapital   = rows.reduce((s, r) => s + r.capital, 0);
                const totalIntereses = rows.reduce((s, r) => s + r.interes, 0);
                return (
                  <>
                    <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #e8e0d8", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f1f3d", display: "flex", alignItems: "center", gap: 8 }}>
                        📊 Tabla de Amortización completa
                      </div>
                      <div style={{ fontSize: ".7rem", color: "#9b8478", fontWeight: 600 }}>
                        {cotPlazo} cuotas · {cotTasa}% anual
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".72rem" }}>
                        <thead>
                          <tr style={{ background: "#1a3428", position: "sticky", top: 0 }}>
                            {["#", "SALDO INICIAL", "CAPITAL", "INTERÉS", "CUOTA", "SALDO FINAL"].map((h, i) => (
                              <th key={h} style={{ padding: "9px 10px", textAlign: i === 0 ? "center" : "right", color: i === 2 ? "#86efac" : i === 3 ? "#fcd34d" : "#F7F3ED", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr key={row.n} style={{ background: idx % 2 === 0 ? "#fff" : "#f7f3ed", borderBottom: "1px solid #f0ebe3" }}>
                              <td style={{ padding: "6px 10px", textAlign: "center", color: "#9b8478", fontWeight: 600 }}>{row.n}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#5c4033" }}>${Math.round(row.saldoInicial).toLocaleString("es-MX")}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#15803d", fontWeight: 700 }}>${Math.round(row.capital).toLocaleString("es-MX")}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#b45309", fontWeight: 600 }}>${Math.round(row.interes).toLocaleString("es-MX")}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#0f1f3d" }}>${Math.round(row.cuota).toLocaleString("es-MX")}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#5c4033" }}>${Math.round(row.saldoFinal).toLocaleString("es-MX")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: "10px 18px", borderTop: "1.5px solid #e8e0d8", background: "#f7f3ed", display: "flex", gap: 24, flexShrink: 0, fontSize: ".72rem" }}>
                      <span style={{ color: "#5c4033" }}>Capital total: <strong style={{ color: "#15803d" }}>{currency(Math.round(totalCapital))}</strong></span>
                      <span style={{ color: "#5c4033" }}>Intereses totales: <strong style={{ color: "#b45309" }}>{currency(Math.round(totalIntereses))}</strong></span>
                      <span style={{ marginLeft: "auto", color: "#5c4033" }}>Cuotas: <strong>{rows.length}</strong></span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── STATUS CONFIRMATION MODAL ── */}
    {pendingStatus && selectedLot && (() => {
      const fromC = LOT_COLORS[pendingStatus.from] || LOT_COLORS.available;
      const toC   = LOT_COLORS[pendingStatus.to]   || LOT_COLORS.available;
      return (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(10,12,10,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setPendingStatus(null); setConfirmName(""); } }}
        >
          <div style={{ width: "min(420px, 100%)", borderRadius: 20, background: "#fff", overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,.35)" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#1a3428,#101511)", padding: "16px 20px" }}>
              <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "#D9B07D", marginBottom: 4 }}>
                Confirmación de cambio
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", color: "#F7F3ED" }}>
                {selectedFrac.name} · {selectedLot.code}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 20px 8px" }}>
              {/* Transition arrow */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, borderRadius: 10, background: fromC.bg, border: `1.5px solid ${fromC.border}`, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: ".58rem", color: fromC.text, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".5px" }}>Desde</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 800, color: fromC.text, marginTop: 3 }}>
                    {STATUS_ICONS[pendingStatus.from]} {STATUS_LABELS[pendingStatus.from]}
                  </div>
                </div>
                <div style={{ fontSize: "1.3rem", color: "#9b8478", flexShrink: 0 }}>→</div>
                <div style={{ flex: 1, borderRadius: 10, background: toC.bg, border: `2px solid ${toC.barColor}`, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: ".58rem", color: toC.text, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".5px" }}>Hacia</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 800, color: toC.text, marginTop: 3 }}>
                    {STATUS_ICONS[pendingStatus.to]} {STATUS_LABELS[pendingStatus.to]}
                  </div>
                </div>
              </div>

              {/* Who confirms */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#9b8478", marginBottom: 6 }}>
                  👤 Confirmado por
                </div>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Nombre del responsable"
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e8e0d8", borderRadius: 10, fontSize: ".88rem", fontFamily: "DM Sans,sans-serif", color: "#0f1f3d", background: "#f7f3ed", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = toC.barColor; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e8e0d8"; }}
                />
                <div style={{ fontSize: ".6rem", color: "#9b8478", marginTop: 5 }}>
                  Este nombre quedará registrado en el historial de actividad del lote.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px 20px", display: "flex", gap: 10 }}>
              <button
                onClick={() => { setPendingStatus(null); setConfirmName(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#f7f3ed", color: "#5c4033", border: "1.5px solid #e8e0d8", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={!confirmName.trim()}
                style={{ flex: 2, padding: "10px", borderRadius: 10, background: confirmName.trim() ? toC.barColor : "#d1d5db", color: "#fff", border: "none", fontWeight: 700, fontSize: ".82rem", cursor: confirmName.trim() ? "pointer" : "not-allowed", fontFamily: "DM Sans,sans-serif", transition: "background .15s" }}
              >
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}

export default FracsPage;
