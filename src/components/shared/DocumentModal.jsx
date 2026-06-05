import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

const CATEGORIES = [
  { value: "contrato", label: "Contrato" },
  { value: "identificacion", label: "Identificación" },
  { value: "comprobante", label: "Comprobante" },
  { value: "escritura", label: "Escritura" },
  { value: "plano", label: "Plano" },
  { value: "otro", label: "Otro" },
];

const ENTITY_TYPES = [
  { value: "", label: "Sin vincular" },
  { value: "contract", label: "Contrato" },
  { value: "client", label: "Cliente" },
];

function DocumentModal() {
  const { ui, closeModal, saveDocument, clients, contracts, documentDraft, resetDocumentDraft } = useAppContext();
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "contrato",
    linkType: "",
    linkedId: "",
    notes: "",
  });

  /* ── Client search state ── */
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientDropRef = useRef(null);

  useEffect(() => {
    if (!showClientDrop) return;
    const handler = (e) => { if (!clientDropRef.current?.contains(e.target)) setShowClientDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showClientDrop]);

  useEffect(() => {
    if (!ui.documentModal) return;
    fileRef.current = null;
    setFileName("");
    setUploading(false);
    setClientSearch("");
    setShowClientDrop(false);
    setForm({
      name: documentDraft?.name || "",
      category: documentDraft?.category || "contrato",
      linkType: documentDraft?.linkType || "",
      linkedId: documentDraft?.linkedId || "",
      folderId: documentDraft?.folderId || "",
      notes: documentDraft?.notes || "",
    });
  }, [documentDraft, ui.documentModal]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleFile = (file) => {
    if (!file) return;
    fileRef.current = file;
    setFileName(file.name);
    setForm((p) => ({ ...p, name: p.name || file.name.replace(/\.[^.]+$/, "") }));
  };

  const matchingContracts = contracts.filter(
    (c) => !form.linkedId || String(c.client?.id) === form.linkedId || form.linkType !== "client"
  );

  const handleSave = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      await saveDocument({ ...form, folderId: documentDraft?.folderId || undefined }, fileRef.current || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={ui.documentModal}
      icon="📁"
      title="Subir documento"
      subtitle="Expediente documental"
      onClose={() => { resetDocumentDraft(); closeModal("documentModal"); }}
      footer={
        <>
          <button className="btn-s" onClick={() => { resetDocumentDraft(); closeModal("documentModal"); }} disabled={uploading}>Cancelar</button>
          <button className="btn-p" onClick={handleSave} disabled={uploading}>
            {uploading ? "Subiendo..." : "Guardar"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="mobile-input flex cursor-pointer items-center justify-between">
          <span className="truncate text-sm">{fileName || "Seleccionar archivo"}</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <span className="text-xs font-semibold text-[#1E3D2B]">Examinar</span>
        </label>

        <input
          className="mobile-input"
          value={form.name}
          onChange={set("name")}
          placeholder="Nombre descriptivo"
        />

        <select className="mobile-input" value={form.category} onChange={set("category")}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          className="mobile-input"
          value={form.linkType}
          onChange={(e) => setForm((p) => ({ ...p, linkType: e.target.value, linkedId: "" }))}
        >
          {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {form.linkType === "client" && (
          <div ref={clientDropRef} style={{ position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#fff", border: "1.5px solid #DCDAD2", borderRadius: 12,
              padding: "10px 12px",
            }}>
              <HiOutlineMagnifyingGlass style={{ color: "#83867C", flexShrink: 0, fontSize: "1rem" }} />
              <input
                style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: ".84rem", color: "#1E3D2B", fontFamily: "inherit" }}
                value={clients.find(c => String(c.id) === String(form.linkedId))?.name || clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm(p => ({ ...p, linkedId: "" }));
                  setShowClientDrop(true);
                }}
                onFocus={() => { if (!form.linkedId) setShowClientDrop(true); }}
                placeholder="Buscar cliente por nombre…"
                autoComplete="off"
              />
              {form.linkedId && (
                <button
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, linkedId: "" })); setClientSearch(""); setShowClientDrop(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".75rem", padding: "2px 4px" }}
                >✕</button>
              )}
            </div>
            {showClientDrop && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                background: "#fff", border: "1.5px solid #DCDAD2",
                borderRadius: 10, maxHeight: 200, overflowY: "auto",
                boxShadow: "0 8px 24px rgba(30,61,43,.14)", marginTop: 4,
              }}>
                {clients
                  .filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                  .map(c => (
                    <div
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm(p => ({ ...p, linkedId: String(c.id) }));
                        setClientSearch("");
                        setShowClientDrop(false);
                      }}
                      style={{
                        padding: "9px 12px", cursor: "pointer", fontSize: ".83rem",
                        borderBottom: "1px solid rgba(67,69,63,.08)",
                        color: "#1E3D2B",
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F1EEE6"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {c.name}
                    </div>
                  ))
                }
                {clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: ".78rem", color: "#83867C" }}>
                    Sin resultados
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {form.linkType === "contract" && (
          <select className="mobile-input" value={form.linkedId} onChange={set("linkedId")}>
            <option value="">— Seleccionar contrato —</option>
            {matchingContracts.map((c) => (
              <option key={c.id} value={c.id}>{c.contract_number}</option>
            ))}
          </select>
        )}

        <textarea
          className="mobile-input min-h-[96px]"
          value={form.notes}
          onChange={set("notes")}
          placeholder="Notas del documento"
        />
      </div>
    </Modal>
  );
}

export default DocumentModal;
