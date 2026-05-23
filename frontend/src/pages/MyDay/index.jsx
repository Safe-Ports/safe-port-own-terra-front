import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { compactCurrency, currency, dateLabel, relativeDays } from "@/services/formatters";

function MyDayPage() {
  const navigate = useNavigate();
  const { currentUser, clients, contracts, payments, documents } = useAppContext();

  const overdue = payments.filter((payment) => payment.status === "overdue");
  const weekDue = payments.filter((payment) => {
    const days = relativeDays(payment.dueDate);
    return days >= 0 && days <= 7;
  });
  const missingDocs = contracts.filter(
    (contract) => !documents.some((document) => document.contractId === contract.id)
  );
  const teamRevenue = clients.reduce((sum, client) => sum + client.monthlyAmt * client.paidM, 0);

  const actions = [
    {
      title: `${overdue.length} pagos vencidos requieren seguimiento`,
      description: "Prioriza cobranza con clientes que ya cruzaron la fecha límite.",
      tone: "urgent",
      action: "Ver pagos",
      onClick: () => navigate("/pagos")
    },
    {
      title: `${weekDue.length} vencimientos en la próxima semana`,
      description: "Anticipa recordatorios para sostener la cobranza proyectada.",
      tone: "warn",
      action: "Planificar",
      onClick: () => navigate("/pagos")
    },
    {
      title: `${missingDocs.length} contratos aún sin expediente documental`,
      description: "Completa documentación antes del siguiente corte operativo.",
      tone: "info",
      action: "Revisar",
      onClick: () => navigate("/documentos")
    }
  ];

  const activity = [
    ...payments
      .filter((payment) => payment.status === "paid")
      .slice(0, 3)
      .map((payment) => ({
        label: `Pago aplicado · cuota ${payment.cuota}`,
        meta: `${payment.contractId} · ${currency(payment.amount)}`
      })),
    ...contracts.slice(0, 2).map((contract) => ({
      label: `Contrato firmado · ${contract.number}`,
      meta: `${contract.lot} · ${dateLabel(contract.date)}`
    }))
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#8C8070]">Resumen ejecutivo</div>
              <div className="mt-2 font-['Playfair_Display'] text-4xl text-[#1A1410]">
                Buen día, {currentUser?.name?.split(" ")[0]}
              </div>
              <div className="mt-3 max-w-2xl text-sm leading-7 text-[#5C5040]">
                Hoy el portafolio mantiene {contracts.length} contratos activos, {clients.length} clientes y una cobranza acumulada de {compactCurrency(teamRevenue)}.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:min-w-[360px]">
              <div className="rounded-2xl border border-line bg-[#f0ede5] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-[#8C8070]">Vencidos</div>
                <div className="mt-2 text-2xl font-bold text-[#C0392B]">{overdue.length}</div>
              </div>
              <div className="rounded-2xl border border-line bg-[#f0ede5] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-[#8C8070]">Cobranza semanal</div>
                <div className="mt-2 text-2xl font-bold text-[#2A7A50]">{compactCurrency(weekDue.reduce((sum, item) => sum + item.amount, 0))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.title}
              className={`rounded-2xl border px-5 py-4 ${
                action.tone === "urgent"
                  ? "border-[#F0C0BC] bg-[#FDECEA]"
                  : action.tone === "warn"
                    ? "border-[#F0DCB8] bg-[#FEF3E2]"
                    : "border-[#C9D9E8] bg-[#E8F1FA]"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-[#1A1410]">{action.title}</div>
                  <div className="mt-1 text-sm text-[#5C5040]">{action.description}</div>
                </div>
                <button className="tb-btn tb-s" onClick={action.onClick}>{action.action}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="card-title">Actividad reciente</div>
          </div>
          <div className="card-body space-y-3">
            {activity.map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
                <div className="text-sm font-semibold text-[#1A1410]">{item.label}</div>
                <div className="mt-1 text-xs text-[#8C8070]">{item.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Próximos vencimientos</div>
          </div>
          <div className="card-body space-y-3">
            {weekDue.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[#1A1410]">Cuota {payment.cuota} · {payment.contractId}</div>
                  <div className="text-xs text-[#8C8070]">{dateLabel(payment.dueDate)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2A7A50]">{currency(payment.amount)}</div>
                  <div className="text-xs text-[#8C8070]">{relativeDays(payment.dueDate)} días</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="card-title">Pulso comercial</div>
          </div>
          <div className="card-body space-y-3">
            {[...new Set(clients.map((client) => client.seller))].map((seller) => {
              const sellerClients = clients.filter((client) => client.seller === seller);
              return (
                <div key={seller} className="rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
                  <div className="text-sm font-semibold text-[#1A1410]">{seller}</div>
                  <div className="mt-1 text-xs text-[#8C8070]">
                    {sellerClients.length} clientes · {compactCurrency(sellerClients.reduce((sum, client) => sum + client.monthlyAmt * client.paidM, 0))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyDayPage;
