import { HiOutlineXMark, HiOutlineCheckCircle, HiOutlinePrinter } from "react-icons/hi2";
import { currency } from "@/services/formatters";
import Button from "@/components/Button";

const MEDIO_LABEL = {
  transfer: "Transferencia bancaria",
  cash:     "Efectivo",
  card:     "Tarjeta",
  check:    "Cheque",
};

const fmtD = iso =>
  !iso ? "—" : new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });

function Row({ label, value, valueStyle }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid var(--bd)",
    }}>
      <span style={{ fontSize: ".8rem", color: "var(--mu)", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--tx)", textAlign: "right", ...valueStyle }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: ".62rem", fontWeight: 700, letterSpacing: ".14em",
      textTransform: "uppercase", color: "var(--mu)", marginBottom: 8,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {children}
    </div>
  );
}

function handlePrint() {
  const style = document.createElement("style");
  style.id = "__receipt_print__";
  style.textContent = `
    @media print {
      body > * { display: none !important; }
      body > .modal-overlay { display: flex !important; background: none !important; backdrop-filter: none !important; padding: 0 !important; }
      .modal-box { box-shadow: none !important; border: none !important; max-height: none !important; overflow: visible !important; width: 100% !important; }
      .modal-close, .modal-foot, .__no-print { display: none !important; }
    }
  `;
  document.head.appendChild(style);
  window.print();
  setTimeout(() => document.getElementById("__receipt_print__")?.remove(), 1500);
}

export default function PaymentReceiptModal({ payment, allPayments = [], contracts = [], onClose }) {
  const contractId = payment?.contract?.id ?? payment?.contract_id;

  const contract = contracts.find(c => String(c.id) === String(contractId))
    || payment?.contract
    || {};

  const paidInContract = allPayments
    .filter(p => (p.contract?.id ?? p.contract_id) === contractId && p.status === "paid")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const totalAmount       = Number(contract?.amount ?? 0);
  const remainingBalance  = payment?.remaining_balance != null
    ? Number(payment.remaining_balance)
    : Math.max(0, totalAmount - paidInContract);

  const totalInstallments = contract?.total_months ?? payment?.contract?.total_months ?? "—";

  const nextPayment = allPayments
    .filter(p =>
      (p.contract?.id ?? p.contract_id) === contractId &&
      p.status !== "paid" &&
      p.id !== payment?.id
    )
    .sort((a, b) => (a.installment_n || 0) - (b.installment_n || 0))[0] || null;

  const folio  = payment?.id ? String(payment.id).replace(/-/g, "").slice(-8).toUpperCase() : "—";
  const medio  = MEDIO_LABEL[payment?.payment_method] ?? payment?.payment_method ?? "—";
  const amtPaid = Number(payment?.amount_paid ?? payment?.amount ?? 0);

  return (
    <div className="modal-overlay">
      <style>{`
        @media print {
          body > * { display: none !important; }
          body > .modal-overlay { display: flex !important; background: none !important; backdrop-filter: none !important; padding: 0 !important; }
          .modal-box { box-shadow: none !important; border: none !important; max-height: none !important; overflow: visible !important; width: 100% !important; }
          .modal-close, .modal-foot { display: none !important; }
        }
      `}</style>

      <div className="modal-box" style={{ maxWidth: 460 }}>

        {/* Header */}
        <div className="modal-hd">
          <div className="modal-ico" style={{ background: "linear-gradient(145deg,#355E3B,#2F6A38)" }}>✓</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title">Recibo de Pago</div>
            <div className="modal-sub">Folio #{folio}</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Hero — monto */}
          <div style={{ textAlign: "center", padding: "20px 0 18px" }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%", background: "#355E3B",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px", boxShadow: "0 6px 18px rgba(53,94,59,.3)",
            }}>
              <HiOutlineCheckCircle style={{ color: "#fff", fontSize: "1.7rem" }} />
            </div>
            <div style={{
              fontSize: ".72rem", fontWeight: 700, color: "var(--mu)",
              letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6,
            }}>
              Pago registrado
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2.1rem", fontWeight: 800,
              color: "var(--forest)", lineHeight: 1.1,
            }}>
              {currency(amtPaid)}
            </div>
          </div>

          {/* Detalle del pago */}
          <div style={{ background: "var(--sf2)", borderRadius: 14, padding: "2px 16px", marginBottom: 16 }}>
            <Row label="Fecha de pago"  value={fmtD(payment?.paid_date)} />
            <Row label="Medio de pago"  value={medio} />
            <Row label="Cliente"        value={payment?.client?.name || "—"} />
            <Row label="Contrato"       value={payment?.contract?.contract_number || "—"} />
            <Row label="Cuota"          value={`N° ${payment?.installment_n ?? "—"} de ${totalInstallments}`} />
            {payment?.notes && <Row label="Notas" value={payment.notes} />}
          </div>

          {/* Resumen de adeudo */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Resumen de adeudo</SectionLabel>
            <div style={{ background: "var(--sf2)", borderRadius: 14, padding: "2px 16px" }}>
              {totalAmount > 0 && <Row label="Total del contrato" value={currency(totalAmount)} />}
              <Row label="Total pagado"   value={currency(paidInContract)} />
              <Row
                label="Saldo restante"
                value={currency(remainingBalance)}
                valueStyle={{
                  color: remainingBalance <= 0 ? "var(--forest)" : "#9D6B18",
                  fontSize: ".98rem",
                }}
              />
            </div>
          </div>

          {/* Próximo abono / cierre */}
          {nextPayment ? (
            <div style={{
              background: "rgba(253,243,226,.65)", border: "1px solid #F0DCB8",
              borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontSize: "1.15rem", flexShrink: 0 }}>📅</div>
              <div>
                <div style={{
                  fontSize: ".68rem", fontWeight: 700, color: "#9D6B18",
                  textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3,
                }}>
                  Próximo abono
                </div>
                <div style={{ fontSize: ".87rem", fontWeight: 700, color: "var(--tx)" }}>
                  Cuota N° {nextPayment.installment_n} · {currency(nextPayment.amount)} · {fmtD(nextPayment.due_date)}
                </div>
              </div>
            </div>
          ) : remainingBalance <= 0 ? (
            <div style={{
              background: "rgba(111,175,107,.12)", border: "1px solid rgba(111,175,107,.32)",
              borderRadius: 14, padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontWeight: 700, color: "var(--forest)", fontSize: ".92rem" }}>
                ¡Contrato liquidado! Sin adeudos pendientes. 🎉
              </div>
            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }} onClick={handlePrint}>
            <HiOutlinePrinter /> Imprimir
          </Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
