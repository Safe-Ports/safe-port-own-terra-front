import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "./EcoLayout";
import { userService } from "@/services/userService";
import { useAppContext } from "@/context/AppContext";
import { getUserErrorMessage } from "@/services/errors";
import { GLOBAL_ROLES, VERTICAL_APP_CATALOG, defaultPermissionsFor } from "@/services/permissions";

const ROLE_LABEL = Object.fromEntries(Object.entries(GLOBAL_ROLES).map(([key, value]) => [key, value.label]));
const APP_LABEL = Object.fromEntries(VERTICAL_APP_CATALOG.map((app) => [app.key, app]));

const blankDraft = {
  name: "",
  email: "",
  phone: "",
  role: "vendor",
  password: "Temporal123",
  apps: {},
  is_active: true,
};

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const emailOk = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function EcosystemEquipo() {
  const qc = useQueryClient();
  const { showToast } = useAppContext();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [accessDraft, setAccessDraft] = useState(null);
  const [confirmAccessSave, setConfirmAccessSave] = useState(false);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users", "eco-team"],
    queryFn: () => userService.list({ limit: 100 }),
  });
  const users = data?.items ?? [];
  const selected = users.find((u) => String(u.id) === String(selectedId)) || users[0] || null;
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const roleOk = roleFilter === "all" || u.role === roleFilter;
      const textOk = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return roleOk && textOk;
    });
  }, [users, query, roleFilter]);

  const vendors = users.filter((u) => u.role === "vendor");
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveVendors = vendors.filter((u) => !u.is_active).length;

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
            permissions: defaultPermissionsFor(app.key, role),
            metadata: { scope: "vertical" },
          });
        }));
      }
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setSelectedId(String(created.id));
      setModal(null);
      setFormError("");
      showToast("Integrante creado");
    },
    onError: (err) => setFormError(getUserErrorMessage(err, "Error al crear el integrante")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => userService.update(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setSelectedId(String(updated.id));
      setModal(null);
      setFormError("");
      showToast("Integrante actualizado");
    },
    onError: (err) => setFormError(getUserErrorMessage(err, "Error al actualizar el integrante")),
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
            permissions: defaultPermissionsFor(app.key, role),
            metadata: { scope: "vertical" },
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
    onError: (err) => showToast(getUserErrorMessage(err, "Error al actualizar accesos")),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => userService.resetPassword(id),
    onSuccess: () => showToast("Contraseña restablecida"),
    onError: (err) => showToast(getUserErrorMessage(err, "Error al restablecer contraseña")),
  });

  const openCreate = () => {
    setFormError("");
    setModal({ mode: "create", draft: blankDraft });
  };
  const openEdit = (user) => {
    setFormError("");
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
    setFormError("");
    if (!draft.name.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (!emailOk(draft.email)) {
      setFormError("Ingresa un correo válido");
      return;
    }
    if (modal.mode === "create" && draft.password.trim().length < 8) {
      setFormError("La contraseña temporal debe tener al menos 8 caracteres");
      return;
    }
    if (modal.mode === "create") {
      createMutation.mutate(draft);
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
      <EcoLayout active="team" title="Equipo del core" subtitle="Usuarios, vendedores y permisos por app">
        <div className="usr-empty" style={{ padding: 40 }}>Cargando equipo...</div>
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="team" title="Equipo del core" subtitle="Usuarios internos · acceso a OwnTerra Lands">
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">Ecosistema Core</div>
          <h2>Equipo y vendedores</h2>
          <p>Administra usuarios internos desde el Core. Los vendedores con acceso a Lands se usan como responsables de clientes, lotes, contratos y cobranza.</p>
        </div>
        <button className="ag-primary" onClick={openCreate}>Nuevo integrante</button>
      </div>

      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Usuarios del core</span></div><div className="kpi-val">{users.length}</div><div className="kpi-foot">Identidades internas</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Vendedores Lands</span></div><div className="kpi-val">{vendors.length}</div><div className="kpi-foot">Rol vendor</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Activos</span></div><div className="kpi-val">{activeUsers}</div><div className="kpi-foot">Con acceso habilitado</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">Por revisar</span></div><div className="kpi-val">{inactiveVendors}</div><div className="kpi-foot">Vendedores inactivos</div></div>
      </div>

      <div className="usr-layout">
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">Integrantes ({filtered.length})</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Buscar integrante..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="usr-fil-row" style={{ marginTop: 12, marginBottom: 0 }}>
              {[
                ["all", "Todos"],
                ["admin", "Admins"],
                ["vendor", "Vendedores"],
              ].map(([value, label]) => (
                <button key={value} className={`usr-fil ${roleFilter === value ? "on" : ""}`} onClick={() => setRoleFilter(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="usr-list">
            {filtered.map((u) => (
              <button key={u.id} className={`usr-item ${String(u.id) === String(selected?.id) ? "active" : ""}`} onClick={() => setSelectedId(String(u.id))}>
                <span className="usr-av">{u.initials || initials(u.name)}</span>
                <span className="usr-info">
                  <span className="usr-name" style={{ display: "block" }}>{u.name}</span>
                  <span className="usr-mail" style={{ display: "block" }}>{u.email}</span>
                </span>
                <span className={`usr-chip ${u.is_active ? "active" : "closed"}`}>{ROLE_LABEL[u.role] || u.role}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">Sin integrantes para este filtro.</div>}
          </div>
        </div>

        <div className="usr-card">
          {!selected ? (
            <div className="usr-empty">Crea un integrante para empezar a asignar operación.</div>
          ) : (
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
                  Este usuario vive en el <b>Core</b>. Si es vendedor, OwnTerra Lands lo usa como responsable comercial para clientes, contratos, lotes y seguimiento de cobranza.
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
        </div>
      </div>

      {modal && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.mode === "create" ? "Nuevo integrante" : "Editar integrante"}</div>
                <div className="usr-modal-sub">El usuario queda registrado en el Core y se refleja en OwnTerra Lands.</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="usr-modal-body">
              {formError && <div className="usr-error">{formError}</div>}
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">Nombre</label>
                  <input className="usr-input" value={modal.draft.name} onChange={(e) => setDraft({ name: e.target.value })} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">Rol</label>
                  <select className="usr-select" value={modal.draft.role} onChange={(e) => setDraft({ role: e.target.value })}>
                    <option value="vendor">Vendedor Lands</option>
                    <option value="admin">Administrador Core</option>
                  </select>
                </div>
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Correo</label>
                <input className="usr-input" type="email" disabled={modal.mode === "edit"} value={modal.draft.email} onChange={(e) => setDraft({ email: e.target.value })} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Teléfono</label>
                <input className="usr-input" value={modal.draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} />
              </div>
              {modal.mode === "create" && (
                <div className="usr-field">
                  <label className="usr-field-lbl">Contraseña temporal</label>
                  <input className="usr-input" value={modal.draft.password} onChange={(e) => setDraft({ password: e.target.value })} />
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
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
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
                ¿Quieres guardar los accesos de <b>{selected.name}</b>?
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
    </EcoLayout>
  );
}

export default EcosystemEquipo;
