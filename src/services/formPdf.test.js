import { describe, expect, it, vi, beforeEach } from "vitest";

const saved = [];
const texts = [];
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor() { this.pages = 1; this.lastAutoTable = { finalY: 100 }; this.internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } }; }
    setTextColor() {} setFont() {} setFontSize() {} setDrawColor() {} setLineWidth() {} line() {} setPage() {}
    text(value) { texts.push(Array.isArray(value) ? value.join(" ") : value); }
    splitTextToSize(value) { return [value]; }
    addPage() { this.pages += 1; }
    getNumberOfPages() { return this.pages; }
    save(name) { saved.push(name); }
  },
}));
const tables = [];
vi.mock("jspdf-autotable", () => ({ autoTable: (doc, options) => { tables.push(options); } }));

import { downloadBlankFormPdf, downloadSubmissionsPdf, formValue, pdfFileName } from "./formPdf";

const template = {
  name: "Solicitud de información",
  description: "Llénalo con letra clara",
  fields: [{ id: "f1", label: "Nombre", required: true }, { id: "f2", label: "Intereses", description: "Separados por coma" }],
};

describe("formPdf", () => {
  beforeEach(() => { saved.length = 0; texts.length = 0; tables.length = 0; });

  it("convierte cada respuesta a texto legible", () => {
    expect(formValue("")).toBe("—");
    expect(formValue(null)).toBe("—");
    expect(formValue(["Lotes", "Casas"])).toBe("Lotes, Casas");
    expect(formValue(true)).toBe("Sí");
    expect(formValue(1500)).toBe("1500");
  });

  it("arma un nombre de archivo sin acentos ni espacios", () => {
    expect(pdfFileName("Solicitud de información", "respuestas")).toBe("solicitud_de_informacion_respuestas.pdf");
    expect(pdfFileName("", "")).toBe("formulario.pdf");
  });

  it("el PDF de respuestas lleva una tabla campo/respuesta por cada respuesta", async () => {
    await downloadSubmissionsPdf(template, [
      { id: "s1", submitted_at: "2026-10-20T15:00:00Z", data: { f1: "Ana", f2: ["Lotes"] } },
      { id: "s2", submitted_at: "2026-10-21T15:00:00Z", data: { f1: "Luis" } },
    ]);
    expect(saved).toEqual(["solicitud_de_informacion_respuestas.pdf"]);
    expect(tables).toHaveLength(2);
    expect(tables[0].body).toEqual([["Nombre", "Ana"], ["Intereses", "Lotes"]]);
    expect(tables[1].body).toEqual([["Nombre", "Luis"], ["Intereses", "—"]]);
    expect(texts).toContain("2 respuestas · generado el " + new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }));
  });

  it("el formulario en blanco marca los obligatorios e incluye la ayuda de cada campo", async () => {
    await downloadBlankFormPdf(template);
    expect(saved).toEqual(["solicitud_de_informacion_en_blanco.pdf"]);
    expect(texts).toEqual(expect.arrayContaining(["Nombre *", "Intereses", "Separados por coma", "Llénalo con letra clara"]));
  });
});
