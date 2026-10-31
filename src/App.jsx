import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import VerifyEmail from "@/components/forms/VerifyEmail";
import ResetPassword from "@/components/forms/ResetPassword";
import AppRouter from "@/routes/AppRouter";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { PROPERTIES_MVP_SCOPE } from "@/apps/properties/mvpScope";

const FormPublico = lazy(() => import("@/pages/FormPublico"));
const LegalPage = lazy(() => import("@/pages/Legal"));
const TenantPortal = lazy(() => import("@/apps/properties/external/TenantPortal"));
const PublicQuote = lazy(() => import("@/pages/PublicQuote"));
const RentalCatalogPage = lazy(() => import("@/apps/properties/public/RentalCatalogPage"));
const CommunityPortal = lazy(() => import("@/apps/properties/external/CommunityPortal"));
const ServiceLogin = lazy(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceLogin })));
const ServiceInvitation = lazy(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceInvitation })));
const ServiceRegistration = lazy(() => import("@/apps/properties/external/ServiceAccessPages").then(module => ({ default: module.ServiceRegistration })));

const PortalRecovery = lazy(() => import("@/apps/properties/external/PortalRecovery"));

function App() {
  const { currentUser } = useAppContext();
  const { pathname } = useLocation();
  if (pathname === "/verify-email") return <VerifyEmail />;
  if (pathname === "/reset-password") return <ResetPassword />;
  // Páginas legales públicas (requeridas por el OAuth de Google): privacidad y términos.
  if (pathname === "/privacidad" || pathname === "/terminos") {
    return <Suspense fallback={<LoadingScreen />}><LegalPage /></Suspense>;
  }
  // Formularios públicos son accesibles sin sesión
  if (pathname.startsWith("/f/")) return <Suspense fallback={<LoadingScreen />}><FormPublico /></Suspense>;
  if (pathname.startsWith("/cotizacion/")) return <Suspense fallback={<LoadingScreen />}><PublicQuote /></Suspense>;
  // Marketplace público de inmuebles en renta; no requiere cuenta de OwnTerra.
  if (PROPERTIES_MVP_SCOPE.rentals && (pathname === "/rentas" || pathname.startsWith("/rentas/"))) return <Suspense fallback={<LoadingScreen />}><RentalCatalogPage /></Suspense>;
  // Portal del inquilino: vista pública de demostración, sin sesión propia.
  if (PROPERTIES_MVP_SCOPE.rentals && pathname === "/portal-inquilino") return <Suspense fallback={<LoadingScreen />}><TenantPortal /></Suspense>;
  // Acceso del residente. Las rutas viven bajo /portal: decían /servicio y un
  // residente que recibe el enlace por WhatsApp no tiene por qué leer
  // "servicio" para entrar a su comunidad. Las viejas siguen resolviendo
  // porque hay invitaciones de un solo uso ya repartidas.
  if (pathname === "/portal/recuperar") return <Suspense fallback={<LoadingScreen />}><PortalRecovery /></Suspense>;
  // URL de recuperación que Core ya envía por correo.
  if (pathname === "/portal/entrar/restablecer" || pathname === "/portal/restablecer") return <Suspense fallback={<LoadingScreen />}><PortalRecovery reset /></Suspense>;
  if (pathname === "/portal/acceso" || pathname === "/portal/entrar" || pathname === "/servicio/login") return <Suspense fallback={<LoadingScreen />}><ServiceLogin /></Suspense>;
  if (pathname === "/portal/invitacion" || pathname === "/servicio/invitacion") return <Suspense fallback={<LoadingScreen />}><ServiceInvitation /></Suspense>;
  // Formulario público de inscripción de proveedores: sin sesión, por diseño
  // (ACC/PRV-05 del doc de requerimientos) — igual que login/invitación de
  // arriba, antes del gate `currentUser ? AppRouter : LoginScreen` de abajo.
  if (pathname === "/servicio/registro" || pathname.startsWith("/servicio/registro/")) return <Suspense fallback={<LoadingScreen />}><ServiceRegistration /></Suspense>;
  if (pathname === "/portal-comunidad") return <Suspense fallback={<LoadingScreen />}><CommunityPortal /></Suspense>;
  return currentUser ? <AppRouter /> : <LoginScreen />;
}

export default App;
