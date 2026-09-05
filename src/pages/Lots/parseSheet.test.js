import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { enTandas, parseSheet } from "./parseSheet";

const ALIAS = {
  numero_contrato: ["Numero de Contrato", "contrato"],
  clave_cliente: ["Clave Cliente", "clave"],
  precio: ["Precio", "monto"],
};

/** Arma un File real a partir de filas, como el que elige el usuario. */
function hoja(filas) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), "Hoja1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "contratos.xlsx");
}

describe("parseSheet", () => {
  it("numera las filas como las ve el usuario en Excel", async () => {
    const f = hoja([
      ["Numero de Contrato", "Clave Cliente", "Precio"],
      ["CON-001", "7", "600000"],
      ["CON-002", "8", "580000"],
    ]);
    const filas = await parseSheet(f, ALIAS);
    // La fila 2 de la hoja es el primer dato: quien corrige abre Excel y va directo.
    expect(filas.map((r) => r._row)).toEqual([2, 3]);
    expect(filas[0].numero_contrato).toBe("CON-001");
  });

  it("acepta encabezados alternativos y con acentos distintos", async () => {
    const f = hoja([["contrato", "clave", "monto"], ["CON-9", "3", "100"]]);
    const filas = await parseSheet(f, ALIAS);
    expect(filas[0]).toMatchObject({ numero_contrato: "CON-9", clave_cliente: "3", precio: "100" });
  });

  it("descarta las filas totalmente vacías", async () => {
    const f = hoja([
      ["Numero de Contrato", "Clave Cliente", "Precio"],
      ["CON-001", "7", "600000"],
      ["", "", ""],
    ]);
    expect(await parseSheet(f, ALIAS)).toHaveLength(1);
  });

  it("devuelve vacío si solo hay encabezados", async () => {
    expect(await parseSheet(hoja([["Numero de Contrato"]]), ALIAS)).toEqual([]);
  });
});

describe("enTandas", () => {
  it("parte respetando el tamaño y no pierde elementos", () => {
    const t = enTandas([...Array(250).keys()], 100);
    expect(t.map((x) => x.length)).toEqual([100, 100, 50]);
    expect(t.flat()).toHaveLength(250);
  });
});
