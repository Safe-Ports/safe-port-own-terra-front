// Roles generales de la persona, sin unidad de por medio. Dueño, residente e
// inquilino ya NO se piden aquí: se definen una sola vez, en el vínculo con la
// unidad. Pedirlos en dos lugares hacía que no coincidieran, y cuotas y
// votaciones leen el del vínculo. `board_member` es la clave del backend.
export const COMMUNITY_PERSON_ROLE_LABEL = {
  committee: "Comité",
  board_member: "Comité",
};

// Relación de una persona con una unidad: coincide 1:1 con el catálogo `roles`
// de properties-back. "Responsable de pago" no es un rol sino una bandera del
// vínculo (`is_payment_responsible`); como rol, el backend lo rechazaba.
export const PERSON_UNIT_ROLE_LABEL = {
  owner: "Propietario",
  resident: "Residente",
  tenant: "Inquilino",
};

export const PERSON_UNIT_ROLE_HINT = {
  owner: "Es dueño de la unidad, viva o no en ella.",
  resident: "Vive en la unidad sin ser dueño ni inquilino.",
  tenant: "Renta la unidad.",
};

// Permisos sugeridos por rol; el administrador los puede cambiar antes de guardar.
export const DEFAULT_UNIT_MEMBER_FLAGS = {
  owner: { isPaymentResponsible: true, canVote: true, amenityAccess: true },
  resident: { isPaymentResponsible: false, canVote: false, amenityAccess: true },
  tenant: { isPaymentResponsible: false, canVote: false, amenityAccess: true },
};

export const EMPTY_UNIT_MEMBER = {
  mode: "new",
  personId: "",
  name: "",
  email: "",
  phone: "",
  role: "owner",
  isPrimary: true,
  accessPermission: true,
  startsAt: "",
  endsAt: "",
  ...DEFAULT_UNIT_MEMBER_FLAGS.owner,
};

// Alta de una persona en una unidad: crea (o elige) a la persona y su vínculo
// en un solo paso.
export function validateUnitMember(draft) {
  const errors = {};
  if (draft.mode === "existing") {
    if (!draft.personId) errors.personId = "Elige a la persona del directorio.";
  } else {
    if (!draft.name?.trim()) errors.name = "Ingresa el nombre de la persona.";
    if (draft.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = "Ingresa un correo válido.";
  }
  if (!PERSON_UNIT_ROLE_LABEL[draft.role]) errors.role = "Elige la relación con la unidad.";
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) errors.endsAt = "La fecha de fin no puede ser anterior al inicio.";
  return errors;
}

// Grupos del directorio a partir de los vínculos activos, no de roles sueltos.
export function personUnitRoles(personId, relations = []) {
  return [...new Set(relations.filter((relation) => relation.personId === personId && relation.status !== "archived").map((relation) => relation.role))];
}

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
  roles: [],
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
  // El correo es opcional (no todos lo dan al registrarse), pero si viene debe
  // ser válido: es a donde llega la invitación al portal.
  if (person.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim())) errors.email = "Ingresa un correo válido.";
  return errors;
}

export function createCommunityPerson(draft) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `person-${Date.now()}`,
    communityIds: [...new Set(draft.communityIds || [])],
    personType: draft.personType || "individual",
    name: draft.name.trim(),
    email: draft.email?.trim().toLowerCase() || "",
    phone: draft.phone?.trim() || "",
    roles: [...new Set(draft.roles || [])],
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

// Lo que una comunidad tiene pendiente de atender, para las alertas de su
// tarjeta. Sólo usa datos que persisten en properties-back (cargos, paquetes,
// reservas, votaciones, unidades y relaciones): tickets y servicios siguen en
// datos demo y no deben presentarse como alertas reales.
// `module` indica a dónde lleva cada alerta en Operación diaria; `setup` se
// resuelve en la misma pantalla de Comunidades.
export function communityAlerts({ community, units = [], relations = [], charges = [], packages = [], reservations = [], votes = [] }) {
  if (!community) return [];
  const own = (items) => items.filter((item) => item.communityId === community.id);
  const activeUnits = units.filter((unit) => unit.propertyId === community.propertyId && unit.status !== "archived");
  const activeRelations = own(relations).filter((relation) => relation.status !== "archived");
  const overdue = own(charges).filter((charge) => charge.status === "overdue");
  const waitingPackages = own(packages).filter((item) => item.status === "pending");
  const requested = own(reservations).filter((item) => item.status === "requested");
  const openVotes = own(votes).filter((item) => item.status === "open");
  const overdueAmount = overdue.reduce((sum, charge) => sum + (charge.amount - (charge.paidAmount || 0)), 0);
  const alerts = [];
  if (!activeUnits.length || !activeRelations.length) {
    alerts.push({ key: "setup", tone: "warning", count: null, label: !activeUnits.length ? "Faltan unidades por registrar" : "Faltan personas vinculadas a unidades", module: "setup" });
  }
  if (overdue.length) alerts.push({ key: "charges", tone: "danger", count: overdue.length, amount: overdueAmount, label: `${overdue.length} cargo${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""}`, module: "charges" });
  if (requested.length) alerts.push({ key: "reservations", tone: "warning", count: requested.length, label: `${requested.length} reserva${requested.length > 1 ? "s" : ""} por aprobar`, module: "amenities" });
  if (waitingPackages.length) alerts.push({ key: "packages", tone: "warning", count: waitingPackages.length, label: `${waitingPackages.length} paquete${waitingPackages.length > 1 ? "s" : ""} en recepción`, module: "packages" });
  if (openVotes.length) alerts.push({ key: "votes", tone: "info", count: openVotes.length, label: `${openVotes.length} ${openVotes.length > 1 ? "votaciones abiertas" : "votación abierta"}`, module: "committee" });
  return alerts;
}
