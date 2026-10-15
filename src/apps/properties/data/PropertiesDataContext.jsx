import { createContext, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import propertiesService from "@/services/propertiesService";
import { communityKindFromRegimen, regimenFromCommunityKind } from "../features/community/communityModel";
import { createOwner } from "../features/owners/ownerModel";
import { createProperty } from "../features/properties/propertyModel";
import { createUnit } from "../features/units/unitModel";
import { createTicket, mapTicket, readWorkOrders, rememberWorkOrder } from "../features/tickets/ticketModel";
import { createCommunity, createCommunityPerson, createPersonUnitRelation } from "../features/community/communityModel";
import { createAnnouncement, createCondoCharge, createReservation, createUtilityBill, createUtilityService, seedUtilityBill, createVote } from "../features/condo/condoOperationsModel";
import { completeRentalInspection, createRentalInspection, createRentalLease, createRentalPayment, createRentalProspect, createRentalTenant } from "../features/rent/rentalModel";
import { demoRentalInspections, demoRentalLeases, demoRentalPayments, demoRentalProspects, demoRentalTenants } from "../features/rent/demoRentalData";
import { changeRentalListingStatus, createRentalListing, persistRentalListings, readRentalInquiries, readRentalListings, updateRentalListing } from "../features/listings/listingModel";
import { demoAmenities, demoAnnouncements, demoCommunities, demoCommunityPeople, demoCondoCharges, demoOwners, demoPersonUnitRelations, demoProperties, demoReservations, demoTickets, demoUnits, demoUtilityBills, demoUtilityServices, demoVotes } from "./demoPropertiesData";
import { unitSpecPayload } from "../features/specs/specModel";

const PropertiesDataContext = createContext(null);

function LegacyPropertiesDataProvider({ children }) {
  const [owners, setOwners] = useState(demoOwners);
  const [properties, setProperties] = useState(demoProperties);
  const [units, setUnits] = useState(demoUnits);
  const [tickets, setTickets] = useState(demoTickets);
  const [communities, setCommunities] = useState(demoCommunities);
  const [communityPeople, setCommunityPeople] = useState(demoCommunityPeople);
  const [personUnitRelations, setPersonUnitRelations] = useState(demoPersonUnitRelations);
  const [condoCharges,setCondoCharges]=useState(demoCondoCharges);
  const [announcements,setAnnouncements]=useState(demoAnnouncements);
  const [amenities]=useState(demoAmenities);
  const [reservations,setReservations]=useState(demoReservations);
  const [votes,setVotes]=useState(demoVotes);
  const [utilityServices,setUtilityServices]=useState(demoUtilityServices);
  const [utilityBills,setUtilityBills]=useState(demoUtilityBills);
  const [rentalProspects,setRentalProspects]=useState(() => [...readRentalInquiries(), ...demoRentalProspects]);
  const [rentalTenants,setRentalTenants]=useState(demoRentalTenants);
  const [rentalLeases,setRentalLeases]=useState(demoRentalLeases);
  const [rentalPayments,setRentalPayments]=useState(demoRentalPayments);
  const [rentalInspections,setRentalInspections]=useState(demoRentalInspections);
  const [rentalListings,setRentalListings]=useState(() => readRentalListings());

  const value = useMemo(() => ({
    owners,
    properties,
    units,
    tickets,
    communities,
    communityPeople,
    personUnitRelations,
    condoCharges,announcements,amenities,reservations,votes,utilityServices,utilityBills,
    // El proveedor demo no habla con properties-back; expone las mismas llaves
    // vacías para que las pantallas nuevas no revienten en modo test.
    quotaPlans:[],packages:[],portalIdentities:[],communityDashboards:[],arrears:[],
    serviceProviders:[],serviceSpecialties:[],serviceApplications:[],serviceEnrollmentLinks:[],retryServiceNetwork:async()=>{},
    addQuotaPlan:async()=>({}),previewQuotaRun:async()=>({items:[]}),runQuotaPlan:async()=>({}),
    addPackage:async()=>{},deliverPackage:async()=>{},
    enableServiceProvider:async()=>({}),updateServiceProvider:async()=>{},suspendServiceProvider:async()=>{},reactivateServiceProvider:async()=>{},archiveServiceProvider:async()=>{},
    getServiceProviderContacts:async()=>[],addServiceProviderContact:async()=>({}),
    inviteServiceContact:async()=>({}),resendServiceContactInvite:async()=>({}),revokeServiceContactInvite:async()=>({}),
    createServiceEnrollmentLink:async()=>({token:""}),revokeServiceEnrollmentLink:async()=>{},
    approveServiceApplication:async()=>{},rejectServiceApplication:async()=>{},
    invitePortal:async()=>({}),grantPortalAccess:async()=>{},suspendPortal:async()=>{},revokePortalGrant:async()=>{},portalGrants:async()=>[],
    rentalProspects,rentalTenants,rentalLeases,rentalPayments,rentalInspections,rentalListings,
    addOwner: (draft) => setOwners((current) => [createOwner(draft), ...current]),
    updateOwner: (id, draft) => setOwners((current) => current.map((owner) => owner.id === id
      ? { ...owner, ...draft, name: draft.name.trim(), email: draft.email.trim().toLowerCase(), phone: draft.phone.trim(), notes: draft.notes.trim() }
      : owner)),
    archiveOwner: (id) => setOwners((current) => current.map((owner) => owner.id === id ? { ...owner, status: "archived" } : owner)),
    addProperty: (draft) => {
      const property = createProperty(draft);
      setProperties((current) => [property, ...current]);
      return property;
    },
    updateProperty: (id, draft) => setProperties((current) => current.map((property) => property.id === id
      ? { ...property, ...draft, name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim(), state: draft.state.trim(), description: draft.description.trim() }
      : property)),
    archiveProperty: (id) => setProperties((current) => current.map((property) => property.id === id ? { ...property, status: "archived" } : property)),
    addUnit: (draft) => { const unit=createUnit(draft);setUnits((current) => [unit, ...current]);return unit; },
    updateUnit: (id, draft) => setUnits((current) => current.map((unit) => unit.id === id
      ? { ...unit, ...draft, identifier: draft.identifier.trim(), floor: draft.floor.trim(), area: Number(draft.area) || 0, bedrooms: Number(draft.bedrooms) || 0, bathrooms: Number(draft.bathrooms) || 0, suggestedRent: Number(draft.suggestedRent) || 0, description: draft.description.trim(), attributes: { ...(unit.attributes || {}), ...unitSpecPayload(draft.specs || {}) } }
      : unit)),
    archiveUnit: (id) => setUnits((current) => current.map((unit) => unit.id === id ? { ...unit, status: "archived" } : unit)),
    changeUnitStatus: (id, status) => setUnits((current) => current.map((unit) => unit.id === id ? { ...unit, status } : unit)),
    addTicket: (draft) => {
      const ticket = createTicket(draft);
      setTickets((current) => [ticket, ...current]);
      return ticket;
    },
    changeTicketStatus: (id, status) => setTickets((current) => current.map((ticket) => ticket.id === id
      ? { ...ticket, status, updatedAt: new Date().toISOString() }
      : ticket)),
    addCommunity: (draft) => {
      const community=createCommunity(draft);
      setCommunities((current)=>[community,...current]);
      return community;
    },
    updateCommunity: (id, draft) => setCommunities((current) => current.map((community) => community.id === id
      ? { ...community, ...draft, name:draft.name.trim(), regime:regimenFromCommunityKind(draft.kind), reglamentoUrl:draft.reglamentoUrl?.trim()||"" }
      : community)),
    addCommunityPerson: (draft) => setCommunityPeople((current) => [createCommunityPerson(draft), ...current]),
    updateCommunityPerson: (id, draft) => setCommunityPeople((current) => current.map((person) => person.id === id
      ? { ...person, ...draft, communityIds:[...new Set(draft.communityIds||person.communityIds||[])], personType:draft.personType||"individual", name:draft.name.trim(), email:draft.email.trim().toLowerCase(), phone:draft.phone.trim(), emergencyContactName:draft.emergencyContactName?.trim()||"", emergencyContactPhone:draft.emergencyContactPhone?.trim()||"", communicationPreference:draft.communicationPreference||"email", notes:draft.notes.trim(), roles:[...new Set(draft.roles)] }
      : person)),
    archiveCommunityPerson: (id) => setCommunityPeople((current) => current.map((person) => person.id === id ? { ...person, status:"archived" } : person)),
    addPersonUnitRelation: (draft) => setPersonUnitRelations((current) => [createPersonUnitRelation(draft,current), ...current]),
    addUnitMember: (draft) => {
      const person = draft.mode === "existing" ? null : createCommunityPerson({ ...draft, communityIds:[draft.communityId] });
      if (person) setCommunityPeople((current) => [person, ...current]);
      const personId = person?.id || draft.personId;
      setPersonUnitRelations((current) => [createPersonUnitRelation({ ...draft, personId }, current), ...current]);
      return personId;
    },
    archivePersonUnitRelation: (id) => setPersonUnitRelations((current) => current.map((relation) => relation.id === id ? { ...relation, status:"archived" } : relation)),
    addCondoCharge:(draft)=>setCondoCharges(current=>[createCondoCharge(draft),...current]),
    markCondoChargePaid:(id)=>setCondoCharges(current=>current.map(item=>item.id===id?{...item,status:"paid",paidAt:new Date().toISOString()}:item)),
    reverseCondoChargePayment:(id)=>setCondoCharges(current=>current.map(item=>item.id===id?{...item,status:"pending",paidAt:"",paymentReversedAt:new Date().toISOString()}:item)),
    addAnnouncement:(draft)=>setAnnouncements(current=>[createAnnouncement(draft),...current]),
    addReservation:(draft)=>setReservations(current=>[createReservation(draft,current),...current]),
    addVote:(draft)=>setVotes(current=>[createVote(draft),...current]),
    castVote:(id,choice)=>setVotes(current=>current.map(item=>item.id===id?{...item,[choice]:(item[choice]||0)+1}:item)),
    addUtilityService:(draft)=>{const service=createUtilityService(draft);const seed=seedUtilityBill(service);setUtilityServices(current=>[service,...current]);if(seed)setUtilityBills(current=>[seed,...current]);return service;},
    addUtilityBill:(serviceId,draft)=>{const service=utilityServices.find(item=>item.id===serviceId);const result=createUtilityBill(service,draft);setUtilityServices(current=>current.map(item=>item.id===serviceId?result.service:item));setUtilityBills(current=>[result.bill,...current]);return result;},
    reportUtilityPayment:(id,draft)=>{
      const evidenceName=draft?.evidenceName?.trim();
      if(!evidenceName) throw new Error("Adjunta el comprobante: sin evidencia no se puede reportar el pago.");
      const service=utilityServices.find(item=>item.id===id);
      const reportedAmount=Number(draft?.reportedAmount)||Number(service?.amount)||0;
      const paidAt=draft?.paidAt||"";
      setUtilityServices(current=>current.map(item=>item.id===id?{...item,status:"reported_paid",reportedAmount,evidenceName,updatedAt:new Date().toISOString()}:item));
      setUtilityBills(current=>{let done=false;return current.map(item=>{if(done||item.serviceId!==id)return item;done=true;return {...item,status:"reported_paid",reportedAmount,paidAt,evidenceName};});});
    },
    verifyUtilityPayment:(id)=>{
      const service=utilityServices.find(item=>item.id===id);
      if(!service?.evidenceName?.trim()) throw new Error("No se puede verificar un recibo sin evidencia.");
      setUtilityServices(current=>current.map(item=>item.id===id?{...item,status:"verified",updatedAt:new Date().toISOString()}:item));
      setUtilityBills(current=>{let done=false;return current.map(item=>{if(done||item.serviceId!==id)return item;done=true;return {...item,status:"verified"};});});
    },
    addRentalProspect:(draft)=>{const prospect=createRentalProspect(draft);setRentalProspects(current=>[prospect,...current]);return prospect;},
    changeRentalProspectStatus:(id,status)=>setRentalProspects(current=>current.map(item=>item.id===id?{...item,status,updatedAt:new Date().toISOString()}:item)),
    addRentalTenant:(draft)=>{const tenant=createRentalTenant(draft);setRentalTenants(current=>[tenant,...current]);return tenant;},
    archiveRentalTenant:(id)=>setRentalTenants(current=>current.map(item=>item.id===id?{...item,status:"archived"}:item)),
    addRentalLease:(draft)=>{const lease=createRentalLease(draft,rentalLeases);setRentalLeases(current=>[lease,...current]);setUnits(current=>current.map(unit=>unit.id===lease.unitId?{...unit,status:"rented"}:unit));setRentalListings(current=>persistRentalListings(current.map(listing=>listing.unitId===lease.unitId&&listing.status==="published"?changeRentalListingStatus(listing,"paused"):listing)));return lease;},
    changeRentalLeaseStatus:(id,status)=>{const lease=rentalLeases.find(item=>item.id===id);setRentalLeases(current=>current.map(item=>item.id===id?{...item,status,updatedAt:new Date().toISOString()}:item));if(lease&&status==="ended")setUnits(current=>current.map(unit=>unit.id===lease.unitId?{...unit,status:"available"}:unit));},
    renewRentalLease:(id,{endDate,rent})=>setRentalLeases(current=>current.map(item=>item.id===id?{...item,endDate,rent:Number(rent)||item.rent,updatedAt:new Date().toISOString()}:item)),
    addRentalPayment:(draft)=>{const payment=createRentalPayment(draft);setRentalPayments(current=>[payment,...current]);return payment;},
    addRentalInspection:(draft)=>{const inspection=createRentalInspection(draft);setRentalInspections(current=>[inspection,...current]);return inspection;},
    completeRentalInspection:(id,evidenceCount)=>setRentalInspections(current=>current.map(item=>item.id===id?completeRentalInspection(item,evidenceCount):item)),
    addRentalListing:(draft)=>{const listing=createRentalListing(draft,units,rentalListings);setRentalListings(current=>persistRentalListings([listing,...current]));return listing;},
    updateRentalListing:(id,draft)=>{const current=rentalListings.find(item=>item.id===id);if(!current)throw new Error("Publicación no encontrada.");const listing=updateRentalListing(current,draft,units,rentalListings);setRentalListings(rows=>persistRentalListings(rows.map(item=>item.id===id?listing:item)));return listing;},
    changeRentalListingStatus:(id,status)=>{const listing=rentalListings.find(item=>item.id===id);if(!listing)throw new Error("Publicación no encontrada.");const unit=units.find(item=>item.id===listing.unitId);if(status==="published"&&unit?.status!=="available")throw new Error("La unidad debe estar disponible antes de publicarla.");setRentalListings(current=>persistRentalListings(current.map(item=>item.id===id?changeRentalListingStatus(item,status):item)));},
  }), [owners, properties, units, tickets, communities, communityPeople, personUnitRelations, condoCharges, announcements, amenities, reservations, votes, utilityServices, utilityBills, rentalProspects, rentalTenants, rentalLeases, rentalPayments, rentalInspections, rentalListings]);

  return <PropertiesDataContext.Provider value={value}>{children}</PropertiesDataContext.Provider>;
}

const statusFromApi={vacante:"available",ocupado:"rented",en_renta:"rented",mantenimiento:"maintenance",en_venta:"available"};
const statusToApi={available:"vacante",rented:"en_renta",maintenance:"mantenimiento"};

function mapProperty(row){const a=row.attributes||{};return {id:row.id,attributes:a,inmuebleId:row.inmueble_id,parentId:row.parent_id,name:row.label,identifier:row.label,propertyId:row.parent_id||"",ownerId:a.owner_id||"",type:a.type||(row.parent_id?"apartment":"apartment_building"),address:a.address||"",city:a.city||"",state:a.state||"",description:a.description||"",floor:a.floor||"",area:Number(a.area)||0,bedrooms:Number(a.bedrooms)||0,bathrooms:Number(a.bathrooms)||0,suggestedRent:Number(a.suggested_rent)||0,status:row.is_archived?"archived":row.parent_id?(statusFromApi[row.estado]||"available"):"active",unitsCount:0,occupiedUnits:0};}
function mapPerson(row){return {id:row.id,name:row.nombre,email:row.correo||"",phone:row.telefono||"",notes:row.direccion||"",personType:"individual",roles:row.roles?.map(role=>role.clave)||[],communityIds:[],status:row.is_archived?"archived":"active",propertiesCount:0};}
function mapCommunity(row,roots){const property=roots.find(item=>item.inmuebleId===row.inmueble_id);return {id:row.id,propertyId:property?.id||"",inmuebleId:row.inmueble_id,name:row.legal_name||property?.name||"Comunidad",kind:communityKindFromRegimen(row.regimen),regime:row.regimen,cuotaBase:row.cuota_base===null||row.cuota_base===undefined?"":Number(row.cuota_base),billingDay:row.billing_day??"",reglamentoUrl:row.reglamento_url||"",status:"active"};}

// La votación cierra al final del día elegido, en la hora local de quien la abre.
const closesAtFromDate=date=>date?new Date(`${date}T23:59:00`).toISOString():null;
const localDate=value=>{if(!value)return "";const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};

function LivePropertiesDataProvider({children}){
  const queryClient=useQueryClient();
  const [utilityServices,setUtilityServices]=useState(demoUtilityServices);const [utilityBills,setUtilityBills]=useState(demoUtilityBills);const [rentalProspects,setRentalProspects]=useState(()=>[...readRentalInquiries(),...demoRentalProspects]);const [rentalTenants,setRentalTenants]=useState(demoRentalTenants);const [rentalLeases,setRentalLeases]=useState(demoRentalLeases);const [rentalPayments,setRentalPayments]=useState(demoRentalPayments);const [rentalInspections,setRentalInspections]=useState(demoRentalInspections);const [rentalListings,setRentalListings]=useState(()=>readRentalListings());
  const portfolio=useQuery({queryKey:["properties","portfolio"],queryFn:async()=>{const [propertyPage,personaPage,roles,communities]=await Promise.all([propertiesService.properties.list(),propertiesService.personas.list(),propertiesService.roles(),propertiesService.communities.list()]);const relations=(await Promise.all(personaPage.items.map(person=>propertiesService.relations.list({persona_id:person.id})))).flat();const all=propertyPage.items.map(mapProperty);const properties=all.filter(item=>!item.parentId).map(root=>({...root,unitsCount:all.filter(item=>item.parentId===root.id&&item.status!=="archived").length,occupiedUnits:all.filter(item=>item.parentId===root.id&&item.status==="rented").length}));const units=all.filter(item=>item.parentId);const people=personaPage.items.map(mapPerson);return {properties,units,people,roles,relations,communities:communities.map(row=>mapCommunity(row,properties))}},retry:false});
  const operations=useQuery({queryKey:["properties","operations",portfolio.dataUpdatedAt],enabled:Boolean(portfolio.data),queryFn:async()=>{const communities=portfolio.data.communities;const charges=(await propertiesService.charges.list()).items;const identities=await propertiesService.portalAdmin.identities();const groups=await Promise.all(communities.map(async community=>{const [announcements,amenities,votes,packages,quotaPlans,dashboard,arrears]=await Promise.all([propertiesService.announcements.list(community.id),propertiesService.amenities.list(community.id),propertiesService.votes.list(community.id),propertiesService.packages.list(community.id),propertiesService.communities.quotaPlans(community.id),propertiesService.communities.dashboard(community.id),propertiesService.charges.arrears(community.id)]);const reservations=(await Promise.all(amenities.map(item=>propertiesService.amenities.reservations(item.id)))).flat();return {communityId:community.id,announcements,amenities,votes,packages,quotaPlans,dashboard,arrears,reservations}}));return {charges,identities,groups}},retry:false});
  const serviceNetwork=useQuery({queryKey:["properties","service-network"],queryFn:async()=>{const [providers,specialties,applications,enrollmentLinks]=await Promise.all([propertiesService.serviceNetwork.providers.list(),propertiesService.serviceNetwork.specialties(),propertiesService.serviceNetwork.applications.list({status:"pending"}),propertiesService.serviceNetwork.enrollmentLinks.list()]);return {providers:providers.items,specialties,applications,enrollmentLinks}},retry:false});
  const refresh=async()=>{await queryClient.invalidateQueries({queryKey:["properties"]})};
  const p=portfolio.data||{properties:[],units:[],people:[],roles:[],relations:[],communities:[]};const groups=operations.data?.groups||[];
  // Tickets reales por comunidad. Las órdenes de trabajo se completan con lo que este navegador conoce (ver ticketModel).
  const ticketRows=useQuery({queryKey:["properties","tickets",p.communities.map(item=>item.id).join(",")],enabled:Boolean(portfolio.data),queryFn:async()=>(await Promise.all(p.communities.map(async community=>(await propertiesService.tickets.list(community.id)).map(row=>({row,communityId:community.id}))))).flat(),retry:false});
  const [workOrders,setWorkOrders]=useState(readWorkOrders);
  const tickets=useMemo(()=>{const unitById=Object.fromEntries(p.units.map(item=>[item.id,item]));const personById=Object.fromEntries(p.people.map(item=>[item.id,item]));return (ticketRows.data||[]).map(({row,communityId})=>mapTicket(row,{community:p.communities.find(item=>item.id===communityId),unitById,personById,workOrder:workOrders[row.id]||null})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))},[ticketRows.data,p.units,p.people,p.communities,workOrders]);
  const refreshTickets=()=>queryClient.invalidateQueries({queryKey:["properties","tickets"]});
  const keepWorkOrder=(ticketId,order,assigneeName)=>setWorkOrders(current=>({...current,[ticketId]:rememberWorkOrder(ticketId,{...order,...(assigneeName?{assigneeName}:{})})}));
  const communityForTicket=d=>{const unit=p.units.find(item=>item.id===d.unitId);const rootId=unit?.propertyId||d.propertyId;return p.communities.find(item=>item.propertyId===rootId)||(p.communities.length===1?p.communities[0]:null)};
  const assignTicket=async(ticketId,{providerId,scheduledAt=null})=>{const provider=(serviceNetwork.data?.providers||[]).find(item=>item.id===providerId);const order=await propertiesService.tickets.assign(ticketId,{service_provider_id:providerId,scheduled_at:scheduledAt});keepWorkOrder(ticketId,order,provider?.name||"Proveedor");await refreshTickets();return order};
  const personUnitRelations=p.relations.map(row=>{const role=p.roles.find(item=>item.id===row.role_id);const community=p.communities.find(item=>item.propertyId===p.units.find(unit=>unit.id===row.property_id)?.propertyId);return {id:row.id,communityId:community?.id||"",personId:row.persona_id,unitId:row.property_id,role:role?.clave||"resident",isPrimary:row.is_primary,isPaymentResponsible:row.is_payment_responsible,canVote:row.can_vote,amenityAccess:row.has_amenity_access,accessPermission:row.has_access_permission,startsAt:row.start_date||"",endsAt:row.end_date||"",status:row.end_date?"archived":"active"}});
  const communityPeople=p.people.map(person=>({...person,communityIds:[...new Set(personUnitRelations.filter(rel=>rel.personId===person.id).map(rel=>rel.communityId).filter(Boolean))]}));
  const condoCharges=(operations.data?.charges||[]).map(row=>{const unit=p.units.find(item=>item.id===row.property_id);return {id:row.id,communityId:p.communities.find(item=>item.propertyId===unit?.propertyId)?.id||"",unitId:row.property_id,personId:row.persona_id,concept:row.concept,amount:Number(row.amount),paidAmount:Number(row.paid_amount),dueDate:row.due_date,status:row.status}});
  const announcements=groups.flatMap(group=>group.announcements.map(row=>({...row,communityId:group.communityId,readCount:row.read_count||0})));const amenities=groups.flatMap(group=>group.amenities.map(row=>({...row,communityId:group.communityId})));const reservations=groups.flatMap(group=>group.reservations.map(row=>({...row,communityId:group.communityId,amenityId:row.amenity_id,unitId:row.property_id,personId:row.persona_id,date:row.starts_at?.slice(0,10),time:row.starts_at?.slice(11,16)})));const votes=groups.flatMap(group=>group.votes.map(row=>({...row,communityId:group.communityId,title:row.question,description:"",closesAt:localDate(row.closes_at),yes:0,no:0,abstain:0})));
  const roleId=(key)=>p.roles.find(role=>role.clave===key)?.id;
  const GENERAL_ROLES=["board_member"];
  const syncGeneralRoles=async(personId,current=[],wanted=[])=>{const want=new Set((wanted||[]).map(key=>key==="committee"?"board_member":key).filter(key=>GENERAL_ROLES.includes(key)));for(const key of GENERAL_ROLES){const id=roleId(key);if(!id)continue;if(want.has(key)&&!current.includes(key))await propertiesService.personas.assignRole(personId,id);if(!want.has(key)&&current.includes(key))await propertiesService.personas.removeRole(personId,id);}};
  const value={owners:p.people.filter(person=>person.roles.includes("owner")||personUnitRelations.some(rel=>rel.personId===person.id&&rel.role==="owner"&&rel.status!=="archived")),properties:p.properties,units:p.units,tickets,communities:p.communities,communityPeople,personUnitRelations,condoCharges,announcements,amenities,reservations,votes,packages:groups.flatMap(g=>g.packages.map(x=>({...x,communityId:g.communityId}))),quotaPlans:groups.flatMap(g=>g.quotaPlans.map(row=>({...row,communityId:g.communityId}))),communityDashboards:groups.map(g=>g.dashboard),arrears:groups.map(g=>g.arrears),portalIdentities:operations.data?.identities||[],utilityServices,utilityBills,rentalProspects,rentalTenants,rentalLeases,rentalPayments,rentalInspections,rentalListings,propertiesLoading:portfolio.isLoading||operations.isLoading,propertiesError:portfolio.error||operations.error,retryProperties:refresh,
    serviceProviders:serviceNetwork.data?.providers||[],serviceSpecialties:serviceNetwork.data?.specialties||[],serviceApplications:serviceNetwork.data?.applications||[],serviceEnrollmentLinks:serviceNetwork.data?.enrollmentLinks||[],serviceNetworkLoading:serviceNetwork.isLoading,serviceNetworkError:serviceNetwork.error,retryServiceNetwork:()=>serviceNetwork.refetch(),
    addOwner:async d=>{const person=await propertiesService.personas.create({nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});const ownerRole=roleId("owner");if(ownerRole)await propertiesService.personas.assignRole(person.id,ownerRole);await refresh();return mapPerson(person)},updateOwner:async(id,d)=>{await propertiesService.personas.update(id,{nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});await refresh()},archiveOwner:async id=>{await propertiesService.personas.archive(id);await refresh()},
    addProperty:async d=>{const row=await propertiesService.properties.createRoot({label:d.name,estado:"vacante",attributes:{owner_id:d.ownerId||null,type:d.type,address:d.address,city:d.city,state:d.state,description:d.description}});await refresh();return mapProperty(row)},updateProperty:async(id,d)=>{await propertiesService.properties.update(id,{label:d.name,attributes:{owner_id:d.ownerId||null,type:d.type,address:d.address,city:d.city,state:d.state,description:d.description}});await refresh()},archiveProperty:async id=>{await propertiesService.properties.archive(id);await refresh()},
    addUnit:async d=>{const row=await propertiesService.properties.create({parent_id:d.propertyId,label:d.identifier,estado:statusToApi[d.status]||"vacante",attributes:{...unitSpecPayload(d.specs||{}),owner_id:d.ownerId||null,type:d.type,floor:d.floor,area:Number(d.area)||0,bedrooms:Number(d.bedrooms)||0,bathrooms:Number(d.bathrooms)||0,suggested_rent:Number(d.suggestedRent)||0,description:d.description}});await refresh();return mapProperty(row)},// PATCH reemplaza `attributes` completo: se parte de lo guardado para no perder
    // llaves que el formulario no conoce (fichas técnicas cargadas por otro lado).
    updateUnit:async(id,d)=>{await propertiesService.properties.update(id,{label:d.identifier,attributes:{...(p.units.find(unit=>unit.id===id)?.attributes||{}),...unitSpecPayload(d.specs||{}),owner_id:d.ownerId||null,type:d.type,floor:d.floor,area:Number(d.area)||0,bedrooms:Number(d.bedrooms)||0,bathrooms:Number(d.bathrooms)||0,suggested_rent:Number(d.suggestedRent)||0,description:d.description}});await refresh()},archiveUnit:async id=>{await propertiesService.properties.archive(id);await refresh()},changeUnitStatus:async(id,status)=>{await propertiesService.properties.changeStatus(id,statusToApi[status]);await refresh()},
    addCommunity:async d=>{const root=p.properties.find(item=>item.id===d.propertyId);const inmuebleId=d.inmuebleId||root?.inmuebleId;if(!inmuebleId)throw new Error("No encontramos el inmueble compartido para crear la comunidad.");const row=await propertiesService.communities.create({inmueble_id:inmuebleId,legal_name:d.name,regimen:regimenFromCommunityKind(d.kind),cuota_base:Number(d.cuotaBase)||null,billing_day:Number(d.billingDay)||null,reglamento_url:d.reglamentoUrl||null});await refresh();return {...mapCommunity(row,root?[root]:[]),propertyId:d.propertyId}},updateCommunity:async(id,d)=>{await propertiesService.communities.update(id,{legal_name:d.name,regimen:regimenFromCommunityKind(d.kind),cuota_base:Number(d.cuotaBase)||null,billing_day:Number(d.billingDay)||null,reglamento_url:d.reglamentoUrl||null});await refresh()},
    // Roles generales (hoy sólo comité). Dueño, residente e inquilino viven en
    // el vínculo con la unidad, no en la persona.
    addCommunityPerson:async d=>{const person=await propertiesService.personas.create({nombre:d.name,correo:d.email||null,telefono:d.phone||null,direccion:d.notes||null});await syncGeneralRoles(person.id,[],d.roles);await refresh();return mapPerson(person)},updateCommunityPerson:async(id,d)=>{await propertiesService.personas.update(id,{nombre:d.name,correo:d.email||null,telefono:d.phone||null,direccion:d.notes||null});await syncGeneralRoles(id,p.people.find(person=>person.id===id)?.roles||[],d.roles);await refresh()},archiveCommunityPerson:async id=>{await propertiesService.personas.archive(id);await refresh()},
    // Pieza central: alta de una persona en una unidad en un solo paso. Crea a la
    // persona si es nueva y luego su vínculo; una sola recarga al final.
    addUnitMember:async d=>{const roleKey=roleId(d.role);if(!roleKey)throw new Error("El rol seleccionado no existe en el catálogo del backend.");const personId=d.mode==="existing"?d.personId:(await propertiesService.personas.create({nombre:d.name.trim(),correo:d.email?.trim()||null,telefono:d.phone?.trim()||null,direccion:null})).id;await propertiesService.relations.create({property_id:d.unitId,persona_id:personId,role_id:roleKey,start_date:d.startsAt||null,end_date:d.endsAt||null,is_primary:Boolean(d.isPrimary),is_payment_responsible:Boolean(d.isPaymentResponsible),can_vote:Boolean(d.canVote),has_amenity_access:Boolean(d.amenityAccess),has_access_permission:Boolean(d.accessPermission)});await refresh();return personId},
    addPersonUnitRelation:async d=>{const id=roleId(d.role);if(!id)throw new Error("El rol seleccionado no existe en el catálogo del backend.");await propertiesService.relations.create({property_id:d.unitId,persona_id:d.personId,role_id:id,start_date:d.startsAt||null,is_primary:Boolean(d.isPrimary),is_payment_responsible:Boolean(d.isPaymentResponsible),can_vote:Boolean(d.canVote),has_amenity_access:Boolean(d.amenityAccess),has_access_permission:Boolean(d.accessPermission)});await refresh()},archivePersonUnitRelation:async id=>{await propertiesService.relations.end(id);await refresh()},
    addCondoCharge:async d=>{const unit=p.units.find(item=>item.id===d.unitId);const relation=personUnitRelations.find(item=>item.unitId===unit?.id&&item.isPaymentResponsible)||personUnitRelations.find(item=>item.unitId===unit?.id);if(!unit||!relation)throw new Error("Selecciona una unidad con una persona responsable de pago.");await propertiesService.charges.create({property_id:unit.id,persona_id:relation.personId,concept:d.concept,amount:Number(d.amount),currency:"MXN",period:d.period||null,due_date:d.dueDate});await refresh()},markCondoChargePaid:async id=>{const charge=condoCharges.find(item=>item.id===id);await propertiesService.charges.settle(id,{persona_id:charge.personId,amount:charge.amount-charge.paidAmount,method:"manual"});await refresh()},waiveCondoCharge:async(id,reason)=>{await propertiesService.charges.waive(id,reason);await refresh()},
    addAnnouncement:async d=>{const row=await propertiesService.announcements.create(d.communityId,{title:d.title,body:d.body,audience:d.audience||"all",unit_ids:[],is_urgent:Boolean(d.isUrgent),attachments:[]});await propertiesService.announcements.publish(row.id);await refresh()},
    addAmenity:async d=>{await propertiesService.amenities.create(d.communityId,{name:d.name,capacity:Number(d.capacity)||1,lead_time_hours:Number(d.leadTimeHours)||0,cancel_window_hours:Number(d.cancelWindowHours)||0,fee_amount:Number(d.feeAmount)||0,requires_approval:Boolean(d.requiresApproval)});await refresh()},addReservation:async d=>{const relation=personUnitRelations.find(item=>item.unitId===d.unitId)||personUnitRelations[0];if(!relation)throw new Error("La reservación necesita una persona vinculada.");const starts=`${d.date}T${d.time}:00`;const ends=new Date(new Date(starts).getTime()+60*60*1000).toISOString();await propertiesService.amenities.reserve(d.amenityId,{property_id:d.unitId,persona_id:relation.personId,starts_at:new Date(starts).toISOString(),ends_at:ends});await refresh()},confirmReservation:async id=>{await propertiesService.amenities.confirm(id);await refresh()},cancelReservation:async(id,reason)=>{await propertiesService.amenities.cancel(id,reason);await refresh()},
    addQuotaPlan:async(communityId,d)=>{const row=await propertiesService.communities.createQuotaPlan(communityId,{concept:d.concept,quota_kind:d.quotaKind||"ordinary",basis:d.basis||"flat",amount:String(d.amount),frequency:d.frequency||"monthly",late_fee_kind:d.lateFeeKind||"none",late_fee_value:d.lateFeeValue?String(d.lateFeeValue):null,effective_from:d.effectiveFrom,effective_to:d.effectiveTo||null});await refresh();return row},
    // `dry_run` no escribe: devuelve el mismo desglose que escribiría, para que
    // el usuario vea a cuántas unidades le va a pegar antes de confirmar.
    previewQuotaRun:(communityId,planId,d)=>propertiesService.communities.generateQuota(communityId,planId,{period_start:d.periodStart,period_end:d.periodEnd,due_date:d.dueDate,dry_run:true}),
    runQuotaPlan:async(communityId,planId,d)=>{const row=await propertiesService.communities.generateQuota(communityId,planId,{period_start:d.periodStart,period_end:d.periodEnd,due_date:d.dueDate});await refresh();return row},
    addPackage:async(communityId,d)=>{await propertiesService.packages.create(communityId,{property_id:d.unitId,carrier:d.carrier||null,tracking_number:d.trackingNumber||null,photo_url:d.photoUrl||null});await refresh()},
    deliverPackage:async(id,d)=>{await propertiesService.packages.deliver(id,{recipient_persona_id:d.personId,signature_url:d.signatureUrl||null});await refresh()},
    // Red de proveedores (PRV-01 a PRV-10). `enableServiceProvider` vincula un
    // Provider YA existente en Core (buscado aparte, vía `providerService` del
    // Core) — nunca crea uno nuevo desde acá.
    enableServiceProvider:async d=>{const row=await propertiesService.serviceNetwork.providers.create({core_provider_id:d.coreProviderId,kind:d.kind,description:d.description||null,declared_availability:d.declaredAvailability||null,specialty_ids:d.specialtyIds||[]});await refresh();return row},
    updateServiceProvider:async(id,d)=>{await propertiesService.serviceNetwork.providers.update(id,{description:d.description,declared_availability:d.declaredAvailability});await refresh()},
    suspendServiceProvider:async(id,reason)=>{await propertiesService.serviceNetwork.providers.suspend(id,reason);await refresh()},
    reactivateServiceProvider:async id=>{await propertiesService.serviceNetwork.providers.reactivate(id);await refresh()},
    archiveServiceProvider:async(id,reason)=>{await propertiesService.serviceNetwork.providers.archive(id,reason);await refresh()},
    getServiceProviderContacts:id=>propertiesService.serviceNetwork.providers.contacts(id),
    // Igual que `addUnitMember`: crea la persona si es nueva, luego el vínculo.
    addServiceProviderContact:async(profileId,d)=>{const personId=d.mode==="existing"?d.personaId:(await propertiesService.personas.create({nombre:d.name.trim(),correo:d.email?.trim()||null,telefono:d.phone?.trim()||null,direccion:null})).id;const row=await propertiesService.serviceNetwork.providers.addContact(profileId,{persona_id:personId,role:d.role,invitation_mode:d.invitationMode||"permanent"});await refresh();return row},
    inviteServiceContact:async id=>{const row=await propertiesService.serviceNetwork.contacts.invite(id);await refresh();return row},
    resendServiceContactInvite:id=>propertiesService.serviceNetwork.contacts.resendInvite(id),
    revokeServiceContactInvite:id=>propertiesService.serviceNetwork.contacts.revokeInvite(id),
    createServiceEnrollmentLink:async d=>{const row=await propertiesService.serviceNetwork.enrollmentLinks.create(d);await refresh();return row},
    revokeServiceEnrollmentLink:async id=>{await propertiesService.serviceNetwork.enrollmentLinks.revoke(id);await refresh()},
    approveServiceApplication:async(id,d)=>{await propertiesService.serviceNetwork.applications.approve(id,d);await refresh()},
    rejectServiceApplication:async(id,reason)=>{await propertiesService.serviceNetwork.applications.reject(id,reason);await refresh()},
    invitePortal:async d=>{const row=await propertiesService.portalAdmin.invite({persona_id:d.personId,email:d.email});await refresh();return row},
    grantPortalAccess:async d=>{await propertiesService.portalAdmin.grant({portal_identity_id:d.identityId,scope_type:d.scopeType||"property",scope_id:d.scopeId,permission:d.permission||"read"});await refresh()},
    suspendPortal:async id=>{await propertiesService.portalAdmin.suspend(id);await refresh()},
    revokePortalGrant:async id=>{await propertiesService.portalAdmin.revoke(id);await refresh()},
    portalGrants:id=>propertiesService.portalAdmin.grants(id),
    addVote:async d=>{const row=await propertiesService.votes.create(d.communityId,{question:d.title,options:[{id:"yes",label:"Sí"},{id:"no",label:"No"},{id:"abstain",label:"Abstención"}],weighting:"per_unit",quorum_pct:null,results_visibility:"after_close"});await propertiesService.votes.open(row.id,closesAtFromDate(d.closesAt));await refresh()},castVote:async(id,choice)=>{const relation=personUnitRelations.find(item=>item.canVote);if(!relation)throw new Error("No hay una relación con derecho de voto.");await propertiesService.votes.ballot(id,relation.id,choice);await refresh()},closeVote:async id=>{await propertiesService.votes.close(id);await refresh()},
    backendLive:true,ticketsLive:true,ticketsLoading:ticketRows.isLoading,ticketsError:ticketRows.error,
    addTicket:async d=>{const community=communityForTicket(d);if(!community)throw new Error("Elige la propiedad de la comunidad donde ocurre el problema.");const row=await propertiesService.tickets.create(community.id,{property_id:d.unitId||null,title:d.title.trim(),description:d.description?.trim()||null,ticket_type:d.type,priority:d.priority});if(d.providerId)await assignTicket(row.id,{providerId:d.providerId});await refreshTickets();return row},
    changeTicketStatus:async(id,status)=>{if(status==="resolved")await propertiesService.tickets.resolve(id);else if(status==="cancelled")await propertiesService.tickets.cancel(id);else throw new Error("Ese estado cambia con la orden de trabajo, no a mano.");await refreshTickets()},
    assignTicket,
    advanceWorkOrder:async(ticketId,status)=>{const current=workOrders[ticketId];if(!current)throw new Error("No conocemos la orden de este ticket en este navegador.");const order=await propertiesService.workOrders.setStatus(current.id,{status,version:current.version});keepWorkOrder(ticketId,order);await refreshTickets();return order},
    commentTicket:(id,body,visibility)=>propertiesService.tickets.comment(id,body,visibility),
    getTicket:id=>propertiesService.tickets.get(id),
    addUtilityService:d=>{const service=createUtilityService(d);const seed=seedUtilityBill(service);setUtilityServices(c=>[service,...c]);if(seed)setUtilityBills(c=>[seed,...c]);return service},addUtilityBill:(id,d)=>{const service=utilityServices.find(x=>x.id===id);const result=createUtilityBill(service,d);setUtilityServices(c=>c.map(x=>x.id===id?result.service:x));setUtilityBills(c=>[result.bill,...c]);return result},reportUtilityPayment:(id,d)=>{const evidenceName=d?.evidenceName?.trim();if(!evidenceName)throw new Error("Adjunta el comprobante: sin evidencia no se puede reportar el pago.");const service=utilityServices.find(x=>x.id===id);const reportedAmount=Number(d?.reportedAmount)||Number(service?.amount)||0;const paidAt=d?.paidAt||"";setUtilityServices(c=>c.map(x=>x.id===id?{...x,status:"reported_paid",reportedAmount,evidenceName,updatedAt:new Date().toISOString()}:x));setUtilityBills(c=>{let done=false;return c.map(x=>{if(done||x.serviceId!==id)return x;done=true;return {...x,status:"reported_paid",reportedAmount,paidAt,evidenceName}})})},verifyUtilityPayment:id=>{const service=utilityServices.find(x=>x.id===id);if(!service?.evidenceName?.trim())throw new Error("No se puede verificar un recibo sin evidencia.");setUtilityServices(c=>c.map(x=>x.id===id?{...x,status:"verified",updatedAt:new Date().toISOString()}:x));setUtilityBills(c=>{let done=false;return c.map(x=>{if(done||x.serviceId!==id)return x;done=true;return {...x,status:"verified"}})})},
    addRentalProspect:d=>{const x=createRentalProspect(d);setRentalProspects(c=>[x,...c]);return x},changeRentalProspectStatus:(id,status)=>setRentalProspects(c=>c.map(x=>x.id===id?{...x,status}:x)),addRentalTenant:d=>{const x=createRentalTenant(d);setRentalTenants(c=>[x,...c]);return x},archiveRentalTenant:id=>setRentalTenants(c=>c.map(x=>x.id===id?{...x,status:"archived"}:x)),addRentalLease:d=>{const x=createRentalLease(d,rentalLeases);setRentalLeases(c=>[x,...c]);return x},changeRentalLeaseStatus:(id,status)=>setRentalLeases(c=>c.map(x=>x.id===id?{...x,status}:x)),renewRentalLease:(id,d)=>setRentalLeases(c=>c.map(x=>x.id===id?{...x,...d}:x)),addRentalPayment:d=>{const x=createRentalPayment(d);setRentalPayments(c=>[x,...c]);return x},addRentalInspection:d=>{const x=createRentalInspection(d);setRentalInspections(c=>[x,...c]);return x},completeRentalInspection:(id,n)=>setRentalInspections(c=>c.map(x=>x.id===id?completeRentalInspection(x,n):x)),addRentalListing:d=>{const x=createRentalListing(d,p.units,rentalListings);setRentalListings(c=>persistRentalListings([x,...c]));return x},updateRentalListing:(id,d)=>setRentalListings(c=>persistRentalListings(c.map(x=>x.id===id?updateRentalListing(x,d,p.units,c):x))),changeRentalListingStatus:(id,status)=>setRentalListings(c=>persistRentalListings(c.map(x=>x.id===id?changeRentalListingStatus(x,status):x)))
  };
  return <PropertiesDataContext.Provider value={value}>{children}</PropertiesDataContext.Provider>;
}

export function PropertiesDataProvider({children}){
  if(import.meta.env.MODE==="test") return <LegacyPropertiesDataProvider>{children}</LegacyPropertiesDataProvider>;
  return <LivePropertiesDataProvider>{children}</LivePropertiesDataProvider>;
}

export function usePropertiesData() {
  const context = useContext(PropertiesDataContext);
  if (!context) throw new Error("usePropertiesData must be used inside PropertiesDataProvider");
  return context;
}
