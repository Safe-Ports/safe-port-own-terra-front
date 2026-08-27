import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiArrowLeftOnRectangle,
  HiBuildingOffice2,
  HiCamera,
  HiCog6Tooth,
  HiIdentification,
  HiShieldCheck,
  HiSquares2X2,
  HiUserGroup,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { orgService } from "@/services/orgService";
import { userService } from "@/services/userService";
import { APP_CATALOG, APP_ROLE_LABEL, GLOBAL_ROLES } from "@/services/permissions";
import PhoneInput from "@/components/shared/PhoneInput";
import FieldError from "@/components/shared/FieldError";
import InlineError from "@/components/shared/InlineError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { parseApiError } from "@/errors/parseApiError";
import "./profile.css";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

// Verticales que se listan en "Mis accesos". El Core no va: no es una app a la
// que se entre, es la casa donde viven todas (ver core-not-a-vertical-app).
const LISTED_APPS = APP_CATALOG.filter((a) => a.vertical);

// Los logos van como <img> y no por el sprite (#eco-g-…): el sprite lo monta
// EcoLayout, así que en la shell de Lands no existiría y el hueco quedaría vacío.
const APP_LOGO = {
  lands: "/icons/app-lands.png",
  homes: "/icons/app-construction.png",
  neighb: "/icons/app-properties.png",
  finanzas: "/icons/app-finanzas.png",
};

// Paleta para el color personal. Es el que identifica al usuario en la agenda y
// en las asignaciones, así que se ofrecen opciones distinguibles entre sí en vez
// de un selector libre donde todos terminan eligiendo el mismo verde.
const COLORS = ["#6FAF6B", "#2C666E", "#48A9A6", "#8B6A46", "#B4654A", "#5B6ABF", "#8E5BA6", "#43453F"];

// Los pasos de la guía viven acá, junto al contenido que describen, para que las
// dos shells muestren lo mismo sin que una dependa del módulo de la otra.
export const PROFILE_GUIDE_STEPS = [
  { title: "Tu foto", text: "Haz clic sobre tu foto para reemplazarla. Se acepta PNG, JPG o WEBP de hasta 5 MB." },
  { title: "Mis datos", text: "Con 'Editar' puedes cambiar tu nombre, teléfono, iniciales y color. El color es el que te identifica en la agenda y en las asignaciones; las iniciales se muestran cuando no tienes foto." },
  { title: "Mis accesos", text: "Muestra a qué aplicaciones del ecosistema entras y con qué rol en cada una. Si una aparece en gris es porque todavía no te la asignaron, o porque aún no está disponible." },
  { title: "Organización", text: "El nombre, plan y estado de la cuenta a la que perteneces. Para editarlos ve a Configuración." },
];

const ORG_STATUS = {
  active: "Activa",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
};

/**
 * Perfil del usuario, a nivel ecosistema.
 *
 * Vive en las dos shells (Core y Lands) por la misma razón que Configuración:
 * entrar al perfil no debería cambiarte de app. Por eso el contenido acá es
 * transversal —quién sos, a qué apps entrás, en qué organización estás— y no
 * indicadores de una vertical: esos ya están en el dashboard de cada app y
 * dependen de dónde entraste, que es justo lo que un perfil no debería hacer.
 *
 * Los colores salen de tokens (`--deep`, `--mid`…) que cada shell define con su
 * propia paleta, así que la página se pone teal en el Core y verde bosque en
 * Lands sin ramas ni props.
 */
export default function ProfileContent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser, logout, showToast, showError, updateCurrentUser, canUseFeature, canAccessApp } = useAppContext();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [formError, setFormError] = useState(null);
  const fe = useFieldErrors();

  const userId = currentUser?.id;

  // /auth/me no trae teléfono ni color, así que el detalle se pide aparte. Un
  // usuario siempre puede leer su propio perfil, no hace falta ser admin.
  const { data: me, isLoading: loadingMe, error: meError } = useQuery({
    queryKey: ["user-detail", userId],
    queryFn: () => userService.get(userId),
    enabled: Boolean(userId),
  });

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: orgService.get,
  });

  // El borrador se arma cuando llegan los datos, no al abrir el editor: así el
  // botón "Editar" no muestra campos vacíos si la petición todavía no volvió.
  useEffect(() => {
    if (me && !draft) {
      setDraft({ name: me.name || "", phone: me.phone || "", initials: me.initials || "", color: me.color || COLORS[0] });
    }
  }, [me, draft]);

  const saveProfile = useMutation({
    mutationFn: (body) => userService.update(userId, body),
    onSuccess: (updated) => {
      updateCurrentUser({ name: updated.name, initials: updated.initials, color: updated.color });
      // La respuesta ya trae el perfil guardado, así que se siembra la caché en
      // vez de solo invalidarla: con invalidate la ficha se quedaba mostrando los
      // valores viejos hasta que volviera el refetch. `stats` no viene en el PATCH,
      // se conserva la que ya estaba.
      qc.setQueryData(["user-detail", userId], (prev) => ({ ...prev, ...updated }));
      qc.invalidateQueries({ queryKey: ["users"] });
      setDraft(null);
      setEditing(false);
      setFormError(null);
      showToast("Perfil actualizado");
    },
    onError: (err) => setFormError(parseApiError(err, "No pudimos guardar tus datos")),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => userService.uploadAvatar(userId, file),
    onSuccess: (updated) => {
      updateCurrentUser({ avatar_url: updated.avatar_url });
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("Foto de perfil actualizada");
    },
    onError: (err) => showError(err, "Error al subir la foto de perfil"),
  });

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      showToast("Formato no permitido — usa PNG, JPG o WEBP", "warning");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showToast("La imagen no puede superar 5 MB", "warning");
      return;
    }
    uploadAvatar.mutate(file);
  };

  const startEdit = () => {
    setDraft({ name: me?.name || "", phone: me?.phone || "", initials: me?.initials || "", color: me?.color || COLORS[0] });
    setFormError(null);
    fe.clearAll();
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({ name: me?.name || "", phone: me?.phone || "", initials: me?.initials || "", color: me?.color || COLORS[0] });
    setFormError(null);
    fe.clearAll();
    setEditing(false);
  };

  const submit = (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (name.length < 2) {
      fe.setErrors({ name: "Escribe tu nombre completo." });
      return;
    }
    fe.clearAll();
    // `null` limpia el campo; omitirlo lo dejaría intacto. Hace falta poder
    // vaciarlos: un teléfono cargado por error tiene que poder borrarse.
    saveProfile.mutate({
      name,
      phone: draft.phone.trim() || null,
      initials: draft.initials.trim().toUpperCase() || null,
      color: draft.color,
    });
  };

  const roleLabel = GLOBAL_ROLES[currentUser?.role]?.label || currentUser?.role || "—";
  const orgName = org?.name || currentUser?.organization?.name || "—";
  const avatarUrl = me?.avatar_url || currentUser?.avatar_url;
  const shownInitials = me?.initials || currentUser?.initials || "OT";

  const quickLinks = [
    canUseFeature("core.team") && {
      key: "equipo",
      icon: HiUserGroup,
      title: "Equipo",
      desc: "Personas de la organización y sus permisos",
      to: "/ecosistema/equipo",
    },
    canUseFeature("core.config") && {
      key: "config",
      icon: HiCog6Tooth,
      title: "Configuración",
      desc: "Datos de la organización, plan y facturación",
      to: "/ecosistema/configuracion",
    },
  ].filter(Boolean);

  return (
    <div className="pf-page">
      <header className="pf-hero">
        <button
          type="button"
          className="pf-avatar"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          title="Cambiar foto de perfil"
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="pf-avatar-txt">{shownInitials}</span>}
          <span className="pf-avatar-hover">
            {uploadAvatar.isPending ? <small>Subiendo…</small> : <HiCamera aria-hidden="true" />}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="pf-file"
          onChange={handleAvatarPick}
        />

        <div className="pf-hero-id">
          <h2 className="pf-name">{me?.name || currentUser?.name}</h2>
          <p className="pf-mail">{currentUser?.email}</p>
          <div className="pf-hero-tags">
            <span className="pf-pill">{roleLabel}</span>
            <span className="pf-pill pf-pill-soft">{orgName}</span>
          </div>
        </div>
      </header>

      <section className="pf-card">
        <div className="pf-card-head">
          <h3><HiIdentification aria-hidden="true" /> Mis datos</h3>
          {!editing && !loadingMe && (
            <button type="button" className="pf-btn-ghost" onClick={startEdit}>Editar</button>
          )}
        </div>

        {meError && <InlineError error={parseApiError(meError, "No pudimos cargar tu perfil")} />}

        {editing ? (
          <form className="pf-form" onSubmit={submit}>
            <label className="pf-field">
              <span className="pf-lbl">Nombre</span>
              <input
                className={`pf-input${fe.errors.name ? " is-invalid" : ""}`}
                value={draft.name}
                onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); fe.clear("name"); }}
                autoFocus
              />
              <FieldError msg={fe.errors.name} />
            </label>

            <label className="pf-field">
              <span className="pf-lbl">Teléfono</span>
              <PhoneInput value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} inputClassName="pf-input" />
            </label>

            <label className="pf-field pf-field-sm">
              <span className="pf-lbl">Iniciales</span>
              <input
                className="pf-input"
                value={draft.initials}
                maxLength={4}
                placeholder="NT"
                onChange={(e) => setDraft((d) => ({ ...d, initials: e.target.value }))}
              />
              <span className="pf-hint">Se usan cuando no hay foto.</span>
            </label>

            <div className="pf-field">
              <span className="pf-lbl">Color</span>
              <div className="pf-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pf-swatch${draft.color === c ? " is-on" : ""}`}
                    style={{ background: c }}
                    onClick={() => setDraft((d) => ({ ...d, color: c }))}
                    aria-label={`Usar el color ${c}`}
                    aria-pressed={draft.color === c}
                  />
                ))}
              </div>
              <span className="pf-hint">Te identifica en la agenda y en las asignaciones.</span>
            </div>

            {formError && <InlineError error={formError} />}

            <div className="pf-form-actions">
              <button type="submit" className="pf-btn" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
              <button type="button" className="pf-btn-ghost" onClick={cancelEdit} disabled={saveProfile.isPending}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <dl className="pf-rows">
            <div className="pf-row"><dt>Nombre</dt><dd>{me?.name || "—"}</dd></div>
            <div className="pf-row"><dt>Correo</dt><dd>{currentUser?.email || "—"}</dd></div>
            <div className="pf-row"><dt>Teléfono</dt><dd>{me?.phone || "—"}</dd></div>
            <div className="pf-row"><dt>Iniciales</dt><dd>{me?.initials || "—"}</dd></div>
            <div className="pf-row">
              <dt>Color</dt>
              <dd className="pf-row-color">
                {me?.color && <span className="pf-dot" style={{ background: me.color }} />}
                {me?.color || "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="pf-card">
        <div className="pf-card-head">
          <h3><HiSquares2X2 aria-hidden="true" /> Mis accesos</h3>
        </div>
        <ul className="pf-apps">
          {LISTED_APPS.map((app) => {
            const row = (currentUser?.apps || []).find((a) => (a.app_key || a.key) === app.key);
            const on = app.live && canAccessApp(app.key);
            // Un admin entra a todo sin fila propia de asignación; en ese caso no
            // hay rol por app que mostrar y decirlo es más honesto que inventarlo.
            const chip = !app.live
              ? "Próximamente"
              : !on
                ? "Sin acceso"
                : APP_ROLE_LABEL[row?.role] || (currentUser?.role === "admin" ? "Acceso total" : "Activo");
            return (
              <li key={app.key} className={`pf-app${on ? " is-on" : ""}`}>
                <span className={`pf-app-ico pf-ic-${app.key}`}>
                  <img src={APP_LOGO[app.key]} alt="" />
                </span>
                <span className="pf-app-id">
                  <span className="pf-app-name">{app.name}</span>
                  <span className="pf-app-desc">{app.desc}</span>
                </span>
                <span className={`pf-chip${on ? " is-on" : ""}`}>{chip}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="pf-card">
        <div className="pf-card-head">
          <h3><HiBuildingOffice2 aria-hidden="true" /> Organización</h3>
        </div>
        <dl className="pf-rows">
          <div className="pf-row"><dt>Nombre</dt><dd>{orgName}</dd></div>
          <div className="pf-row"><dt>Plan</dt><dd className="pf-cap">{org?.plan || "—"}</dd></div>
          <div className="pf-row">
            <dt>Estado</dt>
            <dd>{ORG_STATUS[org?.subscription_status] || org?.subscription_status || "—"}</dd>
          </div>
          <div className="pf-row"><dt>Correo</dt><dd>{org?.email || "—"}</dd></div>
          <div className="pf-row"><dt>Teléfono</dt><dd>{org?.phone || "—"}</dd></div>
        </dl>
      </section>

      {quickLinks.length > 0 && (
        <section className="pf-card">
          <div className="pf-card-head">
            <h3><HiShieldCheck aria-hidden="true" /> Administración</h3>
          </div>
          <div className="pf-links">
            {quickLinks.map(({ key, icon: Icon, title, desc, to }) => (
              <button key={key} type="button" className="pf-link" onClick={() => navigate(to)}>
                <span className="pf-link-ico"><Icon aria-hidden="true" /></span>
                <span className="pf-link-id">
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <button type="button" className="pf-logout" onClick={logout}>
        <HiArrowLeftOnRectangle aria-hidden="true" /> Cerrar sesión
      </button>
    </div>
  );
}
