import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import EmptyState from "@/components/ui/EmptyState";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { lotService } from "@/services/lotService";
import { currency } from "@/services/formatters";

function monthlyEstimate(price) {
  const financed = Math.round(price * 0.8);
  return Math.round(financed / 96);
}

function FracsPage() {
  const { fracs, selectedFracId, setSelectedFracId, deleteFrac, exportAppData } = useAppContext();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(null);

  const selectedFrac = fracs.find((f) => f.id === selectedFracId) || fracs[0] || null;

  // Fetch lots for the selected inmueble
  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ["lots", selectedFrac?.id],
    queryFn: () => lotService.list({ inmueble_id: selectedFrac.id, limit: 200 }).then((r) => r.items),
    enabled: !!selectedFrac?.id,
  });
  const lots = lotsData || [];

  useEffect(() => {
    setSelectedLotId(null);
    setStatusFilter("all");
    setSearch("");
    setSectionFilter("");
  }, [selectedFrac?.id]);

  useEffect(() => {
    if (!selectedLotId && lots[0]) {
      setSelectedLotId(lots[0].id);
    }
  }, [lots, selectedLotId]);

  if (!selectedFrac) {
    return (
      <EmptyState
        icon="🗺️"
        title="Sin fraccionamientos creados"
        description="Carga un plano, arma la matriz de lotes y crea tu primer proyecto desde la sección Carga de Lotes."
        action={
          <Link className="mobile-primary-button" to="/lotes">
            Ir a Carga de Lotes
          </Link>
        }
      />
    );
  }

  const sections = [...new Set(lots.map((lot) => lot.section || "General"))];

  const filteredLots = lots.filter((lot) => {
    const matchesStatus = statusFilter === "all" || lot.status === statusFilter;
    const matchesSection = !sectionFilter || (lot.section || "General") === sectionFilter;
    const matchesSearch = !search.trim() || `${lot.code} ${lot.section || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSection && matchesSearch;
  });

  const selectedLot = filteredLots.find((lot) => lot.id === selectedLotId) || filteredLots[0] || null;
  const price = Number(selectedLot?.price_contado || 0);
  const area = Number(selectedLot?.area_m2 || 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-hd">
          <div className="card-title">🏘️ Proyectos</div>
        </div>
        <div className="card-body space-y-3">
          {fracs.map((frac) => (
            <button
              key={frac.id}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                frac.id === selectedFrac.id ? "border-[#2A7A50] bg-[#d4eae0]" : "border-line bg-[#fffdf8]"
              }`}
              onClick={() => setSelectedFracId(frac.id)}
            >
              <div className="font-semibold text-[#1A1410]">{frac.name}</div>
              <div className="mt-1 text-xs text-[#8C8070]">
                {frac.total_lots ?? 0} lotes · {frac.created_at ? new Date(frac.created_at).toLocaleDateString("es-MX") : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-[0.68rem] uppercase tracking-[0.16em] text-[#8A7A69]">Fraccionamiento activo</div>
              <div className="mt-2 font-['Playfair_Display'] text-3xl text-[#16120F]">{selectedFrac.name}</div>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link className="btn-s" to="/lotes">✏ Editar</Link>
              <button className="btn-s" onClick={exportAppData}>⬇ Exportar</button>
              <button className="btn-dan" onClick={() => deleteFrac(selectedFrac.id)}>🗑 Eliminar</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] bg-[#FBF7F1] p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Disponibles</div>
              <div className="mt-2 text-lg font-bold text-[#183024]">{selectedFrac.available_lots ?? 0}</div>
            </div>
            <div className="rounded-[22px] bg-[#FBF7F1] p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Vendidos</div>
              <div className="mt-2 text-lg font-bold text-[#16120F]">{selectedFrac.sold_lots ?? 0}</div>
            </div>
            <div className="rounded-[22px] bg-[#FBF7F1] p-3">
              <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Reservados</div>
              <div className="mt-2 text-lg font-bold text-[#16120F]">{selectedFrac.reserved_lots ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                className="mobile-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lote o sección"
              />
              <select className="mobile-input" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
                <option value="">Todas las secciones</option>
                {sections.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                ["all", "Todos"],
                ["available", "🟢 Disponible"],
                ["sold", "🔴 Vendido"],
                ["reserved", "🟡 Reservado"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`mobile-chip ${statusFilter === value ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {lotsLoading ? (
              <div className="mt-4 text-sm text-[#8A7A69]">Cargando lotes...</div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filteredLots.map((lot) => (
                  <button
                    key={lot.id}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      selectedLot?.id === lot.id
                        ? "border-[#183024] bg-[#183024] text-[#F7F3ED]"
                        : "border-[#E2D8CB] bg-[#FBF7F1] text-[#16120F]"
                    }`}
                    onClick={() => setSelectedLotId(lot.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{lot.code}</div>
                        <div className={`mt-1 text-xs ${selectedLot?.id === lot.id ? "text-white/58" : "text-[#7A6D5F]"}`}>
                          {lot.section || "General"}
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] ${
                        selectedLot?.id === lot.id ? "bg-white/12 text-white" : "bg-[#EDE3D3] text-[#183024]"
                      }`}>
                        {lot.status}
                      </span>
                    </div>
                    <div className={`mt-4 text-sm ${selectedLot?.id === lot.id ? "text-white/68" : "text-[#5F5346]"}`}>
                      {lot.area_m2 ? `${lot.area_m2} m²` : "—"} · {lot.price_contado ? currency(Number(lot.price_contado)) : "Sin precio"}
                    </div>
                  </button>
                ))}
                {filteredLots.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-sm text-[#8A7A69]">Sin lotes que coincidan</div>
                )}
              </div>
            )}
          </div>

          {selectedLot ? (
            <div className="space-y-4">
              <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-[#8A7A69]">Detalle del lote</div>
                    <div className="mt-2 font-['Playfair_Display'] text-3xl text-[#16120F]">{selectedLot.code}</div>
                    <div className="mt-1 text-sm text-[#5F5346]">{selectedLot.section || "General"}</div>
                  </div>
                  <div className="rounded-full bg-[#EDE3D3] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#183024]">
                    {selectedLot.status}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Superficie</div>
                    <div className="mt-2 text-lg font-bold text-[#16120F]">{area ? `${area} m²` : "—"}</div>
                  </div>
                  <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Precio contado</div>
                    <div className="mt-2 text-lg font-bold text-[#183024]">{price ? currency(price) : "—"}</div>
                  </div>
                  {selectedLot.price_financiado && (
                    <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                      <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Precio financiado</div>
                      <div className="mt-2 text-lg font-bold text-[#16120F]">{currency(Number(selectedLot.price_financiado))}</div>
                    </div>
                  )}
                  {price > 0 && (
                    <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                      <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Mensualidad aprox.</div>
                      <div className="mt-2 text-lg font-bold text-[#16120F]">{currency(monthlyEstimate(price))}</div>
                    </div>
                  )}
                  {price > 0 && area > 0 && (
                    <div className="rounded-[22px] bg-[#FBF7F1] p-3">
                      <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[#8A7A69]">Precio / m²</div>
                      <div className="mt-2 text-lg font-bold text-[#16120F]">{currency(Math.round(price / area))}</div>
                    </div>
                  )}
                </div>
              </section>

              <InlineDocumentsPanel
                entityType="lot"
                entityId={selectedLot.id}
                entityLabel={`${selectedFrac.name} · ${selectedLot.code}`}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default FracsPage;
