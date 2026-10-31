import { useEffect, useMemo, useState } from "react";
import AmountInput from "@/components/forms/AmountInput";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiArrowRight, HiBanknotes, HiCheckCircle, HiDocumentMagnifyingGlass, HiPlus } from "react-icons/hi2";
import WorkflowForm from "@/components/forms/WorkflowForm";
import Modal from "@/components/ui/Modal";
import useConfirmation from "@/hooks/useConfirmation";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { COLLECTIONS_API_READY, onPreviewChange, staffPayments } from "../collections/collectionsApi";
import { ReviewDialog, paymentReportsKey } from "../collections/PaymentReviewPanel";
import { unitAccount } from "./unitAccountModel";

const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const shortDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { day:"numeric", month:"short" }) : "";
const STATE = { reported:["Por revisar", "warn"], overdue:["Vencido", "danger"], partial:["Pago parcial", "warn"], pending:["Pendiente", "muted"], paid:["Pagado", "ok"], waived:["Condonado", "muted"] };
const failure = (error) => error?.response?.data?.error?.message || error?.message || "No pudimos completar la acción.";

/* Cuenta de la unidad: aquí se mueve el dinero. Cobrar, revisar el comprobante
   que subió el residente, condonar o generar un cargo se hace desde la ficha,
   sin ir a buscar la unidad en la tabla de toda la comunidad. */
function UnitAccountCard({ unit, community, canWrite = false, hasPayer = false, onOpenCommunityCharges }) {
  const data = usePropertiesData();
  const { showToast } = useAppContext();
  const queryClient = useQueryClient();
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const reportsKey = paymentReportsKey(COLLECTIONS_API_READY ? community?.id : null);
  const reportsQuery = useQuery({ queryKey: reportsKey, queryFn: () => staffPayments.list({ communityId: community?.id }), enabled: Boolean(community?.id) });
  useEffect(() => (COLLECTIONS_API_READY ? undefined : onPreviewChange(() => queryClient.invalidateQueries({ queryKey: ["payment-reports"] }))), [queryClient]);
  const account = useMemo(() => unitAccount({ charges: data.condoCharges, reports: reportsQuery.data || [], unitId: unit.id }), [data.condoCharges, reportsQuery.data, unit.id]);

  const [busy, setBusy] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [waiving, setWaiving] = useState(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [charging, setCharging] = useState(false);
  const [draft, setDraft] = useState({ concept:"", amount:"", dueDate:"" });

  const settle = async (row) => {
    if (busy || !await requestConfirmation(`Se registra un pago de ${money(row.due)} por "${row.concept}" en ${unit.identifier} y el cargo queda saldado.`, { title: "¿Registrar el pago?", confirmLabel: "Registrar pago" })) return;
    setBusy(row.id);
    try { await data.markCondoChargePaid(row.id); showToast(`Pago de ${row.concept} registrado`, "success"); }
    catch (error) { showToast(failure(error), "warning"); }
    finally { setBusy(""); }
  };
  const waive = async (event) => {
    event.preventDefault();
    if (!waiveReason.trim() || busy) return;
    setBusy(waiving.id);
    try { await data.waiveCondoCharge(waiving.id, waiveReason.trim()); showToast(`${waiving.concept} condonado`, "success"); setWaiving(null); setWaiveReason(""); }
    catch (error) { showToast(failure(error), "warning"); }
    finally { setBusy(""); }
  };
  const createCharge = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy("new");
    try { await data.addCondoCharge({ ...draft, unitId: unit.id, communityId: community?.id }); showToast(`Cargo generado para ${unit.identifier}`, "success"); setCharging(false); setDraft({ concept:"", amount:"", dueDate:"" }); }
    catch (error) { showToast(failure(error), "warning"); }
    finally { setBusy(""); }
  };
  const reviewed = () => { setReviewing(null); queryClient.invalidateQueries({ queryKey: ["payment-reports"] }); data.retryProperties?.(); };

  return <section id="unit-account" className="unit-page-card unit-account" aria-label={`Cuenta de ${unit.identifier}`}>
    <header>
      <h3>Cuenta de la unidad</h3>
      {canWrite ? <button type="button" className="unit-account-new" onClick={() => setCharging(true)} disabled={!hasPayer} title={hasPayer ? undefined : "Asigna primero un responsable de pago"}><HiPlus/> Nuevo cargo</button> : null}
    </header>
    <div className="unit-account-totals">
      <div className={account.pending ? "is-due" : "is-ok"}><small>Saldo pendiente</small><strong>{money(account.pending)}</strong></div>
      <div className={account.overdue ? "is-danger" : ""}><small>Vencido</small><strong>{money(account.overdue)}</strong></div>
      <div className={account.toReview ? "is-warn" : ""}><small>Por revisar</small><strong>{account.toReview}</strong></div>
    </div>
    {account.rows.length ? <ul className="unit-account-list">
      {account.rows.map((row) => {
        const [label, tone] = STATE[row.state] || [row.state, "muted"];
        return <li key={row.id}>
          <span className="unit-account-concept"><strong>{row.concept}</strong><small>{row.dueDate ? `Vence ${shortDate(row.dueDate)}` : "Sin vencimiento"}{row.open && row.due !== row.amount ? ` · de ${money(row.amount)}` : ""}</small></span>
          <span className={`unit-account-pill tone-${tone}`}>{label}</span>
          <strong className="unit-account-amount">{money(row.open ? row.due : row.amount)}</strong>
          <span className="unit-account-actions">
            {row.state === "reported" && canWrite ? <button type="button" className="is-primary" onClick={() => setReviewing(row.report)}><HiDocumentMagnifyingGlass/> Revisar comprobante</button> : null}
            {row.open && row.state !== "reported" && canWrite ? <button type="button" className="is-primary" onClick={() => settle(row)} disabled={busy === row.id}><HiBanknotes/> {busy === row.id ? "Registrando…" : "Registrar pago"}</button> : null}
            {row.open && canWrite && data.waiveCondoCharge ? <button type="button" onClick={() => setWaiving(row)}>Condonar</button> : null}
            {!row.open && row.status === "paid" ? <i className="unit-account-done"><HiCheckCircle/> Cobrado</i> : null}
          </span>
        </li>;
      })}
    </ul> : <p className="unit-account-empty">{hasPayer ? "Esta unidad no tiene cargos todavía." : "Sin cargos. Para cobrarle a la unidad, agrega primero a la persona responsable de pago."}</p>}
    <footer>
      {account.hiddenSettled ? <small>{account.hiddenSettled} cargo{account.hiddenSettled === 1 ? "" : "s"} cobrado{account.hiddenSettled === 1 ? "" : "s"} más en el historial</small> : <span/>}
      {onOpenCommunityCharges ? <button type="button" className="unit-service-link" onClick={onOpenCommunityCharges}>Cobranza de {community?.name || "la comunidad"} <HiArrowRight/></button> : null}
    </footer>

    {reviewing ? <ReviewDialog report={reviewing} onClose={() => setReviewing(null)} onReviewed={reviewed}/> : null}
    <Modal open={charging} onClose={() => setCharging(false)} title={`Nuevo cargo para ${unit.identifier}`} subtitle={community?.name} icon={<HiPlus/>} width="max-w-[520px]" footer={<><button type="button" onClick={() => setCharging(false)}>Cancelar</button><button type="submit" form="unit-charge-form" disabled={busy === "new"}>{busy === "new" ? "Generando…" : "Generar cargo"}</button></>}>
      <WorkflowForm id="unit-charge-form" className="properties-form" onSubmit={createCharge}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Concepto</span><input required value={draft.concept} onChange={(event) => setDraft({ ...draft, concept: event.target.value })} placeholder="Cuota de mantenimiento, multa, reparación…" autoFocus/></label>
          <label><span>Importe</span><AmountInput required min="1" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })}/></label>
          <label><span>Vencimiento</span><input required type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}/></label>
        </div></section>
        <p className="condo-penalty-note">Se le carga a quien sea responsable de pago de {unit.identifier}.</p>
      </WorkflowForm>
    </Modal>
    <Modal open={Boolean(waiving)} onClose={() => setWaiving(null)} title={`Condonar ${waiving?.concept || "cargo"}`} subtitle={`${unit.identifier} · ${money(waiving?.due)}`} icon={<HiBanknotes/>} width="max-w-[480px]" footer={<><button type="button" onClick={() => setWaiving(null)}>Cancelar</button><button type="submit" form="unit-waive-form" disabled={!waiveReason.trim() || Boolean(busy)}>Condonar</button></>}>
      <WorkflowForm id="unit-waive-form" className="properties-form" onSubmit={waive}>
        <section className="properties-form-section"><label className="properties-form-wide"><span>Motivo</span><textarea required rows="3" value={waiveReason} onChange={(event) => setWaiveReason(event.target.value)} placeholder="Queda en el historial de la unidad"/></label></section>
      </WorkflowForm>
    </Modal>
    {confirmationDialog}
  </section>;
}

export default UnitAccountCard;
