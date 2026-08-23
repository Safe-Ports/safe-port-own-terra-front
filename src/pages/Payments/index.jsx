import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import GuideModal from "@/components/shared/GuideModal";
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCalendar,
  HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineChevronDown,
  HiOutlineFunnel, HiOutlineEllipsisVertical,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { expenseService, CAT_LABEL, CAT_STYLE } from "@/services/expenseService";
import { employeeService } from "@/services/employeeService";
import { providerService } from "@/services/providerService";

import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import useEscapeKey from "@/hooks/useEscapeKey";

const reqText = (label) => (v) => (!v || !String(v).trim() ? `${label} es obligatorio.` : "");
const reqNum = (label) => (v) => (v === "" || v == null || isNaN(Number(v)) || Number(v) <= 0 ? `Ingresa un ${label} válido (> 0).` : "");
const EGRESO_RULES = { concepto: reqText("El concepto"), monto: reqNum("monto") };
const COBRO_RULES = { clientId: reqText("El cliente"), contractId: reqText("El contrato"), cuota: reqNum("número de cuota"), amount: reqNum("monto") };
import { currency, relativeDays } from "@/services/formatters";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Input from "@/components/Input";

/* ── helpers ─────────────────────────────────────────────────── */
const ESTADO_LABEL = { pending: "Pendiente", paid: "Pagado", overdue: "Vencido", partial: "Parcial", cancelled: "Cancelado" };
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
    cursor: "pointer", fontFamily: "var(--font-body)", outline: "none" };
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
            fontSize: ".8rem", background: "#fff", fontFamily: "var(--font-body)", outline: "none", cursor: "pointer" }} />
      </div>

      {/* Hasta */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--mu)" }}>Hasta</span>
        <input type="date" value={hasta} onChange={e => onHasta(e.target.value)}
          style={{ border: "1.5px solid var(--bd)", borderRadius: 10, padding: "6px 10px",
            fontSize: ".8rem", background: "#fff", fontFamily: "var(--font-body)", outline: "none", cursor: "pointer" }} />
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
    justifyContent: "center", fontSize: ".8rem", fontFamily: "var(--font-body)", fontWeight: 700,
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
          fontSize: ".75rem", background: "#fff", fontFamily: "var(--font-body)", outline: "none", cursor: "pointer" }}>
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
                    {status !== "paid" && status !== "cancelled" && (
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
  useEscapeKey(onClose);
  const [form, setForm] = useState({
    concepto:    initial?.concepto    || "",
    categoria:   initial?.categoria   || "servicios",
    monto:       initial?.monto       || "",
    due_date:    initial?.due_date    || new Date().toISOString().split("T")[0],
    recurrencia: initial?.recurrencia || "",
    notes:       initial?.notes       || "",
    employee_id: initial?.employee_id || "",
    provider_id: initial?.provider_id || "",
  });
  const fe = useFieldErrors();
  const set = k => e => { const v = e.target.value; setForm(p => ({ ...p, [k]: v })); fe.clear(k); };

  const { data: employees } = useQuery({
    queryKey: ["employees", "egreso-modal"],
    queryFn: () => employeeService.list({ limit: 100 }).then(r => r.items),
    enabled: form.categoria === "nomina",
  });
  const { data: providers } = useQuery({
    queryKey: ["providers", "egreso-modal"],
    queryFn: () => providerService.list({ limit: 100 }).then(r => r.items),
    enabled: form.categoria === "proveedores",
  });

  const save = () => {
    if (!fe.validate(form, EGRESO_RULES)) return;
    onSave({
      ...form,
      employee_id: form.categoria === "nomina" ? (form.employee_id || null) : null,
      provider_id: form.categoria === "proveedores" ? (form.provider_id || null) : null,
    });
  };
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
            <input {...fe.fieldProps("concepto")} value={form.concepto} onChange={set("concepto")} placeholder="Nómina junio, CFE…" />
            <FieldError msg={fe.errors.concepto} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">Categoría</label>
              <select className="fi" value={form.categoria} onChange={set("categoria")}>
                {Object.entries(CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="fg"><label className="fl">Monto</label>
              <input {...fe.fieldProps("monto")} type="number" value={form.monto} onChange={set("monto")} placeholder="0" />
              <FieldError msg={fe.errors.monto} /></div>
          </div>
          {form.categoria === "nomina" && (
            <div className="fg"><label className="fl">Colaborador (opcional)</label>
              <select className="fi" value={form.employee_id} onChange={set("employee_id")}>
                <option value="">Sin asignar</option>
                {(employees || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select></div>
          )}
          {form.categoria === "proveedores" && (
            <div className="fg"><label className="fl">Proveedor (opcional)</label>
              <select className="fi" value={form.provider_id} onChange={set("provider_id")}>
                <option value="">Sin asignar</option>
                {(providers || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          )}
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
          <Button variant="primary" style={{ flex: 2 }} onClick={save}>
            {initial ? "Guardar cambios" : "Guardar egreso"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal cobro ─────────────────────────────────────────────── */
function CobroModal({ clients, contracts, onClose, onSave }) {
  useEscapeKey(onClose);
  const [form, setForm] = useState({
    clientId: "", contractId: "", cuota: "", amount: "",
    paid_date: new Date().toISOString().split("T")[0], notes: "",
  });
  const fe = useFieldErrors();
  const set = k => e => { const v = e.target.value; setForm(p => ({ ...p, [k]: v })); fe.clear(k); };
  const save = () => { if (fe.validate(form, COBRO_RULES)) onSave(form); };
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
            <select {...fe.fieldProps("clientId")} value={form.clientId} onChange={set("clientId")}>
              <option value="">— Seleccionar —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldError msg={fe.errors.clientId} /></div>
          <div className="fg"><label className="fl">Contrato / Lote</label>
            <select {...fe.fieldProps("contractId")} value={form.contractId} onChange={set("contractId")}>
              <option value="">— Seleccionar —</option>
              {filtContracts.map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
            </select>
            <FieldError msg={fe.errors.contractId} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">N° cuota</label>
              <input {...fe.fieldProps("cuota")} type="number" value={form.cuota} onChange={set("cuota")} placeholder="1" />
              <FieldError msg={fe.errors.cuota} /></div>
            <div className="fg"><label className="fl">Monto</label>
              <input {...fe.fieldProps("amount")} type="number" value={form.amount} onChange={set("amount")} placeholder="0" />
              <FieldError msg={fe.errors.amount} /></div>
          </div>
          <div className="fg"><label className="fl">Fecha de cobro</label>
            <input className="fi" type="date" value={form.paid_date} onChange={set("paid_date")} /></div>
          <div className="fg"><label className="fl">Notas (opcional)</label>
            <input className="fi" value={form.notes} onChange={set("notes")} placeholder="Transferencia, efectivo…" /></div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={save}>Registrar cobro</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal abono / cobro de cuota ────────────────────────────── */
function AbonoModal({ payment, onClose, onConfirm, busy }) {
  useEscapeKey(onClose);
  const total   = Number(payment.amount || 0);
  const abonado = Number(payment.amount_paid || 0);
  const saldo   = Math.max(total - abonado, 0);
  const [monto, setMonto] = useState(saldo ? String(saldo) : "");
  const [err, setErr]     = useState("");

  const val       = Number(monto);
  // Sin tope mínimo/máximo: solo exigimos un monto positivo (permite abono parcial,
  // saldar la cuota completa o incluso registrar de más).
  const invalid   = monto === "" || isNaN(val) || val <= 0;
  const restante  = Math.max(saldo - (isNaN(val) ? 0 : val), 0);
  const esParcial = !invalid && val < saldo - 0.001;

  const confirm = () => {
    if (invalid) { setErr("Ingresa un monto mayor a $0."); return; }
    onConfirm(Number(val.toFixed(2)));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-hd">
          <div className="modal-ico">💰</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>Registrar cobro</div>
            <div className="modal-sub">
              {payment.client?.name || "Cliente"} · Cuota {payment.installment_n ?? "—"}
              {payment.contract?.contract_number ? ` · ${payment.contract.contract_number}` : ""}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: "var(--sf2)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: ".82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: abonado > 0 ? 6 : 0 }}>
              <span style={{ color: "var(--mu)" }}>Monto de la cuota</span>
              <span style={{ fontWeight: 700 }}>{currency(total)}</span>
            </div>
            {abonado > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#2f5fa8" }}>
                  <span>Ya abonado</span><span style={{ fontWeight: 700 }}>−{currency(abonado)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid rgba(67,69,63,.1)" }}>
                  <span style={{ color: "var(--mu)" }}>Saldo pendiente</span>
                  <span style={{ fontWeight: 800, color: "var(--earth)" }}>{currency(saldo)}</span>
                </div>
              </>
            )}
          </div>
          <div className="fg">
            <label className="fl">Monto a cobrar ahora</label>
            <input className={`fi ${err ? "is-invalid" : ""}`} type="number" min="0" step="0.01"
              value={monto} onChange={e => { setMonto(e.target.value); setErr(""); }} autoFocus />
            <FieldError msg={err} />
            {!err && !invalid && (
              <div style={{ marginTop: 6, fontSize: ".76rem", fontWeight: 600, color: esParcial ? "#2f5fa8" : "#2F6A38" }}>
                {esParcial ? `Abono parcial · quedará un saldo de ${currency(restante)}` : "Salda la cuota completa"}
              </div>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={confirm} disabled={busy}>
            {busy ? "Registrando…" : esParcial ? "Registrar abono" : "Registrar cobro"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal selector tipo ─────────────────────────────────────── */
function TipoModal({ onSelect, onClose }) {
  useEscapeKey(onClose);
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
              cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", width: "100%",
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

const ESTADO_IN  = [["all","Todos los estados"],["pending","Pendiente"],["overdue","Vencido"],["partial","Parcial"],["paid","Pagado"],["cancelled","Cancelado"]];
const ESTADO_EG  = [["all","Todos los estados"],["pending","Pendiente"],["overdue","Vencido"],["paid","Pagado"]];
const ESTADO_AL  = [["all","Todas las alertas"],["roja","Urgentes"],["amarilla","Próximas"]];

export default function PaymentsPage() {
  const { payments, clients, contracts, quickPay, sendReminder, showToast, showError } = useAppContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState("amort");
  const [amortFilter,  setAmortFilter]  = useState("all");   // all | ok | soon | late
  const [amortSearch,  setAmortSearch]  = useState("");
  const [amortProject, setAmortProject] = useState("");
  const [modal,     setModal]     = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [abono,     setAbono]     = useState(null);   // cuota (payment) en cobro/abono
  const [abonoBusy, setAbonoBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));
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
    onError: e => showError(e, "Error al guardar egreso"),
  });
  const updateExpense = useMutation({
    mutationFn: ({ id, data }) => expenseService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setModal(null); setEditing(null); showToast("Egreso actualizado"); },
    onError: e => showError(e, "Error al actualizar egreso"),
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
  // "cancelled" queda fuera de ambos KPIs (dinero que no entrará); "partial" aporta
  // lo ya abonado a Cobrado y el remanente a Por cobrar, igual que el backend.
  const inCobradoAmt   = ingresos
    .filter(p => (p.status === "paid" || p.status === "partial") && inRange(p.due_date, desde, hasta))
    .reduce((s, p) => s + (Number(p.amount_paid ?? (p.status === "paid" ? p.amount : 0)) || 0), 0);
  const inPendienteArr = ingresos.filter(p => ["pending", "overdue", "partial"].includes(p.status) && inRange(p.due_date, desde, hasta));
  const inCobrado      = ingresos.filter(p => p.status === "paid" && inRange(p.due_date, desde, hasta));
  const inPendienteAmt = inPendienteArr.reduce((s, p) => s + Math.max(Number(p.amount || 0) - Number(p.amount_paid || 0), 0), 0);
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
  const handlePagar = r => isEg ? markPaidExpense.mutate(r.id) : setAbono(r);
  const confirmAbono = async (amount) => {
    setAbonoBusy(true);
    const ok = await quickPay(abono.id, amount);
    setAbonoBusy(false);
    if (ok) setAbono(null);
  };
  const handleSaveEgreso = form => {
    const body = { concepto: form.concepto, categoria: form.categoria, monto: Number(form.monto),
      due_date: form.due_date, recurrencia: form.recurrencia || null, notes: form.notes || null,
      employee_id: form.employee_id || null, provider_id: form.provider_id || null };
    editing ? updateExpense.mutate({ id: editing.id, data: body }) : createExpense.mutate(body);
  };

  /* ── KPIs extra: mora + egresos operativos ── */
  const moraArr    = ingresos.filter(p => p.status === "overdue");
  const moraAmt    = moraArr.reduce((s, p) => s + Math.max(Number(p.amount || 0) - Number(p.amount_paid || 0), 0), 0);
  const moraCount  = new Set(moraArr.map(p => p.client?.id).filter(Boolean)).size;
  const egresosMesAmt = expenses.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.monto || 0), 0);
  const flujoNeto  = inCobradoAmt - egresosMesAmt;

  /* ── Amortización por contrato (progreso "24/84") ── */
  const amortRows = useMemo(() => {
    const byContract = {};
    for (const p of payments) {
      const cid = p.contract?.id || p.contract_id;
      if (cid) (byContract[cid] ||= []).push(p);
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return contracts
      .filter(c => c.status === "active" && (c.total_months || c.payments_summary?.total || 0) > 0)
      .map(c => {
        const ps = c.payments_summary || {};
        const total = c.total_months || ps.total || 0;
        const mine = byContract[c.id] || [];
        const next = mine
          .filter(p => p.status === "pending" || p.status === "overdue")
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
        const hasOverdue = (ps.overdue || 0) > 0 || mine.some(p => p.status === "overdue");
        let estado = "ok";
        if (hasOverdue) estado = "late";
        else if (next) {
          const days = Math.ceil((new Date(`${next.due_date}T12:00:00`) - today) / 86400000);
          if (days >= 0 && days <= 5) estado = "soon";
        }
        return {
          id: c.id,
          cli: c.client?.name || "—",
          prop: [c.lot?.code, c.lot?.inmueble_name].filter(Boolean).join(" · ") || c.contract_number,
          proj: c.lot?.inmueble_name || "",
          paid: ps.paid || 0, total,
          cuota: Number(c.monthly_payment || 0),
          venc: next?.due_date || null,
          estado, nextPayment: next, contract: c,
        };
      });
  }, [contracts, payments]);

  const amortProjects = useMemo(
    () => [...new Set(amortRows.map(r => r.proj).filter(Boolean))].sort(),
    [amortRows],
  );
  const amortFiltered = useMemo(() => amortRows.filter(r =>
    (amortFilter === "all" || r.estado === amortFilter) &&
    (!amortProject || r.proj === amortProject) &&
    (!amortSearch || `${r.cli} ${r.prop}`.toLowerCase().includes(amortSearch.toLowerCase()))
  ), [amortRows, amortFilter, amortProject, amortSearch]);

  const AMORT_EST = { ok: "Al día", soon: "Próximo", late: "Atrasado" };

  /* WhatsApp: link wa.me con mensaje pre-escrito (gratis, sin API). */
  const waLink = (r) => {
    let d = (clients.find(c => c.id === r.contract.client?.id)?.phone || "").replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10) d = "52" + d;            // MX sin lada país
    const first = (r.cli || "").split(" ")[0];
    const msg = `Hola ${first}, te recordamos tu cuota de ${currency(r.cuota)}${r.venc ? ` con vencimiento el ${fmtD(r.venc)}` : ""}. ¡Gracias por tu pago! — OwnTerra`;
    return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
  };

  const egPageRows = paginate(egAll, page, limit);

  return (
    <>
      <style>{`
        .cf-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
        .cf-h1{font-family:var(--font-title);font-size:27px;color:var(--deep);letter-spacing:-.5px;margin:0}
        .cf-sub{color:var(--mu);font-size:13px;margin-top:3px}
        .cf-top-actions{display:flex;gap:10px;flex-wrap:wrap}
        .cf-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:12px;font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid transparent;font-family:var(--font-body)}
        .cf-btn-primary{background:var(--mid);color:var(--sf);border-color:var(--mid)}
        .cf-btn-primary:hover{background:var(--deep)}
        .cf-btn-ghost{background:var(--sf);color:var(--danger);border-color:var(--bd)}
        .cf-btn-ghost:hover{border-color:var(--danger)}
        .cf-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .cf-kpi{background:var(--sf);border:1px solid var(--bd);border-left:3px solid var(--bd);border-radius:18px;box-shadow:var(--sh);padding:16px 18px}
        .cf-kpi.income{border-left-color:var(--leaf)}.cf-kpi.due{border-left-color:var(--mid)}.cf-kpi.mora{border-left-color:var(--danger)}.cf-kpi.exp{border-left-color:#C98A2B}
        .cf-kpi .lbl{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}
        .cf-kpi .val{margin-top:8px;font-size:1.55rem;font-weight:800;color:var(--deep);line-height:1}
        .cf-kpi.income .val{color:var(--mid)}.cf-kpi.mora .val{color:var(--danger)}.cf-kpi.exp .val{color:#b0791f}
        .cf-kpi .foot{margin-top:6px;font-size:11.5px;color:var(--mu)}
        .cf-panel{background:var(--sf);border:1px solid var(--bd);border-radius:20px;box-shadow:var(--sh);overflow:hidden}
        .cf-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line-soft);padding:0 8px}
        .cf-tab{padding:14px 18px;border:0;background:none;cursor:pointer;font-family:var(--font-body);font-size:13.5px;font-weight:600;color:var(--mu);border-bottom:2px solid transparent;margin-bottom:-1px}
        .cf-tab.on{color:var(--deep);border-bottom-color:var(--mid)}
        .cf-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 18px;border-bottom:1px solid var(--line-soft)}
        .cf-search{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;height:40px;padding:0 13px;background:var(--sf2);border:1px solid var(--bd);border-radius:11px;color:var(--mu)}
        .cf-search input{border:0;background:none;outline:0;flex:1;color:var(--tx);font-family:var(--font-body);font-size:13.5px}
        .cf-field{height:40px;padding:0 12px;border:1px solid var(--bd);border-radius:11px;background:var(--sf2);color:var(--tx2);font-family:var(--font-body);font-size:13px;cursor:pointer}
        .cf-pills{display:flex;gap:7px;flex-wrap:wrap}
        .cf-pill{padding:7px 14px;border-radius:30px;border:1px solid var(--bd);background:var(--sf);color:var(--tx2);font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body)}
        .cf-pill:hover{border-color:var(--leaf)}
        .cf-pill.on{background:var(--deep);color:var(--sf);border-color:var(--deep)}
        .cf-pill.on.ok{background:rgba(111,175,107,.16);color:var(--mid);border-color:rgba(111,175,107,.4)}
        .cf-pill.on.soon{background:#FBF0DC;color:#9a6c18;border-color:#e6cf9a}
        .cf-pill.on.late{background:#FBE7E4;color:var(--danger);border-color:#f0c5bd}
        .cf-tbl-wrap{overflow-x:auto}
        .cf-tbl{width:100%;border-collapse:collapse}
        .cf-tbl thead th{text-align:left;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--mu);font-weight:700;padding:11px 18px;border-bottom:1px solid var(--line-soft)}
        .cf-tbl tbody td{padding:13px 18px;border-bottom:1px solid var(--line-soft);font-size:13.5px;vertical-align:middle}
        .cf-tbl tbody tr:last-child td{border-bottom:0}
        .cf-tbl tbody tr:hover{background:var(--sf2)}
        .cf-cli{font-weight:700;color:var(--deep)}.cf-prop{font-size:12px;color:var(--mu);margin-top:2px}
        .cf-prog{display:flex;align-items:center;gap:10px;min-width:170px}
        .cf-bar{flex:1;height:7px;border-radius:30px;background:var(--sf2);overflow:hidden;min-width:80px}
        .cf-bar>i{display:block;height:100%;border-radius:30px;background:var(--mid)}
        .cf-bar.late>i{background:var(--danger)}.cf-bar.soon>i{background:#C98A2B}
        .cf-prog-n{font-size:12px;font-weight:700;color:var(--tx2);white-space:nowrap}
        .cf-amt{font-weight:700;color:var(--deep);white-space:nowrap}
        .cf-venc.late{color:var(--danger);font-weight:700}
        .cf-badge{display:inline-block;padding:3px 11px;border-radius:30px;font-size:11px;font-weight:700}
        .cf-badge.ok{background:rgba(111,175,107,.16);color:var(--mid)}
        .cf-badge.soon{background:#FBF0DC;color:#9a6c18}
        .cf-badge.late{background:#FBE7E4;color:var(--danger)}
        .cf-acts{display:flex;gap:6px;justify-content:flex-end}
        .cf-ico{width:32px;height:32px;border-radius:9px;border:1px solid var(--bd);background:var(--sf);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--tx2);text-decoration:none;font-size:14px}
        .cf-ico:hover{border-color:var(--leaf);background:var(--sf2)}
        .cf-ico.wa{color:#1DA851;border-color:rgba(29,168,81,.4)}
        .cf-ico.pay{color:var(--mid);border-color:rgba(111,175,107,.4)}
        .cf-empty{padding:40px;text-align:center;color:var(--mu);font-size:13.5px}
        .cf-neto{display:flex;gap:20px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line-soft)}
        .cf-neto div{font-size:12.5px;color:var(--mu)}.cf-neto b{display:block;font-size:1.1rem;font-weight:800;margin-top:2px;color:var(--deep)}
        @media(max-width:800px){.cf-kpis{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div className="cf-top">
        <div>
          <h1 className="cf-h1">Control Financiero</h1>
          <div className="cf-sub">Gestión de amortizaciones y flujo de caja</div>
        </div>
        <div className="cf-top-actions" data-tour="pagos-registrar">
          <button className="cf-btn cf-btn-ghost" onClick={() => { setEditing(null); setModal("egreso"); }}>⊖ Registrar egreso</button>
          <button className="cf-btn cf-btn-primary" onClick={() => setModal("cobro")}>＋ Registrar pago</button>
        </div>
      </div>

      <div className="cf-kpis" data-tour="pagos-kpis">
        <div className="cf-kpi income"><div className="lbl">Ingresos del mes</div><div className="val">{currency(inCobradoAmt)}</div><div className="foot">{inCobrado.length} cobros aplicados</div></div>
        <div className="cf-kpi due"><div className="lbl">Por cobrar</div><div className="val">{currency(inPendienteAmt)}</div><div className="foot">{inPendienteArr.length} cuotas pendientes</div></div>
        <div className="cf-kpi mora"><div className="lbl">Pagos atrasados</div><div className="val">{currency(moraAmt)}</div><div className="foot">{moraCount} cliente{moraCount === 1 ? "" : "s"} en mora</div></div>
        <div className="cf-kpi exp"><div className="lbl">Egresos operativos</div><div className="val">{currency(egresosMesAmt)}</div><div className="foot">flujo neto {currency(flujoNeto)}</div></div>
      </div>

      <div className="cf-panel">
        <div className="cf-tabs" data-tour="pagos-tabs">
          <button className={`cf-tab ${tab === "amort" ? "on" : ""}`} onClick={() => setTab("amort")}>Amortizaciones de Lotes</button>
          <button className={`cf-tab ${tab === "egresos" ? "on" : ""}`} onClick={() => { setTab("egresos"); setEstado("all"); setSearch(""); setPage(1); }}>Registro de Egresos</button>
        </div>

        {tab === "amort" && (
          <>
            <div className="cf-toolbar" data-tour="pagos-filtros">
              <label className="cf-search"><span>🔎</span><input value={amortSearch} onChange={e => setAmortSearch(e.target.value)} placeholder="Buscar cliente o lote…" /></label>
              <select className="cf-field" value={amortProject} onChange={e => setAmortProject(e.target.value)}>
                <option value="">Todos los proyectos</option>
                {amortProjects.map(pj => <option key={pj} value={pj}>{pj}</option>)}
              </select>
              <div className="cf-pills">
                {[["all", "Todos", ""], ["ok", "Al día", "ok"], ["soon", "Próximos", "soon"], ["late", "Atrasados", "late"]].map(([f, lbl, cls]) => (
                  <button key={f} className={`cf-pill ${cls} ${amortFilter === f ? "on" : ""}`} onClick={() => setAmortFilter(f)}>{lbl}</button>
                ))}
              </div>
            </div>
            {amortFiltered.length === 0 ? (
              <div className="cf-empty">Sin contratos para este filtro.</div>
            ) : (
              <div className="cf-tbl-wrap">
                <table className="cf-tbl">
                  <thead><tr>
                    <th>Cliente / Propiedad</th><th>Progreso (meses)</th><th>Cuota mensual</th><th>Vencimiento</th><th>Estado</th><th style={{ textAlign: "right" }}>Acciones</th>
                  </tr></thead>
                  <tbody>
                    {amortFiltered.map(r => {
                      const pct = r.total ? Math.min(Math.round(r.paid / r.total * 100), 100) : 0;
                      const link = waLink(r);
                      return (
                        <tr key={r.id}>
                          <td><div className="cf-cli">{r.cli}</div><div className="cf-prop">{r.prop}</div></td>
                          <td><div className="cf-prog"><div className={`cf-bar ${r.estado}`}><i style={{ width: `${pct}%` }} /></div><span className="cf-prog-n">{r.paid}/{r.total}</span></div></td>
                          <td className="cf-amt">{currency(r.cuota)}</td>
                          <td className={`cf-venc ${r.estado === "late" ? "late" : ""}`}>{r.venc ? fmtD(r.venc) : "—"}</td>
                          <td><span className={`cf-badge ${r.estado}`}>{AMORT_EST[r.estado]}</span></td>
                          <td><div className="cf-acts">
                            <button className="cf-ico pay" title="Registrar pago" onClick={() => r.nextPayment ? setAbono(r.nextPayment) : setModal("cobro")}>＄</button>
                            {link ? <a className="cf-ico wa" href={link} target="_blank" rel="noreferrer" title="Recordatorio por WhatsApp">✆</a>
                                  : <button className="cf-ico" title="Sin teléfono del cliente" disabled style={{ opacity: .4, cursor: "default" }}>✆</button>}
                            <button className="cf-ico" title="Historial de amortización" onClick={() => navigate("/reportes")}>☰</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "egresos" && (
          <>
            <div className="cf-neto">
              <div>Ingresos del mes<b style={{ color: "var(--mid)" }}>{currency(inCobradoAmt)}</b></div>
              <div>Egresos<b style={{ color: "var(--danger)" }}>−{currency(egresosMesAmt)}</b></div>
              <div>Flujo neto<b style={{ color: flujoNeto >= 0 ? "var(--mid)" : "var(--danger)" }}>{currency(flujoNeto)}</b></div>
            </div>
            <div className="cf-toolbar">
              <label className="cf-search"><span>🔎</span><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar egreso…" /></label>
              <select className="cf-field" value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }}>
                {ESTADO_EG.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {egAll.length === 0 ? (
              <div className="cf-empty">Sin egresos para estos filtros.</div>
            ) : (
              <div style={{ padding: "6px 6px 10px" }}>
                <PagoTable
                  rows={egPageRows}
                  isEgreso
                  historial={estado === "paid"}
                  onPagar={r => markPaidExpense.mutate(r.id)}
                  onRecordar={() => {}}
                  onEdit={e => { setEditing(e); setModal("egreso"); }}
                  onDelete={id => window.confirm("¿Eliminar este egreso?") && deleteExpense.mutate(id)}
                />
                <Pagination total={egAll.length} page={page} limit={limit} onPage={setPage} onLimit={v => { setLimit(v); setPage(1); }} />
              </div>
            )}
          </>
        )}
      </div>


      {modal === "tipo"   && <TipoModal onSelect={t => setModal(t)} onClose={() => setModal(null)} />}
      {modal === "egreso" && <EgresoModal initial={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={handleSaveEgreso} />}
      {modal === "cobro"  && <CobroModal clients={clients} contracts={contracts} onClose={() => setModal(null)} onSave={() => setModal(null)} />}
      {abono && <AbonoModal payment={abono} busy={abonoBusy} onClose={() => setAbono(null)} onConfirm={confirmAbono} />}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Centro de pagos"
        subtitle="Gestión de cobranza a clientes y egresos operativos."
        steps={[
          { title: "Ingresos", text: "Lista de todos los cobros a clientes: cuotas de contratos, enganches y pagos especiales. Filtra por estado (pendiente, pagado, vencido) y por período." },
          { title: "Egresos", text: "Registro de gastos operativos de la empresa (nómina, servicios, mantenimiento, etc.). Puedes marcarlos como pagados cuando se aplican." },
          { title: "Alertas de pago", text: "Tab rojo con cobros vencidos o que vencen en 7 días. Desde aquí puedes cobrar directamente o enviar recordatorios." },
          { title: "Registrar cobro o egreso", text: "Pulsa '+ Registrar' para abrir el formulario. Selecciona si es un cobro de cliente o un egreso operativo e ingresa los datos." },
          { title: "Tendencia mensual", text: "La gráfica muestra los últimos 6 meses de ingresos vs egresos. Úsala para detectar meses de alta cobranza o gastos anómalos." },
          { title: "Filtros", text: "Combina búsqueda por texto, estado del pago y rango de fechas para encontrar cualquier movimiento en el historial." },
        ]}
      />
    </>
  );
}
