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

function CoreTopbarActions({ onGuide, className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, notificationCount } = useAppContext();

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`core-topbar-actions ${className}`} aria-label="Acciones del ecosistema">
      {onGuide && (
        <button
          type="button"
          className="core-topbar-action"
          data-tour="topbar-help"
          onClick={onGuide}
          aria-label="Abrir guías de esta sección"
          aria-haspopup="dialog"
          title="Abrir guías"
        >
          <HiOutlineQuestionMarkCircle aria-hidden="true" />
          <span>Guías</span>
        </button>
      )}

      <button
        type="button"
        className={`core-topbar-action ${isActive("/ecosistema/mi-dia") ? "is-active" : ""}`}
        onClick={() => navigate("/ecosistema/mi-dia")}
      >
        <HiSun aria-hidden="true" />
        <span>Mi Día</span>
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
        <span>Calendario</span>
      </button>

      <button
        type="button"
        className={`core-topbar-action core-profile-action ${isActive("/perfil") ? "is-active" : ""}`}
        onClick={() => navigate("/perfil")}
        aria-label={`Ver perfil de ${currentUser?.name || "usuario"}`}
      >
        <Avatar name={currentUser?.name || "Usuario"} src={currentUser?.avatar_url} size={28} />
        <span className="core-profile-copy">
          <strong>Perfil</strong>
          <small>{currentUser?.name?.split(" ")[0] || "Usuario"}</small>
        </span>
        <HiUserCircle className="core-profile-fallback" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="core-topbar-action core-logout-action"
        onClick={handleLogout}
        title="Cerrar sesión"
      >
        <HiArrowLeftOnRectangle aria-hidden="true" />
        <span className="core-logout-label">Cerrar sesión</span>
      </button>
    </nav>
  );
}

export default CoreTopbarActions;
