import { useParams } from "react-router-dom";
import ClientReport, { CLIENT_REPORT_STYLES } from "@/components/shared/ClientReport";

/* Estado de cuenta de un cliente, como pantalla propia (no la vista de
   Reportes con su lista de clientes al lado) — pensada para abrirse en una
   pestaña nueva desde cualquier lado (hoy, desde la fila de un contrato en
   Pagos) sin pasar por esa otra pantalla. */
function ClientStatementPage() {
  const { clientId } = useParams();
  return (
    <>
      <style>{CLIENT_REPORT_STYLES}</style>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <ClientReport clientId={clientId} />
      </div>
    </>
  );
}

export default ClientStatementPage;
