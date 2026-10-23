import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommunityCards, { filterCommunities, normalize } from "./CommunityCards";

const mocks = vi.hoisted(() => ({
  media: vi.fn(async (_type, inmuebleId) => (inmuebleId === "inm-1" ? [{ id: "a1", content_type: "image/jpeg", url: "https://r2.test/torre.jpg" }] : [])),
}));

vi.mock("@/services/propertiesService", () => ({ default: { media: { list: mocks.media } } }));

const communities = [
  { id: "c1", propertyId: "p1", inmuebleId: "inm-1", name: "Nefta Torre", kind: "vertical_condo" },
  { id: "c2", propertyId: "p2", inmuebleId: "inm-2", name: "Cabañas Loma", kind: "vertical_condo" },
];
const data = {
  units: [{ id: "u1", propertyId: "p1", status: "available" }, { id: "u2", propertyId: "p1", status: "rented" }],
  personUnitRelations: [{ id: "r1", communityId: "c1", personId: "per-1", status: "active" }],
  condoCharges: [{ communityId: "c1", status: "overdue", amount: 1500, paidAmount: 0 }],
  packages: [{ communityId: "c1", status: "pending" }],
  reservations: [],
  votes: [],
};

function renderCards(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handlers = { onSelect: vi.fn(), onAlert: vi.fn() };
  render(<QueryClientProvider client={client}><CommunityCards communities={communities} selectedId="c1" data={data} {...handlers} {...props} /></QueryClientProvider>);
  return handlers;
}

describe("CommunityCards", () => {
  it("shows each community with its counts, cover and selection", async () => {
    renderCards();
    expect(screen.getByRole("button", { name: /Nefta Torre/, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cabañas Loma/, pressed: false })).toBeInTheDocument();
    expect(screen.getByText("Seleccionada")).toBeInTheDocument();
    expect(screen.getAllByTitle("Unidades").map((chip) => chip.textContent.trim())).toEqual(["2 unidades", "0 unidades"]);
    // La portada es decorativa (alt=""), así que no tiene rol img.
    await waitFor(() => expect(document.querySelector(".community-card-cover img")).toHaveAttribute("src", "https://r2.test/torre.jpg"));
  });

  it("raises alerts for pending operations and routes them on click", () => {
    const { onAlert, onSelect } = renderCards();
    const overdue = screen.getByRole("button", { name: "Nefta Torre: 1 cargo vencido · $1,500" });
    fireEvent.click(overdue);
    expect(onAlert).toHaveBeenCalledWith(communities[0], expect.objectContaining({ module: "charges" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Nefta Torre: 1 paquete en recepción" })).toBeInTheDocument();
    // Cabañas Loma no tiene unidades: la alerta es de configuración.
    expect(screen.getByRole("button", { name: "Cabañas Loma: Faltan unidades por registrar" })).toBeInTheDocument();
  });

  it("busca sin acentos, filtra por pendientes y cambia a lista", () => {
    renderCards();
    const search = screen.getByRole("searchbox", { name: "Buscar comunidad" });
    fireEvent.change(search, { target: { value: "cabanas" } });
    expect(screen.getByText(/1 de 2 comunidades/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nefta Torre/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(/Ninguna comunidad coincide/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    fireEvent.click(screen.getByRole("radio", { name: "Lista" }));
    expect(screen.getByRole("table", { name: "Comunidades" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver unidades de Nefta Torre" })).toBeInTheDocument();
  });
});

describe("filterCommunities", () => {
  const row = (name, extra = {}) => ({ community: { id: name, name, kind: "vertical_condo" }, alerts: [], units: 0, urgency: 0, haystack: normalize(name), ...extra });
  const rows = [row("Bosque Alto", { units: 3 }), row("Árboles del Sur", { alerts: [{}], urgency: 30 }), row("Lago Norte", { units: 9 })];
  it("ordena por atención, nombre o unidades y combina palabras", () => {
    expect(filterCommunities(rows).map((r) => r.community.name)).toEqual(["Árboles del Sur", "Bosque Alto", "Lago Norte"]);
    expect(filterCommunities(rows, { sort: "units" }).map((r) => r.community.name)[0]).toBe("Lago Norte");
    expect(filterCommunities(rows, { query: "arboles sur" }).length).toBe(1);
    expect(filterCommunities(rows, { status: "clear" }).length).toBe(2);
  });
});
