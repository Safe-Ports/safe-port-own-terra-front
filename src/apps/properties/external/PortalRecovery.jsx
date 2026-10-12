import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowForm from "@/components/forms/WorkflowForm";
import propertiesPortalService from "@/services/propertiesPortalService";
import { parseApiError } from "@/errors/parseApiError";
import "../components/properties-ui.css";
import "./service-access.css";

export default function PortalRecovery({ reset = false }) {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setError("");
    if (reset && password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      if (reset) {
        await propertiesPortalService.resetPassword({ token, new_password: password });
        propertiesPortalService.logout();
        setPassword(""); setConfirmation("");
      } else await propertiesPortalService.forgotPassword(email.trim());
      setDone(true);
    } catch (requestError) { setError(parseApiError(requestError).message); }
    finally { setBusy(false); }
  };
  return <main className="service-auth-page"><section className="service-auth-story"><div>
    <span>Portal de comunidad</span><h1>{reset ? "Recupera tu acceso." : "Volvamos a tu comunidad."}</h1>
    <p>Usa el correo de tu cuenta de propietario, residente o inquilino.</p>
  </div></section><section className="service-auth-card"><div className="service-auth-box">
    <h2>{reset ? "Define una nueva contraseña" : "Recuperar contraseña"}</h2>
    {done ? <section role="status"><p>{reset ? "Contraseña actualizada. Inicia sesión con tu nueva contraseña." : "Si el correo tiene una cuenta activa, recibirás instrucciones de recuperación. Revisa también la carpeta de spam."}</p></section>
      : reset && !token ? <p role="alert">Falta el enlace de recuperación. Solicita uno nuevo desde Recuperar contraseña.</p>
      : <WorkflowForm busy={busy} onSubmit={submit}>
        {reset ? <><label><span>Nueva contraseña</span><input required type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
          <label><span>Confirmar contraseña</span><input required type="password" autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label></>
          : <label><span>Correo de tu cuenta</span><input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>}
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={busy}>{busy ? "Enviando…" : reset ? "Guardar contraseña" : "Enviar instrucciones"}</button>
      </WorkflowForm>}
    <footer><button type="button" onClick={()=>navigate("/portal/acceso")}>Volver al acceso</button>
      {reset && !done ? <button type="button" onClick={()=>navigate("/portal/recuperar")}>Solicitar otro enlace</button> : null}</footer>
  </div></section></main>;
}
