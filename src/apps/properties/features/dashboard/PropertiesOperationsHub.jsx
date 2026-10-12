import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiBanknotes, HiBellAlert, HiBolt, HiBuildingOffice2, HiCalendarDays, HiChatBubbleLeftRight, HiClipboardDocumentList, HiDocumentText, HiHomeModern, HiInboxStack, HiKey, HiMegaphone, HiScale, HiSquares2X2, HiTicket, HiUserGroup, HiUsers, HiWrenchScrewdriver } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { isPathInScope } from "../../mvpScope";
import "./properties-hub.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
const OPERATIONS = "/properties/comunidades/operacion";

// Un solo nivel. El selector de áreas obligaba a dos clics para llegar a
// cualquier destino y escondía catorce entradas detrás de una pestaña; aquí
// todo está a la vista, agrupado por el momento en que se usa.
const groups = [
  {
    key: "daily",
    label: "Día a día",
    caption: "La operación que se repite cada mes",
    items: [
      ["Cuotas y adeudos", "Cargos, pagos y saldos por unidad", `${OPERATIONS}?module=charges`, HiBanknotes, "properties.properties.read"],
      ["Gastos de servicios", "Agua, luz y gas: recibos, importes y comprobantes", `${OPERATIONS}?module=utilities`, HiBolt, "properties.properties.read"],
      ["Comunicados", "Avisos oficiales, audiencias y lecturas", `${OPERATIONS}?module=communications`, HiMegaphone, "properties.properties.read"],
      ["Amenidades", "Disponibilidad y reservaciones", `${OPERATIONS}?module=amenities`, HiCalendarDays, "properties.properties.read"],
      ["Comité y votaciones", "Acuerdos, aprobaciones y participación", `${OPERATIONS}?module=committee`, HiScale, "properties.properties.read"],
      ["Reportes de comunidad", "Cobranza, actividad y gobernanza", `${OPERATIONS}?module=reports`, HiClipboardDocumentList, "properties.properties.read"],
    ],
  },
  {
    key: "attention",
    label: "Atención",
    caption: "Lo que entra sin avisar y hay que resolver",
    items: [
      ["Tickets y mantenimiento", "Solicitudes, prioridades y responsables", "/properties/tickets", HiTicket],
      ["Recepción y paquetería", "Paquetes recibidos y entregas a residentes", "/properties/accesos", HiInboxStack, "properties.units.read"],
      ["Proveedores", "Quién resuelve: red habilitada y solicitudes", "/properties/responsables", HiWrenchScrewdriver, "properties.providers.read"],
      ["Inspecciones", "Checklists, evidencia y firmas", "/properties/modulos/inspecciones", HiClipboardDocumentList],
      ["Mensajes", "Conversaciones de toda la operación", "/properties/modulos/mensajes", HiChatBubbleLeftRight],
      ["Notificaciones", "Alertas que requieren atención", "/properties/modulos/notificaciones", HiBellAlert],
    ],
  },
  {
    key: "portfolio",
    label: "Portafolio y personas",
    caption: "La fuente de verdad: qué administras y quién vive ahí",
    items: [
      ["Comunidades", "Condominios, privadas, plazas, cabañas y hoteles", "/properties/comunidades", HiUserGroup, "properties.properties.read"],
      ["Inmuebles y unidades", "Portafolio completo con propietarios en contexto", "/properties/portafolio", HiBuildingOffice2, "properties.properties.read"],
      ["Unidades y residentes", "Quién vive, quién paga y saldo de cada unidad", "/properties/comunidades?tab=units", HiUsers, "properties.units.read"],
      ["Estatus de unidades", "Disponibilidad de casas, departamentos y espacios", "/properties/unidades?view=board", HiHomeModern, "properties.units.read"],
      ["Invitaciones al portal", "Invita residentes y define qué unidades ven", "/properties/comunidades?tab=directory", HiKey, "properties.read"],
      ["Documentos", "Expedientes y versiones", "/properties/modulos/documentos", HiDocumentText],
      ["Contratos", "Vigencias, renovaciones e historial", "/properties/modulos/contratos", HiDocumentText],
      ["Actividad", "Historial y auditoría", "/properties/modulos/actividad", HiSquares2X2],
      ["Rentas", "Prospectos, contratos, cobranza e inspecciones", "/properties/rentas", HiKey, "properties.rent.read"],
      ["Hospedaje", "Reservaciones, huéspedes, check-in y tarifas", "/properties/rentas/hospedaje", HiCalendarDays, "properties.rent.read"],
      ["Marketplace de renta", "Publicaciones, disponibilidad y consultas", "/properties/publicaciones", HiMegaphone, "properties.rent.read"],
    ],
  },
].map((group) => ({ ...group, items: group.items.filter(([, , to]) => isPathInScope(to)) })).filter((group) => group.items.length);

function PropertiesOperationsHub() {
  const navigate = useNavigate();
  const { canUseFeature } = useAppContext();
  const { quotaPlans, units, communities, condoCharges } = usePropertiesData();

  // La operación del mes: un plan de cuota genera de golpe los cargos de todas
  // las unidades. Es lo único que hoy sustituye decenas de capturas a mano.
  const plan = (quotaPlans || [])[0];
  const activeUnits = units.filter((unit) => unit.status !== "archived");
  const planCommunity = plan ? communities.find((item) => item.id === plan.communityId) : null;
  const planUnits = plan ? activeUnits.filter((unit) => unit.propertyId === planCommunity?.propertyId) : [];
  const planTotal = useMemo(() => planUnits.length * Number(plan?.amount || 0), [planUnits.length, plan?.amount]);
  const period = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date());
  const pendingCharges = condoCharges.filter((charge) => charge.status !== "paid").length;

  const visible = groups
    .map((group) => ({ ...group, items: group.items.filter(([, , , , feature]) => !feature || canUseFeature(feature)) }))
    .filter((group) => group.items.length);

  return <EcoLayout active="properties" title="Todas las herramientas" subtitle="Properties">
    <main className="hub-page">

      <section className="hub-run" aria-label="Operación del mes">
        <div className="hub-run-copy">
          <p className="hub-run-period">OPERACIÓN DEL MES · {period.toUpperCase()}</p>
          {plan
            ? <>
                <h1>{plan.concept}</h1>
                <p>{planUnits.length} {planUnits.length === 1 ? "unidad" : "unidades"} de {planCommunity?.name || "la comunidad"} · {money(plan.amount)} cada una{planTotal ? ` · ${money(planTotal)} en total` : ""}</p>
              </>
            : <>
                <h1>Aún no defines una cuota</h1>
                <p>Con un plan de cuota generas los cargos de todas las unidades de una vez, en lugar de capturarlos uno por uno.</p>
              </>}
        </div>
        <div className="hub-run-actions">
          <button type="button" className="hub-run-primary" onClick={() => navigate(`${OPERATIONS}?module=charges`)}>
            {plan ? "Generar el periodo" : "Definir la cuota"} <HiArrowRight />
          </button>
          <p className="hub-run-manual">
            {plan ? "Se simula antes de aplicar. " : ""}
            <button type="button" onClick={() => navigate(`${OPERATIONS}?module=charges`)}>
              {plan ? "¿Un caso especial? Crear un cargo suelto" : "Crear un cargo suelto"}
            </button>
          </p>
          {pendingCharges ? <p className="hub-run-note">{pendingCharges} {pendingCharges === 1 ? "cargo sigue sin pagarse" : "cargos siguen sin pagarse"}</p> : null}
        </div>
      </section>

      {visible.map((group) => <section className="hub-group" key={group.key} aria-label={group.label}>
        <header>
          <h2>{group.label}</h2>
          <p>{group.caption}</p>
        </header>
        <div className="hub-grid">
          {group.items.map(([label, description, to, Icon]) => <button type="button" key={to} onClick={() => navigate(to)}>
            <span className="hub-tile-icon"><Icon aria-hidden="true" /></span>
            <span className="hub-tile-copy"><strong>{label}</strong><small>{description}</small></span>
            <HiArrowRight className="hub-tile-arrow" aria-hidden="true" />
          </button>)}
        </div>
      </section>)}

    </main>
  </EcoLayout>;
}

export default PropertiesOperationsHub;
