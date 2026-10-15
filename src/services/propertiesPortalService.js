import axios from "axios";
import { BASE_URL as CORE_BASE_URL } from "./api";
import { PROPERTIES_BASE_URL } from "./propertiesApi";

// La identidad pertenece a Core; las consultas operativas a Properties.
// Esta sesión es de portal (aud=portal) y nunca utiliza lm_session de staff.
const SESSION_KEY = "ownterra_portal_session";
const LEGACY_TOKEN_KEY = "ownterra_properties_portal_token";
const authApi = axios.create({ baseURL: CORE_BASE_URL, timeout: 15000 });
const portalApi = axios.create({ baseURL: PROPERTIES_BASE_URL, timeout: 15000 });
const identityApi = axios.create({ baseURL: CORE_BASE_URL, timeout: 15000 });
let sessionGeneration = 0;
let refreshPromise = null;

function readSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY));
    if (session?.access_token) return session;
  } catch { /* Una captura antigua inválida no impide volver a entrar. */ }
  const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY);
  return legacy ? { access_token: legacy, refresh_token: null } : null;
}

function clearSession() {
  sessionGeneration += 1;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function saveSession(result) {
  if (!result?.access_token || !result?.refresh_token) {
    throw new Error("El servidor no devolvió una sesión de portal completa.");
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({
    access_token: result.access_token, refresh_token: result.refresh_token,
  }));
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function attachSession(config) {
  const session = readSession();
  if (session) config.headers.Authorization = `Bearer ${session.access_token}`;
  config._portalGeneration ??= sessionGeneration;
  config._portalToken = session?.access_token;
  return config;
}

async function refreshSession(session, generation) {
  if (!refreshPromise || refreshPromise.generation !== generation) {
    const entry = { generation, promise: null };
    entry.promise = authApi.post("/portal/auth/refresh", { refresh_token: session.refresh_token })
      .then(({ data }) => {
        // Logout o un nuevo login mientras renovábamos: no revivir la cuenta anterior.
        if (generation !== sessionGeneration || readSession()?.refresh_token !== session.refresh_token) {
          throw new axios.CanceledError("La sesión del portal cambió.");
        }
        saveSession(data);
        return data;
      })
      .catch(error => {
        if ([401, 403].includes(error.response?.status) && generation === sessionGeneration) clearSession();
        throw error;
      })
      .finally(() => { if (refreshPromise === entry) refreshPromise = null; });
    refreshPromise = entry;
  }
  return refreshPromise.promise;
}

async function handleSessionError(error, client) {
  const request = error.config;
  if (error.response?.status !== 401 || !request || request._portalRetry) throw error;
  if (request._portalGeneration !== sessionGeneration) throw error;
  const session = readSession();
  if (!session?.refresh_token) { clearSession(); throw error; }
  request._portalRetry = true;
  // Otra consulta de la misma sesión pudo completar ya el único refresh.
  if (request._portalToken === session.access_token) await refreshSession(session, sessionGeneration);
  if (request._portalGeneration !== sessionGeneration || !readSession()) throw error;
  try { return await client(request); }
  catch (retryError) {
    if (retryError.response?.status === 401 && request._portalGeneration === sessionGeneration) clearSession();
    throw retryError;
  }
}

for (const client of [portalApi, identityApi]) {
  client.interceptors.request.use(attachSession);
  client.interceptors.response.use(response => response, error => handleSessionError(error, client));
}

const data = request => request.then(response => response.data);
export const propertiesPortalService = {
  hasSession: () => Boolean(readSession()),
  logout: clearSession,
  login: async credentials => {
    clearSession();
    const generation = sessionGeneration;
    const result = await data(authApi.post("/portal/auth/login", credentials));
    if (generation !== sessionGeneration) throw new axios.CanceledError("La sesión del portal cambió.");
    saveSession(result);
    return result;
  },
  acceptInvite: body => data(authApi.post("/portal/auth/accept-invite", body)),
  forgotPassword: email => data(authApi.post("/portal/auth/forgot-password", { email })),
  resetPassword: body => data(authApi.post("/portal/auth/reset-password", body)),
  identity: () => data(identityApi.get("/portal/auth/me")),
  me: () => data(portalApi.get("/portal/me")),
  units: () => data(portalApi.get("/portal/units")),
  relations: () => data(portalApi.get("/portal/relations")),
  statement: () => data(portalApi.get("/portal/statement")),
  announcements: () => data(portalApi.get("/portal/announcements")),
  markAnnouncementRead: id => data(portalApi.post(`/portal/announcements/${id}/read`)),
  votes: () => data(portalApi.get("/portal/votes")),
  vote: (id, optionId) => data(portalApi.post(`/portal/votes/${id}/ballot`, { option_id: optionId })),
  reserve: body => data(portalApi.post("/portal/reservations", body)),
  packages: () => data(portalApi.get("/portal/packages")),
  tickets: () => data(portalApi.get("/portal/tickets")),
  createTicket: body => data(portalApi.post("/portal/tickets", body)),
  createVisitor: body => data(portalApi.post("/portal/visitors", body)),
};
export default propertiesPortalService;
