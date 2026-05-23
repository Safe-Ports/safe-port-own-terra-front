import { NavLink } from "react-router-dom";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { desktopNav, routeMeta, secondaryMobileRoutes } from "@/routes/navigation";
import { useAppContext } from "@/context/AppContext";

function MobileHeader({ pathname }) {
  const { currentUser, openModal } = useAppContext();
  const title = routeMeta[pathname]?.title || "Ownterra";

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(24,48,36,.08)] bg-[rgba(246,240,230,.88)] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-xl xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#7F7363]">Ownterra</div>
          <div className="mt-1 font-['Playfair_Display'] text-[1.65rem] leading-none text-[#16120F]">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDD4C7] bg-white/85 text-[#16120F] shadow-[0_10px_24px_rgba(22,18,15,.08)]"
            onClick={() => openModal("globalSearch")}
            aria-label="Buscar"
          >
            <HiMagnifyingGlass className="text-lg" />
          </button>
          <div className="flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-[#183024] px-3 text-sm font-bold text-[#F6F0E6]">
            {currentUser?.initials || "OT"}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[...desktopNav, ...secondaryMobileRoutes.filter((item) => !desktopNav.some((nav) => nav.path === item.path))].map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-2 text-[0.72rem] font-semibold transition ${
                isActive
                  ? "bg-[#183024] text-[#F7F3ED]"
                  : "border border-[#DDD4C7] bg-white/88 text-[#5A4E41]"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}

export default MobileHeader;
