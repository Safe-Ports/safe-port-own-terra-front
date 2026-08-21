import { HiBolt, HiCubeTransparent, HiTableCells } from "react-icons/hi2";

const TYPES = [
  { value: "generator", icon: HiTableCells, title: "Número generador", desc: "Cuadrícula auditable: Ref. plano, Eje, Tramo, Pzas, Largo, Ancho, Alto. La prueba pericial del volumen." },
  { value: "direct", icon: HiBolt, title: "Cantidad directa", desc: "Volumen total sin tabla, para presupuestación temprana sin planos. Queda marcado como ⚡ No auditado." },
  { value: "bim", icon: HiCubeTransparent, title: "Plano / BIM", desc: "Vincular una medición extraída de un modelo o plano digital." },
];

function ConceptTypeStep({ concept, onSelect }) {
  return (
    <div className="obr-step-card">
      <p className="obr-eyebrow">Nuevo concepto · {concept.code}</p>
      <h1>{concept.name}</h1>
      <p className="obr-muted">Elige cómo vas a justificar el volumen de este concepto.</p>
      <div className="obr-type-grid">
        {TYPES.map(({ value, icon: Icon, title, desc }) => (
          <button key={value} type="button" className="obr-type-option" onClick={() => onSelect(value)}>
            <span className="obr-type-icon"><Icon /></span>
            <strong>{title}</strong>
            <span>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ConceptTypeStep;
