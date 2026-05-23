import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  createSeedPayments,
  demoUsers,
  initialClients,
  initialContracts,
  initialDocuments,
  initialDraftProject,
  initialFracs
} from "@/services/mockData";

const AppContext = createContext(null);

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePaymentStatus(payment) {
  if (payment.status === "paid") {
    return payment;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${payment.dueDate}T12:00:00`);
  due.setHours(0, 0, 0, 0);

  if (due < today) {
    return { ...payment, status: "overdue" };
  }

  return { ...payment, status: "pending" };
}

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = usePersistentState("lm_session", null);
  const [clients, setClients] = usePersistentState("lm_clients", initialClients);
  const [contracts, setContracts] = usePersistentState("lm_contracts", initialContracts);
  const [payments, setPayments] = usePersistentState("lm_payments", createSeedPayments());
  const [documents, setDocuments] = usePersistentState("lm_documents", initialDocuments);
  const [fracs, setFracs] = usePersistentState("lm_fracs", initialFracs);
  const [draftProject, setDraftProject] = usePersistentState("lm_draft_project", initialDraftProject);
  const [ui, setUi] = useState({
    sidebarOpen: false,
    clientModal: false,
    contractModal: false,
    paymentModal: false,
    documentModal: false,
    globalSearch: false,
    clientReport: false,
    documentPreview: false
  });
  const [editingClient, setEditingClient] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [contractDraft, setContractDraft] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [documentDraft, setDocumentDraft] = useState(null);
  const [previewDocumentId, setPreviewDocumentId] = useState(null);
  const [reportClientId, setReportClientId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? null);
  const [selectedFracId, setSelectedFracId] = useState(fracs[0]?.id ?? null);

  useEffect(() => {
    setPayments((previous) => previous.map(normalizePaymentStatus));
  }, [setPayments]);

  useEffect(() => {
    if (!selectedClientId && clients[0]) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!selectedFracId && fracs[0]) {
      setSelectedFracId(fracs[0].id);
    }
  }, [fracs, selectedFracId]);

  useEffect(() => {
    if (selectedClientId && !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clients[0]?.id ?? null);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (selectedFracId && !fracs.some((frac) => frac.id === selectedFracId)) {
      setSelectedFracId(fracs[0]?.id ?? null);
    }
  }, [fracs, selectedFracId]);

  const openModal = (modal) => setUi((previous) => ({ ...previous, [modal]: true }));
  const closeModal = (modal) => setUi((previous) => ({ ...previous, [modal]: false }));
  const toggleSidebar = () =>
    setUi((previous) => ({ ...previous, sidebarOpen: !previous.sidebarOpen }));
  const closeSidebar = () => setUi((previous) => ({ ...previous, sidebarOpen: false }));
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 2600);
  };

  const login = ({ identifier, password, remember }) => {
    const user = demoUsers.find(
      (item) =>
        (item.username === identifier || item.email === identifier) &&
        item.password === password
    );

    if (!user) {
      return { ok: false };
    }

    const session = {
      id: user.id,
      name: user.name,
      initials: user.initials,
      email: user.email,
      role: user.role,
      remember
    };

    setCurrentUser(session);
    navigate("/dashboard");
    return { ok: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setUi((previous) => ({ ...previous, sidebarOpen: false }));
  };

  const saveClient = (payload) => {
    const base = {
      id: payload.id || uniqueId("cl"),
      initials: payload.initials || payload.name.split(" ").map((chunk) => chunk[0]).join("").slice(0, 2).toUpperCase(),
      color: payload.color || "#2A7A50",
      status: payload.status || "active"
    };
    const nextClient = { ...base, ...payload };
    setClients((previous) => {
      const exists = previous.some((item) => item.id === nextClient.id);
      return exists
        ? previous.map((item) => (item.id === nextClient.id ? nextClient : item))
        : [...previous, nextClient];
    });
    setSelectedClientId(nextClient.id);
    setEditingClient(null);
    closeModal("clientModal");
  };

  const deleteClient = (id) => {
    setClients((previous) => previous.filter((item) => item.id !== id));
    setContracts((previous) => previous.filter((item) => item.clientId !== id));
    setPayments((previous) => previous.filter((item) => item.clientId !== id));
    setDocuments((previous) => previous.filter((item) => item.clientId !== id));
    setEditingClient(null);
    closeModal("clientModal");
  };

  const saveContract = (payload) => {
    const contract = {
      ...payload,
      id: payload.id || uniqueId("con")
    };

    setContracts((previous) => {
      const exists = previous.some((item) => item.id === contract.id);
      return exists
        ? previous.map((item) => (item.id === contract.id ? contract : item))
        : [...previous, contract];
    });

    if (!payload.id) {
      const monthly = Math.round(contract.amount / Math.max(contract.totalM || 1, 1));
      const nextPayments = Array.from({ length: contract.totalM || 1 }, (_, index) => {
        const dueDate = new Date(`${contract.date || new Date().toISOString().split("T")[0]}T12:00:00`);
        dueDate.setMonth(dueDate.getMonth() + index);
        return {
          id: uniqueId("pay"),
          clientId: contract.clientId,
          contractId: contract.id,
          cuota: index + 1,
          amount: monthly,
          dueDate: dueDate.toISOString().split("T")[0],
          paidDate: "",
          status: index < (contract.paidM || 0) ? "paid" : "pending",
          notes: ""
        };
      });
      setPayments((previous) => [...previous, ...nextPayments]);
    }

    setEditingContract(null);
    setContractDraft(null);
    closeModal("contractModal");
  };

  const deleteContract = (id) => {
    setContracts((previous) => previous.filter((item) => item.id !== id));
    setPayments((previous) => previous.filter((item) => item.contractId !== id));
    setDocuments((previous) => previous.filter((item) => item.contractId !== id));
    setEditingContract(null);
    setContractDraft(null);
    closeModal("contractModal");
  };

  const savePayment = (payload) => {
    const payment = { ...payload, id: payload.id || uniqueId("pay") };
    setPayments((previous) => {
      const exists = previous.some((item) => item.id === payment.id);
      return exists
        ? previous.map((item) => (item.id === payment.id ? payment : item))
        : [...previous, payment];
    });
    setEditingPayment(null);
    setPaymentDraft(null);
    closeModal("paymentModal");
  };

  const deletePayment = (id) => {
    setPayments((previous) => previous.filter((item) => item.id !== id));
    setEditingPayment(null);
    setPaymentDraft(null);
    closeModal("paymentModal");
  };

  const quickPay = (id) => {
    const today = new Date().toISOString().split("T")[0];
    setPayments((previous) =>
      previous.map((payment) =>
        payment.id === id
          ? { ...payment, status: "paid", paidDate: today }
          : payment
      )
    );
    showToast("Pago registrado correctamente");
  };

  const saveDocument = (payload) => {
    const resolvedLinkType =
      payload.linkType ||
      (payload.contractId ? "contract" : payload.clientId ? "client" : payload.lotCode ? "lot" : "");
    const resolvedLinkedId =
      payload.linkedId ||
      (resolvedLinkType === "contract"
        ? payload.contractId
        : resolvedLinkType === "client"
          ? payload.clientId
          : payload.lotCode || "");
    const document = {
      ...payload,
      id: payload.id || uniqueId("doc"),
      linkType: resolvedLinkType,
      linkedId: resolvedLinkedId,
      createdAt: payload.createdAt || new Date().toISOString().split("T")[0],
      uploadedBy: payload.uploadedBy || currentUser?.name || "Administrador"
    };
    setDocuments((previous) => {
      const exists = previous.some((item) => item.id === document.id);
      return exists
        ? previous.map((item) => (item.id === document.id ? document : item))
        : [document, ...previous];
    });
    setDocumentDraft(null);
    closeModal("documentModal");
    showToast("Documento guardado");
  };

  const deleteDocument = (id) => {
    setDocuments((previous) => previous.filter((item) => item.id !== id));
    if (previewDocumentId === id) {
      setPreviewDocumentId(null);
      closeModal("documentPreview");
    }
    showToast("Documento eliminado");
  };

  const openDocumentPreview = (id) => {
    setPreviewDocumentId(id);
    openModal("documentPreview");
  };

  const closeDocumentPreview = () => {
    setPreviewDocumentId(null);
    closeModal("documentPreview");
  };

  const downloadDocument = (id) => {
    const document = documents.find((item) => item.id === id);
    if (!document) return;

    const href = document.fileDataUrl || `data:text/plain;charset=utf-8,${encodeURIComponent(`Documento: ${document.name}`)}`;
    const anchor = window.document.createElement("a");
    anchor.href = href;
    anchor.download = document.name || "documento";
    anchor.click();
    showToast(`Descargando ${document.name}`);
  };

  const openClientReport = (id) => {
    setReportClientId(id);
    setSelectedClientId(id);
    openModal("clientReport");
  };

  const closeClientReport = () => {
    setReportClientId(null);
    closeModal("clientReport");
  };

  const sendReminder = (clientName) => {
    showToast(`Recordatorio enviado a ${clientName}`);
  };

  const sendClientMessage = (client) => {
    const href = client?.phone ? `sms:${client.phone}` : `mailto:${client?.email || ""}`;
    window.open(href, "_self");
  };

  const getLinkedDocuments = (entityType, entityId) =>
    documents.filter((document) => {
      if (entityType === "contract") {
        return document.contractId === entityId || (document.linkType === "contract" && document.linkedId === entityId);
      }

      if (entityType === "client") {
        return document.clientId === entityId || (document.linkType === "client" && document.linkedId === entityId);
      }

      if (entityType === "lot") {
        return document.lotCode === entityId || (document.linkType === "lot" && document.linkedId === entityId);
      }

      return false;
    });

  const openContractCreate = (draft = {}) => {
    setEditingContract(null);
    setContractDraft(draft);
    openModal("contractModal");
  };

  const openPaymentCreate = (draft = {}) => {
    setEditingPayment(null);
    setPaymentDraft(draft);
    openModal("paymentModal");
  };

  const openDocumentUpload = (draft = {}) => {
    setDocumentDraft(draft);
    openModal("documentModal");
  };

  const resetContractDraft = () => setContractDraft(null);
  const resetPaymentDraft = () => setPaymentDraft(null);
  const resetDocumentDraft = () => setDocumentDraft(null);

  const saveFrac = ({ name, mapUrl, sections }) => {
    const lots = sections.flatMap((section) =>
      section.lots.map((lot) => ({
        id: lot.id || uniqueId("lot"),
        code: lot.code,
        status: lot.status,
        area: Number(lot.area),
        price: Number(lot.price),
        section: section.name
      }))
    );

    const frac = {
      id: uniqueId("frac"),
      name: name || "Fraccionamiento",
      createdAt: new Date().toISOString().split("T")[0],
      mapUrl,
      lots
    };

    setFracs((previous) => [frac, ...previous]);
    setSelectedFracId(frac.id);
    setDraftProject(initialDraftProject);
    navigate("/lotes");
  };

  const deleteFrac = (id) => {
    setFracs((previous) => previous.filter((frac) => frac.id !== id));
    showToast("Fraccionamiento eliminado");
  };

  const startNewProject = () => {
    setDraftProject(initialDraftProject);
    navigate("/lotes");
    showToast("Listo para crear un nuevo proyecto");
  };

  const exportAppData = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      currentUser,
      clients,
      contracts,
      payments,
      documents,
      fracs
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `ownterra-backup-${new Date().toISOString().split("T")[0]}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast("Respaldo exportado");
  };

  const value = {
    currentUser,
    clients,
    contracts,
    payments,
    documents,
    fracs,
    draftProject,
    ui,
    toast,
    editingClient,
    editingContract,
    editingPayment,
    contractDraft,
    paymentDraft,
    documentDraft,
    previewDocumentId,
    reportClientId,
    selectedClientId,
    selectedFracId,
    setDraftProject,
    setEditingClient,
    setEditingContract,
    setEditingPayment,
    setContractDraft,
    setPaymentDraft,
    setDocumentDraft,
    setSelectedClientId,
    setSelectedFracId,
    openModal,
    closeModal,
    toggleSidebar,
    closeSidebar,
    showToast,
    login,
    logout,
    saveClient,
    deleteClient,
    saveContract,
    deleteContract,
    openContractCreate,
    resetContractDraft,
    savePayment,
    deletePayment,
    openPaymentCreate,
    resetPaymentDraft,
    quickPay,
    saveDocument,
    deleteDocument,
    openDocumentUpload,
    resetDocumentDraft,
    openDocumentPreview,
    closeDocumentPreview,
    downloadDocument,
    openClientReport,
    closeClientReport,
    sendReminder,
    sendClientMessage,
    getLinkedDocuments,
    saveFrac,
    deleteFrac,
    startNewProject,
    exportAppData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext debe usarse dentro de AppProvider");
  }

  return context;
}
