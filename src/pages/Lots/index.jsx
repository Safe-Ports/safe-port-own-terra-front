import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAppContext } from "@/context/AppContext";
import { useProjectsQuery } from "@/hooks/queries/useAppQueries";
import { lotService } from "@/services/lotService";
import { compactCurrency, currency } from "@/services/formatters";

const LOT_COLORS = {
  available: { bg: "#dcfce7", border: "#86efac", text: "#15803d" },
  sold:      { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  reserved:  { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
};
const STATUS_CYCLE = { available: "sold", sold: "reserved", reserved: "available" };

function createLots(sectionName, total) {
  return Array.from({ length: total }, (_, index) => ({
    id: `${sectionName}_${Date.now()}_${index}`,
    code: `${sectionName.slice(0, 1).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
    status: index % 7 === 0 ? "reserved" : index % 5 === 0 ? "sold" : "available",
    area: 140 + index * 4,
    price: 330000 + index * 12000
  }));
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
  const [sectionName, setSectionName] = useState("");
  const [sectionTotal, setSectionTotal] = useState(20);
  const [mapFileName, setMapFileName] = useState("");
  const [lotEditDraft, setLotEditDraft] = useState(null); // null | { sectionId, ...lot }
  const [loadingEditId, setLoadingEditId] = useState(null);
  const changeImageRef = useRef(null);
  const excelInputRef = useRef(null);

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
    } catch {
      showToast("Error al cargar los lotes para editar");
    } finally {
      setLoadingEditId(null);
    }
  };

  const STATUS_MAP = {
    disponible: "available", libre: "available", available: "available", vacante: "available",
    vendido: "sold", sold: "sold", ocupado: "sold",
    apartado: "reserved", apartada: "reserved", reservado: "reserved", reserved: "reserved",
  };

  const handleExcelFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rows.length) { showToast("El archivo no tiene datos"); return; }

        const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

        const findCol = (row, aliases) => {
          const key = Object.keys(row).find((k) => aliases.some((a) => norm(k) === norm(a)));
          return key ? String(row[key]).trim() : "";
        };

        const grouped = {};
        rows.forEach((row, i) => {
          const code = findCol(row, ["ID Lote", "id", "codigo", "lote", "clave"]) || `L-${String(i + 1).padStart(2, "0")}`;
          const secName = findCol(row, ["Seccion", "sección", "manzana", "bloque", "section"]) || "Importados";
          const statusRaw = norm(findCol(row, ["Estado", "estatus", "status"]));
          const status = STATUS_MAP[statusRaw] || "available";
          const area = Number(findCol(row, ["Superficie (m2)", "superficie", "area", "m2"])) || 0;
          const price = Number(findCol(row, ["Precio Contado", "precio contado", "contado", "precio"])) || 0;
          const priceFinanciado = Number(findCol(row, ["Precio Financiado", "financiado"])) || 0;
          const frente = Number(findCol(row, ["Frente (ML)", "frente"])) || 0;
          const fondo = Number(findCol(row, ["Fondo (ML)", "fondo"])) || 0;
          const servicios = {
            agua: !!findCol(row, ["Agua Potable", "agua"]),
            luz: !!findCol(row, ["Energia Electrica", "luz", "electricidad"]),
            drenaje: !!findCol(row, ["Drenaje"]),
            gas: !!findCol(row, ["Gas Natural", "gas"]),
            internet: !!findCol(row, ["Internet/Fibra", "internet"]),
            pavimento: !!findCol(row, ["Pavimento"]),
          };
          if (!grouped[secName]) grouped[secName] = [];
          grouped[secName].push({ id: `xl_${Date.now()}_${i}`, code, status, area, price, priceFinanciado, frente, fondo, servicios });
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
        showToast(`${total} lotes importados desde Excel`);
      } catch {
        showToast("Error al leer el archivo. Usa el formato de plantilla.");
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

  const loadDemo = () => {
    setDraftProject({
      mode: "editor",
      name: "Residencial Terracota",
      mapUrl: "",
      cadProcessing: false,
      sections: [
        { id: "sec_a", name: "Manzana A", lots: createLots("A", 10) },
        { id: "sec_b", name: "Manzana B", lots: createLots("B", 8) }
      ]
    });
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
          area: 140,
          price: 330000
        }));
        return { ...sec, lots: [...sec.lots, ...newLots] };
      })
    }));
  };

  const updateMap = (file) => {
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
  };

  const totalDraftLots = draftProject.sections.reduce((sum, section) => sum + section.lots.length, 0);

  // ── EDITOR: full-height split layout ──────────────────────────────
  if (draftProject.mode === "editor") {
    return (
      <>
      <div
        className="flex flex-col overflow-hidden rounded-[12px] border border-[#DCDAD2]"
        style={{ height: "calc(100vh - 8rem)" }}
      >
        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b-[1.5px] border-[#DCDAD2] bg-[#F1EEE6] px-4 py-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                className="rounded-[7px] border-[1.5px] border-[#DCDAD2] bg-[#FBFAF6] px-[11px] py-[5px] text-[0.74rem] font-bold text-[#83867C]"
                onClick={() => { setDraftProject((p) => ({ ...p, _editingFracId: null })); navigate("/fraccionamientos"); }}
              >
                ← Cancelar
              </button>
              <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-[0.68rem] font-bold text-[#92400e]">
                ✏ Editando: {draftProject.name}
              </span>
            </div>
          ) : (
            <>
              <button
                className="rounded-[7px] border-[1.5px] border-[#DCDAD2] bg-[#FBFAF6] px-[11px] py-[5px] text-[0.74rem] font-bold text-[#83867C]"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "map-upload" }))}
              >
                ← Cambiar mapa
              </button>
              <div className="h-[18px] w-px bg-[#DCDAD2]" />
              {mapFileName && (
                <div className="text-[0.75rem] font-bold text-[#355E3B]">📄 {mapFileName}</div>
              )}
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-[9px]">
            <span className="flex items-center gap-1 text-[0.67rem] text-[#83867C]">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-[#86efac] bg-[#dcfce7]" />
              Disponible
            </span>
            <span className="flex items-center gap-1 text-[0.67rem] text-[#83867C]">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-[#fca5a5] bg-[#fee2e2]" />
              Vendido
            </span>
            <span className="flex items-center gap-1 text-[0.67rem] text-[#83867C]">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-[#fcd34d] bg-[#fef3c7]" />
              Apartado
            </span>
          </div>
          <button
            className="rounded-[8px] bg-[#355E3B] px-4 py-[7px] text-[0.76rem] font-bold text-white disabled:opacity-40"
            onClick={() => isEditing ? saveEditedFrac(draftProject) : saveFrac(draftProject)}
            disabled={!draftProject.sections.length}
          >
            {isEditing ? "✓ Guardar cambios" : "🏘️ Crear Fraccionamiento"}
          </button>
        </div>

        {/* Split */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: map */}
          <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#1a1a2e]">
            {draftProject.mapUrl ? (
              <img
                src={draftProject.mapUrl}
                alt="Plano"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2.5 p-5 text-center">
                <div className="text-[3.5rem] opacity-30">🗺️</div>
                <div className="text-[0.85rem] leading-relaxed text-white/20">
                  Sin imagen de plano<br />
                  <span className="text-[0.72rem] opacity-60">Usa el botón inferior para subir una</span>
                </div>
                <button
                  className="mt-1 rounded-[8px] border-[1.5px] border-white/20 bg-white/10 px-4 py-[7px] text-[0.74rem] font-bold text-white/60"
                  onClick={() => changeImageRef.current?.click()}
                >
                  📂 Subir imagen
                </button>
              </div>
            )}
            <button
              className="absolute bottom-3 right-3 rounded-[8px] border-[1.5px] border-white/20 bg-white/12 px-[13px] py-[6px] text-[0.72rem] font-bold text-white backdrop-blur-sm"
              onClick={() => changeImageRef.current?.click()}
            >
              🖼 Cambiar imagen
            </button>
            <input
              ref={changeImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) updateMap(file);
              }}
            />
          </div>

          {/* Divider */}
          <div className="w-1 flex-shrink-0 bg-[#DCDAD2]" />

          {/* Right: builder panel */}
          <div className="relative flex w-[420px] min-h-0 flex-shrink-0 flex-col overflow-hidden bg-[#FBFAF6]">
            {/* Panel header */}
            <div className="flex-shrink-0 border-b-[1.5px] border-[#DCDAD2] bg-[#F1EEE6] px-4 py-3">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-[0.86rem] font-extrabold text-[#1E3D2B]">Tablero de Lotes</div>
                <div className="text-[0.72rem] text-[#83867C]">
                  {totalDraftLots} lotes · {draftProject.sections.length} sec
                </div>
              </div>
              <div className="mb-[9px] flex items-end gap-[7px]">
                <div className="flex-1">
                  <div className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">
                    Nombre de sección
                  </div>
                  <input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addSection()}
                    placeholder="Ej: Manzana A, Frente Norte..."
                    className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-[#FBFAF6] px-2.5 py-[7px] text-[0.78rem] text-[#1E3D2B] outline-none"
                  />
                </div>
                <div className="w-20">
                  <div className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">
                    N° de lotes
                  </div>
                  <input
                    type="number"
                    value={sectionTotal}
                    onChange={(event) => setSectionTotal(Number(event.target.value))}
                    className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-[#FBFAF6] px-1.5 py-[7px] text-center text-[0.78rem] text-[#1E3D2B] outline-none"
                  />
                </div>
                <button
                  onClick={addSection}
                  className="flex-shrink-0 rounded-[8px] bg-[#355E3B] px-[13px] py-[7px] text-[0.78rem] font-bold text-white"
                >
                  + Sección
                </button>
              </div>
              <div className="flex items-center gap-[7px] rounded-[9px] border-[1.5px] border-[#DCDAD2] bg-[#FBFAF6] px-2.5 py-2">
                <span className="text-[0.74rem] font-bold text-[#43453F]">📊 Llenar con Excel</span>
                <span className="text-[0.72rem] text-[#83867C]">— importa lotes desde archivo</span>
                <button
                  className="ml-auto flex-shrink-0 rounded-[7px] bg-[#355E3B] px-[13px] py-[6px] text-[0.74rem] font-bold text-white"
                  onClick={() => excelInputRef.current?.click()}
                >
                  📋 Subir
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
                <div className="flex h-full flex-col items-center justify-center gap-2.5 p-5 text-center text-[#83867C]">
                  <div className="text-[2.5rem] opacity-20">🏗️</div>
                  <div className="text-[0.82rem] leading-relaxed">
                    Añade una sección para empezar<br />a construir la matriz de lotes
                  </div>
                  <button
                    onClick={loadDemo}
                    className="mt-2 rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-[#F1EEE6] px-[18px] py-2 text-[0.74rem] font-bold text-[#43453F]"
                  >
                    ⚡ Cargar ejemplo rápido
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {draftProject.sections.map((section) => (
                    <div key={section.id}>
                      {/* Section header */}
                      <div className="mb-2.5 flex items-center gap-2">
                        <div className="text-[0.7rem] font-extrabold uppercase tracking-[0.5px] text-[#43453F]">
                          {section.name}
                          <span className="ml-1 font-normal opacity-55 text-[0.62rem]">{section.lots.length} lotes</span>
                        </div>
                        <div className="h-px flex-1 bg-[#DCDAD2]" />
                        <button
                          onClick={() => addLotsToSection(section.id, 10)}
                          title="Añadir 10 lotes"
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-[#DCDAD2] bg-[#F1EEE6] text-[0.8rem] font-black text-[#355E3B]"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          title="Eliminar sección"
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border border-[#DCDAD2] bg-[#F1EEE6] text-[0.8rem] font-black text-[#C0392B]"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Lot grid */}
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                        {section.lots.map((lot) => {
                          const c = LOT_COLORS[lot.status] || LOT_COLORS.available;
                          return (
                            <div
                              key={lot.id}
                              onClick={() => cycleLotStatus(section.id, lot.id)}
                              title={`${lot.code} — ${lot.status}`}
                              className="relative cursor-pointer select-none rounded-[8px] border-[1.5px] px-1 py-2 text-center transition-all"
                              style={{ background: c.bg, borderColor: c.border }}
                            >
                              <div className="text-[0.78rem] font-extrabold leading-none" style={{ color: c.text }}>
                                {lot.code}
                              </div>
                              <div className="mt-0.5 text-[0.56rem] opacity-70" style={{ color: c.text }}>
                                {lot.area ? `${lot.area}m²` : lot.status === "available" ? "Libre" : lot.status === "sold" ? "Vendido" : "Apartado"}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditLot(section.id, lot.id); }}
                                className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded-[2px] bg-black/10 text-[0.45rem] text-black/35"
                              >
                                ✏
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Lot edit modal — fixed, centered over viewport */}
      {lotEditDraft && (() => {
        const d = lotEditDraft;
        const setField = (key, val) => setLotEditDraft((prev) => ({ ...prev, [key]: val }));
        const setService = (key, val) => setLotEditDraft((prev) => ({ ...prev, servicios: { ...prev.servicios, [key]: val } }));
        const SERVICES = [
          { key: "agua", label: "Agua potable", icon: "💧" },
          { key: "luz", label: "Energía eléctrica", icon: "⚡" },
          { key: "drenaje", label: "Drenaje", icon: "🔧" },
          { key: "gas", label: "Gas natural", icon: "🔥" },
          { key: "internet", label: "Internet/Fibra", icon: "📡" },
          { key: "pavimento", label: "Pavimento", icon: "🏗️" },
        ];
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
            onClick={() => setLotEditDraft(null)}
          >
            <div
              className="flex max-h-[90vh] w-[520px] max-w-[95vw] flex-col overflow-hidden rounded-[18px] shadow-[0_24px_64px_rgba(0,0,0,.4)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex flex-shrink-0 items-center justify-between bg-[#1E3D2B] px-5 py-3.5">
                <div className="font-bold text-[0.95rem] text-white">Editar — {d.code}</div>
                <button
                  onClick={() => setLotEditDraft(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/10 text-[0.85rem] text-white"
                >✕</button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto bg-[#F4F1EA] p-5 space-y-5">

                {/* IDENTIFICACIÓN */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Identificación</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">Código / ID Lote</div>
                      <input className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none" value={d.code} onChange={(e) => setField("code", e.target.value)} />
                    </div>
                    <div>
                      <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">Fraccionamiento</div>
                      <input className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white/60 px-3 py-2 text-[0.84rem] text-[#83867C] outline-none" value={draftProject.name} readOnly />
                    </div>
                  </div>
                </div>

                {/* ESTADO */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Estado</div>
                  <div className="flex gap-2">
                    {[
                      { value: "available", label: "Disponible", dot: "#355E3B" },
                      { value: "reserved", label: "Apartado", dot: "#B07820" },
                      { value: "sold", label: "Vendido", dot: "#C0392B" },
                    ].map(({ value, label, dot }) => {
                      const c = LOT_COLORS[value];
                      const active = d.status === value;
                      return (
                        <button key={value} onClick={() => setField("status", value)} className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] py-2 text-[0.78rem] font-bold transition-all" style={{ background: active ? c.bg : "white", borderColor: active ? c.border : "#DCDAD2", color: active ? c.text : "#83867C" }}>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MEDIDAS */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Medidas</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ key: "frente", label: "Frente (ML)" }, { key: "fondo", label: "Fondo (ML)" }, { key: "area", label: "Superficie (m²)" }].map(({ key, label }) => (
                      <div key={key}>
                        <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">{label}</div>
                        <input type="number" className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none" value={d[key]} onChange={(e) => setField(key, Number(e.target.value))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FINANCIERO */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Financiero</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">Precio Contado ($)</div>
                      <input type="number" className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none" value={d.price} onChange={(e) => setField("price", Number(e.target.value))} />
                    </div>
                    <div>
                      <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">Precio Financiado ($)</div>
                      <input type="number" className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none" value={d.priceFinanciado} onChange={(e) => setField("priceFinanciado", Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* GESTIÓN */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Gestión</div>
                  <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.5px] text-[#83867C]">Vendedor Asignado</div>
                  <input className="w-full rounded-[8px] border-[1.5px] border-[#DCDAD2] bg-white px-3 py-2 text-[0.84rem] text-[#1E3D2B] outline-none" placeholder="Nombre del vendedor" value={d.vendedor} onChange={(e) => setField("vendedor", e.target.value)} />
                </div>

                {/* SERVICIOS */}
                <div>
                  <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.8px] text-[#83867C]">Servicios Disponibles</div>
                  <div className="space-y-1.5">
                    {SERVICES.map(({ key, label, icon }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[#DCDAD2] bg-white px-3 py-2.5">
                        <span className="text-[1rem]">{icon}</span>
                        <span className="flex-1 text-[0.82rem] text-[#1E3D2B]">{label}</span>
                        <input type="checkbox" className="h-4 w-4 accent-[#355E3B]" checked={!!d.servicios[key]} onChange={(e) => setService(key, e.target.checked)} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-shrink-0 gap-3 border-t border-[#DCDAD2] bg-[#F4F1EA] px-5 py-3">
                <button onClick={saveLotEdit} className="flex-1 rounded-[10px] bg-[#355E3B] py-2.5 text-[0.84rem] font-bold text-white">
                  ✓ Guardar
                </button>
                <button onClick={() => setLotEditDraft(null)} className="rounded-[10px] border-[1.5px] border-[#DCDAD2] bg-white px-6 py-2.5 text-[0.84rem] font-semibold text-[#43453F]">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
          <button
            className="rounded-2xl bg-[#E9E5DB] px-4 py-3 text-sm font-semibold text-[#1E3D2B]"
            onClick={loadDemo}
          >
            Cargar demo
          </button>
          <button
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => setDraftProject((previous) => ({ ...previous, mode: "map-upload" }))}
          >
            Nuevo proyecto
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#83867C]">Portafolio</h2>
          <span className="text-sm font-semibold text-[#1E3D2B]">
            {projects.reduce((sum, item) => sum + (item.lots?.length || 0), 0)} lotes
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {projects.map((project) => (
            <article
              key={project.id}
              className="min-w-[290px] rounded-[28px] border border-[#DCDAD2] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-['Playfair_Display'] text-xl text-[#1E3D2B]">{project.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#83867C]">
                    {project.lots?.length ?? 0} propiedades
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
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#83867C]">Valor</div>
                  <div className="mt-2 text-lg font-bold text-[#1E3D2B]">{compactCurrency(project.inventoryValue)}</div>
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
                  className="flex-1 rounded-[10px] border-[1.5px] border-[#355E3B] bg-[#355E3B] px-3 py-[7px] text-[0.76rem] font-bold text-white transition-colors hover:bg-[#21643F] disabled:opacity-60"
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
              <div
                className="relative cursor-pointer overflow-hidden rounded-[16px] border-2 border-[#DCDAD2] bg-[#FBFAF6] p-7 text-center transition-all duration-200 hover:-translate-y-[3px] hover:border-[#355E3B] hover:shadow-[0_8px_24px_rgba(45,90,71,.15)]"
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
                <button className="pointer-events-none w-full rounded-[9px] bg-[#355E3B] px-4 py-2.5 text-[0.8rem] font-bold text-white">
                  Abrir editor →
                </button>
              </div>

              <div
                className="relative cursor-pointer overflow-hidden rounded-[16px] border-2 border-[#DCDAD2] bg-[#FBFAF6] p-7 text-center transition-all duration-200 hover:-translate-y-[3px] hover:border-[#1E3D2B] hover:shadow-[0_8px_24px_rgba(27,47,69,.15)]"
                onClick={() => {}}
              >
                <div className="absolute right-3 top-3 rounded-[8px] bg-[#1E3D2B] px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.5px] text-white">
                  Nuevo
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E3D2B]" />
                <div className="mx-auto mb-3 flex h-[62px] w-[62px] items-center justify-center rounded-[15px] bg-[rgba(27,47,69,0.08)] text-[1.8rem]">
                  📐
                </div>
                <div className="mb-2 font-['Playfair_Display'] text-[1.05rem] text-[#1E3D2B]">Carga Automática CAD</div>
                <div className="mb-5 text-[0.76rem] leading-relaxed text-[#83867C]">
                  Sube archivos CAD (.dwg, .dxf, .shp, .kml) y el sistema detecta y genera los lotes automáticamente con sus coordenadas reales.
                </div>
                <button className="pointer-events-none w-full rounded-[9px] bg-[#1E3D2B] px-4 py-2.5 text-[0.8rem] font-bold text-white">
                  Subir archivo CAD →
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* map-upload step */
        <section className="rounded-[28px] border border-[#DCDAD2] bg-[#F4F1EA] p-8 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="mx-auto max-w-[500px] text-center">
            <div className="mb-6 flex justify-end">
              <button
                className="flex items-center gap-1.5 rounded-[8px] border border-[#DCDAD2] bg-[#FBFAF6] px-3 py-1.5 text-[0.74rem] font-bold text-[#83867C]"
                onClick={() => setDraftProject((previous) => ({ ...previous, mode: "selector" }))}
              >
                ← Cambiar modo
              </button>
            </div>
            <div className="mb-3 text-[2.8rem]">🗺️</div>
            <h2 className="mb-2 font-['Playfair_Display'] text-[1.45rem] text-[#1E3D2B]">
              Sube el plano del fraccionamiento
            </h2>
            <p className="mb-6 text-[0.82rem] leading-relaxed text-[#83867C]">
              Carga la imagen de tu plano. Despues podras crear los lotes manualmente en el tablero.
            </p>
            <label className="mb-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-[2.5px] border-dashed border-[#DCDAD2] bg-[#FBFAF6] px-6 py-9 transition-all hover:border-[#355E3B] hover:bg-[#D4EAE0]">
              <div className="text-[2rem]">📂</div>
              <div className="text-[0.9rem] font-bold text-[#1E3D2B]">Arrastra tu imagen aqui</div>
              <div className="text-[0.75rem] text-[#83867C]">o haz clic para buscar el archivo</div>
              <div className="flex gap-1.5">
                {[".JPG", ".PNG", ".WEBP"].map((ext) => (
                  <span
                    key={ext}
                    className="rounded-[6px] border border-[#DCDAD2] bg-[#F1EEE6] px-2.5 py-0.5 text-[0.65rem] font-bold text-[#43453F]"
                  >
                    {ext}
                  </span>
                ))}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    updateMap(file);
                    setDraftProject((previous) => ({ ...previous, mode: "editor" }));
                  }
                }}
              />
            </label>
            <button
              className="rounded-[9px] border border-[#DCDAD2] bg-transparent px-6 py-2.5 text-[0.77rem] font-semibold text-[#83867C]"
              onClick={() => setDraftProject((previous) => ({ ...previous, mode: "editor" }))}
            >
              Continuar sin imagen
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default LotsPage;
