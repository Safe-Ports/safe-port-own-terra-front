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
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";
import "./fracs.css";

const LOT_COLORS = {
  available: { labelKey: "fracs.statusAvailable", className: "available", color: "#6FAF6B" },
  reserved: { labelKey: "fracs.statusReserved", className: "reserved", color: "#B98C58" },
  sold: { labelKey: "fracs.statusSold", className: "sold", color: "#C0392B" },
};

const SERVICES = [
  { k: "agua", labelKey: "lotInventory.water" },
  { k: "luz", labelKey: "lotInventory.electricity" },
  { k: "drenaje", labelKey: "lotInventory.drainage" },
  { k: "gas", labelKey: "lotInventory.gas" },
  { k: "internet", labelKey: "lotInventory.internet" },
  { k: "pavimento", labelKey: "lotInventory.pavement" },
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
  const { t } = useLocale();
  const meta = LOT_COLORS[status] || LOT_COLORS.available;
  return (
    <span className={`frac-status-badge ${meta.className}`}>
      <i />
      {t(meta.labelKey)}
    </span>
  );
}

function MapViewer({ src, onClose }) {
  const { t } = useLocale();
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
        <span>{t("fracs.planTitle")}</span>
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
          alt={t("fracs.mapAlt")}
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
  const { t, localeTag, format } = useLocale();
  const sectionLabel = (section) => (!section || section === "General" ? t("fracs.generalSection") : section);

  const [homeMode, setHomeMode]   = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  useEffect(() => {
    setHomeMode(true);
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
  const [apptDraft, setApptDraft] = useState({ contact_name: "", contact_phone: "", scheduled_at: "", notes: "" });
  const [apptSaving, setApptSaving] = useState(false);
  useEscapeKey(() => {
    if (showCotizador) setShowCotizador(false);
    else if (showLotModal) setShowLotModal(false);
  }, showCotizador || showLotModal);

  const selectedFrac = fracs.find((f) => f.id === selectedFracId) || fracs[0] || null;

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
        title={t("fracs.emptyTitle")}
        description={t("fracs.emptyText")}
        action={<Link className="mobile-primary-button" to="/lotes">{t("fracs.emptyAction")}</Link>}
      />
    );
  }

  if (homeMode) {
    return (
      <div className="frac-page">
        <aside className="frac-projects frac-panel">
          <div className="frac-panel-head">
            <div>
              <div className="frac-panel-title">{t("fracs.projects")}</div>
              <div className="frac-panel-sub">{t("fracs.activeProjects")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="frac-project-count">{fracs.length}</span>
            </div>
          </div>
          <div className="frac-panel-body">
            <div className="frac-project-list">
              {fracs.map((frac) => (
                <button
                  key={frac.id}
                  className="frac-project-item"
                  onClick={() => { setSelectedFracId(frac.id); setHomeMode(false); }}
                >
                  <span className="frac-project-mark">{frac.name.slice(0, 2).toUpperCase()}</span>
                  <span className="frac-project-copy">
                    <span className="frac-project-name">{frac.name}</span>
                    <span className="frac-project-meta">
                      {t("fracs.lotsCount", { count: frac.total_lots ?? 0 })}
                      {frac.created_at ? ` / ${new Date(frac.created_at).toLocaleDateString(localeTag)}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <section className="frac-workspace" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: "linear-gradient(135deg,#D4EAE0,#EDE3D3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", margin: "0 auto 20px",
              boxShadow: "0 8px 24px rgba(30,61,43,.1)",
              animation: "pulse-soft 3s ease-in-out infinite",
            }}>
              🗺️
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: "#1E3D2B", marginBottom: 10, fontWeight: 600 }}>
              {t("fracs.welcomeTitle")}
            </div>
            <div style={{ fontSize: "0.84rem", color: "#83867C", lineHeight: 1.6, marginBottom: 20 }}>
              {t("fracs.welcomeText")}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[["🏡", t("fracs.tagInventory")], ["📐", t("fracs.tagPlan")], ["💰", t("fracs.tagQuote")]].map(([icon, label]) => (
                <span key={label} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#F1EEE6", borderRadius: 20, padding: "5px 12px",
                  fontSize: ".74rem", fontWeight: 600, color: "#43453F",
                }}>
                  {icon} {label}
                </span>
              ))}
            </div>
            <style>{`@keyframes pulse-soft { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }`}</style>
          </div>
        </section>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={t("fracs.guideTitle")}
        subtitle={t("fracs.guideSubtitle")}
        steps={[
          { title: t("fracs.guideStep1Title"), text: t("fracs.guideStep1Text") },
          { title: t("fracs.guideStep2Title"), text: t("fracs.guideStep2Text") },
          { title: t("fracs.guideStep3Title"), text: t("fracs.guideStep3Text") },
          { title: t("fracs.guideStep4Title"), text: t("fracs.guideStep4Text") },
          { title: t("fracs.guideStep5Title"), text: t("fracs.guideStep5Text") },
          { title: t("fracs.guideStep6Title"), text: t("fracs.guideStep6Text") },
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
      showToast(t("fracs.toastApptCreated"));
    } catch (err) {
      showError(err, t("fracs.toastApptError"));
    } finally {
      setApptSaving(false);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await appointmentService.cancel(id);
      await refetchAppts();
      showToast(t("fracs.toastApptCancelled"));
    } catch (err) {
      showError(err, t("fracs.toastApptCancelError"));
    }
  };

  return (
    <div className="frac-page">
      <aside className="frac-projects frac-panel">
        <div className="frac-panel-head">
          <div>
            <div className="frac-panel-title">{t("fracs.projects")}</div>
            <div className="frac-panel-sub">{t("fracs.activeProjects")}</div>
          </div>
          <span className="frac-project-count">{filteredProjects.length}</span>
        </div>
        <div className="frac-panel-body">
          <label className="frac-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>
            <input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder={t("fracs.searchProject")} />
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
                    {t("fracs.lotsCount", { count: frac.total_lots ?? 0 })}
                    {frac.created_at ? ` / ${new Date(frac.created_at).toLocaleDateString(localeTag)}` : ""}
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
            <p>{t("fracs.heroSubtitle")}</p>
            <div className="frac-hero-actions">
              <Button variant="secondary" onClick={() => selectedFrac.image_url && setShowMapViewer(true)} disabled={!selectedFrac.image_url}>{t("fracs.viewPlan")}</Button>
              <Button variant="secondary" onClick={openEditor}>{t("fracs.edit")}</Button>
              <Button variant="secondary" onClick={() => exportAppData("lots")}>{t("fracs.export")}</Button>
            </div>
          </article>

          <div className="frac-kpis">
            <article className="frac-kpi deep"><span>{t("fracs.totalLots")}</span><strong>{stats.total}</strong><small>{t("fracs.sectionsCount", { count: sections.length })}</small></article>
            <article className="frac-kpi available"><span>{t("fracs.kpiAvailable")}</span><strong>{stats.available}</strong><small>{t("fracs.availablePct", { pct: stats.total ? Math.round((stats.available / stats.total) * 100) : 0 })}</small></article>
            <article className="frac-kpi reserved"><span>{t("fracs.kpiReserved")}</span><strong>{stats.reserved}</strong><small>{t("fracs.reservedTracking")}</small></article>
            <article className="frac-kpi sold"><span>{t("fracs.kpiSold")}</span><strong>{stats.sold}</strong><small>{t("fracs.soldClosed")}</small></article>
          </div>
        </div>

        <div className="frac-filters">
          <div className="frac-segment">
            {[
              ["all", t("fracs.filterAll")],
              ["available", t("fracs.statusAvailable")],
              ["reserved", t("fracs.statusReserved")],
              ["sold", t("fracs.statusSold")],
            ].map(([value, label]) => (
              <button key={value} className={statusFilter === value ? "on" : ""} onClick={() => setStatusFilter(value)}>
                {value !== "all" ? <i className={`frac-dot ${LOT_COLORS[value].className}`} /> : null}
                {label}
              </button>
            ))}
          </div>
          <select className="frac-field" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
            <option value="">{t("fracs.allSections")}</option>
            {sections.map((section) => <option key={section} value={section}>{sectionLabel(section)}</option>)}
          </select>
          <label className="frac-search grow">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("fracs.searchLot")} />
          </label>
          {(statusFilter !== "all" || sectionFilter || search) && (
            <button className="frac-clear" onClick={() => { setStatusFilter("all"); setSectionFilter(""); setSearch(""); }}>{t("fracs.clear")}</button>
          )}
        </div>

        <div className="frac-matrix-grid">
          <article className="frac-panel frac-plan-panel">
            <div className="frac-panel-head">
              <div>
                <div className="frac-panel-title">{t("fracs.planTitle")}</div>
                <div className="frac-panel-sub">{t("fracs.planSubtitle")}</div>
              </div>
              <button className="frac-icon-btn" onClick={() => selectedFrac.image_url && setShowMapViewer(true)} disabled={!selectedFrac.image_url}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 5 1 1 5 1"/><polyline points="11 1 15 1 15 5"/><polyline points="15 11 15 15 11 15"/><polyline points="5 15 1 15 1 11"/></svg>
              </button>
            </div>
            <div className="frac-plan-body" onClick={() => selectedFrac.image_url && setShowMapViewer(true)}>
              {selectedFrac.image_url ? (
                <img src={selectedFrac.image_url} alt={t("fracs.mapAlt")} />
              ) : (
                <div className="frac-plan-empty">
                  <strong>{t("fracs.noPlan")}</strong>
                  <span>{t("fracs.noPlanText")}</span>
                </div>
              )}
              {selectedFrac.image_url ? <span className="frac-zoom-badge">{t("fracs.zoom")}</span> : null}
            </div>
            <div className="frac-legend">
              <span><i className="available" />{t("fracs.statusAvailable")}</span>
              <span><i className="reserved" />{t("fracs.statusReserved")}</span>
              <span><i className="sold" />{t("fracs.statusSold")}</span>
            </div>
          </article>

          <article className="frac-panel frac-lots-panel">
            <div className="frac-panel-head">
              <div>
                <div className="frac-panel-title">{t("fracs.matrixTitle")}</div>
                <div className="frac-panel-sub">{t("fracs.matrixSubtitle")}</div>
              </div>
              <StatusBadge status="available" />
            </div>
            <div className="frac-lots-scroll">
              {lotsLoading ? (
                <div className="frac-empty">{t("fracs.loadingLots")}</div>
              ) : (
                <>
                  {sections.filter((section) => !sectionFilter || section === sectionFilter).map((section) => {
                    const sectionLots = filteredLots.filter((lot) => (lot.section || "General") === section);
                    if (!sectionLots.length) return null;
                    return (
                      <section className="frac-section" key={section}>
                        <div className="frac-section-head">
                          <span>{sectionLabel(section)}</span>
                          <small>{t("fracs.lotsCount", { count: sectionLots.length })}</small>
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
                                <span>{lot.area_m2 ? t("fracs.areaUnit", { area: lot.area_m2 }) : t("fracs.noArea")}</span>
                                {precio ? <em className="frac-lot-price">{format.currency(precio, "MXN", { maximumFractionDigits: 0 })}</em> : null}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                  {!filteredLots.length ? <div className="frac-empty">{t("fracs.noMatch")}</div> : null}
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
            <strong>{t("fracs.quoteTitle")}</strong>
            <small>{selectedLot ? t("fracs.quoteLot", { code: selectedLot.code }) : t("fracs.quoteSelectLot")}</small>
          </span>
          <svg className="frac-quote-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
        </button>
        <div className="frac-quote-body">
          <div className="frac-quote-result">
            <span>{t("fracs.estimatedMonthly")}</span>
            <strong>{monthly > 0 ? format.currency(Math.round(monthly), "MXN", { maximumFractionDigits: 0 }) : "--"}</strong>
            <small>{t("fracs.termMonths", { term: cotPlazo, rate: cotTasa })}</small>
          </div>
          <div className="frac-quote-rows">
            <span>{t("fracs.financedPrice")} <strong>{format.currency(Number(cotPrecioF || 0), "MXN", { maximumFractionDigits: 0 })}</strong></span>
            <span>{t("fracs.downPayment")} <strong>{format.currency(Number(cotEnganche || 0), "MXN", { maximumFractionDigits: 0 })}</strong></span>
            <span>{t("fracs.toFinance")} <strong>{format.currency(Math.round(financed), "MXN", { maximumFractionDigits: 0 })}</strong></span>
            <span>{t("fracs.estimatedTotal")} <strong>{format.currency(Math.round(quoteTotal || 0), "MXN", { maximumFractionDigits: 0 })}</strong></span>
          </div>
          <button className="frac-quote-full" onClick={() => setShowCotizador(true)} disabled={!selectedLot}>{t("fracs.openFullQuote")}</button>
        </div>
      </article>

      {showLotModal && selectedLot ? (
        <div className="frac-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowLotModal(false)}>
          <article className="frac-lot-modal">
            <div className="frac-modal-head">
              <div className="frac-modal-id">{selectedLot.code}</div>
              <div>
                <h2>{t("fracs.lotDetailTitle")}</h2>
                <p>{t("fracs.lotLocation", { frac: selectedFrac.name, section: sectionLabel(selectedLot.section), area: selectedLot.area_m2 || 0 })}</p>
              </div>
              <StatusBadge status={selectedLot.status} />
              <button className="frac-modal-close" onClick={() => setShowLotModal(false)}>×</button>
            </div>
            <div className="frac-modal-body">
              <div className="frac-tabs">
                {[
                  ["ficha", t("fracs.tabFicha")],
                  ["gestion", t("fracs.tabGestion")],
                  ["documentos", t("fracs.tabDocumentos")],
                ].map(([tab, label]) => (
                  <button key={tab} className={activeTab === tab ? "on" : ""} onClick={() => setActiveTab(tab)}>
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "ficha" ? (
                <>
                  <div className="frac-detail-grid">
                    <div><strong>{selectedLot.frente_ml || "--"}</strong><span>{t("fracs.frontMl")}</span></div>
                    <div><strong>{selectedLot.fondo_ml || "--"}</strong><span>{t("fracs.depthMl")}</span></div>
                    <div><strong>{selectedLot.area_m2 || "--"}</strong><span>{t("fracs.surfaceM2")}</span></div>
                    {selectedLot.price_contado
                      ? <div className="frac-detail-price"><strong>{format.currency(selectedLot.price_contado, "MXN", { maximumFractionDigits: 0 })}</strong><span>{t("fracs.cashPrice")}</span></div>
                      : null}
                    {selectedLot.price_financiado
                      ? <div className="frac-detail-price"><strong>{format.currency(selectedLot.price_financiado, "MXN", { maximumFractionDigits: 0 })}</strong><span>{t("fracs.financedPriceLabel")}</span></div>
                      : null}
                  </div>

                  <div className="frac-services">
                    {SERVICES.map((service) => {
                      const on = !!(selectedLot.services?.[service.k]);
                      return (
                        <label key={service.k} className="frac-service">
                          <span>{t(service.labelKey)}</span>
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
                  <div className="frac-section-label">{t("fracs.currentStatus")}</div>
                  <div style={{ marginBottom: 14 }}>
                    <StatusBadge status={selectedLot.status} />
                  </div>
                  <div className="frac-actions-list">
                    {selectedLot.status !== "sold" ? <button onClick={() => navigate("/contratos")}>{t("fracs.registerSale")}</button> : null}
                    <button onClick={() => setShowApptForm((value) => !value)}>{t("fracs.scheduleVisit")}</button>
                    <button onClick={openEditor}>{t("fracs.editInLots")}</button>
                  </div>
                  {showApptForm ? (
                    <div className="frac-appointment-form">
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">{t("fracs.contact")}</label>
                        <input value={apptDraft.contact_name} onChange={(event) => setApptDraft((p) => ({ ...p, contact_name: event.target.value }))} placeholder={t("fracs.contactPlaceholder")} />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">{t("fracs.phone")}</label>
                        <input value={apptDraft.contact_phone} onChange={(event) => setApptDraft((p) => ({ ...p, contact_phone: event.target.value }))} placeholder={t("fracs.phonePlaceholder")} />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">{t("fracs.dateTime")}</label>
                        <input type="datetime-local" value={apptDraft.scheduled_at} onChange={(event) => setApptDraft((p) => ({ ...p, scheduled_at: event.target.value }))} />
                      </div>
                      <div className="frac-appt-field">
                        <label className="frac-appt-lbl">{t("fracs.notes")}</label>
                        <textarea rows="2" value={apptDraft.notes} onChange={(event) => setApptDraft((p) => ({ ...p, notes: event.target.value }))} placeholder={t("fracs.notesPlaceholder")} />
                      </div>
                      <Button variant="primary" onClick={saveAppointment} disabled={apptSaving || !apptDraft.contact_name.trim() || !apptDraft.scheduled_at}>
                        {apptSaving ? t("fracs.saving") : t("fracs.saveAppt")}
                      </Button>
                    </div>
                  ) : null}
                  {apptData.length ? (
                    <div className="frac-appointments">
                      {apptData.map((appt) => (
                        <div key={appt.id}>
                          <strong>{appt.contact_name}</strong>
                          <span>{new Date(appt.scheduled_at).toLocaleString(localeTag)}</span>
                          <button onClick={() => cancelAppointment(appt.id)}>{t("fracs.cancelAppt")}</button>
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
                <h2>{t("fracs.calcTitle")}</h2>
                <p>{t("fracs.calcSubtitle", { frac: selectedFrac.name, code: selectedLot.code })}</p>
              </div>
              <button className="frac-modal-close" onClick={() => setShowCotizador(false)}>×</button>
            </div>
            <div className="frac-calculator-body">
              <aside className="frac-calculator-controls">
                {[
                  [t("fracs.financedPrice"), cotPrecioF, setCotPrecioF, 1000],
                  [t("fracs.downPayment"), cotEnganche, setCotEnganche, 1000],
                  [t("fracs.annualRate"), cotTasa, setCotTasa, 0.5],
                  [t("fracs.termMonthsLabel"), cotPlazo, setCotPlazo, 12],
                ].map(([label, value, setter, step]) => (
                  <label key={label}>
                    <span>{label}</span>
                    <input type="number" value={value} step={step} onChange={(event) => setter(Number(event.target.value))} />
                  </label>
                ))}
                <div className="frac-quote-result">
                  <span>{t("fracs.monthlyPayment")}</span>
                  <strong>{monthly > 0 ? format.currency(Math.round(monthly), "MXN", { maximumFractionDigits: 0 }) : "--"}</strong>
                  <small>{t("fracs.toFinanceInline", { amount: format.currency(Math.round(financed), "MXN", { maximumFractionDigits: 0 }) })}</small>
                </div>
              </aside>
              <div className="frac-amort-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        t("fracs.amortNum"),
                        t("fracs.amortInitialBalance"),
                        t("fracs.amortCapital"),
                        t("fracs.amortInterest"),
                        t("fracs.amortPayment"),
                        t("fracs.amortFinalBalance"),
                      ].map((head) => <th key={head}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {generateAmort(cotPrecioF, cotEnganche, cotTasa, cotPlazo).map((row) => (
                      <tr key={row.n}>
                        <td>{row.n}</td>
                        <td>{format.currency(Math.round(row.saldoInicial), "MXN", { maximumFractionDigits: 0 })}</td>
                        <td>{format.currency(Math.round(row.capital), "MXN", { maximumFractionDigits: 0 })}</td>
                        <td>{format.currency(Math.round(row.interes), "MXN", { maximumFractionDigits: 0 })}</td>
                        <td>{format.currency(Math.round(row.cuota), "MXN", { maximumFractionDigits: 0 })}</td>
                        <td>{format.currency(Math.round(row.saldoFinal), "MXN", { maximumFractionDigits: 0 })}</td>
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
        title={t("fracs.guideTitle")}
        subtitle={t("fracs.guideSubtitle")}
        steps={[
          { title: t("fracs.guideStep1Title"), text: t("fracs.guideStep1Text") },
          { title: t("fracs.guideStep2Title"), text: t("fracs.guideStep2Text") },
          { title: t("fracs.guideStep3Title"), text: t("fracs.guideStep3Text") },
          { title: t("fracs.guideStep4Title"), text: t("fracs.guideStep4Text") },
          { title: t("fracs.guideStep5Title"), text: t("fracs.guideStep5Text") },
          { title: t("fracs.guideStep6Title"), text: t("fracs.guideStep6Text") },
        ]}
      />
    </div>
  );
}

export default FracsPage;
