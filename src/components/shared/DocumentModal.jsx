import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import WorkflowForm from "@/components/forms/WorkflowForm";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import FieldError from "@/components/shared/FieldError";
import DocumentUploadFields, { useDocumentUpload } from "@/components/shared/DocumentUploadFields";
import ClientPicker from "@/components/shared/ClientPicker";
import ContractPicker from "@/components/shared/ContractPicker";
import { clientService } from "@/services/clientService";
import { HiOutlineFolder } from "react-icons/hi2";

function DocumentForm() {
  const { closeModal, saveDocument, documentDraft, resetDocumentDraft } = useAppContext();
  const ctl = useDocumentUpload(documentDraft || {});
  const [linkType, setLinkType] = useState(documentDraft?.linkType || "");
  const [linkedId, setLinkedId] = useState(documentDraft?.linkedId || "");
  const [uploading, setUploading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const client = useQuery({ queryKey: ["client", String(linkedId)], queryFn: () => clientService.get(linkedId), enabled: linkType === "client" && !!linkedId });
  const close = () => { if (!uploading) { resetDocumentDraft(); closeModal("documentModal"); } };
  const save = async () => {
    if (uploading) return;
    const valid = ctl.validate();
    setLinkError(linkType && !linkedId ? "Selecciona el registro al que pertenece el documento." : "");
    if (!valid || (linkType && !linkedId)) return;
    setUploading(true);
    try { await saveDocument({ ...ctl.form, linkType, linkedId }, ctl.file); }
    finally { setUploading(false); }
  };
  return <Modal open icon={<HiOutlineFolder />} title="Subir documento" subtitle="Archivo y expediente al que pertenece" onClose={close} footer={<><button type="button" className="btn-s" onClick={close} disabled={uploading}>Cancelar</button><button type="submit" form="lands-document-form" className="btn-p" disabled={uploading}>{uploading ? "Subiendo…" : "Guardar documento"}</button></>}>
    <WorkflowForm id="lands-document-form" noValidate busy={uploading} onSubmit={event => { event.preventDefault(); return save(); }}>
      <fieldset disabled={uploading} className="lands-form-fields">
        <DocumentUploadFields ctl={ctl} defaultFolderAppKey="lands" />
        <div className="fg"><label className="fl" htmlFor="document-link-type">Vincular a (opcional)</label><select id="document-link-type" className="fi" value={linkType} onChange={event => { setLinkType(event.target.value); setLinkedId(""); setLinkError(""); }}><option value="">Sin vincular</option><option value="client">Cliente</option><option value="contract">Contrato</option></select></div>
        {linkType === "client" && <ClientPicker allowCreate={false} disabled={uploading || client.isFetching} value={linkedId ? client.data || {id: linkedId, name: "Cargando cliente…"} : null} onSelect={value => { setLinkedId(value?.id || ""); setLinkError(""); }} />}
        {linkType === "client" && client.isError && <InlineError error={parseApiError(client.error)}><button type="button" className="btn-s" onClick={() => client.refetch()}>Reintentar cliente</button></InlineError>}
        {linkType === "contract" && <ContractPicker value={linkedId} onSelect={value => { setLinkedId(value || ""); setLinkError(""); }} disabled={uploading} />}
        <FieldError msg={linkError} />
      </fieldset>
    </WorkflowForm>
  </Modal>;
}
export default function DocumentModal() { const {ui} = useAppContext(); return ui.documentModal ? <DocumentForm /> : null; }
