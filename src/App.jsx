import { Suspense, lazy } from "react";
import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import VerifyEmail from "@/components/forms/VerifyEmail";
import ResetPassword from "@/components/forms/ResetPassword";
import AppRouter from "@/routes/AppRouter";

const FormPublico = lazy(() => import("@/pages/FormPublico"));

function App() {
  const { currentUser } = useAppContext();
  if (window.location.pathname === "/verify-email") return <VerifyEmail />;
  if (window.location.pathname === "/reset-password") return <ResetPassword />;
  // Formularios públicos son accesibles sin sesión
  if (window.location.pathname.startsWith("/f/")) return <Suspense fallback={null}><FormPublico /></Suspense>;
  return currentUser ? <AppRouter /> : <LoginScreen />;
}

export default App;
