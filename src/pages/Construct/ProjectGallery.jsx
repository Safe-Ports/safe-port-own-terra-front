import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiBuildingOffice2, HiPlus } from "react-icons/hi2";
import * as constructService from "@/services/constructService";
import { STAGE_TEMPLATES } from "./data/mockCatalog";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button";
import { useAppContext } from "@/context/AppContext";

const PROJECT_TYPES = ["Casa habitación", "Edificio residencial", "Local comercial", "Remodelación"];

function CreateProjectModal({ open, onClose, onCreated }) {
  const { showToast } = useAppContext();
  const [form, setForm] = useState({ name: "", location: "", type: PROJECT_TYPES[0] });
  const [stages, setStages] = useState(new Set(STAGE_TEMPLATES));

  const createMutation = useMutation({
    mutationFn: () => constructService.createProject({ ...form, stages: Array.from(stages) }),
    onSuccess: (project) => {
      showToast("Proyecto creado correctamente");
      onCreated(project);
    },
  });

  const toggleStage = (stage) => {
    setStages((prev) => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  };

  return (
    <Modal open={open} title="Crear proyecto de obra" subtitle="Contenedor de WBS, cuantificaciones y presupuesto." onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "Creando…" : "Crear y cuantificar"}
          </Button>
        </>
      )}>
      <div className="obr-form-grid">
        <label className="obr-field full">
          <span>Nombre del proyecto</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Casa Residencial" autoFocus />
        </label>
        <label className="obr-field full">
          <span>Ubicación</span>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej. Guadalajara, Jalisco" />
        </label>
        <label className="obr-field full">
          <span>Tipo de obra</span>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <div className="obr-field full">
          <span>Fases iniciales (WBS)</span>
          <div className="obr-chapter-picker">
            {STAGE_TEMPLATES.map((stage) => (
              <label key={stage} className={stages.has(stage) ? "on" : ""}>
                <input type="checkbox" checked={stages.has(stage)} onChange={() => toggleStage(stage)} />
                {stage}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ProjectGallery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["construct-projects"],
    queryFn: constructService.listProjects,
  });

  // Entrada directa: con exactamente 1 obra, no obliga a pasar por la galería.
  // Con 0 (crear primero) o varias (elegir cuál), sí se muestra la galería.
  useEffect(() => {
    if (!isLoading && projects.length === 1) navigate(projects[0].id, { replace: true });
  }, [isLoading, projects, navigate]);

  const handleCreated = (project) => {
    queryClient.invalidateQueries({ queryKey: ["construct-projects"] });
    setShowCreate(false);
    navigate(project.id);
  };

  return (
    <div className="obr-gallery">
      <div className="obr-gallery-top">
        <div>
          <p className="obr-eyebrow">Ownterra Construct</p>
          <h1>Tus obras</h1>
          <p className="obr-muted">Cuantificación física, presupuestos híbridos y catálogo maestro por proyecto.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><HiPlus /> Crear proyecto</Button>
      </div>

      {isLoading ? (
        <div className="obr-empty">Cargando obras…</div>
      ) : (
        <div className="obr-project-grid">
          {projects.map((project) => (
            <button key={project.id} className="obr-project-card" onClick={() => navigate(project.id)}>
              <div className="obr-project-picture"><HiBuildingOffice2 /></div>
              <h2>{project.name}</h2>
              <p>{project.location || "Ubicación pendiente"}</p>
              <div className="obr-project-meta"><span>{project.type}</span></div>
            </button>
          ))}
          <button className="obr-project-card obr-create-card" onClick={() => setShowCreate(true)}>
            <span className="obr-create-icon"><HiPlus /></span>
            <b>Crear otro proyecto</b>
            <small>Empieza con los datos generales de la obra.</small>
          </button>
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
    </div>
  );
}

export default ProjectGallery;
