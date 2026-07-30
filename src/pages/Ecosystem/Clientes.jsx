import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import GuideModal from "@/components/shared/GuideModal";
import { clientService } from "@/services/clientService";
import { documentService, filenameForDocument } from "@/services/documentService";
import { userService } from "@/services/userService";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

import EcoLayout from "./EcoLayout";

const APPS = [
  { key: "lands", name: "OwnTerra Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true },
  { key: "neighb", name: "OwnTerra Properties", handle: "terra.properties", icon: "eco-g-neighb", cls: "ic-neighb", color: "#355E3B", live: false },
  { key: "homes", name: "OwnTerra Homes", handle: "terra.homes", icon: "eco-g-homes", cls: "ic-homes", color: "#A7CBA1", live: false },
];
const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a.key, a]));

const IDENTITY_CATEGORIES = ["identification", "address", "tax", "curp", "birth", "passport"];

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const fmtMoney = (n, localeTag) => n != null ? new Intl.NumberFormat(localeTag, {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
}).format(Number(n)) : "—";
const emailOk = (value = "") => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const TYPE_KEYS = ["buyer", "lead", "tenant"];
const STAGE_KEYS = ["new", "contacted", "visited", "quoted", "reserved", "won", "lost"];
const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);

function EcosystemClientes() {
  const { t, localeTag } = useLocale();
  const qc = useQueryClient();
  const { downloadDocument, exportAppData, showToast, showError } = useAppContext();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("contracts");
  const [appFilter, setAppFilter] = useState("all");
  const [modal, setModal]             = useState(null);
  const [showGuide, setShowGuide]     = useState(false);
  useEscapeKey(() => setModal(null), Boolean(modal));

  // Client list
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["clients", "eco-list"],
    queryFn: () => clientService.list({ limit: 100 }),
  });
  const clients = clientsData?.items ?? [];
  const clientAppQueries = useQueries({
    queries: clients.map((client) => ({
      queryKey: ["client-apps", String(client.id)],
      queryFn: () => clientService.getApps(client.id),
      staleTime: 60_000,
    })),
  });
  const appAssignmentsLoading = clientAppQueries.some((queryResult) => queryResult.isPending);
  const appsByClientId = new Map(
    clients.map((client, index) => [
      String(client.id),
      new Set(clientAppQueries[index]?.data?.apps ?? []),
    ])
  );

  const { data: usersData } = useQuery({
    queryKey: ["users", "eco-client-vendors"],
    queryFn: () => userService.list({ role: "vendor", limit: 100 }),
  });
  const vendors = usersData?.items ?? [];

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
      showToast(t("coreClients.identityUploaded"));
    },
    onError: (err) => showError(err, t("coreClients.uploadError")),
  });

  const createClientMutation = useMutation({
    mutationFn: async (draft) => {
      const created = await clientService.create({
        name: draft.name,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        type: draft.type,
        pipeline_stage: draft.pipeline_stage,
        seller_id: draft.seller_id || undefined,
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
      showToast(t("coreClients.created"));
    },
    onError: (err) => showError(err, t("coreClients.createError")),
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, draft }) => {
      await clientService.update(clientId, {
        name: draft.name,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        seller_id: draft.seller_id || undefined,
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
      showToast(t("coreClients.updated"));
    },
    onError: (err) => showError(err, t("coreClients.updateError")),
  });

  // App assignment mutations (persist to backend)
  const assignAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.assignApp(clientId, appKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      showToast(t("coreClients.accessUpdated"));
    },
    onError: (err) => showError(err, t("coreClients.assignError")),
  });

  const removeAppMutation = useMutation({
    mutationFn: ({ clientId, appKey }) => clientService.removeApp(clientId, appKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-apps"] });
      showToast(t("coreClients.accessRemoved"));
    },
    onError: (err) => showError(err, t("coreClients.removeError")),
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [clients, query]);

  const selectClient = (id) => { setSelectedId(String(id)); setTab("contracts"); setAppFilter("all"); };

  const presentIn = (client, key) => appsByClientId.get(String(client.id))?.has(key) ?? false;
  const appCount = (key) => clients.filter((c) => presentIn(c, key)).length;
  const multiAppCount = clients.filter((c) => APPS.filter((a) => presentIn(c, a.key)).length > 1).length;

  const associatedApps = APPS.filter((a) => a.live && assignedApps.has(a.key));
  const appsActivas = associatedApps.length;

  const byFilter = (item) => appFilter === "all" || item.app === appFilter;
  const shownContracts = contracts.filter(byFilter);

  const overdueCount = detail?.summary?.overdue_payments ?? 0;
  const pendingCount = detail?.summary?.pending_payments ?? 0;
  const activeContracts = contracts.filter((c) => c.status === "active").length;

  const openAdd = (type) => {
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
          seller_id: "",
          notes: "",
          apps: { lands: true, neighb: false, homes: false },
        },
      });
    } else if (type === "contract") {
      setModal({ type, draft: {} });
    } else {
      setModal({ type, draft: { name: "", category: IDENTITY_CATEGORIES[0], file: null } });
    }
  };
  const openEditClient = () => {
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
        seller_id: selected.seller?.id || "",
        notes: selected.notes || "",
        apps: Object.fromEntries(APPS.map((app) => [app.key, app.live && assignedApps.has(app.key)])),
      },
    });
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    const { type, draft } = modal;
    if (type === "client") {
      const fullName = `${draft.first_name || ""} ${draft.last_name || ""}`.trim();
      if (!fullName) return;
      if (!emailOk(draft.email)) {
        showToast(t("coreClients.validEmail"), "warning");
        return;
      }
      if (modal.mode === "edit") {
        updateClientMutation.mutate({ clientId: modal.clientId, draft: { ...draft, name: fullName } });
      } else {
        createClientMutation.mutate({ ...draft, name: fullName });
      }
    } else if (type === "document") {
      if (!draft.file) {
        showToast(t("coreClients.selectFile"), "warning");
        return;
      }
      uploadDocMutation.mutate({ file: draft.file, name: draft.name || draft.file.name, category: draft.category });
    } else {
      setModal(null);
    }
  };

  if (isLoading) {
    return (
      <EcoLayout active="users" title={t("coreClients.title")} subtitle={t("coreClients.subtitle")}>
        <div className="usr-empty" style={{ padding: 40 }}>{t("coreClients.loading")}</div>
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="users" title={t("coreClients.title")} subtitle={t("coreClients.subtitle")} onGuide={() => setShowGuide(true)}>

      <div className="section-head">
        <h3>{t("coreClients.heading")}</h3>
        <div className="usr-list-bar" style={{ marginBottom: 0 }}>
          <button className="usr-btn-ghost" onClick={() => exportAppData("clients", "xlsx")}>{t("coreClients.export")}</button>
          <button
            type="button"
            className="usr-btn-ghost"
            disabled
            title={t("coreClients.importHint")}
          >
            {t("coreClients.importSoon")}
          </button>
          <button className="usr-add-btn" onClick={() => openAdd("client")}>{t("coreClients.newClient")}</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("coreClients.kpiCore")}</span></div><div className="kpi-val">{clients.length}</div><div className="kpi-foot">{t("coreClients.uniqueIdentity")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">OwnTerra Lands</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : appCount("lands")}</div><div className="kpi-foot">{t("coreClients.assignedAccess")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Properties</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : appCount("neighb")}</div><div className="kpi-foot">{t("coreClients.assignedAccess")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("coreClients.multiApp")}</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : multiAppCount}</div><div className="kpi-foot">{t("coreClients.assignedMultiple")}</div></div>
      </div>

      <div className="usr-layout">
        {/* LISTA */}
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">{t("coreClients.clientsCount").replace("{count}", filtered.length)}</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder={t("coreClients.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  {t(`coreClients.health.${c.account_health}`, c.account_health || t("coreClients.noDebt"))}
                </span>
                <span className="usr-dots">
                  {APPS.map((a) => (<span key={a.key} className={`usr-dot ${presentIn(c, a.key) ? `on-${a.key}` : ""}`} title={`${a.name}: ${appAssignmentsLoading ? t("coreClients.checkingAccess") : presentIn(c, a.key) ? t("coreClients.assigned") : t("coreClients.noAccess")}`} />))}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">{t("coreClients.noResults").replace("{query}", query)}</div>}
          </div>
        </div>

        {/* DETALLE */}
        <div className="usr-card">
          {!selected ? (
            <div className="usr-empty">{t("coreClients.selectClient")}</div>
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
                    {t(`coreClients.health.${selected.account_health}`, selected.account_health || t("coreClients.noDebt"))}
                  </span>
                  <span className="usr-d-type">{t(`coreClients.types.${selected.type}`, selected.type)}</span>
                  <button className="usr-add-btn" onClick={openEditClient}>{t("coreClients.editClient")}</button>
                </div>
              </div>

              <div className="usr-d-body">
                <div className="usr-d-intro">
                  {t("coreClients.intro")}
                </div>

                {APPS.map((app) => {
                  const isOn = app.live && assignedApps.has(app.key);
                  const isPending = assignAppMutation.isPending || removeAppMutation.isPending;
                  return (
                    <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""} ${!app.live ? "is-coming-soon" : ""}`}>
                      <div className="usr-app-top" style={{ marginBottom: 0 }}>
                        <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="usr-app-name">{app.name}{!app.live && <span className="usr-app-soon">{t("coreClients.comingSoon")}</span>}</div>
                          <div className="usr-app-handle">{app.handle} · {t(`coreClients.apps.${app.key}`)}</div>
                        </div>
                        <button
                          className={`usr-switch ${isOn ? "on" : ""}`}
                          role="switch"
                          aria-checked={isOn}
                          aria-disabled={!app.live || isPending}
                          aria-label={`${isOn ? t("coreClients.removeAccessTo") : t("coreClients.assignTo")} ${app.name}`}
                          disabled={!app.live || isPending}
                          onClick={() => toggleApp(app.key)}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="usr-summary">
                  <span>{t("coreClients.accessSummary").replace("{name}", selected.name.split(" ")[0]).replace("{count}", appsActivas)}</span>
                </div>

                {/* KPIs financieros del cliente */}
                <div className="usr-sec-label">{t("coreClients.adminInfo")}</div>
                <div className="usr-stats">
                  <div className="usr-stat ok"><div className="usr-stat-val">{activeContracts}</div><div className="usr-stat-lbl">{t("coreClients.activeContracts")}</div></div>
                  <div className="usr-stat overdue"><div className="usr-stat-val">{overdueCount}</div><div className="usr-stat-lbl">{t("coreClients.overduePayments")}</div></div>
                  <div className="usr-stat pending"><div className="usr-stat-val">{pendingCount}</div><div className="usr-stat-lbl">{t("coreClients.pendingPayments")}</div></div>
                </div>

                {/* Tabs */}
                <div className="usr-list-bar">
                  <div className="seg usr-tabs">
                    <span className={tab === "contracts" ? "on" : ""} onClick={() => setTab("contracts")}>
                      {t("coreClients.contracts").replace("{count}", contracts.length)}
                    </span>
                    <span className={tab === "documents" ? "on" : ""} onClick={() => setTab("documents")}>
                      {t("coreClients.identityDocuments").replace("{count}", identityDocs.length)}
                    </span>
                  </div>
                  {tab === "documents" && (
                    <button className="usr-add-btn" onClick={() => openAdd("document")}>{t("coreClients.uploadIdentity")}</button>
                  )}
                </div>

                {/* Filtro app — solo contratos */}
                {tab === "contracts" && associatedApps.length > 0 && (
                  <div className="usr-fil-row">
                    <span className="usr-fil-lbl">{t("coreClients.app")}</span>
                    <button className={`usr-fil ${appFilter === "all" ? "on" : ""}`} onClick={() => setAppFilter("all")}>{t("coreClients.all")}</button>
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
                      {t("coreClients.readOnly")}
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
                                  {ct.type} · {fmtMoney(ct.amount, localeTag)}
                                  {ct.contract_date ? ` · ${new Date(ct.contract_date).toLocaleDateString(localeTag)}` : ""}
                                </div>
                              </div>
                              <span className={`usr-chip ${ct.status}`}>{t(`coreClients.status.${ct.status}`, ct.status)}</span>
                              <span className="usr-row-val">{fmtMoney(ct.amount, localeTag)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="usr-rows-empty">
                        {appFilter === "all" ? t("coreClients.noContracts") : t("coreClients.noAppContracts")}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
                      {t("coreClients.reusableDocs")}
                    </div>
                    {identityDocs.length ? (
                      <div className="usr-rows">
                        {identityDocs.map((d) => (
                          <div key={d.id} className="usr-row">
                            <span className="usr-row-ico doc"><FileIcon /></span>
                            <div className="usr-row-info">
                              <div className="usr-row-name">{d.name}</div>
                              <div className="usr-row-meta">
                                {t(`coreClients.identityCategories.${d.category}`, d.category)} · {new Date(d.created_at).toLocaleDateString(localeTag)}
                              </div>
                            </div>
                            <span className="usr-chip" style={{ background: "rgba(111,175,107,.14)", color: "#2F6A38", border: "1px solid rgba(111,175,107,.3)" }}>
                              🌐 Core
                            </span>
                            <button className="usr-dl" onClick={() => downloadDocument(d.id, d.download_url, filenameForDocument(d))} title={t("coreClients.download")}>
                              <DownloadIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="usr-rows-empty">{t("coreClients.noIdentityDocs")}</div>
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
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.type === "client" ? (modal.mode === "edit" ? t("coreClients.editClient") : t("coreClients.newClient")) : t("coreClients.modal.identityDocument")}</div>
                <div className="usr-modal-sub">
                  {modal.type === "client"
                    ? (modal.mode === "edit" ? t("coreClients.modal.editSubtitle") : t("coreClients.modal.createSubtitle"))
                    : t("coreClients.modal.savedInCore").replace("{name}", selected.name)}
                </div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="usr-modal-body">
              {modal.type === "client" ? (
                <>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.firstName")}</label>
                      <input className="usr-input" value={modal.draft.first_name} onChange={(e) => setDraft({ first_name: e.target.value })} placeholder={t("coreClients.modal.firstExample")} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.lastName")}</label>
                      <input className="usr-input" value={modal.draft.last_name} onChange={(e) => setDraft({ last_name: e.target.value })} placeholder={t("coreClients.modal.lastExample")} />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.email")}</label>
                      <input className="usr-input" type="email" value={modal.draft.email} onChange={(e) => setDraft({ email: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.phone")}</label>
                      <input className="usr-input" value={modal.draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.type")}</label>
                      <select className="usr-select" value={modal.draft.type} disabled={modal.mode === "edit"} onChange={(e) => setDraft({ type: e.target.value })}>
                        {TYPE_KEYS.map((value) => <option key={value} value={value}>{t(`coreClients.types.${value}`)}</option>)}
                      </select>
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">{t("coreClients.modal.stage")}</label>
                      <select className="usr-select" value={modal.draft.pipeline_stage} onChange={(e) => setDraft({ pipeline_stage: e.target.value })}>
                        {STAGE_KEYS.map((value) => <option key={value} value={value}>{t(`coreClients.stages.${value}`)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">{t("coreClients.modal.seller")}</label>
                    <select className="usr-select" value={modal.draft.seller_id} onChange={(e) => setDraft({ seller_id: e.target.value })}>
                      <option value="">{t("coreClients.modal.unassigned")}</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="usr-sec-label">{t("coreClients.modal.appAccess")}</div>
                  {APPS.map((app) => {
                    const isOn = app.live && !!modal.draft.apps[app.key];
                    return (
                      <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""} ${!app.live ? "is-coming-soon" : ""}`}>
                        <div className="usr-app-top" style={{ marginBottom: 0 }}>
                          <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="usr-app-name">{app.name}{!app.live && <span className="usr-app-soon">{t("coreClients.comingSoon")}</span>}</div>
                            <div className="usr-app-handle">{app.handle}</div>
                          </div>
                          <button
                            className={`usr-switch ${isOn ? "on" : ""}`}
                            role="switch"
                            aria-checked={isOn}
                            aria-disabled={!app.live}
                            aria-label={`${isOn ? t("coreClients.removeAccessTo") : t("coreClients.assignTo")} ${app.name}`}
                            disabled={!app.live}
                            onClick={() => setDraft({ apps: { ...modal.draft.apps, [app.key]: !isOn } })}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="usr-field">
                    <label className="usr-field-lbl">{t("coreClients.modal.notes")}</label>
                    <textarea className="usr-input" rows="3" value={modal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div className="usr-field">
                    <label className="usr-field-lbl">{t("coreClients.modal.file")}</label>
                    <input className="usr-input" type="file" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setDraft({ file: f, name: modal.draft.name || f.name });
                    }} />
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">{t("coreClients.modal.documentName")}</label>
                    <input className="usr-input" placeholder={t("coreClients.modal.documentExample")} value={modal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">{t("coreClients.modal.identityType")}</label>
                    <select className="usr-select" value={modal.draft.category} onChange={(e) => setDraft({ category: e.target.value })}>
                      {IDENTITY_CATEGORIES.map((c) => <option key={c} value={c}>{t(`coreClients.identityCategories.${c}`)}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>{t("coreClients.modal.cancel")}</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending}>
                {uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending ? t("coreClients.modal.saving") : t("coreClients.modal.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={t("coreClients.guideTitle")}
        subtitle={t("coreClients.guideSubtitle")}
        steps={[
          { title: t("coreClients.guide.searchTitle"), text: t("coreClients.guide.searchText") },
          { title: t("coreClients.guide.createTitle"), text: t("coreClients.guide.createText") },
          { title: t("coreClients.guide.assignTitle"), text: t("coreClients.guide.assignText") },
          { title: t("coreClients.guide.editTitle"), text: t("coreClients.guide.editText") },
          { title: t("coreClients.guide.importTitle"), text: t("coreClients.guide.importText") },
          { title: t("coreClients.guide.exportTitle"), text: t("coreClients.guide.exportText") },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemClientes;
