import { NavLink } from "react-router-dom";
import { HiBuildingOffice2, HiSquares2X2 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";

function ConstructRail() {
  const { currentUser } = useAppContext();

  return (
    <aside className="obr-rail">
      <div className="obr-rail-mark">C</div>
      <NavLink to="/ecosistema" className="obr-rail-item">
        <HiSquares2X2 />
        <small>Ecosistema</small>
      </NavLink>
      <NavLink to="/construccion" className={({ isActive }) => `obr-rail-item ${isActive ? "active" : ""}`}>
        <HiBuildingOffice2 />
        <small>Obras</small>
      </NavLink>
      <div className="obr-rail-spacer" />
      <NavLink to="/perfil" className="obr-rail-avatar" title="Ver perfil">
        {(currentUser?.name || "U").charAt(0).toUpperCase()}
      </NavLink>
    </aside>
  );
}

export default ConstructRail;
