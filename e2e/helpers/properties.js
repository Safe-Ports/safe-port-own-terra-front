import { expect } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./session.js";
const inmueble = { id: "building", inmueble_id: "estate", parent_id: null, label: "Comunidad Jacarandas", estado: "ocupado", attributes: { address: "Avenida de los Insurgentes 123", city: "Ciudad de México" } };
const unit = { id: "unit", inmueble_id: "estate", parent_id: "building", label: "Departamento 302", estado: "vacante", attributes: { area: 85 } };
const person = { id: "person", nombre: "Mariana Torres", correo: "mariana@example.com", telefono: "+525500000000", roles: [{ id: "owner-role", clave: "owner" }] };

export async function prepare(page) {
  await seedSession(page);
  await mockCoreEndpoints(page);
  await page.route(`${API}/**`, async (route, request) => {
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, "");
    if (path === "/auth/me") return route.fallback();
    const pages = { "/properties": [inmueble, unit], "/personas": [person], "/ledger/charges": [], "/service-providers": [{ id: "provider", name: "Plomería Díaz", kind: "company", status: "active", specialty_ids: [], contacts_count: 1 }] };
    const arrays = { "/roles": [{ id: "owner-role", clave: "owner", descripcion: "Propietario" }], "/communities": [{ id: "community", inmueble_id: "estate", legal_name: "Comunidad Jacarandas", regimen: "condominio" }], "/property-relations": [{ id: "relation", property_id: "unit", persona_id: "person", role_id: "owner-role", has_access_permission: true }] };
    let body = pages[path] ? { items: pages[path], total: pages[path].length } : arrays[path] || [];
    if (path.endsWith("/dashboard")) body = { total_units: 1, units_by_estado: { vacante: 1 }, overdue_total: 0, overdue_count: 0 };
    if (path === "/ledger/arrears") body = { items: [], total_due: 0 };
    if (path.endsWith("/specs")) body = { attributos: {}, dimensiones: {} };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

export async function expectFits(page) {
  await expect.poll(() => page.evaluate(() => {
    const containers = [document.documentElement, ...document.querySelectorAll(".eco-root .main, .eco-root .scroll-area, main")];
    return containers.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ className: element.className, width: element.clientWidth, scroll: element.scrollWidth }));
  })).toEqual([]);
}

