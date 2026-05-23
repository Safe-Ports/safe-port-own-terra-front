import { HiArrowDownTray, HiArrowLeftOnRectangle, HiDevicePhoneMobile, HiShieldCheck, HiSparkles } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { useDashboardQuery } from "@/hooks/queries/useAppQueries";
import { compactCurrency } from "@/services/formatters";

function ProfilePage() {
  const { currentUser, logout } = useAppContext();
  const { data } = useDashboardQuery();

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#DDD4C7] bg-[linear-gradient(160deg,#1A3428,#11120F)] p-5 text-[#F7F3ED] shadow-[0_28px_60px_rgba(13,15,12,.28)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-[linear-gradient(135deg,#D9B07D,#8B6A46)] text-xl font-black text-[#16120F]">
            {currentUser?.initials || "OT"}
          </div>
          <div>
            <div className="font-['Playfair_Display'] text-[2rem] leading-none">{currentUser?.name}</div>
            <div className="mt-2 text-sm text-white/62">{currentUser?.email}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/8 p-3">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Clientes</div>
            <div className="mt-2 text-lg font-bold">{data?.totals.clients ?? 0}</div>
          </div>
          <div className="rounded-[22px] bg-white/8 p-3">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Cobranza</div>
            <div className="mt-2 text-lg font-bold">{compactCurrency(data?.totals.paidRevenue ?? 0)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        <div className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Experiencia instalada</div>
        <div className="mt-4 space-y-3">
          {[
            {
              icon: HiDevicePhoneMobile,
              title: "Safe areas listas",
              description: "Viewport con `fit=cover`, barras inferiores adaptadas e interacción optimizada para iPhone y Android."
            },
            {
              icon: HiArrowDownTray,
              title: "PWA instalable",
              description: "Manifest, auto update, iconos y modo standalone configurados para operar como app real."
            },
            {
              icon: HiShieldCheck,
              title: "Base de producción",
              description: "React Query, Axios y estructura preparada para FastAPI y autenticación JWT."
            }
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFE4D5] text-[#183024]">
                  <Icon className="text-lg" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#16120F]">{title}</div>
                  <div className="mt-1 text-sm leading-6 text-[#5F5346]">{description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        <div className="flex items-center gap-2">
          <HiSparkles className="text-xl text-[#183024]" />
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Roadmap</div>
        </div>
        <div className="mt-4 space-y-3 text-sm text-[#5F5346]">
          <div className="rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">Conectar API FastAPI real para vendedores, clientes y documentos.</div>
          <div className="rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">Activar JWT, permisos por rol y sincronización offline avanzada.</div>
          <div className="rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4">Añadir push notifications y recordatorios de cobranza instalados en pantalla principal.</div>
        </div>
      </section>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-[#D9CCBB] bg-[#16120F] px-5 py-4 text-sm font-semibold text-[#F7F3ED]"
        onClick={logout}
      >
        <HiArrowLeftOnRectangle className="text-lg" />
        Cerrar sesión
      </button>
    </div>
  );
}

export default ProfilePage;
