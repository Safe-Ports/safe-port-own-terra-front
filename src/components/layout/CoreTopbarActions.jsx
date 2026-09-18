import {
  HiArrowLeftOnRectangle,
  HiCalendarDays,
  HiOutlineQuestionMarkCircle,
  HiSun,
  HiUserCircle,
} from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "@/components/Avatar";
import AppLauncher from "@/components/layout/AppLauncher";
import { useAppContext } from "@/context/AppContext";

function CoreTopbarActions({ onGuide, className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, notificationCount } = useAppContext();

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  const isActive = (path) => location.pathname === path;

  // El perfil es la misma página servida por dos shells (ver Ecosystem/Perfil.jsx).
  // Esta barra la comparten Lands, Finanzas y el Core, así que se elige la versión
  // de la shell en la que ya está el usuario: abrir tu perfil no debería cambiarte
  // de aplicación. Desde Finanzas se usa la del Core porque es la casa común, no
  // la de otra vertical.
  const inLands = !/^\/(ecosistema|finanzas)\b/.test(location.pathname);
  const profilePath = inLands ? "/perfil" : "/ecosistema/perfil";

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
        className={`core-topbar-action core-profile-action ${isActive(profilePath) ? "is-active" : ""}`}
        onClick={() => navigate(profilePath)}
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

      {/* Último de la fila: es el salto FUERA de esta app, no una acción de
          ella, así que no se mezcla con las demás. */}
      <AppLauncher />
    </nav>
  );
}

export default CoreTopbarActions;
