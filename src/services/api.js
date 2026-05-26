import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

const SESSION_KEY = "lm_session";

function getSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const session = getSession();
    if (!session?.refresh_token) {
      clearSession();
      window.location.href = "/";
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${BASE_URL}/auth/refresh`, { refresh_token: session.refresh_token })
        .then((r) => {
          const updated = {
            ...session,
            token: r.data.access_token,
            refresh_token: r.data.refresh_token,
          };
          saveSession(updated);
          return updated.token;
        })
        .catch(() => {
          clearSession();
          window.location.href = "/";
          return Promise.reject(new Error("Session expired"));
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

export default api;
