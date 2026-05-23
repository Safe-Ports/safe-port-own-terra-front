export const stats = {
  activeLots: 148,
  soldLots: 62,
  overduePayments: 9,
  monthlyRevenue: "$418,000",
};

export const projects = [
  {
    id: "valle",
    name: "Valle Esmeralda",
    available: 48,
    sold: 22,
    reserved: 8,
    inventoryValue: "$12.8M",
  },
  {
    id: "terracota",
    name: "Residencial Terracota",
    available: 31,
    sold: 18,
    reserved: 6,
    inventoryValue: "$9.4M",
  },
];

export const clients = [
  { id: "cl1", name: "Carlos Mendoza", status: "Activo", plan: "Lote 7 · 18/96 pagos", seller: "Patricia López" },
  { id: "cl2", name: "María Fernanda Soto", status: "Al corriente", plan: "Lote 12 · 32/96 pagos", seller: "Patricia López" },
  { id: "cl3", name: "Daniela Reyes", status: "Vencido", plan: "Lote 3 · 7/60 pagos", seller: "Ricardo Villa" },
];

export const contracts = [
  { id: "co1", number: "CON-2026-001", lot: "Lote 7 · Manzana A", type: "Compraventa", amount: "$520,000", status: "Firmado" },
  { id: "co2", number: "CON-2026-002", lot: "Lote 12 · Manzana B", type: "Compraventa", amount: "$610,000", status: "Firmado" },
  { id: "co3", number: "CON-2026-004", lot: "Lote 3 · Manzana C", type: "Reserva", amount: "$450,000", status: "Pendiente" },
];

export const documents = [
  { id: "do1", name: "Contrato firmado Carlos Mendoza.pdf", category: "Contrato", link: "CON-2026-001", state: "Vigente" },
  { id: "do2", name: "INE María Fernanda Soto.jpg", category: "Identificación", link: "Cliente", state: "Vigente" },
  { id: "do3", name: "Comprobante Daniela Reyes.pdf", category: "Pago", link: "CON-2026-004", state: "Pendiente" },
];

export const alerts = [
  { id: "al1", title: "Pago vencido", subtitle: "Daniela Reyes · cuota 8", tone: "danger" },
  { id: "al2", title: "Contrato sin expediente completo", subtitle: "CON-2026-004", tone: "warning" },
  { id: "al3", title: "Seguimiento a prospecto", subtitle: "Adriana Velasco", tone: "success" },
];
