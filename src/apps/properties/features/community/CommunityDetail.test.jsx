import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommunityDetail from "./CommunityDetail";

vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ showToast: vi.fn() }) }));
vi.mock("@/services/propertiesService", () => ({ default: {
  media: { list: async () => [] },
  specs: { get: async () => ({ attributos: { elevador: true, gimnasio: true }, dimensiones: { niveles: 6 } }) },
} }));

const community = { id: "c1", inmuebleId: "inm-1", name: "Privada La Arboleda", kind: "private_subdivision", cuotaBase: 1500, billingDay: 5, reglamentoUrl: "" };

describe("CommunityDetail", () => {
  it("shows the building spec sheet from properties-back", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CommunityDetail community={community} property={{ address: "Av. Vallarta 1200", city: "Guadalajara" }} unitsCount={1} peopleCount={0} canWrite onEdit={() => {}} onClose={() => {}} /></QueryClientProvider>);
    const sheet = await screen.findByRole("group", { name: "Ficha técnica de Privada La Arboleda" });
    expect(within(sheet).getByText("Elevador")).toBeInTheDocument();
    expect(within(sheet).getByText("Gimnasio")).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Niveles6");
    expect(screen.getByText("Av. Vallarta 1200, Guadalajara")).toBeInTheDocument();
  });
});
