import { useRef, useState } from "react";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import "./workflow-form.css";

function fieldName(control) {
  const label = control.labels?.[0]?.cloneNode(true);
  label?.querySelectorAll("input, select, textarea, button, small, .field-error").forEach(node => node.remove());
  return label?.textContent?.trim() || control.getAttribute("aria-label") || control.placeholder || "Este campo";
}

/** Mantiene los contratos de cada pantalla y añade bloqueo de doble envío,
 * errores recuperables y validación inline a los formularios nativos. */
export default function WorkflowForm({ onSubmit, noValidate = false, busy = false, children, className = "", onInput, ...props }) {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState([]);
  const [apiError, setApiError] = useState(null);
  const submit = async event => {
    event.preventDefault();
    event.stopPropagation();
    if (lock.current || busy) return;
    const form = event.currentTarget;
    const invalid = [...form.elements].filter(control => !noValidate && control.willValidate && ((control.required && typeof control.value === "string" && !control.value.trim()) || (!noValidate && !control.validity.valid)));
    if (invalid.length) {
      setErrors(invalid.map(control => ({ control, label: fieldName(control), message: control.validity.valueMissing || (control.required && !control.value.trim()) ? "Completa este campo." : control.validity.typeMismatch ? "Revisa el formato del dato." : control.validity.rangeUnderflow ? `El mínimo es ${control.min}.` : control.validity.rangeOverflow ? `El máximo es ${control.max}.` : control.validity.stepMismatch ? "Revisa los decimales permitidos." : "Revisa el valor capturado." })));
      invalid[0].focus();
      return;
    }
    setErrors([]); setApiError(null); lock.current = true;
    try {
      const result = onSubmit?.(event);
      if (result && typeof result.then === "function") { setPending(true); await result; }
    } catch (error) { setApiError(parseApiError(error, "No se pudo guardar. Tus datos siguen en el formulario; puedes reintentar.")); }
    finally { lock.current = false; setPending(false); }
  };
  return <form {...props} className={`${className} workflow-form`.trim()} noValidate aria-busy={busy || pending} onSubmit={submit} onInput={event => { setErrors(previous => previous.filter(error => error.control !== event.target)); onInput?.(event); }}>
    {errors.length > 0 && <div className="workflow-form-errors" role="alert"><strong>Revisa estos datos para continuar</strong><ul>{errors.map((error, index) => <li key={index}><button type="button" onClick={() => error.control.focus()}>{error.label}: {error.message}</button></li>)}</ul></div>}
    {apiError && <InlineError error={apiError} />}
    {children}
  </form>;
}
