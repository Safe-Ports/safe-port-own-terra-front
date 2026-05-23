import { NavLink } from "react-router-dom";
import { mobileNav } from "@/routes/navigation";

function BottomNav() {
  return (
    <nav className="mobile-bottom-nav xl:hidden">
      <div className="mobile-bottom-nav__inner">
        {mobileNav.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`}
          >
            <Icon className="text-[1.2rem]" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
