import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "./EcoLayout";
import GuideModal from "@/components/shared/GuideModal";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { userService } from "@/services/userService";
import { useAppContext } from "@/context/AppContext";
import { parseApiError } from "@/errors/parseApiError";
import { GLOBAL_ROLES, VERTICAL_APP_CATALOG } from "@/services/permissions";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

const ROLE_LABEL = Object.fromEntries(Object.entries(GLOBAL_ROLES).map(([key, value]) => [key, value.label]));
const APP_LABEL = Object.fromEntries(VERTICAL_APP_CATALOG.map((app) => [app.key, app]));

const blankDraft = {
  name: "",
  email: "",
  phone: "",
  role: "vendor",
  password: "",
  apps: {},
  is_active: true,
};

const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const emailOk = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function EcosystemEquipo() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal]         = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [accessDraft, setAccessDraft] = useState(null);
  const [confirmAccessSave, setConfirmAccessSave] = useState(false);
  const [formError, setFormError] = useState(null);
  useEscapeKey(
    () => confirmAccessSave ? setConfirmAccessSave(false) : setModal(null),
    Boolean(modal || confirmAccessSave),
  );
  const fe = useFieldErrors();

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
      // "Eliminar" un integrante lo desactiva (is_active=False) para conservar su
      // historial; NO se borra de la BD. Aquí lo tratamos como eliminado: no se lista.
      if (!u.is_active) return false;
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
          });
        }));
      }
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setSelectedId(String(created.id));
      setModal(null);
      setFormError(null);
      showToast(t("team.created"));
    },
    onError: (err) => setFormError(parseApiError(err, t("team.createError"))),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => userService.update(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setSelectedId(String(updated.id));
      setModal(null);
      setFormError(null);
      showToast(t("team.updated"));
    },
    onError: (err) => setFormError(parseApiError(err, t("team.updateError"))),
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
      showToast(t("team.accessUpdated"));
    },
    onError: (err) => showError(err, t("team.accessError")),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => userService.resetPassword(id),
    onSuccess: () => showToast(t("team.passwordReset")),
    onError: (err) => showError(err, t("team.passwordError")),
  });

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
    setFormError(null);
    fe.clearAll();
    const fieldErrs = {};
    if (!draft.name.trim()) fieldErrs.name = t("team.nameRequired");
    if (modal.mode !== "edit" && !emailOk(draft.email)) fieldErrs.email = t("team.emailInvalid");
    if (modal.mode === "create" && draft.password.trim().length < 8) fieldErrs.password = t("team.passwordMin");
    if (Object.keys(fieldErrs).length) { fe.setErrors(fieldErrs); return; }
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
      <EcoLayout active="team" title={t("team.title")} subtitle={t("team.loadingSubtitle")}>
        <div className="usr-empty" style={{ padding: 40 }}>{t("team.loading")}</div>
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="team" title={t("team.title")} subtitle={t("team.subtitle")} onGuide={() => setShowGuide(true)}>
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">{t("team.kicker")}</div>
          <h2>{t("team.heading")}</h2>
          <p>{t("team.description")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ag-primary" onClick={openCreate}>{t("team.newMember")}</button>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("team.coreUsers")}</span></div><div className="kpi-val">{users.length}</div><div className="kpi-foot">{t("team.internalIdentities")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("team.landsSellers")}</span></div><div className="kpi-val">{vendors.length}</div><div className="kpi-foot">{t("team.vendorRole")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("team.active")}</span></div><div className="kpi-val">{activeUsers}</div><div className="kpi-foot">{t("team.accessEnabled")}</div></div>
        <div className="kpi"><div className="kpi-head"><span className="kpi-label">{t("team.review")}</span></div><div className="kpi-val">{inactiveVendors}</div><div className="kpi-foot">{t("team.inactiveSellers")}</div></div>
      </div>

      <div className="usr-layout">
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">{t("team.membersCount").replace("{count}", filtered.length)}</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder={t("team.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="usr-fil-row" style={{ marginTop: 12, marginBottom: 0 }}>
              {[
                ["all", t("team.all")],
                ["admin", t("team.admins")],
                ["vendor", t("team.sellers")],
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
                <span className="usr-chip active">{t(`team.role.${u.role}`, ROLE_LABEL[u.role] || u.role)}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="usr-empty">{t("team.noMembers")}</div>}
          </div>
        </div>

        <div className="usr-card">
          {!selected ? (
            <div className="usr-empty">{t("team.createFirst")}</div>
          ) : (
            <>
              <div className="usr-d-head">
                <span className="usr-d-av">{selected.initials || initials(selected.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="usr-d-name">{selected.name}</div>
                  <div className="usr-d-meta">{selected.email} · {selected.phone || t("team.noPhone")}</div>
                </div>
                <span className="usr-d-type">{t(`team.role.${selected.role}`, ROLE_LABEL[selected.role] || selected.role)}</span>
              </div>
              <div className="usr-d-body">
                <div className="usr-d-intro">
                  {t("team.intro")}
                </div>
                <div className="usr-stats">
                  <div className="usr-stat ok"><div className="usr-stat-val">{selected.is_active ? t("team.yes") : t("team.no")}</div><div className="usr-stat-lbl">{t("team.activeAccess")}</div></div>
                  <div className="usr-stat ok"><div className="usr-stat-val">{selectedIsAdmin ? t("team.allApps") : verticalAppRows.length}</div><div className="usr-stat-lbl">{t("team.verticalApps")}</div></div>
                </div>
                <div className="usr-access-head">
                  <div className="usr-sec-label">{t("team.verticalApps")}</div>
                  {!editingAccess ? (
                    <button className="usr-add-btn" onClick={startAccessEdit}>{t("team.editAccess")}</button>
                  ) : (
                    <div className="usr-access-actions">
                      <button className="usr-btn-ghost" onClick={() => setAccessDraft(null)} disabled={accessMutation.isPending}>{t("team.cancel")}</button>
                      <button className="usr-btn-primary" onClick={() => setConfirmAccessSave(true)} disabled={accessMutation.isPending || accessChangesCount === 0}>
                        {t("team.saveChanges")}{accessChangesCount > 0 ? ` (${accessChangesCount})` : ""}
                      </button>
                    </div>
                  )}
                </div>
                {selectedIsAdmin && (
                  <div className="usr-access-note">
                    {t("team.adminNote")}
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
                        <div className="usr-app-handle">{t(`coreClients.apps.${app.key}`, app.desc)}</div>
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
                          {isOn ? t("team.selected") : t("team.select")}
                        </button>
                      ) : (
                        <span className={`usr-chip ${isOn ? "active" : "closed"}`}>{isOn ? t("team.active") : t("team.noAccess")}</span>
                      )}
                    </div>
                  </div>
                  );
                })}
                <div className="usr-list-bar" style={{ marginTop: 18 }}>
                  <button className="usr-add-btn" onClick={() => openEdit(selected)}>{t("team.editMember")}</button>
                  <button className="usr-btn-ghost" disabled={resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate(selected.id)}>
                    {resetPasswordMutation.isPending ? t("team.resetting") : t("team.resetPassword")}
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
                <div className="usr-modal-title">{modal.mode === "create" ? t("team.newMember") : t("team.editMember")}</div>
                <div className="usr-modal-sub">{t("team.modalSubtitle")}</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="usr-modal-body">
              <InlineError error={formError} onDismiss={() => setFormError(null)} />
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">{t("team.name")}</label>
                  <input {...fe.fieldProps("name", "usr-input")} value={modal.draft.name} onChange={(e) => { setDraft({ name: e.target.value }); fe.clear("name"); }} />
                  <FieldError msg={fe.errors.name} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">{t("team.roleLabel")}</label>
                  <select className="usr-select" value={modal.draft.role} onChange={(e) => setDraft({ role: e.target.value })}>
                    <option value="vendor">{t("team.landsSeller")}</option>
                    <option value="admin">{t("team.coreAdmin")}</option>
                  </select>
                </div>
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">{t("team.email")}</label>
                <input {...fe.fieldProps("email", "usr-input")} type="email" disabled={modal.mode === "edit"} value={modal.draft.email} onChange={(e) => { setDraft({ email: e.target.value }); fe.clear("email"); }} />
                <FieldError msg={fe.errors.email} />
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">{t("team.phone")}</label>
                <input className="usr-input" value={modal.draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} />
              </div>
              {modal.mode === "create" && (
                <div className="usr-field">
                  <label className="usr-field-lbl">{t("team.tempPassword")}</label>
                  <input {...fe.fieldProps("password", "usr-input")} value={modal.draft.password} onChange={(e) => { setDraft({ password: e.target.value }); fe.clear("password"); }} />
                  <FieldError msg={fe.errors.password} />
                </div>
              )}
              {modal.mode === "create" && modal.draft.role === "vendor" && (
                <div className="usr-field">
                  <label className="usr-field-lbl">{t("team.verticalApps")}</label>
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
                            <small>{t(`coreClients.apps.${app.key}`, app.desc)}</small>
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
                  <span>{t("team.activeAccess")}</span>
                </label>
              )}
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>{t("team.cancel")}</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? t("team.saving") : t("team.save")}
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
                <div className="usr-modal-title">{t("team.confirmTitle")}</div>
                <div className="usr-modal-sub">{t("team.confirmSubtitle")}</div>
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
                {t("team.confirmQuestion").replace("{name}", selected.name)}
              </p>
              <p className="usr-confirm-note">
                {t("team.confirmNote").replace("{count}", accessChangesCount)}
              </p>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setConfirmAccessSave(false)} disabled={accessMutation.isPending}>{t("team.backEdit")}</button>
              <button className="usr-btn-primary" onClick={() => accessMutation.mutate(accessDraft)} disabled={accessMutation.isPending || accessChangesCount === 0}>
                {accessMutation.isPending ? t("team.saving") : t("team.confirmChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={t("team.guideTitle")}
        subtitle={t("team.guideSubtitle")}
        steps={[
          { title: t("team.guide.rolesTitle"), text: t("team.guide.rolesText") },
          { title: t("team.guide.createTitle"), text: t("team.guide.createText") },
          { title: t("team.guide.appsTitle"), text: t("team.guide.appsText") },
          { title: t("team.guide.passwordTitle"), text: t("team.guide.passwordText") },
          { title: t("team.guide.filterTitle"), text: t("team.guide.filterText") },
          { title: t("team.guide.sellersTitle"), text: t("team.guide.sellersText") },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemEquipo;
