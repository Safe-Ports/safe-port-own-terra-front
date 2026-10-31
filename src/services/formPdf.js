/**
 * PDF de formularios, generado en el navegador: el de todas las respuestas, el
 * de una sola respuesta y el formulario en blanco para llenar a mano.
 *
 * Antes solo se podía exportar a CSV, y para "imprimir" había que abrir el CSV en
 * Excel. jsPDF se descarga hasta que alguien pide un PDF, no en cada visita.
 */

const INK = [30, 61, 43];
const MUTED = [131, 134, 124];
const LINE = [220, 227, 222];
const MARGIN = 40;

export function formValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(formValue).join(", ") : "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function submissionDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function pdfFileName(name, suffix) {
  const base = String(name || "formulario").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return `${base || "formulario"}${suffix ? `_${suffix}` : ""}.pdf`;
}

async function loadPdf() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { jsPDF, autoTable };
}

function header(doc, title, subtitle) {
  const width = doc.internal.pageSize.getWidth();
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, MARGIN, 52, { maxWidth: width - MARGIN * 2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, MARGIN, 68);
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, 78, width - MARGIN, 78);
  return 94;
}

function pageNumbers(doc) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${pages}`, width - MARGIN, height - 20, { align: "right" });
  }
}

const today = () => new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

// Una tabla de dos columnas (campo / respuesta) por cada respuesta: se lee bien
// tenga el formulario 3 campos o 30, cosa que una tabla ancha no logra en carta.
function submissionTable(doc, autoTable, fields, submission, title, startY) {
  autoTable(doc, {
    startY,
    head: [[{ content: title, colSpan: 2 }]],
    body: fields.map((field) => [field.label, formValue(submission.data?.[field.id])]),
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: LINE, lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [244, 241, 234], textColor: INK, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 170, textColor: MUTED } },
    rowPageBreak: "avoid",
  });
  return doc.lastAutoTable.finalY + 16;
}

export async function downloadSubmissionsPdf(template, submissions) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const fields = template.fields ?? [];
  let y = header(doc, template.name, `${submissions.length} ${submissions.length === 1 ? "respuesta" : "respuestas"} · generado el ${today()}`);
  submissions.forEach((submission, index) => {
    y = submissionTable(doc, autoTable, fields, submission, `Respuesta ${index + 1} · ${submissionDate(submission.submitted_at)}`, y);
  });
  pageNumbers(doc);
  doc.save(pdfFileName(template.name, "respuestas"));
}

export async function downloadSubmissionPdf(template, submission) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const y = header(doc, template.name, `Respuesta recibida el ${submissionDate(submission.submitted_at)}`);
  submissionTable(doc, autoTable, template.fields ?? [], submission, "Respuesta", y);
  pageNumbers(doc);
  doc.save(pdfFileName(template.name, "respuesta"));
}

// El formulario vacío, con renglones para escribir a mano: para cuando la
// captura se hace en papel y luego se pasa al sistema.
export async function downloadBlankFormPdf(template) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const width = doc.internal.pageSize.getWidth();
  const bottom = doc.internal.pageSize.getHeight() - 50;
  let y = header(doc, template.name, "Formulario para llenar a mano · los campos con * son obligatorios");
  if (template.description) {
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(template.description, width - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 12 + 10;
  }
  (template.fields ?? []).forEach((field) => {
    const help = field.description ? doc.splitTextToSize(field.description, width - MARGIN * 2) : [];
    const block = 16 + help.length * 11 + 46;
    if (y + block > bottom) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`${field.label}${field.required ? " *" : ""}`, MARGIN, y);
    y += 13;
    if (help.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(help, MARGIN, y);
      y += help.length * 11;
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y + 18, width - MARGIN, y + 18);
    doc.line(MARGIN, y + 38, width - MARGIN, y + 38);
    y += 58;
  });
  pageNumbers(doc);
  doc.save(pdfFileName(template.name, "en_blanco"));
}
