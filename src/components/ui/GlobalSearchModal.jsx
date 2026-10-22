import { useMemo, useState } from "react";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { searchService } from "@/services/searchService";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import Modal from "@/components/ui/Modal";

function GlobalSearchModal() {
  const navigate = useNavigate();
  const {
    ui,
    closeModal,
    openModal,
    clients,
    contracts,
    payments,
    documents,
    fracs,
    setSelectedClientId,
    setSelectedFracId,
    openContractCreate,
    openDocumentUpload,
    openDocumentPreview,
    startNewProject,
    canUseFeature
  } = useAppContext();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const debounced = useDebouncedValue(trimmedQuery);

  const { data: backendSearch, isFetching: searching, isError: searchFailed, refetch: retrySearch } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => searchService.search(debounced, { limit: 5 }),
    enabled: ui.globalSearch && debounced.length >= 2,
    staleTime: 30_000,
  });

  const quickActions = useMemo(
    () => [
      {
        id: "qa_dashboard",
        title: "Abrir dashboard",
        subtitle: "Resumen general del negocio",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/dashboard");
        }
      },
      {
        id: "qa_fracs",
        title: "Ver fraccionamientos",
        subtitle: "Galería de proyectos y lotes",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/fraccionamientos");
        }
      },
      {
        id: "qa_lotes",
        gate: "lands.write",
        title: "Cargar nuevos lotes",
        subtitle: "Nuevo plano o matriz",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          startNewProject();
        }
      },
      {
        id: "qa_client",
        gate: "lands.clients",
        title: "Nuevo cliente",
        subtitle: "Alta rápida en CRM",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/clientes");
          openModal("clientModal");
        }
      },
      {
        id: "qa_contract",
        gate: "lands.sales",
        title: "Generar contrato",
        subtitle: "Crear compraventa, renta o reserva",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/contratos");
          openContractCreate();
        }
      },
      {
        id: "qa_payment",
        gate: "lands.payments",
        title: "Ver pagos",
        subtitle: "Cobranza y seguimiento",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/pagos");
        }
      },
      {
        id: "qa_docs",
        gate: "lands.documents",
        title: "Subir documento",
        subtitle: "Contrato, identificación o comprobante",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/documentos");
          openDocumentUpload();
        }
      },
      {
        id: "qa_calc",
        gate: "lands.write",
        title: "Abrir calculadora",
        subtitle: "Amortización y pagos",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/calculadora");
        }
      }
    // Ofrecer un atajo que termina en "sin acceso" es peor que no ofrecerlo: el
    // usuario cree que puede y descubre que no recién al llegar.
    ].filter((a) => !a.gate || canUseFeature(a.gate)),
    [canUseFeature, closeModal, navigate, openContractCreate, openDocumentUpload, openModal, startNewProject]
  );

  const backendResults = useMemo(() => {
    if (!backendSearch?.results) return null;
    const { results: r } = backendSearch;
    const mapped = [
      ...(r.clients || []).map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.subtitle,
        type: "Cliente",
        action: () => { setSelectedClientId(c.id); closeModal("globalSearch"); navigate(`/clientes?client=${encodeURIComponent(c.id)}`); },
      })),
      ...(r.contracts || []).map((c) => ({
        id: c.id,
        title: c.number,
        subtitle: c.subtitle,
        type: "Contrato",
        action: () => { closeModal("globalSearch"); navigate(`/contratos?contract=${encodeURIComponent(c.id)}`); },
      })),
      ...(r.lots || []).map((l) => ({
        id: l.id,
        title: l.name,
        subtitle: l.subtitle,
        type: "Lote",
        action: () => { closeModal("globalSearch"); navigate(`/fraccionamientos?lot=${encodeURIComponent(l.id)}`); },
      })),
      ...(r.fraccionamientos || []).map((f) => ({
        id: f.id,
        title: f.name,
        subtitle: f.subtitle,
        type: "Fraccionamiento",
        action: () => { setSelectedFracId(f.id); closeModal("globalSearch"); navigate("/fraccionamientos"); },
      })),
      ...(r.payments || []).map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.subtitle,
        type: "Pago",
        action: () => { closeModal("globalSearch"); navigate(`/pagos?payment=${encodeURIComponent(p.id)}`); },
      })),
      ...(r.documents || []).map((d) => ({
        id: d.id,
        title: d.name,
        subtitle: d.subtitle,
        type: "Documento",
        action: () => { closeModal("globalSearch"); openDocumentPreview(d.id); },
      })),
    ];
    return mapped.slice(0, 16);
  }, [backendSearch, closeModal, navigate, openDocumentPreview, setSelectedClientId, setSelectedFracId]);

  const results = useMemo(() => {
    const term = trimmedQuery.toLowerCase();
    if (!term) return quickActions;
    if (trimmedQuery !== debounced || searching) return [];
    if (backendResults) return backendResults;

    const clientResults = clients
      .filter((client) => `${client.name} ${client.email} ${client.phone}`.toLowerCase().includes(term))
      .map((client) => ({
        id: client.id,
        title: client.name,
        subtitle: `${client.email} · ${client.phone}`,
        type: "Cliente",
        action: () => {
          setSelectedClientId(client.id);
          closeModal("globalSearch");
          navigate(`/clientes?client=${encodeURIComponent(client.id)}`);
        }
      }));

    const contractResults = contracts
      .filter((contract) => {
        const lotCode = contract.lot?.code || "";
        return `${contract.contract_number} ${lotCode} ${contract.client?.name || ""}`.toLowerCase().includes(term);
      })
      .map((contract) => ({
        id: contract.id,
        title: contract.contract_number,
        subtitle: contract.lot ? `${contract.lot.code} · ${contract.lot.inmueble_name || ""}` : "—",
        type: "Contrato",
        action: () => {
          closeModal("globalSearch");
          navigate(`/contratos?contract=${encodeURIComponent(contract.id)}`);
        }
      }));

    const paymentResults = payments
      .filter((payment) => {
        return `${payment.installment_n} ${payment.status} ${payment.client?.name || ""} ${payment.contract?.contract_number || ""}`.toLowerCase().includes(term);
      })
      .slice(0, 5)
      .map((payment) => ({
        id: payment.id,
        title: `Cuota ${payment.installment_n} · ${payment.contract?.contract_number || "—"}`,
        subtitle: `${payment.client?.name || "Cliente"} · ${payment.status}`,
        type: "Pago",
        action: () => {
          closeModal("globalSearch");
          navigate(`/pagos?payment=${encodeURIComponent(payment.id)}`);
        }
      }));

    const documentResults = documents
      .filter((document) => {
        return `${document.name} ${document.category} ${document.entity_label || ""}`.toLowerCase().includes(term);
      })
      .map((document) => ({
        id: document.id,
        title: document.name,
        subtitle: document.category,
        type: "Documento",
        action: () => {
          closeModal("globalSearch");
          openDocumentPreview(document.id);
        }
      }));

    const lotResults = [];

    const fracResults = fracs
      .filter((frac) => frac.name.toLowerCase().includes(term))
      .map((frac) => ({
        id: frac.id,
        title: frac.name,
        subtitle: `${frac.total_lots || 0} lotes`,
        type: "Fraccionamiento",
        action: () => {
          setSelectedFracId(frac.id);
          closeModal("globalSearch");
          navigate("/fraccionamientos");
        }
      }));

    return [...clientResults, ...contractResults, ...lotResults, ...fracResults, ...paymentResults, ...documentResults].slice(0, 16);
  }, [
    debounced,
    searching,
    openDocumentPreview,
    backendResults,
    clients,
    closeModal,
    contracts,
    documents,
    fracs,
    navigate,
    payments,
    trimmedQuery,
    quickActions,
    setSelectedClientId,
    setSelectedFracId
  ]);

  return (
    <Modal
      open={ui.globalSearch}
      icon={<HiMagnifyingGlass />}
      title="Búsqueda global"
      subtitle="Busca registros o ejecuta acciones rápidas."
      onClose={() => closeModal("globalSearch")}
      width="max-w-[680px]"
      footer={
        <button className="btn-p" onClick={() => closeModal("globalSearch")}>
          Cerrar
        </button>
      }
    >
      <div className="space-y-4">
        <input
          className="mobile-input"
          autoFocus
          placeholder="Buscar en todo el sistema..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {searching && (
          <div className="text-xs text-[#83867C] text-center">Buscando...</div>
        )}
        {searchFailed && <p role="alert">No se pudo consultar la búsqueda completa. Se muestran coincidencias de los registros cargados. <button type="button" className="btn-s" onClick={() => retrySearch()}>Reintentar</button></p>}
        <div className="space-y-2">
          {results.length ? (
            results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-[#FFFFFF] px-4 py-3 text-left transition hover:border-[#355E3B] hover:bg-[#EEF1F1]"
                onClick={item.action}
              >
                <div>
                  <div className="text-sm font-semibold text-[#1E3D2B]">{item.title}</div>
                  <div className="text-xs text-[#83867C]">{item.subtitle}</div>
                </div>
                <span className="rounded-full bg-[var(--tan-lt)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#355E3B]">
                  {item.type}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-[#EEF1F1] px-5 py-8 text-center text-sm text-[#83867C]">
              {searching || trimmedQuery !== debounced ? "Buscando…" : "No hay resultados con ese criterio."}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default GlobalSearchModal;
