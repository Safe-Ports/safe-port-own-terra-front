import { useMemo, useState } from "react";
import EcoLayout from "./EcoLayout";

/* Apps del ecosistema. El "cruce" cliente↔app es un acceso booleano. */
const APPS = [
  { key: "lands", name: "OwnTerra Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true, desc: "Lotificación y venta de terrenos." },
  { key: "neighb", name: "OwnTerra Neighborhoods", handle: "terra.neighborhoods", icon: "eco-g-neighb", cls: "ic-neighb", color: "#355E3B", live: false, desc: "Departamentos y fraccionamientos." },
  { key: "homes", name: "OwnTerra Homes", handle: "terra.homes", icon: "eco-g-homes", cls: "ic-homes", color: "#A7CBA1", live: false, desc: "Construcción y desarrollos." },
];
const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a.key, a]));

/* En el core solo se gestionan documentos de identidad (de la persona) */
const IDENTITY_CATEGORIES = ["Identificación (INE/IFE)", "Comprobante de domicilio", "RFC", "CURP", "Acta de nacimiento", "Pasaporte"];
const CONTRACT_TYPES = ["Compraventa", "Arrendamiento", "Reserva"];

const SEED = [
  {
    id: "u1", name: "María González Ruiz", email: "maria.gonzalez@gmail.com", phone: "+52 555 123 4567", type: "Inversionista",
    apps: { lands: true, neighb: false, homes: false },
    admin: {
      overdueCount: 0, overdueAmount: "$0", pendingCount: 2, pendingAmount: "$37,800",
      contracts: [{ id: "CT-2451", concept: "Lote 14 · Mz 3, Bosques", app: "lands", status: "active", value: "$485,000", meta: "Pago 5/24 · vence 15 jun 2026" }],
      documents: [
        { name: "Contrato compraventa.pdf", app: "lands", meta: "PDF · 12 mar 2026 · 1.2 MB" },
        { name: "INE_frente.jpg", app: "lands", meta: "IMG · 10 mar 2026 · 480 KB" },
      ],
    },
  },
  {
    id: "u2", name: "Carlos Ramírez Soto", email: "c.ramirez@outlook.com", phone: "+52 555 234 5678", type: "Comprador",
    apps: { lands: true, neighb: true, homes: false },
    admin: {
      overdueCount: 1, overdueAmount: "$12,500", pendingCount: 3, pendingAmount: "$41,200",
      contracts: [
        { id: "CT-2398", concept: "Lote 7 · Mz 1, Las Palmas", app: "lands", status: "overdue", value: "$390,000", meta: "Pago 8/36 · vencido 28 may 2026" },
        { id: "CT-2410", concept: "Depto 204 · Torre B", app: "neighb", status: "active", value: "$1,250,000", meta: "Pago 2/120 · vence 01 jun 2026" },
      ],
      documents: [
        { name: "Contrato Lote 7.pdf", app: "lands", meta: "PDF · 04 ene 2026 · 980 KB" },
        { name: "Comprobante_domicilio.pdf", app: "lands", meta: "PDF · 04 ene 2026 · 320 KB" },
        { name: "Reglamento colonos.pdf", app: "neighb", meta: "PDF · 18 feb 2026 · 1.6 MB" },
      ],
    },
  },
  {
    id: "u3", name: "Jorge Méndez Lara", email: "jorge.mendez@hotmail.com", phone: "+52 555 345 6789", type: "Inversionista",
    apps: { lands: true, neighb: true, homes: true },
    admin: {
      overdueCount: 0, overdueAmount: "$0", pendingCount: 5, pendingAmount: "$88,400",
      contracts: [
        { id: "CT-2102", concept: "Terreno campestre 22 ha", app: "lands", status: "active", value: "$2,100,000", meta: "Pago 14/48 · vence 20 jun 2026" },
        { id: "CT-2255", concept: "Townhouse 12 · Privada Roble", app: "neighb", status: "active", value: "$1,780,000", meta: "Pago 6/96 · vence 05 jun 2026" },
        { id: "CT-2301", concept: "Casa 8 · Desarrollo Altavista", app: "homes", status: "active", value: "$2,950,000", meta: "Pago 3/120 · vence 10 jun 2026" },
      ],
      documents: [
        { name: "Escritura terreno.pdf", app: "lands", meta: "PDF · 22 nov 2025 · 2.1 MB" },
        { name: "Contrato Townhouse.pdf", app: "neighb", meta: "PDF · 14 dic 2025 · 1.4 MB" },
        { name: "Plano arquitectónico.pdf", app: "homes", meta: "PDF · 03 feb 2026 · 4.8 MB" },
      ],
    },
  },
  {
    id: "u4", name: "Ana Torres Vega", email: "ana.torres@gmail.com", phone: "+52 555 456 7890", type: "Prospecto",
    apps: { lands: false, neighb: false, homes: false },
    admin: { overdueCount: 0, overdueAmount: "$0", pendingCount: 0, pendingAmount: "$0", contracts: [], documents: [{ name: "Solicitud_prospecto.pdf", app: "lands", meta: "PDF · 28 may 2026 · 210 KB" }] },
  },
  {
    id: "u5", name: "Laura Sánchez Mora", email: "laura.sanchez@gmail.com", phone: "+52 555 567 8901", type: "Compradora",
    apps: { lands: false, neighb: true, homes: false },
    admin: {
      overdueCount: 0, overdueAmount: "$0", pendingCount: 1, pendingAmount: "$15,300",
      contracts: [{ id: "CT-2477", concept: "Casa 4 · Frac. Los Cedros", app: "neighb", status: "active", value: "$1,420,000", meta: "Pago 1/84 · vence 12 jun 2026" }],
      documents: [{ name: "Contrato Casa 4.pdf", app: "neighb", meta: "PDF · 15 may 2026 · 1.1 MB" }],
    },
  },
  {
    id: "u6", name: "Pedro Díaz Núñez", email: "pedro.diaz@gmail.com", phone: "+52 555 678 9012", type: "Comprador",
    apps: { lands: true, neighb: false, homes: false },
    admin: {
      overdueCount: 2, overdueAmount: "$24,600", pendingCount: 1, pendingAmount: "$8,200",
      contracts: [{ id: "CT-2360", concept: "Lote 3 · Mz 9, Riberas", app: "lands", status: "overdue", value: "$310,000", meta: "Pago 11/24 · vencido 20 may 2026" }],
      documents: [{ name: "Contrato Lote 3.pdf", app: "lands", meta: "PDF · 02 feb 2026 · 870 KB" }],
    },
  },
  {
    id: "u7", name: "Sofía Herrera Pino", email: "sofia.herrera@gmail.com", phone: "+52 555 789 0123", type: "Inversionista",
    apps: { lands: true, neighb: false, homes: true },
    admin: {
      overdueCount: 0, overdueAmount: "$0", pendingCount: 4, pendingAmount: "$63,500",
      contracts: [
        { id: "CT-2188", concept: "Lote 21 · Mz 2, Altozano", app: "lands", status: "active", value: "$560,000", meta: "Pago 9/36 · vence 18 jun 2026" },
        { id: "CT-2299", concept: "Depto vertical · Edif. Aura", app: "homes", status: "active", value: "$1,980,000", meta: "Pago 4/120 · vence 08 jun 2026" },
      ],
      documents: [
        { name: "Contrato Lote 21.pdf", app: "lands", meta: "PDF · 11 ene 2026 · 1.0 MB" },
        { name: "Render desarrollo.pdf", app: "homes", meta: "PDF · 20 feb 2026 · 5.2 MB" },
      ],
    },
  },
];

/* Documento de identidad (de la persona) → vive en el core, reutilizable
   en todas las apps. Lo derivamos por categoría/nombre. */
const isIdentityDoc = (d) => {
  const t = `${d.category || ""} ${d.name || ""}`.toLowerCase();
  return t.includes("ident") || t.includes("ine") || t.includes("comprob") || t.includes("rfc") || t.includes("curp") || t.includes("acta");
};

const initials = (name) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const presentIn = (c, key) => !!c.apps[key];
const appCount = (clients, key) => clients.filter((c) => presentIn(c, key)).length;
const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("en-US");
const todayStr = () => new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const STATUS_LABEL = { active: "Activo", overdue: "Vencido", closed: "Cerrado" };

/* Estructura inicial: separamos documentos de identidad (core) de los operativos
   (que viven en las apps, aquí solo se cuentan). La bóveda de carpetas vive en
   OwnTerra Vault; en el cliente mostramos su identidad en lista. */
const buildAdmin = (c) => {
  const identity = c.admin.documents.filter(isIdentityDoc);
  const operational = c.admin.documents.filter((d) => !isIdentityDoc(d));
  return { ...c, admin: { ...c.admin, coreDocs: identity, appDocs: operational } };
};
const INITIAL = SEED.map(buildAdmin);

const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);

function EcosystemClientes() {
  const [clients, setClients] = useState(INITIAL);
  const [selectedId, setSelectedId] = useState(INITIAL[0].id);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("contracts");
  const [appFilter, setAppFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type, draft }

  const selected = clients.find((c) => c.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, query]);

  const selectClient = (id) => { setSelectedId(id); setTab("contracts"); setAppFilter("all"); };

  const toggleApp = (appKey) => {
    setClients((prev) => prev.map((c) => (c.id === selectedId ? { ...c, apps: { ...c.apps, [appKey]: !c.apps[appKey] } } : c)));
    if (appFilter === appKey) setAppFilter("all");
  };

  const associatedApps = selected ? APPS.filter((a) => presentIn(selected, a.key)) : [];
  const appsActivas = associatedApps.length;
  const activeContracts = selected ? selected.admin.contracts.filter((c) => c.status === "active").length : 0;

  const byFilter = (item) => appFilter === "all" || item.app === appFilter;
  const shownContracts = selected ? selected.admin.contracts.filter(byFilter) : [];
  // El core gestiona documentos de identidad (lista); los operativos viven en las apps
  const coreDocs = selected ? (selected.admin.coreDocs || []) : [];
  const appDocs = selected ? (selected.admin.appDocs || []) : [];
  const appDocCounts = APPS.map((a) => ({ ...a, n: appDocs.filter((d) => d.app === a.key).length })).filter((a) => a.n > 0);

  /* ── alta de contrato / documento ── */
  const openAdd = (type) => {
    const defApp = appFilter !== "all" ? appFilter : associatedApps[0]?.key || "lands";
    if (type === "contract") {
      setModal({ type, draft: { app: defApp, concept: "", number: `CT-${Math.floor(2500 + Math.random() * 500)}`, ctype: "Compraventa", value: "", plazo: 24, status: "active", meta: "" } });
    } else {
      // En el core solo se suben documentos de identidad (sin app, scope core)
      setModal({ type, draft: { name: "", category: IDENTITY_CATEGORIES[0] } });
    }
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    const { type, draft } = modal;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== selectedId) return c;
        if (type === "contract") {
          const entry = {
            id: draft.number || `CT-${Math.floor(2500 + Math.random() * 500)}`,
            concept: draft.concept || "Inmueble sin nombre",
            app: draft.app, status: draft.status,
            value: fmtMoney(draft.value),
            meta: draft.meta || `${draft.ctype} · Pago 1/${draft.plazo} · vence —`,
          };
          return { ...c, apps: { ...c.apps, [draft.app]: true }, admin: { ...c.admin, contracts: [entry, ...c.admin.contracts] } };
        }
        const entry = { name: draft.name || "Documento.pdf", scope: "core", category: draft.category, meta: `${draft.category} · ${todayStr()} · —` };
        return { ...c, admin: { ...c.admin, coreDocs: [entry, ...c.admin.coreDocs] } };
      })
    );
    setTab(type === "contract" ? "contracts" : "documents");
    setModal(null);
  };

  return (
    <EcoLayout active="users" title="Clientes del ecosistema" subtitle="Identidad única · presencia en todas las apps">

      <div className="section-head">
        <h3>Directorio central de clientes</h3>
        <a className="sh-link" href="#">Importar / exportar →</a>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Clientes en el core</span></div><div className="kpi-val">{clients.length}</div><div className="kpi-foot">Identidad única compartida</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En OwnTerra Lands</span></div><div className="kpi-val">{appCount(clients, "lands")}</div><div className="kpi-foot">Con acceso a la app</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En Neighborhoods</span></div><div className="kpi-val">{appCount(clients, "neighb")}</div><div className="kpi-foot">Pre-asignados</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Multi-app</span></div><div className="kpi-val">{clients.filter((c) => APPS.filter((a) => presentIn(c, a.key)).length > 1).length}</div><div className="kpi-foot">Presentes en 2+ apps</div></div>
      </div>

      <div className="usr-layout">

        {/* LISTA */}
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">Clientes ({filtered.length})</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Buscar por nombre o correo…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          <div className="usr-list">
            {filtered.map((c) => (
              <button key={c.id} className={`usr-item ${c.id === selectedId ? "active" : ""}`} onClick={() => selectClient(c.id)}>
                <span className="usr-av">{initials(c.name)}</span>
                <span className="usr-info">
                  <span className="usr-name" style={{ display: "block" }}>{c.name}</span>
                  <span className="usr-mail" style={{ display: "block" }}>{c.email}</span>
                </span>
                <span className="usr-dots">
                  {APPS.map((a) => (<span key={a.key} className={`usr-dot ${presentIn(c, a.key) ? `on-${a.key}` : ""}`} title={`${a.name}: ${presentIn(c, a.key) ? "asignado" : "sin acceso"}`} />))}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">Sin resultados para “{query}”.</div>}
          </div>
        </div>

        {/* DETALLE */}
        <div className="usr-card">
          {!selected ? (
            <div className="usr-empty">Selecciona un cliente para gestionar sus accesos.</div>
          ) : (
            <>
              <div className="usr-d-head">
                <span className="usr-d-av">{initials(selected.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="usr-d-name">{selected.name}</div>
                  <div className="usr-d-meta">core_id: {selected.id} · {selected.email} · {selected.phone}</div>
                </div>
                <span className="usr-d-type">{selected.type}</span>
              </div>

              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Activa las <b>aplicaciones del ecosistema</b> a las que este cliente tiene acceso. El cliente mantiene
                  una <b>identidad única</b>; cada app lo cruza sin duplicarlo. Puedes pre-asignar apps aún no lanzadas.
                </div>

                {APPS.map((app) => {
                  const isOn = presentIn(selected, app.key);
                  return (
                    <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""}`}>
                      <div className="usr-app-top" style={{ marginBottom: 0 }}>
                        <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="usr-app-name">{app.name}{!app.live && <span className="usr-app-soon">Próximamente</span>}</div>
                          <div className="usr-app-handle">{app.handle} · {app.desc}</div>
                        </div>
                        <button className={`usr-switch ${isOn ? "on" : ""}`} role="switch" aria-checked={isOn} aria-label={`${isOn ? "Quitar acceso a" : "Asignar"} ${app.name}`} onClick={() => toggleApp(app.key)} />
                      </div>
                    </div>
                  );
                })}

                <div className="usr-summary">
                  <span>🔗</span>
                  <span><b>{selected.name.split(" ")[0]}</b> tiene acceso a <b>{appsActivas}</b> {appsActivas === 1 ? "aplicación" : "aplicaciones"} del ecosistema.</span>
                </div>

                {/* Información administrativa */}
                <div className="usr-sec-label">Información administrativa</div>
                <div className="usr-stats">
                  <div className="usr-stat ok"><div className="usr-stat-val">{activeContracts}</div><div className="usr-stat-lbl">Contratos activos</div></div>
                  <div className="usr-stat overdue"><div className="usr-stat-val">{selected.admin.overdueCount}</div><div className="usr-stat-lbl">Pagos vencidos</div><div className="usr-stat-sub">{selected.admin.overdueAmount}</div></div>
                  <div className="usr-stat pending"><div className="usr-stat-val">{selected.admin.pendingCount}</div><div className="usr-stat-lbl">Pagos pendientes</div><div className="usr-stat-sub">{selected.admin.pendingAmount}</div></div>
                </div>

                {/* Tabs + agregar (solo documentos de identidad se crean en el core) */}
                <div className="usr-list-bar">
                  <div className="seg usr-tabs">
                    <span className={tab === "contracts" ? "on" : ""} onClick={() => setTab("contracts")}>Contratos ({selected.admin.contracts.length})</span>
                    <span className={tab === "documents" ? "on" : ""} onClick={() => setTab("documents")}>Documentos de identidad ({coreDocs.length})</span>
                  </div>
                  {tab === "documents" && (
                    <button className="usr-add-btn" onClick={() => openAdd("document")}>+ Subir identidad</button>
                  )}
                </div>

                {/* Filtro por app asociada — solo aplica a contratos (operativos) */}
                {tab === "contracts" && (
                  <div className="usr-fil-row">
                    <span className="usr-fil-lbl">App:</span>
                    <button className={`usr-fil ${appFilter === "all" ? "on" : ""}`} onClick={() => setAppFilter("all")}>Todas</button>
                    {associatedApps.map((a) => (
                      <button key={a.key} className={`usr-fil ${appFilter === a.key ? "on" : ""}`} onClick={() => setAppFilter(a.key)}>
                        <span className="usr-fil-dot" style={{ background: a.color }} />{a.name.replace("OwnTerra ", "")}
                      </button>
                    ))}
                  </div>
                )}

                {tab === "contracts" ? (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
                      👁️ Panorama consolidado de <b>solo lectura</b>. Los contratos se crean y gestionan dentro de cada app.
                    </div>
                    {shownContracts.length ? (
                    <div className="usr-rows">
                      {shownContracts.map((ct) => (
                        <div key={ct.id} className="usr-row">
                          <span className={`usr-row-ico app-icon ${APP_BY_KEY[ct.app].cls}`}><svg><use href={`#${APP_BY_KEY[ct.app].icon}`} /></svg></span>
                          <div className="usr-row-info">
                            <div className="usr-row-name">{ct.concept}</div>
                            <div className="usr-row-meta">{ct.id} · {ct.meta}</div>
                          </div>
                          <span className={`usr-chip ${ct.status}`}>{STATUS_LABEL[ct.status]}</span>
                          <span className="usr-row-val">{ct.value}</span>
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div className="usr-rows-empty">{appFilter === "all" ? "Este cliente aún no tiene contratos." : "Sin contratos en esta app."}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
                      🌐 Documentos de identidad del cliente (reutilizables en todas las apps). Se archivan en la bóveda <b>OwnTerra Vault</b>.
                    </div>
                    {coreDocs.length ? (
                      <div className="usr-rows">
                        {coreDocs.map((d, i) => (
                          <div key={i} className="usr-row">
                            <span className="usr-row-ico doc"><FileIcon /></span>
                            <div className="usr-row-info">
                              <div className="usr-row-name">{d.name}</div>
                              <div className="usr-row-meta">{d.meta}</div>
                            </div>
                            <span className="usr-chip" style={{ background: "rgba(111,175,107,.14)", color: "#2F6A38", border: "1px solid rgba(111,175,107,.3)" }}>🌐 Core</span>
                            <button className="usr-dl" title="Descargar"><DownloadIcon /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="usr-rows-empty">Sin documentos de identidad en el core.</div>
                    )}

                    {appDocCounts.length > 0 && (
                      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 13, background: "var(--bg2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span>📄 Documentos operativos en las apps (se gestionan allí):</span>
                        {appDocCounts.map((a) => (
                          <span key={a.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.color }} />
                            {a.name.replace("OwnTerra ", "")}: <b>{a.n}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL de alta */}
      {modal && selected && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.type === "contract" ? "Nuevo contrato" : "Documento de identidad"}</div>
                <div className="usr-modal-sub">{modal.type === "contract" ? `Para ${selected.name} · se asocia a la app seleccionada` : `Para ${selected.name} · se guarda en el core (reutilizable en todas las apps)`}</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>

            <div className="usr-modal-body">
              {modal.type === "contract" && (
                <div className="usr-field">
                  <label className="usr-field-lbl">Aplicación asociada</label>
                  <select className="usr-select" value={modal.draft.app} onChange={(e) => setDraft({ app: e.target.value })}>
                    {APPS.map((a) => <option key={a.key} value={a.key}>{a.name}{!a.live ? " (próximamente)" : ""}</option>)}
                  </select>
                </div>
              )}

              {modal.type === "contract" ? (
                <>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Inmueble / concepto</label>
                    <input className="usr-input" placeholder="Ej. Lote 14 · Mz 3, Bosques" value={modal.draft.concept} onChange={(e) => setDraft({ concept: e.target.value })} />
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">N° de contrato</label>
                      <input className="usr-input" value={modal.draft.number} onChange={(e) => setDraft({ number: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Tipo</label>
                      <select className="usr-select" value={modal.draft.ctype} onChange={(e) => setDraft({ ctype: e.target.value })}>
                        {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">Valor total ($)</label>
                      <input className="usr-input" type="number" placeholder="485000" value={modal.draft.value} onChange={(e) => setDraft({ value: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Plazo (meses)</label>
                      <input className="usr-input" type="number" value={modal.draft.plazo} onChange={(e) => setDraft({ plazo: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Estado</label>
                      <select className="usr-select" value={modal.draft.status} onChange={(e) => setDraft({ status: e.target.value })}>
                        <option value="active">Activo</option>
                        <option value="overdue">Vencido</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Archivo</label>
                    <input className="usr-input" type="file" onChange={(e) => setDraft({ name: e.target.files?.[0]?.name || modal.draft.name })} />
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Nombre del documento</label>
                    <input className="usr-input" placeholder="Ej. Contrato compraventa.pdf" value={modal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Tipo de identidad</label>
                    <select className="usr-select" value={modal.draft.category} onChange={(e) => setDraft({ category: e.target.value })}>
                      {IDENTITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ marginTop: 6, fontSize: ".68rem", color: "var(--text3)", lineHeight: 1.5 }}>
                      🌐 Se guarda como <b>identidad del core</b>. Los documentos operativos (contratos, escrituras, planos) se suben dentro de cada app.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft}>✓ Guardar</button>
            </div>
          </div>
        </div>
      )}
    </EcoLayout>
  );
}

export default EcosystemClientes;
