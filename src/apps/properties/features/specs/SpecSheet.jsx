import { HiCheck } from "react-icons/hi2";
import "./spec-sheet.css";

/** Ficha técnica de sólo lectura: datos, características y descripción.
 *  La usan el panel del administrador y el portal de residentes. */
function SpecSheet({ facts = [], features = [], description = "", emptyText = "Sin ficha técnica registrada.", label = "Ficha técnica" }) {
  if (!facts.length && !features.length && !description) return <p className="spec-sheet-empty">{emptyText}</p>;
  return <div className="spec-sheet" role="group" aria-label={label}>
    {facts.length ? <dl>{facts.map((fact) => <div key={fact.key}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
    {features.length ? <ul>{features.map((feature) => <li key={feature}><HiCheck aria-hidden="true" />{feature}</li>)}</ul> : null}
    {description ? <p>{description}</p> : null}
  </div>;
}

export default SpecSheet;
