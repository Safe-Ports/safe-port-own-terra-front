import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/layouts/AppShell";
import FinanceShell from "@/layouts/FinanceShell";
import { useAppContext } from "@/context/AppContext";
import { getDeniedMessage } from "@/services/permissions";
import SupportWidget from "@/components/support/SupportWidget";
import GuidedTour from "@/components/tour/GuidedTour";
import { lazyWithRetry } from "@/routes/lazyWithRetry";

const EcosystemHub = lazyWithRetry(() => import("@/pages/Ecosystem"));
const EcosystemClientes = lazyWithRetry(() => import("@/pages/Ecosystem/Clientes"));
const EcosystemVault = lazyWithRetry(() => import("@/pages/Ecosystem/Vault"));
const EcosystemDia = lazyWithRetry(() => import("@/pages/Ecosystem/Dia"));
const FinanceDashboard = lazyWithRetry(() => import("@/pages/Finance/Dashboard"));
const FinanceTransacciones = lazyWithRetry(() => import("@/pages/Finance/Transacciones"));
const FinanceCuentasPorCobrar = lazyWithRetry(() => import("@/pages/Finance/CuentasPorCobrar"));
const FinanceCuentasPorPagar = lazyWithRetry(() => import("@/pages/Finance/CuentasPorPagar"));
const FinanceNomina = lazyWithRetry(() => import("@/pages/Finance/Nomina"));
const FinanceReportes = lazyWithRetry(() => import("@/pages/Finance/Reportes"));
const EcosystemAgenda = lazyWithRetry(() => import("@/pages/Ecosystem/Agenda"));
const EcosystemEquipo = lazyWithRetry(() => import("@/pages/Ecosystem/Equipo"));
const EcosystemProveedores = lazyWithRetry(() => import("@/pages/Ecosystem/Proveedores"));
const EcosystemFormularios = lazyWithRetry(() => import("@/pages/Ecosystem/Formularios"));
const EcosystemFormEditor = lazyWithRetry(() => import("@/pages/Ecosystem/Formularios/Editor"));
const EcosystemFormRespuestas = lazyWithRetry(() => import("@/pages/Ecosystem/Formularios/Respuestas"));
const EcosystemConfiguracion = lazyWithRetry(() => import("@/pages/Ecosystem/Configuracion"));
const EcosystemPerfil = lazyWithRetry(() => import("@/pages/Ecosystem/Perfil"));
const DashboardPage = lazyWithRetry(() => import("@/pages/Dashboard"));
const LotsPage = lazyWithRetry(() => import("@/pages/Lots"));
const FracsPage = lazyWithRetry(() => import("@/pages/Fracs"));
const LotTrackPage = lazyWithRetry(() => import("@/pages/LotTrack"));
const ClientsPage = lazyWithRetry(() => import("@/pages/Clients"));
const SalesPage = lazyWithRetry(() => import("@/pages/Sales"));
const DocumentsPage = lazyWithRetry(() => import("@/pages/Documents"));
const PaymentsPage = lazyWithRetry(() => import("@/pages/Payments"));
const CalculatorPage = lazyWithRetry(() => import("@/pages/Calculator"));
const ProfilePage = lazyWithRetry(() => import("@/pages/Profile"));
const SettingsPage = lazyWithRetry(() => import("@/pages/Settings"));
const ReportsPage = lazyWithRetry(() => import("@/pages/Reports"));
const PricingPage = lazyWithRetry(() => import("@/pages/Pricing"));
const AccessDenied = lazyWithRetry(() => import("@/pages/AccessDenied"));
const PropertiesDashboard = lazyWithRetry(() => import("@/apps/properties/features/dashboard/PropertiesDashboard"));
const PropertiesOperationsHub = lazyWithRetry(() => import("@/apps/properties/features/dashboard/PropertiesOperationsHub"));
const OwnersPage = lazyWithRetry(() => import("@/apps/properties/features/owners/OwnersPage"));
const PropertiesPage = lazyWithRetry(() => import("@/apps/properties/features/properties/PropertiesPage"));
const UnitsPage = lazyWithRetry(() => import("@/apps/properties/features/units/UnitsPage"));
const PropertyModulePreview = lazyWithRetry(() => import("@/apps/properties/features/modules/ModulePreviewPage"));
const PortfolioWorkspace = lazyWithRetry(() => import("@/apps/properties/features/portfolio/PortfolioWorkspace"));
const TicketsPage = lazyWithRetry(() => import("@/apps/properties/features/tickets/TicketsPage"));
const AccessControlPage = lazyWithRetry(() => import("@/apps/properties/features/access/AccessControlPage"));
const RentOperationsPage = lazyWithRetry(() => import("@/apps/properties/features/rent/RentOperationsPage"));
const RentalListingsPage = lazyWithRetry(() => import("@/apps/properties/features/listings/RentalListingsPage"));
const HospitalityOperationsPage = lazyWithRetry(() => import("@/apps/properties/features/hospitality/HospitalityOperationsPage"));
const ServiceNetworkPage = lazyWithRetry(() => import("@/apps/properties/features/service/ServiceNetworkPage"));
const CommunityWorkspace = lazyWithRetry(() => import("@/apps/properties/features/community/CommunityWorkspace"));
const CondoOperationsSuite = lazyWithRetry(() => import("@/apps/properties/features/condo/CondoOperationsSuite"));
const ServicePartnerPortal = lazyWithRetry(() => import("@/apps/properties/external/ServicePartnerPortal"));
const ServiceLogin = lazyWithRetry(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceLogin })));
const ServiceInvitation = lazyWithRetry(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceInvitation })));
const ServiceRegistration = lazyWithRetry(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceRegistration })));
const TenantPortal = lazyWithRetry(() => import("@/apps/properties/external/TenantPortal"));
const CommunityPortal = lazyWithRetry(() => import("@/apps/properties/external/CommunityPortal"));
const PropertiesModule = lazyWithRetry(() => import("@/apps/properties/PropertiesModule"));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-[28px] border border-[#E2E7E5] bg-white/88 px-5 py-4 text-sm font-semibold text-[#3F4644] shadow-[0_18px_40px_rgba(30,61,43,.08)]">
        Cargando espacio de trabajo...
      </div>
    </div>
  );
}

function RequireFeature({ feature, app, children }) {
  const { canAccessApp, canUseFeature, authHydrating } = useAppContext();

  // Aún revalidando la sesión contra /auth/me: no decidir con datos posiblemente
  // viejos (evita mandar a "sin acceso" a un admin legítimo con sesión cacheada).
  if (authHydrating) return <PageLoader />;

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
          {/* Página de planes a pantalla completa (fuera del AppShell, sin sidebar) */}
          <Route path="/planes" element={<RequireFeature feature="core.config"><PricingPage /></RequireFeature>} />
          <Route path="/ecosistema" element={<EcosystemHub />} />
          <Route path="/portal-servicio" element={<ServicePartnerPortal />} />
          <Route path="/servicio/login" element={<ServiceLogin />} />
          <Route path="/servicio/invitacion" element={<ServiceInvitation />} />
          <Route path="/servicio/registro" element={<ServiceRegistration />} />
          <Route path="/portal-inquilino" element={<TenantPortal />} />
          <Route path="/portal-comunidad" element={<RequireFeature app="properties"><CommunityPortal /></RequireFeature>} />
          <Route path="/ecosistema/clientes" element={<RequireFeature feature="core.clients"><EcosystemClientes /></RequireFeature>} />
          <Route path="/ecosistema/documentos" element={<RequireFeature feature="core.vault"><EcosystemVault /></RequireFeature>} />
          <Route path="/ecosistema/mi-dia" element={<EcosystemDia />} />
          {/* Finanzas dejó de ser una página del Core — es su propia app,
              con shell propio (ver más abajo). Se deja el redirect por si
              queda algún link viejo guardado. */}
          <Route path="/ecosistema/finanzas" element={<Navigate to="/finanzas" replace />} />
          <Route path="/ecosistema/agenda" element={<EcosystemAgenda />} />
          <Route path="/ecosistema/equipo" element={<RequireFeature feature="core.team"><EcosystemEquipo /></RequireFeature>} />
          <Route path="/ecosistema/proveedores" element={<RequireFeature feature="core.providers"><EcosystemProveedores /></RequireFeature>} />
          <Route path="/ecosistema/formularios" element={<RequireFeature feature="core.forms"><EcosystemFormularios /></RequireFeature>} />
          <Route path="/ecosistema/formularios/nuevo" element={<RequireFeature feature="core.forms"><EcosystemFormEditor /></RequireFeature>} />
          <Route path="/ecosistema/formularios/:id/editar" element={<RequireFeature feature="core.forms"><EcosystemFormEditor /></RequireFeature>} />
          <Route path="/ecosistema/formularios/:id/respuestas" element={<RequireFeature feature="core.forms"><EcosystemFormRespuestas /></RequireFeature>} />
          {/* Misma página que /configuracion, servida con el shell del Core para
              quien entra desde el Ecosistema (ver Ecosystem/Configuracion.jsx). */}
          <Route path="/ecosistema/configuracion" element={<RequireFeature feature="core.config"><EcosystemConfiguracion /></RequireFeature>} />
          {/* El perfil es transversal y conserva el shell del Core. */}
          <Route path="/ecosistema/perfil" element={<EcosystemPerfil />} />
          <Route path="/properties" element={<RequireFeature app="properties"><PropertiesModule /></RequireFeature>}>
            <Route index element={<PropertiesDashboard />} />
            <Route path="operacion" element={<PropertiesOperationsHub />} />
            <Route path="propietarios" element={<RequireFeature feature="properties.owners.read"><OwnersPage /></RequireFeature>} />
            <Route path="inmuebles" element={<RequireFeature feature="properties.properties.read"><PropertiesPage /></RequireFeature>} />
            <Route path="unidades" element={<RequireFeature feature="properties.units.read"><UnitsPage /></RequireFeature>} />
            <Route path="portafolio" element={<RequireFeature feature="properties.properties.read"><PortfolioWorkspace /></RequireFeature>} />
            {/* El tablero de estatus ahora es una vista dentro de Unidades (?view=board), no una página aparte. */}
            <Route path="estatus-unidades" element={<Navigate to="/properties/unidades?view=board" replace />} />
            <Route path="tickets" element={<RequireFeature feature="properties.units.read"><TicketsPage /></RequireFeature>} />
            <Route path="accesos" element={<RequireFeature feature="properties.units.read"><AccessControlPage /></RequireFeature>} />
            <Route path="rentas" element={<RequireFeature feature="properties.rent.read"><RentOperationsPage /></RequireFeature>} />
            <Route path="publicaciones" element={<RequireFeature feature="properties.rent.read"><RentalListingsPage /></RequireFeature>} />
            <Route path="rentas/hospedaje" element={<RequireFeature feature="properties.rent.read"><HospitalityOperationsPage /></RequireFeature>} />
            <Route path="responsables" element={<RequireFeature feature="properties.units.read"><ServiceNetworkPage /></RequireFeature>} />
            <Route path="comunidades" element={<RequireFeature feature="properties.properties.read"><CommunityWorkspace /></RequireFeature>} />
            <Route path="comunidades/operacion" element={<RequireFeature feature="properties.properties.read"><CondoOperationsSuite /></RequireFeature>} />
            <Route path="condominios" element={<Navigate to="/properties/comunidades" replace />} />
            <Route path="condominios/operacion" element={<Navigate to="/properties/comunidades/operacion" replace />} />
            <Route path="modulos/:moduleKey" element={<PropertyModulePreview />} />
          </Route>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<RequireFeature app="lands"><DashboardPage /></RequireFeature>} />
            {/* Carga de Lotes y Calculadora son pantallas de administración: crean
                el inventario y definen la fórmula con la que se vende. Piden
                "write" —que el rol seller no tiene— en vez de sólo acceso a Lands.
                El vendedor sigue usando la fórmula activa al armar un contrato; lo
                que no puede es definirla. */}
            <Route path="/lotes" element={<RequireFeature feature="lands.write"><LotsPage /></RequireFeature>} />
            <Route path="/fraccionamientos" element={<RequireFeature app="lands"><FracsPage /></RequireFeature>} />
            <Route path="/track-lotes" element={<RequireFeature app="lands"><LotTrackPage /></RequireFeature>} />
            <Route path="/clientes" element={<RequireFeature feature="lands.clients"><ClientsPage /></RequireFeature>} />
            <Route path="/ventas" element={<RequireFeature feature="lands.sales"><SalesPage /></RequireFeature>} />
            <Route path="/contratos" element={<RequireFeature feature="lands.sales"><SalesPage /></RequireFeature>} />
            <Route path="/documentos" element={<RequireFeature feature="lands.documents"><DocumentsPage /></RequireFeature>} />
            <Route path="/alertas" element={<Navigate to="/pagos" replace />} />
            <Route path="/pagos" element={<RequireFeature feature="lands.payments"><PaymentsPage /></RequireFeature>} />
            <Route path="/reportes" element={<RequireFeature feature="lands.reports"><ReportsPage /></RequireFeature>} />
            <Route path="/calculadora" element={<RequireFeature feature="lands.write"><CalculatorPage /></RequireFeature>} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/configuracion" element={<RequireFeature feature="core.config"><SettingsPage /></RequireFeature>} />
          </Route>
          <Route element={<FinanceShell />}>
            <Route path="/finanzas" element={<RequireFeature app="finanzas"><FinanceDashboard /></RequireFeature>} />
            <Route path="/finanzas/transacciones" element={<RequireFeature app="finanzas"><FinanceTransacciones /></RequireFeature>} />
            <Route path="/finanzas/cuentas-por-cobrar" element={<RequireFeature app="finanzas"><FinanceCuentasPorCobrar /></RequireFeature>} />
            <Route path="/finanzas/cuentas-por-pagar" element={<RequireFeature app="finanzas"><FinanceCuentasPorPagar /></RequireFeature>} />
            <Route path="/finanzas/nomina" element={<RequireFeature app="finanzas"><FinanceNomina /></RequireFeature>} />
            <Route path="/finanzas/reportes" element={<RequireFeature app="finanzas"><FinanceReportes /></RequireFeature>} />
          </Route>
          <Route path="*" element={<Navigate to="/ecosistema" replace />} />
        </Routes>
      </Suspense>
      <SupportWidget />
      <GuidedTour />
    </>
  );
}

export default AppRouter;
