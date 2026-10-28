import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import UnitAccountCard from "./UnitAccountCard";

const data = vi.hoisted(() => ({
  condoCharges: [
    { id: "c1", unitId: "u1", concept: "Cuota septiembre", amount: 1500, paidAmount: 500, status: "overdue", dueDate: "2026-09-05" },
    { id: "c2", unitId: "u1", concept: "Cuota agosto", amount: 1500, paidAmount: 1500, status: "paid", dueDate: "2026-08-05" },
    { id: "c9", unitId: "u2", concept: "De otra unidad", amount: 900, paidAmount: 0, status: "overdue", dueDate: "2026-09-05" },
  ],
  markCondoChargePaid: vi.fn(async () => {}),
  waiveCondoCharge: vi.fn(async () => {}),
  addCondoCharge: vi.fn(async () => {}),
}));
vi.mock("../../data/PropertiesDataContext", () => ({ usePropertiesData: () => data }));
vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ showToast: vi.fn() }) }));
vi.mock("../collections/collectionsApi", () => ({ COLLECTIONS_API_READY: false, onPreviewChange: () => () => {}, staffPayments: { list: async () => [] } }));

const unit = { id: "u1", identifier: "J-201" };
const community = { id: "cm1", name: "Torre Jacarandas" };
const renderCard = (props = {}) => render(<QueryClientProvider client={new QueryClient()}><UnitAccountCard unit={unit} community={community} canWrite hasPayer {...props}/></QueryClientProvider>);

describe("UnitAccountCard", () => {
  it("shows the unit's balance and settles a charge from the sheet after confirming", async () => {
    renderCard();
    const card = screen.getByRole("region", { name: "Cuenta de J-201" });
    expect(card).toHaveTextContent("Saldo pendiente$1,000");
    expect(card).toHaveTextContent("Cuota septiembre");
    expect(card).not.toHaveTextContent("De otra unidad");
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(data.markCondoChargePaid).toHaveBeenCalledWith("c1"));
  });

  it("creates a charge already tied to the unit and asks for a payer first", async () => {
    const { unmount } = renderCard({ hasPayer: false });
    expect(screen.getByRole("button", { name: /Nuevo cargo/ })).toBeDisabled();
    unmount();
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo cargo/ }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Multa ruido" } });
    fireEvent.change(screen.getByLabelText("Importe"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Vencimiento"), { target: { value: "2026-11-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar cargo" }));
    await waitFor(() => expect(data.addCondoCharge).toHaveBeenCalledWith(expect.objectContaining({ unitId: "u1", communityId: "cm1", concept: "Multa ruido", amount: "500" })));
  });
});
