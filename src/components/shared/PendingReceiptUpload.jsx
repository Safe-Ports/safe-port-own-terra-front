import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import FilePicker from "@/components/shared/FilePicker";
import { paymentService } from "@/services/paymentService";
import { incomeService } from "@/services/incomeService";
import { expenseService } from "@/services/expenseService";
import { lotService } from "@/services/lotService";
export default function PendingReceiptUpload({ issue, onDone }) {
  const { showError, showToast } = useAppContext();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  return <section className="lands-receipt-pending" role="status"><strong>{issue.kind === "reservation" ? "Apartado registrado. Comprobante pendiente." : issue.kind === "income" ? "Ingreso registrado. Comprobante pendiente." : issue.kind === "expense" ? "Egreso registrado. Comprobante pendiente." : "Cobro registrado. Comprobante pendiente."}</strong><p>No vuelvas a registrar el pago. Adjunta el archivo para completar su evidencia.</p><small>Referencia del registro: {issue.id}</small><FilePicker value={file} onChange={setFile} accept="application/pdf,image/jpeg,image/png,image/webp" /><button type="button" className="btn-p" disabled={!file || busy} onClick={async () => {
    setBusy(true);
    try { await (issue.kind === "reservation" ? lotService.reservationReceipt(issue.id, [file]) : issue.kind === "income" ? incomeService.receipt(issue.id, file) : issue.kind === "expense" ? expenseService.receipt(issue.id, file) : issue.kind === "receipt" ? paymentService.uploadCollectReceipt(issue.id, file) : paymentService.uploadReceipt(issue.id, file)); onDone(); showToast("Comprobante adjuntado"); }
    catch (error) { showError(error, "No se pudo adjuntar el comprobante"); }
    finally { setBusy(false); }
  }}>{busy ? "Adjuntando…" : "Adjuntar comprobante"}</button></section>;
}

