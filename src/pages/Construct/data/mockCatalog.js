/* Catálogo semilla de Ownterra Construct.
   Sin backend todavía (ver decisión en el plan de implementación): este archivo
   alimenta el store en memoria de `@/services/constructService.js`. Cuando exista
   un backend real, este seed se sustituye por el fetch inicial y solo cambia
   ese servicio, no los componentes que lo consumen. */

export const UNITS = [
  { code: "m2", label: "m²" },
  { code: "m3", label: "m³" },
  { code: "ml", label: "ml" },
  { code: "pza", label: "pza" },
  { code: "lote", label: "lote" },
];

/* Taxonomía CSI-lite: divisiones MasterFormat más comunes en obra civil mexicana.
   No pretende ser el catálogo CSI completo (fuera de alcance del MVP). */
export const CSI_DIVISIONS = [
  { code: "02", name: "Preliminares y demoliciones" },
  { code: "03", name: "Concreto" },
  { code: "04", name: "Mampostería" },
  { code: "05", name: "Metales" },
  { code: "06", name: "Madera y plásticos" },
  { code: "07", name: "Impermeabilización y aislamiento" },
  { code: "08", name: "Puertas y ventanas" },
  { code: "09", name: "Acabados" },
  { code: "22", name: "Instalación hidráulica" },
  { code: "26", name: "Instalación eléctrica" },
];

/* factor de cuotas patronales/IMSS aplicado al Salario Base de MO → FASAR */
export const FACTOR_CUOTAS_PATRONALES = 1.35;

export const INSUMOS_SEED = [
  { id: "mat-cemento", kind: "MAT", code: "MAT-001", name: "Cemento gris (saco 50kg)", csiDivision: "03", unit: "saco", baseCost: 210 },
  { id: "mat-arena", kind: "MAT", code: "MAT-002", name: "Arena de río", csiDivision: "03", unit: "m3", baseCost: 480 },
  { id: "mat-grava", kind: "MAT", code: "MAT-003", name: "Grava 3/4\"", csiDivision: "03", unit: "m3", baseCost: 520 },
  { id: "mat-varilla", kind: "MAT", code: "MAT-004", name: "Varilla corrugada 3/8\"", csiDivision: "03", unit: "kg", baseCost: 24.5 },
  { id: "mat-block", kind: "MAT", code: "MAT-005", name: "Block hueco 15x20x40", csiDivision: "04", unit: "pza", baseCost: 12.8 },
  { id: "mat-agua", kind: "MAT", code: "MAT-006", name: "Agua", csiDivision: "03", unit: "m3", baseCost: 35 },
  { id: "mo-peon", kind: "MO", code: "MO-001", name: "Peón", csiDivision: "02", unit: "jornal", baseCost: 380 },
  { id: "mo-oficial", kind: "MO", code: "MO-002", name: "Oficial albañil", csiDivision: "04", unit: "jornal", baseCost: 520 },
  { id: "mo-cabo", kind: "MO", code: "MO-003", name: "Cabo de cuadrilla", csiDivision: "02", unit: "jornal", baseCost: 610 },
  { id: "eq-retro", kind: "EQ", code: "EQ-001", name: "Retroexcavadora", csiDivision: "02", unit: "hora", baseCost: 850, usefulLifeHours: 1 },
  { id: "eq-mezcladora", kind: "EQ", code: "EQ-002", name: "Mezcladora 1 saco", csiDivision: "03", unit: "hora", baseCost: 45, usefulLifeHours: 1 },
  { id: "eq-menor", kind: "EQ", code: "EQ-003", name: "Herramienta menor (% de MO)", csiDivision: "02", unit: "jornal", baseCost: 18, usefulLifeHours: 1 },
];

export const BASICOS_SEED = [
  {
    id: "bas-mortero-1-4",
    code: "BAS-001",
    name: "Mortero cemento-arena 1:4",
    unit: "m3",
    components: [
      { id: "c1", refType: "insumo", refId: "mat-cemento", performance: 7.5 },
      { id: "c2", refType: "insumo", refId: "mat-arena", performance: 1.1 },
      { id: "c3", refType: "insumo", refId: "mat-agua", performance: 0.22 },
      { id: "c4", refType: "insumo", refId: "eq-mezcladora", performance: 0.6 },
      { id: "c5", refType: "insumo", refId: "mo-peon", performance: 0.5 },
    ],
  },
];

export const MASTER_CONCEPTS_SEED = [
  {
    id: "mc-muro-block",
    code: "ALB-002",
    name: "Muro de block hueco 15x20x40, junteado con mortero 1:4",
    unit: "m2",
    csiDivision: "04",
    apu: [
      { id: "a1", refType: "insumo", refId: "mat-block", performance: 12.5 },
      { id: "a2", refType: "basico", refId: "bas-mortero-1-4", performance: 0.018 },
      { id: "a3", refType: "insumo", refId: "mo-oficial", performance: 0.42 },
      { id: "a4", refType: "insumo", refId: "mo-peon", performance: 0.42 },
      { id: "a5", refType: "insumo", refId: "eq-menor", performance: 0.05 },
    ],
  },
  {
    id: "mc-castillo",
    code: "EST-014",
    name: "Castillo de concreto armado 15x15cm, f'c=200kg/cm²",
    unit: "ml",
    csiDivision: "03",
    apu: [
      { id: "b1", refType: "insumo", refId: "mat-cemento", performance: 1.6 },
      { id: "b2", refType: "insumo", refId: "mat-arena", performance: 0.045 },
      { id: "b3", refType: "insumo", refId: "mat-grava", performance: 0.06 },
      { id: "b4", refType: "insumo", refId: "mat-varilla", performance: 4.8 },
      { id: "b5", refType: "insumo", refId: "mo-oficial", performance: 0.35 },
      { id: "b6", refType: "insumo", refId: "mo-peon", performance: 0.7 },
    ],
  },
];

/* Plantillas de partidas sugeridas para "Usar estructura de obra" al crear proyecto. */
export const STAGE_TEMPLATES = [
  "Preliminares",
  "Cimentación",
  "Estructura",
  "Albañilería",
  "Instalaciones",
  "Acabados",
];

export function seedProject() {
  const projectId = "prj-demo-1";
  const nodes = [
    { id: "n-fase-1", projectId, parentId: null, name: "Preliminares", order: 0, kind: "fase", closed: false },
    { id: "n-fase-2", projectId, parentId: null, name: "Albañilería", order: 1, kind: "fase", closed: false },
    { id: "n-partida-1", projectId, parentId: "n-fase-2", name: "Muros de block PB", order: 0, kind: "partida", closed: false },
  ];
  const concepts = [
    {
      id: "cpt-1",
      projectId,
      nodeId: "n-partida-1",
      code: "ALB-002",
      name: "Muro de block hueco 15x20x40, junteado con mortero 1:4",
      unit: "m2",
      type: "generator",
      status: "Cuantificada",
      masterConceptId: "mc-muro-block",
      quantity: 29.19, // = 12.4*2.7 - 0.9*2.1 - 2*(1.2*1.0), consistente con las filas de abajo
      rows: [
        { id: "r1", planRef: "ARQ-04", axis: "A/1-4", section: "Muro completo", pieces: 1, length: 12.4, width: 0, height: 2.7 },
        { id: "r2", planRef: "ARQ-04", axis: "A/1-4", section: "Vano puerta P-1", pieces: -1, length: 0.9, width: 0, height: 2.1 },
        { id: "r3", planRef: "ARQ-04", axis: "A/1-4", section: "Vano ventana V-2", pieces: -2, length: 1.2, width: 0, height: 1.0 },
      ],
      direct: null,
      financial: {
        mode: "apu",
        apu: [
          { id: "a1", refType: "insumo", refId: "mat-block", performance: 12.5 },
          { id: "a2", refType: "basico", refId: "bas-mortero-1-4", performance: 0.018 },
          { id: "a3", refType: "insumo", refId: "mo-oficial", performance: 0.42 },
          { id: "a4", refType: "insumo", refId: "mo-peon", performance: 0.42 },
          { id: "a5", refType: "insumo", refId: "eq-menor", performance: 0.05 },
        ],
        lumpAmount: null,
        parametricUnitPrice: null,
      },
    },
  ];
  return { projectId, nodes, concepts };
}

export function seedProjects() {
  return [
    {
      id: "prj-demo-1",
      name: "Casa Residencial Bosques",
      location: "Guadalajara, Jalisco",
      type: "Casa habitación",
      createdAt: new Date().toISOString(),
      settings: {
        indirectosCampo: 0.08,
        indirectosOficina: 0.04,
        financiamiento: 0.015,
        utilidad: 0.06,
        cargosAdicionales: 0,
      },
    },
  ];
}
