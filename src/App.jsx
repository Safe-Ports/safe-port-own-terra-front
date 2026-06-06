import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import VerifyEmail from "@/components/forms/VerifyEmail";
import AppRouter from "@/routes/AppRouter";

function App() {
  const { currentUser } = useAppContext();
  // La verificación de correo funciona sin sesión activa (el link llega por email).
  if (window.location.pathname === "/verify-email") return <VerifyEmail />;
  return currentUser ? <AppRouter /> : <LoginScreen />;
}

export default App;
