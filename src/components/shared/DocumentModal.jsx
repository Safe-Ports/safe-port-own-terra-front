import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";

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
  const [form, setForm] = useState({
    name: "",
    category: "contrato",
    linkType: "",
    linkedId: "",
    notes: "",
  });

  useEffect(() => {
    if (!ui.documentModal) return;
    fileRef.current = null;
    setFileName("");
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

  const handleSave = () => {
    saveDocument({ ...form, folderId: documentDraft?.folderId || undefined }, fileRef.current || null);
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
          <button className="btn-s" onClick={() => { resetDocumentDraft(); closeModal("documentModal"); }}>Cancelar</button>
          <button className="btn-p" onClick={handleSave}>Guardar</button>
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
          <span className="text-xs font-semibold text-[#1B2B18]">Examinar</span>
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
          <select className="mobile-input" value={form.linkedId} onChange={set("linkedId")}>
            <option value="">— Seleccionar cliente —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
