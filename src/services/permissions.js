export const GLOBAL_ROLES = {
  admin: { label: "Administrador", desc: "Administra Core, equipo, permisos y operación." },
  vendor: { label: "Vendedor", desc: "Opera clientes, ventas y agenda asignada." },
};

export const APP_CATALOG = [
  { key: "core", name: "Ecosistema Core", icon: "eco-brand", cls: "ic-lands", roles: ["admin", "manager", "viewer"], defaultRole: "viewer", desc: "Panel central, clientes, equipo y configuración." },
  { key: "lands", name: "OwnTerra Lands", icon: "eco-g-lands", cls: "ic-lands", roles: ["seller", "manager", "collections", "viewer"], defaultRole: "seller", desc: "Lotes, fraccionamientos, ventas y cobranza.", vertical: true, live: true },
  { key: "homes", name: "OwnTerra Construction", icon: "eco-g-homes", cls: "ic-homes", roles: ["seller", "manager", "viewer"], defaultRole: "seller", desc: "Avance de obra, acabados y postventa de desarrollos habitacionales.", vertical: true, live: false },
  { key: "properties", name: "OwnTerra Properties", icon: "eco-g-neighb", cls: "ic-neighb", roles: ["manager", "viewer"], defaultRole: "manager", desc: "Condominios, rentas y comercialización de inmuebles.", vertical: true, live: true },
  { key: "vault", name: "OwnTerra Vault", icon: "eco-n-vault", cls: "ic-lands", roles: ["admin", "editor", "viewer"], defaultRole: "viewer", desc: "Documentos, expedientes y permisos de lectura." },
  { key: "finanzas", name: "Finanzas", icon: "eco-g-finanzas", cls: "ic-finanzas", roles: ["admin", "collections", "viewer"], defaultRole: "viewer", desc: "Ingresos y egresos de todo el ecosistema.", vertical: true, live: true },
];

export const VERTICAL_APP_CATALOG = APP_CATALOG.filter((app) => app.vertical && app.live);

export const APP_ROLE_LABEL = {
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor",
  collections: "Cobranza",
  editor: "Editor",
  viewer: "Solo lectura",
};

export const FEATURE_LABEL = {
  "core.clients": "Clientes del Core",
  "core.team": "Equipo y permisos",
  "core.providers": "Proveedores",
  "core.vault": "OwnTerra Vault",
  "core.forms": "Formularios del Core",
  "core.config": "Configuración",
  "lands.read": "OwnTerra Lands",
  "lands.write": "Edición de Lands",
  "lands.clients": "Clientes Lands",
  "lands.sales": "Contratos y ventas",
  "lands.documents": "Documentos Lands",
  "lands.payments": "Pagos y cobranza",
  "lands.reports": "Reportes Lands",
  "properties.read": "OwnTerra Properties",
  "properties.write": "Edición de Properties",
  "properties.owners.read": "Propietarios",
  "properties.properties.read": "Propiedades",
  "properties.units.read": "Unidades",
};

const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const VENDOR_ROLES = new Set(["vendor", "vendedor", "seller"]);

export function defaultPermissionsFor(appKey, role) {
  if (appKey === "properties" && role === "manager") {
    return [
      "properties.read",
      "properties.write",
      "properties.owners.read",
      "properties.owners.write",
      "properties.properties.read",
      "properties.properties.write",
      "properties.units.read",
      "properties.units.write",
    ];
  }
  if (appKey === "properties" && role === "viewer") {
    return [
      "properties.read",
      "properties.owners.read",
      "properties.properties.read",
      "properties.units.read",
    ];
  }
  if (role === "admin") return [`${appKey}.*`];
  if (role === "manager") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.clients`, `${appKey}.sales`, `${appKey}.documents`, `${appKey}.reports`];
  if (role === "seller") return [`${appKey}.read`, `${appKey}.clients`, `${appKey}.sales`, `${appKey}.agenda`, `${appKey}.documents`];
  if (role === "collections") return [`${appKey}.read`, `${appKey}.payments`, `${appKey}.reports`, `${appKey}.clients`];
  if (role === "editor") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.documents`];
  return [`${appKey}.read`];
}

const normalizeRole = (role = "") => String(role).toLowerCase();

const getAppRows = (user) => {
  const sources = [user?.apps, user?.user_apps, user?.app_access, user?.applications];
  return sources.find(Array.isArray) || [];
};

const getPermissions = (user) => {
  const rows = getAppRows(user);
  const fromRows = rows.flatMap((row) => {
    const rawKey = row?.app_key || row?.key || row?.app;
    const key = rawKey === "neighb" ? "properties" : rawKey;
    const role = row?.role;
    const explicit = row?.permissions || [];
    return key && role ? [...defaultPermissionsFor(key, role), ...explicit] : explicit;
  });
  return [...(user?.permissions || []), ...fromRows].filter(Boolean);
};

const hasPermission = (user, permission) => {
  const role = normalizeRole(user?.role);
  if (ADMIN_ROLES.has(role)) return true;

  const [appKey] = permission.split(".");
  return getPermissions(user).some((p) => (
    p === permission ||
    p === `${appKey}.*` ||
    (permission.endsWith(".read") && p === `${appKey}.read`)
  ));
};

export function canAccessApp(user, appKey) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (ADMIN_ROLES.has(role)) return true;
  if (appKey === "core") return true;

  const rows = getAppRows(user);
  if (rows.length > 0) {
    return rows.some((row) => {
      const key = row?.app_key || row?.key || row?.app;
      // `neighb` fue el identificador provisional de Properties en el Core.
      // Se conserva como alias de lectura mientras las asignaciones existentes
      // migran al app_key definitivo `properties`.
      const requestedKeys = appKey === "properties" ? ["properties", "neighb"] : [appKey];
      return requestedKeys.includes(key) && row?.is_active !== false;
    });
  }

  return appKey === "lands" && VENDOR_ROLES.has(role);
}

export function canUseFeature(user, feature) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (ADMIN_ROLES.has(role)) return true;

  const checks = {
    "core.clients": () => canAccessApp(user, "core") || hasPermission(user, "lands.clients"),
    "core.team": () => hasPermission(user, "core.users") || hasPermission(user, "core.write"),
    "core.providers": () => hasPermission(user, "core.users") || hasPermission(user, "core.write"),
    "core.vault": () => hasPermission(user, "core.vault"),
    "core.forms": () => true,
    "core.config": () => hasPermission(user, "core.write"),
    "lands.read": () => canAccessApp(user, "lands"),
    "lands.write": () => hasPermission(user, "lands.write") || hasPermission(user, "lands.sales"),
    "lands.clients": () => canAccessApp(user, "lands") && hasPermission(user, "lands.clients"),
    "lands.sales": () => canAccessApp(user, "lands") && hasPermission(user, "lands.sales"),
    "lands.documents": () => canAccessApp(user, "lands") && hasPermission(user, "lands.documents"),
    "lands.payments": () => canAccessApp(user, "lands") && hasPermission(user, "lands.payments"),
    "lands.reports": () => canAccessApp(user, "lands") && hasPermission(user, "lands.reports"),
    "properties.read": () => canAccessApp(user, "properties"),
    "properties.write": () => canAccessApp(user, "properties") && hasPermission(user, "properties.write"),
    "properties.owners.read": () => canAccessApp(user, "properties") && hasPermission(user, "properties.owners.read"),
    "properties.properties.read": () => canAccessApp(user, "properties") && hasPermission(user, "properties.properties.read"),
    "properties.units.read": () => canAccessApp(user, "properties") && hasPermission(user, "properties.units.read"),
  };

  return checks[feature]?.() || hasPermission(user, feature);
}

export function getDeniedMessage(feature) {
  const label = FEATURE_LABEL[feature] || "esta sección";
  return `No tienes permiso para acceder a ${label}.`;
}
