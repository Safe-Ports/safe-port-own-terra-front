import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { currency, dateLabel, relativeDays } from "@/services/formatters";

function PaymentModal() {
  const { ui, closeModal, clients, contracts, editingPayment, paymentDraft, savePayment, deletePayment, resetPaymentDraft } = useAppContext();
  const [form, setForm] = useState(
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
      title={editingPayment ? "Editar Pago" : "Registrar Pago"}
      subtitle="Registra el pago de una cuota."
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
            <button className="btn-dan" onClick={() => deletePayment(editingPayment.id)}>
              Eliminar
            </button>
          ) : null}
          <button className="btn-p" onClick={() => savePayment({ ...(editingPayment || {}), ...form })}>
            Guardar Pago
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="fg">
            <label className="fl">Cliente</label>
            <select className="fi" value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fl">Contrato</label>
            <select className="fi" value={form.contractId} onChange={(event) => setForm((prev) => ({ ...prev, contractId: event.target.value }))}>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.number}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="fg">
            <label className="fl">N° de cuota</label>
            <input className="fi" type="number" value={form.cuota} onChange={(event) => setForm((prev) => ({ ...prev, cuota: Number(event.target.value) }))} />
          </div>
          <div className="fg">
            <label className="fl">Monto</label>
            <input className="fi" type="number" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="fg">
            <label className="fl">Fecha límite</label>
            <input className="fi" type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
          </div>
          <div className="fg">
            <label className="fl">Fecha de pago</label>
            <input className="fi" type="date" value={form.paidDate} onChange={(event) => setForm((prev) => ({ ...prev, paidDate: event.target.value }))} />
          </div>
        </div>
        <div className="fg">
          <label className="fl">Estado</label>
          <select className="fi" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function PaymentsPage() {
  const { payments, clients, contracts, openModal, setEditingPayment, quickPay, sendReminder, openPaymentCreate } = useAppContext();
  const [filter, setFilter] = useState("all");

  const normalized = payments
    .map((payment) => ({
      ...payment,
      days: relativeDays(payment.dueDate)
    }))
    .sort((left, right) => left.days - right.days);

  const filtered = normalized.filter((payment) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return payment.days >= 0 && payment.days <= 7;
    return payment.status === filter;
  });

  const upcoming = normalized.filter((payment) => payment.days >= 0 && payment.days <= 30);

  const kpis = [
    ["Pendientes", normalized.filter((item) => item.status === "pending").length],
    ["Vencidos", normalized.filter((item) => item.status === "overdue").length],
    ["Pagados", normalized.filter((item) => item.status === "paid").length],
    ["Cobro 30 días", currency(upcoming.reduce((sum, item) => sum + item.amount, 0))],
    ["Tickets", normalized.length]
  ];

  return (
    <>
      <div className="pagos-kpis">
        {kpis.map(([label, value], index) => (
          <div key={label} className={`kpi k${Math.min(index + 1, 4)}`}>
            <div className="kpi-val text-[1.45rem]">{value}</div>
            <div className="kpi-lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="pagos-filters">
        {[
          ["all", "Todos"],
          ["overdue", "⚠ Vencidos"],
          ["upcoming", "⏰ Próximos (7 días)"],
          ["pending", "Pendientes"],
          ["paid", "Pagados"]
        ].map(([value, label]) => (
          <button key={value} className={`pf-pill ${filter === value ? "act" : ""} ${value === "overdue" ? "overdue-pill" : value === "upcoming" ? "upcoming-pill" : ""}`} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
        <div className="spacer" />
        <button
          className="btn-p"
          onClick={() => openPaymentCreate()}
        >
          + Registrar Pago
        </button>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Registro de pagos</div>
          <div className="text-xs text-[#8C8070]">{filtered.length} registros</div>
        </div>
        <div className="card-body overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contrato</th>
                <th>Cuota</th>
                <th>Monto</th>
                <th>Fecha límite</th>
                <th>Estado</th>
                <th>Días</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => {
                const client = clients.find((item) => item.id === payment.clientId);
                const contract = contracts.find((item) => item.id === payment.contractId);
                return (
                  <tr key={payment.id} className={payment.status === "overdue" ? "pago-row-overdue" : payment.days <= 7 && payment.days >= 0 ? "pago-row-upcoming" : ""}>
                    <td>{client?.name || "Sin cliente"}</td>
                    <td>{contract?.number || payment.contractId}</td>
                    <td>{payment.cuota}</td>
                    <td>{currency(payment.amount)}</td>
                    <td>{dateLabel(payment.dueDate)}</td>
                    <td>
                      <span className={`pc-chip ${payment.status}`}>{payment.status}</span>
                    </td>
                    <td>
                      <span className={`days-badge ${payment.status === "paid" ? "paid" : payment.days < 0 ? "overdue" : payment.days <= 7 ? "upcoming" : "ok"}`}>
                        {payment.status === "paid" ? "Aplicado" : `${payment.days} días`}
                      </span>
                    </td>
                    <td>
                      {payment.status !== "paid" ? (
                        <button className="btn-p !px-3 !py-2 !text-xs" onClick={() => quickPay(payment.id)}>
                          Pagar
                        </button>
                      ) : null}
                      <button
                        className="btn-s !ml-2"
                        onClick={() => {
                          setEditingPayment(payment);
                          openModal("paymentModal");
                        }}
                      >
                        Editar
                      </button>
                      {payment.status === "overdue" ? (
                        <button className="btn-dan !ml-2 !px-3 !py-2 !text-xs" onClick={() => sendReminder(client?.name || "cliente")}>
                          Recordar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">📅 Próximos vencimientos — 30 días</div>
        </div>
        <div className="card-body space-y-3">
          {upcoming.slice(0, 8).map((payment) => {
            const client = clients.find((item) => item.id === payment.clientId);
            return (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-line bg-[#fffdf8] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[#1A1410]">{client?.name || "Cliente"} · cuota {payment.cuota}</div>
                  <div className="text-xs text-[#8C8070]">{payment.contractId} · {dateLabel(payment.dueDate)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2A7A50]">{currency(payment.amount)}</div>
                  <div className="text-xs text-[#8C8070]">{payment.days} días</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PaymentModal />
    </>
  );
}

export default PaymentsPage;
