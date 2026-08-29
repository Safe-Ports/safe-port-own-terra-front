import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentState } from "@/hooks/usePersistentState";
import api from "@/services/api";
import { clientService } from "@/services/clientService";
import { inmuebleService } from "@/services/inmuebleService";
import { mapFileFromUrl } from "@/utils/mapImage";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";
import { paymentService } from "@/services/paymentService";
import { documentService, filenameForDocument, toBackendEntityType } from "@/services/documentService";
import { notificationService } from "@/services/notificationService";
import { appointmentService } from "@/services/appointmentService";
import { folderService } from "@/services/folderService";
import { createEmptyDraftProject } from "@/services/draftProject";
import { canAccessApp, canUseFeature } from "@/services/permissions";
import { parseApiError } from "@/errors/parseApiError";

const AG_SEEN_KEY = "ag_triggered_seen";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = usePersistentState("lm_session", null);

  // ── Rehidratación de sesión (fuente de verdad = backend) ────────────────────
  // La sesión persiste en localStorage, pero role/permissions/apps pueden quedar
  // viejos o incompletos (login anterior, cambio de permisos server-side). Al
  // arrancar, si hay token, revalidamos contra /auth/me y refrescamos esos campos.
  // Así una sesión desactualizada se autocorrige sola, sin pedirle nada al usuario.
  // Mientras resuelve, authHydrating bloquea a los guards de ruta para que no
  // manden a "sin acceso" con datos aún sin refrescar.
  const [authHydrating, setAuthHydrating] = useState(() => Boolean(currentUser?.token));
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    if (!currentUser?.token) {
      setAuthHydrating(false);
      return;
    }
    // Sin flag `cancelled`: con StrictMode (doble montaje en dev) el cleanup del
    // primer montaje cancelaría esta única petición (didHydrateRef evita relanzarla),
    // dejando authHydrating en true para siempre. AppProvider es raíz y no se
    // desmonta en runtime, así que aplicar el estado al resolver es seguro.
    api
      .get("/auth/me")
      .then(({ data }) => {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                id: String(data.user.id),
                name: data.user.name,
                initials: data.user.initials || data.user.name.slice(0, 2).toUpperCase(),
                email: data.user.email,
                role: data.user.role,
                color: data.user.color,
                avatar_url: data.user.avatar_url,
                apps: data.user.apps || data.user.user_apps || [],
                permissions: data.user.permissions || [],
                tours_seen: data.user.tours_seen || [],
                organization: data.organization,
              }
            : prev
        );
      })
      .catch(() => {
        // 401 lo maneja el interceptor de api.js (refresh o logout). Ante otros
        // fallos (red), conservamos la sesión cacheada para no desloguear por un hipo.
      })
      .finally(() => setAuthHydrating(false));
    // Solo en el montaje: revalidar una vez por carga de la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser && !authHydrating,
  });
  const clients = clientsData || [];

  const { data: fracsData, isLoading: fracsLoading } = useQuery({
    queryKey: ["inmuebles"],
    queryFn: () => inmuebleService.list({ limit: 50 }).then((r) => r.items),
    enabled: !!currentUser && !authHydrating,
  });
  const fracs = fracsData || [];

  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => contractService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser && !authHydrating,
  });
  const contracts = contractsData || [];

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentService.list({ limit: 200 }).then((r) => r.items),
    enabled: !!currentUser && !authHydrating,
  });
  const payments = paymentsData || [];

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentService.list({ limit: 100 }).then((r) => r.items),
    enabled: !!currentUser && !authHydrating,
  });
  const documents = documentsData || [];

  const { data: notificationCount = 0, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.unreadCount(),
    enabled: !!currentUser && !authHydrating,
    refetchInterval: 60_000,
    retry: 0,
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
    enabled: !!currentUser && !authHydrating,
    refetchInterval: 60_000,
    retry: 0,
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
  // Barra lateral en modo riel (solo iconos). Persiste porque es una preferencia
  // de espacio de trabajo: quien la colapsa no quiere volver a hacerlo cada vez.
  // Solo aplica en escritorio; en móvil la barra ya es un cajón con backdrop.
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("lm_sidebar_collapsed", false);
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
  // Memoizadas: un consumidor que las ponga en las dependencias de un useEffect
  // —para mostrar el error de una consulta, por ejemplo— entraba en bucle. El
  // toast re-renderiza el provider, eso cambiaba la identidad de la función, y
  // el efecto volvía a dispararse sin fin.
  const toastTimer = useRef(null);
  const showToast = useCallback((message, kind = "success") => {
    setToast(typeof message === "object" ? message : { kind, message });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
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

  // Muestra un error homologado (código + Ref + copiar). El reporte a Sentry lo hace el
  // interceptor de api.js, así que aquí solo presentamos. Dura más para dar tiempo a copiar.
  // Marca un tutorial guiado como visto. La verdad vive en el servidor para que no
  // reaparezca al cambiar de navegador; aquí actualizamos la sesión local de
  // inmediato para que el tour no pueda relanzarse mientras vuelve la respuesta.
  const markTourSeen = async (key) => {
    setCurrentUser((prev) =>
      prev && !(prev.tours_seen || []).includes(key)
        ? { ...prev, tours_seen: [...(prev.tours_seen || []), key] }
        : prev
    );
    try {
      await api.post(`/auth/me/tours/${key}`);
    } catch {
      // Si falla, el usuario ya no verá el tour en esta sesión y volverá a verlo en
      // la siguiente: preferible a interrumpirlo con un error por algo secundario.
    }
  };

  // Aplica cambios locales al usuario en sesión (ej. tras subir un avatar) sin
  // esperar a que vuelva /auth/me — mismo patrón que markTourSeen.
  const updateCurrentUser = (partial) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const showError = useCallback((error, fallbackMessage) => {
    const parsed = parseApiError(error, fallbackMessage);
    setToast({ kind: "error", ...parsed });
    // El temporizador vive en un ref, no colgado de la función: antes se perdía
    // en cada render y el toast anterior nunca se cancelaba.
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 9000);
    return parsed;
  }, []);

  // Aviso global de tope de plan (OT-SUB-4001): el interceptor de api.js emite este
  // evento en cualquier escritura bloqueada por cuota; aquí lo presentamos con el
  // mensaje homologado ("Alcanzaste el límite… Mejora tu plan para agregar más").
  useEffect(() => {
    const onQuota = (e) => {
      const parsed = parseApiError({ response: { data: e.detail } });
      setToast({ kind: "error", ...parsed });
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => setToast(null), 9000);
    };
    window.addEventListener("ownterra:quota-exceeded", onQuota);
    return () => window.removeEventListener("ownterra:quota-exceeded", onQuota);
  }, []);

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
      color: data.user.color,
      avatar_url: data.user.avatar_url,
      apps: data.user.apps || data.user.user_apps || [],
      permissions: data.user.permissions || [],
      tours_seen: data.user.tours_seen || [],
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
      const parsed = parseApiError(err, "No pudimos iniciar sesión.");
      if (parsed.code === "OT-AUTH-2005") {
        return { ok: false, needsVerification: true, email: identifier, msg: parsed.message, error: parsed };
      }
      return { ok: false, msg: parsed.message, error: parsed };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const { data } = await api.post("/auth/verify-email", { token });
      applyAuthSession(data, true);
      return { ok: true };
    } catch (err) {
      const parsed = parseApiError(err, "Enlace de verificación inválido o expirado");
      return { ok: false, msg: parsed.message, error: parsed };
    }
  };

  const resendVerification = async (email) => {
    try {
      await api.post("/auth/resend-verification", { email });
      return { ok: true };
    } catch (err) {
      const parsed = parseApiError(err, "No se pudo reenviar el correo");
      return { ok: false, msg: parsed.message, error: parsed };
    }
  };

  const register = async ({ organization_name, name, email, password }) => {
    try {
      const { data } = await api.post("/auth/register", { organization_name, name, email, password });
      // Flujo bloqueante: el backend no devuelve tokens, el usuario debe confirmar su correo.
      return { ok: true, pendingVerification: true, email: data.email || email };
    } catch (err) {
      const parsed = parseApiError(err, "No pudimos crear la cuenta.");
      return { ok: false, msg: parsed.message, error: parsed };
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

  const resetPassword = async (token, newPassword) => {
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword });
      return { ok: true };
    } catch (err) {
      const parsed = parseApiError(err, "El enlace es inválido o expiró. Solicita uno nuevo.");
      return { ok: false, msg: parsed.message, error: parsed };
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
        // El schema de actualización no acepta `type` (el tipo no cambia en edición);
        // enviarlo dispara un 422 por "campo extra no permitido".
        const { type: _omitType, ...updateBody } = body;
        await clientService.update(payload.id, updateBody);
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
          showError(err, "Cliente creado en el Core, pero no se pudo vincular a Lands");
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
      showError(err, fallback);
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
      showError(err, "Error al eliminar el cliente");
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
        first_payment_date:  payload.first_payment_date ?? payload.firstPaymentDate ?? payload.date,
        expiration_date:     (payload.expiration_date ?? payload.expirationDate) || undefined,
        seller_id:           payload.seller_id || undefined,
        down_payment_method: payload.down_payment_method || undefined,
        notes:               payload.notes || undefined,
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

    const conDocs = docs.length > 0 ? ` · ${docs.length} doc${docs.length > 1 ? "s" : ""} subido${docs.length > 1 ? "s" : ""}` : "";
    // Un colaborador tiene que enterarse de que su contrato todavía no está
    // vigente: decirle sólo "registrado" lo dejaría creyendo que la venta cerró.
    if (savedContract?.status === "pending_approval") {
      showToast(`Contrato enviado a aprobación${conDocs}. El lote queda apartado hasta que un administrador lo autorice.`);
    } else {
      showToast(`Contrato ${payload.id ? "actualizado" : "registrado"}${conDocs}`);
    }
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
      showError(err, "Error al eliminar el contrato");
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
      showError(err, "Error al exportar");
    }
  };

  const quickPay = async (paymentId, amount, file) => {
    try {
      await paymentService.markPaid(paymentId, {
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: "transfer",
        amount_paid: amount,
      });
      // El comprobante va aparte y no bloquea: si falla la subida, el cobro ya
      // quedó registrado y el papel se puede adjuntar después.
      if (file) {
        try {
          await paymentService.uploadReceipt(paymentId, file);
        } catch {
          showToast("Cobro registrado, pero no se pudo subir el comprobante");
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      showToast("Pago registrado correctamente");
      return true;
    } catch (err) {
      showError(err, "Error al registrar el pago");
    }
  };

  const collectOnContract = async (contractId, { amount, paymentIds, file } = {}) => {
    try {
      const data = await paymentService.collect(contractId, {
        amount,
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: "transfer",
        ...(paymentIds?.length ? { payment_ids: paymentIds } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (file && data?.receipt_id) {
        try {
          await paymentService.uploadCollectReceipt(data.receipt_id, file);
        } catch {
          showToast("Cobro registrado, pero no se pudo subir el comprobante");
        }
      }
      const n = data.installments?.length || 0;
      showToast(n > 1 ? `Cobro registrado en ${n} cuotas` : "Pago registrado correctamente");
      return data;
    } catch (err) {
      showError(err, "Error al registrar el cobro");
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
      showError(err, "No se pudo enviar el recordatorio");
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
      showError(err, "Error al subir el documento");
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
      showError(err, "Error al eliminar el documento");
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
      showError(err, "Error al descargar el documento");
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
  // Primer paso del asistente ("Guardar y continuar" en la pantalla de nombre+plano):
  // crea el inmueble DE VERDAD, de inmediato — a propósito, para que sea una acción
  // explícita del usuario y no un efecto secundario de elegir un archivo (ese fue
  // justo el bug reportado antes). Es una sola llamada atómica: si falla (p. ej. tope
  // de fraccionamientos del plan), no se crea nada y no hay nada que revertir.
  //
  // A partir de aquí el fraccionamiento YA EXISTE, así que agregar lotes (a mano o por
  // Excel) es una operación aparte y también atómica — sigue el mismo camino que editar
  // un fraccionamiento ya existente (saveEditedFrac): si el tope de lotes la rechaza,
  // el fraccionamiento (nombre + plano) se queda intacto, sin necesitar revertir nada.
  const createFracDraft = async ({ name, mapUrl }) => {
    try {
      const inmueble = await inmuebleService.create({ name: name?.trim() || "Fraccionamiento" });
      let mapUploadError = null;
      if (mapUrl) {
        try {
          const file = await mapFileFromUrl(mapUrl);
          await inmuebleService.uploadMap(inmueble.id, file);
        } catch (error) {
          mapUploadError = error;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      setDraftProject((previous) => ({
        ...previous,
        name: name?.trim() || "Fraccionamiento",
        _editingFracId: inmueble.id,
        mode: "editor",
      }));
      if (mapUploadError) {
        showError(mapUploadError, "El fraccionamiento se guardó, pero el plano no pudo subirse — puedes intentarlo de nuevo desde el tablero.");
      } else {
        showToast(`Fraccionamiento "${name?.trim() || "Fraccionamiento"}" guardado — ahora agrega tus lotes`);
      }
    } catch (err) {
      showError(err, "Error al guardar el fraccionamiento");
    }
  };

  const saveEditedFrac = async ({ name, sections, mapUrl, _editingFracId }) => {
    if (!_editingFracId) return;
    try {
      await inmuebleService.update(_editingFracId, {
        name: name?.trim() || "Fraccionamiento",
      });
      let mapUpdated = false;
      let mapUploadError = null;
      if (mapUrl && (mapUrl.startsWith("data:") || mapUrl.startsWith("blob:"))) {
        try {
          const file = await mapFileFromUrl(mapUrl);
          await inmuebleService.uploadMap(_editingFracId, file);
          mapUpdated = true;
        } catch (error) {
          mapUploadError = error;
        }
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
      if (mapUploadError) {
        showError(mapUploadError, "No se pudo actualizar el plano");
      } else {
        showToast(`Fraccionamiento actualizado${lotChanges ? ` · ${lotChanges} lote${lotChanges !== 1 ? "s" : ""}` : ""}${mapUpdated ? " · plano actualizado" : ""}`);
      }
    } catch (err) {
      showError(err, "Error al guardar los cambios");
    }
  };

  const deleteFrac = async (id) => {
    try {
      await inmuebleService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["inmuebles"] });
      showToast("Fraccionamiento eliminado");
    } catch (err) {
      showError(err, "Error al eliminar el fraccionamiento");
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
      showError(err, "Error al marcar notificaciones");
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
    authHydrating,
    clients,
    fracs,
    contracts,
    payments,
    documents,
    // Flags de carga (primer fetch) para mostrar skeletons en las páginas.
    clientsLoading,
    fracsLoading,
    contractsLoading,
    paymentsLoading,
    documentsLoading,
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
    sidebarCollapsed,
    toggleSidebarCollapsed: () => setSidebarCollapsed((v) => !v),
    showToast,
    showError,
    canAccessApp: (appKey) => canAccessApp(currentUser, appKey),
    canUseFeature: (feature) => canUseFeature(currentUser, feature),
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    markTourSeen,
    updateCurrentUser,
    logout,
    saveClient,
    deleteClient,
    saveContract,
    deleteContract,
    openContractCreate,
    resetContractDraft,
    quickPay,
    collectOnContract,
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
    createFracDraft,
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
