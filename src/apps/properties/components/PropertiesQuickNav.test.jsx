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
    expect(screen.getByRole("button", { name: "Cuotas y adeudos: 2 cargos vencidos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paquetería: 1 paquete en recepción" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amenidades" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mi Día|Pendientes/ })).not.toBeInTheDocument();
  });

  it("marks the module open in daily operations and navigates to shortcuts", () => {
    const goTo = renderNav("/properties/comunidades/operacion?module=committee");
    expect(screen.getByRole("button", { name: /Votaciones/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Cuotas y adeudos/ })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: /Cuotas y adeudos/ }));
    expect(goTo).toHaveBeenCalledWith("/properties/comunidades/operacion?module=charges");
  });

  it("hides shortcuts the user has no permission for", () => {
    mocks.allowed = (feature) => feature !== "properties.units.read";
    renderNav();
    expect(screen.queryByRole("button", { name: /Paquetería/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comunidades" })).toBeInTheDocument();
  });
});
