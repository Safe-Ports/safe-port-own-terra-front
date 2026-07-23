import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { queryClient } from "@/pwa/queryClient";
import { AppProvider } from "@/context/AppContext";
import App from "@/App";
import { initSentry } from "@/observability/sentry";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import "@/styles/index.css";

initSentry();

registerSW({
  immediate: true,
  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => {
      registration.update().catch(() => {
        // La aplicación sigue operativa offline; se reintentará al volver a
        // primer plano o en la siguiente verificación periódica.
      });
    };

    window.setInterval(checkForUpdate, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});

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
