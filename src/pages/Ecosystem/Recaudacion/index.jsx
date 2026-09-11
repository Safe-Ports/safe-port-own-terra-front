import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";
import { recaudacionService } from "@/services/recaudacionService";
import "@/styles/recaudacion.css";

/* ══════════════════════════════════════════════════════════════════════
   Centro de Recaudación (Stripe Connect) — vive en el Core.
   3 pestañas: Cuentas Bancarias · Links de Pago · Tablero Consolidado.
   Datos: src/services/recaudacionService.js → /api/v1/recaudacion.
   Ver ESPEC_RECAUDACION.md.
   ══════════════════════════════════════════════════════════════════════ */

const TABS = [
  { key: "cuentas", label: "1. Cuentas Bancarias" },
  { key: "links", label: "2. Links de Pago" },
  { key: "tablero", label: "3. Tablero Consolidado" },
];

const money = (centavos, moneda = "mxn") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda.toUpperCase() }).format(
    (centavos || 0) / 100,
  );

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoy, ${hora}` : `${d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}, ${hora}`;
};

const METODO_LABEL = { card: "Tarjeta", oxxo: "OXXO Pay", spei: "SPEI" };

const ACCT_STATUS = {
  verified: { cls: "is-ok", label: "Verificado" },
  pending: { cls: "is-wait", label: "En revisión" },
  restricted: { cls: "is-wait", label: "Datos pendientes" },
  rejected: { cls: "is-fail", label: "Rechazada" },
  disabled: { cls: "is-muted", label: "Desactivada" },
};

const PAGO_STATUS = {
  paid: { cls: "is-ok", label: "Pagado" },
  processing: { cls: "is-wait", label: "Pendiente" },
  pending: { cls: "is-wait", label: "Pendiente" },
  failed: { cls: "is-fail", label: "Fallido" },
  refunded: { cls: "is-muted", label: "Reembolsado" },
};

const BankIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-6 9 6" /><path d="M4 10v9M20 10v9M8 10v9M12 10v9M16 10v9" /><path d="M2 21h20" />
  </svg>
);
const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" /><path d="M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const TrendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" />
  </svg>
);

function Pill({ map, value }) {
  const s = map[value] || { cls: "is-muted", label: value };
  return <span className={`rec-pill ${s.cls}`}>{s.label}</span>;
}

/* ── TAB 1 · Cuentas ──────────────────────────────────────────────── */
function CuentasTab() {
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [modal, setModal] = useState(false);
  const [alias, setAlias] = useState("");
  useEscapeKey(() => setModal(false), modal);

  const { data, isLoading } = useQuery({ queryKey: ["rec", "cuentas"], queryFn: () => recaudacionService.listCuentas() });
  const cuentas = data?.items ?? [];

  const onboard = useMutation({
    mutationFn: (aliasInterno) => recaudacionService.startOnboarding({ alias_interno: aliasInterno }),
    onSuccess: (res) => {
      // Stripe hospeda el formulario de alta (datos fiscales, CLABE, KYC).
      window.location.href = res.onboarding_url;
    },
    onError: (e) => showError(e, "No se pudo iniciar el alta de la cuenta"),
  });

  const openStripe = useMutation({
    mutationFn: (id) => recaudacionService.dashboardLink(id),
    onSuccess: (res) => window.open(res.url, "_blank", "noopener"),
    onError: (e) => showError(e, "No se pudo abrir el panel de Stripe"),
  });

  const resumeOnboarding = useMutation({
    mutationFn: (id) => recaudacionService.refreshOnboardingLink(id),
    onSuccess: (res) => { window.location.href = res.onboarding_url; },
    onError: (e) => showError(e, "No se pudo reanudar el alta"),
  });

  const disable = useMutation({
    mutationFn: (id) => recaudacionService.disableCuenta(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rec", "cuentas"] }); showToast("Cuenta dada de baja"); },
    onError: (e) => showError(e, "No se pudo dar de baja la cuenta"),
  });

  return (
    <>
      <div className="rec-card">
        <div className="rec-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="rec-card-title">Cuentas receptoras de fondos</div>
            <div className="rec-card-sub">
              Conecta las cuentas de banco legales (fideicomisos, razones sociales) donde Stripe depositará el dinero.
            </div>
          </div>
          <button className="rec-btn rec-btn-primary" onClick={() => setModal(true)}>Vincular cuenta (Stripe)</button>
        </div>

        <div style={{ marginTop: 18 }}>
          {isLoading && <div className="rec-empty">Cargando cuentas…</div>}
          {!isLoading && cuentas.length === 0 && (
            <div className="rec-empty">
              <b>Aún no conectas ninguna cuenta</b>
              Vincula tu primera cuenta bancaria para empezar a recibir pagos.
            </div>
          )}
          {cuentas.map((c) => {
            const s = ACCT_STATUS[c.status] || ACCT_STATUS.pending;
            return (
              <div className="rec-acct" key={c.id}>
                <div className="rec-acct-ico"><BankIcon /></div>
                <div className="rec-acct-body">
                  <div className="rec-acct-name">{c.alias_interno}</div>
                  <div className="rec-acct-meta">
                    {c.stripe_account_id}
                    {c.status === "restricted" && c.requirements?.currently_due?.length
                      ? ` · faltan ${c.requirements.currently_due.length} datos en Stripe`
                      : ""}
                  </div>
                </div>
                <span className={`rec-pill ${s.cls}`}>{s.label}</span>
                {c.status === "verified" ? (
                  <button
                    className="rec-btn rec-btn-sm"
                    disabled={openStripe.isPending}
                    onClick={() => openStripe.mutate(c.id)}
                  >
                    Ver en Stripe
                  </button>
                ) : c.status === "disabled" ? null : (
                  <button
                    className="rec-btn rec-btn-sm"
                    disabled={resumeOnboarding.isPending}
                    onClick={() => resumeOnboarding.mutate(c.id)}
                  >
                    Continuar alta
                  </button>
                )}
                {c.status !== "disabled" && (
                  <button
                    className="rec-btn rec-btn-sm"
                    disabled={disable.isPending}
                    onClick={() => {
                      if (window.confirm(`¿Dar de baja "${c.alias_interno}"? No se borra; deja de poder recibir cobros nuevos.`)) {
                        disable.mutate(c.id);
                      }
                    }}
                  >
                    Dar de baja
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="rec-legal">
          OwnTerra no recibe ni retiene estos fondos ni cobra comisión. El pago viaja directo del banco del
          cliente a tu cuenta a través de Stripe (destination charge). La verificación de identidad (KYC/AML)
          la realiza Stripe durante el alta.
        </div>
      </div>

      {modal && (
        <div className="rec-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="rec-modal">
            <div className="rec-modal-head">
              <div>
                <div className="rec-modal-title">Vincular cuenta bancaria</div>
                <div className="rec-modal-sub">Le pondrás un alias interno; el resto se completa en Stripe.</div>
              </div>
              <button className="rec-modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="rec-modal-body">
              <div className="rec-field">
                <label className="rec-label">Alias interno</label>
                <input
                  className="rec-input"
                  placeholder="Ej: Fideicomiso Fase 2 (BBVA)"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
                <div className="rec-hint">Solo lo ves tú y tu equipo. No aparece en el checkout.</div>
              </div>
            </div>
            <div className="rec-modal-foot">
              <button className="rec-btn" onClick={() => setModal(false)}>Cancelar</button>
              <button
                className="rec-btn rec-btn-primary"
                disabled={!alias.trim() || onboard.isPending}
                onClick={() => onboard.mutate(alias.trim())}
              >
                {onboard.isPending ? "Redirigiendo…" : "Continuar en Stripe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── TAB 2 · Links ────────────────────────────────────────────────── */
const blankLink = {
  tipo: "reusable",
  concepto: "",
  descripcion: "",
  cuenta_id: "",
  monto: "",
  montoAbierto: false,
  metodos: ["card", "oxxo"],
  cliente_nombre: "",
  cliente_email: "",
  vigencia_horas: 24,
};

const VIGENCIAS = [
  { h: 24, label: "24 horas" },
  { h: 168, label: "7 días" },
  { h: 720, label: "30 días" },
];

const LINK_ESTADO = {
  activo: { cls: "is-ok", label: "Activo" },
  inactivo: { cls: "is-muted", label: "Inactivo" },
  pendiente: { cls: "is-wait", label: "Pendiente de pago" },
  pagado: { cls: "is-ok", label: "Pagado" },
  expirado: { cls: "is-muted", label: "Expirado" },
};

const venceEn = (iso) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "vencido";
  const h = Math.round(ms / 3600_000);
  if (h < 24) return `vence en ${h} h`;
  return `vence en ${Math.round(h / 24)} d`;
};

function LinksTab() {
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [draft, setDraft] = useState(blankLink);
  const esUnico = draft.tipo === "unico";

  const cuentasQ = useQuery({ queryKey: ["rec", "cuentas"], queryFn: () => recaudacionService.listCuentas() });
  const linksQ = useQuery({ queryKey: ["rec", "links"], queryFn: () => recaudacionService.listLinks() });
  const cuentas = (cuentasQ.data?.items ?? []).filter((c) => c.status === "verified");
  const links = linksQ.data?.items ?? [];

  const create = useMutation({
    mutationFn: (d) =>
      recaudacionService.createLink({
        tipo: d.tipo,
        concepto: d.concepto,
        descripcion: d.descripcion,
        cuenta_id: d.cuenta_id,
        monto: d.tipo === "reusable" && d.montoAbierto ? null : d.monto,
        metodos: d.metodos,
        cliente_nombre: d.cliente_nombre,
        cliente_email: d.cliente_email,
        vigencia_horas: d.vigencia_horas,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["rec", "links"] });
      setDraft({ ...blankLink, tipo: created.tipo });
      showToast(created.tipo === "unico" ? "Link de cobro único generado" : "Link reusable generado");
    },
    onError: (e) => showError(e, "No se pudo generar el link"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, activo }) => recaudacionService.toggleLink(id, activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rec", "links"] }),
    onError: (e) => showError(e, "No se pudo cambiar el link"),
  });
  const expire = useMutation({
    mutationFn: (id) => recaudacionService.expireLink(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rec", "links"] }); showToast("Link expirado"); },
    onError: (e) => showError(e, "No se pudo expirar el link"),
  });

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const pickTipo = (tipo) =>
    setDraft((d) => ({
      ...d,
      tipo,
      // reusable no admite SPEI; al cambiar, se limpia
      metodos: tipo === "reusable" ? d.metodos.filter((m) => m !== "spei") : d.metodos,
      montoAbierto: tipo === "unico" ? false : d.montoAbierto,
    }));
  const toggleMetodo = (m) =>
    setDraft((d) => ({
      ...d,
      metodos: d.metodos.includes(m) ? d.metodos.filter((x) => x !== m) : [...d.metodos, m],
    }));

  const montoOk = esUnico ? Number(draft.monto) > 0 : draft.montoAbierto || Number(draft.monto) > 0;
  const canSubmit =
    draft.concepto.trim() && draft.cuenta_id && montoOk && draft.metodos.length &&
    (!esUnico || draft.cliente_nombre.trim());

  return (
    <div className="rec-split">
      {/* Form */}
      <div className="rec-card">
        <div className="rec-card-head">
          <div className="rec-card-title">Nuevo link de cobro</div>
          <div className="rec-card-sub">Elige el tipo y asígnale la cuenta que recibe el dinero.</div>
        </div>

        {/* Switch tipo */}
        <div className="rec-seg" style={{ marginTop: 14 }}>
          <button className={`rec-seg-btn ${!esUnico ? "is-on" : ""}`} onClick={() => pickTipo("reusable")}>
            Link reusable
          </button>
          <button className={`rec-seg-btn ${esUnico ? "is-on" : ""}`} onClick={() => pickTipo("unico")}>
            Cobro único
          </button>
        </div>
        <div className="rec-hint" style={{ marginTop: 8 }}>
          {esUnico
            ? "Un cliente, un monto, caduca. Habilita SPEI (transferencia con CLABE)."
            : "URL fija que pagan muchos clientes. Tarjeta y OXXO."}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="rec-field">
            <label className="rec-label">Concepto del pago</label>
            <input
              className="rec-input"
              placeholder={esUnico ? "Ej: Enganche lote 14 · Manzana B" : "Ej: Mensualidades Fase 1"}
              value={draft.concepto}
              onChange={(e) => set({ concepto: e.target.value })}
            />
          </div>

          {esUnico && (
            <div className="rec-field-row">
              <div className="rec-field">
                <label className="rec-label">Cliente</label>
                <input className="rec-input" placeholder="Nombre del cliente" value={draft.cliente_nombre} onChange={(e) => set({ cliente_nombre: e.target.value })} />
              </div>
              <div className="rec-field">
                <label className="rec-label">Correo (opcional)</label>
                <input className="rec-input" type="email" placeholder="cliente@correo.com" value={draft.cliente_email} onChange={(e) => set({ cliente_email: e.target.value })} />
              </div>
            </div>
          )}

          {!esUnico && (
            <div className="rec-field">
              <label className="rec-label">Descripción</label>
              <textarea className="rec-textarea" placeholder="Detalles visibles para el cliente…" value={draft.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
            </div>
          )}

          <div className="rec-field">
            <label className="rec-label">Cuenta receptora de fondos</label>
            <select className="rec-select" value={draft.cuenta_id} onChange={(e) => set({ cuenta_id: e.target.value })}>
              <option value="">— Selecciona una cuenta destino —</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.alias_interno}</option>
              ))}
            </select>
            {cuentas.length === 0 && <div className="rec-hint">Primero verifica una cuenta en la pestaña 1.</div>}
          </div>

          <div className="rec-field">
            <label className="rec-label">Monto (MXN)</label>
            <input
              className="rec-input"
              type="number"
              min="0"
              placeholder="5000.00"
              disabled={!esUnico && draft.montoAbierto}
              value={draft.monto}
              onChange={(e) => set({ monto: e.target.value })}
            />
            {!esUnico && (
              <label className="rec-check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={draft.montoAbierto} onChange={(e) => set({ montoAbierto: e.target.checked })} />
                Monto abierto (el cliente escribe cuánto paga)
              </label>
            )}
          </div>

          {esUnico && (
            <div className="rec-field">
              <label className="rec-label">Vigencia del link</label>
              <select className="rec-select" value={draft.vigencia_horas} onChange={(e) => set({ vigencia_horas: Number(e.target.value) })}>
                {VIGENCIAS.map((v) => <option key={v.h} value={v.h}>{v.label}</option>)}
              </select>
            </div>
          )}

          <div className="rec-field">
            <label className="rec-label">Métodos de pago</label>
            <div className="rec-methods">
              <label className="rec-check">
                <input type="checkbox" checked={draft.metodos.includes("card")} onChange={() => toggleMetodo("card")} />
                Tarjeta
              </label>
              <label className="rec-check">
                <input type="checkbox" checked={draft.metodos.includes("oxxo")} onChange={() => toggleMetodo("oxxo")} />
                OXXO Pay
              </label>
              {esUnico ? (
                <label className="rec-check">
                  <input type="checkbox" checked={draft.metodos.includes("spei")} onChange={() => toggleMetodo("spei")} />
                  SPEI
                </label>
              ) : (
                <label className="rec-check" style={{ opacity: 0.4 }} title="SPEI solo está disponible en cobro único">
                  <input type="checkbox" disabled checked={false} readOnly />
                  SPEI (solo cobro único)
                </label>
              )}
            </div>
          </div>

          <button
            className="rec-btn rec-btn-primary"
            style={{ width: "100%", marginTop: 4 }}
            disabled={!canSubmit || create.isPending}
            onClick={() => create.mutate(draft)}
          >
            {create.isPending ? "Generando…" : "Generar link seguro"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div>
        {linksQ.isLoading && <div className="rec-empty">Cargando links…</div>}
        {!linksQ.isLoading && links.length === 0 && (
          <div className="rec-empty">
            <b>Sin links de cobro</b>
            Crea uno con el formulario de la izquierda.
          </div>
        )}
        {links.map((l) => {
          const st = LINK_ESTADO[l.estado] || LINK_ESTADO.inactivo;
          const dim = ["inactivo", "expirado"].includes(l.estado);
          return (
            <div className="rec-link" key={l.id} style={{ opacity: dim ? 0.6 : 1 }}>
              <div className="rec-link-top">
                <div>
                  <div className="rec-link-name">
                    <span className={`rec-tag ${l.tipo === "unico" ? "is-unico" : "is-reusable"}`}>
                      {l.tipo === "unico" ? "Cobro único" : "Reusable"}
                    </span>
                    {l.concepto}
                  </div>
                  {l.descripcion && <div className="rec-link-desc">{l.descripcion}</div>}
                  {l.tipo === "unico" && (
                    <div className="rec-link-desc">
                      {l.cliente_nombre}
                      {l.estado === "pendiente" && l.expires_at ? ` · ${venceEn(l.expires_at)}` : ""}
                    </div>
                  )}
                </div>
                <span className={`rec-pill ${st.cls}`}>{st.label}</span>
              </div>

              <div className="rec-link-route">
                ↳ Envía el dinero a: <b>{l.cuenta_alias}</b>
                <span className="rec-sub" style={{ marginLeft: "auto" }}>
                  {l.monto_centavos ? money(l.monto_centavos, l.moneda) : "Monto abierto"} · {l.allowed_methods.map((m) => METODO_LABEL[m]).join(" · ")}
                </span>
              </div>

              <div className="rec-urlrow">
                <div className="rec-url">{l.url}</div>
                <button className="rec-btn rec-btn-sm" onClick={() => { navigator.clipboard?.writeText(l.url); showToast("Link copiado"); }}>
                  Copiar link
                </button>
                {l.tipo === "reusable" && (
                  <button
                    className="rec-btn rec-btn-sm"
                    onClick={() => toggle.mutate({ id: l.id, activo: l.estado !== "activo" })}
                  >
                    {l.estado === "activo" ? "Desactivar" : "Reactivar"}
                  </button>
                )}
                {l.tipo === "unico" && l.estado === "pendiente" && (
                  <button className="rec-btn rec-btn-sm" onClick={() => expire.mutate(l.id)}>
                    Expirar ahora
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── TAB 3 · Tablero ──────────────────────────────────────────────── */
function TableroTab() {
  const [metodo, setMetodo] = useState("");
  const [estado, setEstado] = useState("");

  const statsQ = useQuery({ queryKey: ["rec", "stats"], queryFn: () => recaudacionService.getStats() });
  const pagosQ = useQuery({ queryKey: ["rec", "pagos"], queryFn: () => recaudacionService.listPagos() });
  const stats = statsQ.data;

  const pagos = useMemo(() => {
    let rows = pagosQ.data?.items ?? [];
    if (metodo) rows = rows.filter((p) => p.metodo === metodo);
    if (estado) rows = rows.filter((p) => p.status === estado);
    return rows;
  }, [pagosQ.data, metodo, estado]);

  return (
    <>
      <div className="rec-kpis">
        <div className="rec-kpi">
          <div className="rec-kpi-ico"><DollarIcon /></div>
          <div>
            <div className="rec-kpi-label">Volumen procesado</div>
            <div className="rec-kpi-value">
              {stats ? money(stats.volumen_procesado_centavos) : "—"} <small>MXN</small>
            </div>
          </div>
        </div>
        <div className="rec-kpi">
          <div className="rec-kpi-ico"><TrendIcon /></div>
          <div>
            <div className="rec-kpi-label">Transacciones exitosas</div>
            <div className="rec-kpi-value">
              {stats ? stats.transacciones_exitosas : "—"}
              {stats?.variacion_pct != null && <span className="rec-delta" style={{ marginLeft: 8 }}>+{stats.variacion_pct}%</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="rec-card">
        <div className="rec-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="rec-card-title">Historial de pagos recientes</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="rec-select" style={{ width: "auto" }} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="paid">Pagado</option>
              <option value="processing">Pendiente</option>
              <option value="failed">Fallido</option>
            </select>
            <select className="rec-select" style={{ width: "auto" }} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="">Todos los métodos</option>
              <option value="card">Tarjeta</option>
              <option value="oxxo">OXXO Pay</option>
              <option value="spei">SPEI</option>
            </select>
          </div>
        </div>

        <div className="rec-tablewrap" style={{ marginTop: 14 }}>
          <table className="rec-table">
            <thead>
              <tr>
                <th>Ref / Fecha</th>
                <th>Cliente</th>
                <th>Concepto (link)</th>
                <th>Método</th>
                <th className="rec-th-num">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="rec-strong">{p.ref}</div>
                    <div className="rec-sub">{fmtDateTime(p.created_at)}</div>
                  </td>
                  <td>
                    <div>{p.cliente_nombre}</div>
                    <div className="rec-sub">{p.cliente_email}</div>
                  </td>
                  <td>{p.concepto_snapshot}</td>
                  <td>{METODO_LABEL[p.metodo] || p.metodo}</td>
                  <td className="rec-num">{money(p.monto_centavos, p.moneda)}</td>
                  <td><Pill map={PAGO_STATUS} value={p.status} /></td>
                </tr>
              ))}
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="rec-empty" style={{ border: 0 }}>Sin pagos con esos filtros.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Página ───────────────────────────────────────────────────────── */
export default function EcosystemRecaudacion() {
  const [tab, setTab] = useState("cuentas");
  const configQ = useQuery({ queryKey: ["rec", "config"], queryFn: () => recaudacionService.getConfig() });

  return (
    <EcoLayout active="panel" title="Centro de Recaudación" subtitle="Cuentas bancarias, links de cobro y tablero de pagos">
      <div className="rec-wrap">
        <div className="rec-hero">
          <div>
            <div className="rec-kicker">Ecosistema Core · Servicio compartido</div>
            <h2>Centro de Recaudación</h2>
            <p>
              Configura las cuentas donde Stripe deposita, comparte links de cobro reusables por concepto y
              monitorea en un solo tablero los pagos que entran por esos links.
            </p>
          </div>
          {configQ.data?.test_mode && <span className="rec-testbadge">Modo Pruebas (Test)</span>}
        </div>

        <div className="rec-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`rec-tab ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "cuentas" && <CuentasTab />}
        {tab === "links" && <LinksTab />}
        {tab === "tablero" && <TableroTab />}
      </div>
    </EcoLayout>
  );
}
