import { useEffect, useMemo, useState } from "react";
import { HiCheckCircle, HiClock, HiInbox, HiTicket } from "react-icons/hi2";
import { getSupportTickets, updateSupportTicketStatus } from "@/services/botService";

const statuses = ["open", "in_progress", "resolved", "closed"];

const statusLabels = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortId(id) {
  return id ? id.slice(0, 8) : "—";
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "none";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <article className="card" style={{ padding: "18px 20px", minWidth: 160, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--mu)", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ marginTop: 8, color: "var(--deep)", fontSize: "1.55rem", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>
            {value}
          </div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: "#EEF6F1", color: "#355E3B", display: "grid", placeItems: "center" }}>
          <Icon />
        </div>
      </div>
    </article>
  );
}

function FrequencyList({ title, items }) {
  const entries = Object.entries(items || {});

  return (
    <section className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: ".82rem", fontWeight: 800, color: "var(--deep)", marginBottom: 12 }}>{title}</div>
      {entries.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {entries.map(([key, value]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--tx2)", fontSize: ".84rem" }}>{statusLabels[key] || key}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: "var(--deep)" }}>{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--mu)", fontSize: ".84rem" }}>Sin datos registrados.</div>
      )}
    </section>
  );
}

function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  async function loadTickets() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getSupportTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudieron cargar los tickets de soporte. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleStatusChange(ticketId, status) {
    setUpdatingId(ticketId);
    setError("");
    try {
      const updated = await updateSupportTicketStatus(ticketId, status);
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
    } catch {
      setError("No se pudo actualizar el estado del ticket. Intenta nuevamente.");
    } finally {
      setUpdatingId("");
    }
  }

  const stats = useMemo(() => {
    const byStatus = countBy(tickets, "status");
    return {
      total: tickets.length,
      byStatus,
      byIntent: countBy(tickets, "intent"),
      bySeverity: countBy(tickets, "severity"),
    };
  }, [tickets]);

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">Tickets de Soporte</div>
      </div>
      <div className="card-body">
        {error ? (
          <div style={{ border: "1px solid rgba(192,57,43,.18)", background: "#FDECEA", color: "#8A2D24", borderRadius: 16, padding: 14, marginBottom: 16, fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <SummaryCard label="Total" value={stats.total} icon={HiTicket} />
          <SummaryCard label="Open" value={stats.byStatus.open || 0} icon={HiInbox} />
          <SummaryCard label="In progress" value={stats.byStatus.in_progress || 0} icon={HiClock} />
          <SummaryCard label="Resolved" value={stats.byStatus.resolved || 0} icon={HiCheckCircle} />
          <SummaryCard label="Closed" value={stats.byStatus.closed || 0} icon={HiCheckCircle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
          <FrequencyList title="Frecuencia por intent" items={stats.byIntent} />
          <FrequencyList title="Frecuencia por status" items={stats.byStatus} />
          <FrequencyList title="Frecuencia por severity" items={stats.bySeverity} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "34px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>Cargando tickets...</div>
          ) : tickets.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Intent</th>
                    <th>Severidad</th>
                    <th>Estado</th>
                    <th>Dispositivo</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td style={{ minWidth: 150 }}>{formatDate(ticket.created_at)}</td>
                      <td style={{ fontFamily: "'JetBrains Mono',monospace" }}>{shortId(ticket.id)}</td>
                      <td>{ticket.name}</td>
                      <td>{ticket.email}</td>
                      <td>{ticket.intent}</td>
                      <td>{ticket.severity}</td>
                      <td>
                        <select
                          className="fi"
                          style={{ minWidth: 132 }}
                          value={ticket.status}
                          disabled={updatingId === ticket.id}
                          onChange={(event) => handleStatusChange(ticket.id, event.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{ticket.device}</td>
                      <td style={{ minWidth: 260 }}>
                        {(ticket.description || "").length > 120
                          ? `${ticket.description.slice(0, 120)}...`
                          : ticket.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "34px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>
              Aún no hay tickets registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupportTicketsPage;
