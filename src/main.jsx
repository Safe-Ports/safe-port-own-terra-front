import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/pwa/queryClient";
import { AppProvider } from "@/context/AppContext";
import App from "@/App";
import { initSentry, Sentry } from "@/observability/sentry";
import "@/styles/index.css";

initSentry();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <p style={{ padding: 24, fontFamily: "sans-serif" }}>
          Algo salió mal. Por favor recarga la página.
        </p>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppProvider>
            <App />
          </AppProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
