import { useEffect, useMemo, useState } from "react";
import { HiDocumentArrowUp, HiFolderOpen } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";

function buildDocumentForm({ clients, contracts, documentDraft }) {
  const fallbackClientId = documentDraft?.clientId || clients[0]?.id || "";
  const fallbackContractId =
    documentDraft?.contractId ||
    contracts.find((contract) => contract.clientId === fallbackClientId)?.id ||
    contracts[0]?.id ||
    "";

  return {
    name: documentDraft?.name || "",
    category: documentDraft?.category || "contract",
    status: documentDraft?.status || "signed",
    clientId: fallbackClientId,
    contractId: fallbackContractId,
    sizeKb: documentDraft?.sizeKb || 240,
    fileDataUrl: documentDraft?.fileDataUrl || "",
    mimeType: documentDraft?.mimeType || "",
    linkType: documentDraft?.linkType || (documentDraft?.contractId ? "contract" : documentDraft?.clientId ? "client" : documentDraft?.lotCode ? "lot" : ""),
    linkedId: documentDraft?.linkedId || "",
    fracId: documentDraft?.fracId || "",
    lotCode: documentDraft?.lotCode || "",
    notes: documentDraft?.notes || ""
  };
}

function DocumentModal() {
  const {
    ui,
    closeModal,
    saveDocument,
    clients,
    contracts,
    fracs,
    documentDraft,
    resetDocumentDraft
  } = useAppContext();
  const [form, setForm] = useState(() => buildDocumentForm({ clients, contracts, documentDraft }));

  useEffect(() => {
    if (!ui.documentModal) return;
    setForm(buildDocumentForm({ clients, contracts, documentDraft }));
  }, [clients, contracts, documentDraft, ui.documentModal]);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((previous) => ({
        ...previous,
        name: previous.name || file.name.replace(/\.[^.]+$/, ""),
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        fileDataUrl: event.target?.result || "",
        mimeType: file.type || "application/octet-stream"
      }));
    };
    reader.readAsDataURL(file);
  };

  const matchingContracts = contracts.filter((contract) => !form.clientId || contract.clientId === form.clientId);
  const lotsForFrac = fracs.find((frac) => frac.id === form.fracId)?.lots || [];

  return (
    <Modal
      open={ui.documentModal}
      icon="📁"
      title="Subir documento"
      subtitle="Expediente documental alineado con la maqueta"
      onClose={() => {
        resetDocumentDraft();
        closeModal("documentModal");
      }}
      footer={
        <>
          <button
            className="btn-s"
            onClick={() => {
              resetDocumentDraft();
              closeModal("documentModal");
            }}
          >
            Cancelar
          </button>
          <button className="btn-p" onClick={() => saveDocument(form)}>Guardar</button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="mobile-input flex cursor-pointer items-center justify-between">
          <span className="truncate">{form.fileDataUrl ? "Archivo listo para guardar" : "Seleccionar archivo"}</span>
          <input type="file" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          <span className="text-xs font-semibold text-[#183024]">Examinar</span>
        </label>

        <input
          className="mobile-input"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Nombre descriptivo"
        />

        <div className="grid grid-cols-2 gap-3">
          <select className="mobile-input" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
            <option value="contract">Contrato</option>
            <option value="identity">Identificación</option>
            <option value="payment">Pago</option>
            <option value="legal">Legal</option>
          </select>
          <select className="mobile-input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="signed">Firmado / vigente</option>
            <option value="pending">Pendiente</option>
            <option value="archived">Archivado</option>
          </select>
        </div>

        <select
          className="mobile-input"
          value={form.linkType}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              linkType: event.target.value,
              linkedId: "",
              lotCode: "",
              fracId: ""
            }))
          }
        >
          <option value="">Sin vincular</option>
          <option value="contract">Vincular a contrato</option>
          <option value="client">Vincular a cliente</option>
          <option value="lot">Vincular a lote</option>
        </select>

        {form.linkType === "contract" ? (
          <>
            <select
              className="mobile-input"
              value={form.clientId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  clientId: event.target.value,
                  contractId: contracts.find((contract) => contract.clientId === event.target.value)?.id || ""
                }))
              }
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <select
              className="mobile-input"
              value={form.contractId}
              onChange={(event) => setForm((prev) => ({ ...prev, contractId: event.target.value, linkedId: event.target.value }))}
            >
              {matchingContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.number}</option>
              ))}
            </select>
          </>
        ) : null}

        {form.linkType === "client" ? (
          <select
            className="mobile-input"
            value={form.clientId}
            onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value, linkedId: event.target.value, contractId: "" }))}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        ) : null}

        {form.linkType === "lot" ? (
          <>
            <select
              className="mobile-input"
              value={form.fracId}
              onChange={(event) => setForm((prev) => ({ ...prev, fracId: event.target.value, lotCode: "", linkedId: "" }))}
            >
              <option value="">Selecciona fraccionamiento</option>
              {fracs.map((frac) => (
                <option key={frac.id} value={frac.id}>{frac.name}</option>
              ))}
            </select>
            <select
              className="mobile-input"
              value={form.lotCode}
              onChange={(event) => setForm((prev) => ({ ...prev, lotCode: event.target.value, linkedId: event.target.value }))}
            >
              <option value="">Selecciona lote</option>
              {lotsForFrac.map((lot) => (
                <option key={lot.id} value={lot.code}>{lot.code}</option>
              ))}
            </select>
          </>
        ) : null}

        <textarea
          className="mobile-input min-h-[96px]"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Notas del documento"
        />
      </div>
    </Modal>
  );
}

function DocumentsPage() {
  const { documents, clients, contracts, fracs, openDocumentUpload, openDocumentPreview, downloadDocument, deleteDocument } = useAppContext();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const enrichedDocuments = useMemo(
    () =>
      documents.map((document) => ({
        ...document,
        client: clients.find((item) => item.id === document.clientId),
        contract: contracts.find((item) => item.id === document.contractId),
        frac: fracs.find((frac) => frac.id === document.fracId)
      })),
    [clients, contracts, documents, fracs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...enrichedDocuments]
      .filter((document) => filter === "all" || document.category === filter)
      .filter((document) => !linkFilter || (linkFilter === "none" ? !document.linkType : document.linkType === linkFilter))
      .filter((document) => {
        if (!term) return true;
        return `${document.name} ${document.client?.name || ""} ${document.contract?.number || ""} ${document.lotCode || ""}`
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => {
        if (sortBy === "oldest") return new Date(left.createdAt) - new Date(right.createdAt);
        if (sortBy === "name") return left.name.localeCompare(right.name, "es-MX");
        if (sortBy === "size") return (right.sizeKb || 0) - (left.sizeKb || 0);
        return new Date(right.createdAt) - new Date(left.createdAt);
      });
  }, [enrichedDocuments, filter, linkFilter, search, sortBy]);

  const kpis = [
    ["Total", documents.length],
    ["Contratos", documents.filter((document) => document.category === "contract").length],
    ["IDs", documents.filter((document) => document.category === "identity").length],
    ["Pagos", documents.filter((document) => document.category === "payment").length],
    ["Legales", documents.filter((document) => document.category === "legal").length]
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
            {kpis.map(([label, value]) => (
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, cliente, contrato o lote"
            />

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["all", "contract", "identity", "payment", "legal"].map((value) => (
                <button key={value} className={`mobile-chip ${filter === value ? "is-active" : ""}`} onClick={() => setFilter(value)}>
                  {value === "all" ? "Todos" : value}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select className="mobile-input" value={linkFilter} onChange={(event) => setLinkFilter(event.target.value)}>
                <option value="">Toda vinculación</option>
                <option value="contract">Contratos</option>
                <option value="client">Clientes</option>
                <option value="lot">Lotes</option>
                <option value="none">Sin vincular</option>
              </select>
              <select className="mobile-input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name">Por nombre</option>
                <option value="size">Por tamaño</option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {filtered.length ? (
            filtered.map((document) => (
              <article key={document.id} className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-[#16120F]">{document.name}</div>
                    <div className="mt-1 text-sm text-[#5F5346]">
                      {document.client?.name || document.frac?.name || "Sin cliente"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#EFE4D5] p-3 text-[#183024]">
                    <HiFolderOpen className="text-xl" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Categoría</div>
                    <div className="mt-2 text-sm font-bold text-[#16120F]">{document.category}</div>
                  </div>
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Tamaño</div>
                    <div className="mt-2 text-sm font-bold text-[#16120F]">{document.sizeKb} KB</div>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4 text-sm text-[#5F5346]">
                  {document.contract?.number || document.lotCode || "Sin contrato"} · {document.createdAt}
                  <div className="mt-1 text-xs text-[#8A7A69]">
                    {document.linkType ? `Vinculado a ${document.linkType}` : "Sin vincular"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="btn-s !px-2" onClick={() => openDocumentPreview(document.id)}>Ver</button>
                  <button className="btn-s !px-2" onClick={() => downloadDocument(document.id)}>Bajar</button>
                  <button className="btn-dan !px-2" onClick={() => deleteDocument(document.id)}>Eliminar</button>
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
