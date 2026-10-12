const id = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}`;

export function createCondoCharge(draft) {
  if (!draft.communityId || !draft.concept?.trim() || Number(draft.amount) <= 0) throw new Error("Completa comunidad, concepto e importe.");
  return { id:id("charge"), communityId:draft.communityId, unitId:draft.unitId||"", concept:draft.concept.trim(), amount:Number(draft.amount), dueDate:draft.dueDate||"", status:"pending", createdAt:new Date().toISOString() };
}

export function createAnnouncement(draft) {
  if (!draft.communityId || !draft.title?.trim() || !draft.body?.trim()) throw new Error("Completa comunidad, título y mensaje.");
  return { id:id("announcement"), communityId:draft.communityId, title:draft.title.trim(), body:draft.body.trim(), audience:draft.audience||"all", publishedAt:new Date().toISOString(), readCount:0, status:"published" };
}

export function createReservation(draft, reservations=[]) {
  if (!draft.communityId || !draft.amenityId || !draft.personName?.trim() || !draft.date || !draft.time) throw new Error("Completa amenidad, persona, fecha y horario.");
  if (reservations.some(item=>item.status!=="cancelled"&&item.amenityId===draft.amenityId&&item.date===draft.date&&item.time===draft.time)) throw new Error("Ese horario ya está reservado.");
  return { id:id("reservation"), ...draft, personName:draft.personName.trim(), status:"confirmed", createdAt:new Date().toISOString() };
}

export function createVote(draft) {
  if (!draft.communityId || !draft.title?.trim() || !draft.closesAt) throw new Error("Completa comunidad, asunto y fecha de cierre.");
  return { id:id("vote"), communityId:draft.communityId, title:draft.title.trim(), description:draft.description?.trim()||"", closesAt:draft.closesAt, yes:0, no:0, abstain:0, status:"open" };
}

export const UTILITY_STATUS_LABEL = {
  pending_evidence:"Pendiente de evidencia", due_soon:"Por vencer", reported_paid:"Pago reportado",
  verified:"Verificado", overdue:"Vencido", disputed:"En disputa", suspended:"Suspendido",
};

export const UTILITY_TYPE_LABEL = { water:"Agua", electricity:"Luz", gas:"Gas", internet:"Internet", other:"Otro" };
export const UTILITY_PAYER_LABEL = { administration:"Administración", owner:"Propietario", resident:"Residente", tenant:"Inquilino" };

export function createUtilityService(draft) {
  if (!draft.communityId || !draft.name?.trim() || !UTILITY_TYPE_LABEL[draft.type] || !UTILITY_PAYER_LABEL[draft.payerRole]) {
    throw new Error("Completa comunidad, servicio, nombre y responsable.");
  }
  return {id:id("utility"),communityId:draft.communityId,unitId:draft.unitId||"",type:draft.type,name:draft.name.trim(),provider:draft.provider?.trim()||"",accountReference:draft.accountReference?.trim()||"",payerRole:draft.payerRole,billingCycle:draft.billingCycle||"monthly",periodStart:draft.periodStart||"",periodEnd:draft.periodEnd||"",dueDate:draft.dueDate||"",status:"pending_evidence",amount:Number(draft.amount)||0,reportedAmount:0,evidenceName:"",note:draft.note?.trim()||"",updatedAt:new Date().toISOString()};
}

export function seedUtilityBill(service) {
  if (!service?.periodStart || !Number(service.amount)) return null;
  return {id:id("bill"),serviceId:service.id,periodStart:service.periodStart,periodEnd:service.periodEnd||service.periodStart,amount:Number(service.amount),dueDate:service.dueDate||"",status:service.status||"pending_evidence",reportedAmount:Number(service.reportedAmount)||0,paidAt:"",recordedBy:"Administración",evidenceName:service.evidenceName||"",note:service.note||""};
}

export function createUtilityBill(service, draft) {
  const amount=Number(draft.amount);
  if (!service) throw new Error("Selecciona un servicio antes de registrar el recibo.");
  if (!draft.periodStart || !draft.periodEnd) throw new Error("Indica el periodo que cubre el recibo.");
  if (draft.periodEnd < draft.periodStart) throw new Error("El periodo termina antes de empezar.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Captura el importe del recibo.");
  const bill={id:id("bill"),serviceId:service.id,periodStart:draft.periodStart,periodEnd:draft.periodEnd,amount,dueDate:draft.dueDate||"",status:"pending_evidence",reportedAmount:0,paidAt:"",recordedBy:draft.recordedBy?.trim()||"Administración",evidenceName:draft.evidenceName?.trim()||"",note:draft.note?.trim()||""};
  // Un recibo de un periodo anterior se archiva en el historial, pero no se
  // convierte en el periodo vigente del servicio.
  const isCurrent=!service.periodEnd||bill.periodEnd>=service.periodEnd;
  const updated=isCurrent
    ?{...service,periodStart:bill.periodStart,periodEnd:bill.periodEnd,amount,dueDate:bill.dueDate,status:"pending_evidence",reportedAmount:0,evidenceName:bill.evidenceName,updatedAt:new Date().toISOString()}
    :service;
  return {bill,service:updated,isCurrent};
}
