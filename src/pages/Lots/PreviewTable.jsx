/* Lo que va a entrar, antes de que entre. Un contador dice cuántas filas; esto
   dice cuáles — y es donde se descubre que la columna de precios se corrió, o
   que los nombres vienen con el apellido primero. */

/** Columnas visibles por fase, en el orden en que se leen. */
const COLUMNAS = {
  lotes: [
    ["row", "Fila"], ["code", "ID Lote"], ["price_contado", "Contado"],
    ["price_financiado", "Financiado"], ["area_m2", "Superficie"],
    ["frente_ml", "Frente"], ["fondo_ml", "Fondo"],
  ],
  clientes: [
    ["row", "Fila"], ["external_key", "Clave"], ["name", "Nombre"],
    ["phone", "Teléfono"], ["email", "Email"],
  ],
  contratos: [
    ["_row", "Fila"], ["numero_contrato", "Contrato"], ["clave_cliente", "Cliente"],
    ["id_lote", "Lote"], ["tipo", "Tipo"], ["precio", "Precio"],
    ["enganche", "Enganche"], ["plazo", "Plazo"], ["cuotas_pagadas", "Pagadas"],
    ["vendedor", "Vendedor"],
  ],
};

const TOPE = 50;

export default function PreviewTable({ fase, filas = [] }) {
  const columnas = COLUMNAS[fase] || [];
  if (filas.length === 0 || columnas.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[11px] border border-[#E2E7E5]">
      <div className="max-h-[280px] overflow-auto">
        <table className="w-full border-collapse text-[0.74rem]">
          <thead className="sticky top-0 bg-[#EEF1F1]">
            <tr>
              {columnas.map(([clave, titulo]) => (
                <th key={clave}
                  className="whitespace-nowrap px-3 py-2 text-left font-bold text-[#83867C]">
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, TOPE).map((f, i) => (
              <tr key={i} className="border-t border-[#EEF1F1]">
                {columnas.map(([clave]) => (
                  <td key={clave} className="whitespace-nowrap px-3 py-1.5 text-[#43453F]">
                    {f[clave] === null || f[clave] === undefined || f[clave] === ""
                      ? <span className="text-[#C3C6BE]">—</span>
                      : String(f[clave])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length > TOPE && (
        <div className="border-t border-[#E2E7E5] bg-[#FBFCFB] px-3 py-2 text-[0.72rem] text-[#83867C]">
          Se muestran las primeras {TOPE} de {filas.length.toLocaleString("es-MX")} filas.
        </div>
      )}
    </div>
  );
}
