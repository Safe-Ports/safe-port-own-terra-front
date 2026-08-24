/* ════════════════════════════════════════════════════════════════════
   Representación compartida de la identidad del cliente en el core.
   La presencia multi-app solo puede venir de asignaciones explícitas;
   nunca debe inferirse a partir de los datos del cliente.
   ════════════════════════════════════════════════════════════════════ */

export const CORE_APPS = [
  { key: "lands", name: "OwnTerra Lands", short: "Lands", color: "#6FAF6B" },
  { key: "neighb", name: "OwnTerra Properties", short: "Properties", color: "#355E3B" },
  { key: "construct", name: "Ownterra Construct", short: "Construct", color: "#B98C58" },
  { key: "homes", name: "OwnTerra Construction", short: "Construction", color: "#A7CBA1" },
];

const getAssignedAppKeys = (client) => {
  const assignments = client?.apps ?? client?.app_assignments ?? [];
  if (!Array.isArray(assignments)) return [];

  return assignments
    .map((assignment) => (
      typeof assignment === "string"
        ? assignment
        : assignment?.app_key ?? assignment?.key
    ))
    .filter(Boolean);
};

/* La presencia en cada app solo se muestra cuando el backend entrega una
   asignación explícita. */
export function getClientEcosystem(client) {
  const assignedAppKeys = new Set(getAssignedAppKeys(client));
  const apps = Object.fromEntries(
    CORE_APPS.map((app) => [app.key, assignedAppKeys.has(app.key)])
  );
  const otherApps = CORE_APPS.filter((a) => a.key !== "lands" && apps[a.key]);
  return {
    apps,
    otherApps,
    multiApp: otherApps.length > 0,
    coreId: client?.id != null ? String(client.id) : null,
  };
}
