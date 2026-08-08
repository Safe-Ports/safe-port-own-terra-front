import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import { LeftPanel } from "./LoginScreen";

function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAppContext();
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token")?.trim() || "",
    [],
  );
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState(null);

  const goToLogin = () => navigate("/", { replace: true });

  const submit = async () => {
    setFieldError("");
    setError(null);

    if (form.password.length < 8) {
      setFieldError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmation) {
      setFieldError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, form.password);
    setLoading(false);
    if (result.ok) {
      window.history.replaceState({}, "", "/reset-password");
      setSuccess(true);
      return;
    }
    setError(
      result.error || {
        message: result.msg || "El enlace es inválido o expiró. Solicita uno nuevo.",
        severity: "warning",
      },
    );
  };

  return (
    <div className="lf-screen">
      <LeftPanel />
      <div className="ll-form-side">
        <div className="lf-wrap">
          {success ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>✓</div>
              <div className="lf-title" style={{ fontSize: "1.5rem" }}>Contraseña actualizada</div>
              <div className="lf-sub">Ya puedes iniciar sesión con tu nueva contraseña.</div>
              <button type="button" className="lf-btn" onClick={goToLogin}>Iniciar sesión</button>
            </div>
          ) : !token ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>⚠️</div>
              <div className="lf-title" style={{ fontSize: "1.5rem" }}>Enlace inválido</div>
              <div className="lf-sub">Solicita un nuevo enlace desde la pantalla de inicio de sesión.</div>
              <button type="button" className="lf-btn" onClick={goToLogin}>Volver al inicio de sesión</button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={goToLogin}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginBottom: 12 }}
              >
                ← Volver al inicio de sesión
              </button>
              <div className="lf-title">Crea una nueva contraseña</div>
              <div className="lf-sub">Escribe y confirma la contraseña que utilizarás para ingresar a OwnTerra.</div>

              <InlineError error={error} />

              <div className="lf-field">
                <label className="lf-label" htmlFor="reset-password">Nueva contraseña</label>
                <div className="lf-input-wrap">
                  <span className="lf-ico">PW</span>
                  <input
                    id="reset-password"
                    className={`lf-input${fieldError ? " error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" className="lf-eye" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <div className="lf-field">
                <label className="lf-label" htmlFor="reset-password-confirmation">Confirmar contraseña</label>
                <div className="lf-input-wrap">
                  <span className="lf-ico">PW</span>
                  <input
                    id="reset-password-confirmation"
                    className={`lf-input${fieldError ? " error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    value={form.confirmation}
                    onChange={(event) => setForm((current) => ({ ...current, confirmation: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && submit()}
                    autoComplete="new-password"
                  />
                </div>
                <FieldError msg={fieldError} />
              </div>

              <button type="button" className={`lf-btn${loading ? " loading" : ""}`} onClick={submit} disabled={loading}>
                {loading ? <span className="btn-spinner" /> : null}
                {loading ? "Guardando..." : "Actualizar contraseña"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
