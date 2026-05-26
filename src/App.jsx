import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import AppRouter from "@/routes/AppRouter";

function App() {
  const { currentUser } = useAppContext();
  return currentUser ? <AppRouter /> : <LoginScreen />;
}

export default App;
