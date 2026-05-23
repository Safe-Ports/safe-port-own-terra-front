import { useAppContext } from "@/context/AppContext";

function Toast() {
  const { toast } = useAppContext();

  if (!toast) return null;

  return <div className="app-toast">{toast}</div>;
}

export default Toast;
