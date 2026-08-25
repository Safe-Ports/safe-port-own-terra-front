import { useEffect, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { HiBellAlert, HiCheckCircle, HiClock, HiCreditCard } from "react-icons/hi2";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import Modal from "@/components/ui/Modal";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { currency, dateLabel, relativeDays } from "@/services/formatters";
import { notificationService } from "@/services/notificationService";

const PAYMENT_RULES = {
  clientId: (v) => (!v ? "Selecciona un cliente." : ""),
  contractId: (v) => (!v ? "Selecciona un contrato." : ""),
  cuota: (v) => (!v || Number(v) < 1 ? "La cuota debe ser 1 o mayor." : ""),
  amount: (v) => (!v || Number(v) <= 0 ? "Ingresa un monto mayor a 0." : ""),
};

function PaymentModal() {
  const { ui, closeModal, clients, contracts, editingPayment, paymentDraft, savePayment, resetPaymentDraft } = useAppContext();
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
      editingPayment
        ? {
            clientId: editingPayment.client?.id || clients[0]?.id || "",
            contractId: editingPayment.contract?.id || contracts[0]?.id || "",
            cuota: editingPayment.installment_n || 1,
            amount: editingPayment.amount || 0,
            dueDate: editingPayment.due_date || new Date().toISOString().split("T")[0],
            paidDate: editingPayment.paid_date || "",
            status: editingPayment.status || "pending",
            notes: ""
          }
        : paymentDraft || {
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
      icon={<HiCreditCard />}
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
          <button className="btn-p" onClick={save}>Guardar</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <select className={fe.errors.clientId ? "mobile-input is-invalid" : "mobile-input"} value={form.clientId} onChange={(event) => { setForm((prev) => ({ ...prev, clientId: event.target.value })); fe.clear("clientId"); }}>
            <option value="">— Seleccionar cliente —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <FieldError msg={fe.errors.clientId} />
        </div>
        <div>
          <select className={fe.errors.contractId ? "mobile-input is-invalid" : "mobile-input"} value={form.contractId} onChange={(event) => { setForm((prev) => ({ ...prev, contractId: event.target.value })); fe.clear("contractId"); }}>
            <option value="">— Seleccionar contrato —</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>{contract.contract_number}</option>
            ))}
          </select>
          <FieldError msg={fe.errors.contractId} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input className={fe.errors.cuota ? "mobile-input is-invalid" : "mobile-input"} type="number" value={form.cuota} onChange={(event) => { setForm((prev) => ({ ...prev, cuota: Number(event.target.value) })); fe.clear("cuota"); }} placeholder="Cuota" />
            <FieldError msg={fe.errors.cuota} />
          </div>
          <div>
            <input className={fe.errors.amount ? "mobile-input is-invalid" : "mobile-input"} type="number" value={form.amount} onChange={(event) => { setForm((prev) => ({ ...prev, amount: Number(event.target.value) })); fe.clear("amount"); }} placeholder="Monto" />
            <FieldError msg={fe.errors.amount} />
          </div>
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
  const { payments, openModal, setEditingPayment, markAllNotificationsRead } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list({ limit: 20, unread_only: true }),
    staleTime: 60_000,
  });
  const notifications = notifData?.items || notifData || [];

  const overduePayments = payments
    .filter((payment) => payment.status === "overdue")
    .sort((left, right) => relativeDays(left.due_date) - relativeDays(right.due_date));

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-[#DCDAD2] bg-[linear-gradient(150deg,#4C241F,#18120F)] p-5 text-[#FBFAF6] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#E9B69F]">Centro de alertas</div>
              <div className="mt-2 font-display text-[1.9rem] leading-none">Prioridades de hoy</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-white/10 p-3">
                <HiBellAlert className="text-xl" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Críticas</div>
              <div className="mt-2 text-lg font-bold">{overduePayments.length}</div>
            </div>
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Pendientes</div>
              <div className="mt-2 text-lg font-bold">{notifications.length}</div>
            </div>
            <div className="rounded-[22px] bg-white/8 p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Cobranza</div>
              <div className="mt-2 text-lg font-bold">{currency(overduePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {overduePayments.map((payment) => (
            <article key={payment.id} className="rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-forest">{payment.client?.name || "Cliente"} · cuota {payment.installment_n}</div>
                  <div className="mt-1 text-sm text-[#43453F]">{payment.contract?.contract_number || "—"}</div>
                </div>
                <div className="rounded-full bg-[#FDECEA] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#C0392B]">
                  {Math.abs(relativeDays(payment.due_date))} días
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[22px] border border-[#E7E4DB] bg-[#FBFAF6] p-4">
                <div>
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Monto</div>
                  <div className="mt-2 text-base font-bold text-forest">{currency(payment.amount)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Fecha límite</div>
                  <div className="mt-2 text-sm font-semibold text-forest">{dateLabel(payment.due_date)}</div>
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
          ))}
        </section>

        <section className="rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HiClock className="text-xl text-forest" />
              <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#83867C]">Seguimientos mixtos</h2>
            </div>
            {notifications.length > 0 && (
              <button
                className="text-[0.68rem] font-semibold text-[#355E3B] underline"
                onClick={markAllNotificationsRead}
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {notifications.length > 0 ? notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`rounded-[22px] border p-4 ${n.is_read ? "border-[#E7E4DB] bg-[#FBFAF6]" : "border-[#C8DDD0] bg-[#EEF6F1]"}`}>
                <div className="text-sm font-semibold text-forest">{n.title}</div>
                <div className="mt-1 text-sm text-[#43453F]">{n.message || n.subtitle || ""}</div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-[#E7E4DB] bg-[#FBFAF6] p-4 text-sm text-[#83867C]">
                Sin notificaciones pendientes.
              </div>
            )}
          </div>
        </section>
      </div>
      <PaymentModal />
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Centro de alertas"
        subtitle="Priorización de cobranza vencida y seguimientos pendientes."
        steps={[
          { title: "Alertas críticas (rojas)", text: "Pagos con status 'vencido'. Requieren acción inmediata. Haz clic en 'Cobrar' para registrar el pago directamente desde la alerta." },
          { title: "Alertas pendientes", text: "Las notificaciones pendientes provienen del servicio de notificaciones del backend." },
          { title: "Seguimientos mixtos", text: "Notificaciones generadas por otras áreas del ecosistema (visitas agendadas, contratos por firmar, documentos pendientes)." },
          { title: "Marcar como leído", text: "El botón 'Marcar todo como leído' limpia el contador de notificaciones sin eliminarlas del historial." },
          { title: "Contador de cobranza", text: "Los 3 indicadores en el encabezado muestran el número de alertas críticas, pendientes y el monto total de cobranza vencida acumulada." },
        ]}
      />
    </>
  );
}

export default AlertsPage;
