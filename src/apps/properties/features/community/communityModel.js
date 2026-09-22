export const COMMUNITY_PERSON_ROLE_LABEL = {
  owner: "Propietario",
  resident: "Residente",
  tenant: "Inquilino",
  committee: "Comité",
  emergency_contact: "Contacto de emergencia",
  payment_responsible: "Responsable de pago",
};

export const PERSON_UNIT_ROLE_LABEL = {
  owner: "Propietario",
  resident: "Residente",
  tenant: "Inquilino",
  payment_responsible: "Responsable de pago",
};

// El backend solo acepta estos cinco regímenes (Regimen en
// app/features/communities/schemas.py). El tipo que elige el usuario y el
// régimen que guarda properties-back son el mismo dato, así que se mapean 1:1
// en ambas direcciones: un fraccionamiento debe volver a leerse como
// fraccionamiento, no como condominio.
export const COMMUNITY_KIND_LABEL = {
  condominium: "Condominio vertical",
  horizontal_condominium: "Condominio horizontal",
  private_community: "Fraccionamiento o privada",
  mixed_community: "Comunidad mixta",
};

export const COMMUNITY_KIND_TO_REGIMEN = {
  condominium: "vertical",
  horizontal_condominium: "horizontal",
  private_community: "fraccionamiento",
  mixed_community: "mixto",
};

export const REGIMEN_TO_COMMUNITY_KIND = {
  vertical: "condominium",
  condominio: "condominium",
  horizontal: "horizontal_condominium",
  fraccionamiento: "private_community",
  mixto: "mixed_community",
};

export function communityKindFromRegimen(regimen) {
  return REGIMEN_TO_COMMUNITY_KIND[regimen] || "condominium";
}

export function regimenFromCommunityKind(kind) {
  return COMMUNITY_KIND_TO_REGIMEN[kind] || "condominio";
}

export const EMPTY_COMMUNITY_PERSON = {
  communityIds: [],
  personType: "individual",
  name: "",
  email: "",
  phone: "",
  roles: ["resident"],
  emergencyContactName: "",
  emergencyContactPhone: "",
  communicationPreference: "email",
  notes: "",
};

// Solo los campos que properties-back persiste en `communities`. Pedir
// administración, teléfono, zona horaria o moneda prometía una configuración
// que el backend descartaba en silencio.
export const EMPTY_COMMUNITY = {
  propertyId:"",
  name:"",
  kind:"condominium",
  cuotaBase:"",
  billingDay:"",
  reglamentoUrl:"",
};

export function validateCommunity(community) {
  const errors={};
  if(!community.propertyId) errors.propertyId="Selecciona el inmueble que representa la comunidad.";
  if(!community.name?.trim()) errors.name="Ingresa el nombre de la comunidad.";
  if(community.cuotaBase!==""&&community.cuotaBase!==undefined&&community.cuotaBase!==null&&Number(community.cuotaBase)<0) errors.cuotaBase="La cuota base no puede ser negativa.";
  // El backend acepta billing_day entre 1 y 28 para que exista en todos los meses.
  if(community.billingDay!==""&&community.billingDay!==undefined&&community.billingDay!==null){
    const day=Number(community.billingDay);
    if(!Number.isInteger(day)||day<1||day>28) errors.billingDay="El día de cobro debe estar entre 1 y 28.";
  }
  return errors;
}

export function createCommunity(draft) {
  return {
    id:globalThis.crypto?.randomUUID?.()||`community-${Date.now()}`,
    propertyId:draft.propertyId,
    name:draft.name.trim(),
    kind:draft.kind,
    regime:regimenFromCommunityKind(draft.kind),
    cuotaBase:draft.cuotaBase===""||draft.cuotaBase===undefined?"":Number(draft.cuotaBase),
    billingDay:draft.billingDay===""||draft.billingDay===undefined?"":Number(draft.billingDay),
    reglamentoUrl:draft.reglamentoUrl?.trim()||"",
    status:"active",
  };
}

export function validateCommunityPerson(person) {
  const errors = {};
  if (!person.name?.trim()) errors.name = "Ingresa el nombre de la persona.";
  if (!person.email?.trim()) errors.email = "Ingresa un correo electrónico.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim())) errors.email = "Ingresa un correo válido.";
  if (!person.roles?.length) errors.roles = "Selecciona al menos un rol.";
  return errors;
}

export function createCommunityPerson(draft) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `person-${Date.now()}`,
    communityIds: [...new Set(draft.communityIds || [])],
    personType: draft.personType || "individual",
    name: draft.name.trim(),
    email: draft.email.trim().toLowerCase(),
    phone: draft.phone?.trim() || "",
    roles: [...new Set(draft.roles)],
    emergencyContactName: draft.emergencyContactName?.trim() || "",
    emergencyContactPhone: draft.emergencyContactPhone?.trim() || "",
    communicationPreference: draft.communicationPreference || "email",
    notes: draft.notes?.trim() || "",
    status: "active",
  };
}

export function createPersonUnitRelation(draft, existing = []) {
  const duplicate = existing.some((relation) => relation.status !== "archived"
    && relation.personId === draft.personId
    && relation.unitId === draft.unitId
    && relation.role === draft.role);
  if (duplicate) throw new Error("Esta relación ya existe para la unidad.");
  if (!draft.personId || !draft.unitId || !PERSON_UNIT_ROLE_LABEL[draft.role]) {
    throw new Error("Selecciona persona, unidad y relación.");
  }
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) {
    throw new Error("La fecha de terminación no puede ser anterior al inicio.");
  }
  return {
    id: globalThis.crypto?.randomUUID?.() || `relation-${Date.now()}`,
    communityId: draft.communityId,
    personId: draft.personId,
    unitId: draft.unitId,
    role: draft.role,
    isPrimary: Boolean(draft.isPrimary),
    isPaymentResponsible: Boolean(draft.isPaymentResponsible),
    canVote: Boolean(draft.canVote),
    amenityAccess: draft.amenityAccess !== false,
    accessPermission: draft.accessPermission !== false,
    startsAt: draft.startsAt || "",
    endsAt: draft.endsAt || "",
    status: "active",
  };
}
