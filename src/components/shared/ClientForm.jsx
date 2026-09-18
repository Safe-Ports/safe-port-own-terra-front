import { useMemo, useState } from "react";
import { HiExclamationTriangle, HiGlobeAlt } from "react-icons/hi2";
import PhoneInput from "@/components/shared/PhoneInput";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CLIENT_RULES = {
  nombre: (v) => (!v || v.trim().length < 2 ? "Escribe el nombre (mínimo 2 caracteres)." : ""),
  email: (v) => (v && !EMAIL_RE.test(v.trim()) ? "El correo no tiene un formato válido." : ""),
};

/** El backend responde los errores por campo con estos nombres. */
export const CLIENT_FIELD_MAP = { name: "nombre", email: "email", phone: "phone" };

function splitName(name = "") {
  const parts = name.trim().split(" ");
  return { nombre: parts[0] || "", apellidos: parts.slice(1).join(" ") };
}

/**
 * Estado y validación del alta/edición de un cliente, para que la pantalla de
 * Clientes y el alta rápida desde un lote compartan exactamente las mismas
 * reglas — antes el alta rápida tenía su propio mini-formulario con menos
 * campos y sin detección de duplicados.
 *
 * @param {object|null} initial Cliente a editar, o null para uno nuevo.
 * @param {Array} clients Cartera actual, para detectar un correo ya registrado.
 */
export function useClientForm(initial = null, clients = []) {
  const [form, setForm] = useState(() => {
    if (!initial) return { nombre: "", apellidos: "", phone: "", email: "", type: "buyer", notes: "" };
    const { nombre, apellidos } = splitName(initial.name);
    return {
      nombre, apellidos,
      phone: initial.phone || "",
      email: initial.email || "",
      type: initial.type || "buyer",
      notes: initial.notes || "",
    };
  });
  const fe = useFieldErrors();

  const fullName = `${form.nombre} ${form.apellidos}`.trim();

  // Mismo correo ya en la cartera: se vincula esa identidad en vez de duplicarla.
  // Se descarta solo al EDITAR un cliente real (initial con id): un `initial`
  // sin id es apenas una precarga de campos y ahí sí hay que detectar el duplicado.
  const dupe = useMemo(() => {
    if (initial?.id || !form.email.trim()) return null;
    return clients.find(
      (c) => c.email && c.email.toLowerCase() === form.email.trim().toLowerCase()
    ) || null;
  }, [initial?.id, form.email, clients]);

  return {
    form,
    setForm,
    fe,
    fullName,
    dupe,
    validate: () => fe.validate(form, CLIENT_RULES),
    /** Payload tal como lo espera `saveClient` del contexto. */
    payload: () => ({
      ...(initial || {}),
      ...form,
      name: fullName,
      linkClientId: dupe?.id,
    }),
  };
}

/**
 * Los campos del cliente, sin envoltorio: quien lo use decide si va dentro de
 * un modal, de un panel lateral o de una sección inline, y pone sus botones.
 */
export default function ClientForm({ ctl, compact = false, showNotice = true, isEditing = false }) {
  const { form, setForm, fe, dupe } = ctl;

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
    fe.clear(key);
  };

  return (
    <>
      {showNotice && !isEditing && (
        <div className="cf-notice">
          <HiGlobeAlt />
          <span>
            Se registra en el <b>ecosistema</b> como identidad única y se le da acceso a
            Lands. Si el correo ya existe en el core, se <b>vincula</b> en lugar de duplicar.
          </span>
        </div>
      )}

      {dupe && (
        <div className="cf-notice dupe">
          <HiExclamationTriangle />
          <span>
            Ya existe en el core: <b>{dupe.name}</b>. Al guardar se <b>vinculará</b> en vez
            de crear un duplicado.
          </span>
        </div>
      )}

      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Nombre</label>
          <input
            {...fe.fieldProps("nombre")}
            value={form.nombre}
            onChange={setField("nombre")}
            placeholder="Nombre"
          />
          <FieldError msg={fe.errors.nombre} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Apellidos</label>
          <input
            className="fi"
            value={form.apellidos}
            onChange={setField("apellidos")}
            placeholder="Apellidos"
          />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Teléfono</label>
        <PhoneInput inputClassName="fi" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
      </div>

      <div className="fg">
        <label className="fl">Correo electrónico</label>
        <input {...fe.fieldProps("email")} type="email" value={form.email} onChange={setField("email")} />
        <FieldError msg={fe.errors.email} />
      </div>

      <div className="fg">
        <label className="fl">Tipo de cliente</label>
        <select className="fi" value={form.type} onChange={setField("type")}>
          <option value="buyer">Comprador</option>
          <option value="tenant">Arrendatario</option>
          <option value="lead">Prospecto</option>
        </select>
      </div>

      {/* Las notas se omiten en el alta rápida desde un lote: ahí lo que urge es
          poder apartar o agendar, y se pueden agregar después en su ficha. */}
      {!compact && (
        <div className="fg">
          <label className="fl">Notas</label>
          <textarea className="fi" rows="2" value={form.notes} onChange={setField("notes")} />
        </div>
      )}
    </>
  );
}
