export const EMPTY_OWNER = {
  name: "",
  personType: "individual",
  email: "",
  phone: "",
  notes: "",
};

export function validateOwner(owner) {
  const errors = {};
  if (!owner.name?.trim()) errors.name = "Ingresa el nombre o razón social.";
  if (!owner.email?.trim()) errors.email = "Ingresa un correo electrónico.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) errors.email = "Ingresa un correo válido.";
  if (!owner.phone?.trim()) errors.phone = "Ingresa un teléfono de contacto.";
  return errors;
}

export function createOwner(draft) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    name: draft.name.trim(),
    personType: draft.personType,
    email: draft.email.trim().toLowerCase(),
    phone: draft.phone.trim(),
    notes: draft.notes.trim(),
    status: "active",
    propertiesCount: 0,
  };
}
