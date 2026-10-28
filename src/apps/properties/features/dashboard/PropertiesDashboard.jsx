import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiBanknotes, HiBuildingOffice2, HiCheck, HiInboxStack, HiWrenchScrewdriver } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import SkyScene, { greeting, skyPeriod } from "@/components/shared/SkyScene";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { COLLECTIONS_API_READY, onPreviewChange, staffPayments } from "../collections/collectionsApi";
import { paymentReportsKey } from "../collections/PaymentReviewPanel";
import "./properties-dashboard.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
const today = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
const OPERATIONS = "/properties/comunidades/operacion";

function PropertiesDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { properties, units, condoCharges, votes, packages, reservations, tickets, propertiesLoading } = usePropertiesData();

  const firstName = currentUser?.name?.split(" ")[0] || "equipo";
  const organizationName = currentUser?.organization?.name || currentUser?.organization || "Tu organización";

  const activeUnits = units.filter((unit) => unit.status !== "archived");
  const occupied = activeUnits.filter((unit) => unit.status === "rented").length;
  const occupancy = activeUnits.length ? Math.round((occupied / activeUnits.length) * 100) : 0;
  const overdue = condoCharges.filter((charge) => charge.status === "overdue");
  const overdueAmount = overdue.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  const openVotes = votes.filter((vote) => vote.status === "open");
  const pendingPackages = packages.filter((item) => item.status === "pending");
  const requestedReservations = reservations.filter((item) => item.status === "requested");
  const openTickets = tickets.filter((item) => item.status !== "resolved" && item.status !== "cancelled");
  const urgentTickets = openTickets.filter((item) => ["urgent", "high"].includes(item.priority));
  // Comprobantes que los residentes reportaron y esperan confirmación.
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({ queryKey: [...paymentReportsKey(null), "submitted"], queryFn: () => staffPayments.list({ status: "submitted" }) });
  useEffect(() => (COLLECTIONS_API_READY ? undefined : onPreviewChange(() => queryClient.invalidateQueries({ queryKey: ["payment-reports"] }))), [queryClient]);
  const reportsToReview = (reportsQuery.data || []).filter((report) => report.status === "submitted");

  // Lo que requiere una decisión del administrador. Sólo aparece lo que existe:
  // una bandeja vacía es una buena noticia, no una fila que rellenar.
  const decisions = useMemo(() => [
    reportsToReview.length && { key: "payment-reports", tone: "warning", title: `${reportsToReview.length} ${reportsToReview.length === 1 ? "pago reportado por revisar" : "pagos reportados por revisar"}`, detail: `${money(reportsToReview.reduce((sum, report) => sum + Number(report.amount || 0), 0))} con comprobante`, cta: "Revisar comprobantes", to: `${OPERATIONS}?module=charges` },
    overdue.length && { key: "charges", tone: "danger", title: `${overdue.length} ${overdue.length === 1 ? "cuota vencida" : "cuotas vencidas"}`, detail: `${money(overdueAmount)} por cobrar`, cta: "Revisar cobranza", to: `${OPERATIONS}?module=charges` },
    urgentTickets.length && { key: "tickets", tone: "warning", title: `${urgentTickets.length} ${urgentTickets.length === 1 ? "ticket de prioridad alta" : "tickets de prioridad alta"}`, detail: `${openTickets.length} abiertos en total`, cta: "Asignar", to: "/properties/tickets" },
    pendingPackages.length && { key: "packages", tone: "info", title: `${pendingPackages.length} ${pendingPackages.length === 1 ? "paquete en recepción" : "paquetes en recepción"}`, detail: "Esperan entrega al residente", cta: "Entregar", to: "/properties/accesos" },
    requestedReservations.length && { key: "amenities", tone: "info", title: `${requestedReservations.length} ${requestedReservations.length === 1 ? "reserva por aprobar" : "reservas por aprobar"}`, detail: "Amenidades de la comunidad", cta: "Aprobar", to: `${OPERATIONS}?module=amenities` },
    openVotes.length && { key: "votes", tone: "info", title: `${openVotes.length} ${openVotes.length === 1 ? "votación abierta" : "votaciones abiertas"}`, detail: "Da seguimiento a la participación", cta: "Ver", to: `${OPERATIONS}?module=committee` },
  ].filter(Boolean), [reportsToReview, overdue.length, overdueAmount, urgentTickets.length, openTickets.length, pendingPackages.length, requestedReservations.length, openVotes.length]);

  const resolved = [
    { label: "cuotas pagadas", count: condoCharges.filter((charge) => charge.status === "paid").length },
    { label: "paquetes entregados", count: packages.filter((item) => item.status === "delivered").length },
    { label: "tickets resueltos", count: tickets.filter((item) => item.status === "resolved").length },
  ].filter((row) => row.count > 0);

  // Antes decía "Buen día" a cualquier hora: el saludo y el cielo siguen la hora local.
  const now = new Date();
  const period = skyPeriod(now.getHours());

  return <EcoLayout active="properties" title="Properties" subtitle={organizationName}>
    <main className="pd-page">

      <section className="pd-hero">
        <div className={`pd-hero-copy sky-host is-${period}`}>
          <SkyScene period={period} kind="community"/>
          <p className="pd-date">{today.format(now).toUpperCase()}</p>
          <h1>{greeting(now.getHours())}, {firstName}.</h1>
          <p className="pd-lede">
            {decisions.length
              ? <>Hay <strong>{decisions.length} {decisions.length === 1 ? "cosa" : "cosas"}</strong> que requieren tu decisión. El resto de la operación está al corriente.</>
              : <>No hay pendientes que requieran tu decisión. Todo está al corriente.</>}
          </p>
          <div className="pd-hero-actions">
            <button type="button" className="pd-primary" onClick={() => navigate(decisions[0]?.to || "/properties/comunidades")}>
              {decisions.length ? decisions[0].cta : "Abrir comunidades"}
            </button>
            <button type="button" className="pd-ghost" onClick={() => navigate(`${OPERATIONS}?module=communications`)}>Nuevo comunicado</button>
          </div>
        </div>
      </section>

      <section className="pd-kpis" aria-label="Resumen del portafolio">
        <button type="button" onClick={() => navigate("/properties/portafolio")}>
          <small>Propiedades</small><strong>{properties.filter((item) => item.status !== "archived").length}</strong>
          <span>{activeUnits.length} {activeUnits.length === 1 ? "unidad" : "unidades"} en total</span>
        </button>
        <button type="button" onClick={() => navigate("/properties/comunidades?tab=units")}>
          <small>Ocupación</small><strong>{activeUnits.length ? `${occupancy}%` : "—"}</strong>
          <span className="pd-mini-bar"><i style={{ width: `${occupancy}%` }} /></span>
        </button>
        <button type="button" className={overdue.length ? "is-alert" : ""} onClick={() => navigate(`${OPERATIONS}?module=charges`)}>
          <small>Cuotas vencidas</small><strong>{overdue.length}</strong>
          <span>{overdue.length ? `${money(overdueAmount)} por cobrar` : "Nada vencido"}</span>
        </button>
        <button type="button" onClick={() => navigate(`${OPERATIONS}?module=committee`)}>
          <small>Votaciones abiertas</small><strong>{openVotes.length}</strong>
          <span>{openVotes.length ? "Da seguimiento" : "Ninguna en curso"}</span>
        </button>
      </section>

      <section className="pd-cols">
        <div className="pd-card pd-decisions">
          <header>
            <h2>Necesita tu decisión</h2>
            <button type="button" className="pd-link" onClick={() => navigate("/properties/operacion")}>Todas las herramientas</button>
          </header>
          {decisions.length ? decisions.map((item) => <article key={item.key}>
            <span className={`pd-dot ${item.tone}`} aria-hidden="true" />
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <button type="button" onClick={() => navigate(item.to)}>{item.cta}</button>
          </article>) : <p className="pd-empty">{propertiesLoading ? "Cargando la operación…" : "Sin pendientes. Nada requiere tu atención ahora mismo."}</p>}
        </div>

        <div className="pd-side">
          <div className="pd-card">
            <header><h2>Resuelto hasta hoy</h2></header>
            {resolved.length ? resolved.map((row) => <p key={row.label} className="pd-done-row">
              <HiCheck aria-hidden="true" /><span><strong>{row.count}</strong> {row.label}</span>
            </p>) : <p className="pd-empty">Todavía no hay movimientos registrados.</p>}
          </div>

          <div className="pd-card">
            <header><h2>Acciones rápidas</h2></header>
            <div className="pd-quick">
              <button type="button" onClick={() => navigate("/properties/accesos")}><HiInboxStack /> Registrar paquete</button>
              <button type="button" onClick={() => navigate("/properties/comunidades?tab=units&intent=add-resident")}><HiBuildingOffice2 /> Agregar residente</button>
              <button type="button" onClick={() => navigate("/properties/tickets")}><HiWrenchScrewdriver /> Nuevo ticket</button>
              <button type="button" onClick={() => navigate(`${OPERATIONS}?module=charges`)}><HiBanknotes /> Generar cargo</button>
            </div>
          </div>
        </div>
      </section>

    </main>
  </EcoLayout>;
}

export default PropertiesDashboard;
