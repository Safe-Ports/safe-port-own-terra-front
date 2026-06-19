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
