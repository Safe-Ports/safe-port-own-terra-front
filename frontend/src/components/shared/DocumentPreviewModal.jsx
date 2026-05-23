import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";

function DocumentPreviewModal() {
  const {
    ui,
    documents,
    previewDocumentId,
    closeDocumentPreview,
    downloadDocument
  } = useAppContext();

  const document = useMemo(
    () => documents.find((item) => item.id === previewDocumentId),
    [documents, previewDocumentId]
  );

  if (!document) return null;

  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <Modal
      open={ui.documentPreview}
      icon="👁"
      title={document.name}
      subtitle={`${document.category} · ${document.sizeKb || 0} KB`}
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
        {document.fileDataUrl ? (
          isImage ? (
            <img src={document.fileDataUrl} alt={document.name} className="max-h-[70vh] w-full rounded-[20px] object-contain" />
          ) : isPdf ? (
            <iframe title={document.name} src={document.fileDataUrl} className="h-[70vh] w-full rounded-[20px] border border-[#DCCFBE] bg-white" />
          ) : (
            <div className="rounded-[22px] border border-[#DED5C8] bg-white p-5 text-sm text-[#5F5346]">
              Archivo cargado. Usa Descargar para abrirlo en tu dispositivo.
            </div>
          )
        ) : (
          <div className="rounded-[22px] border border-[#DED5C8] bg-white p-5 text-sm text-[#5F5346]">
            Este documento no tiene binario asociado en localStorage. Puedes descargar la referencia o volver a subir el archivo.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DocumentPreviewModal;
