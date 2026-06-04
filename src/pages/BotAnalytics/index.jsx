import { useEffect, useMemo, useState } from "react";
import { HiChatBubbleLeftRight, HiChartBarSquare, HiTicket } from "react-icons/hi2";
import { getBotAnalyticsSummary, getBotConversations } from "@/services/botService";

function CountCard({ label, value, icon: Icon }) {
  return (
    <article className="card" style={{ padding: "18px 20px", minWidth: 170, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--mu)", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ marginTop: 8, color: "var(--deep)", fontSize: "1.55rem", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>
            {value ?? 0}
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
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--tx2)", fontSize: ".84rem" }}>{key}</span>
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

function categoryLabel(category) {
  const labels = {
    commercial: "Comercial",
    technical_support: "Soporte técnico",
    general: "General",
  };
  return labels[category] || category || "General";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BotAnalyticsPage() {
  const [conversations, setConversations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      setError("");
      try {
        const [conversationData, summaryData] = await Promise.all([
          getBotConversations(),
          getBotAnalyticsSummary(),
        ]);
        if (!mounted) return;
        setConversations(Array.isArray(conversationData) ? conversationData : []);
        setSummary(summaryData || null);
      } catch {
        if (!mounted) return;
        setError("No se pudieron cargar las consultas del bot. Intenta nuevamente.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const byCategory = summary?.by_category || {};
    return {
      total: summary?.total ?? conversations.length,
      commercial: byCategory.commercial || 0,
      support: byCategory.technical_support || 0,
      general: byCategory.general || 0,
    };
  }, [conversations.length, summary]);

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">Consultas del Bot</div>
      </div>
      <div className="card-body">
        {error ? (
          <div style={{ border: "1px solid rgba(192,57,43,.18)", background: "#FDECEA", color: "#8A2D24", borderRadius: 16, padding: 14, marginBottom: 16, fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <CountCard label="Total de consultas" value={counts.total} icon={HiChatBubbleLeftRight} />
          <CountCard label="Comerciales" value={counts.commercial} icon={HiChartBarSquare} />
          <CountCard label="Soporte técnico" value={counts.support} icon={HiTicket} />
          <CountCard label="Generales" value={counts.general} icon={HiChatBubbleLeftRight} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
          <FrequencyList title="Frecuencia por clasificación" items={summary?.by_category} />
          <FrequencyList title="Frecuencia por intent" items={summary?.by_intent} />
          <FrequencyList title="Frecuencia por severidad" items={summary?.by_severity} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "34px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>Cargando consultas...</div>
          ) : conversations.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Mensaje del usuario</th>
                    <th>Clasificación</th>
                    <th>Intent</th>
                    <th>Severidad</th>
                    <th>Ticket sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((item) => (
                    <tr key={item.id}>
                      <td style={{ minWidth: 150 }}>{formatDate(item.created_at)}</td>
                      <td style={{ minWidth: 260 }}>{item.message}</td>
                      <td>{categoryLabel(item.category)}</td>
                      <td>{item.intent || "general"}</td>
                      <td>{item.severity || "none"}</td>
                      <td>{item.has_ticket_suggestion ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "34px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>
              Aún no hay consultas registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BotAnalyticsPage;
