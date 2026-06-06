import { NavLink } from "react-router-dom";
import { HiArrowLeftOnRectangle } from "react-icons/hi2";
import { desktopNav } from "@/routes/navigation";
import { useAppContext } from "@/context/AppContext";

function DesktopSidebar() {
  const { currentUser, logout } = useAppContext();

  return (
    <aside className="hidden xl:flex xl:w-[288px] xl:flex-col xl:border-r xl:border-white/10 xl:bg-[#1E3D2B] xl:px-5 xl:py-6">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,57,42,0.98),rgba(18,16,13,0.98))] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,.3)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6FAF6B,#8B6A46)] text-lg font-black text-[#1E3D2B]">
            O
          </div>
          <div>
            <div className="font-['Playfair_Display'] text-xl">Ownterra</div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/55">Property Ops</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {desktopNav.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-[#1E3D2B] shadow-[0_10px_24px_rgba(0,0,0,.18)]"
                    : "text-white/68 hover:bg-white/8 hover:text-white"
                }`
              }
            >
              <Icon className="text-lg" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Sesión</div>
          <div className="mt-2 text-base font-semibold">{currentUser?.name}</div>
          <div className="text-sm text-white/55">{currentUser?.role}</div>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
            onClick={logout}
          >
            <HiArrowLeftOnRectangle className="text-base" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
