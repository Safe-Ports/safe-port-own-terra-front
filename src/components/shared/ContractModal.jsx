import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { lotService } from "@/services/lotService";
import { orgService } from "@/services/orgService";
import { folderService } from "@/services/folderService";
import { calculatorService } from "@/services/calculatorService";
import { evaluate, FormulaError } from "@/services/formulaEngine";
import { getFieldErrors } from "@/services/errors";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineDocument } from "react-icons/hi2";

const PAYMENT_METHODS = [
  { value: "cash",     label: "Efectivo"      },
  { value: "transfer", label: "Transferencia" },
  { value: "check",    label: "Cheque"        },
  { value: "card",     label: "Tarjeta"       },
];

const DOC_CATEGORIES = [
  { value: "contrato",       label: "Contrato"      },
  { value: "comprobante",    label: "Comprobante"   },
  { value: "identificacion", label: "Identificación"},
  { value: "escritura",      label: "Escritura"     },
  { value: "plano",          label: "Plano"         },
  { value: "otro",           label: "Otro"          },
];

/* ── Pre-relleno de variables de la calculadora desde los campos del contrato ──
   Las variables son abiertas; esto es solo una conveniencia: si el nombre se parece
   a un campo conocido, sugerimos su valor (editable). El resto queda vacío. */
function guessVarValue(varName, form) {
  const k = varName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f_]/g, "");
  const amount = Number(form.amount) || 0;
  const down   = Number(form.down_payment) || 0;
  if (/(precio|monto|total|valor)/.test(k)) return amount;
  if (/(enganche|down|inicial|anticipo)/.test(k)) return down;
  if (/(tasa|interes|rate)/.test(k)) return (Number(form.interest_rate) || 0) * 100;
  if (/(plazo|mes|month|term)/.test(k)) return Number(form.totalM) || 0;
  if (/(principal|financ|saldo|capital)/.test(k)) return Math.max(0, amount - down);
  return "";
}

/* ── Helper visual de error de campo ───────────────────────── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 4,
      fontSize: ".72rem", color: "var(--danger, #c0392b)",
      marginTop: 4, fontWeight: 500,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </span>
  );
}

const errorBorder = "1.8px solid var(--danger, #c0392b)";

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: ".62rem", fontWeight: 800, letterSpacing: ".14em",
      textTransform: "uppercase", color: "var(--mu)",
      borderBottom: "1px solid var(--line-soft)",
      paddingBottom: 6, marginBottom: 12, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

/* ── Fila dinámica de documento ────────────────────────────── */
function DocRow({ entry, folders, onChange, onRemove }) {
  const fileInputRef = useRef(null);
  const handleFile = (f) => {
    if (!f) return;
    onChange({ ...entry, file: f, fileName: f.name });
  };
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto auto auto",
      gap: 8, alignItems: "center",
      background: "var(--sf2)", border: "1px solid var(--bd)",
      borderRadius: 12, padding: "10px 12px", marginBottom: 8,
    }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1.5px solid var(--bd)", borderRadius: 10,
          padding: "7px 12px", cursor: "pointer", textAlign: "left", minWidth: 0,
        }}
      >
        <HiOutlineDocument style={{ color: "var(--forest)", flexShrink: 0, fontSize: "1rem" }} />
        <span style={{
          fontSize: ".8rem", color: entry.fileName ? "var(--tx)" : "var(--mu)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.fileName || "Seleccionar archivo…"}
        </span>
        <input ref={fileInputRef} type="file" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])} />
      </button>
      <select value={entry.category} onChange={e => onChange({ ...entry, category: e.target.value })}
        style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px", fontSize: ".78rem", background: "#fff", fontFamily: "var(--font-body)", color: "var(--tx)", outline: "none", cursor: "pointer" }}>
        {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select value={entry.folderId} onChange={e => onChange({ ...entry, folderId: e.target.value })}
        style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px", fontSize: ".78rem", background: "#fff", fontFamily: "var(--font-body)", color: "var(--tx)", outline: "none", cursor: "pointer", maxWidth: 160 }}>
        <option value="">Sin carpeta</option>
        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <button type="button" onClick={onRemove}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "4px 6px", display: "flex", borderRadius: 8 }}>
        <HiOutlineTrash style={{ fontSize: "1rem" }} />
      </button>
    </div>
  );
}

let _nextId = 1;
const newEntry = () => ({ id: _nextId++, file: null, fileName: "", category: "contrato", folderId: "" });

/* ── Selector con búsqueda (igual al de lote) ───────────────── */
function SearchSelect({ id, value, onChange, onBlur, options, placeholder, disabled, hasError, emptyLabel }) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase())
  );

  const borderStyle = hasError ? { border: "1.8px solid var(--danger, #c0392b)", outline: "none" } : undefined;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        id={id}
        className="fi"
        style={borderStyle}
        value={selected ? selected.label : search}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          setSearch(e.target.value);
          onChange("");
          setOpen(true);
        }}
        onFocus={() => { if (!selected) setOpen(true); }}
        onBlur={onBlur}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); setSearch(""); setOpen(true); }}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--mu)",
            fontSize: ".75rem", padding: "2px 4px",
          }}
        >✕</button>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
          background: "var(--sf, #fff)", border: "1.5px solid var(--bd)",
          borderRadius: 10, maxHeight: 200, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(30,61,43,.14)", marginTop: 4,
        }}>
          {emptyLabel && (
            <div
              onMouseDown={(e) => { e.preventDefault(); onChange(""); setSearch(""); setOpen(false); }}
              style={{
                padding: "9px 12px", cursor: "pointer", fontSize: ".82rem",
                color: "var(--mu)", borderBottom: "1px solid rgba(67,69,63,.08)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--tan-lt, #f5f0e8)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {emptyLabel}
            </div>
          )}
          {filtered.map(o => (
            <div
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setSearch(""); setOpen(false); }}
              style={{
                padding: "9px 12px", cursor: "pointer", fontSize: ".82rem",
                borderBottom: "1px solid rgba(67,69,63,.08)",
                color: "var(--tx)", background: String(o.value) === String(value) ? "var(--tan-lt)" : "transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--tan-lt, #f5f0e8)"}
              onMouseLeave={e => e.currentTarget.style.background = String(o.value) === String(value) ? "var(--tan-lt)" : "transparent"}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && search && (
            <div style={{ padding: "10px 12px", fontSize: ".78rem", color: "var(--mu)" }}>
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Reglas de validación ───────────────────────────────────── */
function validate(form, isEditing) {
  const errs = {};

  if (!isEditing && !form.inmuebleId)
    errs.inmuebleId = "Selecciona un fraccionamiento";

  if (!isEditing && !form.lot)
    errs.lot = "Selecciona un lote disponible";

  if (!form.clientId)
    errs.clientId = "El cliente es obligatorio";

  if (!form.date)
    errs.date = "La fecha de firma es obligatoria";
  if (!form.firstPaymentDate)
    errs.firstPaymentDate = "La fecha del primer pago es obligatoria";
  else if (form.date && form.firstPaymentDate < form.date)
    errs.firstPaymentDate = "Debe ser igual o posterior a la firma";
  if (form.type === "reserve" && !form.expirationDate)
    errs.expirationDate = "Indica el vencimiento de la reserva";

  const amount = Number(form.amount);
  if (!amount || amount <= 0)
    errs.amount = "El monto debe ser mayor a $0";
  else if (amount < 1000)
    errs.amount = "El monto parece muy bajo, verifica el valor";

  const down = Number(form.down_payment);
  if (down < 0)
    errs.down_payment = "El enganche no puede ser negativo";
  else if (amount > 0 && down >= amount)
    errs.down_payment = "El enganche debe ser menor al monto total";

  const meses = Number(form.totalM);
  if (!meses || meses < 1)
    errs.totalM = "El plazo debe ser al menos 1 mes";
  else if (meses > 360)
    errs.totalM = "El plazo máximo es 360 meses (30 años)";

  const interest = Number(form.interest_rate);
  if (interest < 0 || interest > 1)
    errs.interest_rate = "La tasa debe estar entre 0 y 1";

  return errs;
}

function parseServerErrors(err) {
  return getFieldErrors(err, {
    amount: "amount",
    down_payment: "down_payment",
    total_months: "totalM",
    contract_date: "date",
    first_payment_date: "firstPaymentDate",
    expiration_date: "expirationDate",
    client_id: "clientId",
    lot_id: "lot",
    interest_rate: "interest_rate",
  });
}

async function fetchAvailableLotsForFrac(inmuebleId) {
  if (!inmuebleId) return [];

  const limit = 200;
  const firstPage = await lotService.list({ inmueble_id: inmuebleId, status: "available", page: 1, limit });
  const totalPages = firstPage.pages || 1;

  if (totalPages <= 1) return firstPage.items || [];

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      lotService
        .list({ inmueble_id: inmuebleId, status: "available", page: index + 2, limit })
        .then((response) => response.items || [])
    )
  );

  return [...(firstPage.items || []), ...remainingPages.flat()];
}

/* ══ MODAL ═══════════════════════════════════════════════════ */
function ContractModal() {
  const {
    ui, closeModal, clients, fracs, selectedFracId, editingContract, contractDraft,
    saveContract, deleteContract, resetContractDraft, showToast, showError,
  } = useAppContext();
  const navigate = useNavigate();

  const goToCalculator = () => {
    resetContractDraft();
    closeModal("contractModal");
    setErrors({});
    navigate("/calculadora");
  };

  const [docs, setDocs]       = useState([]);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  /* ── Lot search state ── */
  const [lotSearch, setLotSearch]     = useState("");
  const [showLotDrop, setShowLotDrop] = useState(false);
  const lotRef = useRef(null);

  const activeFracs = fracs.filter((frac) => !frac.is_archived);
  const defaultInmuebleId = activeFracs.some((frac) => frac.id === selectedFracId)
    ? selectedFracId
    : activeFracs[0]?.id || "";

  const defaultForm = {
    number: "", inmuebleId: defaultInmuebleId, lot: "", clientId: clients[0]?.id || "",
    type: "sale", date: new Date().toISOString().split("T")[0],
    firstPaymentDate: new Date().toISOString().split("T")[0], expirationDate: "",
    amount: 0, down_payment: 0, totalM: 96,
    interest_rate: 0.12,
    seller_id: "", down_payment_method: "cash", notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  /* ── Calculadora de financiamiento activa (snapshot inmutable en la venta) ── */
  const useCalculator = ui.contractModal && !editingContract && form.type === "sale";
  const { data: activeCalc, isSuccess: calcLoaded } = useQuery({
    queryKey: ["calculators", "active", "lands"],
    queryFn: () => calculatorService.getActive("lands"),
    enabled: useCalculator,
    staleTime: 60_000,
  });
  // No hay calculadora activa configurada: no se puede registrar la venta.
  const noCalculator = useCalculator && calcLoaded && !activeCalc;
  const [calcVars, setCalcVars] = useState({});
  // Marca qué variables editó el usuario a mano (esas no se re-sincronizan del formulario).
  const calcEditedRef = useRef({});
  // Al cambiar de calculadora o reabrir el modal, olvida las ediciones manuales previas.
  useEffect(() => { calcEditedRef.current = {}; }, [activeCalc?.id, ui.contractModal]);
  // Pre-rellena/re-sincroniza las variables desde los montos del contrato (editable).
  // Las variables NO editadas a mano siempre reflejan el valor actual del formulario.
  useEffect(() => {
    if (!activeCalc?.variables?.length) return;
    setCalcVars((prev) => {
      const next = {};
      for (const v of activeCalc.variables) {
        next[v] = calcEditedRef.current[v] ? prev[v] : guessVarValue(v, form);
      }
      return next;
    });
  }, [activeCalc, form.amount, form.down_payment, form.interest_rate, form.totalM]);

  // Con calculadora activa, la tasa del contrato la manda la variable TASA_ANUAL
  // de la calculadora (ya no hay un campo aparte). guessVarValue la expone como
  // porcentaje (interest_rate * 100), así que aquí hacemos la conversión inversa.
  useEffect(() => {
    if (!useCalculator || !activeCalc?.variables?.length) return;
    const tasaVar = activeCalc.variables.find((v) => {
      const k = v.toLowerCase().replace(/_/g, "");
      return /(tasa|interes|rate)/.test(k);
    });
    if (!tasaVar) return;
    const raw = calcVars[tasaVar];
    if (raw === "" || raw == null) return;
    const dec = (Number(raw) || 0) / 100;
    setForm((f) => (f.interest_rate === dec ? f : { ...f, interest_rate: dec }));
  }, [useCalculator, activeCalc, calcVars]);

  const calcResult = useMemo(() => {
    if (!activeCalc?.formula || !activeCalc.variables?.length) return { value: null, error: "" };
    if (activeCalc.variables.some((v) => calcVars[v] === "" || calcVars[v] == null)) return { value: null, error: "" };
    try {
      return { value: evaluate(activeCalc.formula, calcVars), error: "" };
    } catch (err) {
      return { value: null, error: err instanceof FormulaError ? err.message : "Fórmula inválida" };
    }
  }, [activeCalc, calcVars]);

  const set = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const setInmueble = e => {
    const inmuebleId = e.target.value;
    setForm(p => ({ ...p, inmuebleId, lot: "" }));
    setLotSearch("");
    if (errors.inmuebleId || errors.lot) {
      setErrors(p => {
        const n = { ...p };
        delete n.inmuebleId;
        delete n.lot;
        return n;
      });
    }
  };

  const setNum = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const blurField = (k) => {
    const errs = validate(form, !!editingContract);
    if (errs[k]) setErrors(p => ({ ...p, [k]: errs[k] }));
  };

  /* queries */
  const { data: availableLots = [] } = useQuery({
    queryKey: ["lots", "available", form.inmuebleId],
    queryFn: () => fetchAvailableLotsForFrac(form.inmuebleId),
    enabled: ui.contractModal && !editingContract && !!form.inmuebleId,
  });
  const { data: usersData } = useQuery({
    // Solo vendedores ACTIVOS: no ofrecer integrantes dados de baja como responsable.
    // Se filtra en el servidor (para no-admin la lista ni siquiera trae is_active).
    queryKey: ["users-list", "active"],
    queryFn: () => orgService.listUsers({ limit: 100, is_active: true }),
    enabled: ui.contractModal,
    staleTime: 120_000,
  });
  const users = usersData?.items || (Array.isArray(usersData) ? usersData : []);
  const { data: folders = [] } = useQuery({
    queryKey: ["document-folders"],
    queryFn: folderService.list,
    staleTime: 30_000,
    enabled: ui.contractModal,
  });

  /* Cerrar dropdown al click fuera */
  useEffect(() => {
    if (!showLotDrop) return;
    const handler = (e) => { if (!lotRef.current?.contains(e.target)) setShowLotDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLotDrop]);

  useEffect(() => {
    if (!ui.contractModal) return;
    setDocs([]);
    setErrors({});
    setSaving(false);
    setLotSearch("");
    setShowLotDrop(false);
    if (editingContract) {
      setForm({
        ...defaultForm,
        number:              editingContract.contract_number || "",
        inmuebleId:          editingContract.lot?.inmueble_id || defaultForm.inmuebleId,
        lot:                 String(editingContract.lot?.id || editingContract.lot_id || ""),
        clientId:            String(editingContract.client?.id || editingContract.client_id || ""),
        type:                editingContract.type || "sale",
        date:                (editingContract.contract_date || editingContract.date || defaultForm.date).split("T")[0],
        firstPaymentDate:    (editingContract.first_payment_date || editingContract.contract_date || defaultForm.firstPaymentDate).split("T")[0],
        expirationDate:      editingContract.expiration_date?.split("T")[0] || "",
        amount:              editingContract.amount ?? 0,
        down_payment:        editingContract.down_payment ?? 0,
        totalM:              editingContract.total_months || editingContract.totalM || 96,
        interest_rate:       editingContract.interest_rate ?? 0.12,
        seller_id:           String(editingContract.seller?.id || editingContract.seller_id || ""),
        down_payment_method: editingContract.down_payment_method || "cash",
        notes:               editingContract.notes || "",
      });
    } else {
      setForm({
        ...defaultForm,
        ...(contractDraft || {}),
        inmuebleId: contractDraft?.inmuebleId || defaultForm.inmuebleId,
        clientId: contractDraft?.clientId || clients[0]?.id || "",
      });
    }
  }, [ui.contractModal, editingContract, contractDraft, defaultInmuebleId]);

  const addDoc    = () => setDocs(p => [...p, newEntry()]);
  const updateDoc = (id, updated) => setDocs(p => p.map(d => d.id === id ? updated : d));
  const removeDoc = (id) => setDocs(p => p.filter(d => d.id !== id));

  /* ── Lots filtrados para buscador ── */
  const filteredLots = useMemo(
    () => availableLots.filter(l =>
      !lotSearch || l.code.toLowerCase().includes(lotSearch.toLowerCase())
    ),
    [availableLots, lotSearch]
  );
  const selectedLotObj = availableLots.find(l => l.id === form.lot);

  const handleSave = async () => {
    const errs = validate(form, !!editingContract);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = Object.keys(errs)[0];
      document.getElementById(`cf-${first}`)?.focus();
      return;
    }

    // Para una venta se requiere una calculadora activa configurada.
    if (noCalculator) {
      showToast("Primero crea y activa una calculadora en Calculadora de financiamiento");
      return;
    }

    // Si hay calculadora activa para una venta, adjunta id + variables para que el
    // backend congele el snapshot de la fórmula usada.
    const calcPayload = (useCalculator && activeCalc)
      ? {
          calculator_id: activeCalc.id,
          calculator_vars: Object.fromEntries(
            (activeCalc.variables || []).map((v) => [v, Number(calcVars[v]) || 0])
          ),
        }
      : {};

    setSaving(true);
    try {
      await saveContract({
        ...(editingContract || {}),
        ...form,
        client_id:           form.clientId,
        lot_id:              form.lot,
        contract_date:       form.date,
        first_payment_date:  form.firstPaymentDate,
        expiration_date:     form.expirationDate || undefined,
        total_months:        Number(form.totalM),
        interest_rate:       Number(form.interest_rate ?? 0),
        seller_id:           form.seller_id || undefined,
        down_payment_method: form.down_payment_method || undefined,
        ...calcPayload,
        _docs: docs.filter(d => d.file),
      });
    } catch (err) {
      // Solo las validaciones 422 (Pydantic) traen errores por campo. Los errores
      // de negocio (400/404/409, p. ej. "vendedor deshabilitado") llevan un mensaje
      // claro + `details` de contexto (ids) — NO son errores de campo, así que van
      // al toast de error con su mensaje real, no a "revisa los campos en rojo".
      const status = err?.response?.status;
      const serverErrs = status === 422 ? parseServerErrors(err) : null;
      if (serverErrs) {
        setErrors(serverErrs);
        showToast("Revisa los campos marcados en rojo", "warning");
      } else {
        showError(err, "Error al guardar el contrato");
      }
    } finally {
      setSaving(false);
    }
  };

  const fi = (hasErr) => ({ className: "fi", style: hasErr ? { border: errorBorder, outline: "none" } : undefined });

  return (
    <Modal
      open={ui.contractModal}
      icon="📄"
      title={editingContract ? "Editar Contrato" : contractDraft?.type === "reserve" ? "Registrar Apartado" : "Generar Contrato"}
      subtitle={contractDraft?.type === "reserve" ? "Registra la reserva del lote con el cliente" : "Vincula lote y cliente"}
      onClose={() => { resetContractDraft(); closeModal("contractModal"); setErrors({}); }}
      footer={
        <>
          <button className="btn-s" onClick={() => { resetContractDraft(); closeModal("contractModal"); setErrors({}); }}>
            Cancelar
          </button>
          {editingContract && (
            <button className="btn-dan" onClick={() => deleteContract(editingContract.id)}>
              🗑 Eliminar
            </button>
          )}
          <button className="btn-p" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : editingContract ? "✓ Guardar cambios" : "✓ Registrar"}
          </button>
        </>
      }
    >
      {/* Error general */}
      {errors._general && (
        <div style={{
          background: "rgba(192,57,43,.08)", border: "1.5px solid var(--danger)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          fontSize: ".82rem", color: "var(--danger)", display: "flex", gap: 8, alignItems: "center",
        }}>
          ⚠️ {errors._general}
        </div>
      )}

      {/* ── 1. Datos del contrato ── */}
      <SectionLabel>Datos del contrato</SectionLabel>

      <div className="fg">
        <label className="fl">N° de Contrato <span style={{ color: "var(--mu)", fontWeight: 400 }}>(opcional)</span></label>
        <input id="cf-number" {...fi(errors.number)} value={form.number} onChange={set("number")}
          placeholder="CON-2026-001 · se asigna automáticamente si se deja vacío" />
        <FieldError msg={errors.number} />
      </div>

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Fraccionamiento
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          <select
            id="cf-inmuebleId"
            {...fi(errors.inmuebleId)}
            value={form.inmuebleId}
            onChange={setInmueble}
            onBlur={() => blurField("inmuebleId")}
            disabled={!!editingContract}
          >
            <option value="">— Seleccionar fraccionamiento —</option>
            {activeFracs.map((frac) => (
              <option key={frac.id} value={frac.id}>
                {frac.name} · {frac.available_lots ?? 0} disponibles
              </option>
            ))}
          </select>
          <FieldError msg={errors.inmuebleId} />
        </div>

        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Lote
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          {editingContract ? (
            <input
              className="fi"
              value={editingContract.lot?.code || form.lot || "—"}
              disabled
            />
          ) : (
            <div ref={lotRef} style={{ position: "relative" }}>
              <input
                id="cf-lot"
                className="fi"
                style={errors.lot ? { border: errorBorder, outline: "none" } : undefined}
                value={selectedLotObj
                  ? `${selectedLotObj.code}${selectedLotObj.area_m2 ? ` · ${selectedLotObj.area_m2} m²` : ""}`
                  : lotSearch}
                onChange={(e) => {
                  setLotSearch(e.target.value);
                  setForm(p => ({ ...p, lot: "" }));
                  setShowLotDrop(true);
                  if (errors.lot) setErrors(p => { const n = { ...p }; delete n.lot; return n; });
                }}
                onFocus={() => { if (!selectedLotObj) setShowLotDrop(true); }}
                onBlur={() => blurField("lot")}
                placeholder={!form.inmuebleId ? "Selecciona un fraccionamiento primero" : "Buscar lote por código…"}
                disabled={!form.inmuebleId}
                autoComplete="off"
              />
              {form.lot && (
                <button
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, lot: "" })); setLotSearch(""); setShowLotDrop(true); }}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--mu)",
                    fontSize: ".75rem", padding: "2px 4px",
                  }}
                >✕</button>
              )}
              {showLotDrop && filteredLots.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                  background: "var(--sf, #fff)", border: "1.5px solid var(--bd)",
                  borderRadius: 10, maxHeight: 200, overflowY: "auto",
                  boxShadow: "0 8px 24px rgba(30,61,43,.14)", marginTop: 4,
                }}>
                  {filteredLots.map(l => (
                    <div
                      key={l.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm(p => ({ ...p, lot: l.id }));
                        setLotSearch("");
                        setShowLotDrop(false);
                        if (errors.lot) setErrors(p => { const n = { ...p }; delete n.lot; return n; });
                      }}
                      style={{
                        padding: "9px 12px", cursor: "pointer", fontSize: ".82rem",
                        borderBottom: "1px solid rgba(67,69,63,.08)",
                        color: "var(--tx)", display: "flex", alignItems: "center", gap: 8,
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--tan-lt, #f5f0e8)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <strong style={{ fontFamily: "var(--font-body)", fontSize: ".78rem" }}>{l.code}</strong>
                      {l.area_m2 && <span style={{ color: "var(--mu)", fontSize: ".74rem" }}>{l.area_m2} m²</span>}
                      {l.price_contado && <span style={{ color: "var(--mu)", fontSize: ".74rem", marginLeft: "auto" }}>${Number(l.price_contado).toLocaleString("en-US")}</span>}
                    </div>
                  ))}
                </div>
              )}
              {showLotDrop && filteredLots.length === 0 && lotSearch && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                  background: "var(--sf, #fff)", border: "1.5px solid var(--bd)",
                  borderRadius: 10, padding: "10px 12px",
                  boxShadow: "0 8px 24px rgba(30,61,43,.14)", marginTop: 4,
                  fontSize: ".78rem", color: "var(--mu)",
                }}>
                  Sin lotes con ese código
                </div>
              )}
            </div>
          )}
          <FieldError msg={errors.lot} />
          {!editingContract && form.inmuebleId && availableLots.length === 0 && (
            <span style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: 4, display: "block" }}>
              Sin lotes disponibles en este fraccionamiento.
            </span>
          )}
        </div>
      </div>

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Cliente
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <SearchSelect
            id="cf-clientId"
            value={form.clientId}
            onChange={v => { setForm(p => ({ ...p, clientId: v })); if (errors.clientId) setErrors(p => { const n = { ...p }; delete n.clientId; return n; }); }}
            onBlur={() => blurField("clientId")}
            options={clients.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Buscar cliente…"
            hasError={!!errors.clientId}
          />
          <FieldError msg={errors.clientId} />
        </div>
      </div>

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Tipo de Contrato</label>
          <select className="fi" value={form.type} onChange={set("type")}>
            <option value="sale">Compraventa</option>
            <option value="rent">Arrendamiento</option>
            <option value="reserve">Reserva</option>
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Fecha de firma
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-date" type="date" {...fi(errors.date)} value={form.date}
            onChange={set("date")} onBlur={() => blurField("date")} />
          <FieldError msg={errors.date} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Primer pago
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-firstPaymentDate" type="date" {...fi(errors.firstPaymentDate)} value={form.firstPaymentDate}
            onChange={set("firstPaymentDate")} onBlur={() => blurField("firstPaymentDate")} />
          <FieldError msg={errors.firstPaymentDate} />
        </div>
      </div>

      {form.type === "reserve" && (
        <div className="fg">
          <label className="fl">
            Vencimiento de la reserva
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-expirationDate" type="date" {...fi(errors.expirationDate)} value={form.expirationDate}
            onChange={set("expirationDate")} onBlur={() => blurField("expirationDate")} />
          <FieldError msg={errors.expirationDate} />
        </div>
      )}

      <div className="fg">
        <label className="fl">Vendedor asignado</label>
        <SearchSelect
          value={form.seller_id}
          onChange={v => setForm(p => ({ ...p, seller_id: v }))}
          options={users.map(u => ({ value: u.id, label: u.name }))}
          placeholder="Buscar vendedor…"
          emptyLabel="— Sin asignar —"
        />
      </div>

      <div className="fg">
        <label className="fl">Notas</label>
        <textarea className="fi" rows="2" value={form.notes} onChange={set("notes")} />
      </div>

      {/* ── 2. Condiciones financieras ── */}
      <SectionLabel>Condiciones financieras</SectionLabel>

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Monto total ($)
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          <input id="cf-amount" type="number" min="0" {...fi(errors.amount)}
            value={form.amount}
            onChange={setNum("amount")}
            onBlur={() => blurField("amount")}
            placeholder="Ej. 450000" />
          <FieldError msg={errors.amount} />
        </div>

        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Enganche ($)</label>
          <input id="cf-down_payment" type="number" min="0" {...fi(errors.down_payment)}
            value={form.down_payment}
            onChange={setNum("down_payment")}
            onBlur={() => blurField("down_payment")}
            placeholder="Ej. 45000" />
          <FieldError msg={errors.down_payment} />
          {!errors.down_payment && Number(form.amount) > 0 && Number(form.down_payment) > 0 && (
            <span style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: 3, display: "block" }}>
              {((Number(form.down_payment) / Number(form.amount)) * 100).toFixed(1)}% del total
            </span>
          )}
        </div>

        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Plazo (meses)
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          <input id="cf-totalM" type="number" min="1" max="360" {...fi(errors.totalM)}
            value={form.totalM}
            onChange={setNum("totalM")}
            onBlur={() => blurField("totalM")}
            placeholder="Ej. 96" />
          <FieldError msg={errors.totalM} />
          {!errors.totalM && Number(form.totalM) > 0 && (
            <span style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: 3, display: "block" }}>
              {(Number(form.totalM) / 12).toFixed(1)} años
            </span>
          )}
        </div>
      </div>

      {/* Cuota mensual estimada */}
      {!editingContract && Number(form.amount) > 0 && Number(form.totalM) > 0 && (
        <div style={{
          background: "var(--tan-lt, #f5f0e8)", border: "1px solid var(--bd)",
          borderRadius: 10, padding: "10px 14px", fontSize: ".82rem",
          color: "var(--tx)", display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 4,
        }}>
          <span style={{ color: "var(--mu)" }}>Cuota mensual estimada</span>
          <b style={{ fontFamily: "var(--font-body)", fontSize: ".92rem" }}>
            ${Math.round((Number(form.amount) - Number(form.down_payment || 0)) / Number(form.totalM)).toLocaleString("en-US")} / mes
          </b>
        </div>
      )}

      {/* ── Sin calculadora activa: obligatoria para registrar la venta ── */}
      {noCalculator && (
        <div style={{
          border: "1px solid rgba(192,57,43,.45)", borderRadius: 16,
          padding: 14, marginBottom: 4, background: "rgba(192,57,43,.05)",
          boxShadow: "0 8px 18px rgba(192,57,43,.06)",
        }}>
          <div style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--danger)", marginBottom: 4 }}>
            ⚠ No hay una calculadora de financiamiento activa
          </div>
          <div style={{ fontSize: ".76rem", color: "var(--tx)", marginBottom: 10, lineHeight: 1.5 }}>
            Para registrar una venta primero debes crear y activar una calculadora con la
            fórmula de la mensualidad. La venta guardará una copia de esa fórmula.
          </div>
          <button type="button" className="btn-p" style={{ padding: "6px 12px", fontSize: ".75rem" }} onClick={goToCalculator}>
            Crear calculadora →
          </button>
        </div>
      )}

      {/* ── Calculadora de financiamiento activa ── */}
      {useCalculator && activeCalc && (
        <div style={{
          border: "1px solid rgba(53,94,59,.45)", borderRadius: 16,
          padding: 14, marginBottom: 4,
          background: "linear-gradient(135deg, var(--tan-lt), var(--sf))",
          boxShadow: "0 12px 28px rgba(30,61,43,.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--forest)" }}>
              🧮 {activeCalc.name}
            </span>
            <span style={{
              fontSize: ".6rem", fontWeight: 800, letterSpacing: ".06em", color: "var(--forest)",
              background: "var(--sf)", padding: "2px 9px", borderRadius: 999, border: "1px solid rgba(53,94,59,.30)",
            }}>CALCULADORA ACTIVA</span>
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: ".7rem", color: "var(--mu)", marginBottom: 10 }}>
            {activeCalc.formula}
          </div>
          {activeCalc.variables?.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
              {activeCalc.variables.map((v) => (
                <div className="fg" key={v} style={{ margin: 0 }}>
                  <label className="fl" style={{ fontFamily: "var(--font-body)", fontSize: ".68rem" }}>{v}</label>
                  <input className="fi" type="number" value={calcVars[v] ?? ""}
                    onChange={(e) => { calcEditedRef.current[v] = true; setCalcVars((p) => ({ ...p, [v]: e.target.value })); }} placeholder="0" />
                </div>
              ))}
            </div>
          )}
          {calcResult.error && (
            <div style={{ marginTop: 8, fontSize: ".72rem", color: "var(--danger,#c0392b)" }}>{calcResult.error}</div>
          )}
          {calcResult.value != null && !calcResult.error && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: ".78rem", color: "var(--mu)" }}>Mensualidad (se congela en la venta)</span>
              <b style={{ fontFamily: "var(--font-body)", fontSize: ".95rem", color: "var(--forest,#355E3B)" }}>
                ${calcResult.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </b>
            </div>
          )}
        </div>
      )}

      {/* La tasa vive en la variable TASA_ANUAL de la calculadora activa; este campo
          solo aparece cuando NO hay calculadora (edición o tipos sin calculadora). */}
      {!(useCalculator && activeCalc) && (
        <div className="fg">
          <label className="fl">Tasa anual (decimal, 0 a 1)</label>
          <input id="cf-interest_rate" type="number" min="0" max="1" step="0.01" {...fi(errors.interest_rate)}
            value={form.interest_rate} onChange={setNum("interest_rate")} onBlur={() => blurField("interest_rate")} />
          <FieldError msg={errors.interest_rate} />
        </div>
      )}

      <div className="fg">
        <label className="fl">Método de pago del enganche</label>
        <select className="fi" value={form.down_payment_method} onChange={set("down_payment_method")}>
          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* ── 3. Documentos ── */}
      <SectionLabel>Documentos</SectionLabel>

      {editingContract && (
        <div style={{ marginBottom: 12 }}>
          <InlineDocumentsPanel
            entityType="contract"
            entityId={editingContract.id}
            entityLabel={`Contrato ${editingContract.number || editingContract.id}`}
          />
        </div>
      )}

      {docs.length === 0 && (
        <div style={{ textAlign: "center", padding: "14px 0 10px", fontSize: ".8rem", color: "var(--mu)" }}>
          No hay documentos adjuntos. Puedes agregarlos ahora o desde el gestor de documentos.
        </div>
      )}

      {docs.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto auto auto",
          gap: 8, padding: "0 12px 4px",
          fontSize: ".62rem", fontWeight: 800, letterSpacing: ".1em",
          textTransform: "uppercase", color: "var(--mu)",
        }}>
          <span>Archivo</span><span>Categoría</span><span>Carpeta destino</span><span />
        </div>
      )}

      {docs.map(entry => (
        <DocRow
          key={entry.id} entry={entry} folders={folders}
          onChange={updated => updateDoc(entry.id, updated)}
          onRemove={() => removeDoc(entry.id)}
        />
      ))}

      <button type="button" onClick={addDoc} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 14px", borderRadius: 12,
        border: "1.5px dashed var(--forest)", background: "var(--tan-lt)",
        color: "var(--forest)", fontWeight: 700, fontSize: ".8rem",
        cursor: "pointer", fontFamily: "var(--font-body)", width: "100%",
        justifyContent: "center", marginTop: 4,
      }}>
        <HiOutlinePlus /> Agregar documento
      </button>

      <div style={{ marginTop: 16, fontSize: ".72rem", color: "var(--mu)" }}>
        <span style={{ color: "var(--danger)" }}>*</span> Campos obligatorios
      </div>
    </Modal>
  );
}

export default ContractModal;
