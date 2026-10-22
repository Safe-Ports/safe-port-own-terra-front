// Alcance del MVP de Properties: sale enfocado en Comunidades. Rentas (con
// hospedaje, publicaciones y portal del inquilino), Venta y los módulos que
// todavía no tienen backend (`later`) quedan ocultos, no borrados: para
// reactivarlos basta con cambiar estas banderas.
export const PROPERTIES_MVP_SCOPE = {
  rentals: false,
  sales: false,
  later: false,
};

// Rutas que pertenecen a cada área fuera de alcance. Sirven para esconder
// accesos en menús y guías sin tener que conocer cada pantalla.
const AREA_PATHS = {
  rentals: [
    "/properties/rentas",
    "/properties/publicaciones",
    "/properties/modulos/contratos",
    "/portal-inquilino",
    "/rentas",
  ],
  sales: [
    "/properties/modulos/publicaciones",
    "/properties/modulos/prospectos",
  ],
  // Vistas previas sin backend, para versiones futuras.
  later: [
    "/properties/modulos/inspecciones",
    "/properties/modulos/mensajes",
    "/properties/modulos/notificaciones",
    "/properties/modulos/portal-propietario",
  ],
};

export function isPathInScope(path) {
  return Object.entries(AREA_PATHS).every(
    ([area, paths]) => PROPERTIES_MVP_SCOPE[area] || !paths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)),
  );
}
