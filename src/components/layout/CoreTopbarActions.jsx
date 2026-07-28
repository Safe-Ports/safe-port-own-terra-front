import {
  HiArrowLeftOnRectangle,
  HiCalendarDays,
  HiOutlineQuestionMarkCircle,
  HiSun,
  HiUserCircle,
} from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "@/components/Avatar";
import { useAppContext } from "@/context/AppContext";
import { useLocale } from "@/i18n";

function CoreTopbarActions({ onGuide, className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, notificationCount } = useAppContext();
  const { t } = useLocale();

  const handleLogout = () => {
    if (window.confirm(t("nav.logoutConfirm"))) logout();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`core-topbar-actions ${className}`} aria-label="Acciones del ecosistema">
      {onGuide && (
        <button
          type="button"
          className="core-topbar-action"
          onClick={onGuide}
          aria-label={t("nav.guides")}
          aria-haspopup="dialog"
          title={t("nav.guides")}
        >
          <HiOutlineQuestionMarkCircle aria-hidden="true" />
          <span>{t("nav.guides")}</span>
        </button>
      )}

      <button
        type="button"
        className={`core-topbar-action ${isActive("/ecosistema/mi-dia") ? "is-active" : ""}`}
        onClick={() => navigate("/ecosistema/mi-dia")}
      >
        <HiSun aria-hidden="true" />
        <span>{t("nav.myDay")}</span>
        {notificationCount > 0 && (
          <span className="core-topbar-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
        )}
      </button>

      <button
        type="button"
        className={`core-topbar-action ${isActive("/ecosistema/agenda") ? "is-active" : ""}`}
        onClick={() => navigate("/ecosistema/agenda")}
      >
        <HiCalendarDays aria-hidden="true" />
        <span>{t("nav.calendar")}</span>
      </button>

      <button
        type="button"
        className={`core-topbar-action core-profile-action ${isActive("/perfil") ? "is-active" : ""}`}
        onClick={() => navigate("/perfil")}
        aria-label={`${t("nav.profile")} — ${currentUser?.name || ""}`}
      >
        <Avatar name={currentUser?.name || "Usuario"} size={28} />
        <span className="core-profile-copy">
          <strong>{t("nav.profile")}</strong>
          <small>{currentUser?.name?.split(" ")[0] || "Usuario"}</small>
        </span>
        <HiUserCircle className="core-profile-fallback" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="core-topbar-action core-logout-action"
        onClick={handleLogout}
        title={t("nav.logout")}
      >
        <HiArrowLeftOnRectangle aria-hidden="true" />
        <span className="core-logout-label">{t("nav.logout")}</span>
      </button>
    </nav>
  );
}

export default CoreTopbarActions;
