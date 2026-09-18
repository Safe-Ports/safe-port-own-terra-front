export const demoRentalProspects = [
  { id:"rp-1", name:"Lucía Morales", phone:"55 2044 1088", email:"lucia@demo.mx", unitId:"unit-j401", source:"Marketplace", budget:22000, desiredMoveIn:"2026-10-01", status:"visit", notes:"Visita confirmada para el viernes.", createdAt:"2026-08-28T12:00:00Z" },
  { id:"rp-2", name:"Norte Estudio Creativo", phone:"81 2020 4411", email:"hola@norteestudio.demo", unitId:"unit-p2", source:"Referido", budget:15000, desiredMoveIn:"2026-09-20", status:"application", notes:"Pendiente comprobante de domicilio.", createdAt:"2026-08-30T09:00:00Z" },
  { id:"rp-3", name:"María Fernanda Soto", phone:"33 1888 7021", email:"", unitId:"unit-a3", source:"Directo", budget:25000, desiredMoveIn:"2026-11-01", status:"new", notes:"Busca contrato de doce meses.", createdAt:"2026-09-02T17:00:00Z" },
];

export const demoRentalTenants = [
  { id:"rt-sofia", personType:"individual", name:"Sofía Herrera", phone:"55 9920 1844", email:"sofia.herrera@demo.mx", emergencyContact:"Laura Herrera · 55 9920 1881", documentSummary:"Identidad y comprobantes registrados", status:"active", createdAt:"2025-11-12T12:00:00Z" },
  { id:"rt-carlos", personType:"individual", name:"Carlos Vega", phone:"55 4401 1990", email:"carlos.vega@demo.mx", emergencyContact:"Mariana Vega · 55 4401 1991", documentSummary:"Expediente completo", status:"active", createdAt:"2026-01-10T12:00:00Z" },
  { id:"rt-cafe", personType:"company", name:"Café Bruma, S.A.", phone:"81 3001 9012", email:"administracion@cafebruma.demo", emergencyContact:"Elena Ruiz · 81 3001 9018", documentSummary:"Acta y representación registradas", status:"active", createdAt:"2025-09-05T12:00:00Z" },
  { id:"rt-estudio", personType:"company", name:"Estudio Norte", phone:"81 1140 8830", email:"cuentas@estudionorte.demo", emergencyContact:"Daniel Paredes · 81 1140 8834", documentSummary:"Expediente por renovar", status:"active", createdAt:"2025-08-01T12:00:00Z" },
];

export const demoRentalLeases = [
  { id:"rl-1", tenantId:"rt-sofia", unitId:"unit-j101", startDate:"2025-12-01", endDate:"2026-11-30", rent:18500, deposit:18500, depositStatus:"held", dueDay:5, frequency:"monthly", includedServices:"Mantenimiento del edificio", signedDocumentName:"Contrato J101 firmado.pdf", status:"active", createdAt:"2025-11-20T12:00:00Z" },
  { id:"rl-2", tenantId:"rt-carlos", unitId:"unit-j201", startDate:"2026-02-01", endDate:"2027-01-31", rent:19000, deposit:19000, depositStatus:"held", dueDay:5, frequency:"monthly", includedServices:"", signedDocumentName:"Contrato J201.pdf", status:"active", createdAt:"2026-01-15T12:00:00Z" },
  { id:"rl-3", tenantId:"rt-cafe", unitId:"unit-p1", startDate:"2025-10-01", endDate:"2026-09-30", rent:16800, deposit:33600, depositStatus:"held", dueDay:5, frequency:"monthly", includedServices:"Cuota común", signedDocumentName:"Arrendamiento local 1.pdf", status:"active", createdAt:"2025-09-12T12:00:00Z" },
  { id:"rl-4", tenantId:"rt-estudio", unitId:"unit-p5", startDate:"2025-08-21", endDate:"2026-09-20", rent:3800, deposit:3800, depositStatus:"held", dueDay:5, frequency:"monthly", includedServices:"", signedDocumentName:"Contrato B02.pdf", status:"active", createdAt:"2025-08-12T12:00:00Z" },
];

export const demoRentalPayments = [
  { id:"rpay-1", leaseId:"rl-1", period:"2026-09", amount:18500, dueDate:"2026-09-05", paidAt:"2026-09-02", method:"transfer", evidenceName:"SPEI septiembre.pdf", status:"paid", note:"Pago reportado y verificado manualmente." },
  { id:"rpay-2", leaseId:"rl-2", period:"2026-09", amount:19000, dueDate:"2026-09-05", paidAt:"", method:"transfer", evidenceName:"", status:"pending", note:"" },
  { id:"rpay-3", leaseId:"rl-3", period:"2026-09", amount:10000, dueDate:"2026-09-05", paidAt:"2026-09-03", method:"spei", evidenceName:"Abono septiembre.jpg", status:"partial", note:"Saldo pendiente de $6,800." },
  { id:"rpay-4", leaseId:"rl-4", period:"2026-09", amount:3800, dueDate:"2026-09-01", paidAt:"", method:"cash", evidenceName:"", status:"overdue", note:"Contactar al responsable." },
];

export const demoRentalInspections = [
  { id:"ri-1", leaseId:"rl-1", unitId:"unit-j101", type:"periodic", scheduledAt:"2026-09-18", status:"scheduled", checklist:"Humedad, instalaciones y mobiliario", evidenceCount:0, notes:"Coordinar acceso con Sofía." },
  { id:"ri-2", leaseId:"rl-3", unitId:"unit-p1", type:"periodic", scheduledAt:"2026-08-20", status:"completed", checklist:"Instalación eléctrica y extracción", evidenceCount:8, notes:"Sin daños nuevos.", completedAt:"2026-08-20T18:00:00Z" },
];
