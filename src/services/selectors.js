export function deriveAlerts({ payments = [], contracts = [], documents = [], clients = [] }) {
  const overduePayments = payments
    .filter((payment) => payment.status === "overdue")
    .slice(0, 6)
    .map((payment) => ({
      id: payment.id,
      type: "payment",
      priority: "high",
      title: `Pago vencido · cuota ${payment.installment_n}`,
      subtitle: payment.contract?.contract_number || "",
      amount: payment.amount,
      dueDate: payment.due_date,
    }));

  const missingDocuments = contracts
    .filter((contract) => !documents.some((doc) => doc.entity_type === "contract" && String(doc.entity_id) === String(contract.id)))
    .slice(0, 4)
    .map((contract) => ({
      id: `doc_${contract.id}`,
      type: "document",
      priority: "medium",
      title: "Contrato sin expediente",
      subtitle: contract.contract_number,
      amount: contract.amount,
      dueDate: contract.contract_date,
    }));

  const leads = clients
    .filter((client) => client.type === "lead")
    .slice(0, 3)
    .map((client) => ({
      id: `lead_${client.id}`,
      type: "lead",
      priority: "low",
      title: "Prospecto por seguimiento",
      subtitle: client.name,
      amount: 0,
      dueDate: "",
    }));

  return [...overduePayments, ...missingDocuments, ...leads];
}
