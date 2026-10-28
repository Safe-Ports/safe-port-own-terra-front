import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LuArrowRight, LuBanknote, LuBuilding2, LuChevronRight, LuCircleCheck, LuHouse, LuKeyRound, LuMegaphone, LuPackage, LuReceipt, LuUserPlus, LuUsers, LuVote, LuWrench } from "react-icons/lu";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import SkyScene, { greeting, skyPeriod } from "@/components/shared/SkyScene";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { COLLECTIONS_API_READY, onPreviewChange, staffPayments } from "../collections/collectionsApi";
import { paymentReportsKey } from "../collections/PaymentReviewPanel";
import { adminActivity, occupancyOf } from "./dashboardModel";
import "./properties-dashboard.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
const today = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
const longDate = (value) => new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const OPERATIONS = "/properties/comunidades/operacion";
const DECISION_ICON = { "payment-reports": LuReceipt, charges: LuBanknote, tickets: LuWrench, packages: LuPackage, amenities: LuKeyRound, votes: LuVote };
const ACTIVITY_ICON = { paid: LuCircleCheck, charge: LuReceipt, ticket: LuWrench, package: LuPackage, notice: LuMegaphone };
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/** Inicio del administrador: lo que espera su decisión, el dinero y lo que pasa en sus comunidades. */
function PropertiesDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { properties, units, communities, condoCharges, votes, packages, reservations, tickets, announcements, portalIdentities, propertiesLoading } = usePropertiesData();

  const firstName = currentUser?.name?.split(" ")[0] || "equipo";
  const organizationName = currentUser?.organization?.name || currentUser?.organization || "Tu organización";

  const activeProperties = properties.filter((item) => item.status !== "archived");
  const occupancy = occupancyOf(units);
  const overdue = condoCharges.filter((charge) => charge.status === "overdue");
  const overdueAmount = overdue.reduce((sum, charge) => sum + Number(charge.amount || 0) - Number(charge.paidAmount || 0), 0);
  const openVotes = votes.filter((vote) => vote.status === "open");
  const pendingPackages = packages.filter((item) => item.status === "pending");
  const requestedReservations = reservations.filter((item) => item.status === "requested");
  const openTickets = tickets.filter((item) => item.status !== "resolved" && item.status !== "cancelled");
  const urgentTickets = openTickets.filter((item) => ["urgent", "high"].includes(item.priority));
  // Comprobantes que los residentes reportaron y esperan confirmación.
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({ queryKey: [...paymentReportsKey(null), "submitted"], queryFn: () => staffPayments.list({ status: "submitted" }) });
  useEffect(() => (COLLECTIONS_API_READY ? undefined : onPreviewChange(() => queryClient.invalidateQueries({ queryKey: ["payment-reports"] }))), [queryClient]);
  const reports = reportsQuery.data || [];
  const reportsToReview = reports.filter((report) => report.status === "submitted");

  // Lo que requiere una decisión del administrador. Sólo aparece lo que existe:
  // una bandeja vacía es una buena noticia, no una fila que rellenar.
  const decisions = useMemo(() => [
    reportsToReview.length && { key: "payment-reports", tone: "warm", title: plural(reportsToReview.length, "pago reportado por revisar", "pagos reportados por revisar"), detail: `${money(reportsToReview.reduce((sum, report) => sum + Number(report.amount || 0), 0))} con comprobante`, cta: "Revisar comprobantes", to: `${OPERATIONS}?module=charges` },
    overdue.length && { key: "charges", tone: "alert", title: plural(overdue.length, "cuota vencida", "cuotas vencidas"), detail: `${money(overdueAmount)} por cobrar`, cta: "Revisar cobranza", to: `${OPERATIONS}?module=charges` },
    urgentTickets.length && { key: "tickets", tone: "warm", title: plural(urgentTickets.length, "ticket de prioridad alta", "tickets de prioridad alta"), detail: `${openTickets.length} abiertos en total`, cta: "Asignar", to: "/properties/tickets" },
    pendingPackages.length && { key: "packages", tone: "violet", title: plural(pendingPackages.length, "paquete en recepción", "paquetes en recepción"), detail: "Esperan entrega al residente", cta: "Entregar", to: "/properties/accesos" },
    requestedReservations.length && { key: "amenities", tone: "calm", title: plural(requestedReservations.length, "reserva por aprobar", "reservas por aprobar"), detail: "Amenidades de la comunidad", cta: "Aprobar", to: `${OPERATIONS}?module=amenities` },
    openVotes.length && { key: "votes", tone: "calm", title: plural(openVotes.length, "votación abierta", "votaciones abiertas"), detail: "Da seguimiento a la participación", cta: "Ver", to: `${OPERATIONS}?module=committee` },
  ].filter(Boolean), [reportsToReview, overdue.length, overdueAmount, urgentTickets.length, openTickets.length, pendingPackages.length, requestedReservations.length, openVotes.length]);

  const resolved = [
    [LuBanknote, "cuotas pagadas", condoCharges.filter((charge) => charge.status === "paid").length],
    [LuPackage, "paquetes entregados", packages.filter((item) => item.status === "delivered").length],
    [LuWrench, "tickets resueltos", tickets.filter((item) => item.status === "resolved").length],
  ].filter(([, , count]) => count > 0);

  const unitById = useMemo(() => Object.fromEntries(units.map((unit) => [unit.id, unit])), [units]);
  const activity = adminActivity({ reports, tickets, packages, announcements, unitLabel: (id) => unitById[id]?.name || "" });
  const notices = [...announcements].sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at)).slice(0, 4);
  const [slide, setSlide] = useState(0);
  const notice = notices[Math.min(slide, notices.length - 1)];

  const portfolio = [
    [LuUsers, "Comunidades", communities.length, "/properties/comunidades"],
    [LuBuilding2, "Propiedades", activeProperties.length, "/properties/portafolio"],
    [LuHouse, "Unidades", occupancy.total, "/properties/comunidades?tab=units"],
    [LuUserPlus, "En el portal", (portalIdentities || []).length, "/properties/comunidades?tab=units"],
  ];
  const quick = [
    [LuPackage, "Registrar paquete", "Avisa al residente al recibirlo", "/properties/accesos"],
    [LuUserPlus, "Agregar residente", "Asigna personas a sus unidades", "/properties/comunidades?tab=units&intent=add-resident"],
    [LuWrench, "Nuevo ticket", "Levanta una orden de trabajo", "/properties/tickets"],
    [LuReceipt, "Generar cargo", "Cuotas y cargos extraordinarios", `${OPERATIONS}?module=charges`],
  ];

  // Antes decía "Buen día" a cualquier hora: el saludo y el cielo siguen la hora local.
  const now = new Date();
  const period = skyPeriod(now.getHours());

  return <EcoLayout active="properties" title="Properties" subtitle={organizationName}>
    <main className="pd-page">

      <div className="pd-top">
        <section className={`pd-hero sky-host is-${period}`} aria-label="Bienvenida">
          <SkyScene period={period} kind="community"/>
          <div className="pd-hero-copy">
            <small>{today.format(now)}</small>
            <h1>{greeting(now.getHours())}, {firstName}</h1>
            <p>{decisions.length
              ? <>Hay <strong>{plural(decisions.length, "cosa", "cosas")}</strong> que requieren tu decisión. El resto de la operación está al corriente.</>
              : "No hay pendientes que requieran tu decisión. Todo está al corriente."}</p>
            <div className="pd-chips">
              <span><LuBuilding2/> {organizationName}</span>
              <span className={`is-status ${decisions.length ? "is-warm" : "is-ok"}`}><i/>{decisions.length ? plural(decisions.length, "pendiente", "pendientes") : "Todo al corriente"}</span>
              {overdue.length ? <span className="is-status is-alert"><i/>{plural(overdue.length, "cuota vencida", "cuotas vencidas")}</span> : null}
            </div>
            <div className="pd-hero-actions">
              <button type="button" className="pd-primary" onClick={() => navigate(decisions[0]?.to || "/properties/comunidades")}>{decisions.length ? decisions[0].cta : "Abrir comunidades"}</button>
              <button type="button" className="pd-ghost" onClick={() => navigate(`${OPERATIONS}?module=communications`)}>Nuevo comunicado</button>
            </div>
          </div>
        </section>

        <div className="pd-money">
          <section className={`pd-collect${overdue.length ? " is-alert" : ""}`} aria-label="Por cobrar">
            <i><LuBanknote/></i>
            <div>
              <small>{overdue.length ? "Vencido por cobrar" : "Cobranza"}</small>
              <strong>{overdue.length ? money(overdueAmount) : "Al corriente"}</strong>
              <em>{overdue.length ? plural(overdue.length, "cuota vencida", "cuotas vencidas") : "Sin cuotas vencidas"}{reportsToReview.length ? ` · ${plural(reportsToReview.length, "comprobante", "comprobantes")} por revisar` : ""}</em>
              <button type="button" onClick={() => navigate(`${OPERATIONS}?module=charges`)}>Revisar cobranza</button>
            </div>
          </section>
          <section className="pd-occupancy" aria-label="Ocupación">
            <i><LuHouse/></i>
            <div>
              <small>Ocupación</small>
              <strong>{occupancy.total ? `${occupancy.percent}%` : "—"}</strong>
              <span className="pd-bar"><b style={{ width: `${occupancy.percent}%` }}/></span>
              <em>{occupancy.total ? `${occupancy.occupied} de ${plural(occupancy.total, "unidad ocupada", "unidades ocupadas")}` : "Aún no registras unidades"}</em>
              <button type="button" className="pd-text-link" onClick={() => navigate("/properties/comunidades?tab=units")}>Ver unidades <LuArrowRight/></button>
            </div>
          </section>
        </div>
      </div>

      <section className="pd-quick" aria-label="Acciones rápidas">
        <h2>Acciones rápidas</h2>
        <div>{quick.map(([Icon, label, hint, to]) => <button type="button" key={label} onClick={() => navigate(to)}>
          <i><Icon/></i><span><strong>{label}</strong><small>{hint}</small></span><LuChevronRight/>
        </button>)}</div>
      </section>

      <div className="pd-middle">
        <section className="pd-card pd-decisions" aria-label="Necesita tu decisión">
          <header><h2>Necesita tu decisión</h2>{decisions.length ? <span className="pd-count">{decisions.length}</span> : null}</header>
          {decisions.length ? <ul>{decisions.map((item) => { const Icon = DECISION_ICON[item.key]; return <li key={item.key} className={`is-${item.tone}`}>
            <i><Icon/></i><span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <button type="button" onClick={() => navigate(item.to)}>{item.cta}</button>
          </li>; })}</ul> : <div className="pd-calm"><LuCircleCheck/><strong>{propertiesLoading ? "Cargando la operación…" : "Sin pendientes"}</strong><p>{propertiesLoading ? "" : "Nada requiere tu atención ahora mismo."}</p></div>}
        </section>

        <section className="pd-card pd-portfolio" aria-label="Tu portafolio">
          <header><h2>Tu portafolio</h2><button type="button" className="pd-text-link" onClick={() => navigate("/properties/operacion")}>Todas las herramientas <LuArrowRight/></button></header>
          <ul>{portfolio.map(([Icon, label, count, to]) => <li key={label}><button type="button" onClick={() => navigate(to)}><i><Icon/></i><span><small>{label}</small><b>{count}</b></span></button></li>)}</ul>
          <p><LuVote/> {openVotes.length ? `${plural(openVotes.length, "votación abierta", "votaciones abiertas")} en tus comunidades.` : "Ninguna votación en curso."} {openTickets.length ? `${plural(openTickets.length, "ticket abierto", "tickets abiertos")}.` : "Sin tickets abiertos."}</p>
        </section>
      </div>

      <div className="pd-bottom">
        <section className="pd-card pd-activity" aria-label="Actividad reciente">
          <header><h2>Actividad reciente</h2></header>
          {activity.length ? <ul>{activity.map((item) => { const Icon = ACTIVITY_ICON[item.icon]; return <li key={item.key}><button type="button" className={`is-${item.tone}`} onClick={() => navigate(item.to)}>
            <i><Icon/></i><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.date}</time><LuChevronRight/>
          </button></li>; })}</ul> : <p className="pd-empty">{propertiesLoading ? "Cargando la operación…" : "Aquí verás pagos, tickets, paquetes y comunicados conforme sucedan."}</p>}
        </section>

        <section className="pd-card pd-notices" aria-label="Comunicados">
          <header><h2>Comunicados</h2><button type="button" className="pd-text-link" onClick={() => navigate(`${OPERATIONS}?module=communications`)}>Nuevo <LuArrowRight/></button></header>
          {notice ? <>
            <button type="button" className="pd-notice" onClick={() => navigate(`${OPERATIONS}?module=communications`)}>
              <span className={`pd-notice-cover sky-host is-${period}`}><SkyScene period={period} kind="community"/></span>
              <em className={notice.is_urgent ? "is-urgent" : ""}>{notice.is_urgent ? "Urgente" : "Aviso"}</em>
              <strong>{notice.title}</strong>
              <small>{notice.body}</small>
              <time>{longDate(notice.published_at || notice.created_at)}{communities.length > 1 ? ` · ${communities.find((item) => item.id === notice.communityId)?.name || ""}` : ""} · leído por {notice.readCount || 0}</time>
            </button>
            {notices.length > 1 ? <nav className="pd-dots" aria-label="Más comunicados">{notices.map((item, index) => <button type="button" key={item.id} className={item === notice ? "active" : ""} aria-label={`Ver comunicado ${index + 1}`} onClick={() => setSlide(index)}/>)}</nav> : null}
          </> : <p className="pd-empty"><LuMegaphone/> Aún no publicas comunicados. Los residentes los ven en su portal.</p>}
        </section>

        <section className="pd-card pd-resolved" aria-label="Resuelto hasta hoy">
          <header><h2>Resuelto hasta hoy</h2></header>
          {resolved.length ? <ul>{resolved.map(([Icon, label, count]) => <li key={label}><i><Icon/></i><span><b>{count}</b> {label}</span></li>)}</ul> : <p className="pd-empty">Todavía no hay movimientos registrados.</p>}
        </section>
      </div>

    </main>
  </EcoLayout>;
}

export default PropertiesDashboard;
