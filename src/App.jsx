import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import VerifyEmail from "@/components/forms/VerifyEmail";
import ResetPassword from "@/components/forms/ResetPassword";
import AppRouter from "@/routes/AppRouter";

const FormPublico = lazy(() => import("@/pages/FormPublico"));
const LegalPage = lazy(() => import("@/pages/Legal"));
const TenantPortal = lazy(() => import("@/apps/properties/external/TenantPortal"));
const PublicQuote = lazy(() => import("@/pages/PublicQuote"));
const RentalCatalogPage = lazy(() => import("@/apps/properties/public/RentalCatalogPage"));

function App() {
  const { currentUser } = useAppContext();
  const { pathname } = useLocation();
  if (pathname === "/verify-email") return <VerifyEmail />;
  if (pathname === "/reset-password") return <ResetPassword />;
  // Páginas legales públicas (requeridas por el OAuth de Google): privacidad y términos.
  if (pathname === "/privacidad" || pathname === "/terminos") {
    return <Suspense fallback={null}><LegalPage /></Suspense>;
  }
  // Formularios públicos son accesibles sin sesión
  if (pathname.startsWith("/f/")) return <Suspense fallback={null}><FormPublico /></Suspense>;
  if (pathname.startsWith("/cotizacion/")) return <Suspense fallback={null}><PublicQuote /></Suspense>;
  // Marketplace público de inmuebles en renta; no requiere cuenta de OwnTerra.
  if (pathname === "/rentas" || pathname.startsWith("/rentas/")) return <Suspense fallback={null}><RentalCatalogPage /></Suspense>;
  // Portal del inquilino: vista pública de demostración, sin sesión propia.
  if (pathname === "/portal-inquilino") return <Suspense fallback={null}><TenantPortal /></Suspense>;
  return currentUser ? <AppRouter /> : <LoginScreen />;
}

export default App;
