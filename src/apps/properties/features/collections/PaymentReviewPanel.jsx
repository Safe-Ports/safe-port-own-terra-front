import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuArrowUpRight, LuCheck, LuFileText, LuInbox, LuX } from "react-icons/lu";
import DialogPortal from "@/components/ui/DialogPortal";
import { useAppContext } from "@/context/AppContext";
import { COLLECTIONS_API_READY, onPreviewChange, staffPayments } from "./collectionsApi";
import { REPORT_STATUS, methodLabel } from "./collectionsModel";
import "./collections.css";

const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(value) || 0);
const shortDate = (value) => value ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
const initials = (name = "") => name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("") || "?";
const TABS = [["submitted", "Por revisar"], ["approved", "Confirmados"], ["rejected", "Rechazados"]];

export const paymentReportsKey = (communityId) => ["payment-reports", communityId || "all"];

/** Comprobante: imagen a la vista o PDF incrustado, con enlace para abrirlo aparte. */
function Evidence({ evidence }) {
  if (!evidence?.url) return <div className="payment-evidence is-empty"><LuFileText/><p>Este reporte no trae comprobante.</p></div>;
  const isPdf = evidence.content_type === "application/pdf";
  return <div className="payment-evidence">
    {isPdf ? <object data={evidence.url} type="application/pdf" aria-label={`Comprobante ${evidence.filename}`}><p><LuFileText/> {evidence.filename}</p></object> : <img src={evidence.url} alt={`Comprobante ${evidence.filename}`}/>}
    <a href={evidence.url} target="_blank" rel="noreferrer" download={evidence.filename}>Abrir comprobante <LuArrowUpRight/></a>
  </div>;
}

export function ReviewDialog({ report, onClose, onReviewed }) {
  const { showToast } = useAppContext();
  const [amount, setAmount] = useState(String(report.amount));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const approve = useMutation({
    mutationFn: () => staffPayments.approve(report.id, { amount: Number(amount), paid_at: report.paid_on, method: report.method, reference: report.reference }),
    onSuccess: () => { showToast("Pago confirmado. Avisaremos al residente.", "success"); onReviewed(); },
  });
  const reject = useMutation({
    mutationFn: () => staffPayments.reject(report.id, reason.trim()),
    onSuccess: () => { showToast("Comprobante rechazado. El residente verá el motivo.", "success"); onReviewed(); },
  });
  const busy = approve.isPending || reject.isPending;
  const failure = approve.error || reject.error;
  const doApprove = () => { if (!(Number(amount) > 0)) { setError("Escribe el monto a aplicar."); return; } setError(""); approve.mutate(); };
  const doReject = () => { if (reason.trim().length < 5) { setError("Explica al residente por qué no se puede validar."); return; } setError(""); reject.mutate(); };

  return <DialogPortal className="payment-review-backdrop" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !busy) onClose(); }}>
    <section className="payment-review" role="dialog" aria-modal="true" aria-labelledby="payment-review-title">
      <header>
        <div><small>{report.property_label || "Unidad"} · reportado el {shortDate(report.created_at)}</small><h2 id="payment-review-title">Pago de {report.persona_name}</h2></div>
        <button type="button" className="payment-sheet-close" onClick={onClose} aria-label="Cerrar" disabled={busy}><LuX/></button>
      </header>
      <div className="payment-review-body">
        <Evidence evidence={report.evidence}/>
        <div className="payment-review-facts">
          <dl>
            <div><dt>Monto reportado</dt><dd>{money(report.amount, report.currency)}</dd></div>
            <div><dt>Fecha del pago</dt><dd>{shortDate(report.paid_on)}</dd></div>
            <div><dt>Método</dt><dd>{methodLabel(report.method)}</dd></div>
            <div><dt>Referencia</dt><dd>{report.reference || "Sin referencia"}</dd></div>
          </dl>
          {report.charges?.length ? <div className="payment-review-charges"><h3>Cargos que cubre</h3>{report.charges.map((charge) => <p key={charge.id}><span>{charge.concept}<small>Vence {shortDate(charge.due_date)}</small></span><b>{money(charge.amount, charge.currency)}</b></p>)}</div> : null}
          {report.note ? <blockquote>“{report.note}”</blockquote> : null}

          {report.status === "submitted" ? <>
            {rejecting ? <label className="payment-review-field"><span>Motivo del rechazo</span><textarea rows="3" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. El comprobante no muestra la fecha ni el folio."/></label>
              : <label className="payment-review-field"><span>Monto a aplicar</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}/><small>Si el comprobante dice otra cantidad, corrígela antes de confirmar.</small></label>}
            {error ? <p className="payment-sheet-error" role="alert">{error}</p> : null}
            {failure ? <p className="payment-sheet-alert" role="alert">{failure.response?.data?.error?.message || failure.message}</p> : null}
            <footer>
              {rejecting ? <><button type="button" onClick={() => { setRejecting(false); setError(""); }} disabled={busy}>Volver</button><button type="button" className="payment-review-reject" onClick={doReject} disabled={busy}>{reject.isPending ? "Guardando…" : "Rechazar comprobante"}</button></>
                : <><button type="button" className="payment-review-reject-link" onClick={() => setRejecting(true)} disabled={busy}><LuX/> Rechazar</button><button type="button" className="payment-sheet-primary" onClick={doApprove} disabled={busy}><LuCheck/> {approve.isPending ? "Confirmando…" : "Confirmar pago"}</button></>}
            </footer>
            {!COLLECTIONS_API_READY ? <p className="payment-sheet-fineprint">Vista previa: confirmar aquí todavía no registra el pago en el estado de cuenta.</p> : null}
          </> : <p className={`payment-review-outcome is-${report.status}`}>{REPORT_STATUS[report.status]?.label}{report.reviewed_at ? ` el ${shortDate(report.reviewed_at)}` : ""}{report.rejection_reason ? ` · ${report.rejection_reason}` : ""}</p>}
        </div>
      </div>
    </section>
  </DialogPortal>;
}

/** Bandeja de la administración para revisar los pagos que reportan los residentes. */
function PaymentReviewPanel({ community }) {
  const client = useQueryClient();
  const key = paymentReportsKey(COLLECTIONS_API_READY ? community?.id : null);
  const [tab, setTab] = useState("submitted");
  const [selected, setSelected] = useState(null);
  const query = useQuery({ queryKey: key, queryFn: () => staffPayments.list({ communityId: community?.id }), enabled: Boolean(community?.id) || !COLLECTIONS_API_READY });
  useEffect(() => (COLLECTIONS_API_READY ? undefined : onPreviewChange(() => client.invalidateQueries({ queryKey: ["payment-reports"] }))), [client]);
  const reports = query.data || [];
  const visible = reports.filter((report) => report.status === tab);
  const pending = reports.filter((report) => report.status === "submitted").length;

  return <section className="condo-module payment-review-panel" aria-label="Pagos reportados por residentes">
    <header>
      <div><span>Comprobantes de residentes</span><h2>Pagos por revisar {pending ? <i className="payment-count">{pending}</i> : null}</h2><p>Revisa el comprobante y confirma el pago o recházalo con un motivo. Nada se aplica al estado de cuenta hasta que lo confirmas.</p></div>
      {!COLLECTIONS_API_READY ? <em className="collections-preview-badge" title="Los reportes se guardan en este navegador hasta que properties-back publique los endpoints.">Vista previa</em> : null}
    </header>
    <nav className="condo-charge-filters" aria-label="Estado de los reportes">{TABS.map(([value, label]) => <button type="button" key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}{value === "submitted" && pending ? ` (${pending})` : ""}</button>)}</nav>
    {query.isLoading ? <p className="payment-review-empty" role="status">Cargando reportes…</p>
      : query.isError ? <p className="payment-sheet-alert" role="alert">No pudimos cargar los reportes. <button type="button" onClick={() => query.refetch()}>Reintentar</button></p>
      : visible.length ? <ul className="payment-review-list">{visible.map((report) => <li key={report.id}><button type="button" onClick={() => setSelected(report)} aria-label={`Revisar pago de ${report.persona_name} por ${money(report.amount, report.currency)}`}>
        <span className="payment-review-avatar">{initials(report.persona_name)}</span>
        <span className="payment-review-who"><strong>{report.persona_name}</strong><small>{report.property_label || "Unidad"} · {methodLabel(report.method)} · pagó el {shortDate(report.paid_on)}</small></span>
        <b>{money(report.amount, report.currency)}</b>
        <i className={`payment-status is-${REPORT_STATUS[report.status]?.tone}`}>{REPORT_STATUS[report.status]?.label}</i>
        {report.evidence?.url && report.evidence.content_type?.startsWith("image/") ? <img className="payment-review-thumb" src={report.evidence.url} alt=""/> : <span className="payment-review-thumb is-file"><LuFileText/></span>}
      </button></li>)}</ul>
      : <div className="payment-review-empty"><LuInbox/><p>{tab === "submitted" ? "No hay pagos por revisar. Cuando un residente reporte un pago aparecerá aquí." : "Todavía no hay reportes en esta lista."}</p></div>}
    {selected ? <ReviewDialog report={selected} onClose={() => setSelected(null)} onReviewed={() => { setSelected(null); client.invalidateQueries({ queryKey: ["payment-reports"] }); }}/> : null}
  </section>;
}

export default PaymentReviewPanel;
