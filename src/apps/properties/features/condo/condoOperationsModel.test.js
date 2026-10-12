import { describe, expect, it } from "vitest";
import { createAnnouncement, createCondoCharge, createReservation, createUtilityBill, createUtilityService, seedUtilityBill, createVote } from "./condoOperationsModel";

describe("condominium operations",()=>{
  it("creates a scoped charge",()=>expect(createCondoCharge({communityId:"c1",concept:" Cuota agosto ",amount:"1500"})).toMatchObject({communityId:"c1",concept:"Cuota agosto",amount:1500,status:"pending"}));
  it("creates a published announcement",()=>expect(createAnnouncement({communityId:"c1",title:"Aviso",body:"Mensaje"})).toMatchObject({status:"published",readCount:0}));
  it("prevents a duplicated amenity slot",()=>expect(()=>createReservation({communityId:"c1",amenityId:"a1",personName:"Ana",date:"2026-09-01",time:"10:00"},[{amenityId:"a1",date:"2026-09-01",time:"10:00",status:"confirmed"}])).toThrow("Ese horario ya está reservado."));
  it("requires a closing date for votes",()=>expect(()=>createVote({communityId:"c1",title:"Pintura"})).toThrow("Completa comunidad, asunto y fecha de cierre."));
  it("registers a utility without turning it into a platform payment",()=>expect(createUtilityService({communityId:"c1",type:"water",name:"Agua unidad",payerRole:"tenant",amount:700})).toMatchObject({payerRole:"tenant",status:"pending_evidence",amount:700}));
  it("records a utility bill and carries its period onto the service",()=>{
    const service={id:"u1",status:"verified",amount:500,evidenceName:"viejo.pdf"};
    const result=createUtilityBill(service,{periodStart:"2026-08-01",periodEnd:"2026-08-31",amount:"640",dueDate:"2026-09-05"});
    expect(result.bill).toMatchObject({serviceId:"u1",amount:640,status:"pending_evidence",reportedAmount:0});
    expect(result.service).toMatchObject({periodStart:"2026-08-01",periodEnd:"2026-08-31",amount:640,status:"pending_evidence"});
  });
  it("rejects a bill without a captured amount",()=>expect(()=>createUtilityBill({id:"u1"},{periodStart:"2026-08-01",periodEnd:"2026-08-31",amount:"0"})).toThrow("Captura el importe del recibo."));
  it("keeps a backdated bill out of the current period",()=>{
    const service={id:"u1",periodStart:"2026-08-01",periodEnd:"2026-08-31",amount:6930,status:"verified"};
    const result=createUtilityBill(service,{periodStart:"2026-07-01",periodEnd:"2026-07-31",amount:"5240"});
    expect(result.isCurrent).toBe(false);
    expect(result.service).toMatchObject({periodEnd:"2026-08-31",amount:6930,status:"verified"});
    expect(result.bill).toMatchObject({periodEnd:"2026-07-31",amount:5240});
  });
  it("seeds the history with the bill a new service was created with",()=>{
    const service=createUtilityService({communityId:"c1",type:"water",name:"Agua",payerRole:"tenant",amount:700,periodStart:"2026-08-01",periodEnd:"2026-08-31"});
    expect(seedUtilityBill(service)).toMatchObject({serviceId:service.id,amount:700,periodEnd:"2026-08-31"});
  });
  it("seeds nothing when the service carries no amount",()=>expect(seedUtilityBill(createUtilityService({communityId:"c1",type:"water",name:"Agua",payerRole:"tenant"}))).toBeNull());
  it("rejects an inverted billing period",()=>expect(()=>createUtilityBill({id:"u1"},{periodStart:"2026-08-31",periodEnd:"2026-08-01",amount:"640"})).toThrow("El periodo termina antes de empezar."));
});
