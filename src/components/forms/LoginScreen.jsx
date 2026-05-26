import { useState } from "react";
import { useAppContext } from "@/context/AppContext";

function LoginScreen() {
  const { login } = useAppContext();
  const [form, setForm] = useState({ identifier: "", password: "", remember: false });
  const [error, setError] = useState(false);
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
    <div className="lf-screen">
      {/* LEFT — branding */}
      <div className="ll-panel">
        <div className="ll-logo">
          <div className="ll-logo-ico">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 19L11 3L19 19Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <path d="M7 19h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="11" cy="13" r="2.2" fill="white" />
            </svg>
          </div>
          <div className="ll-logo-nm">
            LoteManager
            <small>Sistema Inmobiliario</small>
          </div>
        </div>

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

        <div className="ll-hero">
          <div className="ll-tagline">
            Gestiona tu<br />fraccionamiento<br /><em>con precisión</em>
          </div>
          <div className="ll-desc">
            Administra lotes, clientes, contratos y amortizaciones desde un solo lugar. Diseñado para desarrolladores inmobiliarios.
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

      {/* RIGHT — form */}
      <div className="ll-form-side">
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
                placeholder="admin@lotemanager.mx"
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
            <span className="lf-forgot">¿Olvidaste tu contraseña?</span>
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

          <div className="lf-footer">
            LoteManager v2.0 &nbsp;·&nbsp; © 2025 &nbsp;·&nbsp; <a href="#">Privacidad</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
