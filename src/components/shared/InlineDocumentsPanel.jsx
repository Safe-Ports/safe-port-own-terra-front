import { useMemo } from "react";
import { HiArrowDownTray, HiEye, HiPlus, HiTrash } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

const titleMap = {
  contract: "Documentos del contrato",
  client: "Documentos del cliente",
  lot: "Documentos del lote"
};

/* Documentos de identidad (de la persona) → viven en el core, reutilizables
   en todas las apps. El resto son operativos de la app. */
const isIdentityDoc = (d) => {
  const c = `${d.category || ""}`.toLowerCase();
  return c.includes("ident") || c.includes("comprob") || c.includes("rfc") || c.includes("curp") || c.includes("acta");
};

function DocRow({ document, readOnly, openDocumentPreview, downloadDocument, deleteDocument }) {
  return (
    <div className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${readOnly ? "border-[rgba(111,175,107,0.22)] bg-[rgba(111,175,107,0.06)]" : "border-[rgba(67,69,63,0.10)] bg-white"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-[#1E3D2B]">{document.name}</div>
          {readOnly && (
            <span className="shrink-0 rounded-full border border-[rgba(111,175,107,0.3)] bg-[rgba(111,175,107,0.14)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.04em] text-[#2F6A38] font-mono">🌐 core</span>
          )}
        </div>
        <div className="mt-1 font-mono text-xs text-[#83867C]">
          {document.category} · {document.file_size ? `${Math.round(document.file_size / 1024)} KB` : "—"}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="rounded-xl border border-[rgba(67,69,63,0.12)] p-2 text-[#1E3D2B] transition hover:bg-[rgba(111,175,107,0.08)]" onClick={() => openDocumentPreview(document.id)} aria-label="Ver documento">
          <HiEye className="text-base" />
        </button>
        <button className="rounded-xl border border-[rgba(67,69,63,0.12)] p-2 text-[#1E3D2B] transition hover:bg-[rgba(111,175,107,0.08)]" onClick={() => downloadDocument(document.id)} aria-label="Descargar documento">
          <HiArrowDownTray className="text-base" />
        </button>
        {!readOnly && (
          <button className="rounded-xl border border-[#E3C8C2] p-2 text-[#B24A3C]" onClick={() => deleteDocument(document.id)} aria-label="Eliminar documento">
            <HiTrash className="text-base" />
          </button>
        )}
      </div>
    </div>
  );
}

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

  // Solo el expediente del cliente separa identidad (core) vs operación (app)
  const splitByIdentity = entityType === "client";
  const identityDocs = splitByIdentity ? documents.filter(isIdentityDoc) : [];
  const opDocs = splitByIdentity ? documents.filter((d) => !isIdentityDoc(d)) : documents;

  const rowProps = { openDocumentPreview, downloadDocument, deleteDocument };
  const uploadOp = () => openDocumentUpload({ linkType: entityType, linkedId: entityId, lotCode: entityType === "lot" ? entityId : "" });

  return (
    <section className={`rounded-[24px] border border-[rgba(67,69,63,0.10)] bg-[#FBFAF6] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#83867C]">
            {titleMap[entityType] || "Documentos"}
          </div>
          {entityLabel ? <div className="mt-1 text-sm font-semibold text-[#1E3D2B]">{entityLabel}</div> : null}
        </div>
        <button
          className="flex items-center gap-2 rounded-full border border-[rgba(111,175,107,0.3)] bg-[rgba(111,175,107,0.13)] px-3.5 py-2 text-xs font-semibold text-[#2F6A38] transition hover:bg-[rgba(111,175,107,0.2)]"
          onClick={uploadOp}
        >
          <HiPlus className="text-base" />
          Subir
        </button>
      </div>

      {splitByIdentity ? (
        <>
          {/* ── Identidad (core) ── */}
          <div className="mt-4 flex items-center gap-2">
            <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#83867C]">🌐 Identidad · del ecosistema</span>
            <span className="h-px flex-1 bg-[rgba(67,69,63,0.10)]" />
          </div>
          <div className="mt-2 text-[0.66rem] text-[#83867C]">Reutilizables en todas las apps · se administran en el core (solo lectura aquí).</div>
          <div className="mt-2 space-y-2">
            {identityDocs.length ? (
              identityDocs.map((d) => <DocRow key={d.id} document={d} readOnly {...rowProps} />)
            ) : (
              <div className="rounded-[18px] border border-dashed border-[rgba(111,175,107,0.3)] bg-[rgba(111,175,107,0.04)] px-4 py-5 text-center text-xs text-[#83867C]">
                Sin documentos de identidad en el core.
              </div>
            )}
          </div>

          {/* ── Operación (Lands) ── */}
          <div className="mt-5 flex items-center gap-2">
            <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#83867C]">📄 De esta operación · Lands</span>
            <span className="h-px flex-1 bg-[rgba(67,69,63,0.10)]" />
          </div>
          <div className="mt-2 space-y-2">
            {opDocs.length ? (
              opDocs.map((d) => <DocRow key={d.id} document={d} {...rowProps} />)
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#D9D7CF] bg-white px-4 py-5 text-center text-xs text-[#83867C]">
                Aún no hay documentos de esta operación.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          {opDocs.length ? (
            opDocs.map((d) => <DocRow key={d.id} document={d} {...rowProps} />)
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#D9D7CF] bg-white px-4 py-6 text-center text-sm text-[#83867C]">
              Aún no hay documentos vinculados.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default InlineDocumentsPanel;
