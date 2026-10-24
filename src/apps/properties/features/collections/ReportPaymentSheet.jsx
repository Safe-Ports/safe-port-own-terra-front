import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LuCircleCheck, LuFileText, LuUpload, LuX } from "react-icons/lu";
import DialogPortal from "@/components/ui/DialogPortal";
import { COLLECTIONS_API_READY, portalPayments } from "./collectionsApi";
import { EVIDENCE_TYPES, PAYMENT_METHODS, outstanding, validateReport } from "./collectionsModel";
import "./collections.css";

const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(value) || 0);
const shortDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";
const today = () => new Date().toISOString().slice(0, 10);

/** El residente reporta un pago con su comprobante. No marca nada como pagado: queda "En revisión". */
function ReportPaymentSheet({ charges, initialChargeIds = [], context, onClose, onDone }) {
  const sumOf = (ids) => charges.filter((charge) => ids.includes(charge.id)).reduce((sum, charge) => sum + outstanding(charge), 0);
  const startIds = initialChargeIds.length ? initialChargeIds : charges.slice(0, 1).map((charge) => charge.id);
  const [draft, setDraft] = useState({ chargeIds: startIds, amount: sumOf(startIds).toFixed(2), paidOn: today(), method: "transfer", reference: "", note: "", file: null });
  const [errors, setErrors] = useState({});
  const [amountTouched, setAmountTouched] = useState(false);
  const input = useRef(null);
  const preview = useMemo(() => draft.file?.type.startsWith("image/") ? URL.createObjectURL(draft.file) : null, [draft.file]);
  const submit = useMutation({
    mutationFn: () => portalPayments.submit({ ...draft, amount: Number(draft.amount) }, { ...context, charges: charges.filter((charge) => draft.chargeIds.includes(charge.id)).map(({ id, concept, due_date, amount, currency }) => ({ id, concept, due_date, amount, currency })) }),
    onSuccess: () => onDone?.(),
  });

  const toggle = (id) => setDraft((current) => {
    const chargeIds = current.chargeIds.includes(id) ? current.chargeIds.filter((item) => item !== id) : [...current.chargeIds, id];
    return { ...current, chargeIds, amount: amountTouched ? current.amount : sumOf(chargeIds).toFixed(2) };
  });
  const send = (event) => {
    event.preventDefault();
    const found = validateReport(draft);
    setErrors(found);
    if (!Object.keys(found).length) submit.mutate();
  };

  return <DialogPortal className="payment-sheet-backdrop" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !submit.isPending) onClose(); }}>
    <section className="payment-sheet" role="dialog" aria-modal="true" aria-labelledby="payment-sheet-title">
      <header>
        <div><small>Estado de cuenta</small><h2 id="payment-sheet-title">{submit.isSuccess ? "Recibimos tu comprobante" : "Reportar un pago"}</h2></div>
        <button type="button" className="payment-sheet-close" onClick={onClose} aria-label="Cerrar" disabled={submit.isPending}><LuX/></button>
      </header>

      {submit.isSuccess ? <div className="payment-sheet-done" role="status">
        <LuCircleCheck/>
        <p>La administración revisará tu pago de <strong>{money(draft.amount)}</strong>. Te avisaremos cuando quede confirmado.</p>
        <button type="button" className="payment-sheet-primary" onClick={onClose}>Listo</button>
      </div> : <form onSubmit={send} noValidate aria-busy={submit.isPending}>
        <fieldset className="payment-sheet-charges">
          <legend>¿Qué estás pagando?</legend>
          {charges.map((charge) => <label key={charge.id} className={draft.chargeIds.includes(charge.id) ? "active" : ""}>
            <input type="checkbox" checked={draft.chargeIds.includes(charge.id)} onChange={() => toggle(charge.id)}/>
            <span><strong>{charge.concept}</strong><small>Vence {shortDate(charge.due_date)}</small></span>
            <b>{money(outstanding(charge), charge.currency)}</b>
          </label>)}
          {errors.chargeIds ? <p className="payment-sheet-error">{errors.chargeIds}</p> : null}
        </fieldset>

        <div className="payment-sheet-grid">
          <label><span>Monto pagado</span><input inputMode="decimal" value={draft.amount} onChange={(event) => { setAmountTouched(true); setDraft({ ...draft, amount: event.target.value.replace(/[^\d.]/g, "") }); }} aria-invalid={Boolean(errors.amount)}/>{errors.amount ? <em className="payment-sheet-error">{errors.amount}</em> : null}</label>
          <label><span>Fecha del pago</span><input type="date" max={today()} value={draft.paidOn} onChange={(event) => setDraft({ ...draft, paidOn: event.target.value })} aria-invalid={Boolean(errors.paidOn)}/>{errors.paidOn ? <em className="payment-sheet-error">{errors.paidOn}</em> : null}</label>
          <label><span>¿Cómo pagaste?</span><select value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })}>{PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Referencia o folio <small>Opcional</small></span><input value={draft.reference} maxLength={100} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} placeholder="Ej. 0045821"/></label>
        </div>

        <div className={`payment-sheet-file ${errors.file ? "has-error" : ""}`}>
          <span>Comprobante</span>
          {draft.file ? <div className="payment-sheet-file-chosen">
            {preview ? <img src={preview} alt="Vista previa del comprobante"/> : <LuFileText/>}
            <span><strong>{draft.file.name}</strong><small>{(draft.file.size / 1024 / 1024).toFixed(1)} MB</small></span>
            <button type="button" onClick={() => input.current?.click()}>Cambiar</button>
          </div> : <button type="button" className="payment-sheet-drop" onClick={() => input.current?.click()}><LuUpload/><strong>Sube la foto o PDF de tu comprobante</strong><small>JPG, PNG, WEBP, HEIC o PDF · máx. {COLLECTIONS_API_READY ? "10" : "2"} MB</small></button>}
          <input ref={input} type="file" accept={EVIDENCE_TYPES.join(",")} hidden data-testid="payment-evidence-input" onChange={(event) => { const file = event.target.files?.[0]; if (file) setDraft({ ...draft, file }); event.target.value = ""; }}/>
          {errors.file ? <em className="payment-sheet-error">{errors.file}</em> : null}
        </div>

        <label className="payment-sheet-note"><span>Nota para la administración <small>Opcional</small></span><textarea rows="2" maxLength={300} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })}/></label>

        {submit.isError ? <p className="payment-sheet-alert" role="alert">{submit.error?.response?.data?.error?.message || submit.error?.message || "No pudimos enviar tu comprobante. Intenta de nuevo."}</p> : null}
        <footer>
          <button type="button" onClick={onClose} disabled={submit.isPending}>Cancelar</button>
          <button type="submit" className="payment-sheet-primary" disabled={submit.isPending}>{submit.isPending ? "Enviando…" : "Enviar comprobante"}</button>
        </footer>
        <p className="payment-sheet-fineprint">Tu pago quedará <strong>en revisión</strong> hasta que la administración confirme el comprobante.</p>
      </form>}
    </section>
  </DialogPortal>;
}

export default ReportPaymentSheet;
