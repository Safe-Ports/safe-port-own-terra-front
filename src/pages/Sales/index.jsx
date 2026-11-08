import { useState } from "react";
import { HiDocumentText, HiFolder, HiLockOpen } from "react-icons/hi2";
import { useSearchParams } from "react-router-dom";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ClientPicker from "@/components/shared/ClientPicker";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { currency, progress } from "@/services/formatters";
import { clientService } from "@/services/clientService";
import { contractService } from "@/services/contractService";
import ReleasesTable from "./ReleasesTable";
import Button from "@/components/Button";
import GuideModal from "@/components/shared/GuideModal";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import PendingApproval from "./PendingApproval";
import Pagination from "@/components/shared/Pagination";

const POR_PAGINA = 10;

// El estado que guarda la base no es el que se lee. "pending_approval" es una
// clave, no una frase.
const ESTADO = {
  pending_approval: { label: "Por aprobar", cls: "pending-approval" },
  rejected: { label: "Rechazado", cls: "rejected" },
  active: { label: "Vigente", cls: "paid" },
  completed: { label: "Liquidado", cls: "paid" },
  cancelled: { label: "Cancelado", cls: "pending" },
  defaulted: { label: "En mora", cls: "pending" },
};

function SalesPage() {
  const { setEditingContract, openModal, openContractCreate } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);
  const [docsContract, setDocsContract] = useState(null);
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const status = params.get("status") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const clientId = params.get("client") || "";
  const view = params.get("view") || "contracts";
  const setView = (next) => setParams(previous => {
    const p = new URLSearchParams(previous);
    if (next === "contracts") p.delete("view"); else p.set("view", next);
    return p;
  }, { replace: true });
  const debounced = useDebouncedValue(search.trim());
  const updateFilters = (changes) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete("contract"); next.delete("page");
      Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
      return next;
    }, { replace: true });
  };
  const clientQuery = useQuery({ queryKey: ["client", clientId], queryFn: () => clientService.get(clientId), enabled: !!clientId });
  const list = useQuery({
    queryKey: ["contracts", "directory", debounced, status, clientId, page],
    queryFn: () => contractService.list({ page, limit: POR_PAGINA, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}), ...(clientId ? { client_id: clientId } : {}) }),
  });
  const targetId = params.get("contract");
  const target = useQuery({ queryKey: ["contracts", "detail", targetId], queryFn: () => contractService.get(targetId), enabled: !!targetId });
  const openRecord = contract => { setEditingContract(contract); openModal("contractModal"); };
  useLandsGuide(() => setShowGuide(true));

  const contractRows = search.trim() === debounced ? list.data?.items || [] : [];
  const searching = list.isFetching || search.trim() !== debounced;

  return (
    <>
    <PendingApproval />
    <div className="lands-tabs" role="tablist" aria-label="Vista de contratos">
      <button type="button" role="tab" aria-selected={view === "contracts"} className={view === "contracts" ? "is-active" : ""} onClick={() => setView("contracts")}>
        <HiDocumentText /> Contratos
      </button>
      <button type="button" role="tab" aria-selected={view === "releases"} className={view === "releases" ? "is-active" : ""} onClick={() => setView("releases")}>
        <HiLockOpen /> Liberaciones
      </button>
    </div>
    {view === "releases" ? <ReleasesTable /> : (
    <div className="card lands-contracts">
      {targetId && <section className="lands-found-record" aria-label="Contrato encontrado">
        {target.isPending ? <p role="status">Cargando contrato…</p> : target.isError ? <><InlineError error={parseApiError(target.error)} /><button type="button" className="btn-s" onClick={() => target.refetch()}>Reintentar</button></> : target.data && <><div><strong>{target.data.contract_number}</strong><p>{target.data.client?.name} · {target.data.lot?.code}</p></div><button type="button" className="btn-p" onClick={() => openRecord(target.data)}>Abrir contrato</button></>}
      </section>}
      <div className="card-hd">
        <div className="card-title"><HiDocumentText style={{ display: "inline", verticalAlign: "-2px" }} /> Repositorio de Contratos</div>
        <button className="btn-p" data-tour="contrato-generar" onClick={() => openContractCreate()}>+ Generar Contrato</button>
      </div>
      <div className="lands-list-filters">
        <label>Número de contrato<input className="fi" type="search" aria-label="Buscar contrato por número" placeholder="Ej. CT-2026-001" value={search} onChange={e => updateFilters({ q: e.target.value })} /></label>
        <div><span className="fl">Cliente</span><ClientPicker value={clientQuery.data || null} onSelect={client => updateFilters({ client: client?.id })} allowCreate={false} /></div>
        <label>Estado<select className="fi" value={status} onChange={e => updateFilters({ status: e.target.value })}><option value="">Todos los estados</option>{Object.entries(ESTADO).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
        {(search || status || clientId) && <button type="button" className="btn-s" onClick={() => setParams({})}>Limpiar filtros</button>}
      </div>
      {list.isError && <div className="lands-list-message"><InlineError error={parseApiError(list.error, "No se pudieron cargar los contratos")} /><button type="button" className="btn-s" onClick={() => list.refetch()}>Reintentar</button></div>}
      <div className="card-body lands-table-scroll" style={{ padding: 0 }}>
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
            {contractRows.length ? contractRows.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <span className="contract-badge">
                    <HiDocumentText style={{ display: "inline", verticalAlign: "-2px" }} /> {contract.contract_number}
                  </span>
                </td>
                <td>{{ sale: "Compraventa", reserve: "Apartado", rent: "Arrendamiento" }[contract.type] || contract.type}</td>
                <td>{contract.lot?.code || "—"}<small className="lands-row-secondary">{contract.lot?.inmueble_name}</small></td>
                <td>{contract.client?.name || "—"}</td>
                <td>{currency(contract.amount)}</td>
                <td>{progress(contract.payments_summary?.paid ?? 0, contract.payments_summary?.total ?? 0)}%</td>
                <td>
                  <span className={`pc-chip ${ESTADO[contract.status]?.cls || (contract.type === "reserve" ? "pending" : "paid")}`}>
                    {ESTADO[contract.status]?.label || contract.status || contract.type}
                  </span>
                  {/* El motivo va junto al estado: es lo que quien lo armó
                      necesita para saber qué corregir. */}
                  {contract.status === "rejected" && contract.rejection_reason && (
                    <span className="pa-reason">{contract.rejection_reason}</span>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => openRecord(contract)}>Editar</button>{" "}
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} aria-label={`Documentos de ${contract.contract_number}`} title="Documentos adjuntos" onClick={() => setDocsContract(contract)}><HiFolder /></button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 24, color: "var(--mu)" }}>
                  {searching ? <span role="status">Buscando contratos…</span> : list.isError ? "No se pudieron cargar los contratos." : search || status || clientId ? "No hay contratos que coincidan con estos filtros." : <>Sin contratos. <button type="button" className="btn-s" onClick={() => openContractCreate()}>Generar el primero</button></>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination total={list.data?.total || 0} page={page} limit={POR_PAGINA} onPage={value => updateFilters({ page: String(value) })} />
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Repositorio de contratos"
        subtitle="Gestión y seguimiento de todos los contratos de venta."
        steps={[
          { title: "Ver tus contratos", text: "La tabla muestra todos los contratos con su número, cliente, fraccionamiento, monto y estado de pago. Busca por número de contrato o selecciona un cliente; combina con el estado. La búsqueda consulta todos los registros autorizados." },
          { title: "Editar contrato", text: "Pulsa \"Editar\" para modificar los datos del contrato: fecha, monto, vendedor asignado, enganche y plan de pagos." },
          { title: "Documentos adjuntos", text: "El ícono de carpeta muestra los documentos ya adjuntos a ese contrato (con opción de verlos o descargarlos) y permite subir nuevos." },
        ]}
      />
      <Modal
        open={!!docsContract}
        onClose={() => setDocsContract(null)}
        title="Documentos del contrato"
        subtitle={docsContract?.contract_number}
      >
        {docsContract && (
          <InlineDocumentsPanel
            entityType="contract"
            entityId={docsContract.id}
          />
        )}
      </Modal>
    </div>
    )}
    </>
  );
}

export default SalesPage;
