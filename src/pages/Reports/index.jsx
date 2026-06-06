import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiArchiveBox, HiBanknotes, HiChartBarSquare } from "react-icons/hi2";
import { reportService } from "@/services/reportService";
import { currency, compactCurrency } from "@/services/formatters";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";

/* ── helpers ─────────────────────────────────────────────────── */
const fmtD = iso => !iso ? "—" : new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const fmtDLong = iso => !iso ? "—" : new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
const ESTADO_LABEL = { pending: "Pendiente", paid: "Pagado", overdue: "Vencido", partial: "Parcial" };
const TYPE_LABEL   = { sale: "Compraventa", rent: "Arrendamiento", reserve: "Reserva" };
const STATUS_LABEL = { active: "Activo", paid: "Pagado", cancelled: "Cancelado", default: "Mora" };

/* ── OwnTerra logo (SVG inline) ──────────────────────────────── */
function OwnTerraLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* círculo de fondo claro */}
      <circle cx="32" cy="32" r="30" fill="#F3F0E4" stroke="#355E3B" strokeWidth="1.5"/>
      {/* hoja izquierda */}
      <path d="M14 22c0-5 4-9 9-9 .5 3-1 7-5 8.5-1.5.5-4 1.5-4 .5z" fill="#355E3B" opacity="0.9"/>
      {/* hoja derecha pequeña */}
      <path d="M40 18c2-3 5-3 6-1-.5 2-3 4-5 3.5-.5-.1-1.3-1-1-2.5z" fill="#355E3B" opacity="0.7"/>
      {/* casita */}
      <path d="M24 36l8-6 8 6v10h-5v-6h-6v6h-5V36z" fill="#355E3B"/>
      {/* segunda casita (más alta) */}
      <path d="M40 32l5-4 5 4v14h-3v-7h-4v7h-3V32z" fill="#355E3B"/>
      {/* colinas */}
      <path d="M10 50 Q22 42 32 50 Q42 42 54 50 L54 56 L10 56 Z" fill="#355E3B" opacity="0.85"/>
      <path d="M8 54 Q24 48 32 54 Q40 48 56 54 L56 58 L8 58 Z" fill="#355E3B" opacity="0.9"/>
    </svg>
  );
}

/* ── OwnTerra brand wordmark (para footer) ───────────────────── */
function OwnTerraWordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <OwnTerraLogo size={26} />
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem",
        fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>
        Own<span style={{ color: "var(--forest)" }}>Terra</span>
        <div style={{ fontSize: ".5rem", letterSpacing: ".22em", color: "var(--mu)",
          fontFamily: "'Inter',sans-serif", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>
          Ecosistem
        </div>
      </div>
    </div>
  );
}

/* ── Lista de clientes (izquierda) ───────────────────────────── */
/* Avatar: use shared component from src/components/Avatar.jsx */

function ClientList({ clients, selectedId, onSelect, search, onSearch }) {
  return (
    <aside style={{
      width: 280, flexShrink: 0, background: "var(--sf)",
      border: "1px solid var(--bd)", borderRadius: 20,
      boxShadow: "var(--sh)", overflow: "hidden",
      display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 110px)",
    }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ fontSize: ".64rem", fontWeight: 800, letterSpacing: ".14em",
          textTransform: "uppercase", color: "var(--mu)", marginBottom: 8 }}>
          Clientes ({clients.length})
        </div>
        <div style={{ position: "relative" }}>
          <HiOutlineMagnifyingGlass style={{ position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".95rem" }} />
          <input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Buscar cliente…"
            style={{ width: "100%", padding: "7px 10px 7px 30px",
              border: "1.5px solid var(--bd)", borderRadius: 10,
              fontSize: ".8rem", background: "var(--sf2)",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {clients.length === 0 && (
          <div style={{ padding: "24px 14px", textAlign: "center", fontSize: ".8rem", color: "var(--mu)" }}>
            Sin resultados.
          </div>
        )}
        {clients.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", border: "none", cursor: "pointer",
              background: selectedId === c.id ? "var(--tan-lt)" : "transparent",
              borderLeft: selectedId === c.id ? "3px solid var(--forest)" : "3px solid transparent",
              fontFamily: "inherit", textAlign: "left",
            }}>
            <Avatar name={c.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--tx)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontSize: ".7rem", color: "var(--mu)" }}>
                {c.email || c.phone || "—"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ── Reporte vacío ───────────────────────────────────────────── */
function EmptyReport() {
  return (
    <div style={{
      flex: 1, background: "var(--sf)", border: "1px solid var(--bd)",
      borderRadius: 20, padding: 60, textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 500, gap: 14, boxShadow: "var(--sh)",
    }}>
      <HiOutlineUserCircle style={{ fontSize: "3.4rem", color: "var(--mu)", opacity: 0.5 }} />
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: "var(--tx)" }}>
        Selecciona un cliente
      </div>
      <div style={{ fontSize: ".88rem", color: "var(--mu)", maxWidth: 320, lineHeight: 1.5 }}>
        Elige un cliente de la lista para ver su reporte completo: saldo, contratos, pagos y comportamiento de pago.
      </div>
    </div>
  );
}

/* ── Anillo de progreso circular ─────────────────────────────── */
function ProgressRing({ percent, size = 70 }) {
  const r = (size / 2) - 7;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E4DDD3" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#355E3B" strokeWidth="6"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 800, fontSize: `${size * 0.22}px`,
        color: "var(--forest)" }}>
        {percent}%
      </div>
    </div>
  );
}

/* ── Gráfica de comportamiento (12 meses) ────────────────────── */
function PaymentBehaviorChart({ payments }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
        year:  d.getFullYear(),
        fullLabel: d.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
        paid: 0, due: 0, overdue: 0,
      };
    });
    payments.forEach(p => {
      const dueKey = (p.due_date || "").slice(0, 7);
      const m = months.find(m => m.key === dueKey);
      if (!m) return;
      m.due += Number(p.amount || 0);
      if (p.status === "paid")          m.paid    += Number(p.amount || 0);
      else if (p.status === "overdue")  m.overdue += Number(p.amount || 0);
    });
    return months;
  }, [payments]);

  const [hover, setHover] = useState(null);
  const maxV = Math.max(...data.map(d => d.due), 1);
  const H = 130, PAD_L = 36, PAD_B = 28, PAD_T = 12;
  const BW = 16;
  const COL_W = 44;
  const W = PAD_L + COL_W * data.length + 8;

  /* línea de tendencia (paid) */
  const linePoints = data.map((d, i) => {
    const x = PAD_L + i * COL_W + COL_W / 2;
    const y = PAD_T + H - (d.paid / maxV) * H;
    return [x, y];
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      {/* Filtros */}
      <div style={{ marginBottom: 20 }}>
        <div className="reports-segmented" role="group" aria-label="Periodo de cobranza">
          {["month", "quarter", "year"].map((p) => (
            <button
              key={p}
              type="button"
              className={period === p ? "is-active" : ""}
              onClick={() => setPeriod(p)}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Esperado" value={isLoading ? "—" : compactCurrency(data?.expected ?? 0)} sub="Pagos del periodo" />
        <KpiCard label="Cobrado" value={isLoading ? "—" : compactCurrency(data?.collected ?? 0)} sub="Pagos confirmados" />
        <KpiCard label="Tasa de cobranza" value={isLoading ? "—" : pct(data?.collection_rate)} sub="Cobrado / esperado" />
        <KpiCard
          label="Total vencido"
          value={isLoading ? "—" : compactCurrency(overdue?.amount ?? 0)}
          sub={`${overdue?.count ?? 0} pagos en mora`}
          danger={(overdue?.count ?? 0) > 0}
        />
      </div>

      {/* Aging buckets */}
      {!isLoading && overdue && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--deep)", marginBottom: 16 }}>
            Antigüedad de la cartera vencida
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ageBuckets.map((b) => {
              const count = overdue.by_age[b.key] ?? 0;
              const barPct = Math.round((count / maxBucket) * 100);
              return (
                <div key={b.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginBottom: 5 }}>
                    <span style={{ color: "var(--mu)" }}>{b.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "var(--deep)" }}>
                      {count} pago{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: "var(--bg2)" }}>
                    <div style={{
                      height: 8, borderRadius: 6, background: b.color,
                      width: `${barPct}%`, transition: "width .4s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          {overdue.count === 0 && (
            <div style={{ paddingTop: 8, fontSize: 13, color: "var(--mu)", textAlign: "center" }}>
              Sin pagos vencidos en el periodo. 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ClientReport (rediseñado: documento profesional) ────────── */
function ClientReport({ clientId }) {
  const { data: client } = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: () => clientService.get(clientId),
    enabled: !!clientId,
  });
  const { data: contractsData } = useQuery({
    queryKey: ["client-contracts", clientId],
    queryFn: () => clientService.contracts(clientId),
    enabled: !!clientId,
  });
  const { data: paymentsData } = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: () => clientService.payments(clientId),
    enabled: !!clientId,
  });

  const contracts = contractsData?.items || [];
  const payments  = paymentsData?.items  || [];

  /* totales */
  const totalContracted = contracts.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPaid    = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBalance = totalPending + totalOverdue;

  const cntPaid    = payments.filter(p => p.status === "paid").length;
  const cntPending = payments.filter(p => p.status === "pending").length;
  const cntOverdue = payments.filter(p => p.status === "overdue").length;
  const progress   = totalContracted > 0 ? Math.round((totalPaid / totalContracted) * 100) : 0;

  const handlePrint = () => window.print();

  if (!client) return (
    <div style={{ flex: 1, padding: 40, textAlign: "center", color: "var(--mu)" }}>Cargando…</div>
  );

  /* contactos como string limpio */
  const contactString = [client.email, client.phone].filter(Boolean).join(" | ");

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* botón flotante de imprimir */}
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Button variant="primary" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HiOutlinePrinter style={{ fontSize: "1rem" }}/> Imprimir reporte
        </Button>
      </div>

      {/* ═══ DOCUMENTO TIPO HOJA A4 ═══ */}
      <div id="rp-print-area" style={{
        background: "#FDFBF5", border: "1px solid var(--bd)",
        borderRadius: 16, padding: "36px 40px",
        boxShadow: "0 8px 28px rgba(27,43,24,.08)",
        maxWidth: 920, margin: "0 auto",
      }}>

        {/* ─── HEADER ─── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 26 }}>
          <OwnTerraLogo size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.55rem",
              fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>
              Own<span style={{ color: "var(--forest)" }}>Terra</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: "1.35rem", fontFamily: "'Playfair Display',serif",
                fontWeight: 700, color: "var(--tx)", letterSpacing: "0.02em",
                textTransform: "uppercase", lineHeight: 1.1 }}>
                Reporte financiero del cliente
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.45rem",
                fontWeight: 600, color: "var(--forest)", marginTop: 4, lineHeight: 1.1 }}>
                {client.name}
              </div>
              {contactString && (
                <div style={{ fontSize: ".82rem", color: "var(--tx2)", marginTop: 6 }}>
                  Contacto: {contactString}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── FILA 1: Resumen + Comportamiento ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, marginBottom: 14 }}>

          {/* Resumen de cuenta */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)",
            borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--tan-dk)",
              borderBottom: "1.5px solid var(--tan-lt)", paddingBottom: 6, marginBottom: 12 }}>
              Resumen de cuenta
            </div>

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: ".8rem", color: "var(--tx2)" }}>Monto contratado: </span>
              <strong style={{ fontSize: ".88rem", color: "var(--tx)" }}>{currency(totalContracted)}</strong>
            </div>

            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: ".8rem", color: "var(--tx2)" }}>Saldo por cobrar total: </span>
              <strong style={{ fontSize: ".88rem", color: "var(--earth)" }}>{currency(totalBalance)}</strong>
              {totalBalance > 0 && (
                <HiOutlineExclamationTriangle style={{ color: "var(--earth)", fontSize: ".95rem" }} />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <ProgressRing percent={progress} size={64} />
              <div style={{ fontSize: ".8rem", color: "var(--tx2)" }}>
                Progreso de pago
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6,
              paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
              <span style={{ fontSize: ".8rem", color: "var(--tx2)" }}>En mora: </span>
              <strong style={{ fontSize: ".88rem",
                color: cntOverdue > 0 ? "var(--danger)" : "var(--tx)" }}>
                {cntOverdue}
              </strong>
              {cntOverdue === 0 && (
                <HiOutlineCheckCircle style={{ color: "var(--forest)", fontSize: "1rem", marginLeft: "auto" }} />
              )}
              {cntOverdue > 0 && (
                <HiOutlineExclamationTriangle style={{ color: "var(--danger)", fontSize: "1rem", marginLeft: "auto" }} />
              )}
            </div>
          </div>

          {/* Comportamiento de pago */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)",
            borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1.5px solid var(--tan-lt)", paddingBottom: 6, marginBottom: 10 }}>
              <div style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--tan-dk)" }}>
                Comportamiento de pago
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  ["#EDE8DF", "Programado"],
                  ["#355E3B", "Pagado"],
                  ["#C0392B", "Vencido"],
                ].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4,
                    fontSize: ".66rem", color: "var(--mu)", fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <PaymentBehaviorChart payments={payments} />
          </div>
        </div>

        {/* ─── FILA 2: Cumplimiento + Contratos ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, marginBottom: 14 }}>

          {/* Cumplimiento - 3 badges */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)",
            borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--tan-dk)",
              borderBottom: "1.5px solid var(--tan-lt)", paddingBottom: 6, marginBottom: 12 }}>
              Cumplimiento
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { val: cntPaid,    lbl: "Al corriente", bg: "#D5ECC0", border: "#355E3B", color: "#355E3B" },
                { val: cntPending, lbl: "Por vencer",   bg: "#F4ECD8", border: "#A88B58", color: "#7B5C38" },
                { val: cntOverdue, lbl: "Vencidas",     bg: cntOverdue > 0 ? "#FCE0DC" : "#EDE8DF", border: cntOverdue > 0 ? "#C0392B" : "#A09080", color: cntOverdue > 0 ? "#C0392B" : "var(--mu)" },
              ].map((c, i) => (
                <div key={i} style={{
                  background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10,
                  padding: "10px 6px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem",
                    fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.val}</div>
                  <div style={{ fontSize: ".64rem", fontWeight: 700, color: c.color,
                    marginTop: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla por fraccionamiento */}
      {isLoading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>Cargando…</div>
      ) : byFrac.length === 0 ? <EmptyReport /> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fraccionamiento</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Disponible</th>
                <th style={{ textAlign: "right" }}>Apartado</th>
                <th style={{ textAlign: "right" }}>Vendido</th>
                <th style={{ textAlign: "right" }}>% Vendido</th>
              </tr>
            </thead>
            <tbody>
              {byFrac.map((f, index) => (
                <tr key={`${f.name}-${index}`}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{f.total}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#2D6A26" }}>{f.available}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#856404" }}>{f.reserved}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#7B241C" }}>{f.sold}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ width: 60, height: 6, borderRadius: 4, background: "var(--bg2)" }}>
                        <div style={{ height: 6, borderRadius: 4, background: "#355E3B", width: `${Math.round(f.sell_rate * 100)}%` }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".8rem" }}>
                        {Math.round(f.sell_rate * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══ PÁGINA PRINCIPAL ════════════════════════════════════════ */
const TABS = [
  { key: "ventas", label: "Ventas", icon: HiChartBarSquare, desc: "Cierres e ingresos" },
  { key: "cobranza", label: "Cobranza", icon: HiBanknotes, desc: "Pagos y mora" },
  { key: "inventario", label: "Inventario", icon: HiArchiveBox, desc: "Lotes y disponibilidad" },
];

function ReportsPage() {
  const [tab, setTab] = useState("ventas");

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">📊 Reportes</div>
      </div>
      <div className="card-body">

        {/* Tabs */}
        <div className="reports-tabs" role="tablist" aria-label="Tipo de reporte">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? "is-active" : ""}
              onClick={() => setTab(t.key)}
            >
              <t.icon aria-hidden="true" />
              <span>
                <strong>{t.label}</strong>
                <small>{t.desc}</small>
              </span>
            </button>
          ))}
        </div>

        <section className="reports-panel" role="tabpanel">
          {tab === "ventas"     && <TabVentas />}
          {tab === "cobranza"   && <TabCobranza />}
          {tab === "inventario" && <TabInventario />}
        </section>

      </div>
    </>
  );
}
