import axios from "axios";
import { PROPERTIES_BASE_URL } from "./propertiesApi";

const TOKEN_KEY = "ownterra_properties_portal_token";
const portalApi = axios.create({ baseURL: PROPERTIES_BASE_URL, timeout: 15000 });
portalApi.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const data = (request) => request.then((response) => response.data);

export const propertiesPortalService = {
  hasSession: () => Boolean(window.localStorage.getItem(TOKEN_KEY)),
  logout: () => window.localStorage.removeItem(TOKEN_KEY),
  login: async (credentials) => { const result = await data(portalApi.post("/portal/auth/login", credentials)); window.localStorage.setItem(TOKEN_KEY, result.access_token); return result; },
  acceptInvite: (body) => data(portalApi.post("/portal/auth/accept-invite", body)),
  me: () => data(portalApi.get("/portal/me")),
  units: () => data(portalApi.get("/portal/units")),
  statement: () => data(portalApi.get("/portal/statement")),
  announcements: () => data(portalApi.get("/portal/announcements")),
  markAnnouncementRead: (id) => data(portalApi.post(`/portal/announcements/${id}/read`)),
  votes: () => data(portalApi.get("/portal/votes")),
  vote: (id, optionId) => data(portalApi.post(`/portal/votes/${id}/ballot`, { option_id: optionId })),
  reserve: (body) => data(portalApi.post("/portal/reservations", body)),
  packages: () => data(portalApi.get("/portal/packages")),
};

export default propertiesPortalService;
