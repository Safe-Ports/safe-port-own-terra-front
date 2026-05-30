import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCalendar,
  HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineChevronDown,
  HiOutlineFunnel, HiOutlineEllipsisVertical,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { expenseService, CAT_LABEL, CAT_STYLE } from "@/services/expenseService";
import { currency, relativeDays } from "@/services/formatters";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Input from "@/components/Input";

/* ── helpers ─────────────────────────────────────────────────── */
const ESTADO_LABEL = { pending: "Pendiente", paid: "Pagado", overdue: "Vencido" };
const fmtD = iso => !iso ? "—" : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

function badgeCls(iso, status) {
  if (status === "paid") return "paid";
  const d = relativeDays(iso);
  return d < 0 ? "overdue" : d <= 7 ? "upcoming" : "ok";
}
function badgeLbl(iso, status) {
  if (status === "paid") return "Aplicado";
  const d = relativeDays(iso);
  return d < 0 ? `${d} días` : `en ${d} días`;
}

function getDateRange(periodo) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const iso = d => d.toISOString().split("T")[0];
  if (periodo === "este-mes")  return { desde: iso(new Date(y, m, 1)),   hasta: iso(new Date(y, m + 1, 0)) };
  if (periodo === "mes-ant")   return { desde: iso(new Date(y, m - 1, 1)),hasta: iso(new Date(y, m, 0))     };
  if (periodo === "3meses")    return { desde: iso(new Date(y, m - 3, n.getDate())), hasta: iso(n)          };
  if (periodo === "6meses")    return { desde: iso(new Date(y, m - 6, n.getDate())), hasta: iso(n)          };
  if (periodo === "todo")      return { desde: "", hasta: "" };
  return null; // "custom" → no cambiar
}

const PERIODO_LABEL = {
  "este-mes": "Este mes", "mes-ant": "Mes anterior",
  "3meses": "Últimos 3 meses", "6meses": "Últimos 6 meses",
  "todo": "Todo el tiempo", "custom": "Personalizado",
};

function inRange(iso, desde, hasta) {
  if (!desde && !hasta) return true; // sin filtro de fecha → todo pasa
  if (!iso) return false;
  if (desde && iso < desde) return false;
  if (hasta && iso > hasta) return false;
  return true;
}

function applyFilters(rows, { search, estado, desde, hasta }) {
  const s = search.trim().toLowerCase();
  return rows.filter(r => {
    if (s) {
      const hay = `${r.asociado ?? ""} ${r.concepto ?? ""} ${r.concepto_raw ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (estado && estado !== "all" && (r.status ?? r.estado) !== estado) return false;
    if (desde || hasta) {
      const v = r.vence ?? r.due_date ?? "";
      if (desde && v < desde) return false;
      if (hasta && v > hasta) return false;
    }
    return true;
  });
}

function paginate(rows, page, limit) {
  const start = (page - 1) * limit;
  return rows.slice(start, start + limit);
}

function getMonthlyData(ingresos, expenses) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
             label: d.toLocaleDateString("es-MX", { month: "short" }), ingresos: 0, egresos: 0 };
  });
  ingresos.filter(p => p.status === "paid").forEach(p => {
    const k = (p.paid_date || p.due_date || "").slice(0, 7);
    const m = months.find(m => m.key === k);
    if (m) m.ingresos += Number(p.amount || 0);
  });
  expenses.filter(e => e.status === "paid").forEach(e => {
    const k = (e.paid_date || e.due_date || "").slice(0, 7);
    const m = months.find(m => m.key === k);
    if (m) m.egresos += Number(e.monto || 0);
  });
  return months;
}

/* ── Gráfica SVG ─────────────────────────────────────────────── */
function BarChart({ data }) {
  const max = Math.max(...data.map(d => Math.max(d.ingresos, d.egresos)), 1);
  const H = 70; const BW = 10; const GAP = 3; const GW = BW * 2 + GAP + 14;
  return (
    <svg width="100%" viewBox={`0 0 ${GW * data.length} ${H + 18}`} style={{ overflow: "visible", flex: 1 }}>
      {data.map((d, i) => {
        const x = i * GW + 7;
        const inH = Math.max((d.ingresos / max) * H, d.ingresos > 0 ? 3 : 0);
        const egH = Math.max((d.egresos  / max) * H, d.egresos  > 0 ? 3 : 0);
        return (
          <g key={d.key}>
            <title>{d.label}: Ingresos {currency(d.ingresos)} / Egresos {currency(d.egresos)}</title>
            <rect x={x}             y={H - inH} width={BW} height={inH} fill="#355E3B" rx={2} opacity={0.85} />
            <rect x={x + BW + GAP}  y={H - egH} width={BW} height={egH} fill="#43453F" rx={2} opacity={0.85} />
            <text x={x + BW} y={H + 14} textAnchor="middle" fontSize="8" fill="#83867C">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* Avatar: use shared component from src/components/Avatar.jsx */

/* ── SmartFilterBar ──────────────────────────────────────────── */
function SmartFilterBar({ search, onSearch, estado, onEstado, periodo, onPeriodo, desde, onDesde, hasta, onHasta, estadoOptions }) {
  const sel = { appearance: "none", border: "1.5px solid var(--bd)", borderRadius: 10,
    fontSize: ".82rem", fontWeight: 600, background: "#fff", color: "var(--tx)",
    cursor: "pointer", fontFamily: "inherit", outline: "none" };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14,
      background: "var(--sf)", border: "1px solid rgba(67,69,63,.1)", borderRadius: 18,
      padding: "12px 16px", boxShadow: "0 12px 30px rgba(30,61,43,.06)" }}>

      {/* Búsqueda */}
      <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
        <HiOutlineMagnifyingGlass style={{ position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".95rem", pointerEvents: "none" }} />
        <Input value={search} onChange={onSearch} placeholder="Buscar por asociado, concepto o cuota…" style={{ paddingLeft: 35 }} />
      </div>

      {/* Estado */}
      <div style={{ position: "relative" }}>
        <select value={estado} onChange={e => onEstado(e.target.value)}
          style={{ ...sel, padding: "7px 30px 7px 12px" }}>
          {estadoOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <HiOutlineChevronDown style={{ position: "absolute", right: 8, top: "50%",
          transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".75rem", pointerEvents: "none" }} />
      </div>

      {/* Período */}
      <div style={{ position: "relative" }}>
        <HiOutlineCalendar style={{ position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".9rem", pointerEvents: "none" }} />
        <select value={periodo} onChange={e => onPeriodo(e.target.value)}
          style={{ ...sel, padding: "7px 30px 7px 30px" }}>
          {Object.entries(PERIODO_LABEL).map(([v, l]) => <option key={v} value={v}>Período: {l}</option>)}
        </select>
        <HiOutlineChevronDown style={{ position: "absolute", right: 8, top: "50%",
          transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".75rem", pointerEvents: "none" }} />
      </div>

      {/* Desde */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--mu)" }}>Desde</span>
        <input type="date" value={desde} onChange={e => onDesde(e.target.value)}
          style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "6px 10px",
            fontSize: ".8rem", background: "#fff", fontFamily: "inherit", outline: "none", cursor: "pointer" }} />
      </div>

      {/* Hasta */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--mu)" }}>Hasta</span>
        <input type="date" value={hasta} onChange={e => onHasta(e.target.value)}
          style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "6px 10px",
            fontSize: ".8rem", background: "#fff", fontFamily: "inherit", outline: "none", cursor: "pointer" }} />
      </div>

      {/* Limpiar */}
      {(search || estado !== "all" || desde || hasta) && (
        <Button variant="secondary" onClick={() => { onSearch(""); onEstado("all"); onPeriodo("este-mes"); }}>
          <HiOutlineXMark /> Limpiar
        </Button>
      )}
    </div>
  );
}

/* ── Paginación ──────────────────────────────────────────────── */
function Pagination({ total, page, limit, onPage, onLimit }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);
  const btnStyle = (disabled) => ({
    width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bd)",
    background: disabled ? "var(--sf2)" : "#fff", color: disabled ? "var(--mu)" : "var(--tx)",
    cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: ".8rem", fontFamily: "inherit", fontWeight: 700,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", borderTop: "1px solid var(--line-soft)", background: "var(--sf2)",
      flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: ".75rem", color: "var(--mu)" }}>
        Mostrando {from} a {to} de {total} resultados
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button style={btnStyle(page === 1)}     disabled={page === 1}     onClick={() => onPage(1)}>«</button>
        <button style={btnStyle(page === 1)}     disabled={page === 1}     onClick={() => onPage(page - 1)}>‹</button>
        <span style={{ padding: "4px 12px", borderRadius: 8, background: "#1E3D2B",
          color: "#E9E5DB", fontSize: ".8rem", fontWeight: 700 }}>{page}</span>
        <button style={btnStyle(page >= pages)} disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
        <button style={btnStyle(page >= pages)} disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      </div>
      <select value={limit} onChange={e => { onLimit(Number(e.target.value)); onPage(1); }}
        style={{ border: "1px solid var(--bd)", borderRadius: 8, padding: "5px 8px",
          fontSize: ".75rem", background: "#fff", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
        {[10, 25, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
      </select>
    </div>
  );
}

/* ── Tabla homologada ────────────────────────────────────────── */
function PagoTable({ rows, isEgreso, historial, onPagar, onRecordar, onEdit, onDelete }) {
  const accent = isEgreso ? "#43453F" : "#1E3D2B";
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Asociado a</th>
          <th>Concepto</th>
          {!isEgreso && <th>Cuota</th>}
          <th>Monto</th>
          <th>Vence</th>
          <th>Estado</th>
          <th>Días</th>
          {!historial && <th/>}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const status  = r.status ?? r.estado;
          const vence   = r.vence ?? r.due_date;
          const cls     = badgeCls(vence, status);
          const lbl     = badgeLbl(vence, status);
          const rowBg   = !historial && cls === "overdue" ? "#fff9f9"
                        : !historial && cls === "upcoming" ? "#fdfbf5" : "";
          const catSt   = isEgreso ? (CAT_STYLE[r.categoria] || CAT_STYLE.otro) : null;
          return (
            <tr key={r.id} style={rowBg ? { background: rowBg } : {}}>
              {/* Asociado */}
              <td>
                {isEgreso ? (
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999,
                    fontSize: ".7rem", fontWeight: 700, background: catSt.bg, color: catSt.color }}>
                    {CAT_LABEL[r.categoria] || r.categoria}
                  </span>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={r.asociado || "?"} />
                    <span style={{ fontWeight: 600, fontSize: ".84rem" }}>{r.asociado}</span>
                  </div>
                )}
              </td>
              {/* Concepto */}
              <td style={{ maxWidth: 220 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", fontSize: ".82rem", color: "var(--tx2)" }} title={r.concepto}>
                  {r.concepto_raw || r.concepto}
                </span>
              </td>
              {/* Cuota (solo ingresos) */}
              {!isEgreso && (
                <td style={{ textAlign: "center", color: "var(--mu)", fontSize: ".82rem", whiteSpace: "nowrap" }}>
                  {r.installment_n ?? "—"}
                </td>
              )}
              {/* Monto */}
              <td style={{ fontWeight: 800, color: accent, whiteSpace: "nowrap" }}>
                {currency(r.monto ?? r.amount)}
              </td>
              {/* Vence */}
              <td style={{ color: "var(--mu)", fontSize: ".8rem", whiteSpace: "nowrap" }}>{fmtD(vence)}</td>
              {/* Estado */}
              <td><span className={`pc-chip ${status}`}>{ESTADO_LABEL[status] || status}</span></td>
              {/* Días */}
              <td><span className={`days-badge ${cls}`}>{lbl}</span></td>
              {/* Acciones */}
              {!historial && (
                <td>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {status !== "paid" && (
                      <button onClick={() => onPagar(r)} className={isEgreso ? "btn-s" : "btn-p"} style={{ padding: "6px 12px", fontSize: ".74rem", whiteSpace: "nowrap" }}>
                        {isEgreso ? "Pagar" : "Cobrar"}
                      </button>
                    )}
                    {status === "overdue" && !isEgreso && (
                      <button onClick={() => onRecordar?.(r)} className="btn-s" style={{ padding: "6px 10px", fontSize: ".75rem", fontWeight: 700, color: "var(--earth)", borderColor: "rgba(67,69,63,.12)" }}>
                        Recordar
                      </button>
                    )}
                    {isEgreso && (
                      <>
                        <button onClick={() => onEdit?.(r)} className="btn-s" style={{ padding: "6px 8px", fontSize: ".78rem", display: "inline-flex", alignItems: "center" }}>
                          <HiOutlinePencil />
                        </button>
                        <button onClick={() => onDelete?.(r.id)} className="btn-s" style={{ padding: "6px 8px", fontSize: ".78rem", display: "inline-flex", alignItems: "center", color: "var(--danger)" }}>
                          <HiOutlineTrash />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── Modal egreso ────────────────────────────────────────────── */
function EgresoModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    concepto:    initial?.concepto    || "",
    categoria:   initial?.categoria   || "servicios",
    monto:       initial?.monto       || "",
    due_date:    initial?.due_date    || new Date().toISOString().split("T")[0],
    recurrencia: initial?.recurrencia || "",
    notes:       initial?.notes       || "",
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-hd">
          <div className="modal-ico">💸</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>{initial ? "Editar egreso" : "Nuevo egreso"}</div>
            <div className="modal-sub">Gasto interno de la empresa</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <div className="fg"><label className="fl">Concepto</label>
            <input className="fi" value={form.concepto} onChange={set("concepto")} placeholder="Nómina junio, CFE…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">Categoría</label>
              <select className="fi" value={form.categoria} onChange={set("categoria")}>
                {Object.entries(CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="fg"><label className="fl">Monto</label>
              <input className="fi" type="number" value={form.monto} onChange={set("monto")} placeholder="0" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">Fecha límite</label>
              <input className="fi" type="date" value={form.due_date} onChange={set("due_date")} /></div>
            <div className="fg"><label className="fl">Recurrencia</label>
              <select className="fi" value={form.recurrencia} onChange={set("recurrencia")}>
                <option value="">Sin recurrencia</option>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select></div>
          </div>
          <div className="fg"><label className="fl">Notas (opcional)</label>
            <input className="fi" value={form.notes} onChange={set("notes")} placeholder="Referencia, proveedor…" /></div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={() => onSave(form)}>
            {initial ? "Guardar cambios" : "Guardar egreso"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal cobro ─────────────────────────────────────────────── */
function CobroModal({ clients, contracts, onClose, onSave }) {
  const [form, setForm] = useState({
    clientId: "", contractId: "", cuota: "", amount: "",
    paid_date: new Date().toISOString().split("T")[0], notes: "",
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const filtContracts = contracts.filter(c => !form.clientId || String(c.client?.id) === form.clientId);
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-hd">
          <div className="modal-ico">💰</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>Registrar cobro</div>
            <div className="modal-sub">Pago de cuota de cliente</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <div className="fg"><label className="fl">Cliente</label>
            <select className="fi" value={form.clientId} onChange={set("clientId")}>
              <option value="">— Seleccionar —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="fg"><label className="fl">Contrato / Lote</label>
            <select className="fi" value={form.contractId} onChange={set("contractId")}>
              <option value="">— Seleccionar —</option>
              {filtContracts.map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
            </select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">N° cuota</label>
              <input className="fi" type="number" value={form.cuota} onChange={set("cuota")} placeholder="1" /></div>
            <div className="fg"><label className="fl">Monto</label>
              <input className="fi" type="number" value={form.amount} onChange={set("amount")} placeholder="0" /></div>
          </div>
          <div className="fg"><label className="fl">Fecha de cobro</label>
            <input className="fi" type="date" value={form.paid_date} onChange={set("paid_date")} /></div>
          <div className="fg"><label className="fl">Notas (opcional)</label>
            <input className="fi" value={form.notes} onChange={set("notes")} placeholder="Transferencia, efectivo…" /></div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={() => onSave(form)}>Registrar cobro</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal selector tipo ─────────────────────────────────────── */
function TipoModal({ onSelect, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-hd">
          <div className="modal-ico">💳</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>Nuevo pago</div>
            <div className="modal-sub">¿Qué tipo de movimiento vas a registrar?</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["cobro",  "💰", "#1E3D2B", "var(--tan-lt)", "Cobro de cliente", "Un cliente pagó su cuota de lote"],
            ["egreso", "💸", "#43453F", "#fef3e2",       "Egreso de empresa","Nómina, servicios, impuestos…"],
          ].map(([type, icon, border, bg, title, sub]) => (
            <button key={type} onClick={() => onSelect(type)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
              border: `2px solid ${border}`, borderRadius: 16, background: bg,
              cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
            }}>
              <span style={{ fontSize: "1.8rem" }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: ".9rem", color: border }}>{title}</div>
                <div style={{ fontSize: ".75rem", color: "var(--mu)", marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════ */
const INIT_PERIOD = "todo";
const { desde: INIT_DESDE, hasta: INIT_HASTA } = getDateRange(INIT_PERIOD); // "", ""

const ESTADO_IN  = [["all","Todos los estados"],["pending","Pendiente"],["overdue","Vencido"],["paid","Pagado"]];
const ESTADO_EG  = [["all","Todos los estados"],["pending","Pendiente"],["overdue","Vencido"],["paid","Pagado"]];
const ESTADO_AL  = [["all","Todas las alertas"],["roja","Urgentes"],["amarilla","Próximas"]];

export default function PaymentsPage() {
  const { payments, clients, contracts, quickPay, sendReminder, showToast } = useAppContext();
  const qc = useQueryClient();

  const [tab,     setTab]     = useState("ingresos");
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [page,    setPage]    = useState(1);
  const [limit,   setLimit]   = useState(10);

  /* filtros compartidos (se resetean al cambiar tab) */
  const [search,  setSearch]  = useState("");
  const [estado,  setEstado]  = useState("all");
  const [periodo, setPeriodo] = useState(INIT_PERIOD);
  const [desde,   setDesde]   = useState(INIT_DESDE);
  const [hasta,   setHasta]   = useState(INIT_HASTA);

  const handlePeriodo = (p) => {
    setPeriodo(p);
    const range = getDateRange(p);
    if (range) { setDesde(range.desde); setHasta(range.hasta); }
    setPage(1);
  };
  const handleDesde = (v) => { setDesde(v); setPeriodo("custom"); setPage(1); };
  const handleHasta = (v) => { setHasta(v); setPeriodo("custom"); setPage(1); };

  const switchTab = t => {
    setTab(t); setSearch(""); setEstado("all");
    setPeriodo(INIT_PERIOD); setDesde(INIT_DESDE); setHasta(INIT_HASTA);
    setPage(1);
  };

  /* ── egresos query ── */
  const { data: expRaw } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expenseService.list({ limit: 500 }).then(r => r.items),
    staleTime: 30_000,
  });
  const expenses = expRaw || [];

  /* ── expense mutations ── */
  const createExpense = useMutation({
    mutationFn: expenseService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setModal(null); showToast("Egreso registrado"); },
    onError: e => showToast(e?.response?.data?.detail || "Error al guardar egreso"),
  });
  const updateExpense = useMutation({
    mutationFn: ({ id, data }) => expenseService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setModal(null); setEditing(null); showToast("Egreso actualizado"); },
    onError: e => showToast(e?.response?.data?.detail || "Error"),
  });
  const deleteExpense = useMutation({
    mutationFn: expenseService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); showToast("Egreso eliminado"); },
  });
  const markPaidExpense = useMutation({
    mutationFn: expenseService.markPaid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); showToast("Egreso marcado como pagado"); },
  });

  /* ── normalizar ingresos ── */
  const ingresos = useMemo(() => payments.map(p => ({
    ...p,
    asociado:    p.client?.name || "—",
    concepto:    p.contract?.contract_number || "—",
    concepto_raw:`Cuota ${p.installment_n} — ${p.contract?.contract_number || ""}`,
    vence:       p.due_date,
    estado:      p.status,
  })), [payments]);

  /* ── normalizar egresos ── */
  const egresosNorm = useMemo(() => expenses.map(e => ({
    ...e, asociado: CAT_LABEL[e.categoria] || e.categoria, vence: e.due_date,
  })), [expenses]);

  /* ── filtros aplicados (sin pre-filtro de status — el dropdown lo maneja todo) ── */
  const F = { search, estado, desde, hasta };

  const inAll = useMemo(() => applyFilters(ingresos,     F), [ingresos,     search, estado, desde, hasta]);
  const egAll = useMemo(() => applyFilters(egresosNorm,  F), [egresosNorm,  search, estado, desde, hasta]);

  /* ── KPIs respetan desde/hasta ── */
  const inCobrado      = ingresos.filter(p => p.status === "paid" && inRange(p.due_date, desde, hasta));
  const inPendienteArr = ingresos.filter(p => p.status !== "paid" && inRange(p.due_date, desde, hasta));
  const inCobradoAmt   = inCobrado.reduce((s, p) => s + Number(p.amount || 0), 0);
  const inPendienteAmt = inPendienteArr.reduce((s, p) => s + Number(p.amount || 0), 0);
  const monthlyData    = useMemo(() => getMonthlyData(ingresos, expenses), [ingresos, expenses]);

  /* ── alertas ── */
  const alertas = useMemo(() => {
    const out = [];
    ingresos.filter(p => p.status === "overdue" || (p.status === "pending" && relativeDays(p.due_date) <= 7 && relativeDays(p.due_date) >= 0))
      .forEach(p => out.push({
        tipo: "ingreso", urgencia: p.status === "overdue" ? "roja" : "amarilla",
        titulo: `${p.status === "overdue" ? "Cuota vencida" : "Vence pronto"} — ${p.client?.name || ""}`,
        detalle: `${p.contract?.contract_number || ""} · Cuota ${p.installment_n} · ${currency(p.amount)}`,
        hace: p.status === "overdue" ? `hace ${Math.abs(relativeDays(p.due_date))} días` : fmtD(p.due_date),
        raw: p,
      }));
    egresosNorm.filter(e => e.status === "overdue" || (e.status === "pending" && relativeDays(e.due_date) <= 7 && relativeDays(e.due_date) >= 0))
      .forEach(e => out.push({
        tipo: "egreso", urgencia: e.status === "overdue" ? "roja" : "amarilla",
        titulo: `${e.status === "overdue" ? "Pago vencido" : "Vence pronto"} — ${e.concepto}`,
        detalle: `${CAT_LABEL[e.categoria] || e.categoria} · ${currency(e.monto)}`,
        hace: e.status === "overdue" ? `hace ${Math.abs(relativeDays(e.due_date))} días` : fmtD(e.due_date),
        raw: e,
      }));
    return out.sort((a, b) => (a.urgencia === "roja" ? 0 : 1) - (b.urgencia === "roja" ? 0 : 1));
  }, [ingresos, egresosNorm]);

  const alertasRojas = alertas.filter(a => a.urgencia === "roja").length;
  const filtAlertas  = alertas.filter(a => estado === "all" || a.urgencia === estado);

  const isIn = tab === "ingresos", isEg = tab === "egresos";

  const allRows  = isIn ? inAll : egAll;
  const pageRows = paginate(allRows, page, limit);

  /* header dinámico basado en el filtro activo */
  const sectionHd = () => {
    if (isIn) {
      if (estado === "paid")    return "Historial de cobros";
      if (estado === "overdue") return "Cobros vencidos";
      if (estado === "pending") return "Cobros pendientes";
      return "Todos los cobros";
    }
    if (estado === "paid")    return "Historial de egresos";
    if (estado === "overdue") return "Egresos vencidos";
    if (estado === "pending") return "Egresos pendientes";
    return "Todos los egresos";
  };

  const estadoOptions = isIn ? ESTADO_IN : isEg ? ESTADO_EG : ESTADO_AL;

  /* ── handlers ── */
  const handlePagar = r => isEg ? markPaidExpense.mutate(r.id) : quickPay(r.id, Number(r.amount));
  const handleSaveEgreso = form => {
    const body = { concepto: form.concepto, categoria: form.categoria, monto: Number(form.monto),
      due_date: form.due_date, recurrencia: form.recurrencia || null, notes: form.notes || null };
    editing ? updateExpense.mutate({ id: editing.id, data: body }) : createExpense.mutate(body);
  };

  return (
    <>
      <style>{`
        .pv2-tabs { display:flex;gap:3px;background:#EDE9DF;border:1px solid rgba(67,69,63,.1);border-radius:12px;padding:4px;width:fit-content; }
        .pv2-tab  { padding:8px 18px;border-radius:9px;border:none;background:transparent;font-size:.82rem;font-weight:600;cursor:pointer;color:var(--mu);font-family:inherit;display:flex;align-items:center;gap:6px;transition:all .15s; }
        .pv2-tab.act-in { background:rgba(111,175,107,.18); color:#2F6A38; }
        .pv2-tab.act-eg { background:rgba(67,69,63,.1); color:#43453F; }
        .pv2-tab.act-al { background:#FDECEA; color:#C0392B; }
        .pv2-subtabs { display:flex;background:var(--sf2);border-radius:10px;padding:3px;width:fit-content; }
        .pv2-subtab  { padding:6px 16px;border-radius:8px;border:none;background:transparent;font-size:.78rem;font-weight:600;cursor:pointer;color:var(--mu);font-family:inherit; }
        .pv2-subtab.act { background:var(--sf);color:var(--tx);box-shadow:0 1px 3px rgba(30,61,43,.1); }
        .pv2-wrap { background:var(--sf);border:1px solid rgba(67,69,63,.1);border-radius:22px;overflow:hidden;box-shadow:0 12px 30px rgba(30,61,43,.06); }
        .pv2-sect-hd { font-size:.6rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mu);padding:14px 18px 8px;border-bottom:1px solid rgba(67,69,63,.08);display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace; }
        .pv2-pill { padding:6px 13px;border-radius:30px;border:1px solid rgba(67,69,63,.12);background:var(--sf);font-size:.72rem;font-weight:600;color:var(--tx2);cursor:pointer;font-family:inherit;transition:all .15s; }
        .pv2-pill:hover { border-color:var(--leaf); }
        .pv2-pill.act-g { background:rgba(111,175,107,.15);color:#2F6A38;border-color:rgba(111,175,107,.4); }
        .pv2-pill.act-r { background:#FDECEA;color:#C0392B;border-color:#F2C4BE; }
        .pv2-pill.act-e { background:rgba(67,69,63,.1);color:#43453F;border-color:rgba(67,69,63,.18); }
        .al-row { display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(67,69,63,.08); }
        .al-row:last-child { border-bottom:none; }
        .al-row:hover { background:var(--sf2); }
        .al-badge { width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.95rem; }
        .al-badge.roja { background:#FDECEA; }
        .al-badge.amarilla { background:#FEF3E2; }
        .al-tipo { font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:30px;font-family:'JetBrains Mono',monospace; }
        .al-tipo.ingreso { background:rgba(111,175,107,.14);color:#2F6A38; }
        .al-tipo.egreso  { background:rgba(67,69,63,.1);color:#43453F; }
        .al-action { margin-left:auto;padding:7px 15px;border-radius:9px;border:1px solid rgba(67,69,63,.18);cursor:pointer;font-size:.74rem;font-weight:600;white-space:nowrap;font-family:inherit;transition:all .15s; }
        .al-action.cobrar { background:rgba(111,175,107,.13);color:#2F6A38;border-color:rgba(111,175,107,.3); }
        .al-action.cobrar:hover { background:rgba(111,175,107,.2); }
        .al-action.pagar  { background:var(--sf);color:var(--tx2); }
        .al-action.pagar:hover { background:var(--sf2); }
        .al-action.recordar { background:#FEF3E2;color:#9D6B18;border-color:#F0DCB8; }
      `}</style>

      {/* ── KPIs + gráfica ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 20 }}>
        <div className="kpi k1">
          <div className="kpi-lbl">Cobrado — {PERIODO_LABEL[periodo]}</div>
          <div className="kpi-val" style={{ fontSize: "1.35rem", color: "var(--forest)" }}>{currency(inCobradoAmt)}</div>
          <div className="kpi-sub">{inCobrado.length} cobro{inCobrado.length !== 1 ? "s" : ""} aplicado{inCobrado.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="kpi k2">
          <div className="kpi-lbl">Pendiente — {PERIODO_LABEL[periodo]}</div>
          <div className="kpi-val" style={{ fontSize: "1.35rem", color: "var(--earth)" }}>{currency(inPendienteAmt)}</div>
          <div className="kpi-sub">{inPendienteArr.length} cuota{inPendienteArr.length !== 1 ? "s" : ""} por cobrar</div>
        </div>
        <div className="kpi" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="kpi-lbl" style={{ margin: 0 }}>Tendencia — últimos 6 meses</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[["var(--forest)", "Ingresos"], ["#43453F", "Egresos"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".68rem", color: "var(--mu)" }}>
                  <div style={{ width: 8, height: 8, background: c, borderRadius: 2, flexShrink: 0 }} />{l}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
            <BarChart data={monthlyData} />
          </div>
        </div>
      </div>

      {/* ── Tabs + botón ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div className="pv2-tabs">
          <button className={`pv2-tab${tab === "ingresos" ? " act-in" : ""}`} onClick={() => switchTab("ingresos")}>💰 Ingresos</button>
          <button className={`pv2-tab${tab === "egresos"  ? " act-eg" : ""}`} onClick={() => switchTab("egresos") }>💸 Egresos</button>
          <button className={`pv2-tab${tab === "alertas"  ? " act-al" : ""}`} onClick={() => switchTab("alertas") }>
            🔔 Alertas
            {alertasRojas > 0 && <span style={{ background: "var(--danger)", color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: ".65rem" }}>{alertasRojas}</span>}
          </button>
        </div>
        <button className="btn-p" onClick={() => setModal("tipo")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HiOutlinePlus /> Nuevo pago
        </button>
      </div>

      {/* ── Filter bar (todas las tabs) ── */}
      <SmartFilterBar
        search={search}   onSearch={v => { setSearch(v); setPage(1); }}
        estado={estado}   onEstado={v => { setEstado(v); setPage(1); }}
        periodo={periodo} onPeriodo={handlePeriodo}
        desde={desde}     onDesde={handleDesde}
        hasta={hasta}     onHasta={handleHasta}
        estadoOptions={estadoOptions}
      />

      {/* ══ INGRESOS / EGRESOS ══ */}
      {(isIn || isEg) && (
        <>
          <div className="pv2-wrap">
            <div className="pv2-sect-hd">
              {sectionHd()}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: ".7rem", color: "#bbb", marginLeft: 4 }}>
                ({allRows.length})
              </span>
            </div>
            {allRows.length === 0 ? (
              <div style={{ padding: "36px 0", textAlign: "center", color: "var(--mu)", fontSize: ".83rem" }}>
                Sin registros para estos filtros.
              </div>
            ) : (
              <PagoTable
                rows={pageRows}
                isEgreso={isEg}
                historial={estado === "paid"}
                onPagar={handlePagar}
                onRecordar={p => sendReminder(p)}
                onEdit={e => { setEditing(e); setModal("egreso"); }}
                onDelete={id => window.confirm("¿Eliminar este egreso?") && deleteExpense.mutate(id)}
              />
            )}
            <Pagination total={allRows.length} page={page} limit={limit} onPage={setPage} onLimit={v => { setLimit(v); setPage(1); }} />
          </div>
        </>
      )}

      {/* ══ ALERTAS ══ */}
      {tab === "alertas" && (
        <div className="pv2-wrap">
          <div className="pv2-sect-hd">
            Alertas activas
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: ".7rem", color: "#bbb", marginLeft: 4 }}>({filtAlertas.length})</span>
          </div>
          {filtAlertas.length === 0 ? (
            <div style={{ padding: "36px 0", textAlign: "center", color: "var(--mu)", fontSize: ".83rem" }}>Sin alertas activas. 🎉</div>
          ) : filtAlertas.map((a, i) => (
            <div key={i} className="al-row">
              <div className={`al-badge ${a.urgencia}`}>{a.urgencia === "roja" ? "🔴" : "🟡"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span className={`al-tipo ${a.tipo}`}>{a.tipo}</span>
                  <span style={{ fontWeight: 700, fontSize: ".85rem", color: "var(--tx)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.titulo}
                  </span>
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--mu)" }}>{a.detalle} · <em>{a.hace}</em></div>
              </div>
              <button className={`al-action ${a.tipo === "ingreso" ? "cobrar" : "pagar"}`}
                onClick={() => a.tipo === "egreso" ? markPaidExpense.mutate(a.raw.id) : quickPay(a.raw.id, Number(a.raw.amount))}>
                {a.tipo === "ingreso" ? "Cobrar" : "Pagar"}
              </button>
            </div>
          ))}
          {filtAlertas.length > 0 && <Pagination total={filtAlertas.length} page={page} limit={limit} onPage={setPage} onLimit={v => { setLimit(v); setPage(1); }} />}
        </div>
      )}

      {/* ── Modales ── */}
      {modal === "tipo"   && <TipoModal onSelect={t => setModal(t)} onClose={() => setModal(null)} />}
      {modal === "egreso" && <EgresoModal initial={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={handleSaveEgreso} />}
      {modal === "cobro"  && <CobroModal clients={clients} contracts={contracts} onClose={() => setModal(null)} onSave={() => setModal(null)} />}
    </>
  );
}
