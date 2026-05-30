import { useState, useMemo } from "react";
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,
  HiOutlineCalendar, HiOutlineXMark, HiOutlineMagnifyingGlass,
} from "react-icons/hi2";

/* ── paleta del proyecto ─────────────────────────────────────────
   --navy   var(--navy)   primario oscuro (btn-p, tabs activos)
   --forest var(--forest)   verde medio
   --earth  var(--earth)   dorado/tierra  ← acento para egresos
   --danger #c0392b   rojo peligro
   --mu     #83867C   texto muted
   --sf     #FBFAF6   fondo blanco cálido
   --sf2    #F1EEE6   fondo gris cálido
   --bd     #DCDAD2   borde
   --tan-lt var(--tan-lt)   verde muy claro
   --tan-dk var(--tan-dk)   verde oscuro
   ────────────────────────────────────────────────────────────── */

/* ── mock ingresos ───────────────────────────────────────────── */
const MOCK_IN = [
  { id:1, asociado:"Carlos Mendoza", concepto:"Cuota 3 — Lote 12 / CON-001", monto:8500,  vence:"2026-06-02", estado:"overdue" },
  { id:2, asociado:"Ana Ruiz",       concepto:"Cuota 7 — Lote 08 / CON-002", monto:6200,  vence:"2026-06-05", estado:"pending" },
  { id:3, asociado:"Roberto Soto",   concepto:"Cuota 1 — Lote 21 / CON-003", monto:12000, vence:"2026-06-10", estado:"pending" },
  { id:4, asociado:"Luisa Torres",   concepto:"Cuota 5 — Lote 05 / CON-004", monto:7800,  vence:"2026-05-15", estado:"paid"    },
  { id:5, asociado:"Marco Jiménez",  concepto:"Cuota 2 — Lote 17 / CON-005", monto:9300,  vence:"2026-05-20", estado:"paid"    },
  { id:6, asociado:"Sofía Herrera",  concepto:"Cuota 4 — Lote 03 / CON-006", monto:5500,  vence:"2026-05-28", estado:"paid"    },
  { id:7, asociado:"Diego Vargas",   concepto:"Cuota 8 — Lote 11 / CON-007", monto:8100,  vence:"2026-04-30", estado:"paid"    },
  { id:8, asociado:"Marta Fuentes",  concepto:"Cuota 6 — Lote 22 / CON-008", monto:11000, vence:"2026-04-15", estado:"paid"    },
];

/* ── mock egresos ────────────────────────────────────────────── */
const MOCK_EG = [
  { id:1, asociado:"Nómina",        concepto:"Nómina mayo 2026",           monto:45000, vence:"2026-06-01", estado:"pending" },
  { id:2, asociado:"Servicios",     concepto:"CFE — Oficinas centrales",   monto:2800,  vence:"2026-06-03", estado:"pending" },
  { id:3, asociado:"Impuestos",     concepto:"Impuesto predial Q1 2026",   monto:18000, vence:"2026-05-25", estado:"overdue" },
  { id:4, asociado:"Proveedores",   concepto:"Proveedor materiales obra",  monto:32000, vence:"2026-05-10", estado:"paid"    },
  { id:5, asociado:"Servicios",     concepto:"Renta oficina junio",        monto:15000, vence:"2026-05-05", estado:"paid"    },
  { id:6, asociado:"Mantenimiento", concepto:"Mantenimiento obra etapa 2", monto:9500,  vence:"2026-06-15", estado:"pending" },
];

const ALERTAS = [
  { tipo:"ingreso", urgencia:"roja",     titulo:"Cuota vencida — Carlos Mendoza", detalle:"Cuota 3 · CON-001 · $8,500", hace:"hace 3 días", accion:"Registrar cobro"      },
  { tipo:"egreso",  urgencia:"roja",     titulo:"Pago vencido — Impuesto predial",detalle:"Impuestos · $18,000",         hace:"hace 3 días", accion:"Marcar pagado"        },
  { tipo:"ingreso", urgencia:"amarilla", titulo:"Vence en 4 días — Ana Ruiz",     detalle:"Cuota 7 · CON-002 · $6,200", hace:"4 jun 2026",  accion:"Enviar recordatorio"  },
  { tipo:"egreso",  urgencia:"amarilla", titulo:"Vence mañana — Nómina mayo",     detalle:"Nómina · $45,000",            hace:"1 jun 2026",  accion:"Marcar pagado"        },
  { tipo:"egreso",  urgencia:"amarilla", titulo:"Vence en 3 días — CFE oficinas", detalle:"Servicios · $2,800",          hace:"3 jun 2026",  accion:"Marcar pagado"        },
];

/* categorías — colores dentro de la paleta del proyecto */
const CAT_STYLE = {
  "Nómina":       { bg:"#e8f7ee", color:"#2F6A38" },
  "Servicios":    { bg:"#D5ECC0", color:"#355E3B" },
  "Impuestos":    { bg:"#fdecea", color:"#c0392b" },
  "Proveedores":  { bg:"#F1EEE6", color:"#5c4a32" },
  "Mantenimiento":{ bg:"#fef3e2", color:"#9d6b18" },
  "Otro":         { bg:"#ede8e0", color:"#6f5c4e" },
};

const ESTADO_LABEL = { pending:"Pendiente", paid:"Pagado", overdue:"Vencido" };
const fmt  = (n) => `$${Number(n).toLocaleString("es-MX")}`;
const HOY  = "2026-05-28";
const fmtD = (iso) => new Date(iso).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});

function daysFrom(iso) { return Math.round((new Date(iso) - new Date(HOY)) / 86400000); }
function badge(iso, estado) {
  if (estado === "paid") return { label:"Aplicado",     cls:"paid"     };
  const d = daysFrom(iso);
  if (d < 0)             return { label:`${d} días`,    cls:"overdue"  };
  if (d <= 7)            return { label:`en ${d} días`, cls:"upcoming" };
  return                        { label:`en ${d} días`, cls:"ok"       };
}

function applyFilters(rows, { search, desde, hasta }) {
  return rows.filter(r => {
    if (search) {
      const hay = `${r.asociado} ${r.concepto}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    if (desde && r.vence < desde) return false;
    if (hasta && r.vence > hasta) return false;
    return true;
  });
}

/* ── Barra de filtros ────────────────────────────────────────── */
function FilterBar({ filters, onChange }) {
  const hasActive = filters.search || filters.desde || filters.hasta;
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12,
      background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:14,padding:"10px 14px",
      boxShadow:"var(--sh)"}}>

      <div style={{position:"relative",flex:"1 1 180px",minWidth:160}}>
        <HiOutlineMagnifyingGlass style={{position:"absolute",left:10,top:"50%",
          transform:"translateY(-50%)",color:"var(--mu)",fontSize:"1rem",pointerEvents:"none"}} />
        <input
          className="mobile-input"
          value={filters.search}
          onChange={e => onChange("search", e.target.value)}
          placeholder="Buscar por concepto o asociado…"
        />
      </div>

      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:".72rem",fontWeight:700,color:"var(--mu)",whiteSpace:"nowrap"}}>Desde</span>
        <input className="mobile-input" type="date" value={filters.desde} onChange={e=>onChange("desde",e.target.value)} />
      </div>

      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:".72rem",fontWeight:700,color:"var(--mu)",whiteSpace:"nowrap"}}>Hasta</span>
        <input className="mobile-input" type="date" value={filters.hasta} onChange={e=>onChange("hasta",e.target.value)} />
      </div>

      {hasActive && (
        <button onClick={()=>onChange("__clear__")} className="btn-s" style={{padding:"6px 12px",fontSize:".72rem",fontWeight:700}}>
          <HiOutlineXMark /> Limpiar
        </button>
      )}
    </div>
  );
}

/* ── Tabla homologada ────────────────────────────────────────── */
function PagoTable({ rows, isEgreso, historial }) {
  const accentColor = isEgreso ? "#7B5C38" : "#1E3D2B";
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Asociado a</th>
          <th>Concepto</th>
          <th>Monto</th>
          <th>Vence</th>
          <th>Estado</th>
          <th>Días</th>
          {!historial && <th/>}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={7} style={{textAlign:"center",padding:"32px 0",color:"var(--mu)",fontSize:".83rem"}}>
            Sin registros para estos filtros.
          </td></tr>
        )}
        {rows.map(r => {
          const { label, cls } = badge(r.vence, r.estado);
          const rowBg = !historial && cls==="overdue"  ? "#fff9f9"
                      : !historial && cls==="upcoming" ? "#fdfbf5" : "";
          const catStyle = CAT_STYLE[r.asociado] || CAT_STYLE["Otro"];
          return (
            <tr key={r.id} style={rowBg ? {background:rowBg} : {}}>

              {/* Asociado a */}
              <td>
                {isEgreso
                  ? <span style={{display:"inline-block",padding:"3px 10px",borderRadius:999,
                      fontSize:".7rem",fontWeight:700,background:catStyle.bg,color:catStyle.color}}>
                      {r.asociado}
                    </span>
                  : <span style={{fontWeight:600,fontSize:".85rem",color:"var(--tx)"}}>{r.asociado}</span>
                }
              </td>

              {/* Concepto */}
              <td style={{maxWidth:230}}>
                <span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",
                  whiteSpace:"nowrap",fontSize:".82rem",color:"var(--tx2)"}} title={r.concepto}>
                  {r.concepto}
                </span>
              </td>

              {/* Monto */}
              <td style={{fontWeight:800,color:accentColor,whiteSpace:"nowrap"}}>
                {fmt(r.monto)}
              </td>

              {/* Vence */}
              <td style={{color:"var(--mu)",fontSize:".8rem",whiteSpace:"nowrap"}}>{fmtD(r.vence)}</td>

              {/* Estado */}
              <td><span className={`pc-chip ${r.estado}`}>{ESTADO_LABEL[r.estado]}</span></td>

              {/* Días */}
              <td><span className={`days-badge ${cls}`}>{label}</span></td>

              {/* Acciones */}
              {!historial && (
                <td>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    {r.estado !== "paid" && (
                      <button className={isEgreso ? "btn-s" : "btn-p"} style={{padding:"6px 12px",fontSize:".75rem",whiteSpace:"nowrap"}}>
                        {isEgreso ? "Pagar" : "Cobrar"}
                      </button>
                    )}
                    {r.estado === "overdue" && !isEgreso && (
                      <button className="btn-s" style={{padding:"6px 10px",fontSize:".75rem",fontWeight:700,color:"var(--earth)",borderColor:"rgba(67,69,63,.12)"}}>
                        Recordar
                      </button>
                    )}
                    {isEgreso && (
                      <>
                        <button className="btn-s" style={{padding:"6px 8px",fontSize:".78rem",display:"inline-flex",alignItems:"center"}}>
                          <HiOutlinePencil />
                        </button>
                        <button className="btn-s" style={{padding:"6px 8px",fontSize:".78rem",display:"inline-flex",alignItems:"center",color:"var(--danger)"}}>
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

/* ── Modal nuevo pago ────────────────────────────────────────── */
function NuevoPagoModal({ onClose }) {
  const [step, setStep] = useState("tipo");
  const [form, setForm] = useState({
    cliente:"", contrato:"", cuota:"", monto:"", fecha:HOY,
    concepto:"", categoria:"Servicios", notas:"", recurrencia:"",
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{maxWidth:440}}>
        <div className="modal-hd">
          <div className="modal-ico">
            {step==="cobro" ? "💰" : step==="egreso" ? "💸" : "💳"}
          </div>
          <div style={{flex:1}}>
            <div className="modal-title" style={{fontSize:"1.3rem"}}>
              {step==="tipo" ? "Nuevo pago" : step==="cobro" ? "Cobro de cliente" : "Egreso de empresa"}
            </div>
            {step !== "tipo" && (
              <button onClick={()=>setStep("tipo")}
                style={{background:"none",border:"none",fontSize:".72rem",color:"var(--mu)",
                  cursor:"pointer",padding:0,marginTop:3,fontFamily:"inherit"}}>
                ← Cambiar tipo
              </button>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>

        <div className="modal-body">

          {/* STEP 1: tipo */}
          {step === "tipo" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontSize:".82rem",color:"var(--mu)",margin:"0 0 4px"}}>
                ¿Qué tipo de movimiento vas a registrar?
              </p>
              <button onClick={()=>setStep("cobro")} style={{
                display:"flex",alignItems:"center",gap:14,padding:"16px 18px",
                border:"2px solid var(--navy)",borderRadius:16,background:"var(--tan-lt)",
                cursor:"pointer",textAlign:"left",fontFamily:"inherit",
              }}>
                <span style={{fontSize:"1.8rem"}}>💰</span>
                <div>
                  <div style={{fontWeight:800,fontSize:".9rem",color:"#1E3D2B"}}>Cobro de cliente</div>
                  <div style={{fontSize:".75rem",color:"var(--tan-dk)",marginTop:2}}>
                    Un cliente pagó su cuota de lote
                  </div>
                </div>
              </button>
              <button onClick={()=>setStep("egreso")} style={{
                display:"flex",alignItems:"center",gap:14,padding:"16px 18px",
                border:"2px solid var(--earth)",borderRadius:16,background:"#fef3e2",
                cursor:"pointer",textAlign:"left",fontFamily:"inherit",
              }}>
                <span style={{fontSize:"1.8rem"}}>💸</span>
                <div>
                  <div style={{fontWeight:800,fontSize:".9rem",color:"#7B5C38"}}>Egreso de empresa</div>
                  <div style={{fontSize:".75rem",color:"#9d6b18",marginTop:2}}>
                    Nómina, servicios, impuestos, proveedores…
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2a: cobro */}
          {step === "cobro" && (
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              <div className="fg">
                <label className="fl">Cliente</label>
                <select className="fi" value={form.cliente} onChange={set("cliente")}>
                  <option value="">— Seleccionar —</option>
                  {["Carlos Mendoza","Ana Ruiz","Roberto Soto","Luisa Torres","Marco Jiménez"].map(c=>
                    <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Contrato / Lote</label>
                <select className="fi" value={form.contrato} onChange={set("contrato")}>
                  <option value="">— Seleccionar —</option>
                  {["CON-001 · Lote 12","CON-002 · Lote 08","CON-003 · Lote 21"].map(c=>
                    <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="fg"><label className="fl">N° cuota</label>
                  <input className="fi" type="number" value={form.cuota} onChange={set("cuota")} placeholder="3" /></div>
                <div className="fg"><label className="fl">Monto</label>
                  <input className="fi" type="number" value={form.monto} onChange={set("monto")} placeholder="0" /></div>
              </div>
              <div className="fg"><label className="fl">Fecha de cobro</label>
                <input className="fi" type="date" value={form.fecha} onChange={set("fecha")} /></div>
              <div className="fg"><label className="fl">Notas (opcional)</label>
                <input className="fi" value={form.notas} onChange={set("notas")} placeholder="Transferencia, efectivo…" /></div>
            </div>
          )}

          {/* STEP 2b: egreso */}
          {step === "egreso" && (
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              <div className="fg"><label className="fl">Concepto</label>
                <input className="fi" value={form.concepto} onChange={set("concepto")} placeholder="Nómina junio, CFE, Renta…" /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="fg"><label className="fl">Categoría</label>
                  <select className="fi" value={form.categoria} onChange={set("categoria")}>
                    {Object.keys(CAT_STYLE).map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Monto</label>
                  <input className="fi" type="number" value={form.monto} onChange={set("monto")} placeholder="0" /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="fg"><label className="fl">Fecha límite</label>
                  <input className="fi" type="date" value={form.fecha} onChange={set("fecha")} /></div>
                <div className="fg"><label className="fl">Recurrencia</label>
                  <select className="fi" value={form.recurrencia} onChange={set("recurrencia")}>
                    <option value="">Sin recurrencia</option>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Notas (opcional)</label>
                <input className="fi" value={form.notas} onChange={set("notas")} placeholder="Referencia, proveedor…" /></div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-s" style={{flex:1}} onClick={onClose}>Cancelar</button>
          {step === "cobro" && <button className="btn-p" style={{flex:2}}>Registrar cobro</button>}
          {step === "egreso" && (
            <button className="btn-p" style={{flex:2}}>Guardar egreso</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════ */
const EMPTY_F = { search:"", desde:"", hasta:"" };

export default function PaymentsPreview() {
  const [tab,    setTab]    = useState("ingresos");
  const [periodo,setPeriodo]= useState("1mes");
  const [vista,  setVista]  = useState("actuales");
  const [filtAl, setFiltAl] = useState("all");
  const [modal,  setModal]  = useState(false);
  const [filters,setFilters]= useState(EMPTY_F);

  const changeFilter = (k, v) => {
    if (k === "__clear__") { setFilters(EMPTY_F); return; }
    setFilters(p => ({ ...p, [k]: v }));
  };

  const switchTab = (t) => { setTab(t); setVista("actuales"); setFilters(EMPTY_F); };
  const isIn = tab === "ingresos";
  const isEg = tab === "egresos";

  const inActuales  = useMemo(() => applyFilters(MOCK_IN.filter(p=>p.estado!=="paid"), filters), [filters]);
  const inHistorial = useMemo(() => applyFilters(MOCK_IN.filter(p=>p.estado==="paid"),  filters), [filters]);
  const egActuales  = useMemo(() => applyFilters(MOCK_EG.filter(e=>e.estado!=="paid"), filters), [filters]);
  const egHistorial = useMemo(() => applyFilters(MOCK_EG.filter(e=>e.estado==="paid"),  filters), [filters]);

  const alertasRojas = ALERTAS.filter(a=>a.urgencia==="roja").length;
  const filtAlertas  = ALERTAS.filter(a => filtAl==="all" || a.urgencia===filtAl);

  const inMesPagado  = MOCK_IN.filter(p=>p.estado==="paid").reduce((s,p)=>s+p.monto,0);
  const inPendiente  = MOCK_IN.filter(p=>p.estado!=="paid").reduce((s,p)=>s+p.monto,0);
  const egMesPagado  = MOCK_EG.filter(e=>e.estado==="paid").reduce((s,e)=>s+e.monto,0);

  const periodoLabel = {"1mes":"último mes","3meses":"últimos 3 meses","6meses":"últimos 6 meses","todo":"todo el tiempo"};

  const activeRows = isIn
    ? (vista==="actuales" ? inActuales : inHistorial)
    : (vista==="actuales" ? egActuales : egHistorial);

  return (
    <>
      <style>{`
        .pv2-kpis { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); margin-bottom:20px; }
        .pv2-tabs { display:flex;gap:4px;background:#fff;border:1px solid var(--bd);border-radius:14px;padding:4px;width:fit-content; }
        .pv2-tab  { padding:8px 22px;border-radius:10px;border:none;background:transparent;font-size:.83rem;font-weight:600;cursor:pointer;color:var(--mu);font-family:inherit;display:flex;align-items:center;gap:6px; }
        .pv2-tab.act-in { background:var(--navy); color:#E9E5DB; }
        .pv2-tab.act-eg { background:var(--earth); color:#E9E5DB; }
        .pv2-tab.act-al { background:var(--danger); color:#fff; }

        .pv2-subtabs { display:flex;background:var(--sf2);border-radius:10px;padding:3px;width:fit-content;margin-bottom:0; }
        .pv2-subtab  { padding:6px 18px;border-radius:8px;border:none;background:transparent;font-size:.78rem;font-weight:600;cursor:pointer;color:var(--mu);font-family:inherit; }
        .pv2-subtab.act { background:#fff;color:var(--tx);box-shadow:0 1px 4px rgba(0,0,0,.1); }

        .pv2-sect-hd { font-size:.63rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mu);padding:10px 18px 6px;border-bottom:1px solid var(--line-soft); }
        .pv2-wrap    { background:#fff;border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:var(--sh); }
        .pv2-cnt     { font-size:.72rem;color:var(--mu);margin-top:8px;padding-left:4px; }

        .pv2-pill        { padding:6px 14px;border-radius:99px;border:1.5px solid var(--bd);background:#fff;font-size:.73rem;font-weight:600;color:var(--mu);cursor:pointer;font-family:inherit; }
        .pv2-pill.act-g  { background:var(--navy);color:#E9E5DB;border-color:var(--navy); }
        .pv2-pill.act-r  { background:var(--danger);color:#fff;border-color:var(--danger); }
        .pv2-pill.act-e  { background:var(--earth);color:#fff;border-color:var(--earth); }

        .pv2-period { display:flex;align-items:center;gap:6px;font-size:.75rem;font-weight:600;color:var(--mu); }
        .pv2-period select { border:1px solid var(--bd);border-radius:8px;padding:5px 8px;font-size:.75rem;background:#fff;color:var(--tx);cursor:pointer;font-family:inherit;outline:none; }

        .al-row { display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--line-soft); }
        .al-row:last-child { border-bottom:none; }
        .al-row:hover { background:var(--sf2); }
        .al-badge { width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem; }
        .al-badge.roja    { background:#fdecea; }
        .al-badge.amarilla{ background:#fef3e2; }
        .al-tipo { font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:2px 7px;border-radius:99px; }
        .al-tipo.ingreso  { background:var(--tan-lt);color:var(--tan-dk); }
        .al-tipo.egreso   { background:#fef3e2;color:var(--earth); }
        .al-action { margin-left:auto;padding:6px 14px;border-radius:10px;border:none;cursor:pointer;font-size:.75rem;font-weight:700;white-space:nowrap;font-family:inherit; }
        .al-action.cobrar  { background:var(--navy);color:#E9E5DB; }
        .al-action.pagar   { background:var(--earth);color:#fff; }
        .al-action.recordar{ background:#fef3e2;color:var(--earth);border:1px solid #e6c88d; }
      `}</style>

      {/* ── KPIs (reusan .kpi del proyecto) ── */}
      <div className="pv2-kpis">
        <div className="kpi k1">
          <div className="kpi-lbl">Cobrado este mes</div>
          <div className="kpi-val" style={{fontSize:"1.4rem",color:"var(--forest)"}}>{fmt(inMesPagado)}</div>
          <div className="kpi-sub">{MOCK_IN.filter(p=>p.estado==="paid").length} cobros aplicados</div>
        </div>
        <div className="kpi k2">
          <div className="kpi-lbl">Pendiente de cobro</div>
          <div className="kpi-val" style={{fontSize:"1.4rem",color:"var(--earth)"}}>{fmt(inPendiente)}</div>
          <div className="kpi-sub">{MOCK_IN.filter(p=>p.estado!=="paid").length} cuotas por cobrar</div>
        </div>
        <div className="kpi k3">
          <div className="kpi-lbl">Egresos pagados</div>
          <div className="kpi-val" style={{fontSize:"1.4rem"}}>{fmt(egMesPagado)}</div>
          <div className="kpi-sub">{MOCK_EG.filter(e=>e.estado==="paid").length} gastos registrados</div>
        </div>
        <div className="kpi k4">
          <div className="kpi-lbl">Alertas activas</div>
          <div className="kpi-val" style={{fontSize:"1.4rem",color:"var(--danger)"}}>{alertasRojas} urgentes</div>
          <div className="kpi-sub">{ALERTAS.filter(a=>a.urgencia==="amarilla").length} por vencer pronto</div>
        </div>
      </div>

      {/* ── Header: tabs + botón ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,gap:10,flexWrap:"wrap"}}>
        <div className="pv2-tabs">
          <button className={`pv2-tab${tab==="ingresos"?" act-in":""}`} onClick={()=>switchTab("ingresos")}>💰 Ingresos</button>
          <button className={`pv2-tab${tab==="egresos" ?" act-eg":""}`} onClick={()=>switchTab("egresos") }>💸 Egresos</button>
          <button className={`pv2-tab${tab==="alertas" ?" act-al":""}`} onClick={()=>switchTab("alertas") }>
            🔔 Alertas
            {alertasRojas > 0 && (
              <span style={{background:"var(--danger)",color:"#fff",borderRadius:99,
                padding:"1px 6px",fontSize:".65rem",marginLeft:2}}>
                {alertasRojas}
              </span>
            )}
          </button>
        </div>
        <button className="btn-p" onClick={()=>setModal(true)} style={{display:"flex",alignItems:"center",gap:6}}>
          <HiOutlinePlus /> Nuevo pago
        </button>
      </div>

      {/* ══ INGRESOS / EGRESOS ══ */}
      {(isIn || isEg) && (
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div className="pv2-subtabs">
              <button className={`pv2-subtab${vista==="actuales" ?" act":""}`} onClick={()=>setVista("actuales") }>Actuales</button>
              <button className={`pv2-subtab${vista==="historial"?" act":""}`} onClick={()=>setVista("historial")}>Historial</button>
            </div>
            <div className="pv2-period">
              <HiOutlineCalendar />
              Período:
              <select value={periodo} onChange={e=>setPeriodo(e.target.value)}>
                <option value="1mes">1 mes</option>
                <option value="3meses">3 meses</option>
                <option value="6meses">6 meses</option>
                <option value="todo">Todo</option>
              </select>
            </div>
          </div>

          <FilterBar filters={filters} onChange={changeFilter} />

          <div className="pv2-wrap">
            <div className="pv2-sect-hd">
              {vista==="actuales"
                ? (isIn ? "Cobros pendientes y vencidos" : "Egresos pendientes y vencidos")
                : (isIn ? "Historial de cobros"          : "Historial de egresos")}
              <span style={{marginLeft:8,fontWeight:400,textTransform:"none",letterSpacing:0,
                fontSize:".7rem",color:"#bbb"}}>
                — {periodoLabel[periodo]}
              </span>
            </div>
            <PagoTable rows={activeRows} isEgreso={isEg} historial={vista==="historial"} />
          </div>
          <div className="pv2-cnt">{activeRows.length} registro{activeRows.length!==1?"s":""}</div>
        </>
      )}

      {/* ══ ALERTAS ══ */}
      {tab === "alertas" && (
        <>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
            {[["all","Todas","act-g"],["roja","🔴 Urgentes","act-r"],["amarilla","🟡 Próximas","act-e"]].map(([v,l,cls])=>(
              <button key={v} className={`pv2-pill${filtAl===v?" "+cls:""}`} onClick={()=>setFiltAl(v)}>{l}</button>
            ))}
            <div style={{marginLeft:"auto",fontSize:".78rem",color:"var(--mu)"}}>{filtAlertas.length} alertas</div>
          </div>
          <div className="pv2-wrap">
            {filtAlertas.map((a,i)=>(
              <div key={i} className="al-row">
                <div className={`al-badge ${a.urgencia}`}>
                  {a.urgencia==="roja" ? "🔴" : "🟡"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span className={`al-tipo ${a.tipo}`}>{a.tipo}</span>
                    <span style={{fontWeight:700,fontSize:".85rem",color:"var(--tx)",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {a.titulo}
                    </span>
                  </div>
                  <div style={{fontSize:".75rem",color:"var(--mu)"}}>{a.detalle} · <em>{a.hace}</em></div>
                </div>
                <button className={`al-action ${a.accion.includes("cobro")?"cobrar":a.accion.includes("pagado")?"pagar":"recordar"}`}>
                  {a.accion}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {modal && <NuevoPagoModal onClose={()=>setModal(false)} />}
    </>
  );
}
