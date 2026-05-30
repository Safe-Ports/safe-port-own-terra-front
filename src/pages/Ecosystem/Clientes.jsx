import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { documentService } from "@/services/documentService";
import EcoLayout from "./EcoLayout";

const APPS = [
  { key: "lands", name: "OwnTerra Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true, desc: "Lotificación y venta de terrenos." },
  { key: "neighb", name: "OwnTerra Neighborhoods", handle: "terra.neighborhoods", icon: "eco-g-neighb", cls: "ic-neighb", color: "#355E3B", live: false, desc: "Departamentos y fraccionamientos." },
  { key: "homes", name: "OwnTerra Homes", handle: "terra.homes", icon: "eco-g-homes", cls: "ic-homes", color: "#A7CBA1", live: false, desc: "Construcción y desarrollos." },
];
const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a.key, a]));

const IDENTITY_CATEGORIES = ["Identificación (INE/IFE)", "Comprobante de domicilio", "RFC", "CURP", "Acta de nacimiento", "Pasaporte"];

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const fmtMoney = (n) => n != null ? "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 }) : "—";

const TYPE_LABEL = { buyer: "Comprador", lead: "Prospecto", tenant: "Arrendatario" };
const STATUS_LABEL = { active: "Activo", overdue: "Vencido", closed: "Cerrado", pending: "Pendiente" };

const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);

function EcosystemClientes() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("contracts");
  const [appFilter, setAppFilter] = useState("all");
  const [modal, setModal] = useState(null);

  // Client list
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["clients", "eco-list"],
    queryFn: () => clientService.list({ limit: 100 }),
  });
  const clients = clientsData?.items ?? [];

  // Auto-select first client
  const effectiveSelectedId = selectedId ?? (clients[0]?.id ? String(clients[0].id) : null);

  // Selected client detail
  const { data: detail } = useQuery({
    queryKey: ["client-detail", effectiveSelectedId],
    queryFn: () => clientService.get(effectiveSelectedId),
    enabled: !!effectiveSelectedId,
  });

  // Selected client app assignments from backend
  const { data: appsData } = useQuery({
    queryKey: ["client-apps", effectiveSelectedId],
    queryFn: () => clientService.getApps(effectiveSelectedId),
    enabled: !!effectiveSelectedId,
  });
  const assignedApps = new Set(appsData?.apps ?? []);

  // Selected client contracts
  const { data: contractsData } = useQuery({
    queryKey: ["client-contracts", effectiveSelectedId],
    queryFn: () => clientService.contracts(effectiveSelectedId),
    enabled: !!effectiveSelectedId,
  });
  const contracts = contractsData?.items ?? [];

  // Selected client identity documents
  const { data: docsData } = useQuery({
    queryKey: ["client-docs", effectiveSelectedId],
    queryFn: () => documentService.list({ entity_type: "client", entity_id: effectiveSelectedId, limit: 50 }),
    enabled: !!effectiveSelectedId,
  });
  const identityDocs = docsData?.items ?? [];

  // Upload identity document mutation
  const uploadDocMutation = useMutation({
    mutationFn: ({ file, name, category }) =>
      documentService.upload(file, { name, category: "identificacion", entityType: "client", entityId: effectiveSelectedId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-docs"] });
      setModal(null);
    },
  });

  // App assignment mutations (persist to backend)
  const assignAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.assignApp(clientId, appKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-apps"] }),
  });

  const removeAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.removeApp(clientId, appKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-apps"] }),
  });

  const selected = detail || clients.find((c) => String(c.id) === effectiveSelectedId) || null;

  const toggleApp = (appKey) => {
    if (!effectiveSelectedId) return;
    const isOn = assignedApps.has(appKey);
    if (isOn) {
      removeAppMutation.mutate({ clientId: effectiveSelectedId, appKey });
    } else {
      assignAppMutation.mutate({ clientId: effectiveSelectedId, appKey });
    }
    if (appFilter === appKey) setAppFilter("all");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [clients, query]);

  const selectClient = (id) => { setSelectedId(String(id)); setTab("contracts"); setAppFilter("all"); };

  // For the list, derive app presence from client type (quick heuristic for dots)
  const presentIn = (client, key) => {
    if (String(client.id) === effectiveSelectedId) return assignedApps.has(key);
    return key === "lands" && (client.type === "buyer" || client.type === "tenant");
  };
  const appCount = (key) => clients.filter((c) => presentIn(c, key)).length;
  const multiAppCount = clients.filter((c) => APPS.filter((a) => presentIn(c, a.key)).length > 1).length;

  const associatedApps = APPS.filter((a) => assignedApps.has(a.key));
  const appsActivas = associatedApps.length;

  const byFilter = (item) => appFilter === "all" || item.app === appFilter;
  const shownContracts = contracts.filter(byFilter);

  const overdueCount = detail?.summary?.overdue_payments ?? 0;
  const pendingCount = detail?.summary?.pending_payments ?? 0;
  const activeContracts = contracts.filter((c) => c.status === "active").length;

  const openAdd = (type) => {
    if (type === "contract") {
      setModal({ type, draft: {} });
    } else {
      setModal({ type, draft: { name: "", category: IDENTITY_CATEGORIES[0], file: null } });
    }
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    const { type, draft } = modal;
    if (type === "document") {
      if (!draft.file) { setModal(null); return; }
      uploadDocMutation.mutate({ file: draft.file, name: draft.name || draft.file.name, category: draft.category });
    } else {
      setModal(null);
    }
  };

  if (isLoading) {
    return (
      <EcoLayout active="users" title="Clientes del ecosistema" subtitle="Identidad única · presencia en todas las apps">
        <div className="usr-empty" style={{ padding: 40 }}>Cargando clientes…</div>
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="users" title="Clientes del ecosistema" subtitle="Identidad única · presencia en todas las apps">

      <div className="section-head">
        <h3>Directorio central de clientes</h3>
        <a className="sh-link" href="#">Importar / exportar →</a>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Clientes en el core</span></div><div className="kpi-val">{clients.length}</div><div className="kpi-foot">Identidad única compartida</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En OwnTerra Lands</span></div><div className="kpi-val">{appCount("lands")}</div><div className="kpi-foot">Con acceso a la app</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En Neighborhoods</span></div><div className="kpi-val">{appCount("neighb")}</div><div className="kpi-foot">Pre-asignados</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Multi-app</span></div><div className="kpi-val">{multiAppCount}</div><div className="kpi-foot">Presentes en 2+ apps</div></div>
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
              <button key={c.id} className={`usr-item ${String(c.id) === effectiveSelectedId ? "active" : ""}`} onClick={() => selectClient(c.id)}>
                <span className="usr-av">{initials(c.name)}</span>
                <span className="usr-info">
                  <span className="usr-name" style={{ display: "block" }}>{c.name}</span>
                  <span className="usr-mail" style={{ display: "block" }}>{c.email || "—"}</span>
                </span>
                <span className="usr-dots">
                  {APPS.map((a) => (<span key={a.key} className={`usr-dot ${presentIn(c, a.key) ? `on-${a.key}` : ""}`} title={`${a.name}: ${presentIn(c, a.key) ? "asignado" : "sin acceso"}`} />))}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">Sin resultados para "{query}".</div>}
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
                  <div className="usr-d-meta">
                    id: {String(selected.id).slice(0, 8)}… · {selected.email || "—"} · {selected.phone || "—"}
                  </div>
                </div>
                <span className="usr-d-type">{TYPE_LABEL[selected.type] || selected.type}</span>
              </div>

              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Activa las <b>aplicaciones del ecosistema</b> a las que este cliente tiene acceso. El cliente mantiene
                  una <b>identidad única</b>; cada app lo cruza sin duplicarlo. Puedes pre-asignar apps aún no lanzadas.
                </div>

                {APPS.map((app) => {
                  const isOn = assignedApps.has(app.key);
                  const isPending = assignAppMutation.isPending || removeAppMutation.isPending;
                  return (
                    <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""}`}>
                      <div className="usr-app-top" style={{ marginBottom: 0 }}>
                        <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="usr-app-name">{app.name}{!app.live && <span className="usr-app-soon">Próximamente</span>}</div>
                          <div className="usr-app-handle">{app.handle} · {app.desc}</div>
                        </div>
                        <button
                          className={`usr-switch ${isOn ? "on" : ""}`}
                          role="switch"
                          aria-checked={isOn}
                          aria-label={`${isOn ? "Quitar acceso a" : "Asignar"} ${app.name}`}
                          disabled={isPending}
                          onClick={() => toggleApp(app.key)}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="usr-summary">
                  <span>🔗</span>
                  <span><b>{selected.name.split(" ")[0]}</b> tiene acceso a <b>{appsActivas}</b> {appsActivas === 1 ? "aplicación" : "aplicaciones"} del ecosistema.</span>
                </div>

                {/* KPIs financieros del cliente */}
                <div className="usr-sec-label">Información administrativa</div>
                <div className="usr-stats">
                  <div className="usr-stat ok"><div className="usr-stat-val">{activeContracts}</div><div className="usr-stat-lbl">Contratos activos</div></div>
                  <div className="usr-stat overdue"><div className="usr-stat-val">{overdueCount}</div><div className="usr-stat-lbl">Pagos vencidos</div></div>
                  <div className="usr-stat pending"><div className="usr-stat-val">{pendingCount}</div><div className="usr-stat-lbl">Pagos pendientes</div></div>
                </div>

                {/* Tabs */}
                <div className="usr-list-bar">
                  <div className="seg usr-tabs">
                    <span className={tab === "contracts" ? "on" : ""} onClick={() => setTab("contracts")}>
                      Contratos ({contracts.length})
                    </span>
                    <span className={tab === "documents" ? "on" : ""} onClick={() => setTab("documents")}>
                      Documentos de identidad ({identityDocs.length})
                    </span>
                  </div>
                  {tab === "documents" && (
                    <button className="usr-add-btn" onClick={() => openAdd("document")}>+ Subir identidad</button>
                  )}
                </div>

                {/* Filtro app — solo contratos */}
                {tab === "contracts" && associatedApps.length > 0 && (
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
                        {shownContracts.map((ct) => {
                          const appMeta = APP_BY_KEY["lands"];
                          return (
                            <div key={ct.id} className="usr-row">
                              <span className={`usr-row-ico app-icon ${appMeta?.cls || ""}`}>
                                {appMeta && <svg><use href={`#${appMeta.icon}`} /></svg>}
                              </span>
                              <div className="usr-row-info">
                                <div className="usr-row-name">{ct.contract_number || ct.id}</div>
                                <div className="usr-row-meta">
                                  {ct.type} · {fmtMoney(ct.amount)}
                                  {ct.contract_date ? ` · ${new Date(ct.contract_date).toLocaleDateString("es-MX")}` : ""}
                                </div>
                              </div>
                              <span className={`usr-chip ${ct.status}`}>{STATUS_LABEL[ct.status] || ct.status}</span>
                              <span className="usr-row-val">{fmtMoney(ct.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="usr-rows-empty">
                        {appFilter === "all" ? "Este cliente aún no tiene contratos." : "Sin contratos en esta app."}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
                      🌐 Documentos de identidad del cliente (reutilizables en todas las apps).
                    </div>
                    {identityDocs.length ? (
                      <div className="usr-rows">
                        {identityDocs.map((d) => (
                          <div key={d.id} className="usr-row">
                            <span className="usr-row-ico doc"><FileIcon /></span>
                            <div className="usr-row-info">
                              <div className="usr-row-name">{d.name}</div>
                              <div className="usr-row-meta">
                                {d.category} · {new Date(d.created_at).toLocaleDateString("es-MX")}
                              </div>
                            </div>
                            <span className="usr-chip" style={{ background: "rgba(111,175,107,.14)", color: "#2F6A38", border: "1px solid rgba(111,175,107,.3)" }}>
                              🌐 Core
                            </span>
                            <a className="usr-dl" href={documentService.downloadUrl(d.id)} target="_blank" rel="noreferrer" title="Descargar">
                              <DownloadIcon />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="usr-rows-empty">Sin documentos de identidad en el core.</div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL alta documento */}
      {modal && selected && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">Documento de identidad</div>
                <div className="usr-modal-sub">Para {selected.name} · se guarda en el core</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-field">
                <label className="usr-field-lbl">Archivo</label>
                <input className="usr-input" type="file" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setDraft({ file: f, name: modal.draft.name || f.name });
                }} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Nombre del documento</label>
                <input className="usr-input" placeholder="Ej. INE_frente.jpg" value={modal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Tipo de identidad</label>
                <select className="usr-select" value={modal.draft.category} onChange={(e) => setDraft({ category: e.target.value })}>
                  {IDENTITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={uploadDocMutation.isPending}>
                {uploadDocMutation.isPending ? "Subiendo…" : "✓ Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </EcoLayout>
  );
}

export default EcosystemClientes;
