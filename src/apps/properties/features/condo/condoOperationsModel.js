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
