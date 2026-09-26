import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitMonitorPanel from "./UnitMonitorPanel";

// Mismas llaves que expone PropertiesDataContext con properties-back: antes el
// monitoreo leía `people`/`relations`/`charges`, que no existen, y mostraba
// todas las unidades sin habitantes ni saldo.
vi.mock("../../data/PropertiesDataContext", () => ({
  usePropertiesData: () => ({
    units: [
      { id: "u1", propertyId: "p1", identifier: "J-201", type: "apartment", status: "rented", area: 80 },
      { id: "u2", propertyId: "p1", identifier: "J-202", type: "apartment", status: "available" },
      { id: "u9", propertyId: "otra", identifier: "Z-1", type: "apartment", status: "available" },
    ],
    communityPeople: [{ id: "per-1", name: "Mariana Torres" }],
    personUnitRelations: [{ id: "r1", unitId: "u1", personId: "per-1", role: "resident", isPaymentResponsible: true, status: "active" }],
    condoCharges: [{ id: "c1", unitId: "u1", concept: "Cuota septiembre", amount: 1500, paidAmount: 500, status: "partial", dueDate: "2026-09-05" }],
    utilityServices: [{ id: "s1", unitId: "u1", name: "Luz", amount: 400, status: "due_soon" }],
    tickets: [{ id: "t1", unitId: "u1", title: "Fuga", status: "open" }],
  }),
}));

// Las fotos se consultan a properties-back; aquí sólo importa la tabla.
vi.mock("../media/MediaGallery", () => ({ default: () => null, useEntityMedia: () => ({ images: [] }) }));

const community = { id: "c1", name: "Torre Jacarandas", propertyId: "p1" };

describe("UnitMonitorPanel", () => {
  it("shows only the community's units with occupants and pending balance from real data", () => {
    render(<UnitMonitorPanel community={community} unitId="u1" onSelectUnit={() => {}} onOpenCharges={() => {}} onOpenRelations={() => {}} />);
    expect(screen.getByRole("button", { name: /J-201/, pressed: true })).toHaveTextContent("Mariana Torres");
    expect(screen.getByRole("button", { name: /J-202/ })).toBeInTheDocument();
    expect(screen.queryByText("Z-1")).not.toBeInTheDocument();
    expect(screen.getAllByText("$1,000").length).toBeGreaterThan(0);
    // Servicios e incidencias siguen en datos demo: fuera del MVP.
    expect(screen.queryByText(/Servicios pendientes|incidencias abiertas/)).not.toBeInTheDocument();
  });

  it("lists who is in the unit with their permissions and lets a writer add or remove people", () => {
    const onAddMember = vi.fn(); const onUnlink = vi.fn(); const onOpenCharges = vi.fn();
    render(<UnitMonitorPanel community={community} unitId="u1" canWrite onSelectUnit={() => {}} onAddMember={onAddMember} onUnlink={onUnlink} onOpenCharges={onOpenCharges} />);
    const members = screen.getByRole("region", { name: "Personas de J-201" });
    expect(members).toHaveTextContent("Mariana Torres");
    expect(members).toHaveTextContent("Residente");
    expect(members).toHaveTextContent("Paga");
    fireEvent.click(screen.getByRole("button", { name: /Agregar persona/ }));
    expect(onAddMember).toHaveBeenCalledWith("u1");
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Mariana Torres de J-201" }));
    expect(onUnlink).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }));
    fireEvent.click(screen.getByRole("button", { name: /Ver cuotas y adeudos/ }));
    expect(onOpenCharges).toHaveBeenCalled();
  });

  it("points an empty unit to its first person and hides edits for read-only users", () => {
    const onAddMember = vi.fn();
    const { rerender } = render(<UnitMonitorPanel community={community} unitId="u2" canWrite onSelectUnit={() => {}} onAddMember={onAddMember} onUnlink={() => {}} onOpenCharges={() => {}} />);
    expect(screen.getByText(/1 de 2 unidades aún no tienen a nadie asignado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Agregar la primera persona/ }));
    expect(onAddMember).toHaveBeenCalledWith("u2");
    rerender(<UnitMonitorPanel community={community} unitId="u1" canWrite={false} onSelectUnit={() => {}} onAddMember={onAddMember} onUnlink={() => {}} onOpenCharges={() => {}} />);
    expect(screen.queryByRole("button", { name: /Agregar persona|Quitar/ })).not.toBeInTheDocument();
  });

  it("finds a unit by the name of the person who lives there", () => {
    render(<UnitMonitorPanel community={community} unitId="" onSelectUnit={() => {}} onAddMember={() => {}} onUnlink={() => {}} onOpenCharges={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar unidad o persona"), { target: { value: "mariana" } });
    expect(screen.getByRole("button", { name: /J-201/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /J-202/ })).not.toBeInTheDocument();
  });
});
