import { useState } from "react";
import { userService } from "@/services/userService";
import { parseApiError } from "@/errors/parseApiError";
import FieldError from "@/components/shared/FieldError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Alta rápida de un vendedor sin salir del formulario: crea al colaborador con
 * acceso a OwnTerra Lands, igual que "Nuevo colaborador" en Equipo, y lo deja
 * como vendedor asignado. Solo para quien puede administrar el equipo.
 *
 * Si el correo ya es de alguien del equipo no se crea otro: se ofrece usarlo,
 * igual que el alta de clientes con un correo repetido.
 */
export default function QuickSellerForm({ onCreated, onCancel, initialName = "", existingUsers = [], onUseExisting }) {
  const [draft, setDraft] = useState({ name: initialName, email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (event) => { setDraft((d) => ({ ...d, [key]: event.target.value })); setErrors((e) => ({ ...e, [key]: "", form: "" })); };

  const email = draft.email.trim().toLowerCase();
  const dupe = email ? existingUsers.find((u) => String(u.email || "").toLowerCase() === email) : null;

  const submit = async () => {
    if (dupe) { onUseExisting?.(dupe); return; }
    const found = {};
    if (!draft.name.trim()) found.name = "Escribe el nombre del vendedor.";
    if (!EMAIL_RE.test(draft.email.trim())) found.email = "Escribe un correo válido: con él entra a la app.";
    if (draft.password.trim().length < 8) found.password = "La contraseña temporal debe tener al menos 8 caracteres.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const created = await userService.create({ name: draft.name.trim(), email: draft.email.trim(), role: "vendor", password: draft.password });
      await userService.upsertApp(created.id, "lands", { app_key: "lands", role: "seller", is_active: true });
      onCreated(created);
    } catch (error) {
      setErrors({ form: parseApiError(error, "No se pudo registrar al vendedor").message });
    } finally {
      setSaving(false);
    }
  };

  // No es un <form>: vive dentro del formulario del contrato y un submit
  // anidado registraría el contrato.
  return (
    <div className="quick-seller" role="group" aria-label="Registrar vendedor">
      <div className="quick-seller-head">
        <b>Registrar vendedor</b>
        <small>Entra a OwnTerra Lands como colaborador. Compártele su correo y la contraseña temporal.</small>
      </div>
      <div className="quick-seller-grid">
        <label className="fg"><span className="fl">Nombre</span><input className="fi" value={draft.name} onChange={set("name")} autoFocus={!initialName} />{errors.name ? <FieldError msg={errors.name} /> : null}</label>
        <label className="fg"><span className="fl">Correo</span><input className="fi" type="email" value={draft.email} onChange={set("email")} autoFocus={!!initialName} />{errors.email ? <FieldError msg={errors.email} /> : null}</label>
        <label className="fg"><span className="fl">Contraseña temporal</span><input className="fi" value={draft.password} onChange={set("password")} />{errors.password ? <FieldError msg={errors.password} /> : null}</label>
      </div>
      {dupe ? (
        <div role="status" className="quick-seller-dupe">
          Ese correo ya es de <b>{dupe.name}</b>, que ya está en tu equipo. Puedes asignarlo directamente.
        </div>
      ) : null}
      {errors.form ? <div role="alert" className="quick-seller-error">{errors.form}</div> : null}
      <div className="quick-seller-actions">
        <button type="button" className="btn-s" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="button" className="btn-p" onClick={submit} disabled={saving}>{saving ? "Registrando…" : dupe ? `Usar a ${dupe.name}` : "Registrar y asignar"}</button>
      </div>
    </div>
  );
}
