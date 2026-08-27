import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "./EcoLayout";
import GuideModal from "@/components/shared/GuideModal";
import { SkeletonRows } from "@/components/ui/Skeleton";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import PhoneInput from "@/components/shared/PhoneInput";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { userService } from "@/services/userService";
import { employeeService } from "@/services/employeeService";
import { jobTitleService } from "@/services/jobTitleService";
import { useAppContext } from "@/context/AppContext";
import { parseApiError } from "@/errors/parseApiError";
import { GLOBAL_ROLES, VERTICAL_APP_CATALOG } from "@/services/permissions";
import useEscapeKey from "@/hooks/useEscapeKey";

const ROLE_LABEL = Object.fromEntries(Object.entries(GLOBAL_ROLES).map(([key, value]) => [key, value.label]));
const APP_LABEL = Object.fromEntries(VERTICAL_APP_CATALOG.map((app) => [app.key, app]));

const blankDraft = {
  name: "",
  phone: "",
  wantsAccess: false,
  email: "",
  role: "vendor",
  password: "",
  apps: {},
  is_active: true,
  puesto: "",
  notes: "",
};

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const emailOk = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function EcosystemEquipo() {
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeKey, setActiveKey] = useState(null);
  const [modal, setModal]         = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [accessDraft, setAccessDraft] = useState(null);
  const [confirmAccessSave, setConfirmAccessSave] = useState(false);
  const [formError, setFormError] = useState(null);
  const [employeeModal, setEmployeeModal] = useState(null);
  const [employeeFormError, setEmployeeFormError] = useState(null);
  useEscapeKey(
    () => {
      if (confirmAccessSave) { setConfirmAccessSave(false); return; }
      setModal(null);
      setEmployeeModal(null);
    },
    Boolean(modal || confirmAccessSave || employeeModal),
  );
  const fe = useFieldErrors();
  const efe = useFieldErrors();

  // ── Datos base: usuarios (con login) y personal (sin login) ────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["users", "eco-team"],
    queryFn: () => userService.list({ limit: 100 }),
  });
  const users = data?.items ?? [];

  const { data: employeeData, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", "eco-team"],
    queryFn: () => employeeService.list({ limit: 100 }),
  });
  const employees = employeeData?.items ?? [];

  const { data: jobTitles } = useQuery({
    queryKey: ["job-titles", "eco-team"],
    queryFn: () => jobTitleService.list(),
  });

  const filtered = useMemo(() => {
    if (typeFilter === "employee") return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      // "Eliminar" un integrante lo desactiva (is_active=False) para conservar su
      // historial; NO se borra de la BD. Aquí lo tratamos como eliminado: no se lista.
      if (!u.is_active) return false;
      const roleOk = typeFilter === "all" || u.role === typeFilter;
      const textOk = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return roleOk && textOk;
    });
  }, [users, query, typeFilter]);

  const filteredEmployees = useMemo(() => {
    if (typeFilter === "admin" || typeFilter === "vendor") return [];
    const q = query.trim().toLowerCase();
    return employees.filter((e) => !q || e.name.toLowerCase().includes(q) || (e.puesto || "").toLowerCase().includes(q));
  }, [employees, query, typeFilter]);

  // Lista única: usuarios y personal mezclados y ordenados por nombre, cada uno
  // con su tipo (rol de User o puesto de Employee) y si tiene o no acceso a la app.
  const teamMembers = useMemo(() => {
    const u = filtered.map((x) => ({
      kind: "user", id: x.id, name: x.name, sub: x.email,
      badge: ROLE_LABEL[x.role] || x.role, hasAccess: true,
    }));
    const e = filteredEmployees.map((x) => ({
      kind: "employee", id: x.id, name: x.name, sub: x.puesto || "Sin puesto asignado",
      badge: x.puesto || "Empleado", hasAccess: false,
    }));
    return [...u, ...e].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [filtered, filteredEmployees]);

  const activeMember = teamMembers.find((m) => `${m.kind}:${m.id}` === activeKey) || teamMembers[0] || null;
  const selected = activeMember?.kind === "user" ? users.find((u) => String(u.id) === String(activeMember.id)) || null : null;
  const selectedEmployee = activeMember?.kind === "employee" ? employees.find((e) => String(e.id) === String(activeMember.id)) || null : null;
  const selectedUserId = selected?.id ? String(selected.id) : null;

  const { data: appsData } = useQuery({
    queryKey: ["user-apps", selectedUserId],
    queryFn: () => userService.getApps(selectedUserId),
    enabled: !!selectedUserId,
  });
  const appRows = appsData?.apps ?? [];
  const appByKey = Object.fromEntries(appRows.map((app) => [app.app_key, app]));
  const editingAccess = !!accessDraft;
  const selectedIsAdmin = selected?.role === "admin";
  const verticalAppRows = appRows.filter((app) => APP_LABEL[app.app_key]);

  useEffect(() => {
    setAccessDraft(null);
    setConfirmAccessSave(false);
  }, [selectedUserId]);

  const createMutation = useMutation({
    mutationFn: async (draft) => {
      const created = await userService.create({
        name: draft.name,
        email: draft.email,
        phone: draft.phone || undefined,
        role: draft.role,
        password: draft.password,
      });
      if (draft.role === "vendor") {
        const selectedApps = VERTICAL_APP_CATALOG.filter((app) => draft.apps?.[app.key]);
        await Promise.all(selectedApps.map((app) => {
          const role = app.defaultRole;
          return userService.upsertApp(created.id, app.key, {
            app_key: app.key,
            role,
            is_active: true,
          });
        }));
      }
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setActiveKey(`user:${created.id}`);
      setModal(null);
      setFormError(null);
      showToast("Integrante creado");
    },
    onError: (err) => setFormError(parseApiError(err, "Error al crear el integrante")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => userService.update(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setActiveKey(`user:${updated.id}`);
      setModal(null);
      setFormError(null);
      showToast("Integrante actualizado");
    },
    onError: (err) => setFormError(parseApiError(err, "Error al actualizar el integrante")),
  });

  const accessMutation = useMutation({
    mutationFn: async (draft) => {
      const operations = VERTICAL_APP_CATALOG.map((app) => {
        const current = appByKey[app.key];
        const next = draft[app.key];
        if (!next?.is_active && current) {
          return userService.removeApp(selectedUserId, app.key);
        }
        if (next?.is_active) {
          const role = app.defaultRole;
          if (current) return null;
          return userService.upsertApp(selectedUserId, app.key, {
            app_key: app.key,
            role,
            is_active: true,
          });
        }
        return null;
      }).filter(Boolean);
      await Promise.all(operations);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-apps", selectedUserId] });
      setAccessDraft(null);
      setConfirmAccessSave(false);
      showToast("Accesos actualizados");
    },
    onError: (err) => showError(err, "Error al actualizar accesos"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => userService.resetPassword(id),
    onSuccess: (data) => showToast(data?.message || "Contraseña restablecida"),
    onError: (err) => showError(err, "Error al restablecer contraseña"),
  });

  // Se dispara desde el modal unificado (botón "Nuevo colaborador"), nunca desde
  // employeeModal — ese solo edita. Guarda primero el puesto en el catálogo (si es
  // nuevo) para que la próxima persona ya lo encuentre en el datalist.
  const createEmployeeMutation = useMutation({
    mutationFn: async (draft) => {
      if (draft.puesto?.trim()) {
        await jobTitleService.create(draft.puesto.trim());
      }
      return employeeService.create({
        name: draft.name,
        puesto: draft.puesto || undefined,
        phone: draft.phone || undefined,
        notes: draft.notes || undefined,
      });
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["job-titles"] });
      setActiveKey(`employee:${created.id}`);
      setModal(null);
      setFormError(null);
      showToast("Colaborador registrado");
    },
    onError: (err) => setFormError(parseApiError(err, "Error al registrar el colaborador")),
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, body }) => {
      if (body.puesto?.trim()) {
        await jobTitleService.create(body.puesto.trim());
      }
      return employeeService.update(id, body);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["job-titles"] });
      setActiveKey(`employee:${updated.id}`);
      setEmployeeModal(null);
      setEmployeeFormError(null);
      showToast("Colaborador actualizado");
    },
    onError: (err) => setEmployeeFormError(parseApiError(err, "Error al actualizar el colaborador")),
  });

  const archiveEmployeeMutation = useMutation({
    mutationFn: (id) => employeeService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setActiveKey(null);
      showToast("Colaborador dado de baja");
    },
    onError: (err) => showError(err, "Error al dar de baja al colaborador"),
  });

  const openEditEmployee = (employee) => {
    setEmployeeFormError(null);
    efe.clearAll();
    setEmployeeModal({
      mode: "edit",
      employeeId: employee.id,
      draft: {
        name: employee.name || "",
        puesto: employee.puesto || "",
        phone: employee.phone || "",
        notes: employee.notes || "",
      },
    });
  };
  const setEmployeeDraft = (patch) => setEmployeeModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveEmployeeDraft = () => {
    const draft = employeeModal.draft;
    setEmployeeFormError(null);
    efe.clearAll();
    if (!draft.name.trim()) { efe.setErrors({ name: "El nombre es obligatorio." }); return; }
    updateEmployeeMutation.mutate({
      id: employeeModal.employeeId,
      body: {
        name: draft.name,
        puesto: draft.puesto || null,
        phone: draft.phone || null,
        notes: draft.notes || null,
      },
    });
  };

  const openCreate = () => {
    setFormError(null);
    fe.clearAll();
    setModal({ mode: "create", draft: blankDraft });
  };
  const openEdit = (user) => {
    setFormError(null);
    fe.clearAll();
    setModal({
      mode: "edit",
      userId: user.id,
      draft: {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "vendor",
        password: "",
        is_active: user.is_active,
      },
    });
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    const draft = modal.draft;
    const isUserFlow = modal.mode === "edit" || draft.wantsAccess;
    setFormError(null);
    fe.clearAll();
    const fieldErrs = {};
    if (!draft.name.trim()) fieldErrs.name = "El nombre es obligatorio.";
    if (isUserFlow) {
      if (modal.mode !== "edit" && !emailOk(draft.email)) fieldErrs.email = "Ingresa un correo electrónico válido.";
      if (modal.mode === "create" && draft.password.trim().length < 8) fieldErrs.password = "La contraseña temporal debe tener al menos 8 caracteres.";
    }
    if (Object.keys(fieldErrs).length) { fe.setErrors(fieldErrs); return; }
    if (modal.mode === "create") {
      if (draft.wantsAccess) {
        createMutation.mutate(draft);
      } else {
        createEmployeeMutation.mutate(draft);
      }
      return;
    }
    updateMutation.mutate({
      id: modal.userId,
      body: {
        name: draft.name,
        phone: draft.phone || null,
        role: draft.role,
        is_active: draft.is_active,
      },
    });
  };

  const startAccessEdit = () => {
    setAccessDraft(Object.fromEntries(VERTICAL_APP_CATALOG.map((app) => {
      const current = appByKey[app.key];
      return [app.key, {
        is_active: !!current,
      }];
    })));
  };

  const updateAccessDraft = (appKey, patch) => {
    setAccessDraft((draft) => {
      return {
        ...draft,
        [appKey]: {
          ...draft?.[appKey],
          ...patch,
        },
      };
    });
  };

  const accessChangesCount = accessDraft ? VERTICAL_APP_CATALOG.reduce((count, app) => {
    const current = appByKey[app.key];
    const next = accessDraft[app.key];
    if (!!current !== !!next?.is_active) return count + 1;
    return count;
  }, 0) : 0;

  if (isLoading) {
    return (
      <EcoLayout active="team" title="Equipo del core" subtitle="Usuarios, personal y permisos por app">
        <SkeletonRows rows={5} />
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="team" title="Equipo del core" subtitle="Usuarios internos y personal · acceso a OwnTerra Lands" onGuide={() => setShowGuide(true)}>
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">Ecosistema Core</div>
          <h2>Equipo</h2>
          <p>Administradores, vendedores y personal (obra, limpieza, colaboradores externos). Solo quien tiene acceso a la app puede loguearse — el resto se registra únicamente para presupuesto y pagos.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ag-primary" onClick={openCreate}>Nuevo colaborador</button>
        </div>
      </div>

      <div className="usr-layout">
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">Equipo ({teamMembers.length})</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Buscar por nombre, correo o puesto..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="usr-fil-row" style={{ marginTop: 12, marginBottom: 0 }}>
              {[
                ["all", "Todos"],
                ["admin", "Admins"],
                ["vendor", "Vendedores"],
                ["employee", "Personal"],
              ].map(([value, label]) => (
                <button key={value} className={`usr-fil ${typeFilter === value ? "on" : ""}`} onClick={() => setTypeFilter(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="usr-list">
            {(isLoading || employeesLoading) && <SkeletonRows rows={4} />}
            {!isLoading && !employeesLoading && teamMembers.map((m) => (
              <button
                key={`${m.kind}:${m.id}`}
                className={`usr-item ${activeMember && activeMember.kind === m.kind && String(activeMember.id) === String(m.id) ? "active" : ""}`}
                onClick={() => setActiveKey(`${m.kind}:${m.id}`)}
              >
                <span
                  className="usr-av"
                  title={m.hasAccess ? "Con acceso a la app" : "Sin acceso a la app"}
                  style={{ position: "relative" }}
                >
                  {initials(m.name)}
                  <span style={{
                    position: "absolute", right: -2, bottom: -2, width: 9, height: 9, borderRadius: "50%",
                    background: m.hasAccess ? "#3AA65B" : "#B7BDAF", border: "2px solid var(--surface, #fff)",
                  }} />
                </span>
                <span className="usr-info">
                  <span className="usr-name" style={{ display: "block" }}>{m.name}</span>
                  <span className="usr-mail" style={{ display: "block" }}>{m.sub}</span>
                </span>
                <span className={`usr-chip ${m.hasAccess ? "active" : "closed"}`}>{m.badge}</span>
              </button>
            ))}
            {!isLoading && !employeesLoading && teamMembers.length === 0 && <div className="usr-empty">Sin integrantes para este filtro.</div>}
          </div>
        </div>

        <div className="usr-card">
          {!selected && !selectedEmployee && (
            <div className="usr-empty">Crea un usuario o un colaborador para empezar.</div>
          )}

          {selected && (
            <>
              <div className="usr-d-head">
                <span className="usr-d-av">{selected.initials || initials(selected.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="usr-d-name">{selected.name}</div>
                  <div className="usr-d-meta">{selected.email} · {selected.phone || "sin teléfono"}</div>
                </div>
                <span className="usr-d-type">{ROLE_LABEL[selected.role] || selected.role}</span>
              </div>
              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Este usuario vive en el <b>Core</b> con acceso a la app. Si es vendedor, OwnTerra Lands lo usa como responsable comercial para clientes, contratos, lotes y seguimiento de cobranza.
                </div>
                <div className="usr-stats">
                  <div className="usr-stat ok"><div className="usr-stat-val">{selected.is_active ? "Sí" : "No"}</div><div className="usr-stat-lbl">Acceso activo</div></div>
                  <div className="usr-stat ok"><div className="usr-stat-val">{selectedIsAdmin ? "Todo" : verticalAppRows.length}</div><div className="usr-stat-lbl">Apps verticales</div></div>
                </div>
                <div className="usr-access-head">
                  <div className="usr-sec-label">Apps verticales</div>
                  {!editingAccess ? (
                    <button className="usr-add-btn" onClick={startAccessEdit}>Editar accesos</button>
                  ) : (
                    <div className="usr-access-actions">
                      <button className="usr-btn-ghost" onClick={() => setAccessDraft(null)} disabled={accessMutation.isPending}>Cancelar</button>
                      <button className="usr-btn-primary" onClick={() => setConfirmAccessSave(true)} disabled={accessMutation.isPending || accessChangesCount === 0}>
                        Guardar cambios{accessChangesCount > 0 ? ` (${accessChangesCount})` : ""}
                      </button>
                    </div>
                  )}
                </div>
                {selectedIsAdmin && (
                  <div className="usr-access-note">
                    Los administradores tienen acceso total por su rol global. Puedes marcar apps verticales solo para dejar explícita su asignación operativa.
                  </div>
                )}
                {VERTICAL_APP_CATALOG.map((app) => {
                  const row = appByKey[app.key];
                  const draftRow = accessDraft?.[app.key];
                  const isOn = editingAccess ? !!draftRow?.is_active : !!row;
                  return (
                  <div key={app.key} className={`usr-app-block ${isOn ? "is-on" : ""}`}>
                    <div className="usr-app-top" style={{ marginBottom: 0 }}>
                      <span className={`usr-app-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="usr-app-name">{app.name}</div>
                        <div className="usr-app-handle">{app.desc}</div>
                      </div>
                      {editingAccess ? (
                        <button
                          className={`usr-app-check ${isOn ? "on" : ""}`}
                          aria-pressed={isOn}
                          disabled={accessMutation.isPending}
                          onClick={() => {
                            updateAccessDraft(app.key, { is_active: !isOn });
                          }}
                        >
                          <span className="chk">{isOn ? "✓" : ""}</span>
                          {isOn ? "Seleccionada" : "Seleccionar"}
                        </button>
                      ) : (
                        <span className={`usr-chip ${isOn ? "active" : "closed"}`}>{isOn ? "Activo" : "Sin acceso"}</span>
                      )}
                    </div>
                  </div>
                  );
                })}
                <div className="usr-list-bar" style={{ marginTop: 18 }}>
                  <button className="usr-add-btn" onClick={() => openEdit(selected)}>Editar integrante</button>
                  <button className="usr-btn-ghost" disabled={resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate(selected.id)}>
                    {resetPasswordMutation.isPending ? "Restableciendo..." : "Restablecer contraseña"}
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedEmployee && (
            <>
              <div className="usr-d-head">
                <span className="usr-d-av">{selectedEmployee.initials || initials(selectedEmployee.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="usr-d-name">{selectedEmployee.name}</div>
                  <div className="usr-d-meta">{selectedEmployee.puesto || "Sin puesto asignado"} · {selectedEmployee.phone || "sin teléfono"}</div>
                </div>
                <span className="usr-d-type">Sin acceso</span>
              </div>
              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Este colaborador vive en el <b>Core</b> como registro de personal — sin usuario ni contraseña. No puede loguearse a ninguna app del ecosistema bajo ningún concepto.
                </div>
                {selectedEmployee.notes && (
                  <div className="usr-access-note" style={{ marginTop: 8 }}>{selectedEmployee.notes}</div>
                )}
                <div className="usr-list-bar" style={{ marginTop: 18 }}>
                  <button className="usr-add-btn" onClick={() => openEditEmployee(selectedEmployee)}>Editar colaborador</button>
                  <button
                    className="usr-btn-ghost"
                    disabled={archiveEmployeeMutation.isPending}
                    onClick={() => archiveEmployeeMutation.mutate(selectedEmployee.id)}
                  >
                    {archiveEmployeeMutation.isPending ? "Dando de baja..." : "Dar de baja"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <datalist id="job-titles-list">
        {(jobTitles ?? []).map((jt) => <option key={jt.id} value={jt.name} />)}
      </datalist>

      {employeeModal && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setEmployeeModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">Editar colaborador</div>
                <div className="usr-modal-sub">Registro de personal en el Core — sin usuario ni acceso a ninguna app.</div>
              </div>
              <button className="usr-modal-close" onClick={() => setEmployeeModal(null)}>x</button>
            </div>
            <div className="usr-modal-body">
              <InlineError error={employeeFormError} onDismiss={() => setEmployeeFormError(null)} />
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">Nombre</label>
                  <input {...efe.fieldProps("name", "usr-input")} value={employeeModal.draft.name} onChange={(e) => { setEmployeeDraft({ name: e.target.value }); efe.clear("name"); }} />
                  <FieldError msg={efe.errors.name} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">Puesto</label>
                  <input className="usr-input" list="job-titles-list" placeholder="Obra, limpieza, colaborador externo..." value={employeeModal.draft.puesto} onChange={(e) => setEmployeeDraft({ puesto: e.target.value })} />
                </div>
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Teléfono</label>
                <PhoneInput inputClassName="usr-input" value={employeeModal.draft.phone} onChange={(v) => setEmployeeDraft({ phone: v })} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Notas</label>
                <input className="usr-input" value={employeeModal.draft.notes} onChange={(e) => setEmployeeDraft({ notes: e.target.value })} />
              </div>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setEmployeeModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveEmployeeDraft} disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
                {createEmployeeMutation.isPending || updateEmployeeMutation.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.mode === "create" ? "Nuevo colaborador" : "Editar integrante"}</div>
                <div className="usr-modal-sub">
                  {modal.mode === "create"
                    ? "Se registra en el Core. Por defecto, sin acceso a ninguna app."
                    : "El usuario queda registrado en el Core y se refleja en OwnTerra Lands."}
                </div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="usr-modal-body">
              <InlineError error={formError} onDismiss={() => setFormError(null)} />
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">Nombre</label>
                  <input {...fe.fieldProps("name", "usr-input")} value={modal.draft.name} onChange={(e) => { setDraft({ name: e.target.value }); fe.clear("name"); }} />
                  <FieldError msg={fe.errors.name} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">Teléfono</label>
                  <PhoneInput inputClassName="usr-input" value={modal.draft.phone} onChange={(v) => setDraft({ phone: v })} />
                </div>
              </div>

              {modal.mode === "create" && (
                <label className="usr-check">
                  <input type="checkbox" checked={modal.draft.wantsAccess} onChange={(e) => setDraft({ wantsAccess: e.target.checked })} />
                  <span>¿Le damos acceso a la app?</span>
                </label>
              )}

              {(modal.mode === "edit" || modal.draft.wantsAccess) ? (
                <>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Rol</label>
                    <select className="usr-select" value={modal.draft.role} onChange={(e) => setDraft({ role: e.target.value })}>
                      <option value="vendor">Vendedor Lands</option>
                      <option value="admin">Administrador Core</option>
                    </select>
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Correo</label>
                    <input {...fe.fieldProps("email", "usr-input")} type="email" disabled={modal.mode === "edit"} value={modal.draft.email} onChange={(e) => { setDraft({ email: e.target.value }); fe.clear("email"); }} />
                    <FieldError msg={fe.errors.email} />
                  </div>
                  {modal.mode === "create" && (
                    <div className="usr-field">
                      <label className="usr-field-lbl">Contraseña temporal</label>
                      <input {...fe.fieldProps("password", "usr-input")} value={modal.draft.password} onChange={(e) => { setDraft({ password: e.target.value }); fe.clear("password"); }} />
                      <FieldError msg={fe.errors.password} />
                    </div>
                  )}
                  {modal.mode === "create" && modal.draft.role === "vendor" && (
                    <div className="usr-field">
                      <label className="usr-field-lbl">Apps verticales</label>
                      <div className="usr-app-picks">
                        {VERTICAL_APP_CATALOG.map((app) => {
                          const isPicked = !!modal.draft.apps?.[app.key];
                          return (
                            <button
                              key={app.key}
                              type="button"
                              className={`usr-app-pick ${isPicked ? "on" : ""}`}
                              onClick={() => setDraft({ apps: { ...modal.draft.apps, [app.key]: !isPicked } })}
                            >
                              <span className={`usr-app-pick-ico app-icon ${app.cls}`}><svg><use href={`#${app.icon}`} /></svg></span>
                              <span>
                                <b>{app.name}</b>
                                <small>{app.desc}</small>
                              </span>
                              <span className="chk">{isPicked ? "✓" : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {modal.mode === "edit" && (
                    <label className="usr-check">
                      <input type="checkbox" checked={modal.draft.is_active} onChange={(e) => setDraft({ is_active: e.target.checked })} />
                      <span>Acceso activo</span>
                    </label>
                  )}
                </>
              ) : (
                <>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Puesto</label>
                    <input className="usr-input" list="job-titles-list" placeholder="Obra, limpieza, colaborador externo..." value={modal.draft.puesto} onChange={(e) => setDraft({ puesto: e.target.value })} />
                  </div>
                  <div className="usr-field">
                    <label className="usr-field-lbl">Notas</label>
                    <input className="usr-input" value={modal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={createMutation.isPending || updateMutation.isPending || createEmployeeMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending || createEmployeeMutation.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAccessSave && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmAccessSave(false)}>
          <div className="usr-modal usr-confirm-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">Confirmar accesos</div>
                <div className="usr-modal-sub">Este cambio se aplica al instante en el ecosistema.</div>
              </div>
              <button className="usr-modal-close" onClick={() => setConfirmAccessSave(false)}>x</button>
            </div>
            <div className="usr-modal-body">
              <div className="usr-confirm-icon">
                <span className="app-icon ic-lands">
                  <svg><use href="#eco-n-shield" /></svg>
                </span>
              </div>
              <p className="usr-confirm-copy">
                ¿Quieres guardar los accesos de <b>{selected?.name}</b>?
              </p>
              <p className="usr-confirm-note">
                Se aplicarán {accessChangesCount} cambio{accessChangesCount === 1 ? "" : "s"} de acceso a apps verticales. Internamente OwnTerra decidirá qué vistas puede usar según su rol.
              </p>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setConfirmAccessSave(false)} disabled={accessMutation.isPending}>Volver a editar</button>
              <button className="usr-btn-primary" onClick={() => accessMutation.mutate(accessDraft)} disabled={accessMutation.isPending || accessChangesCount === 0}>
                {accessMutation.isPending ? "Guardando..." : "Confirmar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Equipo"
        subtitle="Usuarios con acceso al ecosistema y personal sin acceso, en un solo lugar."
        steps={[
          { title: "Dos tipos, una lista", text: "Los círculos verdes son usuarios (tienen login); los grises son personal (obra, limpieza, colaboradores externos) sin acceso a ninguna app." },
          { title: "Roles disponibles", text: "Admin: acceso completo incluyendo configuración y gestión de usuarios. Vendor: acceso a operaciones comerciales sin configuración administrativa." },
          { title: "Nuevo colaborador", text: "Pulsa 'Nuevo colaborador': por defecto queda sin acceso (nombre, puesto, teléfono). Marca '¿Le damos acceso a la app?' solo si necesita loguearse — ahí pide correo, rol y contraseña temporal." },
          { title: "Asignar apps", text: "Desde la ficha de cada usuario puedes activar o desactivar su acceso a OwnTerra Lands." },
          { title: "Restablecer contraseña", text: "Si un usuario olvidó su contraseña, usa el botón de restablecer en su ficha para generar una nueva contraseña temporal." },
          { title: "Filtrar por tipo", text: "Las pestañas superiores permiten ver todos, solo admins, solo vendedores, o solo personal." },
          { title: "Vendedores en Lands", text: "Los usuarios con rol Vendor aparecen en los selectores de vendedor al crear contratos, lotes y clientes en OwnTerra Lands." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemEquipo;
