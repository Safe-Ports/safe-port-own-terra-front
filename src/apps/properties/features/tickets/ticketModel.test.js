import { describe, expect, it } from "vitest";
import { isClosedTicket, mapTicket } from "./ticketModel";

const row = { id: "t1", community_id: "c1", property_id: "u1", folio: "OT-000001", title: "Fuga", description: null, ticket_type: "maintenance", priority: "high", status: "open", reported_by_user_id: null, reported_by_persona_id: "p1", sla_due_at: null, resolved_at: null, version: 2, created_at: "2026-10-14T10:00:00Z" };

describe("mapTicket", () => {
  it("liga unidad, comunidad y quien reportó", () => {
    const ticket = mapTicket(row, { community: { id: "c1", propertyId: "root" }, unitById: { u1: { id: "u1", propertyId: "root" } }, personById: { p1: { name: "Laura Méndez" } } });
    expect(ticket).toMatchObject({ unitId: "u1", propertyId: "root", type: "maintenance", reportedBy: "Laura Méndez", fromResident: true, version: 2, assignee: "" });
  });

  it("sin unidad es área común de la comunidad y muestra al proveedor de la orden conocida", () => {
    const ticket = mapTicket({ ...row, property_id: null, reported_by_persona_id: null }, { community: { id: "c1", propertyId: "root" }, workOrder: { id: "w1", status: "dispatched", assigneeName: "Plomería Díaz" } });
    expect(ticket).toMatchObject({ unitId: "", propertyId: "root", reportedBy: "Administración", assignee: "Plomería Díaz" });
  });

  it("resuelto y cancelado cuentan como cerrados", () => {
    expect(isClosedTicket({ status: "resolved" })).toBe(true);
    expect(isClosedTicket({ status: "cancelled" })).toBe(true);
    expect(isClosedTicket({ status: "in_progress" })).toBe(false);
  });
});
