import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import * as XLSX from "xlsx";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useProjectsQuery } from "@/hooks/queries/useAppQueries";
import { lotService } from "@/services/lotService";
import { parseApiError } from "@/errors/parseApiError";
import { MAP_IMAGE_ACCEPT, isSupportedMapImage, prepareMapImage } from "@/utils/mapImage";
import Button from "@/components/Button";
import GuideModal from "@/components/shared/GuideModal";
import LotImportFormatModal from "./LotImportFormatModal";
import ImportResultsModal from "./ImportResultsModal";

const LOT_COLORS = {
  available: { bg: "#dcfce7", border: "#86efac", text: "#15803d" },
  sold:      { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  reserved:  { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
};
const STATUS_CYCLE = { available: "sold", sold: "reserved", reserved: "available" };
const LOT_TEMPLATE_GUIDE = [
  ["GUÍA PARA CARGAR LOTES DESDE EXCEL O CSV"],
  ["Regla", "Detalle"],
  ["Estructura", "La primera fila contiene encabezados y cada fila siguiente representa un lote. Máximo 5,000 filas por archivo."],
  ["Campo requerido", "ID Lote (único por fila). También se aceptan: id, codigo, código, lote o clave. Filas sin ID Lote o con duplicados son rechazadas."],
  ["Agrupación opcional", "Fraccionamiento, Fracc, Desarrollo, Proyecto. Si se omite, los lotes se agrupan en Importados."],
  ["Campos numéricos opcionales", "Superficie (m2), Frente (ML), Fondo (ML), Precio Contado y Precio Financiado. Acepta formato $400,000.50."],
  ["Estados válidos", "disponible / libre / vacante → Disponible. apartado / apartada / reservado / reservada → Apartado. vendido / ocupado → Vendido. Vacío = Disponible."],
  ["Servicios opcionales", "Agua Potable, Energía Eléctrica, Drenaje, Gas Natural, Internet/Fibra y Pavimento. Activar con: sí, 1, yes, true, x o ✓."],
  ["Vendedor Asignado", "Opcional. Se busca por nombre exacto o parcial entre usuarios activos. Si hay ambigüedad queda sin asignar (advertencia)."],
  ["Archivos aceptados", "XLSX, XLS, CSV o TXT de hasta 10 MB."],
  ["Importante", "El fraccionamiento debe existir antes de subir el archivo (créalo primero con \"Guardar y continuar\"). El archivo se valida en el servidor y los lotes se guardan en cuanto pasa la validación. No combines celdas ni dejes filas sin ID Lote."],
];
const LOT_IMPORT_GUIDE_STEPS = [
  {
    title: "Cómo subir el archivo",
    text: "En Carga de Lotes entra al editor, pulsa Plantilla para descargar un ejemplo, completa el archivo y luego pulsa Subir. El servidor valida el archivo y guarda los lotes si no hay errores.",
  },
  {
    title: "Formato de Excel y CSV",
    text: "Se aceptan XLSX, XLS, CSV y TXT de hasta 10 MB y máximo 5,000 filas de datos. Usa la primera fila para los encabezados y una fila por lote. En CSV guarda con UTF-8 para conservar acentos y la ñ.",
  },
  {
    title: "Campo obligatorio: ID Lote",
    text: "Cada fila debe tener un identificador único, por ejemplo A-01 o L001. El encabezado recomendado es ID Lote; también se aceptan id, codigo, código, lote o clave. Filas sin ID o con código duplicado son rechazadas.",
  },
  {
    title: "Agrupar por sección o manzana",
    text: "Usa uno de estos encabezados: Fraccionamiento, Fracc, Desarrollo o Proyecto. Escribe el nombre que agrupará cada lote, por ejemplo Manzana A. Si omites la columna, todos los lotes quedan en Importados.",
  },
  {
    title: "Medidas y precios opcionales",
    text: "Encabezados aceptados: Superficie (m2), Frente (ML), Fondo (ML), Precio Contado y Precio Financiado. Los precios aceptan formato con $, comas y decimales: $400,000.50.",
  },
  {
    title: "Estado del lote",
    text: "Usa el encabezado Estado, Estatus o Status. Valores aceptados: disponible/libre/vacante → Disponible; apartado/reservado → Apartado; vendido/ocupado → Vendido. Si está vacío se usa Disponible.",
  },
  {
    title: "Servicios opcionales",
    text: "Encabezados: Agua Potable, Energía Eléctrica, Drenaje, Gas Natural, Internet/Fibra y Pavimento. Para indicar que sí tiene el servicio usa: sí, 1, true, yes, x o ✓.",
  },
  {
    title: "Vendedor Asignado",
    text: "Campo opcional. El servidor busca al usuario por nombre exacto y, si no lo encuentra, por coincidencia parcial. Si el nombre es ambiguo, el lote se importa sin vendedor y se registra una advertencia.",
  },
  {
    title: "Validación en servidor y errores",
    text: "La validación ocurre en el servidor y los lotes válidos se guardan de inmediato — el fraccionamiento ya existe para entonces. Si hay errores se muestran con el número de fila y la columna exacta para que puedas corregirlos. Columnas no reconocidas se ignoran con una advertencia.",
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
      text: "Para cargar lotes desde Excel o CSV entra primero a Carga Manual, guarda el nombre (y opcionalmente el plano), y después usa Plantilla y Subir dentro del tablero.",
    },
  ],
};
const LOT_MAP_GUIDE = {
  title: "Guía para preparar el plano",
  subtitle: "La imagen es opcional y sirve como referencia visual del fraccionamiento.",
  steps: [
    {
      title: "Nombre del fraccionamiento",
      text: "Escribe un nombre claro antes de guardar, por ejemplo Residencial Las Palmas. Este será el nombre visible en tu portafolio.",
    },
    {
      title: "Subir imagen del plano",
      text: "Selecciona una imagen JPG, PNG o WEBP. Se sube al guardar, y se mostrará como referencia mientras construyes y revisas la matriz de lotes.",
    },
    {
      title: "Guardar y continuar",
      text: "La imagen no es obligatoria. Pulsa \"Guardar y continuar\" para crear tu fraccionamiento (con o sin plano) y abrir el tablero, donde agregas los lotes a mano o desde Excel/CSV.",
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

function SectionGrid({ section, onAddLots, onRemoveSection, onEditLot, onDeleteLot }) {
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
          onClick={() => onAddLots(section.id, 1)}
          title="Añadir un lote a esta sección"
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
              className="group relative select-none rounded-[8px] border-[1.5px] transition-all hover:shadow-md"
              style={{ background: c.bg, borderColor: c.border }}
            >
              <div
                title={`${lot.code} — click para editar`}
                className="cursor-pointer px-1 py-2 text-center"
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
                {lot.price ? (
                  <div className="mt-0.5 text-[0.5rem] font-extrabold leading-none" style={{ color: c.text }}>
                    ${Number(lot.price).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                  </div>
                ) : null}
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

function LotsPage() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjectsQuery();
  const { draftProject, setDraftProject, createFracDraft, saveEditedFrac, deleteFrac, setSelectedFracId, showToast, showError } = useAppContext();

  useEffect(() => {
    setDraftProject({ mode: "selector", name: "Nuevo Fraccionamiento", mapUrl: "", sections: [], cadProcessing: false });
  }, []);

  const [sectionName, setSectionName] = useState("");
  // Se conserva como texto mientras el usuario escribe para permitir borrar
  // completamente el valor antes de capturar una nueva cantidad.
  const [sectionTotal, setSectionTotal] = useState("20");
  const [mapFileName, setMapFileName] = useState("");
  const [creatingFrac, setCreatingFrac] = useState(false);
  const [lotEditDraft, setLotEditDraft] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletedLotIds, setDeletedLotIds] = useState(new Set());
  const [showDeleteFracConfirm, setShowDeleteFracConfirm] = useState(false);
  const [deletingFrac, setDeletingFrac] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [showImportResults, setShowImportResults] = useState(false);
  useEscapeKey(() => {
    if (showDeleteFracConfirm) setShowDeleteFracConfirm(false);
    else if (lotEditDraft) setLotEditDraft(null);
  }, showDeleteFracConfirm || Boolean(lotEditDraft));
  useLandsGuide(() => setShowImportGuide(true));
  const activeGuide = draftProject.mode === "editor"
    ? LOT_EDITOR_GUIDE
    : draftProject.mode === "map-upload"
      ? LOT_MAP_GUIDE
      : LOT_SELECTOR_GUIDE;
  const [importSummary, setImportSummary] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
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
            status:          lot.status || "available",
            code:            lot.code ?? "",
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
        mapUrl:         project.mapImageUrl || "",
        cadProcessing:  false,
        sections:       Object.values(sectionMap),
        _editingFracId: project.id,
      });
    } catch (err) {
      showError(err, "Error al cargar los lotes para editar");
    } finally {
      setLoadingEditId(null);
    }
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
      showError(err, "No se pudo descargar la plantilla");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    setImportLoading(true);
    setImportSummary(null);

    try {
      // Al llegar aquí el fraccionamiento YA EXISTE — se crea en un paso explícito
      // anterior ("Guardar y continuar" en la pantalla de nombre+plano), antes de que
      // el tablero sea siquiera alcanzable. Así que importar de una vez, directo al
      // inmueble real, es correcto: no hay nada "prematuro" en guardarlo ahí.
      const fracId = draftProject._editingFracId;
      const result = await lotService.importCsv(file, { fraccionamiento_id: fracId });

      // Nada fue importado y hay errores: mostrar sin actualizar la vista
      if (result.imported === 0 && result.failed > 0) {
        setImportSummary({ fileName: file.name, imported: 0, failed: result.failed, errors: result.errors, warnings: result.warnings });
        setShowImportResults(true);
        showToast("No se importaron lotes: revisa los errores");
        return;
      }

      // Recargar todos los lotes desde el backend y reconstruir secciones
      const { items: lots } = await lotService.list({ inmueble_id: fracId, limit: 200 });
      const sectionMap = {};
      lots.forEach((lot) => {
        const sec = lot.section || "Importados";
        if (!sectionMap[sec]) sectionMap[sec] = { id: `sec_${sec}`, name: sec, lots: [] };
        sectionMap[sec].lots.push({
          id:              lot.id,
          _backendId:      lot.id,
          _orig: {
            status:          lot.status || "available",
            code:            lot.code ?? "",
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

      setDraftProject((prev) => ({
        ...prev,
        sections: Object.values(sectionMap),
        _editingFracId: fracId,
      }));

      setImportSummary({
        fileName: file.name,
        imported: result.imported,
        updated: result.updated ?? 0,
        failed: result.failed ?? 0,
        errors: result.errors || [],
        warnings: result.warnings || [],
      });

      showToast(`${result.imported} lotes importados${result.failed ? ` · ${result.failed} con errores` : ""}`);
      if (result.failed > 0 || (result.warnings?.length ?? 0) > 0) setShowImportResults(true);

    } catch (err) {
      const msg = parseApiError(err, "Error al importar el archivo. Descarga la plantilla y verifica el formato.").message;
      setImportSummary({ fileName: file?.name ?? null, imported: 0, failed: 0, errors: [{ message: msg }], warnings: [] });
      setShowImportResults(true);
      showError(err, "Error al importar el archivo. Descarga la plantilla y verifica el formato.");
    } finally {
      setImportLoading(false);
    }
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
    const cleanName = sectionName.trim();
    const cleanTotal = String(sectionTotal).trim();

    if (!cleanName) {
      showToast("Escribe el nombre de la sección o manzana para continuar", "warning");
      return;
    }
    if (!/^\d+$/.test(cleanTotal)) {
      showToast("Escribe una cantidad válida de lotes", "warning");
      return;
    }

    const total = Number(cleanTotal);
    if (!Number.isSafeInteger(total) || total < 1 || total > 5000) {
      showToast("Escribe una cantidad de lotes entre 1 y 5,000", "warning");
      return;
    }
    setDraftProject((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        {
          id: `section_${Date.now()}`,
          name: cleanName,
          lots: createLots(cleanName, total)
        }
      ]
    }));
    setSectionName("");
    setSectionTotal("20");
    showToast(`${cleanName} agregada · ${total} lote${total === 1 ? "" : "s"}`);
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
    const sec = draftProject.sections.find((s) => s.id === sectionId);
    if (sec) {
      const backendIds = sec.lots.filter((l) => l._backendId).map((l) => l._backendId);
      if (backendIds.length) setDeletedLotIds((prev) => new Set([...prev, ...backendIds]));
    }
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.filter((sec) => sec.id !== sectionId)
    }));
  };

  const deleteLotFromSection = (sectionId, lotId) => {
    const sec = draftProject.sections.find((s) => s.id === sectionId);
    const lot = sec?.lots.find((l) => l.id === lotId);
    if (lot?._backendId) setDeletedLotIds((prev) => new Set([...prev, lot._backendId]));
    setDraftProject((previous) => ({
      ...previous,
      sections: previous.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, lots: s.lots.filter((l) => l.id !== lotId) }
      ),
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

  // El usuario ya importó por archivo: el flujo elegido fue Excel/CSV, así que el
  // builder manual de secciones se deshabilita. Para agregar un lote olvidado se usa
  // el "+" de cada sección (que ahora agrega 1).
  const importedByFile = (importSummary?.imported ?? 0) > 0;

  const updateMap = async (file) => {
    if (!isSupportedMapImage(file)) {
      showToast("El plano debe ser una imagen JPG, PNG, WEBP, HEIC o HEIF. Excel y CSV solo van en Llenar con Excel o CSV.", "warning");
      return false;
    }
    try {
      const processed = await prepareMapImage(file);
      setMapFileName(file.name);
      setDraftProject((previous) => ({
        ...previous,
        mapUrl: processed.dataUrl,
        name: previous.name || "Nuevo Fraccionamiento"
      }));
      if (processed.converted) {
        showToast("Plano HEIC/HEIF convertido a un formato compatible");
      } else if (processed.cropped) {
        showToast("Plano ajustado automáticamente para enfocar el lote");
      } else if (processed.resized) {
        showToast("Plano optimizado para cargarlo correctamente");
      }
      return true;
    } catch (error) {
      showToast(`${error.message}. Intenta exportarla como JPG o PNG.`, "warning");
      return false;
    }
  };

  const totalDraftLots = draftProject.sections.reduce((sum, section) => sum + section.lots.length, 0);
  // El fraccionamiento ya existe siempre en este punto (se crea explícitamente en
  // "Guardar y continuar", antes de que el tablero sea alcanzable) — esto es solo para
  // la ETIQUETA del botón: si todavía no hay ni un lote guardado, se siente más como
  // "guardar lotes" que como "guardar cambios" a algo que ya tenía contenido.
  const hasSavedLots = draftProject.sections.some((section) => section.lots.some((lot) => lot._backendId));

  // ── EDITOR: full-height split layout ──────────────────────────────
  if (draftProject.mode === "editor") {
    return (
      <>
      <div
        className="lots-editor-shell"
      >
        {/* Top bar */}
        <div className="lots-editor-topbar">
          <div className="flex items-center gap-2">
            <button
              className="lots-editor-btn"
              onClick={() => { setDraftProject((p) => ({ ...p, _editingFracId: null })); navigate("/fraccionamientos"); }}
            >
              Cancelar
            </button>
            <span className="lots-editor-state">
              <span className="lots-editor-dot warn" />
              {hasSavedLots ? `Editando: ${draftProject.name}` : `Guardado: ${draftProject.name} — agrega tus lotes`}
            </span>
          </div>
          <div className="flex-1" />
          <div className="lots-editor-legend" data-tour="frac-leyenda">
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
            className="lots-editor-btn"
            style={{ color: "#C0392B", borderColor: "#fca5a5" }}
            onClick={() => setShowDeleteFracConfirm(true)}
          >
            Eliminar
          </button>
          <button
            className="lots-editor-btn lots-editor-primary"
            data-tour="frac-guardar"
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                if (deletedLotIds.size > 0) {
                  await Promise.all([...deletedLotIds].map((id) => lotService.delete(id)));
                  setDeletedLotIds(new Set());
                }
                await saveEditedFrac(draftProject);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!draftProject.name?.trim() || saving}
          >
            {saving ? "Guardando..." : hasSavedLots ? "Guardar cambios" : "Guardar lotes"}
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
              accept={MAP_IMAGE_ACCEPT}
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await updateMap(file);
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
              <div className="lots-section-form" data-tour="frac-nombre">
                <div className="lots-section-name" style={{ flex: 1 }}>
                  <div className="lots-builder-label">Nombre del fraccionamiento</div>
                  <input
                    value={draftProject.name}
                    onChange={(event) => setDraftProject((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder="Nombre del fraccionamiento"
                    className="lots-builder-input"
                  />
                </div>
              </div>
              <div className="lots-section-form" data-tour="frac-secciones" style={importedByFile ? { opacity: 0.5 } : undefined}>
                <div className="lots-section-name">
                  <div className="lots-builder-label">
                    Nombre de sección *
                  </div>
                  <input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addSection()}
                    placeholder="Ej: Manzana A, Frente Norte..."
                    required
                    disabled={importedByFile}
                    title={importedByFile ? "Deshabilitado: ya importaste los lotes por archivo" : undefined}
                    className="lots-builder-input"
                  />
                </div>
                <div className="lots-section-total">
                  <div className="lots-builder-label">
                    N° de lotes
                  </div>
                  <input
                    type="text"
                    value={sectionTotal}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "");
                      setSectionTotal(digitsOnly);
                    }}
                    onKeyDown={(event) => event.key === "Enter" && addSection()}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    aria-label="Número de lotes"
                    disabled={importedByFile}
                    className="lots-builder-input center"
                  />
                </div>
                <button
                  type="button"
                  data-tour="frac-agregar"
                  onClick={addSection}
                  disabled={importedByFile}
                  className="lots-add-section"
                  style={importedByFile ? { cursor: "not-allowed" } : undefined}
                >
                  Agregar
                </button>
              </div>
              {importedByFile && (
                <div className="lots-import-hint">
                  Lotes importados por archivo. Para agregar uno olvidado, usa el <b>+</b> de la sección abajo.
                </div>
              )}
              <div className="lots-excel-row" data-tour="frac-excel">
                <div>
                  <span className="lots-excel-title">Llenar con Excel o CSV</span>
                  <span className="lots-excel-sub">
                    {importLoading
                      ? "Validando e importando..."
                      : importSummary
                        ? `${importSummary.imported} importados${importSummary.failed ? ` · ${importSummary.failed} con errores` : ""}${importSummary.warnings?.length ? ` · ${importSummary.warnings.length} advertencias` : ""}`
                        : "Importa lotes desde XLSX, XLS o CSV"}
                  </span>
                </div>
                <button className="lots-excel-upload" onClick={downloadImportTemplate} disabled={downloadingTemplate}>
                  {downloadingTemplate ? "Descargando..." : "Plantilla"}
                </button>
                <button
                  className="lots-excel-upload"
                  onClick={() => setShowFormatGuide(true)}
                  title="Ver campos y formato del archivo"
                >
                  Ver formato
                </button>
                <button
                  className="lots-excel-upload"
                  onClick={() => excelInputRef.current?.click()}
                  disabled={importLoading}
                >
                  {importLoading ? "Importando..." : "Subir"}
                </button>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
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
                <div className="space-y-5" data-tour="frac-matriz">
                  {draftProject.sections.map((section) => (
                    <SectionGrid
                      key={section.id}
                      section={section}
                      onAddLots={addLotsToSection}
                      onRemoveSection={removeSection}
                      onEditLot={openEditLot}
                      onDeleteLot={deleteLotFromSection}
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

                {/* Imagen del plano */}
                <div className="lot-edit-sec">Imagen del plano</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  {draftProject.mapUrl ? (
                    <img
                      src={draftProject.mapUrl}
                      alt="Plano"
                      style={{ width: 90, height: 64, objectFit: "cover", borderRadius: 8, border: "1.5px solid #DCDAD2", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 90, height: 64, borderRadius: 8, border: "1.5px dashed #DCDAD2", background: "#F1EEE6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.6rem", color: "#83867C", textAlign: "center", lineHeight: 1.3 }}>Sin imagen</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.72rem", color: "#83867C", marginBottom: 6 }}>
                      {draftProject.mapUrl ? "Imagen del plano cargada" : "No hay imagen de plano"}
                    </div>
                    <button
                      className="lot-edit-ghost"
                      style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                      onClick={() => changeImageRef.current?.click()}
                    >
                      {draftProject.mapUrl ? "Cambiar imagen" : "Subir imagen"}
                    </button>
                  </div>
                </div>

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
                <button
                  className="lot-edit-ghost"
                  style={{ color: "#C0392B", borderColor: "#fca5a5", marginRight: "auto" }}
                  onClick={() => {
                    deleteLotFromSection(d.sectionId, d.id);
                    setLotEditDraft(null);
                  }}
                >
                  Eliminar lote
                </button>
                <button className="lot-edit-primary" onClick={saveLotEdit}>Guardar</button>
                <button className="lot-edit-ghost" onClick={() => setLotEditDraft(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      <LotImportFormatModal open={showFormatGuide} onClose={() => setShowFormatGuide(false)} />
      <ImportResultsModal
        open={showImportResults}
        onClose={() => setShowImportResults(false)}
        summary={importSummary}
      />
      <GuideModal
        open={showImportGuide}
        onClose={() => setShowImportGuide(false)}
        title={activeGuide.title}
        subtitle={activeGuide.subtitle}
        steps={activeGuide.steps}
      />

      {showDeleteFracConfirm && (
        <div className="lot-edit-overlay" onClick={() => setShowDeleteFracConfirm(false)}>
          <div className="lot-edit-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="lot-edit-head">
              <div className="lot-edit-badge" style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }}>!</div>
              <div>
                <div className="lot-edit-title">Eliminar fraccionamiento</div>
                <div className="lot-edit-sub">{draftProject.name}</div>
              </div>
              <button className="lot-edit-close" onClick={() => setShowDeleteFracConfirm(false)}>×</button>
            </div>
            <div className="lot-edit-body" style={{ gap: 12 }}>
              <p style={{ fontSize: "0.84rem", color: "#43453F", lineHeight: 1.6 }}>
                Esta acción eliminará el fraccionamiento <strong>{draftProject.name}</strong> y todos sus lotes de forma permanente. No se puede deshacer.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="lot-edit-ghost" onClick={() => setShowDeleteFracConfirm(false)}>Cancelar</button>
                <button
                  className="lot-edit-primary"
                  style={{ background: "#C0392B", borderColor: "#991b1b" }}
                  disabled={deletingFrac}
                  onClick={async () => {
                    setDeletingFrac(true);
                    try {
                      await deleteFrac(draftProject._editingFracId);
                      setShowDeleteFracConfirm(false);
                      navigate("/fraccionamientos");
                    } finally {
                      setDeletingFrac(false);
                    }
                  }}
                >
                  {deletingFrac ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
                data-tour="frac-carga-manual"
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
              </div>

              {/* ── Carga CAD ── */}
              <div
                className="relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border-2 border-[#DCDAD2] bg-[#FBFAF6] p-7 text-center transition-all duration-200 hover:-translate-y-[3px] hover:border-[#4A6FA5] hover:shadow-[0_8px_24px_rgba(74,111,165,.15)]"
                role="button"
                tabIndex={0}
                aria-label="Importar CAD, próximamente"
                onClick={() => showToast("La importación de archivos CAD estará disponible próximamente.", "info")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showToast("La importación de archivos CAD estará disponible próximamente.", "info");
                  }
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
                  Próximamente
                </button>
              </div>

            </div>
          </div>
        </section>
      ) : (
        /* map-upload step */
        <section className="lot-upload-shell" data-tour="frac-inicio">
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
                style={{ width: "100%", borderRadius: 8, border: "1.5px solid #DCDAD2", background: "white", padding: "8px 12px", fontSize: ".84rem", color: "#1E3D2B", outline: "none", fontFamily: "var(--font-body)" }}
                placeholder="Ej. Residencial Las Palmas"
                data-tour="frac-nombre-inicial"
                value={draftProject.name === "Nuevo Fraccionamiento" ? "" : draftProject.name}
                onChange={(e) => setDraftProject((prev) => ({ ...prev, name: e.target.value || "Nuevo Fraccionamiento" }))}
              />
            </div>
            <label className="lot-upload-drop" data-tour="frac-plano">
              <div className="lot-upload-code">IMG</div>
              <div>
                <div className="lot-upload-drop-title">Seleccionar imagen del plano</div>
                <div className="lot-upload-drop-sub">JPG, PNG, WEBP, HEIC o HEIF</div>
              </div>
              <div className="lot-upload-formats">
                {["JPG", "PNG", "WEBP", "HEIC", "HEIF"].map((ext) => (
                  <span key={ext}>{ext}</span>
                ))}
              </div>
              <div className="lot-upload-cta">Buscar archivo</div>
              <input
                type="file"
                accept={MAP_IMAGE_ACCEPT}
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  // Solo se PREVISUALIZA (queda en draftProject.mapUrl como data URL) — el
                  // clic en "Guardar y continuar" de abajo es lo único que crea algo de
                  // verdad en el servidor.
                  if (file) await updateMap(file);
                  event.target.value = "";
                }}
              />
            </label>
            {mapFileName && draftProject.mapUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <img
                  src={draftProject.mapUrl}
                  alt="Vista previa del plano"
                  style={{ width: 90, height: 64, objectFit: "cover", borderRadius: 8, border: "1.5px solid #DCDAD2", flexShrink: 0 }}
                />
                <div className="lots-editor-file">
                  <span>MAP</span>{mapFileName} — listo, falta guardar
                </div>
              </div>
            )}
            <div className="lot-upload-foot">
              <div>
                <span>{mapFileName ? "Nombre y plano listos" : "Sin plano"}</span>
                <p>
                  {mapFileName
                    ? "Se guardan al pulsar el botón — después agregas los lotes."
                    : "También puedes crear secciones y lotes manualmente, sin plano."}
                </p>
              </div>
              <button
                className="lot-upload-secondary"
                disabled={creatingFrac}
                onClick={async () => {
                  if (creatingFrac) return;
                  setCreatingFrac(true);
                  try {
                    await createFracDraft({ name: draftProject.name, mapUrl: draftProject.mapUrl });
                  } finally {
                    setCreatingFrac(false);
                  }
                }}
              >
                {creatingFrac ? "Guardando..." : "Guardar y continuar"}
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
        steps={activeGuide.steps}
      />
    </div>
  );
}

export default LotsPage;
