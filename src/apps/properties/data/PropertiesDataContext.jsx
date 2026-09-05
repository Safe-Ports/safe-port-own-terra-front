import { createContext, useContext, useMemo, useState } from "react";
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

export function PropertiesDataProvider({ children }) {
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

export function usePropertiesData() {
  const context = useContext(PropertiesDataContext);
  if (!context) throw new Error("usePropertiesData must be used inside PropertiesDataProvider");
  return context;
}
