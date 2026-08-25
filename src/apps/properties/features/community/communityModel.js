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

export const EMPTY_COMMUNITY = {
  propertyId:"",
  name:"",
  kind:"condominium",
  regime:"",
  administrator:"",
  contactEmail:"",
  contactPhone:"",
  operationFrequency:"monthly",
  timezone:"America/Mexico_City",
  currency:"MXN",
};

export function validateCommunity(community) {
  const errors={};
  if(!community.propertyId) errors.propertyId="Selecciona el inmueble que representa la comunidad.";
  if(!community.name?.trim()) errors.name="Ingresa el nombre de la comunidad.";
  if(!community.administrator?.trim()) errors.administrator="Ingresa el nombre de la administración responsable.";
  return errors;
}

export function createCommunity(draft) {
  return {
    id:globalThis.crypto?.randomUUID?.()||`community-${Date.now()}`,
    propertyId:draft.propertyId,
    name:draft.name.trim(),
    kind:draft.kind,
    regime:draft.regime?.trim()||"",
    administrator:draft.administrator.trim(),
    contactEmail:draft.contactEmail?.trim().toLowerCase()||"",
    contactPhone:draft.contactPhone?.trim()||"",
    operationFrequency:draft.operationFrequency||"monthly",
    timezone:draft.timezone||"America/Mexico_City",
    currency:draft.currency||"MXN",
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
