import WorkflowForm from "./WorkflowForm";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { PROPERTIES_MVP_SCOPE } from "@/apps/properties/mvpScope";
import { getFieldErrors } from "@/services/errors";
import PrivacyConsent, { emptyConsent, isConsentValid, buildConsentFields } from "@/components/legal/PrivacyConsent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_FORMAT_MSG = "Revisa el correo: debe tener el formato nombre@empresa.com.";
const REGISTER_RULES = {
  organization_name: (v) => {
    if (!v?.trim()) return "Escribe el nombre de tu empresa o proyecto.";
    return v.trim().length < 3 ? "El nombre debe tener al menos 3 caracteres. Si aún no tienes empresa, usa el nombre de tu proyecto." : "";
  },
  name: (v) => {
    if (!v?.trim()) return "Escribe tu nombre completo.";
    return v.trim().length < 2 ? "Tu nombre debe tener al menos 2 caracteres." : "";
  },
  email: (v) => {
    if (!v?.trim()) return "Escribe tu correo electrónico.";
    return EMAIL_RE.test(v.trim()) ? "" : EMAIL_FORMAT_MSG;
  },
  password: (v) => (!v ? "Escribe una contraseña." : ""),
  confirm: (v, form) => (v !== form.password ? "No coincide con la contraseña de arriba. Escríbela otra vez." : ""),
};
// Orden visual del formulario: el foco va al primer campo con error.
const REGISTER_FIELD_ORDER = ["organization_name", "name", "email", "password", "confirm"];
const BREACHED_PASSWORD_MSG = "Esta contraseña ya apareció en filtraciones de datos públicas, así que es fácil de adivinar. Prueba con una frase de tres o cuatro palabras que solo tú recuerdes.";
const EMAIL_TAKEN_CODE = "OT-USER-3010";

/** Traduce los errores de campo del backend a mensajes que dicen cómo corregir. */
function explainServerFieldErrors(fields) {
  const next = {};
  for (const [key, message] of Object.entries(fields)) {
    if (key === "password" && /filtraci/i.test(message)) next.password = BREACHED_PASSWORD_MSG;
    else if (key === "email") next.email = EMAIL_FORMAT_MSG;
    else next[key] = message;
  }
  return next;
}

const MAP_SVG = (
  <svg className="ll-map-deco" width="340" height="320" viewBox="0 0 340 320" fill="none">
    <rect x="20" y="20" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="125" y="20" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="230" y="20" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="20" y="110" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="125" y="110" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="230" y="110" width="90" height="70" rx="4" stroke="white" strokeWidth="2" />
    <rect x="20" y="200" width="90" height="100" rx="4" stroke="white" strokeWidth="2" />
    <rect x="125" y="200" width="90" height="100" rx="4" stroke="white" strokeWidth="2" />
    <rect x="230" y="200" width="90" height="100" rx="4" stroke="white" strokeWidth="2" />
    <line x1="0" y1="105" x2="340" y2="105" stroke="white" strokeWidth="3" strokeDasharray="8,4" />
    <line x1="0" y1="195" x2="340" y2="195" stroke="white" strokeWidth="3" strokeDasharray="8,4" />
    <line x1="115" y1="0" x2="115" y2="320" stroke="white" strokeWidth="3" strokeDasharray="8,4" />
    <line x1="220" y1="0" x2="220" y2="320" stroke="white" strokeWidth="3" strokeDasharray="8,4" />
    <rect x="20" y="20" width="90" height="70" rx="4" fill="white" fillOpacity="0.06" />
    <rect x="230" y="110" width="90" height="70" rx="4" fill="white" fillOpacity="0.1" />
    <rect x="125" y="200" width="90" height="100" rx="4" fill="white" fillOpacity="0.07" />
    <text x="65" y="60" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 1</text>
    <text x="170" y="60" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 2</text>
    <text x="275" y="60" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 3</text>
    <text x="275" y="150" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="10" fill="white" opacity="0.8">Vendido</text>
    <text x="170" y="255" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="10" fill="white" opacity="0.8">Apartado</text>
  </svg>
);

export function LeftPanel() {
  return (
    <div className="ll-panel">
      <div className="ll-logo">
        <img src="/brand/ownterra-logo-light.svg" alt="OwnTerra" />
      </div>
      {MAP_SVG}
      <div className="ll-hero">
        <div className="ll-tagline">
          Gestiona hoy.<br />Construye mañana.<br /><em>Vive mejor.</em>
        </div>
        <div className="ll-desc">
          Administra lotes, clientes, contratos y amortizaciones desde un solo lugar. El ecosistema completo para desarrolladores inmobiliarios.
        </div>
      </div>
    </div>
  );
}

/* ── LOGIN ── */
function LoginView({ onForgot, onRegister }) {
  const { login, resendVerification, showToast } = useAppContext();
  const [form, setForm]     = useState({ identifier: "", password: "", remember: false });
  const [error, setError]   = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    if (loading || !form.identifier.trim() || !form.password) return;
    setLoading(true);
    setError(null);
    setUnverifiedEmail("");
    const result = await login(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || { code: "OT-SYS-9000", message: result.msg || "No pudimos iniciar sesión.", action: "", requestId: null });
      if (result.needsVerification) setUnverifiedEmail(result.email || form.identifier);
    }
  };

  const resend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    const result = await resendVerification(unverifiedEmail);
    setResending(false);
    showToast(result.ok ? "Correo de verificación reenviado" : (result.msg || "No se pudo reenviar el correo"));
  };

  return (
    <WorkflowForm busy={loading} onSubmit={event => { event.preventDefault(); return submit(); }} className="lf-wrap">
      <div className="lf-title">Bienvenido</div>
      <div className="lf-sub">Accede a tu sistema de gestión inmobiliaria</div>

      <InlineError error={error}>
        {unverifiedEmail ? (
          <button type="button" className="lf-error-action" onClick={resend} disabled={resending}>
            {resending ? "Reenviando..." : "Reenviar correo de verificación"}
          </button>
        ) : null}
      </InlineError>

      <div className="lf-field">
        <label className="lf-label">Usuario / Correo</label>
        <div className="lf-input-wrap">
          <input required
            className={`lf-input${error ? " error" : ""}`}
            type="text"
            placeholder="correo@empresa.mx"
            value={form.identifier}
            onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}

            autoComplete="username"
          />
        </div>
      </div>

      <div className="lf-field">
        <label className="lf-label">Contraseña</label>
        <div className="lf-input-wrap">
          <input required
            className={`lf-input has-toggle${error ? " error" : ""}`}
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}

            autoComplete="current-password"
          />
          <button className="lf-eye" type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
            {showPass ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      <div className="lf-row">
        <label className="lf-remember">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(e) => setForm((p) => ({ ...p, remember: e.target.checked }))}
          />
          Recordarme
        </label>
        <button
          className="lf-forgot"
          type="button"
          onClick={onForgot}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button type="submit" className={`lf-btn${loading ? " loading" : ""}`}  disabled={loading}>
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>

      {PROPERTIES_MVP_SCOPE.rentals ? (
        <a className="lf-public-catalog" href="/rentas">
          <span aria-hidden="true">⌂</span>
          Explorar inmuebles en renta
          <span aria-hidden="true">→</span>
        </a>
      ) : null}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: ".82rem", color: "#83867C" }}>
        ¿No tienes cuenta?{" "}
        <button
          type="button"
          onClick={onRegister}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--forest, #355E3B)", fontWeight: 700, fontSize: "inherit", padding: 0 }}
        >
          Crear cuenta nueva
        </button>
      </div>

      <div className="lf-footer">
        OwnTerra v1.0 &nbsp;·&nbsp; © 2026
        &nbsp;·&nbsp; <a href="/privacidad">Aviso de Privacidad</a>
        &nbsp;·&nbsp; <a href="/terminos">Términos</a>
      </div>
    </WorkflowForm>
  );
}

/* ── RECUPERAR CONTRASEÑA ── */
function ForgotView({ onBack }) {
  const { forgotPassword } = useAppContext();
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState(null);

  const submit = async () => {
    if (loading || !email.trim()) return;
    setLoading(true);
    setError(null);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError({ message: "Ocurrió un error al enviar el correo.", action: "Verifica tu dirección e intenta de nuevo.", severity: "warning" });
    }
  };

  if (sent) {
    return (
      <div className="lf-wrap">
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div className="lf-title" style={{ fontSize: "1.3rem" }}>Revisa tu correo</div>
          <div className="lf-sub" style={{ marginBottom: 24 }}>
            Si la cuenta existe, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </div>
          <button className="lf-btn" onClick={onBack}>← Volver al inicio de sesión</button>
        </div>
      </div>
    );
  }

  return (
    <WorkflowForm busy={loading} onSubmit={event => { event.preventDefault(); return submit(); }} className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← Volver
      </button>
      <div className="lf-title">Recuperar contraseña</div>
      <div className="lf-sub">Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso.</div>

      <InlineError error={error} />

      <div className="lf-field">
        <label className="lf-label">Correo electrónico</label>
        <div className="lf-input-wrap">
          <input required
            className="lf-input"
            type="email"
            placeholder="correo@empresa.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}

            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <button type="submit" className={`lf-btn${loading ? " loading" : ""}`}  disabled={loading || !email.trim()}>
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Enviando..." : "Enviar instrucciones"}
      </button>

      <div className="lf-footer" style={{ marginTop: 24 }}>
        OwnTerra v1.0 &nbsp;·&nbsp; © 2025
        &nbsp;·&nbsp; <a href="/privacidad">Aviso de Privacidad</a>
        &nbsp;·&nbsp; <a href="/terminos">Términos</a>
      </div>
    </WorkflowForm>
  );
}

/* ── REGISTRO ── */
function RegisterView({ onBack }) {
  const { register, showToast } = useAppContext();
  const [form, setForm] = useState({
    organization_name: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const { resendVerification } = useAppContext();
  const [loading, setLoading] = useState(false);
  // Solo para fallos que no son de un campo (servidor, red): esos llevan Ref.
  const [error, setError]     = useState(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [consent, setConsent] = useState(emptyConsent());
  const [consentMissing, setConsentMissing] = useState(false);
  const fe = useFieldErrors();

  const set = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    fe.clear(key);
    if (key === "email") setEmailTaken(false);
    setError(null);
  };

  // Marca los errores debajo de cada campo y lleva el foco al primero.
  const showFieldErrors = (fieldErrors) => {
    fe.setErrors(fieldErrors);
    const first = REGISTER_FIELD_ORDER.find((key) => fieldErrors[key]);
    if (first) requestAnimationFrame(() => document.getElementById(`register-${first}`)?.focus());
  };

  const submit = async () => {
    if (loading) return;
    setError(null);
    setEmailTaken(false);
    const fieldErrors = Object.fromEntries(
      Object.entries(REGISTER_RULES)
        .map(([key, rule]) => [key, rule(form[key], form)])
        .filter(([, message]) => message)
    );
    if (Object.keys(fieldErrors).length) {
      showFieldErrors(fieldErrors);
      return;
    }
    fe.setErrors({});
    if (!isConsentValid(consent)) {
      setConsentMissing(true);
      return;
    }
    setLoading(true);
    const result = await register({
      organization_name: form.organization_name.trim(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      ...buildConsentFields(consent),
    });
    setLoading(false);
    if (result.ok && result.pendingVerification) {
      setRegisteredEmail(result.email || form.email.trim());
      return;
    }
    if (!result.ok) {
      if (result.error?.code === EMAIL_TAKEN_CODE) {
        setEmailTaken(true);
        showFieldErrors({ email: "Ya existe una cuenta con este correo." });
        return;
      }
      // El contexto conserva los detalles del 422 en el error normalizado.
      const serverFields = getFieldErrors(result.error);
      const formFields = serverFields && Object.fromEntries(
        Object.entries(explainServerFieldErrors(serverFields)).filter(([key]) => REGISTER_FIELD_ORDER.includes(key))
      );
      if (formFields && Object.keys(formFields).length) {
        showFieldErrors(formFields);
        return;
      }
      if (serverFields) {
        // 422 en campos que el cliente no ve (p. ej. backend sin los campos de
        // consentimiento): no es algo que pueda corregir en el formulario.
        setError({
          ...result.error,
          message: "No pudimos crear tu cuenta por un problema de nuestro lado.",
          action: "Tus datos están bien. Intenta de nuevo en unos minutos; si sigue pasando, compártenos el código de abajo.",
        });
        return;
      }
      setError(result.error || { message: result.msg || "No pudimos crear la cuenta. Intenta de nuevo." });
    }
  };

  if (registeredEmail) {
    return (
      <div className="lf-wrap" style={{ textAlign: "center" }}>
        <div className="lf-title">Confirma tu correo</div>
        <div className="lf-sub">
          Enviamos un enlace de confirmación a <strong>{registeredEmail}</strong>.
          Haz clic en él para activar tu cuenta e iniciar sesión.
        </div>
        <button
          type="button"
          className="lf-btn"
          style={{ marginTop: 18 }}
          onClick={async () => {
            const r = await resendVerification(registeredEmail);
            showToast(r.ok ? "Correo reenviado" : (r.msg || "No se pudo reenviar"));
          }}
        >
          Reenviar correo
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginTop: 16 }}
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    );
  }

  const fields = [
    { key: "organization_name", label: "Nombre de la empresa / proyecto", placeholder: "Inmobiliaria Ejemplo S.A.", type: "text", auto: "organization" },
    { key: "name",              label: "Tu nombre completo",               placeholder: "Juan Pérez",               type: "text", auto: "name" },
    { key: "email",             label: "Correo electrónico",               placeholder: "juan@empresa.mx",          type: "email", auto: "email" },
  ];
  const errorId = (key) => (fe.errors[key] ? `register-${key}-error` : undefined);

  return (
    <WorkflowForm busy={loading} noValidate onSubmit={event => { event.preventDefault(); return submit(); }} className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← Volver al inicio de sesión
      </button>
      <div className="lf-title">Crear cuenta nueva</div>
      <div className="lf-sub">Registra tu empresa y comienza a gestionar tu fraccionamiento.</div>

      <InlineError error={error} />

      {fields.map((f) => (
        <div className="lf-field" key={f.key}>
          <label className="lf-label" htmlFor={`register-${f.key}`}>{f.label}</label>
          <input
            id={`register-${f.key}`}
            aria-invalid={Boolean(fe.errors[f.key])}
            aria-describedby={errorId(f.key)}
            className={fe.errors[f.key] ? "lf-input is-invalid" : "lf-input"}
            type={f.type}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={set(f.key)}
            autoComplete={f.auto}
          />
          <div id={errorId(f.key)}><FieldError msg={fe.errors[f.key]} /></div>
          {f.key === "email" && emailTaken ? (
            <div className="lf-field-hint">
              ¿Es tuya?{" "}
              <button type="button" className="lf-link-btn" onClick={onBack}>Inicia sesión</button>
              {" "}o usa otro correo.
            </div>
          ) : null}
        </div>
      ))}

      <div className="lf-field">
        <label className="lf-label" htmlFor="register-password">Contraseña</label>
        <div className="lf-input-wrap">
          <input
            id="register-password"
            aria-invalid={Boolean(fe.errors.password)}
            aria-describedby={errorId("password") || "register-password-help"}
            className={fe.errors.password ? "lf-input has-toggle is-invalid" : "lf-input has-toggle"}
            type={showPass ? "text" : "password"}
            placeholder="Escribe tu contraseña"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
          />
          <button className="lf-eye" type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPass}>
            {showPass ? "Ocultar" : "Ver"}
          </button>
        </div>
        {fe.errors.password
          ? <div id={errorId("password")}><FieldError msg={fe.errors.password} /></div>
          : <div id="register-password-help" className="lf-password-help">Usa una frase que te sea fácil de recordar, de 8 caracteres o más, e incluye algún carácter especial como ! # $ o @.</div>}
      </div>

      <div className="lf-field">
        <label className="lf-label" htmlFor="register-confirm">Confirmar contraseña</label>
        <input
          id="register-confirm"
          aria-invalid={Boolean(fe.errors.confirm)}
          aria-describedby={errorId("confirm")}
          className={fe.errors.confirm ? "lf-input is-invalid" : "lf-input"}
          type={showPass ? "text" : "password"}
          placeholder="Repite la contraseña"
          value={form.confirm}
          onChange={set("confirm")}
          autoComplete="new-password"
        />
        <div id={errorId("confirm")}><FieldError msg={fe.errors.confirm} /></div>
      </div>

      <div className="lf-field">
        <PrivacyConsent value={consent} onChange={(next) => { setConsent(next); setConsentMissing(false); }} idPrefix="register-consent" />
        <FieldError msg={consentMissing && !isConsentValid(consent) ? "Lee y acepta el Aviso de Privacidad para crear tu cuenta." : ""} />
      </div>

      <button type="submit"
        className={`lf-btn${loading ? " loading" : ""}`}
        style={{ marginTop: 14 }}
        disabled={loading}
      >
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <div className="lf-footer" style={{ marginTop: 16 }}>
        OwnTerra v1.0 &nbsp;·&nbsp; © 2026
        &nbsp;·&nbsp; <a href="/privacidad">Aviso de Privacidad</a>
        &nbsp;·&nbsp; <a href="/terminos">Términos</a>
      </div>
    </WorkflowForm>
  );
}

/* ── ROOT ── */
function LoginScreen() {
  // El sitio público manda "Pruébalo ahora" con ?registro=1: se abre directo
  // el alta de cuenta en lugar del inicio de sesión.
  const [view, setView] = useState(() =>
    new URLSearchParams(window.location.search).has("registro") ? "register" : "login"
  );

  return (
    <div className="lf-screen">
      <LeftPanel />
      <div className="ll-form-side">
        {view === "login"    && <LoginView  onForgot={() => setView("forgot")}   onRegister={() => setView("register")} />}
        {view === "forgot"   && <ForgotView onBack={() => setView("login")} />}
        {view === "register" && <RegisterView onBack={() => setView("login")} />}
      </div>
    </div>
  );
}

export default LoginScreen;
