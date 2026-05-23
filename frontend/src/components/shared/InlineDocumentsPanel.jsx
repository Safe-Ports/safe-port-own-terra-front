import { useMemo } from "react";
import { HiArrowDownTray, HiEye, HiPlus, HiTrash } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

const titleMap = {
  contract: "Documentos del contrato",
  client: "Documentos del cliente",
  lot: "Documentos del lote"
};

function InlineDocumentsPanel({ entityType, entityId, entityLabel, compact = false }) {
  const {
    getLinkedDocuments,
    openDocumentPreview,
    downloadDocument,
    deleteDocument,
    openDocumentUpload
  } = useAppContext();

  const documents = useMemo(
    () => getLinkedDocuments(entityType, entityId),
    [entityId, entityType, getLinkedDocuments]
  );

  return (
    <section className={`rounded-[24px] border border-[#E8DFD2] bg-[#FBF7F1] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.64rem] uppercase tracking-[0.16em] text-[#8A7A69]">
            {titleMap[entityType] || "Documentos"}
          </div>
          {entityLabel ? <div className="mt-1 text-sm font-semibold text-[#16120F]">{entityLabel}</div> : null}
        </div>
        <button
          className="flex items-center gap-2 rounded-2xl bg-[#183024] px-3 py-2 text-xs font-semibold text-[#F7F3ED]"
          onClick={() => openDocumentUpload({ linkType: entityType, linkedId: entityId, lotCode: entityType === "lot" ? entityId : "" })}
        >
          <HiPlus className="text-base" />
          Subir
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center gap-3 rounded-[18px] border border-[#E2D8CB] bg-white px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#16120F]">{document.name}</div>
                <div className="mt-1 text-xs text-[#7A6D5F]">
                  {document.category} · {document.sizeKb || "—"} KB
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded-xl border border-[#DDD4C7] p-2 text-[#183024]" onClick={() => openDocumentPreview(document.id)} aria-label="Ver documento">
                  <HiEye className="text-base" />
                </button>
                <button className="rounded-xl border border-[#DDD4C7] p-2 text-[#183024]" onClick={() => downloadDocument(document.id)} aria-label="Descargar documento">
                  <HiArrowDownTray className="text-base" />
                </button>
                <button className="rounded-xl border border-[#E3C8C2] p-2 text-[#B24A3C]" onClick={() => deleteDocument(document.id)} aria-label="Eliminar documento">
                  <HiTrash className="text-base" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#D8CCBE] bg-white px-4 py-6 text-center text-sm text-[#7A6D5F]">
            Aún no hay documentos vinculados.
          </div>
        )}
      </div>
    </section>
  );
}

export default InlineDocumentsPanel;
