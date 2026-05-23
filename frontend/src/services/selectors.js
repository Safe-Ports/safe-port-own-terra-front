export function deriveProjects(fracs = []) {
  return fracs.map((frac) => {
    const available = frac.lots.filter((lot) => lot.status === "available").length;
    const sold = frac.lots.filter((lot) => lot.status === "sold").length;
    const reserved = frac.lots.filter((lot) => lot.status === "reserved").length;
    const inventoryValue = frac.lots.reduce((sum, lot) => sum + lot.price, 0);

    return {
      ...frac,
      available,
      sold,
      reserved,
      inventoryValue
    };
  });
}

export function deriveAlerts({ payments = [], contracts = [], documents = [], clients = [] }) {
  const overduePayments = payments
    .filter((payment) => payment.status === "overdue")
    .slice(0, 6)
    .map((payment) => ({
      id: payment.id,
      type: "payment",
      priority: "high",
      title: `Pago vencido · cuota ${payment.cuota}`,
      subtitle: payment.contractId,
      amount: payment.amount,
      dueDate: payment.dueDate
    }));

  const missingDocuments = contracts
    .filter((contract) => !documents.some((document) => document.contractId === contract.id))
    .slice(0, 4)
    .map((contract) => ({
      id: `doc_${contract.id}`,
      type: "document",
      priority: "medium",
      title: `Contrato sin expediente`,
      subtitle: contract.number,
      amount: contract.amount,
      dueDate: contract.date
    }));

  const leads = clients
    .filter((client) => client.type === "lead")
    .slice(0, 3)
    .map((client) => ({
      id: `lead_${client.id}`,
      type: "lead",
      priority: "low",
      title: `Prospecto por seguimiento`,
      subtitle: client.name,
      amount: 0,
      dueDate: ""
    }));

  return [...overduePayments, ...missingDocuments, ...leads];
}

export function deriveDashboardSnapshot({
  currentUser,
  clients = [],
  contracts = [],
  payments = [],
  documents = [],
  fracs = []
}) {
  const projects = deriveProjects(fracs);
  const totalLots = projects.flatMap((project) => project.lots).length;
  const availableLots = projects.reduce((sum, project) => sum + project.available, 0);
  const soldLots = projects.reduce((sum, project) => sum + project.sold, 0);
  const reservedLots = projects.reduce((sum, project) => sum + project.reserved, 0);
  const paidRevenue = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const openRevenue = payments
    .filter((payment) => payment.status !== "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const sellers = Array.from(new Set(clients.map((client) => client.seller).filter(Boolean)));

  return {
    greetingName: currentUser?.name?.split(" ")[0] || "Equipo",
    totals: {
      clients: clients.length,
      contracts: contracts.length,
      documents: documents.length,
      projects: projects.length,
      totalLots,
      availableLots,
      soldLots,
      reservedLots,
      paidRevenue,
      openRevenue
    },
    projects,
    sellers: sellers.map((seller) => {
      const sellerClients = clients.filter((client) => client.seller === seller);
      const sellerContracts = contracts.filter((contract) =>
        sellerClients.some((client) => client.id === contract.clientId)
      );
      return {
        name: seller,
        clients: sellerClients.length,
        contracts: sellerContracts.length,
        revenue: sellerContracts.reduce((sum, contract) => sum + contract.amount, 0)
      };
    }),
    recentClients: clients.slice(0, 4),
    recentContracts: [...contracts]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 4),
    alerts: deriveAlerts({ payments, contracts, documents, clients })
  };
}
