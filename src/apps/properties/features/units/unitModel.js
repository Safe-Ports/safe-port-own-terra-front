export const EMPTY_UNIT = {
  propertyId: "",
  ownerId: "",
  identifier: "",
  type: "apartment",
  floor: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  suggestedRent: "",
  status: "available",
  description: "",
};

export const UNIT_TYPE_LABEL = {
  apartment: "Departamento",
  house: "Casa",
  cabin: "Cabaña",
  room: "Habitación",
  commercial_unit: "Local comercial",
  office: "Oficina",
  warehouse: "Bodega",
  parking: "Cajón de estacionamiento",
  studio: "Estudio",
  penthouse: "Penthouse",
  other: "Otro espacio",
};

export const UNIT_STATUS_LABEL = {
  available: "Disponible",
  rented: "Rentada",
  maintenance: "En mantenimiento",
  archived: "Archivada",
};

export function validateUnit(unit, existingUnits = [], editingId = null) {
  const errors = {};
  if (!unit.propertyId) errors.propertyId = "Selecciona la propiedad a la que pertenece.";
  if (!unit.identifier?.trim()) errors.identifier = "Ingresa un identificador para la unidad.";
  const duplicate = existingUnits.some((existing) => existing.id !== editingId && existing.propertyId === unit.propertyId && existing.status !== "archived" && existing.identifier.toLowerCase() === unit.identifier?.trim().toLowerCase());
  if (!errors.identifier && duplicate) errors.identifier = "Ya existe una unidad con este identificador en la propiedad.";
  if (unit.area !== "" && Number(unit.area) <= 0) errors.area = "La superficie debe ser mayor que cero.";
  if (unit.suggestedRent !== "" && Number(unit.suggestedRent) < 0) errors.suggestedRent = "La renta no puede ser negativa.";
  return errors;
}

export function createUnit(draft) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    propertyId: draft.propertyId,
    ownerId: draft.ownerId || "",
    identifier: draft.identifier.trim(),
    type: draft.type,
    floor: draft.floor.trim(),
    area: Number(draft.area) || 0,
    bedrooms: Number(draft.bedrooms) || 0,
    bathrooms: Number(draft.bathrooms) || 0,
    suggestedRent: Number(draft.suggestedRent) || 0,
    status: draft.status,
    description: draft.description.trim(),
  };
}
