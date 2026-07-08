import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/layouts/AppShell";
import { useAppContext } from "@/context/AppContext";
import { getDeniedMessage } from "@/services/permissions";
import SupportWidget from "@/components/support/SupportWidget";

const EcosystemHub = lazy(() => import("@/pages/Ecosystem"));
const EcosystemClientes = lazy(() => import("@/pages/Ecosystem/Clientes"));
const EcosystemVault = lazy(() => import("@/pages/Ecosystem/Vault"));
const EcosystemDia = lazy(() => import("@/pages/Ecosystem/Dia"));
const EcosystemFinanzas = lazy(() => import("@/pages/Ecosystem/Finanzas"));
const EcosystemAgenda = lazy(() => import("@/pages/Ecosystem/Agenda"));
const EcosystemEquipo = lazy(() => import("@/pages/Ecosystem/Equipo"));
const EcosystemFormularios = lazy(() => import("@/pages/Ecosystem/Formularios"));
const EcosystemFormEditor = lazy(() => import("@/pages/Ecosystem/Formularios/Editor"));
const EcosystemFormRespuestas = lazy(() => import("@/pages/Ecosystem/Formularios/Respuestas"));
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const LotsPage = lazy(() => import("@/pages/Lots"));
const FracsPage = lazy(() => import("@/pages/Fracs"));
const ClientsPage = lazy(() => import("@/pages/Clients"));
const SalesPage = lazy(() => import("@/pages/Sales"));
const DocumentsPage = lazy(() => import("@/pages/Documents"));
const PaymentsPage = lazy(() => import("@/pages/Payments"));
const CalculatorPage = lazy(() => import("@/pages/Calculator"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const ReportsPage = lazy(() => import("@/pages/Reports"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-[28px] border border-[#DCDAD2] bg-white/88 px-5 py-4 text-sm font-semibold text-[#5A4E41] shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        Cargando espacio de trabajo...
      </div>
    </div>
  );
}

function RequireFeature({ feature, app, children }) {
  const { canAccessApp, canUseFeature } = useAppContext();
  const allowed = app ? canAccessApp(app) : canUseFeature(feature);

  if (!allowed) return <Navigate to="/sin-acceso" replace state={{ message: getDeniedMessage(feature || `${app}.read`) }} />;
  return children;
}

function AppRouter() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Navigate to="/ecosistema" replace />} />
          <Route path="/sin-acceso" element={<AccessDenied />} />
          <Route path="/ecosistema" element={<EcosystemHub />} />
          <Route path="/ecosistema/clientes" element={<RequireFeature feature="core.clients"><EcosystemClientes /></RequireFeature>} />
          <Route path="/ecosistema/documentos" element={<RequireFeature feature="core.vault"><EcosystemVault /></RequireFeature>} />
          <Route path="/ecosistema/mi-dia" element={<EcosystemDia />} />
          <Route path="/ecosistema/finanzas" element={<RequireFeature feature="core.finance"><EcosystemFinanzas /></RequireFeature>} />
          <Route path="/ecosistema/agenda" element={<EcosystemAgenda />} />
          <Route path="/ecosistema/equipo" element={<RequireFeature feature="core.team"><EcosystemEquipo /></RequireFeature>} />
          <Route path="/ecosistema/formularios" element={<RequireFeature feature="core.forms"><EcosystemFormularios /></RequireFeature>} />
          <Route path="/ecosistema/formularios/nuevo" element={<RequireFeature feature="core.forms"><EcosystemFormEditor /></RequireFeature>} />
          <Route path="/ecosistema/formularios/:id/editar" element={<RequireFeature feature="core.forms"><EcosystemFormEditor /></RequireFeature>} />
          <Route path="/ecosistema/formularios/:id/respuestas" element={<RequireFeature feature="core.forms"><EcosystemFormRespuestas /></RequireFeature>} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<RequireFeature app="lands"><DashboardPage /></RequireFeature>} />
            <Route path="/lotes" element={<RequireFeature app="lands"><LotsPage /></RequireFeature>} />
            <Route path="/fraccionamientos" element={<RequireFeature app="lands"><FracsPage /></RequireFeature>} />
            <Route path="/clientes" element={<RequireFeature feature="lands.clients"><ClientsPage /></RequireFeature>} />
            <Route path="/ventas" element={<RequireFeature feature="lands.sales"><SalesPage /></RequireFeature>} />
            <Route path="/contratos" element={<RequireFeature feature="lands.sales"><SalesPage /></RequireFeature>} />
            <Route path="/documentos" element={<RequireFeature feature="lands.documents"><DocumentsPage /></RequireFeature>} />
            <Route path="/alertas" element={<Navigate to="/pagos" replace />} />
            <Route path="/pagos" element={<RequireFeature feature="lands.payments"><PaymentsPage /></RequireFeature>} />
            <Route path="/reportes" element={<RequireFeature feature="lands.reports"><ReportsPage /></RequireFeature>} />
            <Route path="/calculadora" element={<RequireFeature app="lands"><CalculatorPage /></RequireFeature>} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/configuracion" element={<RequireFeature feature="core.config"><SettingsPage /></RequireFeature>} />
          </Route>
          <Route path="*" element={<Navigate to="/ecosistema" replace />} />
        </Routes>
      </Suspense>
      <SupportWidget />
    </>
  );
}

export default AppRouter;
