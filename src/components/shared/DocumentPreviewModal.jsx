import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { documentService } from "@/services/documentService";
import Modal from "@/components/ui/Modal";

function DocumentPreviewModal() {
  const { ui, documents, previewDocumentId, closeDocumentPreview, downloadDocument } = useAppContext();

  const document = useMemo(
    () => documents.find((item) => item.id === previewDocumentId),
    [documents, previewDocumentId]
  );

  if (!document) return null;

  const isImage = document.mime_type?.startsWith("image/");
  const isPdf = document.mime_type === "application/pdf";
  const previewUrl = document.download_url || documentService.downloadUrl(document.id);
  const sizeKb = document.file_size ? Math.round(document.file_size / 1024) : 0;

  return (
    <Modal
      open={ui.documentPreview}
      icon="👁"
      title={document.name}
      subtitle={`${document.category} · ${sizeKb} KB`}
      onClose={closeDocumentPreview}
      width="max-w-[860px]"
      footer={
        <>
          <button className="btn-s" onClick={closeDocumentPreview}>Cerrar</button>
          <button className="btn-p" onClick={() => downloadDocument(document.id)}>Descargar</button>
        </>
      }
    >
      <div className="space-y-4">
        {isImage ? (
          <img src={previewUrl} alt={document.name} className="max-h-[70vh] w-full rounded-[20px] object-contain" />
        ) : isPdf ? (
          <iframe title={document.name} src={previewUrl} className="h-[70vh] w-full rounded-[20px] border border-[#DCCFBE] bg-white" />
        ) : (
          <div className="rounded-[22px] border border-[#DED5C8] bg-white p-5 text-sm text-[#5F5346]">
            Vista previa no disponible para este tipo de archivo.{" "}
            <button className="underline text-[#183024]" onClick={() => downloadDocument(document.id)}>
              Descargar para abrir
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DocumentPreviewModal;
