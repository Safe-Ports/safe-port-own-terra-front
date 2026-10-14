import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PropertiesQuickNav from "./PropertiesQuickNav";

const mocks = vi.hoisted(() => ({ allowed: () => true }));

vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ canUseFeature: (feature) => mocks.allowed(feature) }) }));
vi.mock("../data/PropertiesDataContext", () => ({
  usePropertiesData: () => ({
    condoCharges: [{ status: "overdue" }, { status: "overdue" }, { status: "paid" }],
    packages: [{ status: "pending" }, { status: "delivered" }],
    reservations: [],
    votes: [{ status: "open" }],
  }),
}));

function renderNav(path = "/properties") {
  const goTo = vi.fn();
  render(<MemoryRouter initialEntries={[path]}><PropertiesQuickNav goTo={goTo} /></MemoryRouter>);
  return goTo;
}

describe("PropertiesQuickNav", () => {
  it("offers shortcuts with counts from persisted data and no duplicated top-bar items", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Cobranza: 2 cargos vencidos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comunidades" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mi Día|Pendientes/ })).not.toBeInTheDocument();
  });

  it("marks the module open in daily operations and navigates to shortcuts", () => {
    const goTo = renderNav("/properties/comunidades/operacion?module=committee");
    expect(screen.getByRole("button", { name: /Comunicación/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Cobranza/ })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: /Cobranza/ }));
    expect(goTo).toHaveBeenCalledWith("/properties/comunidades/operacion?module=charges");
  });

  it("hides shortcuts the user has no permission for", () => {
    mocks.allowed = (feature) => feature !== "properties.properties.read";
    renderNav();
    expect(screen.queryByRole("button", { name: /Cobranza/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoy" })).toBeInTheDocument();
  });

  // Quitamos los enlaces "volver" de las pantallas: ahora el regreso vive solo
  // en el menú y en el logo. Si una pantalla no enciende ninguna entrada, el
  // administrador se queda sin saber dónde está ni a dónde volver.
  it("keeps every Properties screen anchored to one menu entry", () => {
    mocks.allowed = () => true;
    const screens = [
      ["/properties", "Hoy"],
      ["/properties/guia", "Hoy"],
      ["/properties/comunidades", "Comunidades"],
      ["/properties/comunidades?tab=units", "Comunidades"],
      ["/properties/comunidades/operacion?module=charges", "Cobranza"],
      ["/properties/comunidades/operacion?module=utilities", "Servicios"],
      ["/properties/responsables", "Servicios"],
      ["/properties/tickets", "Servicios"],
      ["/properties/comunidades/operacion?module=communications", "Comunicación"],
      ["/properties/comunidades/operacion?module=committee", "Comunicación"],
      ["/properties/operacion", "Todas las herramientas"],
      ["/properties/accesos", "Todas las herramientas"],
      ["/properties/portafolio", "Todas las herramientas"],
      ["/properties/inmuebles", "Todas las herramientas"],
      ["/properties/unidades", "Todas las herramientas"],
      ["/properties/propietarios", "Todas las herramientas"],
      ["/properties/modulos/actividad", "Todas las herramientas"],
    ];
    for (const [path, label] of screens) {
      const { unmount } = render(<MemoryRouter initialEntries={[path]}><PropertiesQuickNav goTo={vi.fn()} /></MemoryRouter>);
      const current = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-current") === "page");
      expect(current.map((button) => button.textContent.replace(/\d+$/, "")), `sin ancla en ${path}`).toHaveLength(1);
      expect(current[0]).toHaveAccessibleName(new RegExp(label));
      unmount();
    }
  });

  it("always offers a way out of Properties", () => {
    mocks.allowed = () => true;
    const goTo = renderNav("/properties/tickets");
    expect(screen.getByRole("button", { name: "Inicio de Properties" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver al ecosistema" }));
    expect(goTo).toHaveBeenCalledWith("/ecosistema");
  });
});
