import { Route, Routes } from "react-router-dom";
import ConstructRail from "./ConstructRail";
import ProjectGallery from "./ProjectGallery";
import ProjectWorkspace from "./ProjectWorkspace";
import "./construct.css";

/* Ownterra Construct es una vertical propia (como Lands), no vive dentro del
   AppShell de Lands (Sidebar/Topbar ahí están hardcodeados a rutas de Lands —
   ver plan de implementación). Este componente es el punto de entrada montado
   en "/construccion/*" y resuelve su propia navegación interna.
   ConstructRail vive aquí (no dentro de cada ruta) para que el riel de 72px
   sea persistente en toda pantalla del módulo, incluida la galería. */
function ConstructPage() {
  return (
    <div className="obr-root obr-app">
      <ConstructRail />
      <div className="obr-app-body">
        <Routes>
          <Route index element={<ProjectGallery />} />
          <Route path=":projectId/*" element={<ProjectWorkspace />} />
        </Routes>
      </div>
    </div>
  );
}

export default ConstructPage;
