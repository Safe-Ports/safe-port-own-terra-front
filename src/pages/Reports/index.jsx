import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineMagnifyingGlass, HiOutlinePrinter, HiOutlineUserCircle,
  HiOutlineExclamationTriangle, HiOutlineCheckCircle,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { clientService } from "@/services/clientService";
import { currency, compactCurrency } from "@/services/formatters";

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
const AV_COLORS = ["#355E3B", "#7B5C38", "#1E3D2B", "#355E3B", "#6B4E2A"];
function Avatar({ name = "?", size = 32 }) {
  const col = AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
  const init = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: col,
      color: "#fff", fontWeight: 800, fontSize: `${size * 0.36}px`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>{init}</div>
  );
}

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
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + PAD_T + PAD_B}`} style={{ display: "block" }}>
        {/* grid + ejes Y */}
        {ticks.map(p => {
          const y = PAD_T + H - p * H;
          return (
            <g key={p}>
              <line x1={PAD_L} x2={W - 4} y1={y} y2={y}
                stroke="#E4DDD3" strokeWidth={1}
                strokeDasharray={p > 0 ? "2 3" : "none"} />
              <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#83867C" fontWeight="600">
                {p === 0 ? "0" : compactCurrency(Math.round(p * maxV)).replace("$", "")}
              </text>
            </g>
          );
        })}
        {/* barras */}
        {data.map((d, i) => {
          const x = PAD_L + i * COL_W + (COL_W - BW) / 2;
          const dueH     = Math.max((d.due     / maxV) * H, d.due     > 0 ? 3 : 0);
          const paidH    = Math.max((d.paid    / maxV) * H, d.paid    > 0 ? 3 : 0);
          const overdueH = Math.max((d.overdue / maxV) * H, d.overdue > 0 ? 3 : 0);
          const isHov = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}>
              {/* fondo programado */}
              <rect x={x} y={PAD_T + H - dueH} width={BW} height={dueH}
                fill="#EDE8DF" rx={3} opacity={isHov ? 1 : 0.9} />
              {/* paid encima */}
              {paidH > 0 && (
                <rect x={x} y={PAD_T + H - paidH} width={BW} height={paidH}
                  fill="#355E3B" rx={3} opacity={isHov ? 1 : 0.92} />
              )}
              {/* overdue marker */}
              {overdueH > 0 && (
                <rect x={x} y={PAD_T + H - overdueH} width={BW} height={overdueH}
                  fill="#C0392B" rx={3} opacity={0.85} />
              )}
              {/* valor encima de la barra (solo si paid > 0) */}
              {paidH > 0 && (
                <text x={x + BW / 2} y={PAD_T + H - paidH - 4}
                  textAnchor="middle" fontSize="8" fill="#355E3B" fontWeight="800">
                  ${Math.round(d.paid)}
                </text>
              )}
              {/* label X */}
              <text x={x + BW / 2} y={H + PAD_T + 12}
                textAnchor="middle" fontSize="9" fill="#3A3228" fontWeight="700">
                {d.label}
              </text>
              <text x={x + BW / 2} y={H + PAD_T + 22}
                textAnchor="middle" fontSize="7.5" fill="#83867C">
                {d.year}
              </text>
            </g>
          );
        })}
        {/* línea de tendencia (paid) */}
        <polyline
          points={linePoints.map(p => p.join(",")).join(" ")}
          fill="none" stroke="#355E3B" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          opacity={0.6}
        />
        {linePoints.map(([x, y], i) => (
          data[i].paid > 0 && (
            <circle key={i} cx={x} cy={y} r={2.5} fill="#355E3B" />
          )
        ))}
      </svg>

      {hover !== null && data[hover] && (
        <div style={{
          position: "absolute", top: 6,
          left: `${(hover / data.length) * 88 + 6}%`,
          transform: hover > data.length * 0.7 ? "translateX(-105%)" : "none",
          background: "var(--tx)", color: "#fff", borderRadius: 10,
          padding: "8px 12px", fontSize: ".74rem", pointerEvents: "none",
          zIndex: 10, minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,.2)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, color: "var(--tan-lt)",
            textTransform: "capitalize" }}>{data[hover].fullLabel}</div>
          {[
            ["Programado", data[hover].due,     "#A09080"],
            ["Pagado",     data[hover].paid,    "#355E3B"],
            ["Vencido",    data[hover].overdue, "#C0392B"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: 1, background: c }} />
              <span style={{ color: "#ccc" }}>{l}:</span>
              <strong>{currency(v)}</strong>
            </div>
          ))}
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
        <button onClick={handlePrint} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
          borderRadius: 12, border: "none", cursor: "pointer",
          background: "var(--navy)", color: "#fff", fontWeight: 700,
          fontSize: ".82rem", fontFamily: "inherit",
          boxShadow: "0 4px 14px rgba(27,43,24,.25)",
        }}>
          <HiOutlinePrinter style={{ fontSize: "1rem" }}/> Imprimir reporte
        </button>
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

          {/* Contratos */}
          <div style={{ background: "var(--sf)", border: "1px solid var(--bd)",
            borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px 8px",
              borderBottom: "1.5px solid var(--tan-lt)",
              fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--tan-dk)" }}>
              Contratos ({contracts.length})
            </div>
            {contracts.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--mu)", fontSize: ".82rem" }}>
                Sin contratos registrados.
              </div>
            ) : (
              <table className="tbl rp-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? "#FAF7EF" : "transparent" }}>
                      <td style={{ fontWeight: 700, fontSize: ".8rem" }}>{c.contract_number}</td>
                      <td style={{ fontSize: ".8rem", color: "var(--tx2)" }}>{TYPE_LABEL[c.type] || c.type}</td>
                      <td style={{ fontWeight: 700, color: "var(--tx)", textAlign: "right", whiteSpace: "nowrap" }}>
                        {currency(c.amount)}
                      </td>
                      <td style={{ fontSize: ".75rem", color: "var(--mu)", whiteSpace: "nowrap" }}>{fmtD(c.contract_date)}</td>
                      <td>
                        <span className="rp-badge rp-badge-active">
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── FILA 3: Plan de Pagos (full width) ─── */}
        <div style={{ background: "var(--sf)", border: "1px solid var(--bd)",
          borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            padding: "12px 16px 8px", borderBottom: "1.5px solid var(--tan-lt)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--tan-dk)" }}>
              Plan de Pagos ({payments.length})
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <span className="rp-pill rp-pill-paid">#{cntPaid} pagado</span>
              <span className="rp-pill rp-pill-pending">#{cntPending} pendiente</span>
              {cntOverdue > 0 && (
                <span className="rp-pill rp-pill-overdue">#{cntOverdue} vencido</span>
              )}
            </div>
          </div>
          {payments.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--mu)", fontSize: ".82rem" }}>
              Sin pagos registrados.
            </div>
          ) : (
            <div className="rp-payments-scroll" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table className="tbl rp-table">
                <thead style={{ position: "sticky", top: 0, background: "var(--sf2)", zIndex: 1 }}>
                  <tr>
                    <th>Cuota</th>
                    <th>Contrato</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                    <th>Vence</th>
                    <th>Pagado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .sort((a, b) => (a.installment_n || 0) - (b.installment_n || 0))
                    .map((p, i) => {
                      const ct = contracts.find(c => c.id === p.contract_id);
                      return (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? "#FAF7EF" : "transparent" }}>
                          <td style={{ fontWeight: 700, fontSize: ".8rem", textAlign: "center" }}>#{p.installment_n}</td>
                          <td style={{ fontSize: ".78rem", color: "var(--tx2)" }}>
                            {ct?.contract_number || "—"}
                          </td>
                          <td style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
                            {currency(p.amount)}
                          </td>
                          <td style={{ fontSize: ".75rem", color: "var(--mu)", whiteSpace: "nowrap" }}>{fmtD(p.due_date)}</td>
                          <td style={{ fontSize: ".75rem", color: p.paid_date ? "var(--forest)" : "var(--mu)", fontWeight: p.paid_date ? 700 : 400, whiteSpace: "nowrap" }}>
                            {p.paid_date ? fmtD(p.paid_date) : "—"}
                          </td>
                          <td>
                            <span className={`rp-badge ${p.status === "paid" ? "rp-badge-active" : p.status === "overdue" ? "rp-badge-overdue" : "rp-badge-pending"}`}>
                              {ESTADO_LABEL[p.status] || p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── FOOTER del documento ─── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid var(--line-soft)", paddingTop: 16, marginTop: 8,
          fontSize: ".72rem", color: "var(--mu)",
        }}>
          <div>Documento generado el {fmtDLong(new Date().toISOString().split("T")[0])}</div>
          <OwnTerraWordmark />
          <div style={{ fontWeight: 600 }}>Página 1 de 1</div>
        </div>
      </div>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { clients } = useAppContext();
  const [search, setSearch]   = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filteredClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(c =>
      `${c.name} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(s)
    );
  }, [clients, search]);

  return (
    <>
      <style>{`
        /* ── Estilos exclusivos del reporte ── */
        .rp-table th {
          background: #F4ECD8;
          color: #355E3B !important;
          font-size: .65rem !important;
          padding: 8px 10px !important;
          font-weight: 800 !important;
          letter-spacing: .08em !important;
          border-bottom: 1.5px solid var(--tan-lt) !important;
        }
        .rp-table td {
          padding: 8px 10px !important;
          font-size: .8rem;
          border-bottom: 1px solid #F0EBE0 !important;
        }
        .rp-table tr:last-child td { border-bottom: none !important; }

        .rp-badge {
          display: inline-block;
          padding: 3px 9px;
          border-radius: 99px;
          font-size: .62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .05em;
        }
        .rp-badge-active  { background:#D5ECC0; color:#355E3B; border:1px solid #355E3B; }
        .rp-badge-pending { background:#F4ECD8; color:#7B5C38; border:1px solid #A88B58; }
        .rp-badge-overdue { background:#FCE0DC; color:#C0392B; border:1px solid #C0392B; }

        .rp-pill {
          font-size: .62rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 99px;
          letter-spacing: .03em;
        }
        .rp-pill-paid    { background:#D5ECC0; color:#355E3B; }
        .rp-pill-pending { background:#EDE8DF; color:#3A3228; }
        .rp-pill-overdue { background:#FCE0DC; color:#C0392B; }

        /* Print rules */
        @media print {
          .sb, .topbar, .no-print { display: none !important; }
          .main, .content, .view, .view-scroll { padding: 0 !important; overflow: visible !important; }
          .app-shell { display: block !important; height: auto !important; }
          #rp-print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 24px 28px !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            background: #fff !important;
          }
          #rp-print-area > * { break-inside: avoid; page-break-inside: avoid; }
          .rp-payments-scroll { max-height: none !important; overflow: visible !important; }
          body, html { background: #fff !important; }
        }
      `}</style>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div className="no-print">
          <ClientList
            clients={filteredClients}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            onSearch={setSearch}
          />
        </div>
        {selectedId ? <ClientReport clientId={selectedId} /> : <EmptyReport />}
      </div>
    </>
  );
}
