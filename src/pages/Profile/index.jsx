import { HiArrowLeftOnRectangle, HiBuildingOffice2, HiCog6Tooth, HiShieldCheck } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useDashboardQuery } from "@/hooks/queries/useAppQueries";
import { orgService } from "@/services/orgService";
import { compactCurrency } from "@/services/formatters";

function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAppContext();
  const { data } = useDashboardQuery();

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: orgService.get,
  });

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
            <div className="mt-2 text-lg font-bold">{data?.totals?.clients ?? 0}</div>
          </div>
          <div className="rounded-[22px] bg-white/8 p-3">
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Cobranza</div>
            <div className="mt-2 text-lg font-bold">{compactCurrency(data?.totals?.paidRevenue ?? 0)}</div>
          </div>
        </div>
      </section>

      {org && (
        <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
          <div className="flex items-center gap-2">
            <HiBuildingOffice2 className="text-xl text-[#183024]" />
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Organización</div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ["Nombre", org.name],
              ["Plan", org.plan],
              ["Estado", org.subscription_status],
              ["Correo", org.email || "—"],
              ["Teléfono", org.phone || "—"],
            ].map(([label, value]) => (
              <div key={label} className="d-row">
                <span className="d-lbl">{label}</span>
                <span className="d-val">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-[#DED5C8] bg-white/88 p-4 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
        <div className="flex items-center gap-2">
          <HiShieldCheck className="text-xl text-[#183024]" />
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-[#7E7061]">Acceso rápido</div>
        </div>
        <div className="mt-4 space-y-3">
          <button
            className="flex w-full items-center gap-3 rounded-[22px] border border-[#E8DFD2] bg-[#FBF7F1] p-4 text-left"
            onClick={() => navigate("/configuracion")}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFE4D5] text-[#183024]">
              <HiCog6Tooth className="text-lg" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#16120F]">Configuración</div>
              <div className="mt-1 text-xs text-[#5F5346]">Gestionar organización y usuarios del equipo</div>
            </div>
          </button>
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
