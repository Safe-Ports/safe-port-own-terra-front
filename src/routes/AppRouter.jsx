import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/layouts/AppShell";

const EcosystemHub = lazy(() => import("@/pages/Ecosystem"));
const EcosystemClientes = lazy(() => import("@/pages/Ecosystem/Clientes"));
const EcosystemVault = lazy(() => import("@/pages/Ecosystem/Vault"));
const EcosystemDia = lazy(() => import("@/pages/Ecosystem/Dia"));
const EcosystemFinanzas = lazy(() => import("@/pages/Ecosystem/Finanzas"));
const EcosystemAgenda = lazy(() => import("@/pages/Ecosystem/Agenda"));
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const LotsPage = lazy(() => import("@/pages/Lots"));
const FracsPage = lazy(() => import("@/pages/Fracs"));
const ClientsPage = lazy(() => import("@/pages/Clients"));
const SalesPage = lazy(() => import("@/pages/Sales"));
const DocumentsPage = lazy(() => import("@/pages/Documents"));
const AlertsPage = lazy(() => import("@/pages/Alerts"));
const PaymentsPage = lazy(() => import("@/pages/Payments"));
const CalculatorPage = lazy(() => import("@/pages/Calculator"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const PaymentsPreview = lazy(() => import("@/pages/PaymentsPreview"));
const ReportsPage = lazy(() => import("@/pages/Reports"));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-[28px] border border-[#DCDAD2] bg-white/88 px-5 py-4 text-sm font-semibold text-[#5A4E41] shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        Cargando espacio de trabajo...
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<Navigate to="/ecosistema" replace />} />
        <Route path="/ecosistema" element={<EcosystemHub />} />
        <Route path="/ecosistema/clientes" element={<EcosystemClientes />} />
        <Route path="/ecosistema/documentos" element={<EcosystemVault />} />
        <Route path="/ecosistema/mi-dia" element={<EcosystemDia />} />
        <Route path="/ecosistema/finanzas" element={<EcosystemFinanzas />} />
        <Route path="/ecosistema/agenda" element={<EcosystemAgenda />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lotes" element={<LotsPage />} />
          <Route path="/fraccionamientos" element={<FracsPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/contratos" element={<SalesPage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/alertas" element={<AlertsPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/pagos-preview" element={<PaymentsPreview />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/calculadora" element={<CalculatorPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/ecosistema" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
