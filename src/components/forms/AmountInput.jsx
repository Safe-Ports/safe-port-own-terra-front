import { forwardRef, useLayoutEffect, useRef } from "react";

/**
 * Campo de cantidad con separadores de miles mientras se escribe: "1250000.5"
 * se ve como "1,250,000.5". Sin las comas era difícil distinguir 100,000 de
 * 1,000,000 al capturar un precio.
 *
 * Es un reemplazo directo de `<input type="number">`: recibe y entrega el número
 * limpio en `event.target.value` (sin comas, punto decimal), así que los
 * `onChange` y validaciones de cada formulario no cambian. Solo para importes,
 * precios y superficies; las cantidades chicas (recámaras, días, entradas)
 * siguen con el campo numérico normal.
 */

export function cleanAmount(text, decimals = 2) {
  const raw = String(text ?? "").replace(/[^\d.]/g, "");
  const dot = raw.indexOf(".");
  if (dot === -1) return raw.replace(/^0+(?=\d)/, "");
  const whole = raw.slice(0, dot).replace(/^0+(?=\d)/, "");
  const fraction = raw.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
  return decimals > 0 ? `${whole || "0"}.${fraction}` : whole;
}

export function formatAmount(value, decimals = 2) {
  const clean = cleanAmount(value, decimals);
  if (!clean) return "";
  const [whole, fraction] = clean.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

// Cuántos caracteres "con significado" (dígitos y punto) hay antes del cursor:
// es lo que se conserva al reformatear, para que el cursor no salte al final.
const meaningfulBefore = (text, caret) => text.slice(0, caret).replace(/[^\d.]/g, "").length;

function caretFor(text, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/[\d.]/.test(text[i])) seen += 1;
    if (seen === count) return i + 1;
  }
  return text.length;
}

const AmountInput = forwardRef(function AmountInput(
  // `type`, `step`, `min` y `max` vienen de cuando era type="number": se
  // descartan porque en un campo de texto no aplican.
  // eslint-disable-next-line no-unused-vars
  { value, onChange, decimals = 2, type, step, min, max, ...rest },
  forwardedRef,
) {
  const inner = useRef(null);
  const pendingCaret = useRef(null);
  const display = formatAmount(value, decimals);

  useLayoutEffect(() => {
    const input = inner.current;
    if (pendingCaret.current === null || !input || document.activeElement !== input) return;
    const position = caretFor(input.value, pendingCaret.current);
    pendingCaret.current = null;
    input.setSelectionRange(position, position);
  });

  const setRef = (node) => {
    inner.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handleChange = (event) => {
    const input = event.target;
    pendingCaret.current = meaningfulBefore(input.value, input.selectionStart ?? input.value.length);
    const clean = cleanAmount(input.value, decimals);
    const target = { value: clean, name: input.name, id: input.id, type: "text" };
    onChange?.({ ...event, target, currentTarget: target, nativeEvent: event.nativeEvent, preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() });
  };

  return <input {...rest} ref={setRef} type="text" inputMode={decimals > 0 ? "decimal" : "numeric"} autoComplete="off" value={display} onChange={handleChange} />;
});

export default AmountInput;
