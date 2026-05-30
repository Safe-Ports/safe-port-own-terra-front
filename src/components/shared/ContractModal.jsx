import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { lotService } from "@/services/lotService";
import { orgService } from "@/services/orgService";
import { folderService } from "@/services/folderService";
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

/* Estilo de input con error */
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
        style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px", fontSize: ".78rem", background: "#fff", fontFamily: "inherit", color: "var(--tx)", outline: "none", cursor: "pointer" }}>
        {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select value={entry.folderId} onChange={e => onChange({ ...entry, folderId: e.target.value })}
        style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px", fontSize: ".78rem", background: "#fff", fontFamily: "inherit", color: "var(--tx)", outline: "none", cursor: "pointer", maxWidth: 160 }}>
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

/* ── Reglas de validación ───────────────────────────────────── */
function validate(form, isEditing) {
  const errs = {};

  if (!isEditing && !form.lot)
    errs.lot = "Selecciona un lote disponible";

  if (!form.clientId)
    errs.clientId = "El cliente es obligatorio";

  if (!form.date)
    errs.date = "La fecha de firma es obligatoria";

  const amount = Number(form.amount);
  if (!isEditing) {
    if (!amount || amount <= 0)
      errs.amount = "El monto debe ser mayor a $0";
    else if (amount < 1000)
      errs.amount = "El monto parece muy bajo, verifica el valor";
  }

  const down = Number(form.down_payment);
  if (down < 0)
    errs.down_payment = "El enganche no puede ser negativo";
  else if (!isEditing && amount > 0 && down > amount)
    errs.down_payment = "El enganche no puede superar el monto total";

  const meses = Number(form.totalM);
  if (!isEditing) {
    if (!meses || meses < 1)
      errs.totalM = "El plazo debe ser al menos 1 mes";
    else if (meses > 360)
      errs.totalM = "El plazo máximo es 360 meses (30 años)";
  }

  return errs; // {} = sin errores
}

/* Parsea errores 422 del backend y los mapea a campos del form */
function parseServerErrors(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return null;

  // Errores de validación Pydantic: array de { loc, msg }
  if (Array.isArray(detail)) {
    const map = {};
    const FIELD_MAP = {
      amount:         "amount",
      down_payment:   "down_payment",
      total_months:   "totalM",
      contract_date:  "date",
      client_id:      "clientId",
      lot_id:         "lot",
      interest_rate:  "interest_rate",
    };
    detail.forEach(({ loc, msg }) => {
      const backendField = loc?.[loc.length - 1];
      const frontField = FIELD_MAP[backendField] || backendField;
      if (frontField) map[frontField] = msg;
    });
    return Object.keys(map).length ? map : null;
  }

  // Error string simple
  if (typeof detail === "string") return { _general: detail };
  return null;
}

/* ══ MODAL ═══════════════════════════════════════════════════ */
function ContractModal() {
  const {
    ui, closeModal, clients, editingContract, contractDraft,
    saveContract, deleteContract, resetContractDraft, showToast,
  } = useAppContext();

  const [docs, setDocs]       = useState([]);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  const defaultForm = {
    number: "", lot: "", clientId: clients[0]?.id || "",
    type: "sale", date: new Date().toISOString().split("T")[0],
    amount: 0, down_payment: 0, totalM: 96,
    interest_rate: 0,
    seller_id: "", down_payment_method: "cash", notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  const set = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    // Limpia el error del campo al editar
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const setNum = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  /* Validación al salir de un campo (blur) */
  const blurField = (k) => {
    const errs = validate(form, !!editingContract);
    if (errs[k]) setErrors(p => ({ ...p, [k]: errs[k] }));
  };

  /* queries */
  const { data: availableLots = [] } = useQuery({
    queryKey: ["lots", "available"],
    queryFn: () => lotService.list({ status: "available", limit: 200 }).then(r => r.items),
    enabled: ui.contractModal && !editingContract,
  });
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => orgService.listUsers({ limit: 100 }),
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

  useEffect(() => {
    if (!ui.contractModal) return;
    setDocs([]);
    setErrors({});
    setSaving(false);
    if (editingContract) {
      setForm({ ...defaultForm, ...editingContract });
    } else {
      setForm({ ...defaultForm, ...(contractDraft || {}), clientId: clients[0]?.id || "" });
    }
  }, [ui.contractModal, editingContract, contractDraft]);

  const addDoc    = () => setDocs(p => [...p, newEntry()]);
  const updateDoc = (id, updated) => setDocs(p => p.map(d => d.id === id ? updated : d));
  const removeDoc = (id) => setDocs(p => p.filter(d => d.id !== id));

  const handleSave = async () => {
    const errs = validate(form, !!editingContract);
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Scroll al primer campo con error
      const first = Object.keys(errs)[0];
      document.getElementById(`cf-${first}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      await saveContract({
        ...(editingContract || {}),
        ...form,
        client_id:           form.clientId,
        lot_id:              form.lot,
        contract_date:       form.date,
        first_payment_date:  form.date,
        total_months:        Number(form.totalM),
        interest_rate:       Number(form.interest_rate ?? 0),
        seller_id:           form.seller_id || undefined,
        down_payment_method: form.down_payment_method || undefined,
        _docs: docs.filter(d => d.file),
      });
    } catch (err) {
      const serverErrs = parseServerErrors(err);
      if (serverErrs?._general) {
        showToast(serverErrs._general);
      } else if (serverErrs) {
        setErrors(serverErrs);
        showToast("Revisa los campos marcados en rojo");
      } else {
        showToast("Error al guardar el contrato");
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
      title={editingContract ? "Editar Contrato" : "Generar Contrato"}
      subtitle="Vincula lote y cliente"
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
            {saving ? "Guardando…" : "✓ Registrar"}
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
            Propiedad / Lote
            {!editingContract && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
          </label>
          <select id="cf-lot" {...fi(errors.lot)} value={form.lot} onChange={set("lot")} onBlur={() => blurField("lot")}>
            <option value="">— Seleccionar lote —</option>
            {availableLots.map(l => (
              <option key={l.id} value={l.id}>
                {l.code}{l.inmueble_name ? ` · ${l.inmueble_name}` : ""}
              </option>
            ))}
          </select>
          <FieldError msg={errors.lot} />
          {!editingContract && availableLots.length === 0 && (
            <span style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: 4, display: "block" }}>
              Sin lotes disponibles. Cambia el estatus de un lote primero.
            </span>
          )}
        </div>

        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">
            Cliente
            <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>
          </label>
          <select id="cf-clientId" {...fi(errors.clientId)} value={form.clientId} onChange={set("clientId")} onBlur={() => blurField("clientId")}>
            <option value="">— Seleccionar cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
      </div>

      <div className="fg">
        <label className="fl">Vendedor asignado</label>
        <select className="fi" value={form.seller_id} onChange={set("seller_id")}>
          <option value="">— Sin asignar —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
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
          <b style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".92rem" }}>
            ${Math.round((Number(form.amount) - Number(form.down_payment || 0)) / Number(form.totalM)).toLocaleString("en-US")} / mes
          </b>
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
        cursor: "pointer", fontFamily: "inherit", width: "100%",
        justifyContent: "center", marginTop: 4,
      }}>
        <HiOutlinePlus /> Agregar documento
      </button>

      {/* Leyenda de campos obligatorios */}
      <div style={{ marginTop: 16, fontSize: ".72rem", color: "var(--mu)" }}>
        <span style={{ color: "var(--danger)" }}>*</span> Campos obligatorios
      </div>
    </Modal>
  );
}

export default ContractModal;
