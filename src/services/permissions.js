/**
 * Los dos únicos roles del producto: administrador y colaborador.
 *
 * El valor guardado sigue siendo "vendor" a propósito. Es un token interno —lo
 * mira la base con un CHECK, y una treintena de comprobaciones en el backend—,
 * y renombrarlo pediría una migración sin cambiarle nada a quien usa la app. Lo
 * que el usuario lee es esta etiqueta.
 *
 * Ojo con no confundirlo con el "vendedor asignado" de un lote o un contrato:
 * eso es quién lleva la operación comercial, no un rol. Un colaborador puede
 * ser el vendedor asignado, y un administrador también.
 */
export const GLOBAL_ROLES = {
  admin: { label: "Administrador", desc: "Administra la organización, el equipo, los accesos y la operación." },
  vendor: { label: "Colaborador", desc: "Opera su cartera de clientes, aparta lotes y agenda citas." },
};

export const APP_CATALOG = [
  { key: "core", name: "Ecosistema Core", icon: "eco-brand", cls: "ic-lands", roles: ["admin", "manager", "viewer"], defaultRole: "viewer", desc: "Panel central, clientes, equipo y configuración." },
  { key: "lands", name: "OwnTerra Lands", icon: "eco-g-lands", cls: "ic-lands", roles: ["seller", "manager", "collections", "viewer"], defaultRole: "seller", desc: "Lotes, fraccionamientos, ventas y cobranza.", vertical: true, live: true },
  { key: "homes", name: "OwnTerra Construction", icon: "eco-g-homes", cls: "ic-homes", roles: ["seller", "manager", "viewer"], defaultRole: "seller", desc: "Avance de obra, acabados y postventa de desarrollos habitacionales.", vertical: true, live: false },
  { key: "neighb", name: "Properties", icon: "eco-g-neighb", cls: "ic-neighb", roles: ["seller", "manager", "viewer"], defaultRole: "seller", desc: "Propiedades y comunidades.", vertical: true, live: false },
  { key: "vault", name: "OwnTerra Vault", icon: "eco-n-vault", cls: "ic-lands", roles: ["admin", "editor", "viewer"], defaultRole: "viewer", desc: "Documentos, expedientes y permisos de lectura." },
  { key: "finanzas", name: "Finanzas", icon: "eco-g-finanzas", cls: "ic-finanzas", roles: ["admin", "collections", "viewer"], defaultRole: "viewer", desc: "Ingresos y egresos de todo el ecosistema.", vertical: true, live: true },
];

export const VERTICAL_APP_CATALOG = APP_CATALOG.filter((app) => app.vertical && app.live);

/**
 * Etiquetas de los roles por app. Hoy sólo se usan dos: "seller" es el paquete de
 * permisos del colaborador y "admin" el del administrador — de ahí que "seller"
 * se lea "Colaborador" y no "Vendedor".
 *
 * Gerente, Cobranza, Editor y Solo lectura están definidos pero ninguna pantalla
 * los asigna: quedan en reserva para cuando el equipo tenga más roles.
 */
export const APP_ROLE_LABEL = {
  admin: "Administrador",
  manager: "Gerente",
  seller: "Colaborador",
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
};

// Solo "admin": el CHECK de la tabla `users` admite exactamente 'admin' y
// 'vendor', así que ningún usuario puede tener "superadmin". Estaba de más y
// hacía creer que existe un tercer rol global.
const ADMIN_ROLES = new Set(["admin"]);

export function defaultPermissionsFor(appKey, role) {
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
  // Solo las asignaciones ACTIVAS, igual que el backend
  // (`has_app_permission` filtra por `row.is_active` antes de mirar nada más).
  // Acá se recorrían todas, así que revocar un acceso desactivando la asignación
  // seguía habilitando la UI: menú y secciones a la vista, y un 403 en cada
  // pantalla que el usuario abría. `canAccessApp`, diez líneas más abajo, sí lo
  // comprobaba — el filtro faltaba únicamente en este camino.
  const rows = getAppRows(user).filter((row) => row?.is_active !== false);
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

  // Sin asignaciones no hay acceso, y punto. Antes acá se asumía que un
  // colaborador entraba a Lands aunque nadie se lo hubiera dado, y el backend no
  // asume nada: el resultado era un usuario partido al medio, con el menú de
  // Lands a la vista y un 403 en cada pantalla que abría. Dar de alta a alguien y
  // darle acceso a una app son dos pasos, y esto pretendía que fueran uno.
  return false;
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
    // Sin el "|| lands.sales" que tenía antes: el rol seller trae "sales", así que
    // ese atajo le daba write a todos los vendedores y les mostraba secciones de
    // administración (Carga de Lotes, Calculadora) que el backend después les niega
    // con un 403. Entrar a una pantalla para chocarse con un error no es un permiso.
    "lands.write": () => canAccessApp(user, "lands") && hasPermission(user, "lands.write"),
    "lands.clients": () => canAccessApp(user, "lands") && hasPermission(user, "lands.clients"),
    "lands.sales": () => canAccessApp(user, "lands") && hasPermission(user, "lands.sales"),
    "lands.documents": () => canAccessApp(user, "lands") && hasPermission(user, "lands.documents"),
    "lands.payments": () => canAccessApp(user, "lands") && hasPermission(user, "lands.payments"),
    "lands.reports": () => canAccessApp(user, "lands") && hasPermission(user, "lands.reports"),
  };

  // Si la función existe, su respuesta es la final. Antes esto era
  // `checks[feature]?.() || hasPermission(user, feature)`, y como cada check está
  // escrito `canAccessApp(...) && hasPermission(...)`, justo cuando el `&&` daba
  // false —el caso que se quería bloquear— el `||` lo reintentaba sin el
  // `canAccessApp`. El guard quedaba decorativo.
  if (feature in checks) return checks[feature]();
  return hasPermission(user, feature);
}

export function getDeniedMessage(feature) {
  const label = FEATURE_LABEL[feature] || "esta sección";
  return `No tienes permiso para acceder a ${label}.`;
}
