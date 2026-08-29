import * as XLSX from "xlsx";

/**
 * Lee un CSV o Excel y devuelve sus filas como objetos, con el número de fila
 * original de la hoja.
 *
 * Ese número es lo que después permite decir "fila 347: no existe el cliente":
 * quien corrige el archivo lo abre en Excel y va directo, en vez de contar filas.
 *
 * @param {File} file Archivo elegido por el usuario.
 * @param {Record<string,string[]>} alias Campo destino → encabezados aceptados.
 * @returns {Promise<Array<object>>} Filas con `_row` incluido.
 */
export async function parseSheet(file, alias) {
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false, raw: false });
  if (matriz.length < 2) return [];

  const norm = (v) =>
    String(v ?? "").trim().toLocaleLowerCase("es-MX")
      .normalize("NFD").replace(/[̀-ͯ]/g, "");

  const encabezados = matriz[0].map(norm);
  const indices = {};
  for (const [campo, nombres] of Object.entries(alias)) {
    const objetivo = nombres.map(norm);
    const i = encabezados.findIndex((h) => objetivo.includes(h));
    if (i !== -1) indices[campo] = i;
  }

  return matriz.slice(1)
    .map((fila, i) => {
      const obj = { _row: i + 2 };   // +2: la hoja arranca en 1 y la primera es el encabezado
      for (const [campo, idx] of Object.entries(indices)) {
        obj[campo] = String(fila[idx] ?? "").trim();
      }
      return obj;
    })
    .filter((f) => Object.entries(f).some(([k, v]) => k !== "_row" && v));
}

/** Parte una lista en tandas del tamaño pedido. */
export function enTandas(items, tamano) {
  const salida = [];
  for (let i = 0; i < items.length; i += tamano) salida.push(items.slice(i, i + tamano));
  return salida;
}
