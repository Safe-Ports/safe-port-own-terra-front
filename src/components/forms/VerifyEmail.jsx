import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

function VerifyEmail() {
  const { verifyEmail } = useAppContext();
  const navigate = useNavigate();
  const [state, setState] = useState("verifying"); // verifying | error
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMsg("El enlace de verificación es inválido.");
      return;
    }

    verifyEmail(token).then((res) => {
      if (res.ok) {
        navigate("/ecosistema", { replace: true });
      } else {
        setState("error");
        setMsg(res.msg || "El enlace de verificación es inválido o expiró.");
      }
    });
  }, [navigate, verifyEmail]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F1EEE6", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "40px 44px", maxWidth: 420, textAlign: "center", boxShadow: "0 8px 30px rgba(30,61,43,0.08)" }}>
        <img src="/ownterra ecosistem.png" alt="OwnTerra Ecosistem" style={{ width: 180, maxWidth: "100%", height: "auto", margin: "0 auto 28px", display: "block", borderRadius: 10 }} />

        {state === "verifying" ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#2B2D27" }}>Confirmando tu correo…</div>
            <div style={{ fontSize: 13, color: "#6B6F63", marginTop: 8 }}>Un momento por favor.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#C0392B" }}>No pudimos verificar tu cuenta</div>
            <div style={{ fontSize: 13, color: "#6B6F63", marginTop: 8 }}>{msg}</div>
            <a href="/" style={{ display: "inline-block", marginTop: 24, padding: "12px 28px", background: "#355E3B", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
              Volver al inicio
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
