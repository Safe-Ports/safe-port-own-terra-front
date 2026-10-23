import FieldError from "@/components/shared/FieldError";
import WorkflowForm from "@/components/forms/WorkflowForm";
import DialogPortal from "@/components/ui/DialogPortal";
import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import GuideModal from "@/components/shared/GuideModal";
import Pagination from "@/components/shared/Pagination";
import PhoneInput from "@/components/shared/PhoneInput";
import { clientService } from "@/services/clientService";
import { documentService, filenameForDocument } from "@/services/documentService";
import { useAppContext } from "@/context/AppContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import useEscapeKey from "@/hooks/useEscapeKey";

import EcoLayout from "./EcoLayout";

const APPS = [
  { key: "lands", name: "OwnTerra Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true, desc: "Lotificación y venta de terrenos." },
  { key: "properties", name: "OwnTerra Properties", handle: "terra.properties", icon: "eco-g-neighb", cls: "ic-neighb", color: "#0A3D62", live: true, desc: "Propiedades, propietarios y unidades rentables." },
  { key: "construct", name: "Ownterra Construct", handle: "terra.construct", icon: "eco-g-construct", cls: "ic-construct", color: "#B98C58", live: true, desc: "Cuantificación y presupuestos de obra." },
];
const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a.key, a]));

const IDENTITY_CATEGORIES = ["Identificación (INE/IFE)", "Comprobante de domicilio", "RFC", "CURP", "Acta de nacimiento", "Pasaporte"];

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const fmtMoney = (n) => n != null ? "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 }) : "—";
const POR_PAGINA = 20;
const emailOk = (value = "") => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const TYPE_LABEL = { buyer: "Comprador", lead: "Prospecto", tenant: "Arrendatario" };
const STATUS_LABEL = { active: "Activo", overdue: "Vencido", closed: "Cerrado", pending: "Pendiente" };
const ACCOUNT_HEALTH_LABEL = { current: "Al corriente", overdue: "Con atraso" };
const STAGE_LABEL = { new: "Nuevo", contacted: "Contactado", visited: "Visitado", quoted: "Cotizado", reserved: "Apartado", won: "Ganado", lost: "Perdido" };
const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);

function EcosystemClientes() {
  const qc = useQueryClient();
  const { downloadDocument, exportAppData, showToast, showError } = useAppContext();
  const [captureError, setCaptureError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("contracts");
  const [appFilter, setAppFilter] = useState("all");
  const [modal, setModal]             = useState(null);
  const [showGuide, setShowGuide]     = useState(false);
  useEscapeKey(() => setModal(null), Boolean(modal));

  // Lista paginada y buscada en el servidor. Antes se pedían 100 y se buscaba
  // dentro de esos: del cliente 101 en adelante no aparecían ni buscándolos.
  const search = useDebouncedValue(query.trim());
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["clients", "eco-list", search, page],
    queryFn: () => clientService.list({ page, limit: POR_PAGINA, ...(search ? { search } : {}) }),
    placeholderData: (previous) => previous,
  });
  const clients = clientsData?.items ?? [];
  const totalClients = clientsData?.total ?? 0;
  // El listado ya trae las apps de cada cliente; sólo un backend anterior sin
  // ese campo obliga a pedirlas una por una.
  const clientAppQueries = useQueries({
    queries: clients.map((client) => ({
      queryKey: ["client-apps", String(client.id)],
      queryFn: () => clientService.getApps(client.id),
      staleTime: 60_000,
      enabled: !Array.isArray(client.apps),
    })),
  });
  const appAssignmentsLoading = clientAppQueries.some((queryResult, index) => !Array.isArray(clients[index]?.apps) && queryResult.isPending);
  const appsByClientId = new Map(
    clients.map((client, index) => [
      String(client.id),
      new Set(client.apps ?? clientAppQueries[index]?.data?.apps ?? []),
    ])
  );
  // Totales por app contados en el servidor. Si el backend aún no filtra por
  // app (sus clientes no traen `apps`), ignora el filtro y el total sería el de
  // todo el directorio, así que no se muestra.
  const appTotalQueries = useQueries({
    queries: ["lands", "properties"].map((appKey) => ({
      queryKey: ["clients", "eco-app-total", appKey],
      queryFn: () => clientService.list({ app_key: appKey, limit: 1 }),
      staleTime: 60_000,
    })),
  });
  const appTotals = Object.fromEntries(["lands", "properties"].map((appKey, index) => {
    const result = appTotalQueries[index]?.data;
    const filtersByApp = result && (result.items.length === 0 || Array.isArray(result.items[0].apps));
    return [appKey, filtersByApp ? result.total : null];
  }));

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
      showToast("Documento de identidad subido");
    },
    onError: (err) => showError(err, "Error al subir documento"),
  });

  const createClientMutation = useMutation({
    mutationFn: async (draft) => {
      const created = await clientService.create({
        name: draft.name,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        type: draft.type,
        pipeline_stage: draft.pipeline_stage,
        notes: draft.notes || undefined,
      });

      const appKeys = APPS
        .filter((app) => app.live && draft.apps[app.key])
        .map((app) => app.key);
      await Promise.all(appKeys.map((appKey) => clientService.assignApp(created.id, appKey)));
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      setSelectedId(String(created.id));
      setModal(null);
      showToast("Cliente creado en el Core");
    },
    onError: (err) => showError(err, "Error al crear cliente"),
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, draft }) => {
      await clientService.update(clientId, {
        name: draft.name,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        notes: draft.notes || undefined,
      });
      if (draft.pipeline_stage) {
        await clientService.updateStage(clientId, draft.pipeline_stage);
      }

      const desiredApps = new Set(APPS.filter((app) => app.live && draft.apps?.[app.key]).map((app) => app.key));
      const operations = APPS.filter((app) => app.live).flatMap((app) => {
        const hasApp = assignedApps.has(app.key);
        const wantsApp = desiredApps.has(app.key);
        if (wantsApp && !hasApp) return [clientService.assignApp(clientId, app.key)];
        if (!wantsApp && hasApp) return [clientService.removeApp(clientId, app.key)];
        return [];
      });
      await Promise.all(operations);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-detail"] });
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      setModal(null);
      showToast("Cliente actualizado en el Core");
    },
    onError: (err) => showError(err, "Error al actualizar cliente"),
  });

  // App assignment mutations (persist to backend)
  const assignAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.assignApp(clientId, appKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      showToast("Acceso de cliente actualizado");
    },
    onError: (err) => showError(err, "Error al asignar app"),
  });

  const removeAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.removeApp(clientId, appKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      showToast("Acceso de cliente removido");
    },
    onError: (err) => showError(err, "Error al remover app"),
  });

  const selected = detail || clients.find((c) => String(c.id) === effectiveSelectedId) || null;

  const toggleApp = (appKey) => {
    if (!effectiveSelectedId) return;
    const app = APP_BY_KEY[appKey];
    if (!app?.live) return;
    const isOn = assignedApps.has(appKey);
    if (isOn) {
      removeAppMutation.mutate({ clientId: effectiveSelectedId, appKey });
    } else {
      assignAppMutation.mutate({ clientId: effectiveSelectedId, appKey });
    }
    if (appFilter === appKey) setAppFilter("all");
  };

  const filtered = clients;

  const selectClient = (id) => { setSelectedId(String(id)); setTab("contracts"); setAppFilter("all"); };

  const presentIn = (client, key) => appsByClientId.get(String(client.id))?.has(key) ?? false;
  const multiAppCount = clients.filter((c) => APPS.filter((a) => presentIn(c, a.key)).length > 1).length;

  const associatedApps = APPS.filter((a) => a.live && assignedApps.has(a.key));
  const appsActivas = associatedApps.length;

  const byFilter = (item) => appFilter === "all" || item.app === appFilter;
  const shownContracts = contracts.filter(byFilter);

  const overdueCount = detail?.summary?.overdue_payments ?? 0;
  const pendingCount = detail?.summary?.pending_payments ?? 0;
  const activeContracts = contracts.filter((c) => c.status === "active").length;

  const openAdd = (type) => {
    setCaptureError("");
    if (type === "client") {
      setModal({
        type,
        mode: "create",
        draft: {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          type: "lead",
          pipeline_stage: "new",
          notes: "",
          apps: { lands: true, properties: false, construct: false },
        },
      });
    } else if (type === "contract") {
      setModal({ type, draft: {} });
    } else {
      setModal({ type, draft: { name: "", category: IDENTITY_CATEGORIES[0], file: null } });
    }
  };
  const openEditClient = () => {
    setCaptureError("");
    if (!selected) return;
    const nameParts = selected.name.trim().split(/\s+/);
    setModal({
      type: "client",
      mode: "edit",
      clientId: selected.id,
      draft: {
        first_name: nameParts.shift() || "",
        last_name: nameParts.join(" "),
        email: selected.email || "",
        phone: selected.phone || "",
        type: selected.type || "lead",
        pipeline_stage: selected.pipeline_stage || "new",
        notes: selected.notes || "",
        apps: Object.fromEntries(APPS.map((app) => [app.key, app.live && assignedApps.has(app.key)])),
      },
    });
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    if (uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending) return;
    setCaptureError("");
    const { type, draft } = modal;
    if (type === "client") {
      const fullName = `${draft.first_name || ""} ${draft.last_name || ""}`.trim();
      if (!fullName) { setCaptureError("Escribe el nombre del cliente."); document.getElementById("field-ecosystem-clientes-1")?.focus(); return; }
      if (!emailOk(draft.email)) {
        setCaptureError("Ingresa un correo válido.");
        return;
      }
      if (modal.mode === "edit") {
        updateClientMutation.mutate({ clientId: modal.clientId, draft: { ...draft, name: fullName } });
      } else {
        createClientMutation.mutate({ ...draft, name: fullName });
      }
    } else if (type === "document") {
      if (!draft.file) {
        setCaptureError("Selecciona un archivo para subir.");
        return;
      }
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
    <EcoLayout active="users" title="Clientes del ecosistema" subtitle="Identidad única · presencia en todas las apps" onGuide={() => setShowGuide(true)}>

      <div className="section-head">
        <h3>Directorio central de clientes</h3>
        <div className="usr-list-bar" style={{ marginBottom: 0 }}>
          <button className="usr-btn-ghost" onClick={() => exportAppData("clients", "xlsx")}>Exportar clientes</button>
          <button
            type="button"
            className="usr-btn-ghost"
            disabled
            title="Disponible cuando el backend publique el endpoint de importación"
          >
            Importar clientes · Próximamente
          </button>
          <button className="usr-add-btn" onClick={() => openAdd("client")}>Nuevo cliente</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Clientes en el core</span></div><div className="kpi-val">{totalClients}</div><div className="kpi-foot">Identidad única compartida</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En OwnTerra Lands</span></div><div className="kpi-val">{appTotals.lands ?? "—"}</div><div className="kpi-foot">Con acceso asignado</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En Properties</span></div><div className="kpi-val">{appTotals.properties ?? "—"}</div><div className="kpi-foot">Con acceso asignado</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Multi-app</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : multiAppCount}</div><div className="kpi-foot">Asignados en 2+ apps, en esta página</div></div>
      </div>

      <div className="usr-layout">
        {/* LISTA */}
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">Clientes ({totalClients})</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Buscar por nombre o correo…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
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
                <span className={`usr-chip ${c.account_health === "overdue" ? "closed" : "active"}`}>
                  {ACCOUNT_HEALTH_LABEL[c.account_health] || c.account_health || "Sin adeudos"}
                </span>
                <span className="usr-dots">
                  {APPS.map((a) => (<span key={a.key} className={`usr-dot ${presentIn(c, a.key) ? `on-${a.key}` : ""}`} title={`${a.name}: ${appAssignmentsLoading ? "consultando acceso" : presentIn(c, a.key) ? "asignado" : "sin acceso"}`} />))}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">{search ? `Sin resultados para "${search}".` : "Aún no hay clientes."}</div>}
          </div>
          <Pagination total={totalClients} page={page} limit={POR_PAGINA} onPage={setPage} />
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
                <div className="usr-list-bar" style={{ margin: 0, marginLeft: "auto" }}>
                  <span className={`usr-chip ${selected.account_health === "overdue" ? "closed" : "active"}`}>
                    {ACCOUNT_HEALTH_LABEL[selected.account_health] || selected.account_health || "Sin adeudos"}
                  </span>
                  <span className="usr-d-type">{TYPE_LABEL[selected.type] || selected.type}</span>
                  <button className="usr-add-btn" onClick={openEditClient}>Editar cliente</button>
                </div>
              </div>

              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Activa las <b>aplicaciones del ecosistema</b> a las que este cliente tiene acceso. El cliente mantiene
                  una <b>identidad única</b>; cada app lo cruza sin duplicarlo.
                </div>

                {APPS.map((app) => {
                  const isOn = app.live && assignedApps.has(app.key);
                  const isPending = assignAppMutation.isPending || removeAppMutation.isPending;
                  return (
                    <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""} ${!app.live ? "is-coming-soon" : ""}`}>
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
                          aria-disabled={!app.live || isPending}
                          aria-label={`${isOn ? "Quitar acceso a" : "Asignar"} ${app.name}`}
                          disabled={!app.live || isPending}
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
                            <button className="usr-dl" onClick={() => downloadDocument(d.id, d.download_url, filenameForDocument(d))} title="Descargar">
                              <DownloadIcon />
                            </button>
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

      {/* MODAL alta cliente / documento */}
      {modal && (modal.type === "client" || selected) && (
        <DialogPortal className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal" role="dialog" aria-modal="true" aria-label={modal.type === "client" ? (modal.mode === "edit" ? "Editar cliente" : "Nuevo cliente") : "Documento de identidad"}>
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.type === "client" ? (modal.mode === "edit" ? "Editar cliente" : "Nuevo cliente") : "Documento de identidad"}</div>
                <div className="usr-modal-sub">
                  {modal.type === "client"
                    ? (modal.mode === "edit" ? "Actualiza la identidad y sus accesos del ecosistema." : "Identidad única del Core con acceso opcional a OwnTerra Lands.")
                    : `Para ${selected.name} · se guarda en el core`}
                </div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <WorkflowForm id="core-client-form" busy={uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending} className="usr-modal-body" onInput={() => setCaptureError("")} onSubmit={event => { event.preventDefault(); saveDraft(); }}>
              <FieldError msg={captureError} />
              {modal.type === "client" ? (
                <>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label htmlFor="field-ecosystem-clientes-1" className="usr-field-lbl">Nombre(s)</label>
                      <input id="field-ecosystem-clientes-1" className="usr-input" value={modal.draft.first_name} onChange={(e) => setDraft({ first_name: e.target.value })} placeholder="Ej. Mariana" />
                    </div>
                    <div className="usr-field">
                      <label htmlFor="field-ecosystem-clientes-2" className="usr-field-lbl">Apellido(s)</label>
                      <input id="field-ecosystem-clientes-2" className="usr-input" value={modal.draft.last_name} onChange={(e) => setDraft({ last_name: e.target.value })} placeholder="Ej. López" />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label htmlFor="field-ecosystem-clientes-3" className="usr-field-lbl">Correo</label>
                      <input id="field-ecosystem-clientes-3" className="usr-input" type="email" value={modal.draft.email} onChange={(e) => setDraft({ email: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Telefono</label>
                      <PhoneInput inputClassName="usr-input" value={modal.draft.phone} onChange={(v) => setDraft({ phone: v })} />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label htmlFor="field-ecosystem-clientes-4" className="usr-field-lbl">Tipo</label>
                      <select id="field-ecosystem-clientes-4" className="usr-select" value={modal.draft.type} disabled={modal.mode === "edit"} onChange={(e) => setDraft({ type: e.target.value })}>
                        {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div className="usr-field">
                      <label htmlFor="field-ecosystem-clientes-5" className="usr-field-lbl">Etapa</label>
                      <select id="field-ecosystem-clientes-5" className="usr-select" value={modal.draft.pipeline_stage} onChange={(e) => setDraft({ pipeline_stage: e.target.value })}>
                        {Object.entries(STAGE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="usr-sec-label">Acceso a apps</div>
                  {APPS.map((app) => {
                    const isOn = app.live && !!modal.draft.apps[app.key];
                    return (
                      <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""} ${!app.live ? "is-coming-soon" : ""}`}>
                        <div className="usr-app-top" style={{ marginBottom: 0 }}>
                          <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="usr-app-name">{app.name}{!app.live && <span className="usr-app-soon">Próximamente</span>}</div>
                            <div className="usr-app-handle">{app.handle}</div>
                          </div>
                          <button type="button"
                            className={`usr-switch ${isOn ? "on" : ""}`}
                            role="switch"
                            aria-checked={isOn}
                            aria-disabled={!app.live}
                            aria-label={`${isOn ? "Quitar acceso a" : "Asignar"} ${app.name}`}
                            disabled={!app.live}
                            onClick={() => setDraft({ apps: { ...modal.draft.apps, [app.key]: !isOn } })}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="usr-field">
                    <label htmlFor="field-ecosystem-clientes-6" className="usr-field-lbl">Notas</label>
                    <textarea id="field-ecosystem-clientes-6" className="usr-input" rows="3" value={modal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div className="usr-field">
                    <label htmlFor="field-ecosystem-clientes-7" className="usr-field-lbl">Archivo</label>
                    <input id="field-ecosystem-clientes-7" className="usr-input" type="file" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setDraft({ file: f, name: modal.draft.name || f.name });
                    }} />
                  </div>
                  <div className="usr-field">
                    <label htmlFor="field-ecosystem-clientes-8" className="usr-field-lbl">Nombre del documento</label>
                    <input id="field-ecosystem-clientes-8" className="usr-input" placeholder="Ej. INE_frente.jpg" value={modal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
                  </div>
                  <div className="usr-field">
                    <label htmlFor="field-ecosystem-clientes-9" className="usr-field-lbl">Tipo de identidad</label>
                    <select id="field-ecosystem-clientes-9" className="usr-select" value={modal.draft.category} onChange={(e) => setDraft({ category: e.target.value })}>
                      {IDENTITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}
            </WorkflowForm>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" type="submit" form="core-client-form" disabled={uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending}>
                {uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending ? "Guardando…" : "✓ Guardar"}
              </button>
            </div>
          </div>
        </DialogPortal>
      )}

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Clientes del ecosistema"
        subtitle="Identidad única de cliente reutilizable en todas las apps verticales."
        steps={[
          { title: "Buscar clientes", text: "La barra de búsqueda filtra por nombre o correo. Haz clic en un cliente para ver su ficha completa con contratos, apps asignadas y documentos." },
          { title: "Crear cliente", text: "Pulsa 'Nuevo cliente' para registrar una identidad en el core y, si corresponde, asignarle acceso a OwnTerra Lands." },
          { title: "Asignar acceso a apps", text: "Desde la ficha del cliente puedes activar o desactivar su acceso a OwnTerra Lands. Las aplicaciones próximas permanecen bloqueadas." },
          { title: "Editar cliente", text: "El ícono de edición en la ficha permite modificar nombre, correo, teléfono, vendedor asignado y etapa del pipeline." },
          { title: "Importar clientes", text: "La importación masiva estará disponible cuando el backend publique el endpoint correspondiente." },
          { title: "Exportar directorio", text: "'Exportar clientes' descarga el directorio completo en formato Excel con todos los datos de cada cliente." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemClientes;
