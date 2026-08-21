/* Bypass Físico (Módulo 3 del PRD): volumen directo sin tabla, para
   presupuestación temprana sin planos. Se marca visualmente con ⚡ No Auditado
   — ausente en el demo, requerido explícitamente por el PRD. */
export function AuditBadge() {
  return <span className="obr-badge-audit" title="Cantidad capturada sin número generador">⚡ No auditado</span>;
}

function DirectPanel({ direct, unit, canEdit, onChange }) {
  const value = direct?.value ?? 0;
  const reason = direct?.reason ?? "";

  return (
    <div className="obr-direct-panel">
      <div className="obr-direct-value">
        <label className="obr-field">
          <span>Volumen total</span>
          <input
            type="number"
            value={value}
            disabled={!canEdit}
            onChange={(e) => onChange({ value: e.target.value === "" ? "" : Number(e.target.value), reason })}
          />
        </label>
        <div className="obr-direct-unit">{unit}</div>
      </div>
      <label className="obr-field">
        <span>Justificación</span>
        <textarea
          value={reason}
          disabled={!canEdit}
          onChange={(e) => onChange({ value, reason: e.target.value })}
          placeholder="Ej. Estimado de anteproyecto, sin planos ejecutivos todavía."
        />
      </label>
      <div className="obr-audit-note">
        <AuditBadge /> Esta cantidad no tiene número generador que la respalde. Aparecerá marcada en el listado de conceptos y en los reportes hasta que se sustituya por una medición auditable.
      </div>
    </div>
  );
}

export default DirectPanel;
