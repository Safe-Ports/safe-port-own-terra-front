import { NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  HiAdjustmentsHorizontal,
  HiArchiveBox,
  HiArrowLeft,
  HiBanknotes,
  HiClipboardDocumentList,
  HiDocumentChartBar,
  HiHome,
} from "react-icons/hi2";
import * as constructService from "@/services/constructService";
import WbsManagerView from "./Wbs/WbsManagerView";
import BudgetTable from "./Budget/BudgetTable";
import MasterCatalogBrowser from "./Catalog/MasterCatalogBrowser";
import ProjectSettingsForm from "./Budget/ProjectSettingsForm";
import ReportsView from "./Reports/ReportsView";

const NAV_ITEMS = [
  { to: "", label: "Resumen", icon: HiHome, end: true },
  { to: "cuantificacion", label: "Cuantificación", icon: HiClipboardDocumentList },
  { to: "presupuesto", label: "Presupuesto", icon: HiBanknotes },
  { to: "catalogo", label: "Catálogo maestro", icon: HiArchiveBox },
  { to: "reportes", label: "Reportes", icon: HiDocumentChartBar },
  { to: "parametros", label: "Parámetros", icon: HiAdjustmentsHorizontal },
];

function ResumenView({ project }) {
  const { data: nodes = [] } = useQuery({
    queryKey: ["construct-nodes", project.id],
    queryFn: () => constructService.listWbsNodes(project.id),
  });
  const { data: concepts = [] } = useQuery({
    queryKey: ["construct-concepts", project.id],
    queryFn: () => constructService.listConcepts(project.id),
  });

  const quantified = concepts.filter((c) => c.status === "Cuantificada").length;
  const priced = concepts.filter((c) => c.financial?.mode).length;

  return (
    <div className="obr-resumen">
      <div className="obr-stats">
        <div className="obr-stat"><span>Nodos WBS</span><strong>{nodes.length}</strong></div>
        <div className="obr-stat"><span>Conceptos</span><strong>{concepts.length}</strong></div>
        <div className="obr-stat"><span>Cuantificados</span><strong>{quantified}</strong></div>
        <div className="obr-stat"><span>Con estrategia de cobro</span><strong>{priced}</strong></div>
      </div>
      <div className="obr-card obr-resumen-hint">
        <b>{project.name}</b>
        <p>{project.location || "Ubicación pendiente"} · {project.type}</p>
        <p className="obr-muted">Empieza en <b>Cuantificación</b> para armar el WBS y capturar números generadores; luego pasa a <b>Presupuesto</b> para asignar la estrategia de cobro (APU / Alzado / Paramétrico) de cada concepto.</p>
      </div>
    </div>
  );
}

function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ["construct-project", projectId],
    queryFn: () => constructService.getProject(projectId),
  });

  if (isLoading) return <div className="obr-empty">Cargando obra…</div>;
  if (!project) return <div className="obr-empty">No se encontró el proyecto.</div>;

  return (
    <div className="obr-shell">
      <aside className="obr-sidebar">
        <button className="obr-back" onClick={() => navigate("/construccion")}><HiArrowLeft /> Obras</button>
        <div className="obr-project-chip">
          <small>Obra activa</small>
          <strong>{project.name}</strong>
          <span>{project.location || "Ubicación pendiente"}</span>
        </div>
        <nav className="obr-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to || "index"} to={to} end={end} className={({ isActive }) => `obr-nav-btn ${isActive ? "active" : ""}`}>
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="obr-main">
        <div className="obr-content">
          <div className="obr-demo-banner"><span className="obr-dot" /> DEMO · Datos simulados</div>
          <Routes>
            <Route index element={<ResumenView project={project} />} />
            <Route path="cuantificacion" element={<WbsManagerView project={project} />} />
            <Route path="presupuesto" element={<BudgetTable project={project} />} />
            <Route path="catalogo" element={<MasterCatalogBrowser project={project} />} />
            <Route path="reportes" element={<ReportsView project={project} />} />
            <Route path="parametros" element={<ProjectSettingsForm project={project} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default ProjectWorkspace;
