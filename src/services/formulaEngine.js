/**
 * Motor de fórmulas — espejo de `app/services/formula_engine.py`.
 *
 * Evalúa expresiones aritméticas sin usar eval(). Se usa para preview instantáneo
 * en la calculadora y el modal de contrato. Debe producir el mismo resultado que el backend.
 *
 * Soporta: + - * / % ^ (potencia), unario -, paréntesis, funciones
 * (min, max, abs, round, floor, ceil, sqrt, pow) y constantes (pi, e).
 */

const FUNCS = {
  min: Math.min, max: Math.max, abs: Math.abs,
  round: (x, ndigits = 0) => { const f = 10 ** Math.trunc(ndigits); return Math.round(x * f) / f; },
  floor: Math.floor, ceil: Math.ceil,
  sqrt: Math.sqrt, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

const OPS = {
  "+": { prec: 2, assoc: "L", fn: (a, b) => a + b },
  "-": { prec: 2, assoc: "L", fn: (a, b) => a - b },
  "*": { prec: 3, assoc: "L", fn: (a, b) => a * b },
  "/": { prec: 3, assoc: "L", fn: (a, b) => a / b },
  "%": { prec: 3, assoc: "L", fn: (a, b) => a % b },
  "^": { prec: 4, assoc: "R", fn: (a, b) => a ** b },
};

export class FormulaError extends Error {}

function tokenize(formula) {
  const src = String(formula).replace(/\*\*/g, "^");
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      if ((num.match(/\./g) || []).length > 1) throw new FormulaError("Número inválido");
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

function toRPN(tokens) {
  const out = [];
  const stack = [];
  let prev = null;
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === "num") {
      out.push(t);
    } else if (t.type === "name") {
      if (tokens[k + 1]?.type === "(") stack.push({ type: "func", value: t.value, argc: 1 });
      else out.push(t);
    } else if (t.type === ",") {
      while (stack.length && stack[stack.length - 1].type !== "(") out.push(stack.pop());
      if (!stack.length) throw new FormulaError("Coma fuera de una función");
      const fn = stack[stack.length - 2];
      if (!fn || fn.type !== "func") throw new FormulaError("Coma fuera de una función");
      fn.argc += 1;
    } else if (t.type === "op") {
      const unary = (t.value === "-" || t.value === "+") &&
        (prev === null || prev.type === "op" || prev.type === "(" || prev.type === ",");
      if (unary) {
        if (t.value === "-") stack.push({ type: "uminus" });
      } else {
        const o1 = OPS[t.value];
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === "uminus") { out.push(stack.pop()); continue; }
          if (top.type !== "op") break;
          const o2 = OPS[top.value];
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
      stack.pop();
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
      if ((t.value === "/" || t.value === "%") && b === 0) throw new FormulaError("División por cero");
      st.push(OPS[t.value].fn(a, b));
    } else if (t.type === "func") {
      const fn = FUNCS[t.value];
      const n = t.argc ?? 1;
      if (st.length < n) throw new FormulaError("Fórmula inválida");
      const args = st.splice(st.length - n, n);
      st.push(fn(...args));
    }
  }
  if (st.length !== 1) throw new FormulaError("Fórmula inválida");
  return st[0];
}

/** Evalúa la fórmula con los valores dados; devuelve Number redondeado a 2 decimales. */
export function evaluate(formula, variables = {}) {
  const rpn = toRPN(tokenize(formula));
  const result = evalRPN(rpn, variables);
  if (!Number.isFinite(result)) throw new FormulaError("La fórmula produce un resultado no válido");
  return Math.round(result * 100) / 100;
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Tabla de amortización plana — espejo de `build_flat_schedule` del backend.
 * Capital lineal, interés = cuota − capital; el último mes absorbe el redondeo.
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
