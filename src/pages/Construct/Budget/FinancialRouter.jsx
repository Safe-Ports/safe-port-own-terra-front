const MODES = [
  { value: "apu", title: "A.P.U.", desc: "Precio unitario calculado por matriz de insumos × rendimientos." },
  { value: "lump", title: "Precio alzado", desc: "Monto pactado y cerrado, sin desglose de insumos internos." },
  { value: "parametric", title: "Paramétrico", desc: "Precio por unidad configurable (indicador histórico)." },
];

/* Router Polimórfico — el PRD lo pide POR CADA fila de concepto, no un
   selector global (así estaba roto en el demo, con una sola fila hardcodeada). */
function FinancialRouter({ mode, canEdit, onSelect }) {
  return (
    <div className="obr-choice-grid">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          className={`obr-choice ${mode === m.value ? "selected" : ""}`}
          disabled={!canEdit}
          onClick={() => onSelect(m.value)}
        >
          <strong>{m.title}</strong>
          <span>{m.desc}</span>
        </button>
      ))}
    </div>
  );
}

export default FinancialRouter;
