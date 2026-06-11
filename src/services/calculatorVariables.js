const normalize = (name) => name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

export function calculatorVariableValue(name, terms) {
  const amount = Number(terms.amount || 0);
  const downPayment = Number(terms.downPayment || 0);
  const annualRate = Number(terms.annualRate || 0);
  const months = Number(terms.months || 0);
  const financed = amount - downPayment;

  const values = {
    amount,
    total: amount,
    precio: amount,
    precio_lote: amount,
    precio_total: amount,
    down_payment: downPayment,
    enganche: downPayment,
    principal: financed,
    financed,
    financiamiento: financed,
    months,
    plazo: months,
    plazo_meses: months,
    annual_rate: annualRate,
    interest_rate: annualRate,
    tasa_anual: annualRate * 100,
    monthly_rate: annualRate / 12,
    tasa_mensual: annualRate * 100 / 12,
  };

  const key = normalize(name);
  return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
}

export function buildCalculatorVariables(calculator, terms, customValues = {}) {
  return Object.fromEntries((calculator?.variables || []).map((name) => {
    const standardValue = calculatorVariableValue(name, terms);
    return [name, standardValue ?? customValues[name] ?? ""];
  }));
}

export function numericCalculatorVariables(variables) {
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([, value]) => value !== "" && value != null)
      .map(([name, value]) => [name, Number(value)])
  );
}
