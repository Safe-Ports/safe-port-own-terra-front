import { createContext, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import propertiesService from "@/services/propertiesService";
import { createOwner } from "../features/owners/ownerModel";
import { createProperty } from "../features/properties/propertyModel";
import { createUnit } from "../features/units/unitModel";
import { createTicket } from "../features/tickets/ticketModel";
import { createCommunity, createCommunityPerson, createPersonUnitRelation } from "../features/community/communityModel";
import { createAnnouncement, createCondoCharge, createReservation, createUtilityReading, createUtilityService, createVote } from "../features/condo/condoOperationsModel";
import { completeRentalInspection, createRentalInspection, createRentalLease, createRentalPayment, createRentalProspect, createRentalTenant } from "../features/rent/rentalModel";
import { demoRentalInspections, demoRentalLeases, demoRentalPayments, demoRentalProspects, demoRentalTenants } from "../features/rent/demoRentalData";
import { changeRentalListingStatus, createRentalListing, persistRentalListings, readRentalInquiries, readRentalListings, updateRentalListing } from "../features/listings/listingModel";
import { demoAmenities, demoAnnouncements, demoCommunities, demoCommunityPeople, demoCondoCharges, demoOwners, demoPersonUnitRelations, demoProperties, demoReservations, demoTickets, demoUnits, demoUtilityReadings, demoUtilityServices, demoVotes } from "./demoPropertiesData";

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
  const [utilityReadings,setUtilityReadings]=useState(demoUtilityReadings);
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
    condoCharges,announcements,amenities,reservations,votes,utilityServices,utilityReadings,
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
    addUnit: (draft) => setUnits((current) => [createUnit(draft), ...current]),
    updateUnit: (id, draft) => setUnits((current) => current.map((unit) => unit.id === id
      ? { ...unit, ...draft, identifier: draft.identifier.trim(), floor: draft.floor.trim(), area: Number(draft.area) || 0, bedrooms: Number(draft.bedrooms) || 0, bathrooms: Number(draft.bathrooms) || 0, suggestedRent: Number(draft.suggestedRent) || 0, description: draft.description.trim() }
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
      ? { ...community, ...draft, name:draft.name.trim(), regime:draft.regime.trim(), administrator:draft.administrator.trim(), contactEmail:draft.contactEmail.trim().toLowerCase(), contactPhone:draft.contactPhone.trim(), operationFrequency:draft.operationFrequency||"monthly", timezone:draft.timezone||"America/Mexico_City", currency:draft.currency||"MXN" }
      : community)),
    addCommunityPerson: (draft) => setCommunityPeople((current) => [createCommunityPerson(draft), ...current]),
    updateCommunityPerson: (id, draft) => setCommunityPeople((current) => current.map((person) => person.id === id
      ? { ...person, ...draft, communityIds:[...new Set(draft.communityIds||person.communityIds||[])], personType:draft.personType||"individual", name:draft.name.trim(), email:draft.email.trim().toLowerCase(), phone:draft.phone.trim(), emergencyContactName:draft.emergencyContactName?.trim()||"", emergencyContactPhone:draft.emergencyContactPhone?.trim()||"", communicationPreference:draft.communicationPreference||"email", notes:draft.notes.trim(), roles:[...new Set(draft.roles)] }
      : person)),
    archiveCommunityPerson: (id) => setCommunityPeople((current) => current.map((person) => person.id === id ? { ...person, status:"archived" } : person)),
    addPersonUnitRelation: (draft) => setPersonUnitRelations((current) => [createPersonUnitRelation(draft,current), ...current]),
    archivePersonUnitRelation: (id) => setPersonUnitRelations((current) => current.map((relation) => relation.id === id ? { ...relation, status:"archived" } : relation)),
    addCondoCharge:(draft)=>setCondoCharges(current=>[createCondoCharge(draft),...current]),
    markCondoChargePaid:(id)=>setCondoCharges(current=>current.map(item=>item.id===id?{...item,status:"paid",paidAt:new Date().toISOString()}:item)),
    reverseCondoChargePayment:(id)=>setCondoCharges(current=>current.map(item=>item.id===id?{...item,status:"pending",paidAt:"",paymentReversedAt:new Date().toISOString()}:item)),
    addAnnouncement:(draft)=>setAnnouncements(current=>[createAnnouncement(draft),...current]),
    addReservation:(draft)=>setReservations(current=>[createReservation(draft,current),...current]),
    addVote:(draft)=>setVotes(current=>[createVote(draft),...current]),
    castVote:(id,choice)=>setVotes(current=>current.map(item=>item.id===id?{...item,[choice]:(item[choice]||0)+1}:item)),
    addUtilityService:(draft)=>setUtilityServices(current=>[createUtilityService(draft),...current]),
    addUtilityReading:(serviceId,draft)=>{const service=utilityServices.find(item=>item.id===serviceId);const result=createUtilityReading(service,draft);setUtilityServices(current=>current.map(item=>item.id===serviceId?result.service:item));setUtilityReadings(current=>[result.reading,...current]);return result;},
    reportUtilityPayment:(id,evidenceName)=>setUtilityServices(current=>current.map(item=>item.id===id?{...item,status:"reported_paid",evidenceName:evidenceName?.trim()||"Comprobante registrado",updatedAt:new Date().toISOString()}:item)),
    verifyUtilityPayment:(id)=>setUtilityServices(current=>current.map(item=>item.id===id?{...item,status:"verified",updatedAt:new Date().toISOString()}:item)),
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
  }), [owners, properties, units, tickets, communities, communityPeople, personUnitRelations, condoCharges, announcements, amenities, reservations, votes, utilityServices, utilityReadings, rentalProspects, rentalTenants, rentalLeases, rentalPayments, rentalInspections, rentalListings]);

  return <PropertiesDataContext.Provider value={value}>{children}</PropertiesDataContext.Provider>;
}

const statusFromApi={vacante:"available",ocupado:"rented",en_renta:"rented",mantenimiento:"maintenance",en_venta:"available"};
const statusToApi={available:"vacante",rented:"en_renta",maintenance:"mantenimiento"};
const communityKind={condominium:"vertical",horizontal_condominium:"horizontal",private_community:"fraccionamiento",residential:"mixto",commercial_community:"mixto",cabin_complex:"horizontal",hotel:"vertical"};

function mapProperty(row){const a=row.attributes||{};return {id:row.id,inmuebleId:row.inmueble_id,parentId:row.parent_id,name:row.label,identifier:row.label,propertyId:row.parent_id||"",ownerId:a.owner_id||"",type:a.type||(row.parent_id?"apartment":"apartment_building"),address:a.address||"",city:a.city||"",state:a.state||"",description:a.description||"",floor:a.floor||"",area:Number(a.area)||0,bedrooms:Number(a.bedrooms)||0,bathrooms:Number(a.bathrooms)||0,suggestedRent:Number(a.suggested_rent)||0,status:row.is_archived?"archived":row.parent_id?(statusFromApi[row.estado]||"available"):"active",unitsCount:0,occupiedUnits:0};}
function mapPerson(row){return {id:row.id,name:row.nombre,email:row.correo||"",phone:row.telefono||"",notes:row.direccion||"",personType:"individual",roles:row.roles?.map(role=>role.clave)||[],communityIds:[],status:row.is_archived?"archived":"active",propertiesCount:0};}
function mapCommunity(row,roots){const property=roots.find(item=>item.inmuebleId===row.inmueble_id);return {id:row.id,propertyId:property?.id||"",inmuebleId:row.inmueble_id,name:row.legal_name||property?.name||"Comunidad",kind:row.regimen==="horizontal"?"horizontal_condominium":"condominium",regime:row.regimen,cuotaBase:Number(row.cuota_base)||0,billingDay:row.billing_day||"",reglamentoUrl:row.reglamento_url||"",administrator:"",contactEmail:"",contactPhone:"",operationFrequency:"monthly",timezone:"America/Mexico_City",currency:"MXN",status:"active"};}

function LivePropertiesDataProvider({children}){
  const queryClient=useQueryClient();
  const [tickets,setTickets]=useState(demoTickets);const [utilityServices,setUtilityServices]=useState(demoUtilityServices);const [utilityReadings,setUtilityReadings]=useState(demoUtilityReadings);const [rentalProspects,setRentalProspects]=useState(()=>[...readRentalInquiries(),...demoRentalProspects]);const [rentalTenants,setRentalTenants]=useState(demoRentalTenants);const [rentalLeases,setRentalLeases]=useState(demoRentalLeases);const [rentalPayments,setRentalPayments]=useState(demoRentalPayments);const [rentalInspections,setRentalInspections]=useState(demoRentalInspections);const [rentalListings,setRentalListings]=useState(()=>readRentalListings());
  const portfolio=useQuery({queryKey:["properties","portfolio"],queryFn:async()=>{const [propertyPage,personaPage,roles,relations,communities]=await Promise.all([propertiesService.properties.list(),propertiesService.personas.list(),propertiesService.roles(),propertiesService.relations.list(),propertiesService.communities.list()]);const all=propertyPage.items.map(mapProperty);const properties=all.filter(item=>!item.parentId).map(root=>({...root,unitsCount:all.filter(item=>item.parentId===root.id&&item.status!=="archived").length,occupiedUnits:all.filter(item=>item.parentId===root.id&&item.status==="rented").length}));const units=all.filter(item=>item.parentId);const people=personaPage.items.map(mapPerson);return {properties,units,people,roles,relations,communities:communities.map(row=>mapCommunity(row,properties))}},retry:false});
  const operations=useQuery({queryKey:["properties","operations",portfolio.dataUpdatedAt],enabled:Boolean(portfolio.data),queryFn:async()=>{const communities=portfolio.data.communities;const charges=(await propertiesService.charges.list()).items;const identities=await propertiesService.portalAdmin.identities();const groups=await Promise.all(communities.map(async community=>{const [announcements,amenities,votes,packages,quotaPlans,dashboard,arrears]=await Promise.all([propertiesService.announcements.list(community.id),propertiesService.amenities.list(community.id),propertiesService.votes.list(community.id),propertiesService.packages.list(community.id),propertiesService.communities.quotaPlans(community.id),propertiesService.communities.dashboard(community.id),propertiesService.charges.arrears(community.id)]);const reservations=(await Promise.all(amenities.map(item=>propertiesService.amenities.reservations(item.id)))).flat();return {communityId:community.id,announcements,amenities,votes,packages,quotaPlans,dashboard,arrears,reservations}}));return {charges,identities,groups}},retry:false});
  const refresh=async()=>{await queryClient.invalidateQueries({queryKey:["properties"]})};
  const p=portfolio.data||{properties:[],units:[],people:[],roles:[],relations:[],communities:[]};const groups=operations.data?.groups||[];
  const personUnitRelations=p.relations.map(row=>{const role=p.roles.find(item=>item.id===row.role_id);const community=p.communities.find(item=>item.propertyId===p.units.find(unit=>unit.id===row.property_id)?.propertyId);return {id:row.id,communityId:community?.id||"",personId:row.persona_id,unitId:row.property_id,role:role?.clave||"resident",isPrimary:row.is_primary,isPaymentResponsible:row.is_payment_responsible,canVote:row.can_vote,amenityAccess:row.has_amenity_access,accessPermission:row.has_access_permission,startsAt:row.start_date||"",endsAt:row.end_date||"",status:row.end_date?"archived":"active"}});
  const communityPeople=p.people.map(person=>({...person,communityIds:[...new Set(personUnitRelations.filter(rel=>rel.personId===person.id).map(rel=>rel.communityId).filter(Boolean))]}));
  const condoCharges=(operations.data?.charges||[]).map(row=>{const unit=p.units.find(item=>item.id===row.property_id);return {id:row.id,communityId:p.communities.find(item=>item.propertyId===unit?.propertyId)?.id||"",unitId:row.property_id,personId:row.persona_id,concept:row.concept,amount:Number(row.amount),paidAmount:Number(row.paid_amount),dueDate:row.due_date,status:row.status}});
  const announcements=groups.flatMap(group=>group.announcements.map(row=>({...row,communityId:group.communityId,readCount:row.read_count||0})));const amenities=groups.flatMap(group=>group.amenities.map(row=>({...row,communityId:group.communityId})));const reservations=groups.flatMap(group=>group.reservations.map(row=>({...row,communityId:group.communityId,amenityId:row.amenity_id,unitId:row.property_id,personId:row.persona_id,date:row.starts_at?.slice(0,10),time:row.starts_at?.slice(11,16)})));const votes=groups.flatMap(group=>group.votes.map(row=>({...row,communityId:group.communityId,title:row.question,description:"",closesAt:row.closes_at?.slice(0,10),yes:0,no:0,abstain:0})));
  const roleId=(key)=>p.roles.find(role=>role.clave===key)?.id;
  const value={owners:p.people.filter(person=>person.roles.includes("owner")),properties:p.properties,units:p.units,tickets,communities:p.communities,communityPeople,personUnitRelations,condoCharges,announcements,amenities,reservations,votes,packages:groups.flatMap(g=>g.packages.map(x=>({...x,communityId:g.communityId}))),quotaPlans:groups.flatMap(g=>g.quotaPlans),communityDashboards:groups.map(g=>g.dashboard),arrears:groups.map(g=>g.arrears),portalIdentities:operations.data?.identities||[],utilityServices,utilityReadings,rentalProspects,rentalTenants,rentalLeases,rentalPayments,rentalInspections,rentalListings,propertiesLoading:portfolio.isLoading||operations.isLoading,propertiesError:portfolio.error||operations.error,retryProperties:refresh,
    addOwner:async d=>{const person=await propertiesService.personas.create({nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});const ownerRole=roleId("owner");if(ownerRole)await propertiesService.personas.assignRole(person.id,ownerRole);await refresh();return mapPerson(person)},updateOwner:async(id,d)=>{await propertiesService.personas.update(id,{nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});await refresh()},archiveOwner:async id=>{await propertiesService.personas.archive(id);await refresh()},
    addProperty:async d=>{const row=await propertiesService.properties.createRoot({label:d.name,estado:"vacante",attributes:{owner_id:d.ownerId||null,type:d.type,address:d.address,city:d.city,state:d.state,description:d.description}});await refresh();return mapProperty(row)},updateProperty:async(id,d)=>{await propertiesService.properties.update(id,{label:d.name,attributes:{owner_id:d.ownerId||null,type:d.type,address:d.address,city:d.city,state:d.state,description:d.description}});await refresh()},archiveProperty:async id=>{await propertiesService.properties.archive(id);await refresh()},
    addUnit:async d=>{await propertiesService.properties.create({parent_id:d.propertyId,label:d.identifier,estado:statusToApi[d.status]||"vacante",attributes:{owner_id:d.ownerId||null,type:d.type,floor:d.floor,area:Number(d.area)||0,bedrooms:Number(d.bedrooms)||0,bathrooms:Number(d.bathrooms)||0,suggested_rent:Number(d.suggestedRent)||0,description:d.description}});await refresh()},updateUnit:async(id,d)=>{await propertiesService.properties.update(id,{label:d.identifier,attributes:{owner_id:d.ownerId||null,type:d.type,floor:d.floor,area:Number(d.area)||0,bedrooms:Number(d.bedrooms)||0,bathrooms:Number(d.bathrooms)||0,suggested_rent:Number(d.suggestedRent)||0,description:d.description}});await refresh()},archiveUnit:async id=>{await propertiesService.properties.archive(id);await refresh()},changeUnitStatus:async(id,status)=>{await propertiesService.properties.changeStatus(id,statusToApi[status]);await refresh()},
    addCommunity:async d=>{const root=p.properties.find(item=>item.id===d.propertyId);const inmuebleId=d.inmuebleId||root?.inmuebleId;if(!inmuebleId)throw new Error("No encontramos el inmueble compartido para crear la comunidad.");const row=await propertiesService.communities.create({inmueble_id:inmuebleId,legal_name:d.name,regimen:communityKind[d.kind]||"condominio",cuota_base:Number(d.cuotaBase)||null,billing_day:Number(d.billingDay)||null,reglamento_url:d.reglamentoUrl||null});await refresh();return {...mapCommunity(row,root?[root]:[]),propertyId:d.propertyId}},updateCommunity:async(id,d)=>{await propertiesService.communities.update(id,{legal_name:d.name,regimen:communityKind[d.kind]||d.regime||"condominio",cuota_base:Number(d.cuotaBase)||null,billing_day:Number(d.billingDay)||null,reglamento_url:d.reglamentoUrl||null});await refresh()},
    addCommunityPerson:async d=>{const person=await propertiesService.personas.create({nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});for(const key of d.roles||[]){const mapped=key==="committee"?"board_member":key;const id=roleId(mapped);if(id)await propertiesService.personas.assignRole(person.id,id)}await refresh()},updateCommunityPerson:async(id,d)=>{await propertiesService.personas.update(id,{nombre:d.name,correo:d.email,telefono:d.phone,direccion:d.notes||null});await refresh()},archiveCommunityPerson:async id=>{await propertiesService.personas.archive(id);await refresh()},
    addPersonUnitRelation:async d=>{const id=roleId(d.role);if(!id)throw new Error("El rol seleccionado no existe en el catálogo del backend.");await propertiesService.relations.create({property_id:d.unitId,persona_id:d.personId,role_id:id,start_date:d.startsAt||null,is_primary:Boolean(d.isPrimary),is_payment_responsible:Boolean(d.isPaymentResponsible),can_vote:Boolean(d.canVote),has_amenity_access:Boolean(d.amenityAccess),has_access_permission:Boolean(d.accessPermission)});await refresh()},archivePersonUnitRelation:async id=>{await propertiesService.relations.end(id);await refresh()},
    addCondoCharge:async d=>{const unit=p.units.find(item=>item.id===d.unitId);const relation=personUnitRelations.find(item=>item.unitId===unit?.id&&item.isPaymentResponsible)||personUnitRelations.find(item=>item.unitId===unit?.id);if(!unit||!relation)throw new Error("Selecciona una unidad con una persona responsable de pago.");await propertiesService.charges.create({property_id:unit.id,persona_id:relation.personId,concept:d.concept,amount:Number(d.amount),currency:"MXN",period:d.period||null,due_date:d.dueDate});await refresh()},markCondoChargePaid:async id=>{const charge=condoCharges.find(item=>item.id===id);await propertiesService.charges.settle(id,{persona_id:charge.personId,amount:charge.amount-charge.paidAmount,method:"manual"});await refresh()},waiveCondoCharge:async(id,reason)=>{await propertiesService.charges.waive(id,reason);await refresh()},
    addAnnouncement:async d=>{const row=await propertiesService.announcements.create(d.communityId,{title:d.title,body:d.body,audience:d.audience||"all",unit_ids:[],is_urgent:Boolean(d.isUrgent),attachments:[]});await propertiesService.announcements.publish(row.id);await refresh()},
    addAmenity:async d=>{await propertiesService.amenities.create(d.communityId,{name:d.name,capacity:Number(d.capacity)||1,lead_time_hours:Number(d.leadTimeHours)||0,cancel_window_hours:Number(d.cancelWindowHours)||0,fee_amount:Number(d.feeAmount)||0,requires_approval:Boolean(d.requiresApproval)});await refresh()},addReservation:async d=>{const relation=personUnitRelations.find(item=>item.unitId===d.unitId)||personUnitRelations[0];if(!relation)throw new Error("La reservación necesita una persona vinculada.");const starts=`${d.date}T${d.time}:00`;const ends=new Date(new Date(starts).getTime()+60*60*1000).toISOString();await propertiesService.amenities.reserve(d.amenityId,{property_id:d.unitId,persona_id:relation.personId,starts_at:new Date(starts).toISOString(),ends_at:ends});await refresh()},confirmReservation:async id=>{await propertiesService.amenities.confirm(id);await refresh()},cancelReservation:async(id,reason)=>{await propertiesService.amenities.cancel(id,reason);await refresh()},
    addVote:async d=>{const row=await propertiesService.votes.create(d.communityId,{question:d.title,options:[{id:"yes",label:"Sí"},{id:"no",label:"No"},{id:"abstain",label:"Abstención"}],weighting:"per_unit",quorum_pct:null,results_visibility:"after_close"});await propertiesService.votes.open(row.id);await refresh()},castVote:async(id,choice)=>{const relation=personUnitRelations.find(item=>item.canVote);if(!relation)throw new Error("No hay una relación con derecho de voto.");await propertiesService.votes.ballot(id,relation.id,choice);await refresh()},closeVote:async id=>{await propertiesService.votes.close(id);await refresh()},
    addTicket:d=>{const x=createTicket(d);setTickets(c=>[x,...c]);return x},changeTicketStatus:(id,status)=>setTickets(c=>c.map(x=>x.id===id?{...x,status}:x)),addUtilityService:d=>setUtilityServices(c=>[createUtilityService(d),...c]),addUtilityReading:(id,d)=>{const service=utilityServices.find(x=>x.id===id);const result=createUtilityReading(service,d);setUtilityServices(c=>c.map(x=>x.id===id?result.service:x));setUtilityReadings(c=>[result.reading,...c]);return result},reportUtilityPayment:(id,e)=>setUtilityServices(c=>c.map(x=>x.id===id?{...x,status:"reported_paid",evidenceName:e}:x)),verifyUtilityPayment:id=>setUtilityServices(c=>c.map(x=>x.id===id?{...x,status:"verified"}:x)),
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
