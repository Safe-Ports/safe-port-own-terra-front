export const GLOBAL_ROLES = {
  admin: { label: "Administrador", desc: "Administra Core, equipo, permisos y operación." },
  vendor: { label: "Vendedor", desc: "Opera clientes, ventas y agenda asignada." },
};

export const APP_CATALOG = [
  { key: "core", name: "Ecosistema Core", icon: "eco-brand", cls: "ic-lands", roles: ["admin", "manager", "viewer"], defaultRole: "viewer", desc: "Panel central, clientes, equipo y configuración." },
  { key: "lands", name: "OwnTerra Lands", icon: "eco-g-lands", cls: "ic-lands", roles: ["seller", "manager", "collections", "viewer"], defaultRole: "seller", desc: "Lotes, fraccionamientos, ventas y cobranza.", vertical: true, live: true },
  { key: "construct", name: "Ownterra Construct", icon: "eco-g-construct", cls: "ic-construct", roles: ["admin_financiero", "residente_obra", "director_auditor"], defaultRole: "admin_financiero", desc: "Cuantificación física, presupuestos híbridos APU/Alzado y catálogo maestro de obra.", vertical: true, live: true },
  { key: "neighb", name: "Properties", icon: "eco-g-neighb", cls: "ic-neighb", roles: ["seller", "manager", "viewer"], defaultRole: "seller", desc: "Propiedades y comunidades.", vertical: true, live: false },
  { key: "vault", name: "OwnTerra Vault", icon: "eco-n-vault", cls: "ic-lands", roles: ["admin", "editor", "viewer"], defaultRole: "viewer", desc: "Documentos, expedientes y permisos de lectura." },
  { key: "finanzas", name: "Finanzas", icon: "eco-n-chart", cls: "ic-lands", roles: ["admin", "collections", "viewer"], defaultRole: "viewer", desc: "Cobranza, reportes y estados financieros." },
];

export const VERTICAL_APP_CATALOG = APP_CATALOG.filter((app) => app.vertical && app.live);

export const APP_ROLE_LABEL = {
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor",
  collections: "Cobranza",
  editor: "Editor",
  viewer: "Solo lectura",
  admin_financiero: "Admin Financiero",
  residente_obra: "Residente de Obra",
  director_auditor: "Director/Auditor",
};

export const FEATURE_LABEL = {
  "core.clients": "Clientes del Core",
  "core.team": "Equipo y permisos",
  "core.finance": "Estados financieros",
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
  "construct.read": "Ownterra Construct",
  "construct.write": "Edición de Construct",
  "construct.quantify": "Cuantificación de obra",
  "construct.catalog": "Catálogo maestro de obra",
  "construct.budget": "Presupuesto de obra",
  "construct.reports": "Reportes de obra",
};

const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const VENDOR_ROLES = new Set(["vendor", "vendedor", "seller"]);

export function defaultPermissionsFor(appKey, role) {
  if (role === "admin") return [`${appKey}.*`];
  if (role === "manager") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.clients`, `${appKey}.sales`, `${appKey}.documents`, `${appKey}.reports`];
  if (role === "seller") return [`${appKey}.read`, `${appKey}.clients`, `${appKey}.sales`, `${appKey}.agenda`, `${appKey}.documents`];
  if (role === "collections") return [`${appKey}.read`, `${appKey}.payments`, `${appKey}.reports`, `${appKey}.clients`];
  if (role === "editor") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.documents`];
  if (role === "admin_financiero") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.catalog`, `${appKey}.budget`, `${appKey}.reports`];
  if (role === "residente_obra") return [`${appKey}.read`, `${appKey}.write`, `${appKey}.quantify`];
  if (role === "director_auditor") return [`${appKey}.read`, `${appKey}.reports`];
  return [`${appKey}.read`];
}

const normalizeRole = (role = "") => String(role).toLowerCase();

/* Única fuente de verdad de "es admin global" — evita que cada pantalla
   invente su propio set de roles admin (ver Formularios/index.jsx y
   Respuestas.jsx, que antes incluían "owner" por error). */
export function isGlobalAdmin(user) {
  return ADMIN_ROLES.has(normalizeRole(user?.role));
}

const getAppRows = (user) => {
  const sources = [user?.apps, user?.user_apps, user?.app_access, user?.applications];
  return sources.find(Array.isArray) || [];
};

const getPermissions = (user) => {
  const rows = getAppRows(user);
  const fromRows = rows.flatMap((row) => {
    const key = row?.app_key || row?.key || row?.app;
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
      return key === appKey && row?.is_active !== false;
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
    "core.finance": () => hasPermission(user, "core.finance"),
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
    "construct.read": () => canAccessApp(user, "construct"),
    "construct.write": () => canAccessApp(user, "construct") && hasPermission(user, "construct.write"),
    "construct.quantify": () => canAccessApp(user, "construct") && hasPermission(user, "construct.quantify"),
    "construct.catalog": () => canAccessApp(user, "construct") && hasPermission(user, "construct.catalog"),
    "construct.budget": () => canAccessApp(user, "construct") && hasPermission(user, "construct.budget"),
    "construct.reports": () => canAccessApp(user, "construct") && hasPermission(user, "construct.reports"),
  };

  return checks[feature]?.() || hasPermission(user, feature);
}

export function getDeniedMessage(feature) {
  const label = FEATURE_LABEL[feature] || "esta sección";
  return `No tienes permiso para acceder a ${label}.`;
}
