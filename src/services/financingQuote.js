import { evaluate } from "./formulaEngine";

export function guessVarValue(varName, form) {
  const k = varName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f_]/g, "");
  const amount = Number(form.amount) || 0;
  const down   = Number(form.down_payment) || 0;
  if (/(precio|monto|total|valor)/.test(k)) return amount;
  if (/(enganche|down|inicial|anticipo)/.test(k)) return down;
  if (/(tasa|interes|rate)/.test(k)) return (Number(form.interest_rate) || 0) * 100;
  if (/(plazo|mes|month|term)/.test(k)) return Number(form.totalM) || 0;
  if (/(principal|financ|saldo|capital)/.test(k)) return Math.max(0, amount - down);
  return "";
}

export function calculateQuote(calculator, form, overrides = {}) {
  if (!calculator?.formula || !calculator.variables?.length) return { value: null, variables: {}, error: "No hay un plan de financiamiento activo." };
  const variables = Object.fromEntries(calculator.variables.map(key => [key, overrides[key] ?? guessVarValue(key, form)]));
  const missing = Object.entries(variables).filter(([, value]) => value === "" || value == null).map(([key]) => key);
  if (missing.length) return { value: null, variables, missing, error: "Completa las variables adicionales del plan." };
  try { return { value: evaluate(calculator.formula, variables), variables, error: "" }; }
  catch (error) { return { value: null, variables, error: error.message }; }
}

// Mensualidad sin calculadora: la misma amortización francesa que usa el backend
// (app/shared/amortization.py) cuando el contrato llega sin calculator_id. Solo es
// una vista previa; el plan de pagos real lo genera el servidor.
export function standardMonthlyPayment({ amount, down_payment, interest_rate, totalM }) {
  const loan = (Number(amount) || 0) - (Number(down_payment) || 0);
  const months = Math.trunc(Number(totalM) || 0);
  const rate = Number(interest_rate) || 0;
  if (loan <= 0 || months < 1 || rate < 0) return null;
  if (rate === 0) return Math.round((loan / months) * 100) / 100;
  const r = rate / 12;
  const factor = (1 + r) ** months;
  return Math.round(((loan * r * factor) / (factor - 1)) * 100) / 100;
}
