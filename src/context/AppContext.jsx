import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentState } from "@/hooks/usePersistentState";
import api from "@/services/api";
import { clientService } from "@/services/clientService";
import { inmuebleService } from "@/services/inmuebleService";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";
import { paymentService } from "@/services/paymentService";
import { documentService, toBackendEntityType } from "@/services/documentService";
import { notificationService } from "@/services/notificationService";
import { initialDraftProject } from "@/services/mockData";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = usePersistentState("lm_session", null);

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser,
  });
  const clients = clientsData || [];

  const { data: fracsData } = useQuery({
    queryKey: ["inmuebles"],
    queryFn: () => inmuebleService.list({ limit: 50 }).then((r) => r.items),
    enabled: !!currentUser,
  });
  const fracs = fracsData || [];

  const { data: contractsData } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => contractService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser,
  });
  const contracts = contractsData || [];

  const { data: paymentsData } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentService.list({ limit: 200 }).then((r) => r.items),
    enabled: !!currentUser,
  });
  const payments = paymentsData || [];

  const { data: documentsData } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser,
  });
  const documents = documentsData || [];

  const { data: notificationCount = 0, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.unreadCount(),
    enabled: !!currentUser,
    refetchInterval: 60_000,
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [draftProject, setDraftProject] = usePersistentState("lm_draft_project", initialDraftProject);
  const [ui, setUi] = useState({
    sidebarOpen: false,
    clientModal: false,
    contractModal: false,
    paymentModal: false,
    documentModal: false,
    globalSearch: false,
    clientReport: false,
    documentPreview: false,
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
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedFracId, setSelectedFracId] = useState(null);

  // ── Auto-select first item when data loads ────────────────────────────────
  useEffect(() => {
    if (!selectedClientId && clients[0]) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!selectedFracId && fracs[0]) setSelectedFracId(fracs[0].id);
  }, [fracs, selectedFracId]);

  useEffect(() => {
    if (selectedClientId && clients.length && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0]?.id ?? null);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (selectedFracId && fracs.length && !fracs.some((f) => f.id === selectedFracId)) {
      setSelectedFracId(fracs[0]?.id ?? null);
    }
  }, [fracs, selectedFracId]);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const openModal = (modal) => setUi((p) => ({ ...p, [modal]: true }));
  const closeModal = (modal) => setUi((p) => ({ ...p, [modal]: false }));
  const toggleSidebar = () => setUi((p) => ({ ...p, sidebarOpen: !p.sidebarOpen }));
  const closeSidebar = () => setUi((p) => ({ ...p, sidebarOpen: false }));
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 2600);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async ({ identifier, password, remember }) => {
    try {
      const { data } = await api.post("/auth/login", { email: identifier, password });
      setCurrentUser({
        token: data.access_token,
        refresh_token: data.refresh_token,
        id: String(data.user.id),
        name: data.user.name,
        initials: data.user.initials || data.user.name.slice(0, 2).toUpperCase(),
        email: data.user.email,
        role: data.user.role,
        organization: data.organization,
        remember,
      });
      navigate("/ecosistema");
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const register = async ({ organization_name, name, email, password }) => {
    try {
      const { data } = await api.post("/auth/register", { organization_name, name, email, password });
      setCurrentUser({
        token: data.access_token,
        refresh_token: data.refresh_token,
        id: String(data.user.id),
        name: data.user.name,
        initials: data.user.initials || data.user.name.slice(0, 2).toUpperCase(),
        email: data.user.email,
        role: data.user.role,
        organization: data.organization,
        remember: true,
      });
      navigate("/ecosistema");
      return { ok: true };
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al registrar";
      return { ok: false, msg };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await api.post("/auth/forgot-password", { email });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    setCurrentUser(null);
    queryClient.clear();
    setUi((p) => ({ ...p, sidebarOpen: false }));
  };

  // ── Clients ───────────────────────────────────────────────────────────────
  const saveClient = async (payload) => {
    const body = {
      name: payload.name,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      type: payload.type || "lead",
      notes: payload.notes || undefined,
    };
    try {
      if (payload.id) {
        await clientService.update(payload.id, body);
      } else {
        const created = await clientService.create(body);
        setSelectedClientId(String(created.id));
      }
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch {
      showToast("Error al guardar el cliente");
    }
    setEditingClient(null);
    closeModal("clientModal");
  };

  const deleteClient = async (id) => {
    try {
      await clientService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch {
      showToast("Error al eliminar el cliente");
    }
    setEditingClient(null);
    closeModal("clientModal");
  };

  // ── Contracts ─────────────────────────────────────────────────────────────
  const saveContract = async (payload) => {
    let savedContract = null;
    // Lanza el error hacia el caller (ContractModal lo maneja con errores inline)
    if (payload.id) {
      savedContract = await contractService.update(payload.id, {
        notes:               payload.notes,
        seller_id:           payload.seller_id || undefined,
        down_payment_method: payload.down_payment_method || undefined,
        interest_rate:       Number(payload.interest_rate ?? 0),
      });
    } else {
      savedContract = await contractService.create({
        client_id:           payload.client_id ?? payload.clientId,
        lot_id:              payload.lot_id || payload.lotId || payload.lot || undefined,
        type:                payload.type,
        amount:              Number(payload.amount ?? 0),
        down_payment:        Number(payload.down_payment ?? 0),
        interest_rate:       Number(payload.interest_rate ?? 0),
        total_months:        Number(payload.total_months ?? payload.totalM ?? 96),
        contract_date:       payload.contract_date ?? payload.date,
        first_payment_date:  payload.first_payment_date ?? payload.date,
        seller_id:           payload.seller_id || undefined,
        down_payment_method: payload.down_payment_method || undefined,
        notes:               payload.notes || undefined,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["contracts"] });
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
    await queryClient.invalidateQueries({ queryKey: ["lots"] });

    const contractId = savedContract?.id || payload.id;
    const docs = (payload._docs || []).filter(d => d.file);
    if (docs.length > 0) {
      for (const doc of docs) {
        await documentService.upload(doc.file, {
          name:       doc.file.name.replace(/\.[^.]+$/, ""),
          category:   doc.category || "otro",
          folderId:   doc.folderId || undefined,
          entityType: contractId ? "contract" : undefined,
          entityId:   contractId || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["document-folders"] });
    }

    showToast(`Contrato registrado${docs.length > 0 ? ` · ${docs.length} doc${docs.length > 1 ? "s" : ""} subido${docs.length > 1 ? "s" : ""}` : ""}`);
    setEditingContract(null);
    setContractDraft(null);
    closeModal("contractModal");
  };

  const deleteContract = async (id) => {
    try {
      await contractService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch {
      showToast("Error al eliminar el contrato");
    }
    setEditingContract(null);
    setContractDraft(null);
    closeModal("contractModal");
  };

  // ── Payments ──────────────────────────────────────────────────────────────
  const savePayment = async (data) => {
    if (data?.id) {
      await quickPay(data.id, Number(data.amount || 0));
    } else {
      const match = payments.find(
        (p) =>
          String(p.contract?.id) === String(data.contractId) &&
          p.installment_n === Number(data.cuota) &&
          p.status !== "paid"
      );
      if (!match) { showToast("No se encontró la cuota indicada o ya está pagada"); return; }
      await quickPay(match.id, Number(data.amount || match.amount || 0));
    }
    setEditingPayment(null);
    setPaymentDraft(null);
    closeModal("paymentModal");
  };

  const deletePayment = () => showToast("Los pagos se generan desde contratos y no pueden eliminarse");

  const exportAppData = async (type = "contracts", format = "xlsx") => {
    try {
      const response = await api.get(`/export/${type}`, {
        params: { format },
        responseType: "blob",
      });
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const filename = `${type}_${new Date().toISOString().slice(0, 10)}.${ext}`;
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
      showToast(`Exportando ${type}...`);
    } catch {
      showToast("Error al exportar");
    }
  };

  const quickPay = async (paymentId, amount) => {
    try {
      await paymentService.markPaid(paymentId, {
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: "transfer",
        amount_paid: amount,
      });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      showToast("Pago registrado correctamente");
    } catch {
      showToast("Error al registrar el pago");
    }
  };

  const sendReminder = async (paymentOrName) => {
    const name = typeof paymentOrName === "string" ? paymentOrName : (paymentOrName?.client?.name || "cliente");
    if (paymentOrName?.id) {
      try { await paymentService.sendReminder(paymentOrName.id, { channel: "sms" }); } catch {}
    }
    showToast(`Recordatorio enviado a ${name}`);
  };

  // ── Documents ─────────────────────────────────────────────────────────────
  const saveDocument = async (payload, file) => {
    if (!file) {
      showToast("Selecciona un archivo para subir");
      return;
    }
    try {
      await documentService.upload(file, {
        name: payload.name || file.name,
        category: payload.category || "otro",
        entityType: (payload.linkType && payload.linkedId) ? toBackendEntityType(payload.linkType) : undefined,
        entityId: payload.linkedId || undefined,
        folderId: payload.folderId || undefined,
        notes: payload.notes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["documents-entity"] });
      await queryClient.invalidateQueries({ queryKey: ["document-folders"] });
      showToast("Documento subido");
    } catch (err) {
      const detail = err?.response?.data?.error?.message || err?.response?.data?.detail;
      showToast(typeof detail === "string" ? detail : "Error al subir el documento");
      console.error("Upload error:", err?.response?.data);
    }
    setDocumentDraft(null);
    closeModal("documentModal");
  };

  const deleteDocument = async (id) => {
    try {
      await documentService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["documents-entity"] });
      if (previewDocumentId === id) {
        setPreviewDocumentId(null);
        closeModal("documentPreview");
      }
      showToast("Documento eliminado");
    } catch {
      showToast("Error al eliminar el documento");
    }
  };

  const downloadDocument = async (id, directUrl, name) => {
    try {
      const url = directUrl || documentService.downloadUrl(id);
      const response = await fetch(url);
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name || "documento";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(directUrl || documentService.downloadUrl(id), "_blank");
    }
  };

  const openDocumentPreview = (id) => {
    setPreviewDocumentId(id);
    openModal("documentPreview");
  };

  const closeDocumentPreview = () => {
    setPreviewDocumentId(null);
    closeModal("documentPreview");
  };

  const getLinkedDocuments = (entityType, entityId) => {
    const backendType = toBackendEntityType(entityType);
    return documents.filter(
      (doc) => doc.entity_type === backendType && String(doc.entity_id) === String(entityId)
    );
  };

  // ── Fraccionamientos ──────────────────────────────────────────────────────
  const saveFrac = async ({ name, sections, mapUrl }) => {
    try {
      const inmueble = await inmuebleService.create({ name: name || "Fraccionamiento" });
      if (mapUrl) {
        await inmuebleService.update(inmueble.id, { map_image_url: mapUrl });
      }

      const draftLots = sections.flatMap((section) =>
        section.lots.map((lot) => ({
          _draftStatus: lot.status || "available",
          payload: {
            inmueble_id: inmueble.id,
            code: lot.code,
            area_m2: lot.area ? Number(lot.area) : null,
            frente_ml: lot.frente ? Number(lot.frente) : null,
            fondo_ml: lot.fondo ? Number(lot.fondo) : null,
            price_contado: lot.price ? Number(lot.price) : null,
            price_financiado: lot.priceFinanciado ? Number(lot.priceFinanciado) : null,
            services: lot.servicios
              ? Object.fromEntries(Object.entries(lot.servicios).filter(([, v]) => v))
              : {},
          }
        }))
      );

      if (draftLots.length > 0) {
        const result = await lotService.bulkCreate({
          inmueble_id: inmueble.id,
          lots: draftLots.map((d) => d.payload),
        });

        // Set "reserved" status for lots that were marked reserved in the builder
        // ("sold" requires a contract in the backend — skip those)
        const reservedUpdates = (result.lot_ids || [])
          .map((id, i) => ({ id, status: draftLots[i]?._draftStatus }))
          .filter(({ status }) => status === "reserved");

        await Promise.all(
          reservedUpdates.map(({ id, status }) => lotService.update(id, { status }))
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      setSelectedFracId(String(inmueble.id));
      setDraftProject(initialDraftProject);
      navigate("/fraccionamientos");
    } catch {
      showToast("Error al crear el fraccionamiento");
    }
  };

  const saveEditedFrac = async ({ sections, _editingFracId }) => {
    if (!_editingFracId) return;
    try {
      const patches = sections.flatMap((section) =>
        section.lots
          .filter((lot) => lot._backendId)
          .map((lot) => {
            const orig = lot._orig || {};
            const body = {};
            if (String(lot.area ?? "")            !== String(orig.area ?? "")            && lot.area          != null && lot.area          !== "") body.area_m2          = Number(lot.area);
            if (String(lot.frente ?? "")           !== String(orig.frente ?? "")          && lot.frente        != null && lot.frente        !== "") body.frente_ml        = Number(lot.frente);
            if (String(lot.fondo ?? "")            !== String(orig.fondo ?? "")           && lot.fondo         != null && lot.fondo         !== "") body.fondo_ml         = Number(lot.fondo);
            if (String(lot.price ?? "")            !== String(orig.price ?? "")           && lot.price         != null && lot.price         !== "") body.price_contado    = Number(lot.price);
            if (String(lot.priceFinanciado ?? "")  !== String(orig.priceFinanciado ?? "") && lot.priceFinanciado != null && lot.priceFinanciado !== "") body.price_financiado = Number(lot.priceFinanciado);
            if (lot.servicios && JSON.stringify(lot.servicios) !== (orig.servicios ?? "{}")) {
              body.services = Object.fromEntries(Object.entries(lot.servicios).filter(([, v]) => v));
            }
            return Object.keys(body).length > 0 ? { id: lot._backendId, body } : null;
          })
          .filter(Boolean)
      );

      await Promise.all(patches.map(({ id, body }) => lotService.update(id, body)));
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setSelectedFracId(String(_editingFracId));
      setDraftProject(initialDraftProject);
      navigate("/fraccionamientos");
      showToast(patches.length === 0 ? "Sin cambios que guardar" : `${patches.length} lote${patches.length !== 1 ? "s" : ""} actualizado${patches.length !== 1 ? "s" : ""}`);
    } catch {
      showToast("Error al guardar los cambios");
    }
  };

  const deleteFrac = async (id) => {
    try {
      await inmuebleService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      showToast("Fraccionamiento eliminado");
    } catch {
      showToast("Error al eliminar el fraccionamiento");
    }
  };

  const startNewProject = () => {
    setDraftProject(initialDraftProject);
    navigate("/lotes");
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const markAllNotificationsRead = async () => {
    try {
      await notificationService.markAllRead();
      refetchNotifications();
    } catch {
      showToast("Error al marcar notificaciones");
    }
  };

  // ── Reports ───────────────────────────────────────────────────────────────
  const openClientReport = (id) => {
    setReportClientId(id);
    setSelectedClientId(id);
    openModal("clientReport");
  };

  const closeClientReport = () => {
    setReportClientId(null);
    closeModal("clientReport");
  };

  const sendClientMessage = (client) => {
    const href = client?.phone ? `sms:${client.phone}` : `mailto:${client?.email || ""}`;
    window.open(href, "_self");
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
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

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    currentUser,
    clients,
    fracs,
    contracts,
    payments,
    documents,
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
    notificationCount,
    markAllNotificationsRead,
    openModal,
    closeModal,
    toggleSidebar,
    closeSidebar,
    showToast,
    login,
    register,
    forgotPassword,
    logout,
    saveClient,
    deleteClient,
    saveContract,
    deleteContract,
    openContractCreate,
    resetContractDraft,
    quickPay,
    savePayment,
    deletePayment,
    exportAppData,
    sendReminder,
    saveDocument,
    deleteDocument,
    openDocumentUpload,
    resetDocumentDraft,
    openDocumentPreview,
    closeDocumentPreview,
    downloadDocument,
    getLinkedDocuments,
    openClientReport,
    closeClientReport,
    sendClientMessage,
    saveFrac,
    saveEditedFrac,
    deleteFrac,
    startNewProject,
    openPaymentCreate,
    resetPaymentDraft,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext debe usarse dentro de AppProvider");
  return context;
}
