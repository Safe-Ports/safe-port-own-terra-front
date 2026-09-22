import { describe, expect, it } from "vitest";
import { buildUnitMonitorRows } from "./unitMonitoringModel";

describe("unit monitoring model", () => {
  it("concentra ocupantes, pendientes y movimientos por unidad", () => {
    const rows = buildUnitMonitorRows({
      units:[{ id:"u1", status:"rented" }],
      people:[{ id:"p1", name:"María" }],
      relations:[{ id:"r1", unitId:"u1", personId:"p1", role:"tenant", status:"active" }],
      charges:[{ id:"c1", unitId:"u1", amount:1200, status:"overdue", dueDate:"2026-09-01" }],
      utilityServices:[{ id:"s1", unitId:"u1", name:"Luz", amount:500, status:"due_soon", updatedAt:"2026-09-02" }],
      tickets:[{ id:"t1", unitId:"u1", title:"Fuga", status:"open", updatedAt:"2026-09-03" }],
    });
    expect(rows[0]).toMatchObject({ openChargeAmount:1200, openServiceAmount:500, openTickets:1 });
    expect(rows[0].occupants[0].name).toBe("María");
    expect(rows[0].movements.map((item) => item.type)).toEqual(["Incidencia", "Servicio", "Cargo"]);
  });
});
