import { useQueries } from "@tanstack/react-query";
import { HiBanknotes, HiBuildingOffice2, HiCalendarDays, HiCheckCircle, HiExclamationTriangle, HiInboxStack, HiScale, HiUsers } from "react-icons/hi2";
import propertiesService from "@/services/propertiesService";
import { COMMUNITY_KIND_LABEL, communityAlerts } from "./communityModel";

const ALERT_ICON = { setup: HiExclamationTriangle, charges: HiBanknotes, reservations: HiCalendarDays, packages: HiInboxStack, votes: HiScale };
const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);

// Portada = primera imagen del expediente del inmueble. Las URLs vienen
// firmadas y vencen, por eso se consultan con poco tiempo de vida en caché.
function useCommunityCovers(communities) {
  const results = useQueries({
    queries: communities.map((community) => ({
      queryKey: ["properties", "community-cover", community.inmuebleId],
      queryFn: () => propertiesService.media.list("inmueble", community.inmuebleId),
      enabled: Boolean(community.inmuebleId),
      staleTime: 4 * 60 * 1000,
      retry: false,
    })),
  });
  return Object.fromEntries(communities.map((community, index) => {
    const image = (results[index]?.data || []).find((asset) => asset.content_type?.startsWith("image/") && asset.url);
    return [community.id, image?.url || ""];
  }));
}

function CommunityCards({ communities, selectedId, onSelect, onAlert, data }) {
  const covers = useCommunityCovers(communities);
  return <section className="community-cards" aria-label="Comunidades">
    {communities.map((community) => {
      const units = data.units.filter((unit) => unit.propertyId === community.propertyId && unit.status !== "archived");
      const people = new Set(data.personUnitRelations.filter((relation) => relation.communityId === community.id && relation.status !== "archived").map((relation) => relation.personId));
      const alerts = communityAlerts({ community, units: data.units, relations: data.personUnitRelations, charges: data.condoCharges, packages: data.packages, reservations: data.reservations, votes: data.votes });
      const selected = community.id === selectedId;
      return <article key={community.id} className={`community-card ${selected ? "is-selected" : ""}`}>
        <button type="button" className="community-card-main" onClick={() => onSelect(community.id)} aria-pressed={selected}>
          <span className="community-card-cover">{covers[community.id] ? <img src={covers[community.id]} alt="" loading="lazy" /> : <HiBuildingOffice2 aria-hidden="true" />}</span>
          <span className="community-card-copy">
            <strong>{community.name}</strong>
            <small>{COMMUNITY_KIND_LABEL[community.kind] || "Comunidad"}</small>
            <span className="community-card-counts">
              <i title="Unidades"><HiBuildingOffice2 aria-hidden="true" /> {units.length}<span className="sr-only"> unidades</span></i>
              <i title="Personas vinculadas"><HiUsers aria-hidden="true" /> {people.size}<span className="sr-only"> personas vinculadas</span></i>
            </span>
          </span>
          {selected ? <b className="community-card-badge">Seleccionada</b> : null}
        </button>
        <footer className="community-card-alerts">
          {alerts.length ? alerts.map((alert) => {
            const Icon = ALERT_ICON[alert.key];
            const text = alert.amount ? `${alert.label} · ${money(alert.amount)}` : alert.label;
            return <button type="button" key={alert.key} className={`community-alert ${alert.tone}`} onClick={() => onAlert(community, alert)} title={text} aria-label={`${community.name}: ${text}`}>
              <Icon aria-hidden="true" />{alert.count ? <span>{alert.count}</span> : null}
            </button>;
          }) : <span className="community-card-clear"><HiCheckCircle aria-hidden="true" /> Sin pendientes</span>}
        </footer>
      </article>;
    })}
  </section>;
}

export default CommunityCards;
