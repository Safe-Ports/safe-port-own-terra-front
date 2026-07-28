import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { currency, progress } from "@/services/formatters";
import { contractService } from "@/services/contractService";
import Button from "@/components/Button";
import GuideModal from "@/components/shared/GuideModal";

function SalesPage() {
  const { contracts, setEditingContract, openModal, openContractCreate, openDocumentUpload, openClientReport, showToast } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  const handleDownloadPdf = async (contract) => {
    try {
      showToast(`Generando PDF de ${contract.contract_number}…`);
      const blob = await contractService.downloadPdf(contract.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.contract_number || contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Error al descargar el contrato PDF", "error");
    }
  };

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">📄 Repositorio de Contratos</div>
        <button className="btn-p" onClick={() => openContractCreate()}>+ Generar Contrato</button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>N° Contrato</th>
              <th>Tipo</th>
              <th>Propiedad</th>
              <th>Cliente</th>
              <th>Monto Total</th>
              <th>Avance</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length ? contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <span className="contract-badge" onClick={() => { setEditingContract(contract); openModal("contractModal"); }}>
                    📄 {contract.contract_number}
                  </span>
                </td>
                <td>{contract.type}</td>
                <td>{contract.lot?.code || "—"}</td>
                <td>{contract.client?.name || "—"}</td>
                <td>{currency(contract.amount)}</td>
                <td>{progress(contract.payments_summary?.paid ?? 0, contract.payments_summary?.total ?? 0)}%</td>
                <td>
                  <span className={`pc-chip ${contract.type === "reserve" ? "pending" : "paid"}`}>{contract.status || contract.type}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => { setEditingContract(contract); openModal("contractModal"); }}>Editar</button>{" "}
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => openDocumentUpload({ linkType: "contract", linkedId: contract.id })}>📁</button>{" "}
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => openClientReport(contract.client?.id)}>🖨</button>{" "}
                  <button className="btn-p" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => handleDownloadPdf(contract)}>⬇ PDF</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 24, color: "var(--mu)" }}>
                  Sin contratos. <button type="button" onClick={() => openContractCreate()} style={{ color: "var(--tan-dk)", border: 0, background: "transparent", padding: 0, font: "inherit", fontWeight: 700, cursor: "pointer" }}>Generar el primero →</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Repositorio de contratos"
        subtitle="Gestión y seguimiento de todos los contratos de venta."
        steps={[
          { title: "Ver tus contratos", text: "La tabla muestra todos los contratos con su número, cliente, fraccionamiento, monto y estado de pago. Usa la barra de búsqueda para filtrar por nombre o número de contrato." },
          { title: "Descargar PDF", text: "Haz clic en el ícono de descarga en cualquier fila para generar y descargar el contrato en formato PDF firmado." },
          { title: "Editar contrato", text: "Pulsa el ícono de edición para modificar los datos del contrato: fecha, monto, vendedor asignado, enganche y plan de pagos." },
          { title: "Subir documentos", text: "Cada contrato puede tener documentos adjuntos (INE, acta de nacimiento, comprobante de domicilio). Pulsa el clip para adjuntar archivos." },
          { title: "Estado de cuenta", text: "El ícono de reporte abre el estado de cuenta completo del cliente con su historial de pagos y saldo pendiente." },
        ]}
      />
    </div>
  );
}

export default SalesPage;
