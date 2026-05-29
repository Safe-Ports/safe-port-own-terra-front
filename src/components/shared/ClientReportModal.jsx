import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { currency, dateLabel, progress } from "@/services/formatters";

function ClientReportModal() {
  const { ui, clients, contracts, payments, reportClientId, closeClientReport } = useAppContext();

  const data = useMemo(() => {
    const client = clients.find((item) => item.id === reportClientId);
    if (!client) return null;
    const clientContracts = contracts.filter((c) => String(c.client?.id) === String(client.id));
    const clientPayments = payments.filter((p) => String(p.client?.id) === String(client.id));
    const totalInvestment = clientContracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalPaid = clientPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      client,
      clientContracts,
      clientPayments,
      totalInvestment,
      totalPaid,
      balance: Math.max(0, totalInvestment - totalPaid),
    };
  }, [clients, contracts, payments, reportClientId]);

  if (!data) return null;

  return (
    <Modal
      open={ui.clientReport}
      icon="🖨"
      title={`Estado de cuenta · ${data.client.name}`}
      subtitle="Resumen de contratos y pagos"
      onClose={closeClientReport}
      width="max-w-[920px]"
      footer={
        <>
          <button className="btn-s" onClick={closeClientReport}>Cerrar</button>
          <button className="btn-p" onClick={() => window.print()}>Imprimir / PDF</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] bg-[#FBF7F1] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Inversión</div>
            <div className="mt-2 text-lg font-bold text-[#16120F]">{currency(data.totalInvestment)}</div>
          </div>
          <div className="rounded-[22px] bg-[#FBF7F1] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Pagado</div>
            <div className="mt-2 text-lg font-bold text-[#1B2B18]">{currency(data.totalPaid)}</div>
          </div>
          <div className="rounded-[22px] bg-[#FBF7F1] p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Saldo</div>
            <div className="mt-2 text-lg font-bold text-[#C0392B]">{currency(data.balance)}</div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">
          <div className="text-sm font-semibold text-[#16120F]">Contratos</div>
          <div className="mt-3 space-y-3">
            {data.clientContracts.map((contract) => {
              const paid = contract.payments_summary?.paid ?? 0;
              const total = contract.payments_summary?.total ?? 0;
              return (
                <div key={contract.id} className="rounded-[20px] border border-[#E8DFD2] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#16120F]">{contract.contract_number}</div>
                      <div className="mt-1 text-xs text-[#7E7061]">
                        {contract.lot?.code || "—"} · {dateLabel(contract.contract_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1B2B18]">{currency(contract.amount)}</div>
                      <div className="mt-1 text-xs text-[#7E7061]">{progress(paid, total)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">
          <div className="text-sm font-semibold text-[#16120F]">Historial de pagos</div>
          <div className="mt-3 space-y-3">
            {data.clientPayments.slice(0, 12).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-[20px] border border-[#E8DFD2] bg-white p-4">
                <div>
                  <div className="text-sm font-semibold text-[#16120F]">Cuota {payment.installment_n}</div>
                  <div className="mt-1 text-xs text-[#7E7061]">{dateLabel(payment.due_date)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#1B2B18]">{currency(payment.amount)}</div>
                  <div className="mt-1 text-xs text-[#7E7061]">{payment.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ClientReportModal;
