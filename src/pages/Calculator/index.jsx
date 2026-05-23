import { useState } from "react";
import { currency } from "@/services/formatters";

function buildSchedule(total, downPayment, rate, months) {
  const principal = Math.max(0, total - downPayment);
  const monthlyRate = rate / 100 / 12;
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * (monthlyRate * (1 + monthlyRate) ** months)) / ((1 + monthlyRate) ** months - 1);

  const rows = [];
  let balance = principal;

  for (let index = 1; index <= months; index += 1) {
    const interest = balance * monthlyRate;
    const capital = payment - interest;
    const ending = Math.max(0, balance - capital);
    rows.push({
      cuota: index,
      balance,
      capital,
      interest,
      payment,
      ending
    });
    balance = ending;
  }

  return { payment, rows };
}

function CalculatorPage() {
  const [form, setForm] = useState({
    total: 500000,
    downPayment: 100000,
    rate: 12,
    months: 96
  });

  const { payment, rows } = buildSchedule(form.total, form.downPayment, form.rate, form.months);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🧮 Calculadora de Intereses y Amortización</div>
        </div>
        <div className="card-body space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="fg">
              <label className="fl">Monto Total ($)</label>
              <input className="fi" type="number" value={form.total} onChange={(event) => setForm((prev) => ({ ...prev, total: Number(event.target.value) }))} />
            </div>
            <div className="fg">
              <label className="fl">Enganche ($)</label>
              <input className="fi" type="number" value={form.downPayment} onChange={(event) => setForm((prev) => ({ ...prev, downPayment: Number(event.target.value) }))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="fg">
              <label className="fl">Tasa de Interés Anual (%)</label>
              <input className="fi" type="number" value={form.rate} step="0.5" onChange={(event) => setForm((prev) => ({ ...prev, rate: Number(event.target.value) }))} />
            </div>
            <div className="fg">
              <label className="fl">Plazo (meses)</label>
              <input className="fi" type="number" value={form.months} onChange={(event) => setForm((prev) => ({ ...prev, months: Number(event.target.value) }))} />
            </div>
          </div>
          <div className="calc-box-ui space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Financiamiento neto</span>
              <strong>{currency(form.total - form.downPayment)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Mensualidad estimada</span>
              <strong>{currency(payment)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Interés anual</span>
              <strong>{form.rate}%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Tabla de Amortización</div>
          <div className="text-xs text-[#8C8070]">{rows.length} cuotas proyectadas</div>
        </div>
        <div className="card-body overflow-x-auto p-0">
          <table className="amort-table">
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Saldo Inicial</th>
                <th>Capital</th>
                <th>Interés</th>
                <th>Cuota</th>
                <th>Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cuota}>
                  <td>{row.cuota}</td>
                  <td>{currency(row.balance)}</td>
                  <td>{currency(row.capital)}</td>
                  <td>{currency(row.interest)}</td>
                  <td>{currency(row.payment)}</td>
                  <td>{currency(row.ending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CalculatorPage;
