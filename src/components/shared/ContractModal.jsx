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
      {/* Selector de archivo */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1.5px solid var(--bd)", borderRadius: 10,
          padding: "7px 12px", cursor: "pointer", textAlign: "left",
          minWidth: 0,
        }}
      >
        <HiOutlineDocument style={{ color: "var(--forest)", flexShrink: 0, fontSize: "1rem" }} />
        <span style={{
          fontSize: ".8rem", color: entry.fileName ? "var(--tx)" : "var(--mu)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.fileName || "Seleccionar archivo…"}
        </span>
        <input
          ref={fileInputRef} type="file" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </button>

      {/* Categoría */}
      <select
        value={entry.category}
        onChange={e => onChange({ ...entry, category: e.target.value })}
        style={{
          border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px",
          fontSize: ".78rem", background: "#fff", fontFamily: "inherit",
          color: "var(--tx)", outline: "none", cursor: "pointer",
        }}
      >
        {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      {/* Carpeta destino */}
      <select
        value={entry.folderId}
        onChange={e => onChange({ ...entry, folderId: e.target.value })}
        style={{
          border: "1.5px solid var(--bd)", borderRadius: 10, padding: "7px 10px",
          fontSize: ".78rem", background: "#fff", fontFamily: "inherit",
          color: "var(--tx)", outline: "none", cursor: "pointer", maxWidth: 160,
        }}
      >
        <option value="">Sin carpeta</option>
        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>

      {/* Quitar */}
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--danger)", padding: "4px 6px", display: "flex",
          borderRadius: 8,
        }}
      >
        <HiOutlineTrash style={{ fontSize: "1rem" }} />
      </button>
    </div>
  );
}

let _nextId = 1;
const newEntry = () => ({ id: _nextId++, file: null, fileName: "", category: "contrato", folderId: "" });

/* ══ MODAL ═══════════════════════════════════════════════════ */
function ContractModal() {
  const {
    ui, closeModal, clients, editingContract, contractDraft,
    saveContract, deleteContract, resetContractDraft, showToast,
  } = useAppContext();

  const [docs, setDocs] = useState([]); // filas dinámicas de documentos

  const defaultForm = {
    number: "", lot: "", clientId: clients[0]?.id || "",
    type: "sale", date: new Date().toISOString().split("T")[0],
    amount: 0, down_payment: 0, totalM: 96,
    seller_id: "",
    down_payment_method: "cash",
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  /* queries */
  const { data: availableLots = [] } = useQuery({
    queryKey: ["lots", "available"],
    queryFn: () => lotService.list({ status: "available", limit: 200 }).then(r => r.items),
    enabled: ui.contractModal && !editingContract,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn:  () => orgService.listUsers({ limit: 100 }),
    enabled:  ui.contractModal,
    staleTime: 120_000,
  });
  const users = usersData?.items || (Array.isArray(usersData) ? usersData : []);

  const { data: folders = [] } = useQuery({
    queryKey: ["document-folders"],
    queryFn:  folderService.list,
    staleTime: 30_000,
    enabled:  ui.contractModal,
  });

  useEffect(() => {
    if (!ui.contractModal) return;
    setDocs([]);
    if (editingContract) {
      setForm({ ...defaultForm, ...editingContract });
    } else {
      setForm({ ...defaultForm, ...(contractDraft || {}), clientId: clients[0]?.id || "" });
    }
  }, [ui.contractModal, editingContract, contractDraft]);

  const addDoc   = () => setDocs(p => [...p, newEntry()]);
  const updateDoc = (id, updated) => setDocs(p => p.map(d => d.id === id ? updated : d));
  const removeDoc = (id) => setDocs(p => p.filter(d => d.id !== id));

  const handleSave = () => {
    if (!form.lot && !editingContract) { showToast("Selecciona un lote"); return; }
    if (!form.clientId)                { showToast("Selecciona un cliente"); return; }

    const docsWithFile = docs.filter(d => d.file);

    saveContract({
      ...(editingContract || {}),
      ...form,
      client_id:           form.clientId,
      lot_id:              form.lot,
      contract_date:       form.date,
      first_payment_date:  form.date,
      total_months:        Number(form.totalM),
      seller_id:           form.seller_id || undefined,
      down_payment_method: form.down_payment_method || undefined,
      _docs: docsWithFile, // [{file, category, folderId}]
    });
  };

  return (
    <Modal
      open={ui.contractModal}
      icon="📄"
      title={editingContract ? "Editar Contrato" : "Generar Contrato"}
      subtitle="Vincula lote y cliente"
      onClose={() => { resetContractDraft(); closeModal("contractModal"); }}
      footer={
        <>
          <button className="btn-s" onClick={() => { resetContractDraft(); closeModal("contractModal"); }}>
            Cancelar
          </button>
          {editingContract && (
            <button className="btn-dan" onClick={() => deleteContract(editingContract.id)}>
              🗑 Eliminar
            </button>
          )}
          <button className="btn-p" onClick={handleSave}>✓ Registrar</button>
        </>
      }
    >
      {/* ── 1. Datos del contrato ── */}
      <SectionLabel>Datos del contrato</SectionLabel>

      <div className="fg">
        <label className="fl">N° de Contrato</label>
        <input className="fi" value={form.number} onChange={set("number")} placeholder="CON-2026-001" />
      </div>

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Propiedad / Lote</label>
          <select className="fi" value={form.lot} onChange={set("lot")}>
            <option value="">— Seleccionar lote —</option>
            {availableLots.map(l => (
              <option key={l.id} value={l.id}>
                {l.code}{l.inmueble_name ? ` · ${l.inmueble_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Cliente</label>
          <select className="fi" value={form.clientId} onChange={set("clientId")}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
          <label className="fl">Fecha de firma</label>
          <input className="fi" type="date" value={form.date} onChange={set("date")} />
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
          <label className="fl">Monto total ($)</label>
          <input className="fi" type="number" value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Enganche ($)</label>
          <input className="fi" type="number" value={form.down_payment}
            onChange={e => setForm(p => ({ ...p, down_payment: Number(e.target.value) }))} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Plazo (meses)</label>
          <input className="fi" type="number" value={form.totalM}
            onChange={e => setForm(p => ({ ...p, totalM: Number(e.target.value) }))} />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Método de pago del enganche</label>
        <select className="fi" value={form.down_payment_method} onChange={set("down_payment_method")}>
          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* ── 3. Documentos ── */}
      <SectionLabel>Documentos</SectionLabel>

      {docs.length === 0 && (
        <div style={{
          textAlign: "center", padding: "14px 0 10px",
          fontSize: ".8rem", color: "var(--mu)",
        }}>
          No hay documentos adjuntos. Puedes agregarlos ahora o desde el gestor de documentos.
        </div>
      )}

      {/* cabecera de columnas (solo si hay al menos una fila) */}
      {docs.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto auto auto",
          gap: 8, padding: "0 12px 4px",
          fontSize: ".62rem", fontWeight: 800, letterSpacing: ".1em",
          textTransform: "uppercase", color: "var(--mu)",
        }}>
          <span>Archivo</span>
          <span>Categoría</span>
          <span>Carpeta destino</span>
          <span/>
        </div>
      )}

      {docs.map(entry => (
        <DocRow
          key={entry.id}
          entry={entry}
          folders={folders}
          onChange={updated => updateDoc(entry.id, updated)}
          onRemove={() => removeDoc(entry.id)}
        />
      ))}

      <button
        type="button"
        onClick={addDoc}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 14px", borderRadius: 12,
          border: "1.5px dashed var(--forest)", background: "var(--tan-lt)",
          color: "var(--forest)", fontWeight: 700, fontSize: ".8rem",
          cursor: "pointer", fontFamily: "inherit", width: "100%",
          justifyContent: "center", marginTop: 4,
        }}
      >
        <HiOutlinePlus /> Agregar documento
      </button>
    </Modal>
  );
}

export default ContractModal;
