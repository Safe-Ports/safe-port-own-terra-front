import { useState } from "react";
import { currency } from "@/services/formatters";

/* ── Amortización Francesa (cuota fija) ── */
function buildFrench(total, downPayment, rate, months) {
  const principal = Math.max(0, total - downPayment);
  const monthlyRate = rate / 100 / 12;
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * (monthlyRate * (1 + monthlyRate) ** months)) / ((1 + monthlyRate) ** months - 1);

  const rows = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const capital  = payment - interest;
    const ending   = Math.max(0, balance - capital);
    rows.push({ cuota: i, balance, capital, interest, payment, ending });
    balance = ending;
  }
  return { payment, rows };
}

/* ── Amortización Alemana (capital fijo) ── */
function buildGerman(total, downPayment, rate, months) {
  const principal = Math.max(0, total - downPayment);
  const monthlyRate = rate / 100 / 12;
  const capitalPerMonth = principal / months;

  const rows = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const payment  = capitalPerMonth + interest;
    const ending   = Math.max(0, balance - capitalPerMonth);
    rows.push({ cuota: i, balance, capital: capitalPerMonth, interest, payment, ending });
    balance = ending;
  }
  return { payment: rows[0]?.payment || 0, rows };
}

function buildSchedule(total, downPayment, rate, months, amortType) {
  return amortType === "german"
    ? buildGerman(total, downPayment, rate, months)
    : buildFrench(total, downPayment, rate, months);
}

const AMORT_INFO = {
  french: {
    label: "Francesa (cuota fija)",
    formula: "PMT = P × [r(1+r)ⁿ] / [(1+r)ⁿ − 1]",
    desc: "La cuota mensual es constante durante todo el plazo. En cada pago, la proporción de interés disminuye y la de capital aumenta.",
  },
  german: {
    label: "Alemana (capital fijo)",
    formula: "Capital = P / n  |  Cuota_i = Capital + Saldo_i × r",
    desc: "El capital amortizado es igual cada mes. La cuota total decrece con el tiempo porque el saldo se reduce linealmente.",
  },
};

function CalculatorPage() {
  const [form, setForm] = useState({
    total: 500000,
    downPayment: 100000,
    rate: 12,
    months: 96,
  });
  const [amortType, setAmortType]     = useState("french");
  const [showFormula, setShowFormula] = useState(false);

  const { payment, rows } = buildSchedule(form.total, form.downPayment, form.rate, form.months, amortType);
  const info = AMORT_INFO[amortType];

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
              <input className="fi" type="number" value={form.total} onChange={(e) => setForm((p) => ({ ...p, total: Number(e.target.value) }))} />
            </div>
            <div className="fg">
              <label className="fl">Enganche ($)</label>
              <input className="fi" type="number" value={form.downPayment} onChange={(e) => setForm((p) => ({ ...p, downPayment: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="fg">
              <label className="fl">Tasa de Interés Anual (%)</label>
              <input className="fi" type="number" value={form.rate} step="0.5" onChange={(e) => setForm((p) => ({ ...p, rate: Number(e.target.value) }))} />
            </div>
            <div className="fg">
              <label className="fl">Plazo (meses)</label>
              <input className="fi" type="number" value={form.months} onChange={(e) => setForm((p) => ({ ...p, months: Number(e.target.value) }))} />
            </div>
          </div>

          {/* ── Configurar fórmula ── */}
          <div style={{ border: "1px solid var(--line-soft, #DCDAD2)", borderRadius: 12, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setShowFormula((v) => !v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 14px",
                background: "var(--tan-lt, #f5f0e8)", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: ".82rem", fontWeight: 600, color: "var(--tx, #1E3D2B)",
              }}
            >
              <span>⚙ Configurar fórmula de amortización</span>
              <span style={{ fontSize: ".7rem", color: "var(--mu)", fontWeight: 400 }}>
                {info.label} {showFormula ? "▲" : "▼"}
              </span>
            </button>

            {showFormula && (
              <div style={{ padding: "14px 16px", background: "var(--sf, #fff)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {Object.entries(AMORT_INFO).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAmortType(key)}
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                        fontFamily: "inherit", fontSize: ".8rem", fontWeight: 600,
                        border: amortType === key ? "2px solid var(--forest, #355E3B)" : "1.5px solid var(--bd, #DCDAD2)",
                        background: amortType === key ? "rgba(111,175,107,.1)" : "var(--sf, #fff)",
                        color: amortType === key ? "var(--forest, #355E3B)" : "var(--tx, #43453F)",
                        transition: "all .15s",
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  background: "var(--tan-lt, #f5f0e8)", borderRadius: 10, padding: "12px 14px",
                  fontSize: ".8rem", color: "var(--tx)",
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".76rem", color: "var(--forest, #355E3B)", marginBottom: 6, fontWeight: 600 }}>
                    {info.formula}
                  </div>
                  <p style={{ margin: 0, color: "var(--mu)", lineHeight: 1.5 }}>{info.desc}</p>
                </div>

                {amortType === "german" && (
                  <div style={{ marginTop: 10, fontSize: ".74rem", color: "var(--mu)", padding: "6px 0" }}>
                    ℹ La cuota mostrada en el resumen corresponde al primer mes (la más alta del plazo).
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="calc-box-ui space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Financiamiento neto</span>
              <strong>{currency(form.total - form.downPayment)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>
                {amortType === "french" ? "Mensualidad fija" : "Primera mensualidad"}
              </span>
              <strong>{currency(payment)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Tasa anual</span>
              <strong>{form.rate}%</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Tipo de amortización</span>
              <strong>{info.label}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Tabla de Amortización</div>
          <div className="text-xs text-[#83867C]">{rows.length} cuotas proyectadas · {info.label}</div>
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
