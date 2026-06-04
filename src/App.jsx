import { useAppContext } from "@/context/AppContext";
import LoginScreen from "@/components/forms/LoginScreen";
import AppRouter from "@/routes/AppRouter";
import ChatBot from "@/components/chatbot/ChatBot";

function App() {
  const { currentUser } = useAppContext();
  return currentUser ? (
    <>
      <AppRouter />
      <ChatBot />
    </>
  ) : (
    <LoginScreen />
  );
}

export default App;
