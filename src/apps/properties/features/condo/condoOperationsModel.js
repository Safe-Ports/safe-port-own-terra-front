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
  verified:"Verificado", overdue:"Vencido", incident:"Con incidencia", suspended:"Suspendido",
};

export const UTILITY_TYPE_LABEL = { water:"Agua", electricity:"Luz", gas:"Gas", internet:"Internet", other:"Otro" };
export const UTILITY_PAYER_LABEL = { administration:"Administración", owner:"Propietario", resident:"Residente", tenant:"Inquilino" };

export function createUtilityService(draft) {
  if (!draft.communityId || !draft.name?.trim() || !UTILITY_TYPE_LABEL[draft.type] || !UTILITY_PAYER_LABEL[draft.payerRole]) {
    throw new Error("Completa comunidad, servicio, nombre y responsable.");
  }
  return {id:id("utility"),communityId:draft.communityId,unitId:draft.unitId||"",type:draft.type,name:draft.name.trim(),provider:draft.provider?.trim()||"",accountReference:draft.accountReference?.trim()||"",meterNumber:draft.meterNumber?.trim()||"",payerRole:draft.payerRole,billingCycle:draft.billingCycle||"monthly",dueDate:draft.dueDate||"",status:"pending_evidence",previousReading:Number(draft.previousReading)||0,currentReading:Number(draft.currentReading)||0,unit:draft.unit?.trim()||"",amount:Number(draft.amount)||0,evidenceName:"",updatedAt:new Date().toISOString(),anomaly:false};
}

export function createUtilityReading(service, draft) {
  const value=Number(draft.value);
  if (!service?.id || !Number.isFinite(value) || value < 0 || !draft.recordedAt) throw new Error("Completa una lectura válida y su fecha.");
  const consumption=Math.max(0,value-Number(service.currentReading||0));
  const previousConsumption=Math.max(0,Number(service.currentReading||0)-Number(service.previousReading||0));
  const anomaly=previousConsumption>0&&consumption>previousConsumption*1.35;
  return {reading:{id:id("reading"),serviceId:service.id,value,recordedAt:draft.recordedAt,recordedBy:draft.recordedBy?.trim()||"Administración",evidenceName:draft.evidenceName?.trim()||"",note:draft.note?.trim()||""},service:{...service,previousReading:Number(service.currentReading)||0,currentReading:value,evidenceName:draft.evidenceName?.trim()||service.evidenceName,status:anomaly?"incident":service.status,anomaly,updatedAt:new Date().toISOString()}};
}
