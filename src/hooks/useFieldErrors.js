import { useState } from "react";
import { getFieldErrors } from "@/services/errors";

/**
 * Maneja la capa de **validación por campo** (rojo en el input + mensaje debajo).
 * Separada de los errores de catálogo OT-… (esos van a toast/InlineError).
 *
 * Uso típico en un form:
 *   const fe = useFieldErrors();
 *   // marcar input:  <input {...fe.fieldProps("email")} ... onChange={e => { setX(e.target.value); fe.clear("email"); }} />
 *   // mensaje:       <FieldError msg={fe.errors.email} />
 *   // al enviar:     if (!fe.validate(form, RULES)) return;
 *   // en catch:      if (!fe.fromServer(err, FIELD_MAP)) showError(err, "...");  // si no eran de campo
 */
export function useFieldErrors(initial = {}) {
  const [errors, setErrors] = useState(initial);

  const clear = (key) =>
    setErrors((p) => {
      if (!p[key]) return p;
      const next = { ...p };
      delete next[key];
      return next;
    });

  const clearAll = () => setErrors({});

  /** Props para el input: agrega `is-invalid` (borde rojo) al base ("fi", "lf-input", …). */
  const fieldProps = (key, base = "fi") => ({
    className: errors[key] ? `${base} is-invalid` : base,
    "aria-invalid": errors[key] ? true : undefined,
  });

  /**
   * Valida en cliente con un objeto de reglas { campo: (valor, form) => mensaje|"" }.
   * Setea los errores y devuelve true si todo es válido.
   */
  const validate = (form, rules) => {
    const next = {};
    for (const [key, rule] of Object.entries(rules)) {
      const msg = rule(form?.[key], form);
      if (msg) next[key] = msg;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * Mapea un error 422 del backend a errores por campo (vía getFieldErrors).
   * @returns true si eran errores de campo (ya marcados); false si NO (el caller debe
   *          mostrar el error de catálogo homologado con showError).
   */
  const fromServer = (err, fieldMap = {}) => {
    const fieldErrs = getFieldErrors(err, fieldMap);
    if (fieldErrs && Object.keys(fieldErrs).length) {
      setErrors(fieldErrs);
      return true;
    }
    return false;
  };

  return { errors, setErrors, clear, clearAll, fieldProps, validate, fromServer };
}

export default useFieldErrors;
