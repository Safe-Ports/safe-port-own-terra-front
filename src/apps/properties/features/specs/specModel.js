import { UNIT_TYPE_LABEL } from "../units/unitModel";

/* Fichas técnicas.
   - Unidad: vive en `properties.attributes` (properties-back). Llaves en inglés,
     las que ya guarda el front; se aceptan también las de los ejemplos del
     backend (`recamaras`, `banos`, `indiviso_pct`).
   - Edificio / comunidad: `specs_properties` por inmueble, con `attributos`
     (sí/no) y `dimensiones` (números), en español como en el backend. */

export const UNIT_SPEC_NUMBERS = [
  { key: "area", label: "Superficie", unit: "m²" },
  { key: "bedrooms", label: "Recámaras", aliases: ["recamaras"] },
  { key: "bathrooms", label: "Baños", aliases: ["banos"] },
  { key: "parking", label: "Estacionamientos", aliases: ["estacionamientos", "cajones"] },
  { key: "indiviso_pct", label: "Indiviso", unit: "%", aliases: ["indiviso"] },
];

export const UNIT_SPEC_FEATURES = [
  { key: "balcony", label: "Balcón o terraza" },
  { key: "storage_room", label: "Bodega" },
  { key: "furnished", label: "Amueblada" },
  { key: "pets_allowed", label: "Acepta mascotas" },
];

export const BUILDING_AMENITIES = [
  { key: "elevador", label: "Elevador" },
  { key: "seguridad_24h", label: "Seguridad 24 h" },
  { key: "acceso_controlado", label: "Acceso controlado" },
  { key: "alberca_comun", label: "Alberca" },
  { key: "gimnasio", label: "Gimnasio" },
  { key: "roof_garden", label: "Roof garden" },
  { key: "salon_eventos", label: "Salón de eventos" },
  { key: "area_juegos", label: "Área de juegos" },
  { key: "estacionamiento_visitas", label: "Estacionamiento de visitas" },
  { key: "planta_emergencia", label: "Planta de emergencia" },
];

export const BUILDING_DIMENSIONS = [
  { key: "m2_totales", label: "Superficie total", unit: "m²" },
  { key: "torres", label: "Torres o edificios" },
  { key: "niveles", label: "Niveles" },
  { key: "anio_construccion", label: "Año de construcción", plain: true },
];

// Datos de la unidad que no son ficha técnica (dueño, renta, ubicación) o que
// ya se muestran aparte (tipo, piso, descripción).
const UNIT_RESERVED = new Set(["owner_id", "suggested_rent", "description", "address", "city", "state", "type", "floor"]);
const KNOWN_UNIT_KEYS = new Set([...UNIT_SPEC_NUMBERS.flatMap((field) => [field.key, ...(field.aliases || [])]), ...UNIT_SPEC_FEATURES.map((field) => field.key)]);

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const isFilled = (value) => value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value));
const humanize = (key) => key.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
const formatValue = (value, unit, plain) => {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  const number = Number(value);
  const text = plain || Number.isNaN(number) ? String(value) : numberFormat.format(number);
  return unit ? `${text} ${unit}` : text;
};
const pick = (source, field) => [field.key, ...(field.aliases || [])].map((key) => source[key]).find(isFilled);

/** Ficha de una unidad a partir de sus `attributes` (o de la unidad ya mapeada). */
export function unitSpecSheet(attributes = {}) {
  const source = attributes || {};
  const facts = [];
  if (source.type) facts.push({ key: "type", label: "Tipo", value: UNIT_TYPE_LABEL[source.type] || humanize(source.type) });
  if (isFilled(source.floor)) facts.push({ key: "floor", label: "Piso o nivel", value: String(source.floor) });
  for (const field of UNIT_SPEC_NUMBERS) {
    const value = pick(source, field);
    // 0 recámaras o 0 m² en la ficha es ruido: se omite.
    if (isFilled(value) && Number(value) !== 0) facts.push({ key: field.key, label: field.label, value: formatValue(value, field.unit) });
  }
  // Lo que el backend tenga y el front aún no conozca también se muestra.
  for (const [key, value] of Object.entries(source)) {
    if (UNIT_RESERVED.has(key) || KNOWN_UNIT_KEYS.has(key) || !isFilled(value) || typeof value === "object") continue;
    facts.push({ key, label: humanize(key), value: formatValue(value) });
  }
  const features = UNIT_SPEC_FEATURES.filter((field) => source[field.key] === true).map((field) => field.label);
  return { facts, features, description: source.description || "" };
}

/** Ficha del edificio a partir de la respuesta de `/inmuebles/{id}/specs`. */
export function buildingSpecSheet(spec) {
  const attributos = spec?.attributos || {};
  const dimensiones = spec?.dimensiones || {};
  const known = new Set(BUILDING_AMENITIES.map((field) => field.key));
  const features = [
    ...BUILDING_AMENITIES.filter((field) => attributos[field.key] === true).map((field) => field.label),
    ...Object.entries(attributos).filter(([key, value]) => !known.has(key) && value === true).map(([key]) => humanize(key)),
  ];
  const knownDims = new Set(BUILDING_DIMENSIONS.map((field) => field.key));
  const facts = [
    ...BUILDING_DIMENSIONS.filter((field) => isFilled(dimensiones[field.key])).map((field) => ({ key: field.key, label: field.label, value: formatValue(dimensiones[field.key], field.unit, field.plain) })),
    ...Object.entries(dimensiones).filter(([key, value]) => !knownDims.has(key) && isFilled(value) && typeof value !== "object").map(([key, value]) => ({ key, label: humanize(key), value: formatValue(value) })),
  ];
  return { facts, features };
}

/** Borrador editable de la ficha de una unidad (sólo lo que el formulario agrega). */
export function unitSpecDraft(attributes = {}) {
  const source = attributes || {};
  return {
    ...Object.fromEntries(UNIT_SPEC_NUMBERS.filter((field) => !["area", "bedrooms", "bathrooms"].includes(field.key)).map((field) => [field.key, isFilled(pick(source, field)) ? String(pick(source, field)) : ""])),
    ...Object.fromEntries(UNIT_SPEC_FEATURES.map((field) => [field.key, source[field.key] === true])),
  };
}

/** Convierte el borrador a `attributes`: números como número, vacíos fuera. */
export function unitSpecPayload(draft = {}) {
  const out = {};
  for (const field of UNIT_SPEC_NUMBERS) if (field.key in draft) out[field.key] = draft[field.key] === "" ? null : Number(draft[field.key]);
  for (const field of UNIT_SPEC_FEATURES) if (field.key in draft) out[field.key] = Boolean(draft[field.key]);
  return out;
}

/** Borrador y payload de la ficha del edificio; conserva llaves desconocidas. */
export function buildingSpecDraft(spec) {
  const attributos = spec?.attributos || {};
  const dimensiones = spec?.dimensiones || {};
  return {
    attributos: { ...attributos, ...Object.fromEntries(BUILDING_AMENITIES.map((field) => [field.key, attributos[field.key] === true])) },
    dimensiones: { ...dimensiones, ...Object.fromEntries(BUILDING_DIMENSIONS.map((field) => [field.key, isFilled(dimensiones[field.key]) ? String(dimensiones[field.key]) : ""])) },
  };
}

export function buildingSpecPayload(draft) {
  const dimensiones = {};
  for (const [key, value] of Object.entries(draft.dimensiones || {})) {
    if (!isFilled(value)) continue;
    const number = Number(value);
    dimensiones[key] = Number.isNaN(number) ? value : number;
  }
  const attributos = Object.fromEntries(Object.entries(draft.attributos || {}).filter(([, value]) => value !== false));
  return { attributos, dimensiones };
}
