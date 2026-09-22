export const PROVIDER_TYPES = [
  { value: "servicios", label: "Servicios", description: "Mantenimiento, limpieza y operación" },
  { value: "materiales", label: "Materiales", description: "Insumos para obra y reparaciones" },
  { value: "subcontratista", label: "Subcontratista", description: "Cuadrillas y mano de obra externa" },
  { value: "profesional", label: "Servicios profesionales", description: "Asesoría, diseño y especialidades" },
  { value: "equipo", label: "Equipo y renta", description: "Maquinaria, herramientas y mobiliario" },
  { value: "logistica", label: "Logística", description: "Transporte, mensajería y movimientos" },
  { value: "servicios_basicos", label: "Servicios básicos", description: "Agua, luz, gas, internet y suministro" },
  { value: "otro", label: "Otro", description: "Proveedor aún sin clasificación" },
];

const TYPE_ALIASES = { servicio: "servicios", mantenimiento: "servicios", material: "materiales", materiales: "materiales", mano_de_obra: "subcontratista", contratista: "subcontratista", subcontrata: "subcontratista", profesionales: "profesional", maquinaria: "equipo", renta: "equipo", transporte: "logistica", suministros: "servicios_basicos", utilities: "servicios_basicos" };

export function normalizeProviderType(value = "") {
  const normalized = String(value).trim().toLowerCase().replaceAll(" ", "_");
  return PROVIDER_TYPES.find((type) => type.value === normalized)?.value || TYPE_ALIASES[normalized] || "otro";
}

export function providerTypeMeta(value) {
  const normalized = normalizeProviderType(value);
  return PROVIDER_TYPES.find((type) => type.value === normalized) || PROVIDER_TYPES.at(-1);
}

export function providerSearchText(provider) {
  return [provider.name, provider.categoria, provider.tax_id, provider.phone, provider.notes].filter(Boolean).join(" ").toLowerCase();
}
