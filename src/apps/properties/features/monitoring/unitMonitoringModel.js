const OPEN_CHARGE_STATES = new Set(["pending", "overdue"]);
const OPEN_UTILITY_STATES = new Set(["pending_evidence", "due_soon", "overdue", "incident", "suspended"]);

export function buildUnitMonitorRows({ units = [], people = [], relations = [], charges = [], utilityServices = [], tickets = [] }) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  return units.filter((unit) => unit.status !== "archived").map((unit) => {
    const links = relations.filter((relation) => relation.unitId === unit.id && relation.status !== "archived");
    const occupants = links.filter((relation) => ["tenant", "resident"].includes(relation.role)).map((relation) => peopleById[relation.personId]).filter(Boolean);
    const responsible = links.filter((relation) => relation.role === "owner" || relation.isPaymentResponsible).map((relation) => peopleById[relation.personId]).filter(Boolean);
    const unitCharges = charges.filter((charge) => charge.unitId === unit.id);
    const services = utilityServices.filter((service) => service.unitId === unit.id);
    const unitTickets = tickets.filter((ticket) => ticket.unitId === unit.id);
    const openCharges = unitCharges.filter((charge) => OPEN_CHARGE_STATES.has(charge.status));
    const openServices = services.filter((service) => OPEN_UTILITY_STATES.has(service.status));
    const movements = [
      ...unitCharges.map((item) => ({ id:`charge-${item.id}`, date:item.paidAt || item.createdAt || item.dueDate, type:"Cargo", title:item.concept, state:item.status })),
      ...services.map((item) => ({ id:`service-${item.id}`, date:item.updatedAt || item.dueDate, type:"Servicio", title:item.name, state:item.status })),
      ...unitTickets.map((item) => ({ id:`ticket-${item.id}`, date:item.updatedAt || item.createdAt, type:"Incidencia", title:item.title, state:item.status })),
    ].filter((item) => item.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
    return {
      ...unit,
      occupants,
      responsible,
      charges: unitCharges,
      services,
      tickets: unitTickets,
      openChargeAmount: openCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      openServiceAmount: openServices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      openTickets: unitTickets.filter((item) => !["resolved", "closed", "cancelled"].includes(item.status)).length,
      movements,
    };
  });
}
