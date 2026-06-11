import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currency } from "@/services/formatters";
import { calculatorService } from "@/services/calculatorService";
import { buildCalculatorVariables, numericCalculatorVariables } from "@/services/calculatorVariables";
import GuideModal from "@/components/shared/GuideModal";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";

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
  const { openContractCreate, showToast } = useAppContext();
  const [form, setForm] = useState({
    total: 500000,
    downPayment: 100000,
    rate: 12,
    months: 96,
  });
  const [amortType, setAmortType]     = useState("french");
  const [showFormula, setShowFormula] = useState(false);
  const [showGuide, setShowGuide]     = useState(false);
  useLandsGuide(() => setShowGuide(true));

  const { payment, rows } = buildSchedule(form.total, form.downPayment, form.rate, form.months, amortType);
  const info = AMORT_INFO[amortType];
  const { data: activeCalculator } = useQuery({
    queryKey: ["calculators", "active", "lands"],
    queryFn: () => calculatorService.getActive("lands"),
    staleTime: 60_000,
  });
  const activeVariables = buildCalculatorVariables(activeCalculator, {
    amount: form.total,
    downPayment: form.downPayment,
    annualRate: form.rate / 100,
    months: form.months,
  });
  const activeValuesComplete = activeCalculator?.variables.every(
    (name) => activeVariables[name] !== "" && activeVariables[name] != null
  );
  const { data: activeResult, error: activeResultError } = useQuery({
    queryKey: ["calculator-active-test", activeCalculator?.id, activeVariables],
    queryFn: () => calculatorService.testFormula(
      activeCalculator.formula,
      numericCalculatorVariables(activeVariables)
    ),
    enabled: !!activeCalculator && activeValuesComplete,
    retry: false,
  });

  const createContractFromCalculator = () => {
    if (!activeCalculator) {
      showToast("No hay una calculadora activa para vincular al contrato");
      return;
    }
    if (activeValuesComplete && activeResultError) {
      showToast("La calculadora activa no pudo generar una mensualidad válida");
      return;
    }
    openContractCreate({
      amount: form.total,
      down_payment: form.downPayment,
      interest_rate: form.rate / 100,
      totalM: form.months,
      calculator_id: activeCalculator.id,
      calculator_vars: numericCalculatorVariables(activeVariables),
    });
  };

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

          <div style={{
            border: "1px solid var(--line-soft, #DCDAD2)", borderRadius: 12,
            padding: "12px 14px", background: "var(--sf, #fff)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: ".62rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mu)", fontWeight: 800 }}>
                  Plan activo para contratos
                </div>
                <div style={{ fontWeight: 700, color: "var(--forest)", marginTop: 4 }}>
                  {activeCalculator?.name || "Sin calculadora activa"}
                </div>
                {activeCalculator && (
                  <div style={{ fontSize: ".7rem", color: "var(--mu)", marginTop: 2 }}>
                    La fórmula activa debe devolver una mensualidad fija.
                  </div>
                )}
                {activeResult?.result != null && (
                  <div style={{ fontSize: ".78rem", color: "var(--mu)", marginTop: 3 }}>
                    Mensualidad según fórmula activa: <strong>{currency(Number(activeResult.result))}</strong>
                  </div>
                )}
                {activeCalculator && !activeValuesComplete && (
                  <div style={{ fontSize: ".74rem", color: "var(--danger)", marginTop: 3 }}>
                    La fórmula usa variables personalizadas que deben capturarse al crear el contrato.
                  </div>
                )}
              </div>
              <button className="btn-p" type="button" onClick={createContractFromCalculator} disabled={!activeCalculator}>
                Crear contrato con este plan
              </button>
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
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Calculadora financiera"
        subtitle="Simula planes de financiamiento con amortización francesa o alemana."
        steps={[
          { title: "Ingresa los parámetros", text: "Escribe el precio total del lote, el enganche, la tasa anual de interés y el número de mensualidades (plazo)." },
          { title: "Amortización Francesa", text: "Cuota mensual fija durante todo el plazo. El capital amortizado aumenta mes a mes y los intereses disminuyen. Ideal para flujo estable." },
          { title: "Amortización Alemana", text: "Capital fijo por mes, por lo que los cuotas son más altas al inicio y bajan con el tiempo. El total de intereses pagados es menor que en la francesa." },
          { title: "Tabla de amortización", text: "La tabla muestra mes a mes el saldo inicial, capital, intereses, cuota mensual y saldo final. Úsala para mostrar el plan de pagos al cliente." },
          { title: "Ver fórmulas", text: "Pulsa '¿Cómo se calcula?' para ver la fórmula matemática que se usa en cada método de amortización." },
        ]}
      />
    </div>
  );
}

export default CalculatorPage;
