import { useState } from "react";
import { useAppContext } from "@/context/AppContext";

const LOGO_SVG = (
  <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
    {/* hoja izquierda */}
    <path d="M14 22c0-5 4-9 9-9 .5 3-1 7-5 8.5-1.5.5-4 1.5-4 .5z" fill="white" opacity="0.95"/>
    {/* hoja derecha */}
    <path d="M40 18c2-3 5-3 6-1-.5 2-3 4-5 3.5-.5-.1-1.3-1-1-2.5z" fill="white" opacity="0.75"/>
    {/* casita 1 */}
    <path d="M24 36l8-6 8 6v10h-5v-6h-6v6h-5V36z" fill="white"/>
    {/* casita 2 (más alta) */}
    <path d="M40 32l5-4 5 4v14h-3v-7h-4v7h-3V32z" fill="white" opacity="0.85"/>
    {/* colinas */}
    <path d="M10 50 Q22 42 32 50 Q42 42 54 50 L54 56 L10 56 Z" fill="white" opacity="0.7"/>
    <path d="M8 54 Q24 48 32 54 Q40 48 56 54 L56 58 L8 58 Z" fill="white" opacity="0.5"/>
  </svg>
);

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
  return (
    <div className="ll-panel">
      <div className="ll-logo">
        <div className="ll-logo-ico">{LOGO_SVG}</div>
        <div className="ll-logo-nm">
          OwnTerra
          <small>Ecosistem</small>
        </div>
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
      <div className="ll-stats">
        <div>
          <div className="ll-stat-v">100%</div>
          <div className="ll-stat-l">Sin papel</div>
        </div>
        <div>
          <div className="ll-stat-v">∞</div>
          <div className="ll-stat-l">Lotes &amp; Frac.</div>
        </div>
        <div>
          <div className="ll-stat-v">0</div>
          <div className="ll-stat-l">Pagos perdidos</div>
        </div>
      </div>
    </div>
  );
}

/* ── LOGIN ── */
function LoginView({ onForgot, onRegister }) {
  const { login } = useAppContext();
  const [form, setForm]     = useState({ identifier: "", password: "", remember: false });
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    if (!form.identifier || !form.password) return;
    setLoading(true);
    setError(false);
    const result = await login(form);
    setLoading(false);
    if (!result.ok) setError(true);
  };

  const fillDemo = (identifier, password) => {
    setForm({ identifier, password, remember: true });
    setError(false);
  };

  return (
    <div className="lf-wrap">
      <div className="lf-title">Bienvenido</div>
      <div className="lf-sub">Accede a tu sistema de gestión inmobiliaria</div>

      {error && (
        <div className="lf-error">
          Usuario o contraseña incorrectos. Intenta de nuevo.
        </div>
      )}

      <div className="lf-field">
        <label className="lf-label">Usuario / Correo</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">👤</span>
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
        <label className="lf-label">Contraseña</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">🔒</span>
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
            {showPass ? "🙈" : "👁"}
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

      <button className={`lf-btn${loading ? " loading" : ""}`} onClick={submit} disabled={loading}>
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <div className="lf-divider">Acceso rápido con demo</div>

      <div className="lf-demo-box">
        <div className="lf-demo-title">Usuarios de prueba</div>
        <div className="lf-demo-user" onClick={() => fillDemo("admin", "admin123")}>
          <div className="lf-demo-info">
            <div className="lf-demo-av" style={{ background: "var(--forest)" }}>AD</div>
            <div>
              <div className="lf-demo-nm">Administrador</div>
              <div className="lf-demo-role">admin · Acceso total</div>
            </div>
          </div>
          <div className="lf-demo-fill">Usar →</div>
        </div>
        <div className="lf-demo-user" onClick={() => fillDemo("vendedor", "vende123")} style={{ marginTop: 4 }}>
          <div className="lf-demo-info">
            <div className="lf-demo-av" style={{ background: "#8B6A46" }}>VN</div>
            <div>
              <div className="lf-demo-nm">Vendedor</div>
              <div className="lf-demo-role">vendedor · Solo lectura</div>
            </div>
          </div>
          <div className="lf-demo-fill">Usar →</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: ".82rem", color: "#8A7A69" }}>
        ¿No tienes cuenta?{" "}
        <button
          type="button"
          onClick={onRegister}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--forest, #2A7A50)", fontWeight: 700, fontSize: "inherit", padding: 0 }}
        >
          Crear cuenta nueva
        </button>
      </div>

      <div className="lf-footer">
        OwnTerra v1.0 &nbsp;·&nbsp; © 2025 &nbsp;·&nbsp; <a href="#">Privacidad</a>
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
  const [error, setError]   = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(false);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(true);
    }
  };

  if (sent) {
    return (
      <div className="lf-wrap">
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📬</div>
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
    <div className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A69", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← Volver
      </button>
      <div className="lf-title">Recuperar contraseña</div>
      <div className="lf-sub">Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso.</div>

      {error && (
        <div className="lf-error">
          Ocurrió un error. Intenta de nuevo.
        </div>
      )}

      <div className="lf-field">
        <label className="lf-label">Correo electrónico</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">✉️</span>
          <input
            className={`lf-input${error ? " error" : ""}`}
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
        {loading ? "Enviando..." : "Enviar instrucciones"}
      </button>

      <div className="lf-footer" style={{ marginTop: 24 }}>
        OwnTerra v1.0 &nbsp;·&nbsp; © 2025
      </div>
    </div>
  );
}

/* ── REGISTRO ── */
function RegisterView({ onBack }) {
  const { register } = useAppContext();
  const [form, setForm] = useState({
    organization_name: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async () => {
    if (!form.organization_name.trim() || !form.name.trim() || !form.email.trim() || !form.password) return;
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register({
      organization_name: form.organization_name.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (!result.ok) setError(result.msg || "Error al crear la cuenta. Verifica los datos.");
  };

  const fields = [
    { key: "organization_name", label: "Nombre de la empresa / proyecto", ico: "🏢", placeholder: "Inmobiliaria Ejemplo S.A.", type: "text", auto: "organization" },
    { key: "name",              label: "Tu nombre completo",               ico: "👤", placeholder: "Juan Pérez",               type: "text", auto: "name" },
    { key: "email",             label: "Correo electrónico",               ico: "✉️", placeholder: "juan@empresa.mx",          type: "email", auto: "email" },
  ];

  return (
    <div className="lf-wrap">
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A69", fontSize: ".82rem", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← Volver al inicio de sesión
      </button>
      <div className="lf-title">Crear cuenta nueva</div>
      <div className="lf-sub">Registra tu empresa y comienza a gestionar tu fraccionamiento.</div>

      {error && <div className="lf-error">{error}</div>}

      {fields.map((f) => (
        <div className="lf-field" key={f.key}>
          <label className="lf-label">{f.label}</label>
          <div className="lf-input-wrap">
            <span className="lf-ico">{f.ico}</span>
            <input
              className={`lf-input${error ? " error" : ""}`}
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={set(f.key)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete={f.auto}
            />
          </div>
        </div>
      ))}

      <div className="lf-field">
        <label className="lf-label">Contraseña</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">🔒</span>
          <input
            className={`lf-input${error ? " error" : ""}`}
            type={showPass ? "text" : "password"}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
          />
          <button className="lf-eye" type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
            {showPass ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <div className="lf-field">
        <label className="lf-label">Confirmar contraseña</label>
        <div className="lf-input-wrap">
          <span className="lf-ico">🔒</span>
          <input
            className={`lf-input${error ? " error" : ""}`}
            type={showPass ? "text" : "password"}
            placeholder="Repite la contraseña"
            value={form.confirm}
            onChange={set("confirm")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        className={`lf-btn${loading ? " loading" : ""}`}
        onClick={submit}
        disabled={loading || !form.organization_name.trim() || !form.name.trim() || !form.email.trim() || !form.password || !form.confirm}
      >
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Creando cuenta..." : "🚀 Crear cuenta"}
      </button>

      <div className="lf-footer" style={{ marginTop: 16 }}>
        Al registrarte aceptas nuestros <a href="#">Términos de uso</a> y <a href="#">Privacidad</a>.
      </div>
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
