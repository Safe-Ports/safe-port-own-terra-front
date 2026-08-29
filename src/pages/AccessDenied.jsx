import { useLocation, useNavigate } from "react-router-dom";
import Button from "@/components/Button";

function AccessDenied() {
  const navigate = useNavigate();
  const { state } = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] px-5">
      <div className="max-w-[460px] rounded-[18px] border border-[#E2E7E5] bg-white p-7 text-center shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF1F1] text-xl">!</div>
        <h1 className="font-display text-[1.55rem] text-forest">Sin acceso</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F716A]">
          {state?.message || "Tu usuario no tiene permiso para abrir esta sección."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
          <Button onClick={() => navigate("/ecosistema")}>Ir al Core</Button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;

