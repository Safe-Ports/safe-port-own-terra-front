import * as XLSX from "xlsx";

/* Mismo patrón que src/pages/Lots/index.jsx (única exportación a Excel ya
   existente en el repo): aoa_to_sheet + book_append_sheet + writeFile. */
export function exportWorkbook(filename, sheets) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  });
  XLSX.writeFile(workbook, filename);
}
