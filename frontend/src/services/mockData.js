const today = new Date();

function isoOffset(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export const demoUsers = [
  {
    id: "usr_admin",
    username: "admin",
    email: "admin@lotemanager.mx",
    password: "admin123",
    role: "admin",
    name: "Administrador General",
    initials: "AD"
  },
  {
    id: "usr_vendor",
    username: "vendedor",
    email: "ventas@lotemanager.mx",
    password: "vende123",
    role: "vendedor",
    name: "Vendedor Demo",
    initials: "VN"
  }
];

export const initialClients = [
  {
    id: "cl_1",
    name: "Carlos Mendoza",
    phone: "33-1234-5678",
    email: "carlos.mendoza@email.com",
    type: "buyer",
    paidM: 18,
    totalM: 96,
    monthlyAmt: 4333,
    notes: "Interesado en lotes con esquina y acceso rápido.",
    initials: "CM",
    color: "#2A7A50",
    status: "active",
    seller: "Patricia López"
  },
  {
    id: "cl_2",
    name: "María Fernanda Soto",
    phone: "33-8765-4321",
    email: "maria.soto@email.com",
    type: "buyer",
    paidM: 32,
    totalM: 96,
    monthlyAmt: 5100,
    notes: "Busca plusvalía a mediano plazo.",
    initials: "MS",
    color: "#B07820",
    status: "active",
    seller: "Patricia López"
  },
  {
    id: "cl_3",
    name: "Jorge Ramírez",
    phone: "33-2121-0909",
    email: "jorge.ramirez@email.com",
    type: "tenant",
    paidM: 11,
    totalM: 24,
    monthlyAmt: 7600,
    notes: "Cliente empresarial, renta para patio de materiales.",
    initials: "JR",
    color: "#1A5280",
    status: "active",
    seller: "Luis Campos"
  },
  {
    id: "cl_4",
    name: "Adriana Velasco",
    phone: "33-4111-2299",
    email: "adriana.velasco@email.com",
    type: "lead",
    paidM: 0,
    totalM: 0,
    monthlyAmt: 0,
    notes: "Prospecto premium, solicita comparativo de amenidades.",
    initials: "AV",
    color: "#C0392B",
    status: "lead",
    seller: "Luis Campos"
  },
  {
    id: "cl_5",
    name: "Daniela Reyes",
    phone: "33-5050-7070",
    email: "daniela.reyes@email.com",
    type: "buyer",
    paidM: 7,
    totalM: 60,
    monthlyAmt: 6900,
    notes: "Necesita recordatorios semanales por WhatsApp.",
    initials: "DR",
    color: "#6B5B95",
    status: "overdue",
    seller: "Ricardo Villa"
  }
];

export const initialContracts = [
  {
    id: "con_1",
    number: "CON-2026-001",
    type: "sale",
    lot: "Lote 7 — Manzana A · Valle Esmeralda",
    clientId: "cl_1",
    date: isoOffset(-210),
    amount: 520000,
    paidM: 18,
    totalM: 96,
    notes: "Contrato con actualización anual al IPC."
  },
  {
    id: "con_2",
    number: "CON-2026-002",
    type: "sale",
    lot: "Lote 12 — Manzana B · Valle Esmeralda",
    clientId: "cl_2",
    date: isoOffset(-320),
    amount: 610000,
    paidM: 32,
    totalM: 96,
    notes: "Cliente con pago domiciliado."
  },
  {
    id: "con_3",
    number: "CON-2026-003",
    type: "rent",
    lot: "Patio 4 · Parque Industrial Roble",
    clientId: "cl_3",
    date: isoOffset(-120),
    amount: 182400,
    paidM: 11,
    totalM: 24,
    notes: "Arrendamiento mensual con mantenimiento incluido."
  },
  {
    id: "con_4",
    number: "CON-2026-004",
    type: "reserve",
    lot: "Lote 3 — Manzana C · Valle Esmeralda",
    clientId: "cl_5",
    date: isoOffset(-55),
    amount: 450000,
    paidM: 7,
    totalM: 60,
    notes: "Reserva con apartados variables."
  }
];

export function createSeedPayments() {
  const payments = [];

  initialContracts.forEach((contract) => {
    const monthly = Math.max(
      1,
      Math.round(contract.amount / Math.max(contract.totalM || 1, 1))
    );

    for (let cuota = 1; cuota <= contract.totalM; cuota += 1) {
      const dueOffset = cuota * 30 - contract.totalM * 2;
      let status = "pending";
      let paidDate = "";

      if (cuota <= contract.paidM) {
        status = "paid";
        paidDate = isoOffset(dueOffset - 4);
      } else if (contract.id === "con_4" && cuota === contract.paidM + 1) {
        status = "overdue";
      }

      payments.push({
        id: `${contract.id}_pay_${cuota}`,
        clientId: contract.clientId,
        contractId: contract.id,
        cuota,
        amount: monthly,
        dueDate: isoOffset(dueOffset),
        paidDate,
        status,
        notes: status === "overdue" ? "Cliente solicitó prórroga." : ""
      });
    }
  });

  return payments;
}

export const initialDocuments = [
  {
    id: "doc_1",
    name: "Contrato firmado Carlos Mendoza.pdf",
    category: "contract",
    linkType: "contract",
    linkedId: "con_1",
    clientId: "cl_1",
    contractId: "con_1",
    sizeKb: 820,
    createdAt: isoOffset(-180)
  },
  {
    id: "doc_2",
    name: "INE María Fernanda Soto.jpg",
    category: "identity",
    linkType: "client",
    linkedId: "cl_2",
    clientId: "cl_2",
    contractId: "",
    sizeKb: 340,
    createdAt: isoOffset(-310)
  },
  {
    id: "doc_3",
    name: "Comprobante pago Daniela Reyes.pdf",
    category: "payment",
    linkType: "client",
    linkedId: "cl_5",
    clientId: "cl_5",
    contractId: "con_4",
    sizeKb: 215,
    createdAt: isoOffset(-7)
  }
];

export const initialFracs = [
  {
    id: "frac_demo",
    name: "Valle Esmeralda",
    createdAt: isoOffset(-365),
    mapUrl: "",
    lots: [
      { id: "lot_1", code: "A-01", status: "available", area: 148, price: 370000, section: "Manzana A" },
      { id: "lot_2", code: "A-02", status: "sold", area: 152, price: 382000, section: "Manzana A" },
      { id: "lot_3", code: "A-03", status: "reserved", area: 160, price: 395000, section: "Manzana A" },
      { id: "lot_4", code: "B-01", status: "available", area: 180, price: 440000, section: "Manzana B" },
      { id: "lot_5", code: "B-02", status: "available", area: 172, price: 430000, section: "Manzana B" },
      { id: "lot_6", code: "C-01", status: "sold", area: 205, price: 515000, section: "Manzana C" }
    ]
  }
];

export const initialDraftProject = {
  mode: "selector",
  name: "Nuevo Fraccionamiento",
  mapUrl: "",
  sections: [],
  cadProcessing: false
};
