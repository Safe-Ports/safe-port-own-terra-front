import { Route, Routes } from "react-router-dom";
import ProjectGallery from "./ProjectGallery";
import ProjectWorkspace from "./ProjectWorkspace";
import "./construct.css";

/* Ownterra Construct es una vertical propia (como Lands), no vive dentro del
   AppShell de Lands (Sidebar/Topbar ahí están hardcodeados a rutas de Lands —
   ver plan de implementación). Este componente es el punto de entrada montado
   en "/construccion/*" y resuelve su propia navegación interna. */
function ConstructPage() {
  return (
    <div className="obr-root">
      <Routes>
        <Route index element={<ProjectGallery />} />
        <Route path=":projectId/*" element={<ProjectWorkspace />} />
      </Routes>
    </div>
  );
}

export default ConstructPage;
