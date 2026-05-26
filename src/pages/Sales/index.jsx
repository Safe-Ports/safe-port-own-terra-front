import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { currency, progress } from "@/services/formatters";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";

function ContractModal() {
  const { ui, closeModal, clients, editingContract, contractDraft, saveContract, deleteContract, resetContractDraft } = useAppContext();
  const [form, setForm] = useState({
    number: "",
    lot: "",
    clientId: clients[0]?.id || "",
    type: "sale",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    paidM: 0,
    totalM: 96,
    notes: ""
  });

  const { data: availableLots = [] } = useQuery({
    queryKey: ["lots", "available"],
    queryFn: () => lotService.list({ status: "available", limit: 200 }).then((r) => r.items),
    enabled: ui.contractModal && !editingContract,
  });

  useEffect(() => {
    setForm(
      editingContract || contractDraft || {
        number: "",
        lot: "",
        clientId: clients[0]?.id || "",
        type: "sale",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        paidM: 0,
        totalM: 96,
        notes: ""
      }
    );
  }, [clients, contractDraft, editingContract, ui.contractModal]);

  return (
    <Modal
      open={ui.contractModal}
      icon="📄"
      title={editingContract ? "Generar Contrato" : "Generar Contrato"}
      subtitle="Vincula lote y cliente"
      onClose={() => {
        resetContractDraft();
        closeModal("contractModal");
      }}
      footer={
        <>
          <button className="btn-s" onClick={() => { resetContractDraft(); closeModal("contractModal"); }}>Cancelar</button>
          {editingContract ? <button className="btn-dan" onClick={() => deleteContract(editingContract.id)}>🗑 Eliminar</button> : null}
          <button className="btn-p" onClick={() => saveContract({ ...(editingContract || {}), ...form, client_id: form.clientId, lot_id: Number(form.lot), contract_date: form.date, first_payment_date: form.date, total_months: form.totalM })}>✓ Registrar</button>
        </>
      }
    >
      <div className="fg">
        <label className="fl">N° de Contrato</label>
        <input className="fi" value={form.number} onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} placeholder="CON-2026-001" />
      </div>
      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Propiedad / Lote</label>
          <select className="fi" value={form.lot} onChange={(event) => setForm((prev) => ({ ...prev, lot: event.target.value }))}>
            <option value="">— Seleccionar lote —</option>
            {availableLots.map((lot) => (
              <option key={lot.id} value={lot.id}>{lot.code}{lot.inmueble_name ? ` · ${lot.inmueble_name}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Cliente</label>
          <select className="fi" value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Tipo de Contrato</label>
          <select className="fi" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
            <option value="sale">Compraventa</option>
            <option value="rent">Arrendamiento</option>
            <option value="reserve">Reserva</option>
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Fecha de firma</label>
          <input className="fi" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
        </div>
      </div>
      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Monto total ($)</label>
          <input className="fi" type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Pagos realizados / Total</label>
          <div className="fr-row">
            <input className="fi" type="number" value={form.paidM} onChange={(event) => setForm((prev) => ({ ...prev, paidM: Number(event.target.value) }))} />
            <input className="fi" type="number" value={form.totalM} onChange={(event) => setForm((prev) => ({ ...prev, totalM: Number(event.target.value) }))} />
          </div>
        </div>
      </div>
      <div className="fg">
        <label className="fl">Notas</label>
        <textarea className="fi" rows="2" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
      </div>
      <div style={{ background: "var(--tan-lt)", border: "1px solid var(--forest)", borderRadius: 8, padding: "10px 12px", fontSize: ".75rem", color: "var(--forest)" }}>
        💡 El contrato quedará registrado. El archivo PDF puede subirse o generarse en cualquier momento.
      </div>
    </Modal>
  );
}

function SalesPage() {
  const { contracts, clients, setEditingContract, openModal, openContractCreate, openDocumentUpload, openClientReport, showToast } = useAppContext();

  return (
    <>
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
                    <button className="btn-p" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => { window.open(contractService.downloadPdf(contract.id), "_blank"); showToast(`Descargando ${contract.contract_number}...`); }}>⬇ PDF</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 24, color: "var(--mu)" }}>
                    Sin contratos. <a href="#" onClick={(event) => { event.preventDefault(); openContractCreate(); }} style={{ color: "var(--tan-dk)" }}>Generar el primero →</a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ContractModal />
    </>
  );
}

export default SalesPage;
