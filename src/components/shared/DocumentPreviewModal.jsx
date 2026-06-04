import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { documentService, filenameForDocument } from "@/services/documentService";
import Modal from "@/components/ui/Modal";

function DocumentPreviewModal() {
  const { ui, documents, previewDocumentId, closeDocumentPreview, downloadDocument } = useAppContext();
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState(false);

  const document = useMemo(
    () => documents.find((item) => item.id === previewDocumentId),
    [documents, previewDocumentId]
  );

  const mimeType = document?.mime_type || "";
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(document?.name || "");
  const isOffice = /wordprocessingml|msword|spreadsheetml|presentationml|ms-excel|ms-powerpoint/i.test(mimeType)
    || /\.(docx?|xlsx?|pptx?)$/i.test(document?.name || "");
  const canPreview = isImage || isPdf;
  const filename = document ? filenameForDocument(document) : "documento";
  const sizeKb = document?.file_size ? Math.round(document.file_size / 1024) : 0;

  useEffect(() => {
    setPreviewUrl("");
    setPreviewError(false);
    if (!ui.documentPreview || !document || !canPreview) return undefined;

    let active = true;
    let objectUrl = "";
    documentService.fetchBlob(document.id, {
      directUrl: document.download_url,
      inline: true,
    }).then(({ blob }) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) {
        setPreviewUrl(objectUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    }).catch(() => {
      if (active) setPreviewError(true);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canPreview, document, ui.documentPreview]);

  if (!document) return null;

  return (
    <Modal
      open={ui.documentPreview}
      icon="👁"
      title={document.name}
      subtitle={`${document.category} · ${sizeKb} KB`}
      onClose={closeDocumentPreview}
      width="max-w-[860px]"
      overlayClassName="document-preview-overlay"
      footer={
        <>
          <button className="btn-s" onClick={closeDocumentPreview}>Cerrar</button>
          <button className="btn-p" onClick={() => downloadDocument(document.id, document.download_url, filename)}>Descargar</button>
        </>
      }
    >
      <div className="space-y-4">
        {canPreview && !previewUrl && !previewError ? (
          <div className="rounded-[22px] border border-[#DCDAD2] bg-white p-5 text-sm text-[#43453F]">
            Cargando vista previa...
          </div>
        ) : isImage && previewUrl ? (
          <img src={previewUrl} alt={document.name} className="max-h-[70vh] w-full rounded-[20px] object-contain" />
        ) : isPdf && previewUrl ? (
          <iframe title={document.name} src={previewUrl} className="h-[70vh] w-full rounded-[20px] border border-[#D9D7CF] bg-white" />
        ) : (
          <div className="rounded-[22px] border border-[#DCDAD2] bg-white p-5 text-sm text-[#43453F]">
            {previewError
              ? "No se pudo cargar la vista previa."
              : isOffice
                ? "Los documentos de Word, Excel o PowerPoint no tienen vista previa local en el navegador."
                : "Vista previa no disponible para este tipo de archivo."}{" "}
            <button className="underline text-[#1E3D2B]" onClick={() => downloadDocument(document.id, document.download_url, filename)}>
              Descargar para abrir
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DocumentPreviewModal;
