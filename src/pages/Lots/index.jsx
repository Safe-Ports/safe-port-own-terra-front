import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowUpTray, HiMap, HiSquaresPlus } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { useProjectsQuery } from "@/hooks/queries/useAppQueries";
import { compactCurrency, currency } from "@/services/formatters";

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
  const { draftProject, setDraftProject, saveFrac, fracs, setSelectedFracId, showToast } = useAppContext();
  const [sectionName, setSectionName] = useState("");
  const [sectionTotal, setSectionTotal] = useState(12);

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
      mode: "editor",
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
    setSectionTotal(12);
  };

  const updateMap = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const sourceDataUrl = event.target?.result || "";
      const processed = await cropPlanImage(sourceDataUrl);

      setDraftProject((previous) => ({
        ...previous,
        mode: "editor",
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

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#DDD4C7] bg-[linear-gradient(150deg,#1A3428,#101511)] p-5 text-[#F7F3ED] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#D9B07D]">Inventario táctil</div>
            <h1 className="mt-2 font-['Playfair_Display'] text-[1.9rem] leading-none">Lotes y proyectos</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right">
            <div className="text-[0.64rem] uppercase tracking-[0.18em] text-white/45">Activos</div>
            <div className="mt-1 text-sm font-bold">{projects.length}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          <button className="rounded-2xl bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#16120F]" onClick={loadDemo}>
            Cargar demo
          </button>
          <button
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => setDraftProject((previous) => ({ ...previous, mode: previous.mode === "selector" ? "editor" : previous.mode }))}
          >
            Nuevo proyecto
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Portafolio</h2>
          <span className="text-sm font-semibold text-[#183024]">{projects.reduce((sum, item) => sum + item.lots.length, 0)} lotes</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {projects.map((project) => (
            <article
              key={project.id}
              className="min-w-[290px] rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-['Playfair_Display'] text-xl text-[#16120F]">{project.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8A7A69]">{project.lots.length} propiedades</div>
                </div>
                <div className="rounded-full bg-[#EDE3D3] px-3 py-1 text-[0.68rem] font-bold text-[#183024]">
                  {project.available} libres
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[#FBF7F1] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Vendido</div>
                  <div className="mt-2 text-lg font-bold text-[#16120F]">{project.sold}</div>
                </div>
                <div className="rounded-2xl bg-[#FBF7F1] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Reserva</div>
                  <div className="mt-2 text-lg font-bold text-[#16120F]">{project.reserved}</div>
                </div>
                <div className="rounded-2xl bg-[#FBF7F1] p-3">
                  <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Valor</div>
                  <div className="mt-2 text-lg font-bold text-[#16120F]">{compactCurrency(project.inventoryValue)}</div>
                </div>
              </div>
              <button
                className="mt-4 btn-s w-full"
                onClick={() => {
                  const frac = fracs.find((item) => item.id === project.id || item.name === project.name);
                  if (frac) {
                    setSelectedFracId(frac.id);
                  }
                  navigate("/fraccionamientos");
                }}
              >
                Ver fraccionamiento
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Constructor mobile-first</h2>
            <p className="mt-1 text-sm text-[#5F5346]">Migra el tablero de lotes a una experiencia táctil optimizada para vendedores en campo.</p>
          </div>
          <div className="rounded-2xl bg-[#183024] px-3 py-2 text-sm font-bold text-[#F7F3ED]">{totalDraftLots} lotes</div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#E6DDD0] bg-[#FBF7F1] p-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8A7A69]">Plano del proyecto</div>
              <div className="mt-3 overflow-hidden rounded-[22px] border border-dashed border-[#D7CCBE] bg-[#11131A]">
                {draftProject.mapUrl ? (
                  <img
                    src={draftProject.mapUrl}
                    alt="Plano cargado"
                    className="h-[320px] w-full object-contain object-top sm:h-[380px] xl:h-[430px]"
                  />
                ) : (
                  <div className="flex h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-[#D5C8B6] sm:h-[380px] xl:h-[430px]">
                    <HiMap className="text-5xl text-[#B89B73]" />
                    <div className="max-w-[260px] text-sm leading-6">
                      Carga un plano para mantener la referencia visual del fraccionamiento dentro de la app instalada.
                    </div>
                  </div>
                )}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#D9CEBF] bg-white px-4 py-3 text-sm font-semibold text-[#183024]">
                <HiArrowUpTray className="text-lg" />
                Subir plano
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) updateMap(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#E6DDD0] bg-[#FBF7F1] p-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8A7A69]">Nuevo bloque</div>
              <div className="mt-3 space-y-3">
                <input
                  className="mobile-input"
                  value={draftProject.name}
                  onChange={(event) => setDraftProject((previous) => ({ ...previous, name: event.target.value, mode: "editor" }))}
                  placeholder="Nombre del proyecto"
                />
                <input
                  className="mobile-input"
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                  placeholder="Nombre de sección"
                />
                <input
                  className="mobile-input"
                  type="number"
                  value={sectionTotal}
                  onChange={(event) => setSectionTotal(Number(event.target.value))}
                  placeholder="Número de lotes"
                />
                <button className="mobile-primary-button w-full" onClick={addSection}>
                  <HiSquaresPlus className="text-lg" />
                  Añadir sección
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {draftProject.sections.map((section) => (
                <article key={section.id} className="rounded-[24px] border border-[#E6DDD0] bg-[#FBF7F1] p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-[#16120F]">{section.name}</div>
                    <div className="text-xs uppercase tracking-[0.14em] text-[#8A7A69]">{section.lots.length} lotes</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {section.lots.slice(0, 8).map((lot) => (
                      <div key={lot.id} className={`lot-pill ${lot.status}`}>
                        <div className="font-semibold">{lot.code}</div>
                        <div className="text-[0.62rem] opacity-75">{lot.area} m² · {currency(lot.price)}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <button
              className="mobile-primary-button w-full"
              onClick={() => saveFrac(draftProject)}
              disabled={!draftProject.sections.length}
            >
              Crear fraccionamiento
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LotsPage;
