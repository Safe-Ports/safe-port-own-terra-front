import { useEffect, useState } from "react";
import { HiBellAlert, HiCheckCircle, HiClock } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { useAlertsQuery } from "@/hooks/queries/useAppQueries";
import Modal from "@/components/ui/Modal";
import { currency, dateLabel, relativeDays } from "@/services/formatters";

function PaymentModal() {
  const { ui, closeModal, clients, contracts, editingPayment, paymentDraft, savePayment, deletePayment, resetPaymentDraft } = useAppContext();
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "",
    contractId: contracts[0]?.id || "",
    cuota: 1,
    amount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    paidDate: "",
    status: "pending",
    notes: ""
  });

  useEffect(() => {
    setForm(
      editingPayment || paymentDraft || {
        clientId: clients[0]?.id || "",
        contractId: contracts[0]?.id || "",
        cuota: 1,
        amount: 0,
        dueDate: new Date().toISOString().split("T")[0],
        paidDate: "",
        status: "pending",
        notes: ""
      }
    );
  }, [clients, contracts, editingPayment, paymentDraft, ui.paymentModal]);

  return (
    <Modal
      open={ui.paymentModal}
      icon="💳"
      title={editingPayment ? "Actualizar pago" : "Registrar pago"}
      subtitle="Cobranza rápida desde celular"
      onClose={() => {
        resetPaymentDraft();
        closeModal("paymentModal");
      }}
      footer={
        <>
          <button
            className="btn-s"
            onClick={() => {
              resetPaymentDraft();
              closeModal("paymentModal");
            }}
          >
            Cancelar
          </button>
          {editingPayment ? (
            <button className="btn-dan" onClick={() => deletePayment(editingPayment.id)}>Eliminar</button>
          ) : null}
          <button className="btn-p" onClick={() => savePayment({ ...(editingPayment || {}), ...form })}>Guardar</button>
        </>
      }
    >
      <div className="space-y-3">
        <select className="mobile-input" value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <select className="mobile-input" value={form.contractId} onChange={(event) => setForm((prev) => ({ ...prev, contractId: event.target.value }))}>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.number}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input className="mobile-input" type="number" value={form.cuota} onChange={(event) => setForm((prev) => ({ ...prev, cuota: Number(event.target.value) }))} placeholder="Cuota" />
          <input className="mobile-input" type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} placeholder="Monto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="mobile-input" type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
          <select className="mobile-input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function AlertsPage() {
  const { data: alerts = [] } = useAlertsQuery();
  const { payments, clients, contracts, openModal, setEditingPayment } = useAppContext();

  const overduePayments = payments
    .filter((payment) => payment.status === "overdue")
    .sort((left, right) => relativeDays(left.dueDate) - relativeDays(right.dueDate));

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-[#DED5C8] bg-[linear-gradient(150deg,#4C241F,#18120F)] p-5 text-[#FFF8F3] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#E9B69F]">Centro de alertas</div>
              <div className="mt-2 font-['Playfair_Display'] text-[1.9rem] leading-none">Prioridades de hoy</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <HiBellAlert className="text-xl" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Críticas</div>
              <div className="mt-2 text-lg font-bold">{overduePayments.length}</div>
            </div>
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Pendientes</div>
              <div className="mt-2 text-lg font-bold">{alerts.length}</div>
            </div>
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Cobranza</div>
              <div className="mt-2 text-lg font-bold">{currency(overduePayments.reduce((sum, payment) => sum + payment.amount, 0))}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {overduePayments.map((payment) => {
            const client = clients.find((item) => item.id === payment.clientId);
            const contract = contracts.find((item) => item.id === payment.contractId);
            return (
              <article key={payment.id} className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#16120F]">{client?.name || "Cliente"} · cuota {payment.cuota}</div>
                    <div className="mt-1 text-sm text-[#5F5346]">{contract?.number || payment.contractId}</div>
                  </div>
                  <div className="rounded-full bg-[#FDECEA] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#C0392B]">
                    {Math.abs(relativeDays(payment.dueDate))} días
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">
                  <div>
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Monto</div>
                    <div className="mt-2 text-base font-bold text-[#16120F]">{currency(payment.amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Fecha límite</div>
                    <div className="mt-2 text-sm font-semibold text-[#183024]">{dateLabel(payment.dueDate)}</div>
                  </div>
                </div>
                <button
                  className="mt-4 mobile-primary-button w-full"
                  onClick={() => {
                    setEditingPayment(payment);
                    openModal("paymentModal");
                  }}
                >
                  <HiCheckCircle className="text-lg" />
                  Registrar pago
                </button>
              </article>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex items-center gap-2">
            <HiClock className="text-xl text-[#183024]" />
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Seguimientos mixtos</h2>
          </div>
          <div className="mt-4 space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">
                <div className="text-sm font-semibold text-[#16120F]">{alert.title}</div>
                <div className="mt-1 text-sm text-[#5F5346]">{alert.subtitle}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <PaymentModal />
    </>
  );
}

export default AlertsPage;
