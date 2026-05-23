import { useState } from "react";
import { HiArrowRight, HiLockClosed, HiUser } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

function LoginScreen() {
  const { login } = useAppContext();
  const [form, setForm] = useState({
    identifier: "admin",
    password: "admin123",
    remember: true
  });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(false);
    await new Promise((resolve) => setTimeout(resolve, 320));
    const result = login(form);
    setLoading(false);
    if (!result.ok) setError(true);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#234434,#12100D_58%)] px-4 pb-8 pt-[calc(env(safe-area-inset-top)+20px)] text-[#F7F3ED]">
      <div className="mx-auto flex min-h-[calc(100vh-env(safe-area-inset-top)-32px)] max-w-[1160px] flex-col xl:grid xl:grid-cols-[0.9fr_1.1fr] xl:gap-10">
        <div className="hidden xl:flex xl:flex-col xl:justify-between xl:rounded-[40px] xl:border xl:border-white/10 xl:bg-white/5 xl:p-10 xl:backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#D9B07D,#8B6A46)] text-2xl font-black text-[#16120F]">
              O
            </div>
            <div>
              <div className="font-['Playfair_Display'] text-3xl">Ownterra</div>
              <div className="mt-1 text-sm uppercase tracking-[0.34em] text-white/42">Mobile property ops</div>
            </div>
          </div>

          <div>
            <div className="font-['Playfair_Display'] text-6xl leading-[0.98]">
              Gestiona lotes, clientes y ventas como una app instalada.
            </div>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/64">
              La experiencia principal nace en celular: navegación táctil, paneles compactos, cobranza rápida y operación diaria desde campo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ["PWA", "Instalable"],
              ["390px", "Diseño base"],
              ["Field ready", "Operación móvil"]
            ].map(([value, label]) => (
              <div key={value} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="font-['Playfair_Display'] text-2xl">{value}</div>
                <div className="mt-2 text-sm text-white/52">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-4">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-6 xl:hidden">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#D9B07D]">
                Ownterra
              </div>
              <div className="mt-4 font-['Playfair_Display'] text-[2.5rem] leading-none">
                La operación inmobiliaria, ahora mobile-first.
              </div>
              <div className="mt-3 text-sm leading-7 text-white/64">
                Abre la plataforma como app instalada y trabaja desde iPhone o Android sin fricción.
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[rgba(247,243,237,.96)] p-5 text-[#16120F] shadow-[0_28px_60px_rgba(7,7,7,.35)] backdrop-blur-2xl sm:p-6">
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#8A7A69]">Acceso</div>
              <div className="mt-2 font-['Playfair_Display'] text-[2.2rem] leading-none">Bienvenido</div>
              <div className="mt-3 text-sm leading-6 text-[#5F5346]">
                Inicia sesión para entrar al workspace móvil de lotes, clientes, ventas y documentos.
              </div>

              <div className="mt-6 space-y-3">
                <label className="mobile-auth-field">
                  <span><HiUser className="text-lg" /></span>
                  <input
                    value={form.identifier}
                    onChange={(event) => setForm((previous) => ({ ...previous, identifier: event.target.value }))}
                    placeholder="Usuario o correo"
                  />
                </label>
                <label className="mobile-auth-field">
                  <span><HiLockClosed className="text-lg" /></span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder="Contraseña"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submit();
                    }}
                  />
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-[#F0C0BC] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#C0392B]">
                  Usuario o contraseña incorrectos.
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-[#5F5346]">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => setForm((previous) => ({ ...previous, remember: event.target.checked }))}
                  />
                  Recordarme
                </label>
                <button className="text-sm font-semibold text-[#183024]">Acceso rápido</button>
              </div>

              <button className="mobile-primary-button mt-5 w-full justify-center" onClick={submit} disabled={loading}>
                {loading ? "Ingresando..." : "Entrar a Ownterra"}
                <HiArrowRight className="text-lg" />
              </button>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="rounded-[22px] border border-[#DED5C8] bg-[#FBF7F1] px-4 py-4 text-left" onClick={() => setForm({ identifier: "admin", password: "admin123", remember: true })}>
                  <div className="text-sm font-semibold text-[#16120F]">Administrador</div>
                  <div className="mt-1 text-xs text-[#7F7363]">Acceso total demo</div>
                </button>
                <button className="rounded-[22px] border border-[#DED5C8] bg-[#FBF7F1] px-4 py-4 text-left" onClick={() => setForm({ identifier: "vendedor", password: "vende123", remember: true })}>
                  <div className="text-sm font-semibold text-[#16120F]">Vendedor</div>
                  <div className="mt-1 text-xs text-[#7F7363]">Flujo comercial móvil</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
