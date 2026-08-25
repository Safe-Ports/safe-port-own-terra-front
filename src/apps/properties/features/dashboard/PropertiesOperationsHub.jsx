import { useState } from "react";
import {
  HiArrowLeft,
  HiArrowRight,
  HiBuildingOffice2,
  HiChatBubbleLeftRight,
  HiMegaphone,
  HiWrenchScrewdriver,
} from "react-icons/hi2";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import "./properties-dashboard.css";

const areas = [
  {
    key: "portfolio",
    label: "Portafolio",
    caption: "Lo que administras",
    icon: HiBuildingOffice2,
    summary: "La fuente de verdad de todos tus activos.",
    items: [
      ["Abrir portafolio", "Inmuebles, unidades y propietarios en contexto", "/properties/portafolio", "properties.properties.read"],
      ["Documentos", "Expedientes y versiones", "/properties/modulos/documentos"],
    ],
  },
  {
    key: "operations",
    label: "Operación",
    caption: "Lo que sucede hoy",
    icon: HiWrenchScrewdriver,
    summary: "Rentas, contratos y atención cotidiana en un solo flujo.",
    items: [
      ["Condominios", "Configuración, directorio y relaciones por unidad", "/properties/condominios", "properties.properties.read"],
      ["Cuotas y adeudos", "Cargos, pagos y saldos por unidad", "/properties/condominios/operacion?module=charges", "properties.properties.read"],
      ["Comunicados", "Avisos oficiales, audiencias y lecturas", "/properties/condominios/operacion?module=communications", "properties.properties.read"],
      ["Amenidades", "Disponibilidad y reservaciones", "/properties/condominios/operacion?module=amenities", "properties.properties.read"],
      ["Comité y votaciones", "Acuerdos, aprobaciones y participación", "/properties/condominios/operacion?module=committee", "properties.properties.read"],
      ["Reportes condominales", "Cobranza, actividad y gobernanza", "/properties/condominios/operacion?module=reports", "properties.properties.read"],
      ["Estatus de unidades", "Disponibilidad de casas, departamentos y espacios", "/properties/unidades?view=board", "properties.units.read"],
      ["Contratos", "Vigencias, renovaciones e historial", "/properties/modulos/contratos"],
      ["Rentas", "Cobranza, vencimientos y renovaciones", "/properties/rentas"],
      ["Tickets y mantenimiento", "Solicitudes, conversación, prioridades y responsables", "/properties/tickets"],
      ["Accesos, visitas y paquetería", "Pases, entradas, salidas y entregas para caseta", "/properties/accesos"],
      ["Inspecciones", "Checklists, evidencia y firmas", "/properties/modulos/inspecciones"],
      ["Red de servicio", "Equipo, proveedores y carga operativa", "/properties/responsables"],
      ["Actividad", "Historial y auditoría", "/properties/modulos/actividad"],
    ],
  },
  {
    key: "commercial",
    label: "Comercial",
    caption: "Lo que hace crecer",
    icon: HiMegaphone,
    summary: "Del inventario publicado a una relación comercial.",
    items: [
      ["Publicaciones", "Renta, venta y disponibilidad", "/properties/modulos/publicaciones"],
      ["Prospectos", "Interesados, visitas y negociación", "/properties/modulos/prospectos"],
    ],
  },
  {
    key: "relationships",
    label: "Relaciones",
    caption: "Las personas primero",
    icon: HiChatBubbleLeftRight,
    summary: "Cada conversación y experiencia, sin perder contexto.",
    items: [
      ["Mensajes", "Conversaciones de toda la operación", "/properties/modulos/mensajes"],
      ["Notificaciones", "Alertas que requieren atención", "/properties/modulos/notificaciones"],
      ["Portal del inquilino", "Pagos, solicitudes y documentos", "/portal-inquilino"],
      ["Portal comunidad", "Cuotas, avisos, amenidades, visitas y votaciones", "/portal-comunidad", "properties.read"],
      ["Portal del propietario", "Rendimiento, contratos y reportes", "/properties/modulos/portal-propietario"],
    ],
  },
];

const areaKeys = new Set(areas.map((area) => area.key));

function PropertiesOperationsHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canUseFeature } = useAppContext();
  const requestedArea = searchParams.get("section");
  const [activeArea, setActiveArea] = useState(areaKeys.has(requestedArea) ? requestedArea : "operations");
  const selected = areas.find((area) => area.key === activeArea);

  const selectArea = (key) => {
    setActiveArea(key);
    setSearchParams({ section: key }, { replace: true });
  };

  return (
    <EcoLayout active="properties" title="Centro de operación" subtitle="OwnTerra Properties · Segundo nivel">
      <main className="properties-operations-page">
        <button className="properties-level-back" type="button" onClick={() => navigate("/properties")}>
          <HiArrowLeft /> Volver a elegir ruta
        </button>
        <header className="properties-operations-heading">
          <span>Segundo nivel</span>
          <h1>Tu mapa de operación.</h1>
          <p>Aquí aparecen las herramientas cuando ya sabes en qué parte del viaje quieres trabajar.</p>
        </header>
        <section className="properties-cell" aria-label="Áreas de Properties">
          <nav className="properties-particles" aria-label="Áreas de la operación">
            {areas.map(({ key, label, caption, icon: Icon }) => (
              <button type="button" className={activeArea === key ? "active" : ""} key={key} onClick={() => selectArea(key)}>
                <span className="particle-icon"><Icon /></span>
                <span><strong>{label}</strong><small>{caption}</small></span>
                <HiArrowRight className="particle-arrow" />
              </button>
            ))}
          </nav>
          <div className="properties-organism" key={selected.key}>
            <header><span>{selected.label}</span><h2>{selected.summary}</h2></header>
            <div className="organism-list">
              {selected.items.map(([title, description, path, permission]) => {
                const allowed = !permission || canUseFeature(permission);
                return (
                  <button type="button" key={title} disabled={!allowed} onClick={() => allowed && navigate(path)}>
                    <span className="organism-dot" />
                    <span><strong>{title}</strong><small>{allowed ? description : "Sin acceso para tu rol"}</small></span>
                    <HiArrowRight />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </EcoLayout>
  );
}

export default PropertiesOperationsHub;
