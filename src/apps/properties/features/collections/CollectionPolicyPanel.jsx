import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuBell, LuCalendarClock, LuPercent } from "react-icons/lu";
import { useAppContext } from "@/context/AppContext";
import { COLLECTIONS_API_READY, collectionPolicy } from "./collectionsApi";
import { DEFAULT_POLICY, lateFeeExample, remindersSummary, validatePolicy } from "./collectionsModel";
import "./collections.css";

const BEFORE = [7, 3, 1];
const AFTER = [1, 3, 7, 15, 30];
const toggleIn = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b));

/** Recordatorios, recargos y generación automática de cuotas, por comunidad. */
function CollectionPolicyPanel({ community, canWrite = true }) {
  const { showToast } = useAppContext();
  const client = useQueryClient();
  const key = ["collection-policy", community?.id];
  const query = useQuery({ queryKey: key, queryFn: () => collectionPolicy.get(community.id), enabled: Boolean(community?.id) });
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [errors, setErrors] = useState({});
  useEffect(() => { if (query.data) setPolicy(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: () => collectionPolicy.save(community.id, policy),
    onSuccess: () => { client.invalidateQueries({ queryKey: key }); showToast("Reglas de cobranza guardadas", "success"); },
  });
  const set = (section, patch) => setPolicy((current) => ({ ...current, [section]: { ...current[section], ...patch } }));
  const submit = (event) => { event.preventDefault(); const found = validatePolicy(policy); setErrors(found); if (!Object.keys(found).length) save.mutate(); };
  const dirty = query.data && JSON.stringify(query.data) !== JSON.stringify(policy);
  if (!community) return null;

  return <section className="condo-module collection-policy" aria-label="Recordatorios y recargos">
    <header>
      <div><span>Reglas de cobranza</span><h2>Recordatorios y recargos</h2><p>Qué avisos reciben los residentes, cuándo se generan las cuotas y si hay recargo por atraso en {community.name}.</p></div>
      {!COLLECTIONS_API_READY ? <em className="collections-preview-badge" title="Se guarda en este navegador hasta que properties-back publique la política de cobranza.">Vista previa</em> : null}
    </header>
    {query.isLoading ? <p className="payment-review-empty" role="status">Cargando reglas…</p> : <form onSubmit={submit} className="collection-policy-grid">
      <fieldset disabled={!canWrite || save.isPending}>
        <legend><LuCalendarClock/> Cuotas del mes</legend>
        <label className="collection-switch"><input type="checkbox" checked={policy.auto_generate.enabled} onChange={(event) => set("auto_generate", { enabled: event.target.checked })}/><span><strong>Generar cuotas automáticamente</strong><small>Cada mes, con los planes de cuota activos de la comunidad.</small></span></label>
        {policy.auto_generate.enabled ? <label className="collection-inline">El día <input type="number" min="1" max="28" value={policy.auto_generate.day_of_month} onChange={(event) => set("auto_generate", { day_of_month: Number(event.target.value) })} aria-label="Día del mes"/> de cada mes</label> : <p className="collection-hint">Hoy las generas tú desde “Planes de cuota”.</p>}
        {errors.day_of_month ? <em className="payment-sheet-error">{errors.day_of_month}</em> : null}
      </fieldset>

      <fieldset disabled={!canWrite || save.isPending}>
        <legend><LuBell/> Recordatorios al residente</legend>
        <div className="collection-chips" role="group" aria-label="Días antes del vencimiento"><small>Antes de vencer</small>{BEFORE.map((day) => <button type="button" key={`b${day}`} aria-pressed={policy.reminders.before_days.includes(day)} onClick={() => set("reminders", { before_days: toggleIn(policy.reminders.before_days, day) })}>{day} {day === 1 ? "día" : "días"}</button>)}</div>
        <label className="collection-switch is-compact"><input type="checkbox" checked={policy.reminders.on_due_date} onChange={(event) => set("reminders", { on_due_date: event.target.checked })}/><span><strong>El día que vence</strong></span></label>
        <div className="collection-chips" role="group" aria-label="Días después del vencimiento"><small>Con atraso</small>{AFTER.map((day) => <button type="button" key={`a${day}`} aria-pressed={policy.reminders.after_days.includes(day)} onClick={() => set("reminders", { after_days: toggleIn(policy.reminders.after_days, day) })}>{day} {day === 1 ? "día" : "días"}</button>)}</div>
        <div className="collection-channels"><small>Por dónde</small>
          <label><input type="checkbox" checked={policy.channels.in_app} onChange={(event) => set("channels", { in_app: event.target.checked })}/> En el portal y la app</label>
          <label><input type="checkbox" checked={policy.channels.email} onChange={(event) => set("channels", { email: event.target.checked })}/> Correo</label>
          <label className="is-soon"><input type="checkbox" disabled/> Notificación push <em>Próximamente</em></label>
        </div>
        <p className="collection-summary">{remindersSummary(policy.reminders)}.</p>
        {errors.reminders ? <em className="payment-sheet-error">{errors.reminders}</em> : null}
      </fieldset>

      <fieldset disabled={!canWrite || save.isPending}>
        <legend><LuPercent/> Recargo por atraso</legend>
        <label className="collection-switch"><input type="checkbox" checked={policy.late_fee.enabled} onChange={(event) => set("late_fee", { enabled: event.target.checked })}/><span><strong>Cobrar recargo a cuotas vencidas</strong><small>Apagado por omisión. Usa la regla que marque el reglamento o la asamblea de la comunidad.</small></span></label>
        {policy.late_fee.enabled ? <div className="collection-fee">
          <div className="collection-segment" role="radiogroup" aria-label="Tipo de recargo">{[["fixed", "Monto fijo"], ["percent", "Porcentaje"]].map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={policy.late_fee.kind === value} onClick={() => set("late_fee", { kind: value })}>{label}</button>)}</div>
          <label><span>{policy.late_fee.kind === "percent" ? "Porcentaje de la cuota" : "Monto del recargo"}</span><input inputMode="decimal" value={policy.late_fee.value ?? ""} onChange={(event) => set("late_fee", { value: event.target.value === "" ? null : Number(event.target.value.replace(/[^\d.]/g, "")) })} aria-invalid={Boolean(errors.late_fee_value)}/>{errors.late_fee_value ? <em className="payment-sheet-error">{errors.late_fee_value}</em> : null}</label>
          <label><span>Días de gracia</span><input type="number" min="0" max="60" value={policy.late_fee.grace_days} onChange={(event) => set("late_fee", { grace_days: Number(event.target.value) })} aria-invalid={Boolean(errors.grace_days)}/>{errors.grace_days ? <em className="payment-sheet-error">{errors.grace_days}</em> : null}</label>
        </div> : null}
        <p className="collection-summary">{lateFeeExample(policy.late_fee)}{policy.late_fee.enabled ? " Puedes condonarlo desde el cargo." : ""}</p>
      </fieldset>

      {save.isError ? <p className="payment-sheet-alert" role="alert">{save.error?.response?.data?.error?.message || save.error?.message}</p> : null}
      {canWrite ? <footer><button type="button" onClick={() => { setPolicy(query.data || DEFAULT_POLICY); setErrors({}); }} disabled={!dirty || save.isPending}>Descartar cambios</button><button type="submit" className="payment-sheet-primary" disabled={!dirty || save.isPending}>{save.isPending ? "Guardando…" : "Guardar reglas"}</button></footer> : null}
    </form>}
  </section>;
}

export default CollectionPolicyPanel;
