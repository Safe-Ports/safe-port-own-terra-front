import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
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
    openPaymentCreate,
    startNewProject
  } = useAppContext();
  const [query, setQuery] = useState("");

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
        title: "Registrar pago",
        subtitle: "Cobranza y seguimiento",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/pagos");
          openPaymentCreate();
        }
      },
      {
        id: "qa_docs",
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
        title: "Abrir calculadora",
        subtitle: "Amortización y pagos",
        type: "Acción",
        action: () => {
          closeModal("globalSearch");
          navigate("/calculadora");
        }
      }
    ],
    [closeModal, navigate, openContractCreate, openDocumentUpload, openModal, openPaymentCreate, startNewProject]
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return quickActions;

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
          navigate("/clientes");
        }
      }));

    const contractResults = contracts
      .filter((contract) => {
        const client = clients.find((item) => item.id === contract.clientId);
        return `${contract.number} ${contract.lot} ${client?.name || ""}`.toLowerCase().includes(term);
      })
      .map((contract) => ({
        id: contract.id,
        title: contract.number,
        subtitle: contract.lot,
        type: "Contrato",
        action: () => {
          closeModal("globalSearch");
          navigate("/contratos");
        }
      }));

    const paymentResults = payments
      .filter((payment) => {
        const client = clients.find((item) => item.id === payment.clientId);
        const contract = contracts.find((item) => item.id === payment.contractId);
        return `${payment.cuota} ${payment.status} ${client?.name || ""} ${contract?.number || ""}`.toLowerCase().includes(term);
      })
      .slice(0, 5)
      .map((payment) => {
        const client = clients.find((item) => item.id === payment.clientId);
        const contract = contracts.find((item) => item.id === payment.contractId);
        return {
          id: payment.id,
          title: `Cuota ${payment.cuota} · ${contract?.number || payment.contractId}`,
          subtitle: `${client?.name || "Cliente"} · ${payment.status}`,
          type: "Pago",
          action: () => {
            closeModal("globalSearch");
            navigate("/pagos");
          }
        };
      });

    const documentResults = documents
      .filter((document) => {
        const client = clients.find((item) => item.id === document.clientId);
        const contract = contracts.find((item) => item.id === document.contractId);
        return `${document.name} ${document.category} ${client?.name || ""} ${contract?.number || ""}`.toLowerCase().includes(term);
      })
      .map((document) => ({
        id: document.id,
        title: document.name,
        subtitle: document.category,
        type: "Documento",
        action: () => {
          closeModal("globalSearch");
          navigate("/documentos");
        }
      }));

    const lotResults = fracs
      .flatMap((frac) =>
        frac.lots
          .filter((lot) => `${lot.code} ${lot.section || ""} ${frac.name}`.toLowerCase().includes(term))
          .map((lot) => ({
            id: `${frac.id}_${lot.id}`,
            title: lot.code,
            subtitle: `${frac.name} · ${lot.section || "General"}`,
            type: "Lote",
            action: () => {
              setSelectedFracId(frac.id);
              closeModal("globalSearch");
              navigate("/fraccionamientos");
            }
          }))
      )
      .slice(0, 5);

    const fracResults = fracs
      .filter((frac) => frac.name.toLowerCase().includes(term))
      .map((frac) => ({
        id: frac.id,
        title: frac.name,
        subtitle: `${frac.lots.length} lotes`,
        type: "Fraccionamiento",
        action: () => {
          setSelectedFracId(frac.id);
          closeModal("globalSearch");
          navigate("/fraccionamientos");
        }
      }));

    return [...clientResults, ...contractResults, ...lotResults, ...fracResults, ...paymentResults, ...documentResults].slice(0, 16);
  }, [
    clients,
    closeModal,
    contracts,
    documents,
    fracs,
    navigate,
    payments,
    query,
    quickActions,
    setSelectedClientId,
    setSelectedFracId
  ]);

  return (
    <Modal
      open={ui.globalSearch}
      icon="🔍"
      title="Búsqueda global"
      subtitle="Busca o ejecuta acciones rápidas como en la maqueta original."
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
        <div className="space-y-2">
          {results.length ? (
            results.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-[#fffdf8] px-4 py-3 text-left transition hover:border-[#2A7A50] hover:bg-[#f0ede5]"
                onClick={item.action}
              >
                <div>
                  <div className="text-sm font-semibold text-[#1A1410]">{item.title}</div>
                  <div className="text-xs text-[#8C8070]">{item.subtitle}</div>
                </div>
                <span className="rounded-full bg-[#d4eae0] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#1A5C3C]">
                  {item.type}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-[#f0ede5] px-5 py-8 text-center text-sm text-[#8C8070]">
              No hay resultados con ese criterio.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default GlobalSearchModal;
