import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import GuideModal from "@/components/shared/GuideModal";
import { clientService } from "@/services/clientService";
import { documentService, filenameForDocument } from "@/services/documentService";
import { userService } from "@/services/userService";
import { useAppContext } from "@/context/AppContext";
import { parseApiError } from "@/errors/parseApiError";

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
const emailOk = (value = "") => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const TYPE_LABEL = { buyer: "Comprador", lead: "Prospecto", tenant: "Arrendatario" };
const STATUS_LABEL = { active: "Activo", overdue: "Vencido", closed: "Cerrado", pending: "Pendiente" };
const STAGE_LABEL = { new: "Nuevo", contacted: "Contactado", visited: "Visitado", quoted: "Cotizado", reserved: "Apartado", won: "Ganado", lost: "Perdido" };
const CLIENT_REQUIRED_ALIASES = ["Nombre", "Nombre completo", "Cliente"];
const CLIENT_TEMPLATE_GUIDE = [
  ["GUÍA PARA CARGAR CLIENTES"],
  ["Regla", "Detalle"],
  ["Campo requerido", "Nombre. Debe existir como columna y tener valor en todas las filas."],
  ["Campos opcionales", "Correo, Teléfono, Tipo, Etapa y Notas."],
  ["Tipos aceptados", "prospecto, comprador o arrendatario."],
  ["Etapas aceptadas", "nuevo, contactado, visitado, cotizado, apartado, ganado o perdido."],
  ["Archivos aceptados", "XLSX, XLS o CSV de hasta 10 MB."],
  ["Importante", "Si falta un campo requerido, no se cargará ninguna fila."],
];

const FileIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 2h7l5 5v15H6z" /><path d="M13 2v5h5" /></svg>);
const DownloadIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>);

function EcosystemClientes() {
  const qc = useQueryClient();
  const { downloadDocument, exportAppData, showToast, showError } = useAppContext();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("contracts");
  const [appFilter, setAppFilter] = useState("all");
  const [modal, setModal]             = useState(null);
  const [clientImport, setClientImport] = useState(null);
  const [showGuide, setShowGuide]     = useState(false);

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
      showToast("Cliente actualizado en el Core");
    },
    onError: (err) => showError(err, "Error al actualizar cliente"),
  });

  const importClientsMutation = useMutation({
    mutationFn: async (rows) => {
      const result = { created: 0, failed: [], warnings: [] };
      for (const row of rows) {
        try {
          const created = await clientService.create(row.payload);
          result.created += 1;
          try {
            await clientService.assignApp(created.id, "lands");
          } catch (err) {
            result.warnings.push(`${row.name}: creado, pero no se pudo vincular con Lands (${parseApiError(err, "error de acceso").message}).`);
          }
        } catch (err) {
          result.failed.push(`${row.name}: ${parseApiError(err, "No se pudo crear").message}`);
        }
      }
      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setClientImport((current) => ({ ...current, rows: [], result }));
      showToast(`${result.created} clientes creados${result.failed.length ? ` · ${result.failed.length} omitidos` : ""}`);
    },
    onError: (err) => showError(err, "Error al cargar clientes"),
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
        showToast("Ingresa un correo válido");
        return;
      }
      if (modal.mode === "edit") {
        updateClientMutation.mutate({ clientId: modal.clientId, draft: { ...draft, name: fullName } });
      } else {
        createClientMutation.mutate({ ...draft, name: fullName });
      }
    } else if (type === "document") {
      if (!draft.file) {
        showToast("Selecciona un archivo para subir");
        return;
      }
      uploadDocMutation.mutate({ file: draft.file, name: draft.name || draft.file.name, category: draft.category });
    } else {
      setModal(null);
    }
  };

  const downloadClientTemplate = () => {
    const rows = [
      { Nombre: "Mariana López", Correo: "mariana@example.com", Telefono: "5551234567", Tipo: "prospecto", Etapa: "nuevo", Notas: "Interesada en lotes" },
      { Nombre: "Carlos Rivera", Correo: "carlos@example.com", Telefono: "5559876543", Tipo: "comprador", Etapa: "contactado", Notas: "" },
    ];
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Clientes");
    const guideSheet = XLSX.utils.aoa_to_sheet(CLIENT_TEMPLATE_GUIDE);
    guideSheet["!cols"] = [{ wch: 24 }, { wch: 82 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Guía");
    XLSX.writeFile(workbook, "plantilla_clientes.xlsx");
    showToast("Plantilla de clientes descargada");
  };

  const readClientImport = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setClientImport({ fileName: file.name, rows: [], errors: ["El archivo no puede superar 10 MB."], result: null });
      showToast("El archivo no puede superar 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) : [];
        const rawRows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "" }) : [];
        const norm = (value) => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const get = (row, aliases) => {
          const key = Object.keys(row).find((header) => aliases.some((alias) => norm(header) === norm(alias)));
          return key ? String(row[key]).trim() : "";
        };
        if (!rawRows.length) {
          setClientImport({ fileName: file.name, rows: [], errors: ["El archivo no contiene filas de datos."], result: null });
          showToast("El archivo no contiene filas de datos");
          return;
        }
        const headers = (matrix[0] || []).map((header) => String(header).trim());
        const hasNameColumn = headers.some((header) => CLIENT_REQUIRED_ALIASES.some((alias) => norm(header) === norm(alias)));
        if (!hasNameColumn) {
          setClientImport({
            fileName: file.name,
            rows: [],
            errors: ["No se cargó ninguna fila: falta la columna obligatoria Nombre."],
            result: null,
          });
          showToast("Falta la columna obligatoria Nombre");
          return;
        }
        const rowsWithoutName = rawRows.flatMap((row, index) => get(row, CLIENT_REQUIRED_ALIASES) ? [] : [index + 2]);
        if (rowsWithoutName.length) {
          const visibleRows = rowsWithoutName.slice(0, 8).join(", ");
          const remaining = rowsWithoutName.length > 8 ? ` y ${rowsWithoutName.length - 8} más` : "";
          setClientImport({
            fileName: file.name,
            rows: [],
            errors: [
              "No se cargó ninguna fila porque existen valores requeridos vacíos.",
              `Nombre vacío en filas: ${visibleRows}${remaining}.`,
            ],
            result: null,
          });
          showToast("No se cargó el archivo: hay filas sin Nombre");
          return;
        }
        const typeMap = { prospecto: "lead", lead: "lead", comprador: "buyer", buyer: "buyer", arrendatario: "tenant", tenant: "tenant" };
        const stageMap = { nuevo: "new", new: "new", contactado: "contacted", contacted: "contacted", visitado: "visited", visited: "visited", cotizado: "quoted", quoted: "quoted", apartado: "reserved", reserved: "reserved", ganado: "won", won: "won", perdido: "lost", lost: "lost" };
        const seenEmails = new Set();
        const errors = [];
        const rows = rawRows.flatMap((row, index) => {
          const name = get(row, CLIENT_REQUIRED_ALIASES);
          const email = get(row, ["Correo", "Email", "Correo electrónico"]).toLowerCase();
          if (email && seenEmails.has(email)) {
            errors.push(`Fila ${index + 2}: correo duplicado (${email}).`);
            return [];
          }
          if (email) seenEmails.add(email);
          return [{
            name,
            payload: {
              name,
              email: email || undefined,
              phone: get(row, ["Telefono", "Teléfono", "Phone"]) || undefined,
              type: typeMap[norm(get(row, ["Tipo"]))] || "lead",
              pipeline_stage: stageMap[norm(get(row, ["Etapa", "Stage"]))] || "new",
              notes: get(row, ["Notas", "Observaciones"]) || undefined,
            },
          }];
        });
        setClientImport({ fileName: file.name, rows, errors, result: null });
        showToast(`${rows.length} clientes listos para cargar`);
      } catch (err) {
        setClientImport({
          fileName: file.name,
          rows: [],
          errors: ["No fue posible leer el archivo. Descarga la plantilla y verifica el formato."],
          result: null,
        });
        showError(err, "No fue posible leer el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
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
          <button className="usr-btn-ghost" onClick={() => setClientImport({ fileName: "", rows: [], errors: [], result: null })}>Cargar clientes</button>
          <button className="usr-add-btn" onClick={() => openAdd("client")}>Nuevo cliente</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Clientes en el core</span></div><div className="kpi-val">{clients.length}</div><div className="kpi-foot">Identidad única compartida</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En OwnTerra Lands</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : appCount("lands")}</div><div className="kpi-foot">Con acceso asignado</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">En Neighborhoods</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : appCount("neighb")}</div><div className="kpi-foot">Con acceso asignado</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Multi-app</span></div><div className="kpi-val">{appAssignmentsLoading ? "—" : multiAppCount}</div><div className="kpi-foot">Asignados en 2+ apps</div></div>
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
                  {APPS.map((a) => (<span key={a.key} className={`usr-dot ${presentIn(c, a.key) ? `on-${a.key}` : ""}`} title={`${a.name}: ${appAssignmentsLoading ? "consultando acceso" : presentIn(c, a.key) ? "asignado" : "sin acceso"}`} />))}
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
                <div className="usr-list-bar" style={{ margin: 0, marginLeft: "auto" }}>
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
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
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
            <div className="usr-modal-body">
              {modal.type === "client" ? (
                <>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">Nombre(s)</label>
                      <input className="usr-input" value={modal.draft.first_name} onChange={(e) => setDraft({ first_name: e.target.value })} placeholder="Ej. Mariana" />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Apellido(s)</label>
                      <input className="usr-input" value={modal.draft.last_name} onChange={(e) => setDraft({ last_name: e.target.value })} placeholder="Ej. López" />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">Correo</label>
                      <input className="usr-input" type="email" value={modal.draft.email} onChange={(e) => setDraft({ email: e.target.value })} />
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Telefono</label>
                      <input className="usr-input" value={modal.draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="usr-field-row">
                    <div className="usr-field">
                      <label className="usr-field-lbl">Tipo</label>
                      <select className="usr-select" value={modal.draft.type} disabled={modal.mode === "edit"} onChange={(e) => setDraft({ type: e.target.value })}>
                        {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div className="usr-field">
                      <label className="usr-field-lbl">Etapa</label>
                      <select className="usr-select" value={modal.draft.pipeline_stage} onChange={(e) => setDraft({ pipeline_stage: e.target.value })}>
                        {Object.entries(STAGE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Vendedor responsable en Lands</label>
                    <select className="usr-select" value={modal.draft.seller_id} onChange={(e) => setDraft({ seller_id: e.target.value })}>
                      <option value="">Sin asignar</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
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
                          <button
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
                    <label className="usr-field-lbl">Notas</label>
                    <textarea className="usr-input" rows="3" value={modal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending}>
                {uploadDocMutation.isPending || createClientMutation.isPending || updateClientMutation.isPending ? "Guardando…" : "✓ Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {clientImport && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setClientImport(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">Carga de clientes</div>
                <div className="usr-modal-sub">Importa identidades al Core desde XLSX, XLS o CSV.</div>
              </div>
              <button className="usr-modal-close" onClick={() => setClientImport(null)}>×</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-import-guide">
                <div className="usr-import-guide-item required">
                  <b>Columna requerida</b>
                  <span>Nombre</span>
                  <small>Debe existir y tener valor en todas las filas.</small>
                </div>
                <div className="usr-import-guide-item">
                  <b>Columnas opcionales</b>
                  <span>Correo · Teléfono · Tipo · Etapa · Notas</span>
                  <small>Los campos omitidos usarán valores predeterminados.</small>
                </div>
                <div className="usr-import-guide-item">
                  <b>Regla de validación</b>
                  <span>Carga completa o rechazo completo</span>
                  <small>Si falta un campo requerido, no se crea ningún cliente.</small>
                </div>
              </div>
              <div className="usr-list-bar">
                <button className="usr-btn-ghost" onClick={downloadClientTemplate}>Descargar plantilla</button>
                <label className="usr-add-btn" style={{ cursor: "pointer" }}>
                  Seleccionar archivo
                  <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { readClientImport(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
              {clientImport.fileName && (
                <div className="usr-d-intro">
                  <b>{clientImport.fileName}</b><br />
                  {clientImport.rows.length} clientes listos · {clientImport.errors.length} observaciones
                </div>
              )}
              {clientImport.rows.length > 0 && (
                <div className="usr-rows">
                  {clientImport.rows.slice(0, 8).map((row, index) => (
                    <div key={`${row.payload.email || row.name}-${index}`} className="usr-row">
                      <span className="usr-av">{initials(row.name)}</span>
                      <div className="usr-row-info">
                        <div className="usr-row-name">{row.name}</div>
                        <div className="usr-row-meta">{row.payload.email || "Sin correo"} · {TYPE_LABEL[row.payload.type]}</div>
                      </div>
                    </div>
                  ))}
                  {clientImport.rows.length > 8 && <div className="usr-rows-empty">Y {clientImport.rows.length - 8} clientes más.</div>}
                </div>
              )}
              {(clientImport.errors.length > 0 || clientImport.result?.failed?.length > 0 || clientImport.result?.warnings?.length > 0) && (
                <div className="usr-error">
                  {[...clientImport.errors, ...(clientImport.result?.failed || []), ...(clientImport.result?.warnings || [])].slice(0, 8).map((error) => <div key={error}>{error}</div>)}
                </div>
              )}
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setClientImport(null)}>Cerrar</button>
              <button
                className="usr-btn-primary"
                disabled={!clientImport.rows.length || importClientsMutation.isPending}
                onClick={() => importClientsMutation.mutate(clientImport.rows)}
              >
                {importClientsMutation.isPending ? "Cargando…" : `Crear ${clientImport.rows.length} clientes`}
              </button>
            </div>
          </div>
        </div>
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
          { title: "Cargar clientes (bulk)", text: "Usa 'Cargar clientes' para importar múltiples clientes desde un archivo XLSX. La plantilla especifica las columnas requeridas." },
          { title: "Exportar directorio", text: "'Exportar clientes' descarga el directorio completo en formato Excel con todos los datos de cada cliente." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemClientes;
