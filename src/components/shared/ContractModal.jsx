import WorkflowForm from "@/components/forms/WorkflowForm";
import AmountInput from "@/components/forms/AmountInput";
import { useEffect, useMemo, useRef, useState } from "react";
import { clientService } from "@/services/clientService";
import ClientPicker from "@/components/shared/ClientPicker";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { lotService } from "@/services/lotService";
import { orgService } from "@/services/orgService";
import { folderService } from "@/services/folderService";
import { calculatorService } from "@/services/calculatorService";
import SellerPicker from "./SellerPicker";
import { guessVarValue, standardMonthlyPayment } from "@/services/financingQuote";
import { evaluate, FormulaError } from "@/services/formulaEngine";
import { getFieldErrors } from "@/services/errors";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineDocument } from "react-icons/hi2";

const PAYMENT_METHODS = [
  { value: "cash",     label: "Efectivo"      },
  { value: "transfer", label: "Transferencia" },
  { value: "check",    label: "Cheque"        },
  { value: "card",     label: "Tarjeta"       },
  { value: "other",    label: "Otro"          },
];

// Una venta de contado es un solo pago, sin enganche ni interés: el backend la
// registra como un plazo de 1 mes. Así no hace falta una calculadora para
// vender a quien paga todo de una vez.
//
// En parcialidades: varios pagos mensuales sin intereses y sin calculadora —
// el backend reparte el saldo en partes iguales cuando la tasa es 0.
const planOf = (contract) => {
  const months = Number(contract?.total_months ?? contract?.totalM);
  const rate = Number(contract?.interest_rate ?? 0);
  if (months === 1 && rate === 0 && Number(contract?.down_payment ?? 0) === 0) return "cash";
  if (rate === 0 && !contract?.calculator_id) return "installments";
  return "financed";
};

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

function SectionLabel({ children, ...rest }) {
  // ...rest reenvía props arbitrarios (p. ej. data-tour, usado por el tour guiado
  // de contratos) al div real. Sin esto, cualquier prop que no sea `children` se
  // descarta en silencio — nunca llega al DOM.
  return (
    <div
      {...rest}
      style={{
        fontSize: ".62rem", fontWeight: 800, letterSpacing: ".14em",
        textTransform: "uppercase", color: "var(--mu)",
        borderBottom: "1px solid var(--line-soft)",
        paddingBottom: 6, marginBottom: 12, marginTop: 4,
      }}
    >
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

/**
 * Nombres de variables de la calculadora sin un valor numérico válido en calcVars.
 * Antes esto no existía: una variable vacía/inválida se mandaba como 0 en silencio
 * (`Number(x) || 0`) al guardar el contrato, y el botón nunca revisaba nada — se
 * podía congelar una mensualidad mal calculada sin ningún aviso.
 */
export function missingCalcVars(variables, calcVars) {
  return (variables || []).filter(
    (v) => calcVars[v] === "" || calcVars[v] == null || Number.isNaN(Number(calcVars[v]))
  );
}

/* ── Reglas de validación ───────────────────────────────────── */
// Nombre de cada campo en el aviso de "te falta completar".
const FIELD_LABEL = {
  inmuebleId: "fraccionamiento", lot: "lote", clientId: "cliente", date: "fecha de firma",
  firstPaymentDate: "fecha de pago", expirationDate: "vencimiento", amount: "monto total",
  down_payment: "enganche", totalM: "plazo", interest_rate: "tasa", down_payment_method_detail: "descripción del método de pago",
};

export function incompleteMessage(errs) {
  const names = [...new Set(Object.keys(errs).map((key) => FIELD_LABEL[key] || key))];
  if (!names.length) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
  return `El contrato todavía no está completo. Revisa: ${list}.`;
}

function validate(form, isEditing) {
  const errs = {};
  const cash = form.type === "sale" && form.paymentPlan === "cash";
  const installments = form.type === "sale" && form.paymentPlan === "installments";

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
  if (cash) {
    // Contado: sin enganche, plazo ni tasa que revisar.
  } else if (down < 0)
    errs.down_payment = "El enganche no puede ser negativo";
  else if (amount > 0 && down >= amount)
    errs.down_payment = "El enganche debe ser menor al monto total";

  const meses = Number(form.totalM);
  if (cash) {
    // El plazo de contado lo fija el formulario (1 pago).
  } else if (!meses || meses < 1)
    errs.totalM = "El plazo debe ser al menos 1 mes";
  else if (meses > 360)
    errs.totalM = "El plazo máximo es 360 meses (30 años)";

  const interest = Number(form.interest_rate);
  if (!cash && !installments && (interest < 0 || interest > 1))
    errs.interest_rate = "La tasa debe estar entre 0 y 1";

  if (form.down_payment_method === "other" && !String(form.down_payment_method_detail || "").trim())
    errs.down_payment_method_detail = "Describe cómo se va a pagar";

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
    saveContract, deleteContract, resetContractDraft, setContractDraft, showToast, showError, canUseFeature,
  } = useAppContext();
  const navigate = useNavigate();
  const canEditCalculator = canUseFeature("lands.write");

  const goToCalculator = () => {
    setContractDraft({ ...form, _docs: docs, _calcVars: calcVars, _calcEdited: calcEditedRef.current, _resumeContract: true });
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
    number: "", inmuebleId: defaultInmuebleId, lot: "", clientId: "",
    type: "sale", date: new Date().toISOString().split("T")[0],
    firstPaymentDate: new Date().toISOString().split("T")[0], expirationDate: "",
    amount: 0, down_payment: 0, totalM: 96,
    interest_rate: 0.12,
    seller_id: "", down_payment_method: "cash", down_payment_method_detail: "", notes: "",
    paymentPlan: "financed",
    // A mensualidades: "calculator" usa la calculadora activa (si hay);
    // "standard" usa la amortización estándar con la tasa anual.
    calcMode: "calculator",
  };
  const [form, setForm] = useState(defaultForm);

  /* ── Calculadora de financiamiento activa (snapshot inmutable en la venta) ── */
  const isCash = form.type === "sale" && form.paymentPlan === "cash";
  const isInstallments = form.type === "sale" && form.paymentPlan === "installments";
  // La calculadora es opcional. A mensualidades, si la organización tiene una
  // activa se ofrece (su fórmula queda congelada en la venta); si no tiene o la
  // venta elige no usarla, el backend aplica la amortización estándar con la tasa.
  const useCalculator = ui.contractModal && !editingContract && form.type === "sale" && form.paymentPlan === "financed";
  const { data: activeCalc, isSuccess: calcLoaded, isPending: calcPending, isError: calcFailed, refetch: retryCalculator } = useQuery({
    queryKey: ["calculators", "active", "lands"],
    queryFn: () => calculatorService.getActive("lands"),
    enabled: useCalculator,
    staleTime: 60_000,
  });
  const applyCalc = useCalculator && !!activeCalc && form.calcMode !== "standard";
  const [calcVars, setCalcVars] = useState({});
  // Marca qué variables editó el usuario a mano (esas no se re-sincronizan del formulario).
  const calcEditedRef = useRef({});
  // Al cambiar de calculadora o reabrir el modal, olvida las ediciones manuales previas.
  useEffect(() => { calcEditedRef.current = contractDraft?._calcEdited || {}; setCalcVars(contractDraft?._calcVars || {}); }, [activeCalc?.id, ui.contractModal, contractDraft]);
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
    if (!applyCalc || !activeCalc?.variables?.length) return;
    const tasaVar = activeCalc.variables.find((v) => {
      const k = v.toLowerCase().replace(/_/g, "");
      return /(tasa|interes|rate)/.test(k);
    });
    if (!tasaVar) return;
    const raw = calcVars[tasaVar];
    if (raw === "" || raw == null) return;
    const dec = (Number(raw) || 0) / 100;
    setForm((f) => (f.interest_rate === dec ? f : { ...f, interest_rate: dec }));
  }, [applyCalc, activeCalc, calcVars]);

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

  const selectedClient = useQuery({ queryKey: ["client", String(form.clientId)], queryFn: () => clientService.get(form.clientId), enabled: !!form.clientId && ui.contractModal });
  /* queries */
  const { data: availableLots = [] } = useQuery({
    queryKey: ["lots", "available", form.inmuebleId],
    queryFn: () => fetchAvailableLotsForFrac(form.inmuebleId),
    enabled: ui.contractModal && !editingContract && !!form.inmuebleId,
  });
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
    setDocs(contractDraft?._docs || []);
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
        down_payment_method_detail: editingContract.down_payment_method_detail || "",
        paymentPlan:         planOf(editingContract),
        notes:               editingContract.notes || "",
      });
    } else {
      setForm({
        ...defaultForm,
        ...(contractDraft || {}),
        inmuebleId: contractDraft?.inmuebleId || defaultForm.inmuebleId,
        clientId: contractDraft?.clientId || "",
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
    if (saving || (useCalculator && (calcPending || calcFailed))) return;
    const errs = validate(form, !!editingContract);
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Sin este aviso el botón parecía no hacer nada: los errores quedaban en
      // campos fuera de la vista y el contrato no se registraba.
      showToast(incompleteMessage(errs), "warning");
      const first = Object.keys(errs)[0];
      document.getElementById(`cf-${first}`)?.focus();
      return;
    }

    // Si hay calculadora activa para una venta, adjunta id + variables para que el
    // backend congele el snapshot de la fórmula usada. calcResult.error se queda
    // vacío mientras falta una variable (a propósito, para no regañar mientras el
    // usuario todavía está llenando el formulario), así que aquí se revisa aparte,
    // justo antes de guardar.
    if (applyCalc) {
      const missing = missingCalcVars(activeCalc.variables, calcVars);
      if (missing.length > 0) {
        showToast(
          `Falta el valor de ${missing.length === 1 ? "la variable" : "las variables"} "${missing.join('", "')}" de la calculadora`,
          "warning"
        );
        return;
      }
      if (calcResult.error) {
        showToast(calcResult.error, "warning");
        return;
      }
    }

    const calcPayload = applyCalc
      ? {
          calculator_id: activeCalc.id,
          calculator_vars: Object.fromEntries(
            (activeCalc.variables || []).map((v) => [v, Number(calcVars[v])])
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
        total_months:        isCash ? 1 : Number(form.totalM),
        interest_rate:       isCash || isInstallments ? 0 : Number(form.interest_rate ?? 0),
        down_payment:        isCash ? 0 : form.down_payment,
        seller_id:           form.seller_id || undefined,
        down_payment_method: form.down_payment_method || undefined,
        down_payment_method_detail: form.down_payment_method === "other" ? form.down_payment_method_detail.trim() : undefined,
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
      icon={<HiOutlineDocument />}
      title={editingContract ? "Editar Contrato" : contractDraft?.type === "reserve" ? "Registrar Apartado" : "Generar Contrato"}
      subtitle={contractDraft?.type === "reserve" ? "Registra la reserva del lote con el cliente" : "Vincula lote y cliente"}
      onClose={() => { if (!saving) { resetContractDraft(); closeModal("contractModal"); setErrors({}); } }}
      footer={
        <>
          <div className="lands-contract-summary"><strong>{selectedClient.data?.name || clients.find(c => String(c.id) === String(form.clientId))?.name || "Selecciona un cliente"}</strong><span>{selectedLotObj?.code || editingContract?.lot?.code || "Selecciona un lote"} · Total ${Number(form.amount || 0).toLocaleString("es-MX")}</span>{useCalculator && calcResult.value != null && !calcResult.error && <span>Mensualidad del plan: ${calcResult.value.toLocaleString("es-MX", { maximumFractionDigits: 2 })}</span>}</div>
          <button type="button" disabled={saving} className="btn-s" onClick={() => { resetContractDraft(); closeModal("contractModal"); setErrors({}); }}>
            Cancelar
          </button>
          {editingContract && (
            <button className="btn-dan" onClick={() => deleteContract(editingContract.id)}>
              Eliminar
            </button>
          )}
          <button className="btn-p" data-tour="contrato-guardar" type="submit" form="lands-contract-form" disabled={saving || (useCalculator && (calcPending || calcFailed))}>
            {saving ? "Guardando…" : editingContract ? "Guardar cambios" : "Registrar"}
          </button>
        </>
      }
    >
      <WorkflowForm id="lands-contract-form" noValidate onSubmit={event => { event.preventDefault(); handleSave(); }}>
      {/* Error general */}
      {errors._general && (
        <div style={{
          background: "rgba(192,57,43,.08)", border: "1.5px solid var(--danger)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          fontSize: ".82rem", color: "var(--danger)", display: "flex", gap: 8, alignItems: "center",
        }}>
          {errors._general}
        </div>
      )}

      {/* ── 1. Datos del contrato ── */}
      <SectionLabel>Datos del contrato</SectionLabel>

      <div className="fg">
        <label className="fl" htmlFor="cf-number">N° de Contrato <span style={{ color: "var(--mu)", fontWeight: 400 }}>(opcional)</span></label>
        <input id="cf-number" {...fi(errors.number)} value={form.number} onChange={set("number")}
          placeholder="CON-2026-001 · se asigna automáticamente si se deja vacío" />
        <FieldError msg={errors.number} />
      </div>

      <div className="fr-row" data-tour="contrato-frac-lote">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-inmuebleId">
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
          <label className="fl" htmlFor="cf-lot">
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

      <div className="fr-row" data-tour="contrato-cliente">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-clientId">
            Cliente
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <ClientPicker inputId="cf-clientId" value={form.clientId ? selectedClient.data || clients.find(c => String(c.id) === String(form.clientId)) || null : null} onSelect={client => { setForm(previous => ({ ...previous, clientId: client?.id || "" })); setErrors(previous => ({ ...previous, clientId: "" })); }} disabled={saving} />
          <FieldError msg={errors.clientId} />
        </div>
      </div>

      <div className="fr-row" data-tour="contrato-tipo">
        <div className="fg" style={{ flex: 1 }}>
          <label htmlFor="field-shared-contractmodal-1" className="fl">Tipo de Contrato</label>
          <select id="field-shared-contractmodal-1" className="fi" value={form.type} onChange={set("type")}>
            <option value="sale">Compraventa</option>
            <option value="rent">Arrendamiento</option>
            <option value="reserve">Reserva</option>
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-date">
            Fecha de firma
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-date" type="date" {...fi(errors.date)} value={form.date}
            onChange={set("date")} onBlur={() => blurField("date")} />
          <FieldError msg={errors.date} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-firstPaymentDate">
            {isCash ? "Fecha de pago" : "Primer pago"}
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-firstPaymentDate" type="date" {...fi(errors.firstPaymentDate)} value={form.firstPaymentDate}
            onChange={set("firstPaymentDate")} onBlur={() => blurField("firstPaymentDate")} />
          <FieldError msg={errors.firstPaymentDate} />
        </div>
      </div>

      {form.type === "reserve" && (
        <div className="fg">
          <label className="fl" htmlFor="cf-expirationDate">
            Vencimiento de la reserva
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-expirationDate" type="date" {...fi(errors.expirationDate)} value={form.expirationDate}
            onChange={set("expirationDate")} onBlur={() => blurField("expirationDate")} />
          <FieldError msg={errors.expirationDate} />
        </div>
      )}

      <div className="fg" data-tour="contrato-vendedor">
        <label className="fl" htmlFor="cf-seller">Vendedor asignado</label>
        <SellerPicker
          inputId="cf-seller"
          value={form.seller_id}
          onChange={(id) => setForm((p) => ({ ...p, seller_id: id }))}
          disabled={saving}
        />
      </div>

      <div className="fg">
        <label htmlFor="field-shared-contractmodal-2" className="fl">Notas</label>
        <textarea id="field-shared-contractmodal-2" className="fi" rows="2" value={form.notes} onChange={set("notes")} />
      </div>

      {/* ── 2. Condiciones financieras ── */}
      <SectionLabel>Condiciones financieras</SectionLabel>

      {form.type === "sale" && (
        <div className="fg">
          <span className="fl" id="cf-plan-label">¿Cómo va a pagar?</span>
          <div className="cf-plan" role="radiogroup" aria-labelledby="cf-plan-label">
            {[
              { value: "cash", title: "De contado", hint: "Un solo pago, sin enganche ni intereses" },
              { value: "installments", title: "En parcialidades", hint: "Varios pagos sin intereses" },
              { value: "financed", title: "A mensualidades", hint: "Con intereses, con o sin calculadora" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={form.paymentPlan === option.value}
                className={`cf-plan-option${form.paymentPlan === option.value ? " is-on" : ""}`}
                onClick={() => setForm((p) => ({ ...p, paymentPlan: option.value }))}
              >
                <b>{option.title}</b>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fr-row" data-tour="contrato-financiero">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-amount">
            Monto total ($)
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          <AmountInput id="cf-amount" min="0" {...fi(errors.amount)}
            value={form.amount}
            onChange={setNum("amount")}
            onBlur={() => blurField("amount")}
            placeholder="Ej. 450000" />
          <FieldError msg={errors.amount} />
        </div>

        {!isCash && <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-down_payment">Enganche ($)</label>
          <AmountInput id="cf-down_payment" min="0" {...fi(errors.down_payment)}
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
        </div>}

        {!isCash && <div className="fg" style={{ flex: 1 }}>
          <label className="fl" htmlFor="cf-totalM">
            {isInstallments ? "Número de pagos" : "Plazo (meses)"}
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
        </div>}
      </div>

      {useCalculator && calcPending && <p role="status">Consultando el plan de financiamiento…</p>}
      {useCalculator && calcFailed && <div role="alert">No se pudo consultar el plan. Tus datos siguen en el formulario. <button type="button" className="btn-s" onClick={() => retryCalculator()}>Reintentar</button></div>}
      {/* ── Cómo se calcula la mensualidad: calculadora opcional ── */}
      {useCalculator && calcLoaded && (
        <div data-tour="contrato-mensualidad" className="cf-monthly">
          {activeCalc && (
            <div className="cf-plan cf-calc-mode" role="radiogroup" aria-label="Cómo calcular la mensualidad">
              {[
                { value: "calculator", title: `Calculadora «${activeCalc.name}»`, hint: "Tu fórmula; se congela en la venta" },
                { value: "standard", title: "Amortización estándar", hint: "Pago fijo con la tasa anual" },
              ].map((option) => {
                const on = (form.calcMode === "standard" ? "standard" : "calculator") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`cf-plan-option${on ? " is-on" : ""}`}
                    onClick={() => setForm((p) => ({ ...p, calcMode: option.value }))}
                  >
                    <b>{option.title}</b>
                    <small>{option.hint}</small>
                  </button>
                );
              })}
            </div>
          )}
          {!applyCalc && (
            <div className="cf-calc-standard" role="status">
              <b>Mensualidad con amortización estándar</b>
              <span>
                {activeCalc
                  ? "Esta venta no usa la calculadora: pago fijo cada mes con la tasa anual de abajo."
                  : "Pago fijo cada mes con la tasa anual de abajo. La calculadora es opcional: créala solo si quieres tu propia fórmula."}
              </span>
              {standardMonthlyPayment(form) != null && (
                <span className="cf-calc-standard-total">
                  Mensualidad estimada <b>${standardMonthlyPayment(form).toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>
                </span>
              )}
              {!activeCalc && canEditCalculator && (
                <button type="button" className="btn-s" onClick={goToCalculator}>Crear una calculadora (opcional)</button>
              )}
            </div>
          )}
      {/* ── Calculadora de financiamiento activa ── */}
      {applyCalc && (
        <div style={{
          border: "1px solid rgba(53,94,59,.45)", borderRadius: 16,
          padding: 14, marginBottom: 4,
          background: "linear-gradient(135deg, var(--tan-lt), var(--sf))",
          boxShadow: "0 12px 28px rgba(30,61,43,.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--forest)" }}>
              {activeCalc.name}
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
                  <label htmlFor="field-shared-contractmodal-3" className="fl" style={{ fontFamily: "var(--font-body)", fontSize: ".68rem" }}>{v}</label>
                  <input id="field-shared-contractmodal-3" className="fi" type="number" value={calcVars[v] ?? ""}
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
        </div>
      )}

      {/* La tasa vive en la variable TASA_ANUAL de la calculadora activa; este campo
          solo aparece cuando la venta NO usa calculadora (no hay, se eligió la estándar o es edición). */}
      {!applyCalc && form.paymentPlan === "financed" && (
        <div className="fg">
          <label className="fl" htmlFor="cf-interest_rate">Tasa anual (decimal, 0 a 1)</label>
          <input id="cf-interest_rate" type="number" min="0" max="1" step="0.01" {...fi(errors.interest_rate)}
            value={form.interest_rate} onChange={setNum("interest_rate")} onBlur={() => blurField("interest_rate")} />
          <FieldError msg={errors.interest_rate} />
        </div>
      )}

      <div className="fg">
        <label htmlFor="field-shared-contractmodal-4" className="fl">{isCash ? "Método de pago" : "Método de pago del enganche"}</label>
        <select id="field-shared-contractmodal-4" className="fi" value={form.down_payment_method} onChange={set("down_payment_method")}>
          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {form.down_payment_method === "other" && (
        <div className="fg">
          <label htmlFor="cf-down_payment_method_detail" className="fl">
            Describe el método de pago<span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <input id="cf-down_payment_method_detail" {...fi(errors.down_payment_method_detail)} maxLength={120}
            value={form.down_payment_method_detail} onChange={set("down_payment_method_detail")}
            placeholder="Ej. permuta de un terreno, pago en especie, crédito Infonavit" />
          <FieldError msg={errors.down_payment_method_detail} />
        </div>
      )}

      {/* ── 3. Documentos ── */}
      <SectionLabel data-tour="contrato-documentos">Documentos</SectionLabel>

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
      </WorkflowForm>
    </Modal>
  );
}

export default ContractModal;
