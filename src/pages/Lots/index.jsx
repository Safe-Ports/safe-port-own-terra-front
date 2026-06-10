import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import * as XLSX from "xlsx";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { useProjectsQuery } from "@/hooks/queries/useAppQueries";
import { lotService } from "@/services/lotService";
import { getUserErrorMessage } from "@/services/errors";
import { currency } from "@/services/formatters";
import Button from "@/components/Button";
import GuideModal from "@/components/shared/GuideModal";

const LOT_COLORS = {
  available: { bg: "#dcfce7", border: "#86efac", text: "#15803d" },
  sold:      { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  reserved:  { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
};
const STATUS_CYCLE = { available: "sold", sold: "reserved", reserved: "available" };
const MAP_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LOT_REQUIRED_ALIASES = ["ID Lote", "id", "codigo", "código", "lote", "clave"];
const LOT_TEMPLATE_GUIDE = [
  ["GUÍA PARA CARGAR LOTES DESDE EXCEL O CSV"],
  ["Regla", "Detalle"],
  ["Estructura", "La primera fila contiene encabezados y cada fila siguiente representa un lote."],
  ["Campo requerido", "ID Lote. Debe tener valor único en todas las filas. También se aceptan: id, codigo, código, lote o clave."],
  ["Agrupación opcional", "Fraccionamiento, Sección, Manzana, Bloque o Section. Si se omite, los lotes se agrupan en Importados."],
  ["Campos numéricos opcionales", "Superficie (m2), Frente (ML), Fondo (ML), Precio Contado y Precio Financiado."],
  ["Estados", "disponible, apartado o reservado. Vendido requiere un contrato y no se asigna directamente durante esta carga."],
  ["Servicios opcionales", "Agua Potable, Energía Eléctrica, Drenaje, Gas Natural, Internet/Fibra y Pavimento. Usar sí/no, 1/0, true/false o x."],
  ["Vendedor Asignado", "Campo opcional de referencia. La asignación final del vendedor debe revisarse después de crear el fraccionamiento."],
  ["Archivos aceptados", "XLSX, XLS o CSV de hasta 10 MB."],
  ["Importante", "No combines celdas ni dejes filas sin ID Lote. Revisa los lotes preparados antes de crear el fraccionamiento."],
];
const LOT_IMPORT_GUIDE_STEPS = [
  {
    title: "Cómo subir el archivo",
    text: "En Carga de Lotes entra al editor, pulsa Plantilla para descargar un ejemplo, completa el archivo y luego pulsa Subir. El sistema prepara los lotes para que los revises antes de crear el fraccionamiento.",
  },
  {
    title: "Formato de Excel y CSV",
    text: "Se aceptan XLSX, XLS y CSV de hasta 10 MB. Usa la primera fila para los encabezados y una fila por lote. En CSV guarda el archivo con codificación UTF-8 para conservar acentos y la letra ñ.",
  },
  {
    title: "Campo obligatorio: ID Lote",
    text: "Cada fila debe tener un identificador único, por ejemplo A-01 o L001. El encabezado recomendado es ID Lote; también se aceptan id, codigo, código, lote o clave. Si falta o está duplicado, la fila no se carga.",
  },
  {
    title: "Agrupar por sección o manzana",
    text: "Usa uno de estos encabezados: Fraccionamiento, Sección, Manzana, Bloque o Section. Escribe el nombre que agrupará cada lote, por ejemplo Manzana A. Si omites la columna, se agrupan en Importados.",
  },
  {
    title: "Medidas y precios opcionales",
    text: "Encabezados aceptados: Superficie (m2), Frente (ML), Fondo (ML), Precio Contado y Precio Financiado. Usa números positivos; precios pueden incluir el signo $ y separadores de miles.",
  },
  {
    title: "Estado del lote",
    text: "Usa el encabezado Estado, Estatus o Status. Disponible, apartado y reservado se preparan para la carga. Vendido requiere un contrato, por lo que no puede asignarse directamente al crear lotes. Si el campo está vacío, se usa Disponible.",
  },
  {
    title: "Servicios opcionales",
    text: "Encabezados: Agua Potable, Energía Eléctrica, Drenaje, Gas Natural, Internet/Fibra y Pavimento. Para indicar que sí cuenta con el servicio usa sí, 1, true, yes o x; cualquier otro valor se toma como no.",
  },
  {
    title: "Lista completa de campos",
    text: "ID Lote es obligatorio. Son opcionales: Fraccionamiento/Sección/Manzana, Estado, Superficie (m2), Frente (ML), Fondo (ML), Precio Contado, Precio Financiado, Agua Potable, Energía Eléctrica, Drenaje, Gas Natural, Internet/Fibra y Pavimento. Vendedor Asignado queda como referencia y debe revisarse después.",
  },
  {
    title: "Revisión antes de guardar",
    text: "Después de subir el archivo revisa secciones, códigos, estados, medidas y precios en el tablero. El archivo solo prepara los lotes; se guardan definitivamente al pulsar Crear fraccionamiento.",
  },
];
const LOT_SELECTOR_GUIDE = {
  title: "Guía de Carga de Lotes",
  subtitle: "Elige el método adecuado para iniciar o continuar un fraccionamiento.",
  steps: [
    {
      title: "Revisa tu portafolio",
      text: "En la parte superior aparecen los fraccionamientos existentes. Usa Ver para abrir uno o Editar lotes para modificar su inventario.",
    },
    {
      title: "Carga manual",
      text: "Selecciona Carga Manual para crear un fraccionamiento desde cero. Puedes subir una imagen del plano o continuar sin imagen y construir las secciones manualmente.",
    },
    {
      title: "Importar CAD",
      text: "La opción CAD está pensada para archivos técnicos DWG o DXF. Úsala cuando el plano ya contiene la estructura que deseas procesar.",
    },
    {
      title: "Excel y CSV",
      text: "Para cargar lotes desde Excel o CSV entra primero a Carga Manual, selecciona una imagen o continúa sin plano, y después usa Plantilla y Subir dentro del tablero.",
    },
  ],
};
const LOT_MAP_GUIDE = {
  title: "Guía para preparar el plano",
  subtitle: "La imagen es opcional y sirve como referencia visual del fraccionamiento.",
  steps: [
    {
      title: "Nombre del fraccionamiento",
      text: "Escribe un nombre claro antes de continuar, por ejemplo Residencial Las Palmas. Este será el nombre visible en tu portafolio.",
    },
    {
      title: "Subir imagen del plano",
      text: "Selecciona una imagen JPG, PNG o WEBP. La imagen se mostrará como referencia mientras construyes y revisas la matriz de lotes.",
    },
    {
      title: "Continuar sin plano",
      text: "La imagen no es obligatoria. Pulsa Continuar para abrir el tablero y crear secciones manualmente o importar los lotes desde Excel o CSV.",
    },
    {
      title: "Cambiar de método",
      text: "Pulsa Cambiar modo para regresar a la vista principal y elegir otro método de carga.",
    },
  ],
};
const LOT_EDITOR_GUIDE = {
  title: "Guía del tablero y carga Excel/CSV",
  subtitle: "Crea secciones manualmente o prepara todos los lotes desde un archivo.",
  steps: [
    {
      title: "Crear lotes manualmente",
      text: "Escribe el nombre de la sección o manzana, indica cuántos lotes necesitas y pulsa Agregar. Después haz clic en cada lote para editar código, estado, medidas, precios y servicios.",
    },
    ...LOT_IMPORT_GUIDE_STEPS,
  ],
};

function createLots(sectionName, total) {
  return Array.from({ length: total }, (_, index) => ({
    id: `${sectionName}_${Date.now()}_${index}`,
    code: `${sectionName.slice(0, 1).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
    status: "available",
    area: "",
    price: ""
  }));
}

const LOTS_PER_PAGE = 60; // matriz 6×10

// Orden natural por código: A-01, A-02, ..., A-10, A-11
function sortLotsByCode(lots) {
  return [...lots].sort((a, b) =>
    String(a.code || "").localeCompare(String(b.code || ""), undefined, { numeric: true, sensitivity: "base" })
  );
}

function SectionGrid({ section, onAddLots, onRemoveSection, onEditLot }) {
  const [page, setPage] = useState(0);
  const sortedLots = useMemo(() => sortLotsByCode(section.lots), [section.lots]);
  const totalPages = Math.max(1, Math.ceil(sortedLots.length / LOTS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageLots = sortedLots.slice(safePage * LOTS_PER_PAGE, safePage * LOTS_PER_PAGE + LOTS_PER_PAGE);

  return (
    <div>
      {/* Section header */}
      <div className="mb-2.5 flex items-center gap-2">
        <div className="text-[0.7rem] font-extrabold uppercase tracking-[0.5px] text-[#43453F]">
          {section.name}
          <span className="ml-1 font-normal opacity-55 text-[0.62rem]">{section.lots.length} lotes</span>
        </div>
        <div className="h-px flex-1 bg-[#DCDAD2]" />
        <button
          onClick={() => onAddLots(section.id, 10)}
          title="Añadir 10 lotes"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-[#DCDAD2] bg-[#F1EEE6] text-[0.8rem] font-black text-[#355E3B]"
        >
          +
        </button>
        <button
          onClick={() => onRemoveSection(section.id)}
          title="Eliminar sección"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-[#DCDAD2] bg-[#F1EEE6] text-[0.8rem] font-black text-[#C0392B]"
        >
          ✕
        </button>
      </div>
      {/* Lot grid — 6 columnas */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {pageLots.map((lot) => {
          const c = LOT_COLORS[lot.status] || LOT_COLORS.available;
          return (
            <div
              key={lot.id}
              title={`${lot.code} — click para editar`}
              className="select-none cursor-pointer rounded-[8px] border-[1.5px] px-1 py-2 text-center transition-all hover:opacity-80 hover:shadow-md"
              style={{ background: c.bg, borderColor: c.border }}
              onClick={() => onEditLot(section.id, lot.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEditLot(section.id, lot.id);
                }
              }}
            >
              <div className="text-[0.78rem] font-extrabold leading-none" style={{ color: c.text }}>
                {lot.code}
              </div>
              <div className="mt-0.5 text-[0.56rem] opacity-70" style={{ color: c.text }}>
                {lot.area ? `${lot.area}m²` : lot.status === "available" ? "Libre" : lot.status === "sold" ? "Vendido" : "Apartado"}
              </div>
            </div>
          );
        })}
      </div>
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] border border-[#DCDAD2] bg-[#F1EEE6] text-[#355E3B] disabled:opacity-35"
          >
            <HiChevronLeft />
          </button>
          <span className="text-[0.66rem] font-semibold text-[#43453F]">
            Página {safePage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] border border-[#DCDAD2] bg-[#F1EEE6] text-[#355E3B] disabled:opacity-35"
          >
            <HiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

function cropPlanImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve({ dataUrl, cropped: false });
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

      const getLightRatioForRow = (row) => {
        let lightPixels = 0;
        for (let column = 0; column < width; column += 1) {
          const index = (row * width + column) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const lightness = (r + g + b) / 3;
          if (lightness > 208) lightPixels += 1;
        }
        return lightPixels / width;
      };

      const getLightRatioForColumn = (column) => {
        let lightPixels = 0;
        for (let row = 0; row < height; row += 1) {
          const index = (row * width + column) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const lightness = (r + g + b) / 3;
          if (lightness > 208) lightPixels += 1;
        }
        return lightPixels / height;
      };

      let top = 0;
      while (top < height && getLightRatioForRow(top) < 0.18) top += 1;

      let bottom = height - 1;
      while (bottom > top && getLightRatioForRow(bottom) < 0.18) bottom -= 1;

      let left = 0;
      while (left < width && getLightRatioForColumn(left) < 0.12) left += 1;

      let right = width - 1;
      while (right > left && getLightRatioForColumn(right) < 0.12) right -= 1;

      const cropWidth = right - left;
      const cropHeight = bottom - top;

      if (cropWidth < width * 0.35 || cropHeight < height * 0.2) {
        resolve({ dataUrl, cropped: false });
        return;
      }

      const paddingX = Math.round(cropWidth * 0.02);
      const paddingY = Math.round(cropHeight * 0.02);
      const safeLeft = Math.max(0, left - paddingX);
      const safeTop = Math.max(0, top - paddingY);
      const safeRight = Math.min(width, right + paddingX);
      const safeBottom = Math.min(height, bottom + paddingY);

      const outputCanvas = window.document.createElement("canvas");
      const outputContext = outputCanvas.getContext("2d");

      if (!outputContext) {
        resolve({ dataUrl, cropped: false });
        return;
      }

      outputCanvas.width = safeRight - safeLeft;
      outputCanvas.height = safeBottom - safeTop;
      outputContext.drawImage(
        image,
        safeLeft,
        safeTop,
        outputCanvas.width,
        outputCanvas.height,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );

      resolve({ dataUrl: outputCanvas.toDataURL("image/png"), cropped: true });
    };

    image.onerror = () => resolve({ dataUrl, cropped: false });
    image.src = dataUrl;
  });
}

function LotsPage() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjectsQuery();
  const { draftProject, setDraftProject, saveFrac, saveEditedFrac, setSelectedFracId, showToast } = useAppContext();
  const isEditing = !!draftProject._editingFracId;

  useEffect(() => {
    setDraftProject({ mode: "selector", name: "Nuevo Fraccionamiento", mapUrl: "", sections: [], cadProcessing: false });
  }, []);

  const [sectionName, setSectionName] = useState("");
  const [sectionTotal, setSectionTotal] = useState(20);
  const [mapFileName, setMapFileName] = useState("");
  const [lotEditDraft, setLotEditDraft] = useState(null); // null | { sectionId, ...lot }
  const [loadingEditId, setLoadingEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  useLandsGuide(() => setShowImportGuide(true));
  const activeGuide = draftProject.mode === "editor"
    ? LOT_EDITOR_GUIDE
    : draftProject.mode === "map-upload"
      ? LOT_MAP_GUIDE
      : LOT_SELECTOR_GUIDE;
  const [importSummary, setImportSummary] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importSummarySteps = importSummary ? [{
    title: `Última revisión · ${importSummary.fileName}`,
    text: `${importSummary.imported} lotes preparados${importSummary.sections ? ` en ${importSummary.sections} secciones` : ""}${importSummary.skipped ? ` · ${importSummary.skipped} filas omitidas` : ""}${importSummary.warnings?.length ? ". Advertencias: " + importSummary.warnings.slice(0, 3).join("; ") : ". Sin observaciones."}`
  }] : [];
  const changeImageRef = useRef(null);
  const excelInputRef = useRef(null);
  const portfolioScrollRef = useRef(null);

  const scrollPortfolio = (direction) => {
    const node = portfolioScrollRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.min(node.clientWidth * 0.86, 760),
      behavior: "smooth",
    });
  };

  const openProjectEditor = async (project) => {
    setLoadingEditId(project.id);
    try {
      const { items: lots } = await lotService.list({ inmueble_id: project.id, limit: 200 });
      const sectionMap = {};
      lots.forEach((lot) => {
        const sec = lot.section || "General";
        if (!sectionMap[sec]) sectionMap[sec] = { id: `sec_${sec}`, name: sec, lots: [] };
        sectionMap[sec].lots.push({
          id:              lot.id,
          _backendId:      lot.id,
          _orig: {
            area:            lot.area_m2 ?? "",
            price:           lot.price_contado ?? "",
            priceFinanciado: lot.price_financiado ?? "",
            frente:          lot.frente_ml ?? "",
            fondo:           lot.fondo_ml ?? "",
            servicios:       JSON.stringify(lot.services || {}),
          },
          code:            lot.code,
          status:          lot.status || "available",
          area:            lot.area_m2 ?? "",
          price:           lot.price_contado ?? "",
          priceFinanciado: lot.price_financiado ?? "",
          frente:          lot.frente_ml ?? "",
          fondo:           lot.fondo_ml ?? "",
          servicios:       lot.services || {},
        });
      });
      setDraftProject({
        mode:           "editor",
        name:           project.name,
        mapUrl:         "",
        cadProcessing:  false,
        sections:       Object.values(sectionMap),
        _editingFracId: project.id,
      });
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al cargar los lotes para editar"));
    } finally {
      setLoadingEditId(null);
    }
  };

  const STATUS_MAP = {
    disponible: "available", libre: "available", available: "available", vacante: "available",
    vendido: "sold", sold: "sold", ocupado: "sold",
    apartado: "reserved", apartada: "reserved", reservado: "reserved", reserved: "reserved",
  };

  const downloadImportTemplate = async () => {
    if (downloadingTemplate) return;
    setDownloadingTemplate(true);
    try {
      const blob = await lotService.importTemplate("xlsx");
      const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
      if (!workbook.SheetNames.includes("Guía")) {
        const guideSheet = XLSX.utils.aoa_to_sheet(LOT_TEMPLATE_GUIDE);
        guideSheet["!cols"] = [{ wch: 24 }, { wch: 82 }];
        XLSX.utils.book_append_sheet(workbook, guideSheet, "Guía");
      }
      XLSX.writeFile(workbook, "plantilla_lotes.xlsx");
      showToast("Plantilla de lotes descargada");
    } catch (err) {
      showToast(getUserErrorMessage(err, "No se pudo descargar la plantilla"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExcelFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      setImportSummary({
        fileName: file.name,
        imported: 0,
        skipped: 0,
        warnings: ["No se cargó ninguna fila: el archivo supera el límite de 10 MB."],
      });
      setShowImportGuide(true);
      showToast("El archivo no puede superar 10 MB");
      return;
    }

    const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let workbook;
        if (isCsv) {
          // CSV: decode as UTF-8 to preserve accents (é, í, ó, ú, ñ…)
          const text = new TextDecoder("utf-8").decode(e.target.result);
          workbook = XLSX.read(text, { type: "string" });
        } else {
          workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) : [];
        const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "" }) : [];

        // explicit Unicode range for combining diacritical marks
        const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const parseNumber = (value) => {
          const cleaned = String(value || "").replace(/[$,\s]/g, "");
          if (!cleaned) return "";
          const parsed = Number(cleaned);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : "";
        };
        const parseBoolean = (value) => ["1", "si", "yes", "true", "x"].includes(norm(value));

        const findCol = (row, aliases) => {
          const key = Object.keys(row).find((k) => aliases.some((a) => norm(k) === norm(a)));
          return key ? String(row[key]).trim() : "";
        };

        if (!rows.length) {
          setImportSummary({
            fileName: file.name,
            imported: 0,
            skipped: 0,
            warnings: ["El archivo no contiene filas de datos."],
          });
          setShowImportGuide(true);
          showToast("El archivo no contiene filas de datos");
          return;
        }

        const headers = (matrix[0] || []).map((header) => String(header).trim());
        const hasCodeColumn = headers.some((header) => LOT_REQUIRED_ALIASES.some((alias) => norm(header) === norm(alias)));
        if (!hasCodeColumn) {
          setImportSummary({
            fileName: file.name,
            imported: 0,
            skipped: rows.length,
            warnings: ["No se cargó ninguna fila: falta la columna obligatoria ID Lote."],
          });
          setShowImportGuide(true);
          showToast("Falta la columna obligatoria ID Lote");
          return;
        }

        const rowsWithoutCode = rows.flatMap((row, index) =>
          findCol(row, LOT_REQUIRED_ALIASES) ? [] : [index + 2]
        );
        if (rowsWithoutCode.length) {
          const visibleRows = rowsWithoutCode.slice(0, 8).join(", ");
          const remaining = rowsWithoutCode.length > 8 ? ` y ${rowsWithoutCode.length - 8} más` : "";
          setImportSummary({
            fileName: file.name,
            imported: 0,
            skipped: rows.length,
            warnings: [
              "No se cargó ninguna fila porque existen valores requeridos vacíos.",
              `ID Lote vacío en filas: ${visibleRows}${remaining}.`,
            ],
          });
          setShowImportGuide(true);
          showToast("No se cargó el archivo: hay filas sin ID Lote");
          return;
        }

        const grouped = {};
        const warnings = [];
        const seenCodes = new Set();
        let skipped = 0;
        rows.forEach((row, i) => {
          const rowNumber = i + 2;
          const code = findCol(row, LOT_REQUIRED_ALIASES);
          if (seenCodes.has(norm(code))) {
            skipped += 1;
            warnings.push(`Fila ${rowNumber}: ID Lote duplicado (${code}).`);
            return;
          }
          seenCodes.add(norm(code));

          const secName = findCol(row, ["Fraccionamiento", "Seccion", "seccion", "sección", "manzana", "bloque", "section"]) || "Importados";
          const statusRaw = norm(findCol(row, ["Estado", "estatus", "status"]));
          const status = STATUS_MAP[statusRaw] || "available";
          if (statusRaw && !STATUS_MAP[statusRaw]) warnings.push(`Fila ${rowNumber}: estado "${statusRaw}" no reconocido; se usó Disponible.`);
          const area = parseNumber(findCol(row, ["Superficie (m2)", "superficie", "area", "area", "m2"]));
          const price = parseNumber(findCol(row, ["Precio Contado", "precio contado", "contado", "precio"]));
          const priceFinanciado = parseNumber(findCol(row, ["Precio Financiado", "financiado"]));
          const frente = parseNumber(findCol(row, ["Frente (ML)", "frente (ml)", "frente"]));
          const fondo = parseNumber(findCol(row, ["Fondo (ML)", "fondo (ml)", "fondo"]));
          const vendedor = findCol(row, ["Vendedor Asignado", "vendedor asignado", "vendedor", "asesor", "seller"]);
          const servicios = {
            agua: parseBoolean(findCol(row, ["Agua Potable", "agua potable", "agua"])),
            luz: parseBoolean(findCol(row, ["Energia Electrica", "Energía Eléctrica", "energia electrica", "luz", "electricidad"])),
            drenaje: parseBoolean(findCol(row, ["Drenaje", "drenaje"])),
            gas: parseBoolean(findCol(row, ["Gas Natural", "gas natural", "gas"])),
            internet: parseBoolean(findCol(row, ["Internet/Fibra", "internet/fibra", "internet"])),
            pavimento: parseBoolean(findCol(row, ["Pavimento", "pavimento"])),
          };
          if (!grouped[secName]) grouped[secName] = [];
          grouped[secName].push({ id: `xl_${Date.now()}_${i}`, code, status, area, price, priceFinanciado, frente, fondo, servicios, vendedor });
        });

        const newSections = Object.entries(grouped).map(([name, lots]) => ({
          id: `section_xl_${Date.now()}_${name}`,
          name,
          lots,
        }));

        setDraftProject((prev) => ({
          ...prev,
          sections: [...prev.sections, ...newSections],
        }));

        const total = newSections.reduce((s, sec) => s + sec.lots.length, 0);
        setImportSummary({
          fileName: file.name,
          imported: total,
          skipped,
          warnings,
          sections: newSections.length,
        });
        showToast(`${total} lotes preparados desde Excel${skipped ? ` · ${skipped} omitidos` : ""}`);
      } catch (err) {
        setImportSummary({
          fileName: file.name,
          imported: 0,
          skipped: 0,
          warnings: ["No fue posible leer el archivo. Descarga la plantilla y verifica el formato."],
        });
        setShowImportGuide(true);
        showToast(getUserErrorMessage(err, "Error al leer el archivo. Usa el formato de plantilla."));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const openEditLot = (sectionId, lotId) => {
    const sec = draftProject.sections.find((s) => s.id === sectionId);
    const lot = sec?.lots.find((l) => l.id === lotId);
    if (!lot) return;
    setLotEditDraft({
      sectionId,
      ...lot,
      frente: lot.frente ?? "",
      fondo: lot.fondo ?? "",
      priceFinanciado: lot.priceFinanciado ?? "",
      vendedor: lot.vendedor ?? "",
      servicios: lot.servicios ?? { agua: false, luz: false, drenaje: false, gas: false, internet: false, pavimento: false }
    });
  };

  const saveLotEdit = () => {
    if (!lotEditDraft) return;
    const { sectionId, ...lotData } = lotEditDraft;
    updateLot(sectionId, lotData.id, lotData);
    setLotEditDraft(null);
  };

  const addSection = () => {
    if (!sectionName.trim()) return;
    setDraftProject((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        {
          id: `section_${Date.now()}`,
          name: sectionName.trim(),
          lots: createLots(sectionName.trim(), Number(sectionTotal))
        }
      ]
    }));
    setSectionName("");
    setSectionTotal(20);
  };

  const cycleLotStatus = (sectionId, lotId) => {
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.map((sec) =>
        sec.id !== sectionId ? sec : {
          ...sec,
          lots: sec.lots.map((lot) =>
            lot.id !== lotId ? lot : { ...lot, status: STATUS_CYCLE[lot.status] || "available" }
          )
        }
      )
    }));
  };

  const updateLot = (sectionId, lotId, patch) => {
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.map((sec) =>
        sec.id !== sectionId ? sec : {
          ...sec,
          lots: sec.lots.map((lot) => lot.id !== lotId ? lot : { ...lot, ...patch })
        }
      )
    }));
  };

  const removeSection = (sectionId) => {
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.filter((sec) => sec.id !== sectionId)
    }));
  };

  const addLotsToSection = (sectionId, count) => {
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const start = sec.lots.length;
        const prefix = sec.name.slice(0, 1).toUpperCase();
        const newLots = Array.from({ length: count }, (_, i) => ({
          id: `${sectionId}_ext_${Date.now()}_${i}`,
          code: `${prefix}-${String(start + i + 1).padStart(2, "0")}`,
          status: "available",
          area: "",
          price: ""
        }));
        return { ...sec, lots: [...sec.lots, ...newLots] };
      })
    }));
  };

  const isValidMapImage = (file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    return MAP_IMAGE_TYPES.has(file.type) || ["jpg", "jpeg", "png", "webp"].includes(extension);
  };

  const updateMap = (file) => {
    if (!isValidMapImage(file)) {
      showToast("El plano debe ser una imagen JPG, PNG o WEBP. Excel y CSV solo van en Llenar con Excel o CSV.");
      return false;
    }

    setMapFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const sourceDataUrl = event.target?.result || "";
      const processed = await cropPlanImage(sourceDataUrl);

      setDraftProject((previous) => ({
        ...previous,
        mapUrl: processed.dataUrl,
        name: previous.name || "Nuevo Fraccionamiento"
      }));

      if (processed.cropped) {
        showToast("Plano ajustado automáticamente para enfocar el lote");
      }
    };
    reader.readAsDataURL(file);
    return true;
  };

  const totalDraftLots = draftProject.sections.reduce((sum, section) => sum + section.lots.length, 0);

  // ── EDITOR: full-height split layout ──────────────────────────────
  if (draftProject.mode === "editor") {
    return (
      <>
      <div
        className="lots-editor-shell"
      >
        {/* Top bar */}
        <div className="lots-editor-topbar">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                className="lots-editor-btn"
                onClick={() => { setDraftProject((p) => ({ ...p, _editingFracId: null })); navigate("/fraccionamientos"); }}
              >
                Cancelar
              </button>
              <span className="lots-editor-state">
                <span className="lots-editor-dot warn" />
                Editando: {draftProject.name}
              </span>
            </div>
          ) : (
            <>
              <button
                className="lots-editor-btn"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "map-upload" }))}
              >
                Cambiar mapa
              </button>
              <div className="lots-editor-separator" />
              {mapFileName && (
                <div className="lots-editor-file"><span>MAP</span>{mapFileName}</div>
              )}
            </>
          )}
          <div className="flex-1" />
          <div className="lots-editor-legend">
            <span>
              <span className="lots-legend-mark available" />
              Disponible
            </span>
            <span>
              <span className="lots-legend-mark sold" />
              Vendido
            </span>
            <span>
              <span className="lots-legend-mark reserved" />
              Apartado
            </span>
          </div>
          <button
            className="lots-editor-btn lots-editor-primary"
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                if (isEditing) await saveEditedFrac(draftProject);
                else await saveFrac(draftProject);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!draftProject.sections.length || saving}
          >
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear fraccionamiento"}
          </button>
        </div>

        {/* Split */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: map */}
          <div className="lots-map-pane">
            {draftProject.mapUrl ? (
              <img
                src={draftProject.mapUrl}
                alt="Plano"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="lots-map-empty">
                <div className="lots-map-empty-code">PL</div>
                <div className="lots-map-empty-title">Sin imagen de plano</div>
                <div className="lots-map-empty-sub">
                  Sube o cambia el archivo para visualizar el mapa del fraccionamiento.
                </div>
              </div>
            )}
            <div className="lots-image-buttons">
              <button
                className="lots-map-action"
                onClick={() => changeImageRef.current?.click()}
              >
                {draftProject.mapUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
            </div>
            <input
              ref={changeImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) updateMap(file);
                event.target.value = "";
              }}
            />
          </div>

          {/* Divider */}
          <div className="lots-editor-divider" />

          {/* Right: builder panel */}
          <div className="lots-builder-panel">
            {/* Panel header */}
            <div className="lots-builder-head">
              <div className="lots-builder-title-row">
                <div className="lots-builder-title">Tablero de lotes</div>
                <div className="lots-builder-count">
                  {totalDraftLots} lotes · {draftProject.sections.length} sec
                </div>
              </div>
              <div className="lots-section-form">
                <div className="lots-section-name">
                  <div className="lots-builder-label">
                    Nombre de sección
                  </div>
                  <input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addSection()}
                    placeholder="Ej: Manzana A, Frente Norte..."
                    className="lots-builder-input"
                  />
                </div>
                <div className="lots-section-total">
                  <div className="lots-builder-label">
                    N° de lotes
                  </div>
                  <input
                    type="number"
                    value={sectionTotal}
                    onChange={(event) => setSectionTotal(Number(event.target.value))}
                    className="lots-builder-input center"
                  />
                </div>
                <button
                  onClick={addSection}
                  className="lots-add-section"
                >
                  Agregar
                </button>
              </div>
              <div className="lots-excel-row">
                <div>
                  <span className="lots-excel-title">Llenar con Excel o CSV</span>
                  <span className="lots-excel-sub">
                    {importSummary
                      ? `${importSummary.imported} preparados${importSummary.skipped ? ` · ${importSummary.skipped} omitidos` : ""}`
                      : "Importa lotes desde XLSX, XLS o CSV"}
                  </span>
                </div>
                <button className="lots-excel-upload" onClick={downloadImportTemplate} disabled={downloadingTemplate}>
                  {downloadingTemplate ? "Descargando..." : "Plantilla"}
                </button>
                <button
                  className="lots-excel-upload"
                  onClick={() => excelInputRef.current?.click()}
                >
                  Subir
                </button>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelFile}
                />
              </div>
            </div>

            {/* Matrix board */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {draftProject.sections.length === 0 ? (
                <div className="lots-empty-state">
                  <div className="lots-empty-code">LT</div>
                  <div className="lots-empty-title">Añade una sección para empezar</div>
                  <div className="lots-empty-sub">
                    Construye la matriz de lotes por manzana, frente o etapa.
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {draftProject.sections.map((section) => (
                    <SectionGrid
                      key={section.id}
                      section={section}
                      onAddLots={addLotsToSection}
                      onRemoveSection={removeSection}
                      onEditLot={openEditLot}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Lot edit modal */}
      {lotEditDraft && (() => {
        const d = lotEditDraft;
        const setField = (key, val) => setLotEditDraft((prev) => ({ ...prev, [key]: val }));
        const setService = (key, val) => setLotEditDraft((prev) => ({ ...prev, servicios: { ...prev.servicios, [key]: val } }));
        const SERVICES = [
          { key: "agua",      label: "Agua potable"      },
          { key: "luz",       label: "Energia electrica" },
          { key: "drenaje",   label: "Drenaje"           },
          { key: "gas",       label: "Gas natural"       },
          { key: "internet",  label: "Internet / Fibra"  },
          { key: "pavimento", label: "Pavimento"         },
        ];
        return (
          <div className="lot-edit-overlay" onClick={() => setLotEditDraft(null)}>
            <div className="lot-edit-modal" onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="lot-edit-head">
                <div className="lot-edit-badge">{d.code}</div>
                <div>
                  <div className="lot-edit-title">Editar lote</div>
                  <div className="lot-edit-sub">{draftProject.name}</div>
                </div>
                <button className="lot-edit-close" onClick={() => setLotEditDraft(null)}>×</button>
              </div>

              {/* Body */}
              <div className="lot-edit-body">

                {/* Identificación */}
                <div className="lot-edit-sec">Identificación</div>
                <div className="lot-edit-row">
                  <div className="lot-edit-field">
                    <label className="lot-edit-lbl">Codigo / ID Lote</label>
                    <input className="lot-edit-input" value={d.code} onChange={(e) => setField("code", e.target.value)} />
                  </div>
                  <div className="lot-edit-field">
                    <label className="lot-edit-lbl">Fraccionamiento</label>
                    <input className="lot-edit-input" value={draftProject.name} onChange={(e) => setDraftProject((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre del fraccionamiento" />
                  </div>
                </div>

                {/* Estado */}
                <div className="lot-edit-sec">Estado</div>
                <div className="lot-edit-status">
                  {[
                    { value: "available", label: "Disponible", dot: "#6FAF6B" },
                    { value: "reserved",  label: "Apartado",   dot: "#B98C58" },
                    { value: "sold",      label: "Vendido",    dot: "#C0392B" },
                  ].map(({ value, label, dot }) => {
                    const c = LOT_COLORS[value];
                    const active = d.status === value;
                    return (
                      <button
                        key={value}
                        className="lot-edit-status-btn"
                        onClick={() => setField("status", value)}
                        style={active ? { background: c.bg, borderColor: c.border, color: c.text } : {}}
                      >
                        <span className="lot-edit-status-dot" style={{ background: dot }} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Medidas */}
                <div className="lot-edit-sec">Medidas</div>
                <div className="lot-edit-row cols-3">
                  {[{ key: "frente", label: "Frente (ML)" }, { key: "fondo", label: "Fondo (ML)" }, { key: "area", label: "Superficie (m²)" }].map(({ key, label }) => (
                    <div className="lot-edit-field" key={key}>
                      <label className="lot-edit-lbl">{label}</label>
                      <input type="number" className="lot-edit-input" value={d[key]} onChange={(e) => setField(key, Number(e.target.value))} />
                    </div>
                  ))}
                </div>

                {/* Financiero */}
                <div className="lot-edit-sec">Financiero</div>
                <div className="lot-edit-row">
                  <div className="lot-edit-field">
                    <label className="lot-edit-lbl">Precio Contado ($)</label>
                    <input type="number" className="lot-edit-input" value={d.price} onChange={(e) => setField("price", Number(e.target.value))} />
                  </div>
                  <div className="lot-edit-field">
                    <label className="lot-edit-lbl">Precio Financiado ($)</label>
                    <input type="number" className="lot-edit-input" value={d.priceFinanciado} onChange={(e) => setField("priceFinanciado", Number(e.target.value))} />
                  </div>
                </div>

                {/* Gestion */}
                <div className="lot-edit-sec">Gestion</div>
                <div className="lot-edit-field">
                  <label className="lot-edit-lbl">Vendedor Asignado</label>
                  <input className="lot-edit-input" placeholder="Nombre del vendedor" value={d.vendedor} onChange={(e) => setField("vendedor", e.target.value)} />
                </div>

                {/* Servicios */}
                <div className="lot-edit-sec">Servicios disponibles</div>
                <div className="lot-edit-services">
                  {SERVICES.map(({ key, label }) => {
                    const on = !!d.servicios[key];
                    return (
                      <label key={key} className="lot-edit-service">
                        <span>{label}</span>
                        <input type="checkbox" checked={on} onChange={(e) => setService(key, e.target.checked)} />
                        <span className={`lot-edit-toggle${on ? " on" : ""}`} />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="lot-edit-foot">
                <button className="lot-edit-primary" onClick={saveLotEdit}>Guardar</button>
                <button className="lot-edit-ghost" onClick={() => setLotEditDraft(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      <GuideModal
        open={showImportGuide}
        onClose={() => setShowImportGuide(false)}
        title={activeGuide.title}
        subtitle={activeGuide.subtitle}
        steps={[...activeGuide.steps, ...importSummarySteps]}
      />
      </>
    );
  }

  // ── SELECTOR / MAP-UPLOAD: página normal ──────────────────────────
  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#DCDAD2] bg-[linear-gradient(150deg,#1A3428,#101511)] p-5 text-[#E9E5DB] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#6FAF6B]">Inventario táctil</div>
            <h1 className="mt-2 font-['Playfair_Display'] text-[1.9rem] leading-none">Lotes y proyectos</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right">
            <div className="text-[0.64rem] uppercase tracking-[0.18em] text-white/45">Activos</div>
            <div className="mt-1 text-sm font-bold">{projects.length}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {draftProject.mode === "selector" && (
            <button
              className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/20"
              onClick={() => setDraftProject((previous) => ({ ...previous, mode: "map-upload" }))}
            >
              Nuevo proyecto
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#83867C]">Portafolio</h2>
            <div className="mt-1 text-xs font-medium text-[#83867C]">
              {projects.length} fraccionamientos · usa las flechas o arrastra la lista
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-[#1E3D2B]">
              {projects.reduce((sum, item) => sum + item.totalLots, 0)} lotes
            </span>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCDAD2] bg-white/90 text-[#1E3D2B] shadow-[0_8px_18px_rgba(24,18,14,.08)] transition hover:border-[#355E3B] hover:bg-[#FBFAF6]"
              type="button"
              onClick={() => scrollPortfolio(-1)}
              aria-label="Ver fraccionamientos anteriores"
            >
              <HiChevronLeft className="text-lg" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCDAD2] bg-white/90 text-[#1E3D2B] shadow-[0_8px_18px_rgba(24,18,14,.08)] transition hover:border-[#355E3B] hover:bg-[#FBFAF6]"
              type="button"
              onClick={() => scrollPortfolio(1)}
              aria-label="Ver mas fraccionamientos"
            >
              <HiChevronRight className="text-lg" />
            </button>
          </div>
        </div>
        <div
          ref={portfolioScrollRef}
          className="portfolio-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pr-5"
        >
          {projects.map((project) => (
            <article
              key={project.id}
              className="min-w-[min(86vw,340px)] snap-start rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)] sm:min-w-[330px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-['Playfair_Display'] text-xl text-[#1E3D2B]">{project.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#83867C]">
                    {project.totalLots} propiedades
                  </div>
                </div>
                <div className="rounded-full bg-[#EDE3D3] px-3 py-1 text-[0.68rem] font-bold text-[#1E3D2B]">
                  {project.available} libres
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[#FBFAF6] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Vendido</div>
                  <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{project.sold}</div>
                </div>
                <div className="rounded-2xl bg-[#FBFAF6] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Reserva</div>
                  <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{project.reserved}</div>
                </div>
                <div className="rounded-2xl bg-[#FBFAF6] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Disponible</div>
                  <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{project.available}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="btn-s flex-1"
                  onClick={() => {
                    setSelectedFracId(project.id);
                    navigate("/fraccionamientos");
                  }}
                >
                  Ver
                </button>
                <button
                  className="flex-1 whitespace-nowrap rounded-[10px] border-[1.5px] border-[#355E3B] bg-[#355E3B] px-3 py-[7px] text-[0.76rem] font-bold text-white transition-colors hover:bg-[#21643F] disabled:opacity-60"
                  onClick={() => openProjectEditor(project)}
                  disabled={loadingEditId === project.id}
                >
                  {loadingEditId === project.id ? "Cargando..." : "✏ Editar lotes"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {draftProject.mode === "selector" ? (
        <section className="rounded-[28px] border border-[#DCDAD2] bg-white/88 p-8 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="mx-auto max-w-[660px] text-center">
            <h2 className="font-['Playfair_Display'] text-[1.65rem] text-[#1E3D2B]">Carga de Lotes</h2>
            <p className="mx-auto mt-2 max-w-[420px] text-[0.84rem] leading-relaxed text-[#83867C]">
              Elige el método que mejor se adapte a tu flujo de trabajo
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {/* ── Carga Manual ── */}
              <div
                className="relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border-2 border-[#DCDAD2] bg-[#FBFAF6] p-7 text-center transition-all duration-200 hover:-translate-y-[3px] hover:border-[#355E3B] hover:shadow-[0_8px_24px_rgba(45,90,71,.15)]"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "map-upload" }))}
              >
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#355E3B]" />
                <div className="mx-auto mb-3 flex h-[62px] w-[62px] items-center justify-center rounded-[15px] bg-[#D4EAE0] text-[1.8rem]">
                  🗺️
                </div>
                <div className="mb-2 font-['Playfair_Display'] text-[1.05rem] text-[#1E3D2B]">Carga Manual</div>
                <div className="mb-5 text-[0.76rem] leading-relaxed text-[#83867C]">
                  Sube la imagen del plano y construye la matriz de lotes manualmente. Define secciones, columnas y estado de cada unidad.
                </div>
                <button className="pointer-events-none mb-3 w-full rounded-[9px] bg-[#355E3B] px-4 py-2.5 text-[0.8rem] font-bold text-white">
                  Abrir editor →
                </button>
                <button
                  className="w-full rounded-[9px] border border-[#DCDAD2] bg-white px-4 py-2 text-[0.72rem] font-semibold text-[#83867C] transition-colors hover:border-[#B98C58] hover:text-[#B98C58]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const mockSections = [
                      { id: "mock_a", name: "Manzana A", lots: Array.from({ length: 12 }, (_, i) => ({ id: `ma_${i}`, code: `A-${String(i+1).padStart(2,"0")}`, status: i < 8 ? "sold" : i < 10 ? "reserved" : "available", area: 200 + i * 5, price: 450000 + i * 10000, priceFinanciado: 520000 + i * 10000, frente: 10, fondo: 20, servicios: { agua: true, luz: true, drenaje: true, gas: false, internet: false, pavimento: true } })) },
                      { id: "mock_b", name: "Manzana B", lots: Array.from({ length: 10 }, (_, i) => ({ id: `mb_${i}`, code: `B-${String(i+1).padStart(2,"0")}`, status: i < 4 ? "sold" : i < 6 ? "reserved" : "available", area: 180 + i * 8, price: 380000 + i * 12000, priceFinanciado: 440000 + i * 12000, frente: 9, fondo: 20, servicios: { agua: true, luz: true, drenaje: true, gas: true, internet: true, pavimento: false } })) },
                      { id: "mock_c", name: "Zona Premium", lots: Array.from({ length: 6 }, (_, i) => ({ id: `mc_${i}`, code: `P-${String(i+1).padStart(2,"0")}`, status: i < 2 ? "sold" : "available", area: 350 + i * 20, price: 750000 + i * 30000, priceFinanciado: 880000 + i * 30000, frente: 14, fondo: 25, servicios: { agua: true, luz: true, drenaje: true, gas: true, internet: true, pavimento: true } })) },
                    ];
                    setDraftProject((previous) => ({
                      ...previous,
                      mode: "editor",
                      name: "Residencial Demo",
                      mapUrl: "",
                      sections: mockSections,
                    }));
                  }}
                >
                  🏘️ Cargar demo
                </button>
              </div>

              {/* ── Carga CAD ── */}
              <div
                className="relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border-2 border-[#DCDAD2] bg-[#FBFAF6] p-7 text-center transition-all duration-200 hover:-translate-y-[3px] hover:border-[#4A6FA5] hover:shadow-[0_8px_24px_rgba(74,111,165,.15)]"
                onClick={() => {
                  setDraftProject((previous) => ({
                    ...previous,
                    mode: "map-upload",
                    cadProcessing: true,
                  }));
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#4A6FA5]" />
                <div className="mx-auto mb-3 flex h-[62px] w-[62px] items-center justify-center rounded-[15px] bg-[#E8EEF7] text-[1.8rem]">
                  📐
                </div>
                <div className="mb-2 font-['Playfair_Display'] text-[1.05rem] text-[#1E3D2B]">Importar CAD</div>
                <div className="mb-5 flex-1 text-[0.76rem] leading-relaxed text-[#83867C]">
                  Sube un archivo DWG o DXF del plano técnico y el sistema extrae automáticamente la estructura de lotes.
                </div>
                <button className="pointer-events-none w-full rounded-[9px] bg-[#4A6FA5] px-4 py-2.5 text-[0.8rem] font-bold text-white">
                  Subir archivo CAD →
                </button>
              </div>

            </div>
          </div>
        </section>
      ) : (
        /* map-upload step */
        <section className="lot-upload-shell">
          <div className="lot-upload-head">
            <div>
              <span className="lot-upload-kicker">Plano base</span>
              <h2 className="lot-upload-title">Sube el plano del fraccionamiento</h2>
              <p className="lot-upload-copy">
                Usa una imagen del plano para trabajar la matriz de lotes sobre el tablero.
              </p>
            </div>
            <div className="lot-upload-actions">
              <button
                className="lot-upload-secondary"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "selector" }))}
              >
                Cambiar modo
              </button>
            </div>
          </div>

          <div className="lot-upload-body">
            <div style={{ marginBottom: 16 }}>
              <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]" style={{ marginBottom: 6, fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#83867C" }}>Nombre del fraccionamiento</div>
              <input
                className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none"
                style={{ width: "100%", borderRadius: 8, border: "1.5px solid #DCDAD2", background: "white", padding: "8px 12px", fontSize: ".84rem", color: "#1E3D2B", outline: "none", fontFamily: "inherit" }}
                placeholder="Ej. Residencial Las Palmas"
                value={draftProject.name === "Nuevo Fraccionamiento" ? "" : draftProject.name}
                onChange={(e) => setDraftProject((prev) => ({ ...prev, name: e.target.value || "Nuevo Fraccionamiento" }))}
              />
            </div>
            <label className="lot-upload-drop">
              <div className="lot-upload-code">IMG</div>
              <div>
                <div className="lot-upload-drop-title">Seleccionar imagen del plano</div>
                <div className="lot-upload-drop-sub">JPG, PNG o WEBP</div>
              </div>
              <div className="lot-upload-formats">
                {["JPG", "PNG", "WEBP"].map((ext) => (
                  <span key={ext}>{ext}</span>
                ))}
              </div>
              <div className="lot-upload-cta">Buscar archivo</div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && updateMap(file)) {
                    setDraftProject((previous) => ({ ...previous, mode: "editor" }));
                  }
                  event.target.value = "";
                }}
              />
            </label>
            <div className="lot-upload-foot">
              <div>
                <span>Sin plano</span>
                <p>También puedes crear secciones y lotes manualmente.</p>
              </div>
              <button
                className="lot-upload-secondary"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "editor" }))}
              >
                Continuar
              </button>
            </div>
          </div>
        </section>
      )}
      <GuideModal
        open={showImportGuide}
        onClose={() => setShowImportGuide(false)}
        title={activeGuide.title}
        subtitle={activeGuide.subtitle}
        steps={[...activeGuide.steps, ...importSummarySteps]}
      />
    </div>
  );
}

export default LotsPage;
