import { useEffect, useMemo, useRef, useState } from "react";
import { HiDocumentArrowUp, HiFolderOpen } from "react-icons/hi2";
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
    if (!fileRef.current) {
      return saveDocument(form, null);
    }
    saveDocument(form, fileRef.current);
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
          <span className="text-xs font-semibold text-[#183024]">Examinar</span>
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

function DocumentsPage() {
  const { documents, openDocumentUpload, openDocumentPreview, downloadDocument, deleteDocument } = useAppContext();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...documents]
      .filter((doc) => filter === "all" || doc.category === filter)
      .filter((doc) => {
        if (!term) return true;
        return `${doc.name} ${doc.category} ${doc.entity_label || ""}`.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.uploaded_at) - new Date(b.uploaded_at);
        if (sortBy === "name") return a.name.localeCompare(b.name, "es-MX");
        if (sortBy === "size") return (b.file_size || 0) - (a.file_size || 0);
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      });
  }, [documents, filter, search, sortBy]);

  const kpis = [
    ["Total", documents.length],
    ...CATEGORIES.map((c) => [c.label, documents.filter((d) => d.category === c.value).length]),
  ];

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#7E7061]">Gestión documental</div>
              <div className="mt-2 font-['Playfair_Display'] text-[1.9rem] text-[#16120F]">Archivo premium</div>
            </div>
            <button className="rounded-2xl bg-[#183024] p-3 text-[#F7F3ED]" onClick={() => openDocumentUpload()}>
              <HiDocumentArrowUp className="text-xl" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {kpis.slice(0, 5).map(([label, value]) => (
              <div key={label} className="rounded-[20px] bg-[#FBF7F1] p-3">
                <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">{label}</div>
                <div className="mt-2 text-lg font-bold text-[#16120F]">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="space-y-3">
            <input
              className="mobile-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button className={`mobile-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
                Todos
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  className={`mobile-chip ${filter === c.value ? "is-active" : ""}`}
                  onClick={() => setFilter(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <select className="mobile-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="name">Por nombre</option>
              <option value="size">Por tamaño</option>
            </select>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {filtered.length ? (
            filtered.map((doc) => (
              <article
                key={doc.id}
                className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-[#16120F]">{doc.name}</div>
                    <div className="mt-1 text-sm text-[#5F5346]">{doc.entity_label || "Sin vincular"}</div>
                  </div>
                  <div className="rounded-2xl bg-[#EFE4D5] p-3 text-[#183024]">
                    <HiFolderOpen className="text-xl" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Categoría</div>
                    <div className="mt-2 text-sm font-bold text-[#16120F]">{doc.category}</div>
                  </div>
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Tamaño</div>
                    <div className="mt-2 text-sm font-bold text-[#16120F]">
                      {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4 text-sm text-[#5F5346]">
                  {doc.entity_type ? `Vinculado a ${doc.entity_type}` : "Sin vincular"} · {doc.uploaded_by?.name || "—"}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="btn-s !px-2" onClick={() => openDocumentPreview(doc.id)}>Ver</button>
                  <button className="btn-s !px-2" onClick={() => downloadDocument(doc.id)}>Bajar</button>
                  <button className="btn-dan !px-2" onClick={() => deleteDocument(doc.id)}>Eliminar</button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#D8CCBE] bg-white/70 px-6 py-10 text-center text-sm text-[#7A6D5F] md:col-span-2">
              No hay documentos con esos filtros.
            </div>
          )}
        </section>
      </div>
      <DocumentModal />
    </>
  );
}

export default DocumentsPage;
