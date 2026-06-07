import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { currency, progress } from "@/services/formatters";
import { contractService } from "@/services/contractService";
import Button from "@/components/Button";

function SalesPage() {
  const { contracts, setEditingContract, openModal, openContractCreate, openDocumentUpload, openClientReport, showToast } = useAppContext();

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
      showToast("Error al descargar el contrato PDF");
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
    </div>
  );
}

export default SalesPage;
