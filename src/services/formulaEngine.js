/**
 * Motor de fórmulas (espejo del backend `app/services/formula_engine.py`).
 *
 * Evalúa expresiones aritméticas sobre variables nombradas libremente, SIN usar eval().
 * Se usa para el modo prueba de la calculadora y para previsualizar la mensualidad en el
 * modal de venta antes del round-trip. Debe coincidir con el resultado del backend.
 *
 * Soporta: + - * / % ^ (potencia), unario -, paréntesis, funciones
 * (min, max, abs, round, floor, ceil, sqrt, pow) y constantes (pi, e).
 */

/**
 * Redondeo "mitad al par" (banker's rounding) a `decimals` decimales — espejo de
 * `Decimal(str(x)).quantize(..., ROUND_HALF_EVEN)` del backend, y del `round()`
 * nativo de Python 3 (que ya redondea así por defecto — ver `formula_engine.py`).
 * `Math.round` de JS SIEMPRE redondea .5 hacia arriba (half-up); para valores
 * exactamente a la mitad de un centavo eso da un resultado DISTINTO al backend —
 * verificado con la propia fórmula de ejemplo de la calculadora: 1378.125 redondea
 * a $1,378.13 con Math.round pero a $1,378.12 con half-even, y no es un caso raro:
 * ~1 de cada 14 combinaciones de valores típicas de la calculadora cae en esa
 * divergencia. Se parte del string de `value` (igual que Python parte de `str(x)`)
 * para no meter error de punto flotante al escalar por 10**decimals.
 */
export function roundHalfEven(value, decimals = 2) {
  if (!Number.isFinite(value)) return value;
  const neg = value < 0;
  let str = Math.abs(value).toString();
  if (str.includes("e") || str.includes("E")) {
    str = Math.abs(value).toFixed(Math.max(decimals + 12, 20));
  }
  let [intPart, fracPart = ""] = str.split(".");
  fracPart = fracPart.padEnd(decimals + 1, "0");
  const kept = fracPart.slice(0, decimals);
  const nextDigit = fracPart.charCodeAt(decimals) - 48;
  const restNonZero = /[1-9]/.test(fracPart.slice(decimals + 1));

  const digits = (intPart + kept).split("").map(Number);
  let roundUp;
  if (nextDigit > 5 || (nextDigit === 5 && restNonZero)) roundUp = true;
  else if (nextDigit === 5) roundUp = digits[digits.length - 1] % 2 !== 0; // mitad al par
  else roundUp = false;

  if (roundUp) {
    let i = digits.length - 1;
    while (i >= 0) {
      digits[i]++;
      if (digits[i] === 10) { digits[i] = 0; i--; } else break;
    }
    if (i < 0) digits.unshift(1);
  }
  const digitsStr = digits.join("");
  const intLen = digitsStr.length - decimals;
  const resultInt = digitsStr.slice(0, intLen) || "0";
  const resultFrac = digitsStr.slice(intLen);
  const magnitude = decimals > 0 ? `${resultInt}.${resultFrac}` : resultInt;
  return (neg ? -1 : 1) * Number(magnitude);
}

const FUNCS = {
  min: Math.min, max: Math.max, abs: Math.abs,
  // round acepta ndigits opcional (paridad con el backend, cuyo round() de Python
  // ya es mitad-al-par por defecto).
  round: (x, ndigits = 0) => roundHalfEven(x, Math.trunc(ndigits)),
  floor: Math.floor, ceil: Math.ceil,
  sqrt: Math.sqrt, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

const OPS = {
  "+":  { prec: 2, assoc: "L", fn: (a, b) => a + b },
  "-":  { prec: 2, assoc: "L", fn: (a, b) => a - b },
  "*":  { prec: 3, assoc: "L", fn: (a, b) => a * b },
  "/":  { prec: 3, assoc: "L", fn: (a, b) => a / b },
  // Módulo con el signo del DIVISOR, como Python — no el de JS, que toma el del
  // dividendo. `-7 % 3` da 2 en el backend y daba -1 acá.
  "%":  { prec: 3, assoc: "L", fn: (a, b) => ((a % b) + b) % b },
  // División entera: el backend acepta `//` (ast.FloorDiv) y acá ni siquiera
  // tokenizaba. Redondea hacia abajo, también como Python: -7 // 2 = -4.
  "//": { prec: 3, assoc: "L", fn: (a, b) => Math.floor(a / b) },
  "^":  { prec: 4, assoc: "R", fn: (a, b) => a ** b },
};

// El menos unario liga MÁS flojo que la potencia y más fuerte que * / % //,
// igual que en Python: `-2^2` es -(2^2) = -4, no (-2)^2 = 4. Antes el unario se
// volcaba a la salida antes de apilar cualquier operador, así que se aplicaba
// primero y el front mostraba una mensualidad distinta a la que guardaba el
// backend. El 3.5 es a propósito: cae entre `*` (3) y `^` (4).
const PREC_UNARIO = 3.5;

// Mismo tope que el backend (`_MAX_FORMULA_LEN`), para que una fórmula
// demasiado larga falle acá y no al guardar.
const MAX_LARGO = 1000;

export class FormulaError extends Error {}

function tokenize(formula) {
  const src = String(formula).replace(/\*\*/g, "^");
  if (src.length > MAX_LARGO) throw new FormulaError("La fórmula es demasiado larga");
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      if ((num.match(/\./g) || []).length > 1) throw new FormulaError("Número inválido");
      // Notación científica: `1e3`, `1.5e-4`. El AST de Python la entiende y acá
      // el `e` se iba como nombre de variable, así que `1e3` reventaba con
      // "falta el valor de la variable «e3»". Solo se consume el exponente si de
      // verdad hay dígitos detrás; si no, la `e` sigue siendo la constante.
      const exp = /^[eE][+-]?\d+/.exec(src.slice(i));
      if (exp) { num += exp[0]; i += exp[0].length; }
      tokens.push({ type: "num", value: parseFloat(num) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let name = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) name += src[i++];
      tokens.push({ type: "name", value: name });
      continue;
    }
    if (c === "(" || c === ")" || c === ",") { tokens.push({ type: c }); i++; continue; }
    // Los de dos caracteres primero, o `//` se leería como dos divisiones.
    const dos = src.slice(i, i + 2);
    if (OPS[dos]) { tokens.push({ type: "op", value: dos }); i += 2; continue; }
    if (OPS[c]) { tokens.push({ type: "op", value: c }); i++; continue; }
    throw new FormulaError(`Carácter no permitido: «${c}»`);
  }
  return tokens;
}

/** Devuelve los nombres de variable (excluye funciones y constantes), en orden de aparición. */
export function extractVariables(formula) {
  if (!formula || !formula.trim()) return [];
  let tokens;
  try { tokens = tokenize(formula); } catch { return []; }
  const seen = [];
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type !== "name") continue;
    const isFunc = tokens[k + 1]?.type === "(";
    if (isFunc || t.value in FUNCS || t.value in CONSTS) continue;
    if (!seen.includes(t.value)) seen.push(t.value);
  }
  return seen;
}

/** Convierte a RPN (shunting-yard) marcando llamadas a función. */
function toRPN(tokens) {
  const out = [];
  const stack = [];
  let prev = null;
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === "num") {
      out.push(t);
    } else if (t.type === "name") {
      // Función si va seguida de "("; argc arranca en 1 y crece con cada coma.
      if (tokens[k + 1]?.type === "(") stack.push({ type: "func", value: t.value, argc: 1 });
      else out.push(t);
    } else if (t.type === ",") {
      while (stack.length && stack[stack.length - 1].type !== "(") out.push(stack.pop());
      if (!stack.length) throw new FormulaError("Coma fuera de una función");
      const fn = stack[stack.length - 2];
      if (!fn || fn.type !== "func") throw new FormulaError("Coma fuera de una función");
      fn.argc += 1;
    } else if (t.type === "op") {
      // Unario: - o + al inicio o tras otro operador/paréntesis/coma.
      const unary = (t.value === "-" || t.value === "+") &&
        (prev === null || prev.type === "op" || prev.type === "(" || prev.type === ",");
      if (unary) {
        if (t.value === "-") stack.push({ type: "uminus" });
        // unario + es no-op
      } else {
        const o1 = OPS[t.value];
        while (stack.length) {
          const top = stack[stack.length - 1];
          // El unario ya no se vuelca siempre: compite por precedencia como
          // cualquier operador, que es lo que hace que `-2^2` dé -4 y no 4.
          const o2 = top.type === "uminus" ? { prec: PREC_UNARIO }
                   : top.type === "op"     ? OPS[top.value]
                   : null;
          if (!o2) break;
          if ((o1.assoc === "L" && o1.prec <= o2.prec) || (o1.assoc === "R" && o1.prec < o2.prec)) {
            out.push(stack.pop());
          } else break;
        }
        stack.push(t);
      }
    } else if (t.type === "(") {
      stack.push(t);
    } else if (t.type === ")") {
      while (stack.length && stack[stack.length - 1].type !== "(") out.push(stack.pop());
      if (!stack.length) throw new FormulaError("Paréntesis desbalanceados");
      stack.pop(); // descarta "("
      if (stack.length && stack[stack.length - 1].type === "func") out.push(stack.pop());
    }
    prev = t;
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.type === "(") throw new FormulaError("Paréntesis desbalanceados");
    out.push(top);
  }
  return out;
}

function evalRPN(rpn, variables) {
  const st = [];
  for (const t of rpn) {
    if (t.type === "num") {
      st.push(t.value);
    } else if (t.type === "name") {
      if (t.value in CONSTS) { st.push(CONSTS[t.value]); continue; }
      const v = variables?.[t.value];
      if (v === undefined || v === null || v === "" || isNaN(Number(v)))
        throw new FormulaError(`Falta el valor de la variable «${t.value}»`);
      st.push(Number(v));
    } else if (t.type === "uminus") {
      if (!st.length) throw new FormulaError("Fórmula inválida");
      st.push(-st.pop());
    } else if (t.type === "op") {
      if (st.length < 2) throw new FormulaError("Fórmula inválida");
      const b = st.pop(), a = st.pop();
      // El backend frena truediv, mod Y floordiv contra cero (OT-CALC-1003).
      if ((t.value === "/" || t.value === "%" || t.value === "//") && b === 0) {
        throw new FormulaError("División por cero");
      }
      st.push(OPS[t.value].fn(a, b));
    } else if (t.type === "func") {
      const fn = FUNCS[t.value];
      const n = t.argc ?? 1;   // aridad real, contada en el shunting-yard
      if (st.length < n) throw new FormulaError("Fórmula inválida");
      const args = st.splice(st.length - n, n);
      st.push(fn(...args));
    }
  }
  if (st.length !== 1) throw new FormulaError("Fórmula inválida");
  return st[0];
}

/** Evalúa la fórmula con los valores dados; devuelve un Number redondeado a 2 decimales. */
export function evaluate(formula, variables = {}) {
  const rpn = toRPN(tokenize(formula));
  const result = evalRPN(rpn, variables);
  if (!Number.isFinite(result)) throw new FormulaError("La fórmula produce un resultado no válido");
  return roundHalfEven(result, 2);
}

const r2 = (n) => roundHalfEven(n, 2);

/**
 * Tabla de amortización plana (espejo de `build_flat_schedule` del backend).
 * Misma cuota cada mes, capital lineal e interés = cuota − capital; el último mes
 * absorbe el redondeo para que el saldo llegue exactamente a 0.
 */
export function buildFlatSchedule(monthlyPayment, principal, months) {
  const m = r2(Number(monthlyPayment) || 0);
  const p = r2(Number(principal) || 0);
  const n = Math.max(1, Math.floor(Number(months) || 0));
  const capitalPm = r2(p / n);
  const rows = [];
  let balance = p;
  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const capital = isLast ? r2(balance) : capitalPm;
    const interest = r2(m - capital);
    const payment = r2(capital + interest);
    const ending = r2(balance - capital);
    rows.push({ cuota: i, balance: r2(balance), capital, interest, payment, ending });
    balance = ending;
  }
  const totalPaid = r2(rows.reduce((s, r) => s + r.payment, 0));
  return { rows, monthlyPayment: m, totalPaid, totalInterest: r2(totalPaid - p) };
}
