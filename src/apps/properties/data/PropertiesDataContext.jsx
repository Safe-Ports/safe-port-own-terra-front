import { createContext, useContext, useMemo, useState } from "react";
import { createOwner } from "../features/owners/ownerModel";
import { createProperty } from "../features/properties/propertyModel";
import { createUnit } from "../features/units/unitModel";
import { createTicket } from "../features/tickets/ticketModel";
import { createCommunity, createCommunityPerson, createPersonUnitRelation } from "../features/community/communityModel";
import { createAnnouncement, createCondoCharge, createReservation, createVote } from "../features/condo/condoOperationsModel";
import { demoAmenities, demoAnnouncements, demoCommunities, demoCommunityPeople, demoCondoCharges, demoOwners, demoPersonUnitRelations, demoProperties, demoReservations, demoTickets, demoUnits, demoVotes } from "./demoPropertiesData";

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

  const value = useMemo(() => ({
    owners,
    properties,
    units,
    tickets,
    communities,
    communityPeople,
    personUnitRelations,
    condoCharges,announcements,amenities,reservations,votes,
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
  }), [owners, properties, units, tickets, communities, communityPeople, personUnitRelations, condoCharges, announcements, amenities, reservations, votes]);

  return <PropertiesDataContext.Provider value={value}>{children}</PropertiesDataContext.Provider>;
}

export function usePropertiesData() {
  const context = useContext(PropertiesDataContext);
  if (!context) throw new Error("usePropertiesData must be used inside PropertiesDataProvider");
  return context;
}
