/* Matemática del número generador (Módulo 3 del PRD).
   Qué dimensiones aplican depende de la unidad del concepto — el PRD da el
   ejemplo explícito: "bloquear Ancho si la unidad del concepto es m²". Un
   concepto en m² es casi siempre un elemento vertical (muro) cuya área sale
   de Largo x Alto; Ancho (el espesor) no participa en esa área. */
const DIM_APPLICABILITY = {
  m2: { length: true, width: false, height: true },
  m3: { length: true, width: true, height: true },
  ml: { length: true, width: false, height: false },
  pza: { length: false, width: false, height: false },
  lote: { length: false, width: false, height: false },
};

export function applicableDims(unit) {
  return DIM_APPLICABILITY[unit] || DIM_APPLICABILITY.m3;
}

/* Deducción de vanos = Pzas negativo (no un selector Suma/Descuento aparte). */
export function rowSubtotal(row, unit) {
  const dims = applicableDims(unit);
  const length = dims.length ? Number(row.length) || 0 : 1;
  const width = dims.width ? Number(row.width) || 0 : 1;
  const height = dims.height ? Number(row.height) || 0 : 1;
  const pieces = Number(row.pieces) || 0;
  return pieces * length * width * height;
}

/* Suma con signo de todas las filas (Pzas negativo resta); solo se recorta a
   cero el total consolidado, no cada fila — así una fila de deducción puede
   superar en magnitud a una fila individual de suma sin invalidar el cálculo. */
export function consolidateGenerator(rows, unit) {
  const total = (rows || []).reduce((sum, row) => sum + rowSubtotal(row, unit), 0);
  return Math.max(0, total);
}

export function emptyGeneratorRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    planRef: "",
    axis: "",
    section: "",
    pieces: 1,
    length: 0,
    width: 0,
    height: 0,
  };
}
