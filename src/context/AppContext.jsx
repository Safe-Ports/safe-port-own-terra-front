import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentState } from "@/hooks/usePersistentState";
import api from "@/services/api";
import { clientService } from "@/services/clientService";
import { inmuebleService } from "@/services/inmuebleService";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";
import { paymentService } from "@/services/paymentService";
import { documentService, filenameForDocument, toBackendEntityType } from "@/services/documentService";
import { notificationService } from "@/services/notificationService";
import { appointmentService } from "@/services/appointmentService";
import { folderService } from "@/services/folderService";
import { createEmptyDraftProject } from "@/services/draftProject";
import { canAccessApp, canUseFeature } from "@/services/permissions";
import { getUserErrorMessage } from "@/services/errors";

const AG_SEEN_KEY = "ag_triggered_seen";

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

  const todayIso = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();
  const todayEndIso = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  })();

  const { data: todayApptsRaw = [] } = useQuery({
    queryKey: ["appointments", "today-alerts"],
    queryFn: () => appointmentService.list({ upcoming_only: false, from_date: todayIso, to_date: todayEndIso }),
    enabled: !!currentUser,
    refetchInterval: 60_000,
  });

  const [calendarAlertCount, setCalendarAlertCount] = useState(0);
  const calendarAlertEventsRef = useRef([]);
  const prevAlertCountRef = useRef(0);
  const showToastRef = useRef(null);

  const computeCalendarAlerts = useCallback((appts) => {
    const now = Date.now();
    const PRE  = 2  * 60 * 1000; // 2 min antes
    const POST = 30 * 60 * 1000; // 30 min después
    const triggered = appts.filter((a) => {
      const t = new Date(a.scheduled_at).getTime();
      return t <= now + PRE && t >= now - POST
        && a.status !== "completed" && a.status !== "cancelled";
    });
    const seen = JSON.parse(sessionStorage.getItem(AG_SEEN_KEY) || "[]");
    const unacked = triggered.filter((a) => !seen.includes(String(a.id)));
    calendarAlertEventsRef.current = unacked;
    setCalendarAlertCount(unacked.length);
  }, []);

  useEffect(() => {
    computeCalendarAlerts(todayApptsRaw);
  }, [todayApptsRaw, computeCalendarAlerts]);

  useEffect(() => {
    const interval = setInterval(() => computeCalendarAlerts(todayApptsRaw), 30_000);
    return () => clearInterval(interval);
  }, [todayApptsRaw, computeCalendarAlerts]);

  const clearCalendarAlerts = useCallback(() => {
    const ids = calendarAlertEventsRef.current.map((a) => String(a.id));
    if (ids.length === 0) return;
    const existing = JSON.parse(sessionStorage.getItem(AG_SEEN_KEY) || "[]");
    sessionStorage.setItem(AG_SEEN_KEY, JSON.stringify([...new Set([...existing, ...ids])]));
    calendarAlertEventsRef.current = [];
    setCalendarAlertCount(0);
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [draftProject, setDraftProject] = usePersistentState("lm_draft_project", createEmptyDraftProject());
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
  const [fracsResetKey, setFracsResetKey] = useState(0);
  const resetFracsView = () => setFracsResetKey((k) => k + 1);

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
  // keep a stable ref so effects without showToast in deps can still call it
  showToastRef.current = showToast;

  // Pide permiso de notificaciones cuando el usuario inicia sesión
  useEffect(() => {
    if (currentUser && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [currentUser]);

  // Dispara notificación browser + toast cuando llega la hora de un evento
  useEffect(() => {
    if (calendarAlertCount > prevAlertCountRef.current) {
      const events = calendarAlertEventsRef.current;
      // Browser notification (funciona aunque la pestaña esté en segundo plano)
      if ("Notification" in window && Notification.permission === "granted") {
        events.slice(0, 3).forEach((a) => {
          new Notification("⏰ Evento en tu agenda", {
            body: a.title || "Tienes un evento programado ahora",
            tag: `ag-event-${a.id}`,
            requireInteraction: false,
          });
        });
      }
      // Toast en la app
      if (events.length > 0 && showToastRef.current) {
        const label = events.length === 1
          ? `⏰ ${events[0].title || "Evento"} — es ahora`
          : `⏰ ${events.length} eventos de agenda ahora`;
        showToastRef.current(label);
      }
    }
    prevAlertCountRef.current = calendarAlertCount;
  }, [calendarAlertCount]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const applyAuthSession = (data, remember = true) => {
    setCurrentUser({
      token: data.access_token,
      refresh_token: data.refresh_token,
      id: String(data.user.id),
      name: data.user.name,
      initials: data.user.initials || data.user.name.slice(0, 2).toUpperCase(),
      email: data.user.email,
      role: data.user.role,
      apps: data.user.apps || data.user.user_apps || [],
      permissions: data.user.permissions || [],
      organization: data.organization,
      remember,
    });
  };

  const login = async ({ identifier, password, remember }) => {
    try {
      const { data } = await api.post("/auth/login", { email: identifier, password });
      applyAuthSession(data, remember);
      navigate("/ecosistema");
      return { ok: true };
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        return { ok: false, needsVerification: true, email: identifier, msg: getUserErrorMessage(err, "Confirma tu correo") };
      }
      return { ok: false, msg: getUserErrorMessage(err, "Credenciales inválidas") };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const { data } = await api.post("/auth/verify-email", { token });
      applyAuthSession(data, true);
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: getUserErrorMessage(err, "Enlace de verificación inválido o expirado") };
    }
  };

  const resendVerification = async (email) => {
    try {
      await api.post("/auth/resend-verification", { email });
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: getUserErrorMessage(err, "No se pudo reenviar el correo") };
    }
  };

  const register = async ({ organization_name, name, email, password }) => {
    try {
      const { data } = await api.post("/auth/register", { organization_name, name, email, password });
      // Flujo bloqueante: el backend no devuelve tokens, el usuario debe confirmar su correo.
      return { ok: true, pendingVerification: true, email: data.email || email };
    } catch (err) {
      return { ok: false, msg: getUserErrorMessage(err, "Error al registrar") };
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
      name: payload.name?.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      type: payload.type || "lead",
      notes: payload.notes?.trim() || null,
    };
    try {
      if (payload.linkClientId) {
        await clientService.assignApp(payload.linkClientId, "lands");
        setSelectedClientId(String(payload.linkClientId));
        showToast("Cliente vinculado a Lands correctamente");
      } else if (payload.id) {
        await clientService.update(payload.id, body);
        showToast("Cliente actualizado correctamente");
      } else {
        const created = await clientService.create(body);
        setSelectedClientId(String(created.id));
        try {
          await clientService.assignApp(created.id, "lands");
        } catch (err) {
          await queryClient.invalidateQueries({ queryKey: ["clients"] });
          await queryClient.invalidateQueries({ queryKey: ["client-apps"] });
          setEditingClient(null);
          closeModal("clientModal");
          showToast(getUserErrorMessage(err, "Cliente creado en el Core, pero no se pudo vincular a Lands"));
          return false;
        }
        try {
          const shortId = String(created.id).slice(0, 8).toUpperCase();
          await folderService.create({ name: `${created.name} - ${shortId}`, parent_id: null });
          await queryClient.invalidateQueries({ queryKey: ["document-folders"] });
        } catch (_) {}
        showToast("Cliente creado correctamente");
      }
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (payload.id) {
        await queryClient.invalidateQueries({ queryKey: ["client", String(payload.id)] });
      }
      if (payload.linkClientId || !payload.id) {
        await queryClient.invalidateQueries({ queryKey: ["client-apps"] });
      }
    } catch (err) {
      const fallback = payload.linkClientId
        ? "No se pudo vincular el cliente a Lands"
        : payload.id
          ? "No se pudo actualizar el cliente"
          : "No se pudo crear el cliente";
      showToast(getUserErrorMessage(err, fallback));
      return false;
    }
    setEditingClient(null);
    closeModal("clientModal");
    return true;
  };

  const deleteClient = async (id) => {
    try {
      await clientService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingClient(null);
      closeModal("clientModal");
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al eliminar el cliente"));
      return false;
    }
  };

  // ── Contracts ─────────────────────────────────────────────────────────────
  const saveContract = async (payload) => {
    let savedContract = null;
    // Lanza el error hacia el caller (ContractModal lo maneja con errores inline)
    if (payload.id) {
      savedContract = await contractService.update(payload.id, {
        contract_number:     payload.number?.trim() || payload.contract_number,
        client_id:           payload.client_id ?? payload.clientId,
        type:                payload.type,
        amount:              Number(payload.amount),
        down_payment:        Number(payload.down_payment ?? 0),
        total_months:        Number(payload.total_months ?? payload.totalM),
        contract_date:       payload.contract_date ?? payload.date,
        first_payment_date:  payload.first_payment_date ?? payload.firstPaymentDate ?? payload.date,
        expiration_date:     payload.expiration_date ?? payload.expirationDate ?? null,
        notes:               payload.notes?.trim() || null,
        seller_id:           payload.seller_id || null,
        down_payment_method: payload.down_payment_method || null,
        interest_rate:       Number(payload.interest_rate ?? 0),
        signed_date:         (payload.signed_date ?? payload.signedDate) || null,
        has_signed_docs:     Boolean(payload.has_signed_docs),
      });
    } else {
      savedContract = await contractService.create({
        contract_number:     payload.number?.trim() || undefined,
        client_id:           payload.client_id ?? payload.clientId,
        lot_id:              payload.lot_id || payload.lotId || payload.lot || undefined,
        type:                payload.type,
        amount:              Number(payload.amount ?? 0),
        down_payment:        Number(payload.down_payment ?? 0),
        interest_rate:       Number(payload.interest_rate ?? 0),
        total_months:        Number(payload.total_months ?? payload.totalM ?? 96),
        contract_date:       payload.contract_date ?? payload.date,
        first_payment_date:  payload.first_payment_date ?? payload.firstPaymentDate ?? payload.date,
        expiration_date:     (payload.expiration_date ?? payload.expirationDate) || undefined,
        seller_id:           payload.seller_id || undefined,
        down_payment_method: payload.down_payment_method || undefined,
        notes:               payload.notes || undefined,
        signed_date:         (payload.signed_date ?? payload.signedDate) || undefined,
        has_signed_docs:     Boolean(payload.has_signed_docs),
        calculator_id:       payload.calculator_id || undefined,
        calculator_vars:     payload.calculator_vars || undefined,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["contracts"] });
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
    await queryClient.invalidateQueries({ queryKey: ["lots"] });
    await queryClient.invalidateQueries({ queryKey: ["clients"] });
    await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });

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

    showToast(`Contrato ${payload.id ? "actualizado" : "registrado"}${docs.length > 0 ? ` · ${docs.length} doc${docs.length > 1 ? "s" : ""} subido${docs.length > 1 ? "s" : ""}` : ""}`);
    setEditingContract(null);
    setContractDraft(null);
    closeModal("contractModal");
  };

  const deleteContract = async (id) => {
    try {
      await contractService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      setEditingContract(null);
      setContractDraft(null);
      closeModal("contractModal");
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al eliminar el contrato"));
      return false;
    }
  };

  // ── Payments ──────────────────────────────────────────────────────────────
  const savePayment = async (data) => {
    let saved = false;
    if (data?.id) {
      saved = await quickPay(data.id, Number(data.amount || 0));
    } else {
      const match = payments.find(
        (p) =>
          String(p.contract?.id) === String(data.contractId) &&
          p.installment_n === Number(data.cuota) &&
          p.status !== "paid"
      );
      if (!match) {
        showToast("No se encontró la cuota indicada o ya está pagada");
        return false;
      }
      saved = await quickPay(match.id, Number(data.amount || match.amount || 0));
    }
    if (!saved) return false;
    setEditingPayment(null);
    setPaymentDraft(null);
    closeModal("paymentModal");
    return true;
  };

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
      showToast(`Exportación de ${type} descargada`);
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al exportar"));
      return false;
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
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al registrar el pago"));
      return false;
    }
  };

  const sendReminder = async (paymentOrName) => {
    const name = typeof paymentOrName === "string" ? paymentOrName : (paymentOrName?.client?.name || "cliente");
    if (!paymentOrName?.id) {
      showToast("Selecciona un pago para enviar el recordatorio");
      return false;
    }
    try {
      await paymentService.sendReminder(paymentOrName.id, { channel: "sms" });
      showToast(`Recordatorio enviado a ${name}`);
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "No se pudo enviar el recordatorio"));
      return false;
    }
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
      setDocumentDraft(null);
      closeModal("documentModal");
      return true;
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al subir el documento"));
      console.error("Upload error:", err?.response?.data);
      return false;
    }
  };

  const deleteDocument = async (id) => {
    try {
      await documentService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["documents-entity"] });
      await queryClient.invalidateQueries({ queryKey: ["document-folders"] });
      if (previewDocumentId === id) {
        setPreviewDocumentId(null);
        closeModal("documentPreview");
      }
      showToast("Documento eliminado");
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al eliminar el documento"));
    }
  };

  const downloadDocument = async (id, directUrl, name) => {
    try {
      const doc = documents.find((item) => item.id === id);
      const filename = name || filenameForDocument(doc) || "documento";
      const { blob } = await documentService.fetchBlob(id, {
        directUrl: directUrl || doc?.download_url,
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al descargar el documento"));
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
        const blob = await fetch(mapUrl).then((r) => r.blob());
        const file = new File([blob], "map.png", { type: blob.type || "image/png" });
        await inmuebleService.uploadMap(inmueble.id, file);
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
      setDraftProject(createEmptyDraftProject());
      navigate("/fraccionamientos");
      showToast(`Fraccionamiento "${name || "Fraccionamiento"}" creado${draftLots.length > 0 ? ` con ${draftLots.length} lote${draftLots.length !== 1 ? "s" : ""}` : ""}`);
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al crear el fraccionamiento"));
    }
  };

  const saveEditedFrac = async ({ name, sections, mapUrl, _editingFracId }) => {
    if (!_editingFracId) return;
    try {
      await inmuebleService.update(_editingFracId, {
        name: name?.trim() || "Fraccionamiento",
      });
      let mapUpdated = false;
      if (mapUrl && (mapUrl.startsWith("data:") || mapUrl.startsWith("blob:"))) {
        const blob = await fetch(mapUrl).then((r) => r.blob());
        const file = new File([blob], "map.png", { type: blob.type || "image/png" });
        await inmuebleService.uploadMap(_editingFracId, file);
        mapUpdated = true;
      }

      const patches = sections.flatMap((section) =>
        section.lots
          .filter((lot) => lot._backendId)
          .map((lot) => {
            const orig = lot._orig || {};
            const body = {};
            if (lot.status && lot.status !== (orig.status || "available")) body.status = lot.status;
            if (lot.code != null && String(lot.code) !== String(orig.code ?? "")) body.code = lot.code;
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

      const newLots = sections.flatMap((section) =>
        section.lots
          .filter((lot) => !lot._backendId)
          .map((lot) => ({
            _draftStatus: lot.status || "available",
            payload: {
              inmueble_id: _editingFracId,
              code: lot.code,
              area_m2: lot.area !== "" && lot.area != null ? Number(lot.area) : null,
              frente_ml: lot.frente !== "" && lot.frente != null ? Number(lot.frente) : null,
              fondo_ml: lot.fondo !== "" && lot.fondo != null ? Number(lot.fondo) : null,
              price_contado: lot.price !== "" && lot.price != null ? Number(lot.price) : null,
              price_financiado: lot.priceFinanciado !== "" && lot.priceFinanciado != null ? Number(lot.priceFinanciado) : null,
              services: lot.servicios
                ? Object.fromEntries(Object.entries(lot.servicios).filter(([, value]) => value))
                : {},
            },
          }))
      );

      await Promise.all(patches.map(({ id, body }) => lotService.update(id, body)));
      if (newLots.length > 0) {
        const result = await lotService.bulkCreate({
          inmueble_id: _editingFracId,
          lots: newLots.map(({ payload }) => payload),
        });
        await Promise.all(
          (result.lot_ids || [])
            .map((id, index) => ({ id, status: newLots[index]?._draftStatus }))
            .filter(({ status }) => status === "reserved")
            .map(({ id, status }) => lotService.update(id, { status }))
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      await queryClient.invalidateQueries({ queryKey: ["lots"] });
      setSelectedFracId(String(_editingFracId));
      setDraftProject(createEmptyDraftProject());
      navigate("/fraccionamientos");
      const lotChanges = patches.length + newLots.length;
      showToast(`Fraccionamiento actualizado${lotChanges ? ` · ${lotChanges} lote${lotChanges !== 1 ? "s" : ""}` : ""}${mapUpdated ? " · plano actualizado" : ""}`);
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al guardar los cambios"));
    }
  };

  const deleteFrac = async (id) => {
    try {
      await inmuebleService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      showToast("Fraccionamiento eliminado");
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al eliminar el fraccionamiento"));
    }
  };

  const startNewProject = () => {
    setDraftProject(createEmptyDraftProject());
    navigate("/lotes");
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const markAllNotificationsRead = async () => {
    try {
      await notificationService.markAllRead();
      refetchNotifications();
    } catch (err) {
      showToast(getUserErrorMessage(err, "Error al marcar notificaciones"));
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
    fracsResetKey,
    resetFracsView,
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
    calendarAlertCount,
    clearCalendarAlerts,
    openModal,
    closeModal,
    toggleSidebar,
    closeSidebar,
    showToast,
    canAccessApp: (appKey) => canAccessApp(currentUser, appKey),
    canUseFeature: (feature) => canUseFeature(currentUser, feature),
    login,
    register,
    verifyEmail,
    resendVerification,
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
