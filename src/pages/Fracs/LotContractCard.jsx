import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { contractService } from "@/services/contractService";
import { currency } from "@/services/formatters";

const STATUS = {
  active: "Vigente", pending_approval: "Por aprobar", completed: "Liquidado",
  defaulted: "En mora", cancelled: "Cancelado", rejected: "Rechazado",
};
const TYPE = { sale: "Compraventa", reserve: "Apartado", rent: "Renta" };

function planLabel(contract) {
  const months = Number(contract.total_months);
  if (contract.type !== "sale") return null;
  if (months === 1 && Number(contract.interest_rate) === 0) return "De contado";
  if (Number(contract.interest_rate) === 0 && !contract.calculator_id) return `En ${months} parcialidades`;
  return `${months} mensualidades`;
}

/**
 * El contrato del lote dentro de su ficha. Se pide por lote, con la misma llave
 * "contracts" que refresca el alta de un contrato: al registrarlo desde aquí,
 * la ficha lo muestra sin recargar.
 */
export default function LotContractCard({ lotId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["contracts", "lot", lotId],
    queryFn: () => contractService.list({ lot_id: lotId, limit: 5 }),
    enabled: Boolean(lotId),
  });
  const items = data?.items || (Array.isArray(data) ? data : []);
  const contract = items.find((c) => !["cancelled", "rejected"].includes(c.status)) || null;
  if (isLoading || !contract) return null;
  const plan = planLabel(contract);
  return (
    <div className="lotp-sec">
      <div className="lotp-sh"><b>Contrato</b></div>
      <div className="lotp-specs lotp-contract">
        <div className="lotp-spec">
          <span className="lotp-spec-k">{TYPE[contract.type] || "Contrato"} {contract.contract_number}</span>
          <span className={`lotp-contract-status is-${contract.status}`}>{STATUS[contract.status] || contract.status}</span>
        </div>
        {contract.client?.name ? <div className="lotp-spec"><span className="lotp-spec-k">Cliente</span><span className="lotp-spec-v">{contract.client.name}</span></div> : null}
        {contract.amount ? <div className="lotp-spec"><span className="lotp-spec-k">Monto</span><span className="lotp-spec-v money">{currency(contract.amount)}</span></div> : null}
        {plan ? <div className="lotp-spec"><span className="lotp-spec-k">Forma de pago</span><span className="lotp-spec-v">{plan}</span></div> : null}
        {Number(contract.down_payment) > 0 ? <div className="lotp-spec"><span className="lotp-spec-k">Enganche</span><span className="lotp-spec-v money">{currency(contract.down_payment)}</span></div> : null}
        {contract.monthly_payment && Number(contract.total_months) > 1 ? <div className="lotp-spec"><span className="lotp-spec-k">Pago mensual</span><span className="lotp-spec-v money">{currency(contract.monthly_payment)}</span></div> : null}
        {contract.seller?.name ? <div className="lotp-spec"><span className="lotp-spec-k">Vendedor</span><span className="lotp-spec-v">{contract.seller.name}</span></div> : null}
      </div>
      <Link className="lotp-contract-link" to={`/contratos?q=${encodeURIComponent(contract.contract_number)}`}>Ver en Contratos →</Link>
    </div>
  );
}
