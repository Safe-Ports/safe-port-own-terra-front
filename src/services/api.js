import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const session = window.localStorage.getItem("lm_session");

  if (session) {
    try {
      const user = JSON.parse(session);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch (error) {
      console.error("No se pudo leer el token de sesión", error);
    }
  }

  return config;
});

export default api;
