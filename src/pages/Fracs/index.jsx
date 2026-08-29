import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiMap, HiBookmark, HiSquares2X2, HiXMark } from "react-icons/hi2";
import GuideModal from "@/components/shared/GuideModal";
import PhoneInput from "@/components/shared/PhoneInput";
import ClientPicker from "@/components/shared/ClientPicker";
import DocumentUploadFields, { useDocumentUpload } from "@/components/shared/DocumentUploadFields";
import MatrixSheet from "./MatrixSheet";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import EmptyState from "@/components/ui/EmptyState";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import Button from "@/components/Button";
import { lotService } from "@/services/lotService";
import { appointmentService } from "@/services/appointmentService";
import { currency, measure } from "@/services/formatters";
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

/**
 * Texto corto para la marca del encabezado. Los códigos vienen como "MZ2-L05":
 * se queda con lo de antes del guion ("MZ2"), que identifica la manzana. Sin
 * guion, corta a 3 caracteres para que no se desborde el cuadro.
 */
function lotMark(code) {
  const head = String(code || "").split("-")[0];
  return head.slice(0, 4) || "—";
}

/**
 * Fila de la ficha técnica. Todas las cifras van alineadas a la derecha sobre
 * la misma columna y la unidad en un carril propio: así "312 m²" y "12 ml"
 * comparten el punto de fuga y dejan de verse disparejas entre sí.
 */
function SpecRow({ label, value, unit, money }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="lotp-spec">
      <span className="lotp-spec-k">{label}</span>
      <span className="lotp-spec-n">
        <span className={`lotp-spec-v${money ? " money" : ""}`}>{value}</span>
        <span className="lotp-spec-u">{unit || ""}</span>
      </span>
    </div>
  );
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
    openContractCreate,
    saveDocument,
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
  // Vista del fraccionamiento: "plano" (plano + grilla) o "matriz" (hoja tipo plantilla).
  const [fracView, setFracView] = useState("plano");
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [showCotizador, setShowCotizador] = useState(false);
  const [cotPrecioF, setCotPrecioF] = useState(0);
  const [cotEnganche, setCotEnganche] = useState(0);
  const [cotTasa, setCotTasa] = useState(12);
  const [cotPlazo, setCotPlazo] = useState(96);
  // Una acción a la vez: null | "apartar" | "cita" | "venta". Mientras hay una
  // abierta, el panel muestra SOLO su formulario — la ficha y los servicios
  // distraían de la tarea y empujaban el botón de guardar fuera de la vista.
  const [panelMode, setPanelMode] = useState(null);
  const [apptDraft, setApptDraft] = useState({ client: null, date: "", time: "", notes: "" });
  const [apptSaving, setApptSaving] = useState(false);
  const docUpload = useDocumentUpload({ category: "plano" });
  const [docSaving, setDocSaving] = useState(false);
  const apartarOpen = panelMode === "apartar";
  const showApptForm = panelMode === "cita";
  const setApartarOpen = (v) => setPanelMode((m) => ((typeof v === "function" ? v(m === "apartar") : v) ? "apartar" : null));
  const [apartarUntil, setApartarUntil] = useState("");   // datetime-local
  const [apartarMonto, setApartarMonto] = useState("");   // opcional: hay apartados de palabra
  const [apartarFile, setApartarFile]   = useState(null); // comprobante, puede llegar después
  const [apartarBusy, setApartarBusy] = useState(false);
  const [apartarClient, setApartarClient] = useState(null); // {id, name, phone, email} | null
  const [ventaClient, setVentaClient] = useState(null);     // comprador elegido para el contrato
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

  // Dona de inventario: paleta monocromática (claro→profundo = disponible→vendido,
  // se lee como una progresión hacia "resuelto") en vez de 4 cajas sueltas.
  const inventoryDonut = useMemo(() => {
    const total = stats.total || 1;
    const availablePct = (stats.available / total) * 100;
    const reservedPct = (stats.reserved / total) * 100;
    const availableEnd = availablePct;
    const reservedEnd = availableEnd + reservedPct;
    return {
      gradient: `conic-gradient(var(--frac-donut-available) 0% ${availableEnd}%, var(--frac-donut-reserved) ${availableEnd}% ${reservedEnd}%, var(--frac-donut-sold) ${reservedEnd}% 100%)`,
      availablePct: Math.round(availablePct),
    };
  }, [stats]);

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
        icon={<HiSquares2X2 />}
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
                    : <span className="frac-gallery-thumb-empty"><HiMap /></span>}
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
    // Cada lote arranca en su ficha, sin arrastrar el formulario a medio
    // llenar del lote anterior.
    setPanelMode(null);
    setApartarClient(null);
    setVentaClient(null);
    setApptDraft({ client: null, date: "", time: "", notes: "" });
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
    if (!selectedLot || !apptDraft.client || !apptDraft.date || !apptDraft.time) return;
    setApptSaving(true);
    try {
      await appointmentService.create({
        lot_id: selectedLot.id,
        // La cita queda ligada al cliente del CRM, no a un contacto suelto:
        // así aparece en su ficha y se puede dar seguimiento.
        client_id: apptDraft.client.id,
        contact_name: apptDraft.client.name,
        contact_phone: apptDraft.client.phone || undefined,
        scheduled_at: new Date(`${apptDraft.date}T${apptDraft.time}`).toISOString(),
        notes: apptDraft.notes.trim() || undefined,
      });
      await refetchAppts();
      setApptDraft({ client: null, date: "", time: "", notes: "" });
      setPanelMode(null);
      showToast("Cita agendada");
    } catch (err) {
      showError(err, "Error al agendar la cita");
    } finally {
      setApptSaving(false);
    }
  };

  // ── Apartado con expiración ──────────────────────────────────────────────
  /* El comprobante no bloquea el apartado: si su subida falla, la reserva ya
     quedó hecha y el papel se puede adjuntar después. */
  const subirComprobante = async (lotId) => {
    if (!apartarFile) return;
    try {
      await lotService.reservationReceipt(lotId, apartarFile);
    } catch {
      showToast("Lote apartado, pero no se pudo subir el comprobante", "warning");
    }
  };

  const reserveLot = async () => {
    if (!selectedLot || !apartarUntil || !apartarClient) return;
    setApartarBusy(true);
    try {
      await lotService.update(selectedLot.id, {
        status: "reserved",
        reserved_until: new Date(apartarUntil).toISOString(),
        client_id: apartarClient.id,
        // Opcional: se puede apartar de palabra y cargar el monto después.
        ...(apartarMonto ? { reserved_amount: Number(apartarMonto) } : {}),
      });
      await subirComprobante(selectedLot.id);
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setApartarOpen(false); setApartarUntil(""); setApartarClient(null); setApartarMonto(""); setApartarFile(null);
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
        ...(apartarClient?.id ? { client_id: apartarClient.id } : {}),
        ...(apartarMonto ? { reserved_amount: Number(apartarMonto) } : {}),
      });
      await subirComprobante(selectedLot.id);
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setApartarOpen(false); setApartarUntil(""); setApartarClient(null); setApartarMonto(""); setApartarFile(null);
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

        <div className="frac-donut-card">
          <div className="frac-donut" style={{ background: inventoryDonut.gradient }}>
            <div className="frac-donut-center">
              <strong>{stats.total}</strong>
              <small>Total lotes</small>
            </div>
          </div>
          <div className="frac-donut-legend">
            <div className="frac-donut-row">
              <span className="frac-donut-dot" style={{ background: "var(--frac-donut-available)" }} />
              <span className="frac-donut-label">Disponibles<small>{inventoryDonut.availablePct}% del inventario</small></span>
              <span className="frac-donut-val">{stats.available}</span>
            </div>
            <div className="frac-donut-row">
              <span className="frac-donut-dot" style={{ background: "var(--frac-donut-reserved)" }} />
              <span className="frac-donut-label">Apartados<small>Seguimiento activo</small></span>
              <span className="frac-donut-val">{stats.reserved}</span>
            </div>
            <div className="frac-donut-row">
              <span className="frac-donut-dot" style={{ background: "var(--frac-donut-sold)" }} />
              <span className="frac-donut-label">Vendidos<small>Cerrados</small></span>
              <span className="frac-donut-val">{stats.sold}</span>
            </div>
            <div className="frac-donut-foot">{sections.length} secciones</div>
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lote o manzana" />
          </label>
          {(statusFilter !== "all" || sectionFilter || search) && (
            <button className="frac-clear" onClick={() => { setStatusFilter("all"); setSectionFilter(""); setSearch(""); }}>Limpiar</button>
          )}
        </div>

        <div className="frac-views">
          <button
            className={fracView === "plano" ? "on" : ""}
            onClick={() => setFracView("plano")}
          >
            Plano y matriz
          </button>
          <button
            className={fracView === "matriz" ? "on" : ""}
            onClick={() => setFracView("matriz")}
          >
            Vista matriz
          </button>
        </div>

        {fracView === "matriz" ? (
          <MatrixSheet
            lots={filteredLots}
            fracId={selectedFrac.id}
            fracName={selectedFrac.name}
            loading={lotsLoading}
            showError={showError}
          />
        ) : (
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
                                <span>{measure(lot.area_m2) ? `${measure(lot.area_m2)} m²` : "Sin área"}</span>
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
        )}
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

      {/* Portal a body: el contenedor de la página crea un stacking context propio
          y ahí la barra superior queda por encima del panel, robándole los clicks. */}
      {showLotModal && selectedLot ? createPortal(
        <div className="lotp-overlay" onClick={(event) => event.target === event.currentTarget && setShowLotModal(false)}>
          <aside className="lotp" aria-label={`Detalle del lote ${selectedLot.code}`}>
            {/* ── Encabezado: el código manda, el estado aparece UNA sola vez ── */}
            <header className="lotp-hd">
              <div className={`lotp-mark${selectedLot.status === "reserved" ? " reserved" : selectedLot.status === "sold" ? " sold" : ""}`}>
                <span>{lotMark(selectedLot.code)}</span>
              </div>
              <div className="lotp-id">
                <div className="lotp-kicker">Lote</div>
                <div className="lotp-code">{selectedLot.code}</div>
                <div className="lotp-where">
                  {selectedFrac.name}
                  <i />
                  {selectedLot.section || "General"}
                </div>
              </div>
              <div className="lotp-hd-end">
                <StatusBadge status={selectedLot.status} />
                {resLeft ? <span className={`frac-countdown ${resLeft.tone}`}>{resLeft.text}</span> : null}
                <button className="lotp-x" onClick={() => setShowLotModal(false)} aria-label="Cerrar">
                  <HiXMark />
                </button>
              </div>
            </header>

            <div className="lotp-body">
              {/* ── Columna de datos ──
                  Con una acción abierta muestra SOLO su formulario; si no, la
                  ficha completa del lote. */}
              <div className="lotp-data">
                {panelMode ? (
                  <div className="lotp-form">
                    <div className="lotp-form-hd">
                      <button className="lotp-back" onClick={() => setPanelMode(null)}>
                        ← Volver
                      </button>
                      <div className="lotp-form-t">
                        {panelMode === "apartar"
                          ? (selectedLot.status === "reserved" ? "Extender apartado" : "Apartar lote")
                          : panelMode === "cita" ? "Agendar cita"
                          : panelMode === "documento" ? "Subir documento"
                          : "Registrar venta"}
                      </div>
                    </div>

                    {panelMode === "apartar" ? (
                      <div className="frac-apartar-form">
                        <label className="frac-appt-lbl">Cliente interesado</label>
                        <ClientPicker value={apartarClient} onSelect={setApartarClient} disabled={apartarBusy} />

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
                        <label className="frac-appt-lbl">Monto del apartado (opcional)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          className="frac-apartar-input"
                          value={apartarMonto}
                          onChange={(e) => setApartarMonto(e.target.value)}
                        />
                        <div style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: -4, lineHeight: 1.4 }}>
                          Se propondrá como enganche al generar el contrato, así que baja el capital a financiar.
                        </div>

                        <label className="frac-appt-lbl">Comprobante (opcional)</label>
                        <input
                          type="file" className="frac-apartar-input"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => setApartarFile(e.target.files?.[0] || null)}
                        />
                        <div style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: -4, lineHeight: 1.4 }}>
                          {apartarFile ? `Se adjuntará ${apartarFile.name}` : "Si no lo tienes ahora, apartas igual y lo subes después."}
                        </div>

                        <Button
                          variant="primary"
                          onClick={selectedLot.status === "reserved" ? extendReservation : reserveLot}
                          disabled={apartarBusy || !apartarUntil || !apartarClient}
                        >
                          {apartarBusy ? "Guardando..." : selectedLot.status === "reserved" ? "Guardar vencimiento" : "Confirmar apartado"}
                        </Button>
                      </div>
                    ) : null}

                    {panelMode === "cita" ? (
                      <div className="frac-appointment-form">
                        <label className="frac-appt-lbl">Cliente</label>
                        <ClientPicker
                          value={apptDraft.client}
                          onSelect={(c) => setApptDraft((p) => ({ ...p, client: c }))}
                          disabled={apptSaving}
                        />
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
                        <Button variant="primary" onClick={saveAppointment} disabled={apptSaving || !apptDraft.client || !apptDraft.date || !apptDraft.time}>
                          {apptSaving ? "Guardando..." : "Guardar cita"}
                        </Button>
                      </div>
                    ) : null}

                    {panelMode === "documento" ? (
                      <div className="frac-appointment-form">
                        <DocumentUploadFields ctl={docUpload} defaultFolderAppKey="lands" />
                        <Button
                          variant="primary"
                          disabled={docSaving}
                          onClick={async () => {
                            if (!docUpload.validate() || docSaving) return;
                            setDocSaving(true);
                            try {
                              // El lote ya está decidido por el contexto: se vincula
                              // solo, sin preguntar a qué se adjunta.
                              const ok = await saveDocument(
                                {
                                  ...docUpload.form,
                                  folderId: docUpload.form.folderId || undefined,
                                  linkType: "lot",
                                  linkedId: selectedLot.id,
                                },
                                docUpload.file
                              );
                              if (ok !== false) {
                                docUpload.reset();
                                setPanelMode(null);
                              }
                            } finally {
                              setDocSaving(false);
                            }
                          }}
                        >
                          {docSaving ? "Subiendo..." : "Guardar documento"}
                        </Button>
                      </div>
                    ) : null}

                    {panelMode === "venta" ? (
                      <div className="frac-appointment-form">
                        <label className="frac-appt-lbl">Comprador</label>
                        <ClientPicker value={ventaClient} onSelect={setVentaClient} />
                        <p className="lotp-form-help">
                          Al continuar se abre el contrato con este comprador y el lote ya cargados.
                        </p>
                        <Button
                          variant="primary"
                          disabled={!ventaClient}
                          onClick={() => {
                            setShowLotModal(false);
                            setPanelMode(null);
                            // El modal de contrato espera `lot` (el id de la unidad)
                            // e `inmuebleId`, no `lotId`.
                            openContractCreate({
                              clientId: ventaClient.id,
                              lot: selectedLot.id,
                              inmuebleId: selectedFrac.id,
                            });
                          }}
                        >
                          Continuar al contrato →
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                <>
                {/* Apartado vigente: quién y hasta cuándo */}
                {selectedLot.status === "reserved" ? (
                  <div className="lotp-sec">
                    <div className="lotp-sh"><b>Apartado</b></div>
                    <div className="lotp-resv">
                      {selectedLot.client_name ? (
                        <div className="lotp-resv-row">
                          <span className="lotp-resv-k">Cliente</span>
                          <span className="lotp-resv-v">{selectedLot.client_name}</span>
                        </div>
                      ) : null}
                      {selectedLot.reserved_by_name ? (
                        <div className="lotp-resv-row">
                          <span className="lotp-resv-k">Apartó</span>
                          <span className="lotp-resv-v">{selectedLot.reserved_by_name}</span>
                        </div>
                      ) : null}
                      <div className="lotp-resv-row">
                        <span className="lotp-resv-k">Vence</span>
                        <span className="lotp-resv-v">
                          {selectedLot.reserved_until ? new Date(selectedLot.reserved_until).toLocaleString("es-MX") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ── Ficha técnica: cifras alineadas a la derecha, unidad en carril fijo ── */}
                <div className="lotp-sec">
                  <div className="lotp-sh"><b>Ficha técnica</b></div>
                  <div className="lotp-specs">
                    <SpecRow label="Superficie" value={measure(selectedLot.area_m2)} unit="m²" />
                    <SpecRow label="Frente" value={measure(selectedLot.frente_ml)} unit="ml" />
                    <SpecRow label="Fondo" value={measure(selectedLot.fondo_ml)} unit="ml" />
                    {selectedLot.price_contado ? (
                      <SpecRow label="Precio de contado" value={currency(selectedLot.price_contado)} money />
                    ) : null}
                    {selectedLot.price_financiado ? (
                      <SpecRow label="Precio financiado" value={currency(selectedLot.price_financiado)} money />
                    ) : null}
                  </div>
                </div>

                <div className="lotp-sec">
                  <div className="lotp-sh"><b>Servicios</b></div>
                  <div className="lotp-svc">
                    {SERVICES.map((service) => {
                      const on = !!(selectedLot.services?.[service.k]);
                      return (
                        <span key={service.k} className={`lotp-chip${on ? " on" : ""}`}>{service.lbl}</span>
                      );
                    })}
                  </div>
                </div>

                {apptData.length ? (
                  <div className="lotp-sec">
                    <div className="lotp-sh"><b>Citas próximas</b></div>
                    <div className="frac-appointments">
                      {apptData.map((appt) => (
                        <div key={appt.id}>
                          <strong>{appt.contact_name}</strong>
                          <span>{new Date(appt.scheduled_at).toLocaleString("es-MX")}</span>
                          <button onClick={() => cancelAppointment(appt.id)}>Cancelar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="lotp-sec">
                  <div className="lotp-sh"><b>Documentos</b></div>
                  <InlineDocumentsPanel
                    entityType="lot"
                    entityId={selectedLot.id}
                    entityLabel={`${selectedFrac.name} / ${selectedLot.code}`}
                    /* Sin esto abriría el modal global, que queda por debajo de
                       este panel; acá la subida es una sección más. */
                    onUpload={() => { docUpload.reset(); setPanelMode("documento"); }}
                  />
                </div>
                </>
                )}
              </div>

              {/* ── Columna de acciones (fija, no scrollea) ── */}
              <div className="lotp-acts">
                <div className="lotp-acts-lbl">Acciones</div>

                {selectedLot.status === "available" ? (
                  <button
                    className={`lotp-btn${apartarOpen ? " on" : " primary"}`}
                    onClick={() => {
                      if (apartarOpen) { setPanelMode(null); return; }
                      setApartarUntil(toLocalInput(new Date(Date.now() + 7 * 86400000)));
                      setApartarClient(null);
                      setPanelMode("apartar");
                    }}
                  >
                    <HiBookmark /> Apartar lote
                  </button>
                ) : null}

                {selectedLot.status === "reserved" ? (
                  <button
                    className={`lotp-btn${apartarOpen ? " on" : ""}`}
                    onClick={() => {
                      if (apartarOpen) { setPanelMode(null); return; }
                      setApartarUntil(selectedLot.reserved_until ? toLocalInput(new Date(selectedLot.reserved_until)) : "");
                      setApartarClient(selectedLot.client_id ? { id: selectedLot.client_id, name: selectedLot.client_name } : null);
                      setPanelMode("apartar");
                    }}
                  >
                    Extender vencimiento
                  </button>
                ) : null}

                {/* La venta es la acción principal en un lote ya apartado. */}
                {selectedLot.status !== "sold" ? (
                  <button
                    className={`lotp-btn${panelMode === "venta" ? " on" : selectedLot.status === "reserved" ? " primary" : ""}`}
                    onClick={() => {
                      if (panelMode === "venta") { setPanelMode(null); return; }
                      // El interesado del lote ya es el candidato natural a comprador.
                      setVentaClient(selectedLot.client_id
                        ? { id: selectedLot.client_id, name: selectedLot.client_name }
                        : null);
                      setPanelMode("venta");
                    }}
                  >
                    Registrar venta
                  </button>
                ) : null}

                <button
                  className={`lotp-btn${showApptForm ? " on" : ""}`}
                  onClick={() => {
                    if (showApptForm) { setPanelMode(null); return; }
                    // Se precarga el interesado del lote: casi siempre la cita es con él.
                    const known = apartarClient
                      || (selectedLot.client_id ? { id: selectedLot.client_id, name: selectedLot.client_name } : null);
                    setApptDraft((p) => ({ ...p, client: known }));
                    setPanelMode("cita");
                  }}
                >
                  Agendar cita
                </button>

                {selectedLot.status === "reserved" ? (
                  <>
                    <div className="lotp-acts-sep" />
                    <button className="lotp-btn sm danger" onClick={releaseLot} disabled={apartarBusy}>
                      Liberar lote
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </aside>
        </div>,
        document.body
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
                    <input
                      type="number"
                      value={value}
                      step={step}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => setter(event.target.value === "" ? "" : Number(event.target.value))}
                    />
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
