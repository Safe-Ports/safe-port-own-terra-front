import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { mobileNav } from "@/routes/navigation";
import { useAppContext } from "@/context/AppContext";

function BottomNav() {
  const { calendarAlertCount, clearCalendarAlerts } = useAppContext();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/ecosistema/mi-dia" || pathname === "/ecosistema/agenda") {
      clearCalendarAlerts();
    }
  }, [pathname, clearCalendarAlerts]);

  return (
    <nav className="mobile-bottom-nav xl:hidden">
      <div className="mobile-bottom-nav__inner">
        {mobileNav.map(({ path, label, icon: Icon }) => {
          const isMiDia = path === "/ecosistema/mi-dia";
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon className="text-[1.2rem]" />
                {isMiDia && calendarAlertCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      background: "#C0392B",
                      color: "#fff",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                      lineHeight: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {calendarAlertCount > 9 ? "9+" : calendarAlertCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
