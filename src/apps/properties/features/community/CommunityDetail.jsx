import { HiBuildingOffice2, HiChevronUp, HiDocumentText, HiPencilSquare } from "react-icons/hi2";
import MediaGallery, { useEntityMedia } from "../media/MediaGallery";
import SpecSheet from "../specs/SpecSheet";
import { buildingSpecSheet } from "../specs/specModel";
import { useBuildingSpec } from "../specs/useBuildingSpec";
import { COMMUNITY_KIND_LABEL } from "./communityModel";

const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);

/* Se despliega al elegir una tarjeta: los datos de la comunidad y sus fotos,
   con acceso directo a editarlos. Reemplaza a la antigua pestaña Configuración. */
function CommunityDetail({ community, property, unitsCount, peopleCount, canWrite, onEdit, onClose }) {
  const { images } = useEntityMedia("inmueble", community.inmuebleId);
  const cover = images[0]?.url;
  const building = buildingSpecSheet(useBuildingSpec(community.inmuebleId).data);
  const address = [property?.address, property?.city, property?.state].filter(Boolean).join(", ");
  const facts = [
    ["Tipo", COMMUNITY_KIND_LABEL[community.kind] || "Comunidad"],
    ["Unidades", unitsCount],
    ["Personas vinculadas", peopleCount],
    ["Cuota base mensual", community.cuotaBase === "" ? "Sin definir" : money(community.cuotaBase)],
    ["Día de cobro", community.billingDay === "" ? "Sin definir" : `Día ${community.billingDay}`],
  ];
  return <section id="community-detail" className="community-detail" aria-label={`Detalle de ${community.name}`}>
    <div className="community-detail-cover">{cover ? <img src={cover} alt="" /> : <HiBuildingOffice2 aria-hidden="true" />}</div>
    <div className="community-detail-body">
      <header>
        <div><span>Comunidad seleccionada</span><h2>{community.name}</h2><p>{address || "Sin dirección registrada en el inmueble"}</p></div>
        <div className="community-detail-actions">
          {canWrite ? <button type="button" className="primary" onClick={onEdit}><HiPencilSquare /> Editar comunidad</button> : null}
          <button type="button" onClick={onClose} aria-label="Ocultar detalle"><HiChevronUp /></button>
        </div>
      </header>
      <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {community.reglamentoUrl ? <a className="community-detail-link" href={community.reglamentoUrl} target="_blank" rel="noreferrer"><HiDocumentText /> Ver reglamento</a> : null}
      <section className="community-detail-spec"><h3>Ficha del edificio</h3><SpecSheet {...building} label={`Ficha técnica de ${community.name}`} emptyText={canWrite ? "Sin ficha técnica. Complétala desde Editar comunidad." : "Sin ficha técnica."}/></section>
      <MediaGallery entityType="inmueble" entityId={community.inmuebleId} label={`Fotos de ${community.name}`} emptyText={canWrite ? "Sin fotos todavía. Agrégalas desde Editar comunidad." : "Sin fotos todavía."} />
    </div>
  </section>;
}

export default CommunityDetail;
