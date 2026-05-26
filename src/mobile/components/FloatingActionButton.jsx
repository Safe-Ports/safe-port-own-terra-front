import { HiDocumentPlus, HiPlus, HiUserPlus } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

function FloatingActionButton({ pathname }) {
  const { openModal, openContractCreate, openPaymentCreate, openDocumentUpload } = useAppContext();

  const configMap = {
    "/clientes": {
      label: "Nuevo cliente",
      icon: HiUserPlus,
      onClick: () => openModal("clientModal"),
    },
    "/ventas": {
      label: "Nueva venta",
      icon: HiDocumentPlus,
      onClick: () => openContractCreate(),
    },
    "/contratos": {
      label: "Nueva venta",
      icon: HiDocumentPlus,
      onClick: () => openContractCreate(),
    },
    "/documentos": {
      label: "Subir documento",
      icon: HiDocumentPlus,
      onClick: () => openDocumentUpload(),
    },
    "/alertas": {
      label: "Registrar pago",
      icon: HiPlus,
      onClick: () => openPaymentCreate(),
    },
    "/pagos": {
      label: "Registrar pago",
      icon: HiPlus,
      onClick: () => openPaymentCreate(),
    },
  };

  const config = configMap[pathname];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <button className="mobile-fab xl:hidden" onClick={config.onClick} aria-label={config.label}>
      <Icon className="text-[1.35rem]" />
    </button>
  );
}

export default FloatingActionButton;
