import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { useLocale } from "@/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    <text x="65" y="60" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 1</text>
    <text x="170" y="60" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 2</text>
    <text x="275" y="60" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="white" opacity="0.5">Lote 3</text>
    <text x="275" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" opacity="0.8">Vendido</text>
    <text x="170" y="255" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" opacity="0.8">Apartado</text>
  </svg>
);

function LeftPanel() {
  const { t } = useLocale();
  return (
    <div className="ll-panel">
      <div className="ll-logo">
        <img src="/ownterra ecosistem.png" alt="OwnTerra Ecosistem" />
      </div>
      {MAP_SVG}
      <div className="ll-hero">
        <div className="ll-tagline">
          {t("auth.tagline")}
        </div>
        <div className="ll-desc">
          {t("auth.description")}
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
  const { t } = useLocale();

  const submit = async () => {
    if (!form.identifier || !form.password) return;
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
    showToast(
      result.ok ? "Correo de verificación reenviado" : (result.msg || "No se pudo reenviar el correo"),
      result.ok ? "success" : "error",
    );
  };

  return (
    <div className="lf-wrap">
      <div className="lf-title">{t("auth.welcome")}</div>
      <div className="lf-sub">{t("auth.loginSubtitle")}</div>

      <InlineError error={error}>
        {unverifiedEmail ? (
          <button type="button" className="lf-error-action" onClick={resend} disabled={resending}>
            {resending ? t("auth.resending") : t("auth.resendEmail")}
          </button>
        ) : null}
      </InlineError>

      <div className="lf-field">
        <label className="lf-label">{t("auth.userEmail")}</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">ID</span>
          <input
            className={`lf-input${error ? " error" : ""}`}
            type="text"
            placeholder="correo@empresa.mx"
            value={form.identifier}
            onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="username"
          />
        </div>
      </div>

      <div className="lf-field">
        <label className="lf-label">{t("auth.password")}</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">PW</span>
          <input
            className={`lf-input${error ? " error" : ""}`}
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="current-password"
          />
          <button className="lf-eye" type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
            {showPass ? t("auth.hide") : t("auth.show")}
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
          {t("auth.remember")}
        </label>
        <button
          className="lf-forgot"
          type="button"
          onClick={onForgot}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
        >
          {t("auth.forgotQuestion")}
        </button>
      </div>

      <button className={`lf-btn${loading ? " loading" : ""}`} onClick={submit} disabled={loading}>
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: ".82rem", color: "#83867C" }}>
        {t("auth.noAccount")} {" "}
        <button
          type="button"
          onClick={onRegister}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--forest, #355E3B)", fontWeight: 700, fontSize: "inherit", padding: 0 }}
        >
          {t("auth.createAccount")}
        </button>
      </div>

      <div className="lf-footer">
        OwnTerra v1.0 &nbsp;·&nbsp; © 2026
      </div>
    </div>
  );
}

/* ── RECUPERAR CONTRASEÑA ── */
function ForgotView({ onBack }) {
  const { forgotPassword } = useAppContext();
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState(null);
  const { t } = useLocale();

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError({ message: t("auth.recoveryError"), action: t("auth.recoveryAction"), severity: "warning" });
    }
  };

  if (sent) {
    return (
      <div className="lf-wrap">
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📬</div>
          <div className="lf-title" style={{ fontSize: "1.3rem" }}>{t("auth.checkEmail")}</div>
          <div className="lf-sub" style={{ marginBottom: 24 }}>
            {t("auth.recoverySent")}
          </div>
          <button className="lf-btn" onClick={onBack}>← {t("auth.backToLogin")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← {t("auth.back")}
      </button>
      <div className="lf-title">{t("auth.recoverTitle")}</div>
      <div className="lf-sub">{t("auth.recoverSubtitle")}</div>

      <InlineError error={error} />

      <div className="lf-field">
        <label className="lf-label">{t("auth.email")}</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">✉️</span>
          <input
            className="lf-input"
            type="email"
            placeholder="correo@empresa.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <button className={`lf-btn${loading ? " loading" : ""}`} onClick={submit} disabled={loading || !email.trim()}>
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? t("auth.sending") : t("auth.sendInstructions")}
      </button>

      <div className="lf-footer" style={{ marginTop: 24 }}>
        OwnTerra v1.0 &nbsp;·&nbsp; © 2025
      </div>
    </div>
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
  const [error, setError]     = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const fe = useFieldErrors();
  const { t } = useLocale();
  const registerRules = {
    organization_name: (v) => (!v || v.trim().length < 3 ? t("auth.companyMin") : ""),
    name: (v) => (!v || v.trim().length < 2 ? t("auth.nameMin") : ""),
    email: (v) => (!EMAIL_RE.test((v || "").trim()) ? t("auth.emailInvalid") : ""),
    password: (v) => ((v || "").length < 8 ? t("auth.passwordMin") : ""),
    confirm: (v, values) => (v !== values.password ? t("auth.passwordMismatch") : ""),
  };

  const set = (key) => (e) => { const v = e.target.value; setForm((p) => ({ ...p, [key]: v })); fe.clear(key); };

  const submit = async () => {
    // Validación de llenado: por campo (rojo bajo el input), no en la caja general.
    if (!fe.validate(form, registerRules)) return;
    setLoading(true);
    setError(null);
    const result = await register({
      organization_name: form.organization_name.trim(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (result.ok && result.pendingVerification) {
      setRegisteredEmail(result.email || form.email.trim());
      return;
    }
    if (!result.ok) setError(result.error || { message: result.msg || "Error al crear la cuenta. Verifica los datos." });
  };

  if (registeredEmail) {
    return (
      <div className="lf-wrap" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✉️</div>
        <div className="lf-title">{t("auth.confirmEmail")}</div>
        <div className="lf-sub">
          {t("auth.confirmationSent")} <strong>{registeredEmail}</strong>. {t("auth.confirmationAction")}
        </div>
        <button
          type="button"
          className="lf-btn"
          style={{ marginTop: 18 }}
          onClick={async () => {
            const r = await resendVerification(registeredEmail);
            showToast(
              r.ok ? "Correo reenviado" : (r.msg || "No se pudo reenviar"),
              r.ok ? "success" : "error",
            );
          }}
        >
          {t("auth.resendEmail")}
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginTop: 16 }}
        >
          ← {t("auth.backToLogin")}
        </button>
      </div>
    );
  }

  const fields = [
    { key: "organization_name", label: t("auth.companyName"), ico: "🏢", placeholder: "Example Real Estate Inc.", type: "text", auto: "organization" },
    { key: "name", label: t("auth.fullName"), ico: "👤", placeholder: "Jane Smith", type: "text", auto: "name" },
    { key: "email", label: t("auth.email"), ico: "✉️", placeholder: "jane@company.com", type: "email", auto: "email" },
  ];

  return (
    <div className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#83867C", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← {t("auth.backToLogin")}
      </button>
      <div className="lf-title">{t("auth.createAccount")}</div>
      <div className="lf-sub">{t("auth.registerSubtitle")}</div>

      <InlineError error={error} />

      {fields.map((f) => (
        <div className="lf-field" key={f.key}>
          <label className="lf-label">{f.label}</label>
          <div className="lf-input-wrap">
            <span className="lf-ico">{f.ico}</span>
            <input
              className={fe.errors[f.key] ? "lf-input is-invalid" : "lf-input"}
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={set(f.key)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete={f.auto}
            />
          </div>
          <FieldError msg={fe.errors[f.key]} />
        </div>
      ))}

      <div className="lf-field">
        <label className="lf-label">{t("auth.password")}</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">🔒</span>
          <input
            className={fe.errors.password ? "lf-input is-invalid" : "lf-input"}
            type={showPass ? "text" : "password"}
            placeholder={t("auth.minPassword")}
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
          />
          <button className="lf-eye" type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
            {showPass ? "🙈" : "👁"}
          </button>
        </div>
        <FieldError msg={fe.errors.password} />
      </div>

      <div className="lf-field">
        <label className="lf-label">{t("auth.confirmPassword")}</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">🔒</span>
          <input
            className={fe.errors.confirm ? "lf-input is-invalid" : "lf-input"}
            type={showPass ? "text" : "password"}
            placeholder={t("auth.repeatPassword")}
            value={form.confirm}
            onChange={set("confirm")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
          />
        </div>
        <FieldError msg={fe.errors.confirm} />
      </div>

      <button
        className={`lf-btn${loading ? " loading" : ""}`}
        onClick={submit}
        disabled={loading || !form.organization_name.trim() || !form.name.trim() || !form.email.trim() || !form.password || !form.confirm}
      >
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? t("auth.creating") : `🚀 ${t("auth.createAccount")}`}
      </button>

      <div className="lf-footer" style={{ marginTop: 16 }}>OwnTerra v1.0 &nbsp;·&nbsp; © 2026</div>
    </div>
  );
}

/* ── ROOT ── */
function LoginScreen() {
  const [view, setView] = useState("login");

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
