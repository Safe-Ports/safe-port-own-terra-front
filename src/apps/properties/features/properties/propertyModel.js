export const EMPTY_PROPERTY = {
  name: "",
  ownerId: "",
  type: "apartment_building",
  address: "",
  city: "",
  state: "",
  description: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  suggestedRent: "",
  unitStatus: "available",
};

export const PROPERTY_TYPE_LABEL = {
  house: "Casa",
  apartment: "Departamento individual",
  apartment_building: "Edificio de departamentos",
  commercial: "Comercial",
  office: "Oficinas",
  warehouse: "Bodegas",
  industrial: "Industrial",
  mixed: "Uso mixto",
  land: "Terreno",
};

export function validateProperty(property) {
  const errors = {};
  if (!property.name?.trim()) errors.name = "Ingresa un nombre para identificar el inmueble.";
  if (!property.address?.trim()) errors.address = "Ingresa la dirección del inmueble.";
  if (!property.city?.trim()) errors.city = "Ingresa la ciudad o municipio.";
  if (!property.state?.trim()) errors.state = "Ingresa el estado.";
  return errors;
}

export function createProperty(draft) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    name: draft.name.trim(),
    ownerId: draft.ownerId,
    type: draft.type,
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    description: draft.description.trim(),
    status: "active",
    unitsCount: 0,
    occupiedUnits: 0,
  };
}
