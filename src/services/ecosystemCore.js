/* ════════════════════════════════════════════════════════════════════
   MOCK FRONT del "core" del ecosistema.
   Pendiente de backend: tablas `core_clients` (identidad única) +
   `client_app_assignments` (client_id, app). Por ahora derivamos la
   presencia multi-app de forma determinista para la maqueta.
   ════════════════════════════════════════════════════════════════════ */

export const CORE_APPS = [
  { key: "lands", name: "OwnTerra Lands", short: "Lands", color: "#6FAF6B" },
  { key: "neighb", name: "OwnTerra Neighborhoods", short: "Neighborhoods", color: "#355E3B" },
  { key: "homes", name: "OwnTerra Homes", short: "Homes", color: "#A7CBA1" },
];

const hash = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/* Presencia del cliente en el ecosistema (mock determinista por id/email).
   Todo cliente que vive en Lands tiene, por definición, acceso a `lands`. */
export function getClientEcosystem(client) {
  const seed = hash(String(client?.id ?? client?.email ?? client?.name ?? ""));
  const apps = { lands: true, neighb: seed % 3 === 0, homes: seed % 5 === 0 };
  const otherApps = CORE_APPS.filter((a) => a.key !== "lands" && apps[a.key]);
  return {
    apps,
    otherApps,
    multiApp: otherApps.length > 0,
    coreId: `core_${(seed % 9000) + 1000}`,
  };
}
