import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { currency, dateLabel } from "@/services/formatters";

// ── helpers ──────────────────────────────────────────────────────────────────
const TODAY = new Date();

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function last12Months() {
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
    });
  }
  return out;
}

const MONTHS = last12Months();

const genDate = TODAY.toLocaleDateString("es-MX", {
  day: "2-digit", month: "long", year: "numeric",
});

// ── sub-components ────────────────────────────────────────────────────────────
function Avatar({ initials, color }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: color || "#2A7A50", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 13,
    }}>
      {initials}
    </div>
  );
}

function CircleProgress({ pct }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = circ * (Math.min(pct, 100) / 100);
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#E7E4DB" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke="#355E3B" strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1E3D2B">
        {pct}%
      </text>
    </svg>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: ".65rem", fontWeight: 700, letterSpacing: ".13em",
      textTransform: "uppercase", color: "#83867C", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#FBFAF6", border: "1px solid #E7E4DB",
      borderRadius: 16, padding: "18px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

// ── print helper ──────────────────────────────────────────────────────────────
function buildPrintHTML({ client, clientContracts, clientPayments, montoContratado, saldo, progreso, enMora }) {
  const contractRows = clientContracts.map((c) => `
    <div style="padding:10px 14px;border:1px solid #E7E4DB;border-radius:12px;background:#fff;margin-bottom:8px;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1E3D2B">${c.contract_number}</div>
        <div style="font-size:11px;color:#83867C;margin-top:2px">${c.lot?.code || "—"} · ${dateLabel(c.contract_date)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:#1E3D2B">${currency(c.amount)}</div>
      </div>
    </div>`).join("");

  const paymentRows = clientPayments.map((p) => `
    <div style="padding:10px 14px;border:1px solid #E7E4DB;border-radius:12px;background:#fff;margin-bottom:6px;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1E3D2B">Cuota ${p.installment_n}</div>
        <div style="font-size:11px;color:#83867C;margin-top:2px">${dateLabel(p.due_date)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:#1E3D2B">${currency(p.amount)}</div>
        <div style="font-size:11px;color:${p.status === "paid" ? "#355E3B" : p.status === "overdue" ? "#C0392B" : "#83867C"};margin-top:2px">${p.status}</div>
      </div>
    </div>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Reporte Financiero · ${client.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; color: #1E3D2B; padding: 32px; }
  .hdr { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid #E7E4DB; padding-bottom: 20px; }
  .logo { width: 48px; height: 48px; border-radius: 50%; background: #355E3B; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .sub { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #83867C; }
  .contact { font-size: 11px; color: #83867C; margin-top: 2px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .card { background: #FBFAF6; border: 1px solid #E7E4DB; border-radius: 14px; padding: 16px 18px; }
  .card-title { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #83867C; font-weight: 700; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  .stats3 { display: flex; gap: 10px; }
  .stat { flex: 1; border-radius: 10px; padding: 12px; text-align: center; }
  .stat-n { font-size: 22px; font-weight: 700; }
  .stat-l { font-size: 8px; text-transform: uppercase; font-weight: 700; margin-top: 4px; }
  .footer { border-top: 1px solid #E7E4DB; padding-top: 14px; display: flex; justify-content: space-between; font-size: 10px; color: #83867C; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="hdr">
  <div class="logo">🏡</div>
  <div>
    <div style="font-size:11px;font-weight:700">OwnTerra</div>
    <div class="sub">Reporte Financiero del Cliente</div>
    <h1>${client.name}</h1>
    <div class="contact">Contacto: ${client.email || "—"}${client.phone ? " | " + client.phone : ""}</div>
  </div>
</div>
<div class="grid2">
  <div class="card">
    <div class="card-title">Resumen de Cuenta</div>
    <div class="row"><span style="color:#83867C">Monto contratado:</span><strong>${currency(montoContratado)}</strong></div>
    <div class="row"><span style="color:#83867C">Saldo por cobrar:</span><strong>${currency(saldo)}</strong></div>
    <div class="row"><span style="color:#83867C">Progreso de pago:</span><strong>${progreso}%</strong></div>
    <div class="row"><span style="color:#83867C">En mora:</span><strong style="color:${enMora > 0 ? "#C0392B" : "#1E3D2B"}">${enMora}</strong></div>
  </div>
  <div class="card">
    <div class="card-title">Cumplimiento</div>
    <div class="stats3">
      <div class="stat" style="background:#D4EDDA"><div class="stat-n">${clientPayments.filter((p) => p.status === "paid").length}</div><div class="stat-l" style="color:#355E3B">Al corriente</div></div>
      <div class="stat" style="background:#F5E6D0"><div class="stat-n">${clientPayments.filter((p) => { if (p.status !== "pending") return false; const diff = (new Date(p.due_date) - TODAY) / 86400000; return diff >= 0 && diff <= 30; }).length}</div><div class="stat-l" style="color:#856404">Por vencer</div></div>
      <div class="stat" style="background:#EDE7DF"><div class="stat-n">${enMora}</div><div class="stat-l" style="color:#6B4226">Vencidas</div></div>
    </div>
  </div>
</div>
<div class="card" style="margin-bottom:16px">
  <div class="card-title">Contratos (${clientContracts.length})</div>
  ${contractRows || '<div style="text-align:center;color:#83867C;font-size:13px;padding:8px 0">Sin contratos registrados.</div>'}
</div>
<div class="card" style="margin-bottom:20px">
  <div class="card-title">Plan de Pagos (${clientPayments.length})</div>
  ${paymentRows || '<div style="text-align:center;color:#83867C;font-size:13px;padding:8px 0">Sin pagos registrados.</div>'}
</div>
<div class="footer">
  <span>Documento generado el ${genDate}</span>
  <span>OwnTerra ECOSISTEM · Página 1 de 1</span>
</div>
</body></html>`;
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { clients, contracts, payments } = useAppContext();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(
    () => clients.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    }),
    [clients, search],
  );

  const activeId = selectedId ?? clients[0]?.id ?? null;
  const client = clients.find((c) => c.id === activeId) ?? null;

  const clientContracts = useMemo(
    () => contracts.filter((c) => String(c.client?.id) === String(activeId)),
    [contracts, activeId],
  );

  const clientPayments = useMemo(
    () => payments.filter((p) => String(p.client?.id) === String(activeId)),
    [payments, activeId],
  );

  // Financial summary
  const montoContratado = clientContracts.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPaid = clientPayments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const saldo = Math.max(0, montoContratado - totalPaid);
  const progreso = montoContratado > 0 ? Math.round((totalPaid / montoContratado) * 100) : 0;
  const enMora = clientPayments.filter((p) => p.status === "overdue").length;

  // Cumplimiento counts
  const pagosAlCorriente = clientPayments.filter((p) => p.status === "paid").length;
  const pagosPorVencer = clientPayments.filter((p) => {
    if (p.status !== "pending") return false;
    const diff = (new Date(p.due_date) - TODAY) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;

  // Chart data
  const chartData = useMemo(() =>
    MONTHS.map(({ key, label }) => {
      const month = clientPayments.filter((p) => monthKey(p.due_date) === key);
      return {
        label,
        programado: month.reduce((s, p) => s + Number(p.amount || 0), 0),
        pagado: month.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0),
        vencido: month.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount || 0), 0),
      };
    }),
    [clientPayments],
  );

  const handlePrint = () => {
    if (!client) return;
    const win = window.open("", "_blank", "width=860,height=960");
    win.document.write(buildPrintHTML({ client, clientContracts, clientPayments, montoContratado, saldo, progreso, enMora }));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "#F5F3EE", borderRadius: 18, overflow: "hidden" }}>

      {/* ── LEFT: client list ── */}
      <div style={{
        width: 260, flexShrink: 0, background: "#fff",
        borderRight: "1px solid #E7E4DB", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #E7E4DB" }}>
          <div style={{
            fontSize: ".65rem", fontWeight: 700, color: "#83867C",
            letterSpacing: ".13em", textTransform: "uppercase", marginBottom: 10,
          }}>
            Clientes ({filtered.length})
          </div>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fi"
            style={{ width: "100%", fontSize: ".82rem" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 10px", borderRadius: 12,
                  border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2,
                  background: active ? "#EDF4EC" : "transparent",
                }}
              >
                <Avatar initials={c.initials} color={c.color} />
                <div>
                  <div style={{ fontSize: ".83rem", fontWeight: 600, color: "#1E3D2B" }}>{c.name}</div>
                  <div style={{ fontSize: ".72rem", color: "#83867C", marginTop: 1 }}>{c.email}</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "#83867C" }}>
              Sin resultados.
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: report ── */}
      {client ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Print button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="btn-p" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              🖨 Imprimir reporte
            </button>
          </div>

          {/* Report document */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E7E4DB", padding: "28px 32px" }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              marginBottom: 22, borderBottom: "1px solid #E7E4DB", paddingBottom: 20,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "#355E3B", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                🏡
              </div>
              <div>
                <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#1E3D2B" }}>OwnTerra</div>
                <div style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#83867C" }}>
                  Reporte Financiero del Cliente
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1E3D2B", marginTop: 2 }}>
                  {client.name}
                </div>
                <div style={{ fontSize: ".75rem", color: "#83867C" }}>
                  Contacto: {client.email || "—"}{client.phone ? ` | ${client.phone}` : ""}
                </div>
              </div>
            </div>

            {/* Row 1: Resumen + Comportamiento */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* Resumen de cuenta */}
              <Card>
                <SectionTitle>Resumen de Cuenta</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
                    <span style={{ color: "#83867C" }}>Monto contratado:</span>
                    <span style={{ fontWeight: 700, color: "#1E3D2B" }}>{currency(montoContratado)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
                    <span style={{ color: "#83867C" }}>Saldo por cobrar total:</span>
                    <span style={{ fontWeight: 700, color: "#1E3D2B" }}>{currency(saldo)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <CircleProgress pct={progreso} />
                  <span style={{ fontSize: ".82rem", color: "#83867C" }}>Progreso de pago</span>
                </div>
                <div style={{
                  marginTop: 14, paddingTop: 12, borderTop: "1px solid #E7E4DB",
                  display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".82rem",
                }}>
                  <span style={{ color: "#83867C" }}>En mora:</span>
                  <span style={{ fontWeight: 700, color: enMora > 0 ? "#C0392B" : "#1E3D2B" }}>
                    {enMora}
                  </span>
                </div>
              </Card>

              {/* Comportamiento de pago */}
              <Card>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
                  <SectionTitle>Comportamiento de Pago</SectionTitle>
                  <div style={{ display: "flex", gap: 10, fontSize: ".62rem", color: "#83867C", flexShrink: 0 }}>
                    <span>● Programado</span>
                    <span style={{ color: "#355E3B" }}>● Pagado</span>
                    <span style={{ color: "#C0392B" }}>● Vencido</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={148}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DB" />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#83867C" }} />
                    <YAxis tick={{ fontSize: 8, fill: "#83867C" }} />
                    <Tooltip
                      formatter={(v) => currency(v)}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E7E4DB" }}
                    />
                    <Line type="monotone" dataKey="programado" stroke="#B0ADA6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="pagado" stroke="#355E3B" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="vencido" stroke="#C0392B" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Row 2: Cumplimiento + Contratos */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* Cumplimiento */}
              <Card>
                <SectionTitle>Cumplimiento</SectionTitle>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "#D4EDDA", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1E3D2B" }}>{pagosAlCorriente}</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", color: "#355E3B", marginTop: 4, letterSpacing: ".05em" }}>
                      Al corriente
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "#F5E6D0", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1E3D2B" }}>{pagosPorVencer}</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", color: "#856404", marginTop: 4, letterSpacing: ".05em" }}>
                      Por vencer
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "#EDE7DF", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1E3D2B" }}>{enMora}</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", color: "#6B4226", marginTop: 4, letterSpacing: ".05em" }}>
                      Vencidas
                    </div>
                  </div>
                </div>
              </Card>

              {/* Contratos */}
              <Card>
                <SectionTitle>Contratos ({clientContracts.length})</SectionTitle>
                {clientContracts.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#83867C", fontSize: 13, padding: "10px 0" }}>
                    Sin contratos registrados.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {clientContracts.map((c) => (
                      <div key={c.id} style={{
                        background: "#fff", border: "1px solid #E7E4DB", borderRadius: 12,
                        padding: "10px 12px", display: "flex", justifyContent: "space-between",
                      }}>
                        <div>
                          <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#1E3D2B" }}>{c.contract_number}</div>
                          <div style={{ fontSize: ".7rem", color: "#83867C", marginTop: 2 }}>
                            {c.lot?.code || "—"} · {dateLabel(c.contract_date)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: ".82rem", color: "#1E3D2B" }}>
                          {currency(c.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Row 3: Plan de pagos */}
            <Card style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <SectionTitle>Plan de Pagos ({clientPayments.length})</SectionTitle>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontSize: ".65rem", background: "#1E3D2B", color: "#fff",
                    borderRadius: 20, padding: "3px 10px", fontWeight: 600,
                  }}>
                    #{clientPayments.filter((p) => p.status === "paid").length} pagado
                  </span>
                  <span style={{
                    fontSize: ".65rem", background: "#E7E4DB", color: "#1E3D2B",
                    borderRadius: 20, padding: "3px 10px", fontWeight: 600,
                  }}>
                    #{clientPayments.filter((p) => p.status !== "paid").length} pendiente
                  </span>
                </div>
              </div>
              {clientPayments.length === 0 ? (
                <div style={{ textAlign: "center", color: "#83867C", fontSize: 13, padding: "10px 0" }}>
                  Sin pagos registrados.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {clientPayments.map((p) => (
                    <div key={p.id} style={{
                      background: "#fff", border: "1px solid #E7E4DB", borderRadius: 12,
                      padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#1E3D2B" }}>
                          Cuota {p.installment_n}
                        </div>
                        <div style={{ fontSize: ".7rem", color: "#83867C", marginTop: 2 }}>{dateLabel(p.due_date)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#1E3D2B" }}>{currency(p.amount)}</div>
                        <div style={{
                          fontSize: ".7rem", marginTop: 2,
                          color: p.status === "paid" ? "#355E3B" : p.status === "overdue" ? "#C0392B" : "#83867C",
                        }}>
                          {p.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Footer */}
            <div style={{
              borderTop: "1px solid #E7E4DB", paddingTop: 16,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: ".72rem", color: "#83867C" }}>
                Documento generado el {genDate}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#355E3B",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                }}>
                  🏡
                </div>
                <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#1E3D2B" }}>
                  OwnTerra <span style={{ fontWeight: 400, color: "#83867C" }}>ECOSISTEM</span>
                </span>
                <span style={{ fontSize: ".72rem", color: "#83867C" }}>Página 1 de 1</span>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#83867C", fontSize: 14 }}>
          Selecciona un cliente para ver su reporte.
        </div>
      )}
    </div>
  );
}
