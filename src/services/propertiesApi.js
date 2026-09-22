import axios from "axios";
import { readSessionTokens } from "./api";

const configuredBaseUrl = import.meta.env.VITE_PROPERTIES_API_URL?.trim();
export const PROPERTIES_BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8001/api/v1" : "");

if (!PROPERTIES_BASE_URL) {
  throw new Error("VITE_PROPERTIES_API_URL es obligatoria para el módulo Properties");
}

const propertiesApi = axios.create({ baseURL: PROPERTIES_BASE_URL, timeout: 15000 });

propertiesApi.interceptors.request.use((config) => {
  const tokens = readSessionTokens();
  if (tokens?.token) config.headers.Authorization = `Bearer ${tokens.token}`;
  return config;
});

export default propertiesApi;
