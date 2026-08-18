import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { orgService } from "@/services/orgService";
import { billingService } from "@/services/billingService";
import { SkeletonRows } from "@/components/ui/Skeleton";
import GuideModal from "@/components/shared/GuideModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import Button from "@/components/Button";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";

const SUB_STATUS_LABELS = {
  trialing: "Prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  unpaid: "Sin pagar",
  cancelled: "Cancelada",
};

// Clase de chip (reutiliza .pc-chip del sistema) según el estado.
const SUB_STATUS_CHIP = {
  active: "paid",
  trialing: "pending",
  past_due: "overdue",
  unpaid: "overdue",
  cancelled: "overdue",
};

const PLAN_INTERVAL_LABELS = {
  month: "Mensual",
  year: "Anual",
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
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));
  const queryClient = useQueryClient();
  const isAdmin = canUseFeature("core.config");

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: orgService.get,
  });

  // Solo activos: dar de baja a alguien lo desactiva (no lo borra), y seguir
  // listándolo aquí como "Inactivo" confundía. Se filtra en el servidor para que
  // los inactivos tampoco consuman sitio en la página.
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "active"],
    queryFn: () => orgService.listUsers({ limit: 50, is_active: true }),
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
      showToast("¡Suscripción activada! Gracias por tu pago.");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    } else if (billing === "cancelled") {
      showToast("Pago cancelado. Tu plan no cambió.");
    }
    // Limpia solo la query, conservando la ruta actual: esta página se sirve en dos
    // (/configuracion y /ecosistema/configuracion) y fijar una sacaría al usuario
    // del shell en el que estaba.
    window.history.replaceState({}, "", window.location.pathname);
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
    openStripeInNewTab("portal", () => billingService.openPortal(), "No se pudo abrir el portal de facturación");

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
      showToast("Usuario creado");
    } catch (err) {
      showError(err, "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (id, name) => {
    try {
      const data = await orgService.resetPassword(id);
      showToast(data?.message || `Contraseña restablecida para ${name}`);
    } catch (err) {
      showError(err, "Error al restablecer contraseña");
    }
  };

  // Baja de un usuario. El backend la rechaza (409 OT-USER-3030) mientras tenga
  // clientes, contratos o lotes asignados, así que el mismo diálogo pasa entonces a
  // un paso de traspaso: elegir destinatario, reasignar y reintentar la baja.
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingData, setPendingData] = useState(null); // cifras del 409
  const [transferTo, setTransferTo] = useState("");

  const closeDeleteDialog = () => {
    setUserToDelete(null);
    setPendingData(null);
    setTransferTo("");
  };

  // Candidatos a recibir la cartera: activos, distintos del que se da de baja y con
  // acceso a los datos que van a moverse. Contratos y lotes viven en Lands, así que
  // ofrecer a alguien sin ese acceso solo lleva al 400 del backend (OT-USER-1005):
  // quedaría como responsable de registros que no puede abrir.
  const needsLands = (pendingData?.contracts || 0) > 0 || (pendingData?.inventory_units || 0) > 0;
  const transferCandidates = users.filter((u) => {
    if (!u.is_active || u.id === userToDelete?.id) return false;
    if (u.role === "admin") return true;
    return !needsLands || (u.app_keys || []).includes("lands");
  });

  const deleteAndFinish = async () => {
    await orgService.deleteUser(userToDelete.id);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    showToast("Usuario eliminado");
    closeDeleteDialog();
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await deleteAndFinish();
    } catch (err) {
      // Tiene cartera asignada: en vez de un toast sin salida, ofrecemos traspasarla.
      if (err?.response?.data?.error?.code === "OT-USER-3030") {
        setPendingData(err.response.data.error.details || {});
      } else {
        showError(err, "Error al eliminar usuario");
      }
    } finally {
      setDeleting(false);
    }
  };

  const confirmTransferAndDelete = async () => {
    if (!userToDelete || !transferTo) return;
    setDeleting(true);
    try {
      const moved = await orgService.transferData(userToDelete.id, transferTo);
      // El traspaso cambia el vendedor de contratos, clientes y lotes. Sin invalidar
      // sus caches, esas pantallas siguen mostrando al vendedor anterior hasta 5
      // minutos (staleTime global en pwa/queryClient.js).
      await Promise.all(
        [["contracts"], ["clients"], ["client"], ["lots"], ["payments"], ["dashboard"]]
          .map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
      const total = (moved?.clients || 0) + (moved?.contracts || 0) + (moved?.inventory_units || 0);
      showToast(`${total} registro${total === 1 ? "" : "s"} transferido${total === 1 ? "" : "s"}`);
      await deleteAndFinish();
    } catch (err) {
      showError(err, "Error al transferir los datos");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Organización */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🏢 Organización</div>
        </div>
        <div className="card-body">
          {orgLoading ? (
            <div className="text-sm text-[#83867C]">Cargando...</div>
          ) : org ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 16 }}>
                {[
                  ["Usuarios", org.stats.total_users],
                  ["Lotes", org.stats.total_lots],
                  ["Clientes", org.stats.total_clients],
                  ["Contratos", org.stats.total_contracts],
                ].map(([label, value]) => (
                  <div key={label} className="price-c">
                    <div className="pc-l">{label}</div>
                    <div className="pc-v">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Nombre", org.name],
                  ["Plan", org.plan],
                  ["Estado suscripción", org.subscription_status],
                  ["Correo", org.email || "—"],
                  ["Teléfono", org.phone || "—"],
                  ["RFC / Tax ID", org.tax_id || "—"],
                  ["Dirección", org.address || "—"],
                  // Congelada en el build por los scripts de deploy. Sirve para
                  // confirmar qué versión está sirviendo el navegador (soporte,
                  // rollback) sin abrir la consola.
                  ["Versión de la app", __APP_VERSION__],
                ].map(([label, value]) => (
                  <div key={label} className="d-row">
                    <span className="d-lbl">{label}</span>
                    <span className="d-val">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#83867C]">Sin datos</div>
          )}
        </div>
      </div>

      {/* Suscripción y facturación */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">💳 Suscripción y facturación</div>
          {subscription && (
            <span className={`pc-chip ${SUB_STATUS_CHIP[subscription.status] || "pending"}`}>
              {SUB_STATUS_LABELS[subscription.status] || subscription.status}
            </span>
          )}
        </div>
        <div className="card-body">
          {!subscription ? (
            // Skeleton mientras carga
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
                  ["Plan", subscription.plan],
                  subscription.status === "trialing"
                    ? ["Fin de prueba", fmtDate(subscription.trial_end)]
                    : [
                        subscription.cancel_at_period_end ? "Acceso hasta" : "Próxima renovación",
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
                  ⚠️ La suscripción se cancelará el {fmtDate(subscription.current_period_end)} y no se renovará.
                </div>
              )}
              {subscription.status === "past_due" && (
                <div className="text-sm" style={{ color: "var(--warn, #b45309)", marginBottom: 12 }}>
                  ⚠️ Tu último pago falló. Actualiza tu método de pago para no perder el acceso.
                </div>
              )}

              {!isAdmin ? (
                <div className="text-sm text-[#83867C]">
                  Solo un administrador puede gestionar la suscripción.
                </div>
              ) : ["active", "past_due"].includes(subscription.status) ? (
                // Con acceso pagado: gestión de facturación + ver la página de planes.
                // La (re)activación se hace desde nuestro panel de planes, no aquí.
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-p" onClick={() => window.open("/planes", "_blank", "noopener,noreferrer")}>
                    {subscription.cancel_at_period_end ? "Ver planes y reactivar" : "Ver planes"}
                  </button>
                  <button className="btn-s" disabled={billingBusy !== null} onClick={handlePortal}>
                    {billingBusy === "portal" ? "Redirigiendo..." : "Gestionar facturación"}
                  </button>
                </div>
              ) : (
                // Sin acceso pagado (prueba / cancelada / sin pagar): CTA a la página de planes.
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-p" onClick={() => window.open("/planes", "_blank", "noopener,noreferrer")}>
                    {subscription.status === "trialing" ? "Ver planes y suscribirme" : "Ver planes y renovar"}
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
          <div className="card-title">👥 Usuarios del equipo</div>
          {isAdmin && (
            <button className="btn-p" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancelar" : "+ Nuevo usuario"}
            </button>
          )}
        </div>
        <div className="card-body">
          {showForm && isAdmin && (
            <div className="fr-row" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16, padding: "14px", background: "var(--sf2)", borderRadius: 10, border: "1px solid var(--bd)" }}>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">Nombre</label>
                <input {...fe.fieldProps("name", "fi")} value={newUser.name} onChange={(e) => { setNewUser((p) => ({ ...p, name: e.target.value })); fe.clear("name"); }} placeholder="Juan García" />
                <FieldError msg={fe.errors.name} />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">Correo</label>
                <input {...fe.fieldProps("email", "fi")} type="email" value={newUser.email} onChange={(e) => { setNewUser((p) => ({ ...p, email: e.target.value })); fe.clear("email"); }} placeholder="juan@empresa.com" />
                <FieldError msg={fe.errors.email} />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 140 }}>
                <label className="fl">Contraseña temporal</label>
                <input {...fe.fieldProps("password", "fi")} type="password" value={newUser.password} onChange={(e) => { setNewUser((p) => ({ ...p, password: e.target.value })); fe.clear("password"); }} />
                <FieldError msg={fe.errors.password} />
              </div>
              <div className="fg" style={{ minWidth: 120 }}>
                <label className="fl">Rol</label>
                <select className="fi" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="vendor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn-p" onClick={handleCreateUser} disabled={creating}>
                  {creating ? "Creando..." : "✓ Crear"}
                </button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  {isAdmin && <th>Acciones</th>}
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
                        {user.id === currentUser?.id && <span style={{ fontSize: ".65rem", color: "var(--mu)" }}>(tú)</span>}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`pc-chip ${user.role === "admin" ? "paid" : "pending"}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`pc-chip ${user.is_active ? "paid" : "overdue"}`}>{user.is_active ? "Activo" : "Inactivo"}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        {user.id !== currentUser?.id && (
                          <>
                            <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} aria-label={`Restablecer contraseña de ${user.name}`} onClick={() => handleResetPassword(user.id, user.name)}>
                              🔑 Reset
                            </button>{" "}
                            {/* El botón es solo un emoji: sin aria-label no tiene nombre accesible. */}
                            <button className="btn-dan" style={{ padding: "4px 10px", fontSize: ".7rem" }} aria-label={`Eliminar ${user.name}`} onClick={() => setUserToDelete({ id: user.id, name: user.name })}>
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
                      Sin usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Paso 1: confirmar la baja. */}
      <ConfirmDialog
        open={!!userToDelete && !pendingData}
        danger
        title={`¿Eliminar usuario ${userToDelete?.name || ""}?`}
        subtitle="Usuarios del equipo"
        confirmLabel="Eliminar usuario"
        busy={deleting}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteUser}
      >
        <p className="text-sm text-[#5A4E41]">
          Perderá el acceso de inmediato y dejará de aparecer en esta lista. No se borra
          nada: queda desactivado y su actividad se conserva para auditoría.
        </p>
        <p className="mt-2 text-sm text-[#83867C]">
          Si todavía tiene clientes, contratos o lotes asignados, te pediremos a quién
          traspasarlos antes de completar la baja.
        </p>
      </ConfirmDialog>

      {/* Paso 2: solo si el backend rechazó la baja por cartera asignada. */}
      <ConfirmDialog
        open={!!userToDelete && !!pendingData}
        title={`Traspasar la cartera de ${userToDelete?.name || ""}`}
        subtitle="Antes de darlo de baja"
        icon="↹"
        confirmLabel="Traspasar y eliminar"
        busy={deleting}
        confirmDisabled={!transferTo || transferCandidates.length === 0}
        onCancel={closeDeleteDialog}
        onConfirm={confirmTransferAndDelete}
      >
        <p className="text-sm text-[#5A4E41]">
          Todavía tiene registros a su nombre. Se reasignarán a la persona que elijas y
          después se completará la baja.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Clientes", pendingData?.clients],
            ["Contratos", pendingData?.contracts],
            ["Lotes", pendingData?.inventory_units],
          ].map(([label, value]) => (
            <div key={label} className="price-c">
              <div className="pc-l">{label}</div>
              <div className="pc-v">{value ?? 0}</div>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold text-[#5A4E41]">
          Traspasar a
          {transferCandidates.length === 0 ? (
            <p className="mt-1 text-sm font-normal text-[#83867C]">
              {needsLands
                ? "Ningún otro usuario activo tiene acceso a Lands, donde viven esos contratos y lotes. Dale acceso a alguien desde Equipo y vuelve a intentarlo."
                : "No hay otro usuario activo que pueda recibir la cartera. Crea o activa uno antes de dar de baja a este."}
            </p>
          ) : (
            <select
              className="fi mt-1"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            >
              <option value="">Selecciona un usuario...</option>
              {transferCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role === "admin" ? "Administrador" : "Vendedor"}
                </option>
              ))}
            </select>
          )}
        </label>
      </ConfirmDialog>
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
