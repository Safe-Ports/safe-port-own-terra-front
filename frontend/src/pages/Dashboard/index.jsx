import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { useDashboardQuery } from "@/hooks/queries/useAppQueries";
import { compactCurrency, currency, progress } from "@/services/formatters";

function monthLabel(dateValue) {
  return new Intl.DateTimeFormat("es-MX", { month: "short" }).format(new Date(`${dateValue}T12:00:00`));
}

function DashboardPage() {
  const navigate = useNavigate();
  const { clients, contracts, payments } = useAppContext();
  const { data } = useDashboardQuery();
  const [year] = useState(new Date().getFullYear());

  const monthlyStats = useMemo(() => {
    const stats = Array.from({ length: 12 }, (_, month) => ({
      month,
      label: new Intl.DateTimeFormat("es-MX", { month: "short" }).format(new Date(year, month, 1)),
      sales: 0,
      revenue: 0
    }));

    contracts.forEach((contract) => {
      const date = new Date(`${contract.date}T12:00:00`);
      if (date.getFullYear() === year) {
        stats[date.getMonth()].sales += 1;
      }
    });

    payments.forEach((payment) => {
      const date = payment.paidDate ? new Date(`${payment.paidDate}T12:00:00`) : null;
      if (date && date.getFullYear() === year && payment.status === "paid") {
        stats[date.getMonth()].revenue += payment.amount;
      }
    });

    return stats;
  }, [contracts, payments, year]);

  const maxSales = Math.max(...monthlyStats.map((item) => item.sales), 1);
  const maxRevenue = Math.max(...monthlyStats.map((item) => item.revenue), 1);
  const topClients = [...clients]
    .sort((left, right) => right.paidM - left.paidM)
    .slice(0, 5);

  if (!data) return null;

  return (
    <div>
      <div className="kpi-grid">
        {[
          { className: "k1", icon: "💰", value: compactCurrency(data.totals.paidRevenue), label: "Cobranza", sub: "Ingresos aplicados" },
          { className: "k2", icon: "🏗️", value: data.totals.availableLots, label: "Inventario", sub: `${data.totals.totalLots} lotes totales` },
          { className: "k3", icon: "👥", value: data.totals.clients, label: "Clientes", sub: `${data.totals.contracts} contratos` },
          { className: "k4", icon: "⚠️", value: data.alerts.length, label: "Alertas", sub: "Pendientes críticos" }
        ].map((kpi) => (
          <div key={kpi.label} className={`kpi ${kpi.className}`}>
            <div className="kpi-ico">{kpi.icon}</div>
            <div className="kpi-val">{kpi.value}</div>
            <div className="kpi-lbl">{kpi.label}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginBottom: 15 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hd">
            <div className="card-title">📈 Ventas mensuales</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: ".72rem", color: "var(--mu)", fontWeight: 600 }}>{year}</div>
              <div style={{ display: "flex", gap: 10, marginLeft: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "var(--mu)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--forest)", display: "inline-block" }} />
                  Ventas
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "var(--mu)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--earth)", display: "inline-block" }} />
                  Ingresos
                </span>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: "18px 20px 14px" }}>
            <div className="chart-bars">
              {monthlyStats.map((item) => (
                <div key={item.month} className="bar-col">
                  <div className="bar-pair">
                    <div
                      className="bar"
                      style={{ height: `${Math.max(12, (item.sales / maxSales) * 100)}px`, background: "var(--forest)" }}
                      title={`${item.label}: ${item.sales} ventas`}
                    />
                    <div
                      className="bar"
                      style={{ height: `${Math.max(12, (item.revenue / maxRevenue) * 100)}px`, background: "var(--earth)" }}
                      title={`${item.label}: ${currency(item.revenue)}`}
                    />
                  </div>
                  <div className="bar-lbl">{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bd)" }}>
              <div className="price-c">
                <div className="pc-l">Ventas cerradas</div>
                <div className="pc-v">{data.totals.contracts}</div>
              </div>
              <div className="price-c">
                <div className="pc-l">Cobro abierto</div>
                <div className="pc-v">{compactCurrency(data.totals.openRevenue)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ marginBottom: 0, flex: 1 }}>
            <div className="card-hd">
              <div className="card-title">Portafolio</div>
            </div>
            <div className="card-body">
              <div className="donut-wrap">
                <div className="donut">
                  <svg width="90" height="90" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r="34" fill="none" stroke="#E5DED3" strokeWidth="12" />
                    <circle
                      cx="45"
                      cy="45"
                      r="34"
                      fill="none"
                      stroke="var(--forest)"
                      strokeWidth="12"
                      strokeDasharray={`${(data.totals.availableLots / Math.max(data.totals.totalLots, 1)) * 214} 214`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="donut-center">
                    <div className="donut-pct">{progress(data.totals.availableLots, data.totals.totalLots)}%</div>
                    <div className="donut-lbl">Disponible</div>
                  </div>
                </div>
                <div className="donut-legend">
                  <div className="dl-i"><span className="dl-d" style={{ background: "var(--forest)" }} /><span className="dl-lbl">Disponibles</span><span className="dl-v">{data.totals.availableLots}</span></div>
                  <div className="dl-i"><span className="dl-d" style={{ background: "var(--danger)" }} /><span className="dl-lbl">Vendidos</span><span className="dl-v">{data.totals.soldLots}</span></div>
                  <div className="dl-i"><span className="dl-d" style={{ background: "var(--earth)" }} /><span className="dl-lbl">Apartados</span><span className="dl-v">{data.totals.reservedLots}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-hd"><div className="card-title">⚠️ Alertas</div></div>
            <div className="card-body" style={{ maxHeight: 130, overflowY: "auto" }}>
              {data.alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="alert-item">
                  <div className={`alert-ico ${alert.priority === "high" ? "red" : alert.priority === "medium" ? "amber" : "blue"}`}>
                    {alert.type === "payment" ? "💳" : alert.type === "document" ? "📄" : "👤"}
                  </div>
                  <div className="alert-info">
                    <div className="alert-nm">{alert.title}</div>
                    <div className="alert-dt">{alert.subtitle}</div>
                  </div>
                  <div className="alert-date">{alert.dueDate ? monthLabel(alert.dueDate) : "Hoy"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hd"><div className="card-title">🏆 Top clientes</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Pagado</th>
                  <th>Avance</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, index) => (
                  <tr key={client.id} onClick={() => navigate("/clientes")}>
                    <td>{index + 1}</td>
                    <td>{client.name}</td>
                    <td>{client.paidM}</td>
                    <td>{progress(client.paidM, client.totalM)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hd">
            <div className="card-title">📄 Contratos recientes</div>
            <button className="tb-btn tb-s" style={{ fontSize: ".7rem", padding: "4px 10px" }} onClick={() => navigate("/contratos")}>
              Ver todos →
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.recentContracts.map((contract) => (
                  <tr key={contract.id} onClick={() => navigate("/contratos")}>
                    <td>{contract.number}</td>
                    <td>{currency(contract.amount)}</td>
                    <td><span className={`pc-chip ${contract.type === "reserve" ? "pending" : "paid"}`}>{contract.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
