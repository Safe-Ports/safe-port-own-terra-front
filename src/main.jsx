import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/pwa/queryClient";
import { AppProvider } from "@/context/AppContext";
import App from "@/App";
import { initSentry } from "@/observability/sentry";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import "@/styles/index.css";

// En desarrollo, elimina cualquier service worker + caché que haya quedado de un
// build/preview de producción anterior en este origen. Un SW viejo secuestra el
// bundle y sirve código obsoleto (síntoma: cambios que no aparecen aunque el dev
// server ya los sirve). No aplica en prod, donde el SW de la PWA sí debe vivir.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

// Tras un deploy, los nombres de los chunks cambian. Un shell viejo (cacheado por
// la PWA) puede fallar al importar un chunk que ya no existe con ese nombre:
// "Failed to fetch dynamically imported module". Vite dispara `vite:preloadError`
// en ese caso; recargamos una vez para tomar la versión nueva (con guardia anti-bucle).
window.addEventListener("vite:preloadError", () => {
  const KEY = "vite_preload_reload_at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

initSentry();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppProvider>
            <App />
          </AppProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
