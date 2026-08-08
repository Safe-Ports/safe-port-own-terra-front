import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { orgService } from "@/services/orgService";
import { billingService } from "@/services/billingService";
import GuideModal from "@/components/shared/GuideModal";
import Button from "@/components/Button";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { useLocale } from "@/i18n";

const SUB_STATUS_CHIP = {
  active: "paid",
  trialing: "pending",
  past_due: "overdue",
  unpaid: "overdue",
  cancelled: "overdue",
};

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

// Monto de Stripe (en centavos) → moneda local, ej. 49900 "mxn" → "$499.00 MXN".
function fmtMoney(amount, currency) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: (currency || "mxn").toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function SettingsPage() {
  const { currentUser, showToast, showError, canUseFeature } = useAppContext();
  const { locale, switchLocale, t } = useLocale();
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));
  const queryClient = useQueryClient();
  const isAdmin = canUseFeature("core.config");

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: orgService.get,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => orgService.listUsers({ limit: 50 }),
  });

  const users = usersData?.items || [];

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
  });

  // Al volver de Stripe Checkout (success_url/cancel_url → /configuracion?billing=...),
  // avisamos el resultado, refrescamos el estado de la suscripción y limpiamos la query.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (!billing) return;
    if (billing === "success") {
      showToast(t("settings.subActivated"));
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    } else if (billing === "cancelled") {
      showToast(t("settings.paymentCancelled"));
    }
    window.history.replaceState({}, "", "/configuracion");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Como el pago/gestión ocurre en otra pestaña, al regresar a esta refrescamos el
  // estado de la suscripción para que refleje cambios hechos en Stripe sin recargar.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        queryClient.invalidateQueries({ queryKey: ["organization"] });
      }
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: billingService.getPlans,
  });

  // Identifica QUÉ acción está en curso (el price_id del botón, o "portal"), para
  // que solo el botón presionado muestre "Redirigiendo..." y no todos a la vez.
  const [billingBusy, setBillingBusy] = useState(null);

  // Abre Stripe en una PESTAÑA NUEVA sin perder la actual. La ventana se abre de
  // forma síncrona dentro del clic (si esperamos al await, el navegador bloquea el
  // pop-up por no venir de un gesto directo); luego la apuntamos a la URL de Stripe.
  const openStripeInNewTab = async (busyKey, getUrl, errorMsg) => {
    // Sin "noopener": window.open lo devolvería como null y perderíamos la
    // referencia para redirigir la pestaña (se quedaría en about:blank).
    const win = window.open("", "_blank");
    if (win) {
      win.opener = null; // evita reverse-tabnabbing sin perder la referencia
      win.document.write(
        "<title>Redirigiendo…</title><body style='font-family:system-ui;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;color:#555'>Redirigiendo a Stripe…</body>"
      );
    }
    setBillingBusy(busyKey);
    try {
      const url = await getUrl();
      if (win) win.location.href = url;
      else window.open(url, "_blank"); // fallback si el pop-up fue bloqueado
    } catch (err) {
      if (win) win.close();
      showError(err, errorMsg);
    } finally {
      setBillingBusy(null);
    }
  };

  const handlePortal = () =>
    openStripeInNewTab("portal", () => billingService.openPortal(), t("settings.errorPortal"));

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "vendor" });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fe = useFieldErrors();

  const handleCreateUser = async () => {
    const errs = {};
    if (!newUser.name.trim()) errs.name = "El nombre es obligatorio.";
    if (!newUser.email.trim()) errs.email = "El correo es obligatorio.";
    if (!newUser.password) errs.password = "La contraseña es obligatoria.";
    if (Object.keys(errs).length) { fe.setErrors(errs); return; }
    fe.clearAll();
    setCreating(true);
    try {
      await orgService.createUser(newUser);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewUser({ name: "", email: "", password: "", role: "vendor" });
      fe.clearAll();
      setShowForm(false);
      showToast(t("settings.userCreated"));
    } catch (err) {
      showError(err, t("settings.errorCreateUser"));
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (id, name) => {
    try {
      await orgService.resetPassword(id);
      showToast(t("settings.passwordResetFor").replace("{name}", name));
    } catch (err) {
      showError(err, t("settings.errorResetPassword"));
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(t("settings.deleteConfirm").replace("{name}", name))) return;
    try {
      await orgService.deleteUser(id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(t("settings.userDeleted"));
    } catch (err) {
      showError(err, t("settings.errorDeleteUser"));
    }
  };

  return (
    <div className="space-y-4">

      {/* Idioma */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🌐 {t("settings.language")}</div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: ".82rem", color: "var(--mu)", marginBottom: 14 }}>{t("settings.langDesc")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className={locale === "es" ? "btn-p" : "btn-s"}
              onClick={() => switchLocale("es")}
            >
              🇲🇽 {t("settings.langEs")}
            </button>
            <button
              className={locale === "en" ? "btn-p" : "btn-s"}
              onClick={() => switchLocale("en")}
            >
              🇺🇸 {t("settings.langEn")}
            </button>
          </div>
        </div>
      </div>

      {/* Organización */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🏢 {t("settings.org")}</div>
        </div>
        <div className="card-body">
          {orgLoading ? (
            <div className="text-sm text-[#83867C]">{t("settings.loading")}</div>
          ) : org ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 16 }}>
                {[
                  [t("settings.stats.users"), org.stats.total_users],
                  [t("settings.stats.lots"), org.stats.total_lots],
                  [t("settings.stats.clients"), org.stats.total_clients],
                  [t("settings.stats.contracts"), org.stats.total_contracts],
                ].map(([label, value]) => (
                  <div key={label} className="price-c">
                    <div className="pc-l">{label}</div>
                    <div className="pc-v">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  [t("settings.fields.name"), org.name],
                  [t("settings.fields.plan"), org.plan],
                  [t("settings.fields.subStatus"), org.subscription_status],
                  [t("settings.fields.email"), org.email || "—"],
                  [t("settings.fields.phone"), org.phone || "—"],
                  [t("settings.fields.taxId"), org.tax_id || "—"],
                  [t("settings.fields.address"), org.address || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="d-row">
                    <span className="d-lbl">{label}</span>
                    <span className="d-val">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#83867C]">{t("settings.noData")}</div>
          )}
        </div>
      </div>

      {/* Suscripción y facturación */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">💳 {t("settings.billing")}</div>
          {subscription && (
            <span className={`pc-chip ${SUB_STATUS_CHIP[subscription.status] || "pending"}`}>
              {t(`settings.subStatus.${subscription.status}`, subscription.status)}
            </span>
          )}
        </div>
        <div className="card-body">
          {!subscription ? (
            <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="d-row">
                  <span className="skeleton-line" style={{ width: 90 }} />
                  <span className="skeleton-line" style={{ width: 120 }} />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="grid gap-3 md:grid-cols-2" style={{ marginBottom: 16 }}>
                {[
                  [t("settings.fields.plan"), subscription.plan],
                  subscription.status === "trialing"
                    ? [t("settings.trialEnd"), fmtDate(subscription.trial_end)]
                    : [
                        subscription.cancel_at_period_end ? t("settings.accessUntil") : t("settings.nextRenewal"),
                        fmtDate(subscription.current_period_end),
                      ],
                ].map(([label, value]) => (
                  <div key={label} className="d-row">
                    <span className="d-lbl">{label}</span>
                    <span className="d-val">{value}</span>
                  </div>
                ))}
              </div>

              {subscription.cancel_at_period_end && (
                <div className="text-sm" style={{ color: "var(--warn, #b45309)", marginBottom: 12 }}>
                  {t("settings.subCancelWarning")} {fmtDate(subscription.current_period_end)} {t("settings.subCancelTail")}
                </div>
              )}
              {subscription.status === "past_due" && (
                <div className="text-sm" style={{ color: "var(--warn, #b45309)", marginBottom: 12 }}>
                  {t("settings.pastDueWarning")}
                </div>
              )}

              {!isAdmin ? (
                <div className="text-sm text-[#83867C]">{t("settings.adminOnly")}</div>
              ) : ["active", "past_due"].includes(subscription.status) ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-p" onClick={() => window.open("/planes", "_blank", "noopener,noreferrer")}>
                    {subscription.cancel_at_period_end ? t("settings.viewPlansReactivate") : t("settings.viewPlans")}
                  </button>
                  <button className="btn-s" disabled={billingBusy !== null} onClick={handlePortal}>
                    {billingBusy === "portal" ? t("settings.redirecting") : t("settings.manageBilling")}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-p" onClick={() => window.open("/planes", "_blank", "noopener,noreferrer")}>
                    {subscription.status === "trialing" ? t("settings.viewPlansSubscribe") : t("settings.viewPlansRenew")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usuarios */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">👥 {t("settings.team")}</div>
          {isAdmin && (
            <button className="btn-p" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t("settings.cancelBtn") : t("settings.newUser")}
            </button>
          )}
        </div>
        <div className="card-body">
          {showForm && isAdmin && (
            <div className="fr-row" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16, padding: "14px", background: "var(--sf2)", borderRadius: 10, border: "1px solid var(--bd)" }}>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">{t("settings.nameLabel")}</label>
                <input {...fe.fieldProps("name", "fi")} value={newUser.name} onChange={(e) => { setNewUser((p) => ({ ...p, name: e.target.value })); fe.clear("name"); }} placeholder="Juan García" />
                <FieldError msg={fe.errors.name} />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">{t("settings.emailLabel")}</label>
                <input {...fe.fieldProps("email", "fi")} type="email" value={newUser.email} onChange={(e) => { setNewUser((p) => ({ ...p, email: e.target.value })); fe.clear("email"); }} placeholder="juan@empresa.com" />
                <FieldError msg={fe.errors.email} />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 140 }}>
                <label className="fl">{t("settings.tempPassword")}</label>
                <input {...fe.fieldProps("password", "fi")} type="password" value={newUser.password} onChange={(e) => { setNewUser((p) => ({ ...p, password: e.target.value })); fe.clear("password"); }} />
                <FieldError msg={fe.errors.password} />
              </div>
              <div className="fg" style={{ minWidth: 120 }}>
                <label className="fl">{t("settings.roleLabel")}</label>
                <select className="fi" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="vendor">{t("settings.vendorRole")}</option>
                  <option value="admin">{t("settings.adminRole")}</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn-p" onClick={handleCreateUser} disabled={creating}>
                  {creating ? t("settings.creating") : t("settings.create")}
                </button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="text-sm text-[#83867C]">{t("settings.loadingUsers")}</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("settings.colUser")}</th>
                  <th>{t("settings.colEmail")}</th>
                  <th>{t("settings.colRole")}</th>
                  <th>{t("settings.colStatus")}</th>
                  {isAdmin && <th>{t("settings.colActions")}</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: user.color || "#355E3B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".72rem", fontWeight: 800, flexShrink: 0 }}>
                          {user.initials || user.name?.slice(0, 2).toUpperCase()}
                        </div>
                        {user.name}
                        {user.id === currentUser?.id && <span style={{ fontSize: ".65rem", color: "var(--mu)" }}>{t("settings.you")}</span>}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`pc-chip ${user.role === "admin" ? "paid" : "pending"}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`pc-chip ${user.is_active ? "paid" : "overdue"}`}>
                        {user.is_active ? t("settings.activeStatus") : t("settings.inactiveStatus")}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        {user.id !== currentUser?.id && (
                          <>
                            <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => handleResetPassword(user.id, user.name)}>
                              🔑 Reset
                            </button>{" "}
                            <button className="btn-dan" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => handleDeleteUser(user.id, user.name)}>
                              🗑
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: "center", padding: 24, color: "var(--mu)" }}>
                      {t("settings.noUsers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Configuración"
        subtitle="Administración de la organización y usuarios del equipo."
        steps={[
          { title: "Información de la organización", text: "Aquí puedes ver el nombre y detalles de tu organización. Solo administradores pueden editar esta información." },
          { title: "Usuarios del equipo", text: "Lista de todos los usuarios activos con su rol (Admin o Vendedor). Puedes crear nuevos usuarios con el botón '+ Nuevo usuario'." },
          { title: "Roles disponibles", text: "Admin: acceso completo a todas las funciones incluyendo configuración y eliminación de usuarios. Vendor: acceso a operaciones comerciales sin configuración." },
          { title: "Restablecer contraseña", text: "Como administrador puedes generar una nueva contraseña temporal para cualquier usuario del equipo." },
          { title: "Eliminar usuario", text: "Solo los administradores pueden eliminar usuarios. Esta acción es irreversible y elimina el acceso del usuario al sistema." },
        ]}
      />
    </div>
  );
}

export default SettingsPage;
