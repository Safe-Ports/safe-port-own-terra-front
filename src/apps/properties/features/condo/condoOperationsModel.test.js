import { describe, expect, it } from "vitest";
import { createAnnouncement, createCondoCharge, createReservation, createVote } from "./condoOperationsModel";

describe("condominium operations",()=>{
  it("creates a scoped charge",()=>expect(createCondoCharge({communityId:"c1",concept:" Cuota agosto ",amount:"1500"})).toMatchObject({communityId:"c1",concept:"Cuota agosto",amount:1500,status:"pending"}));
  it("creates a published announcement",()=>expect(createAnnouncement({communityId:"c1",title:"Aviso",body:"Mensaje"})).toMatchObject({status:"published",readCount:0}));
  it("prevents a duplicated amenity slot",()=>expect(()=>createReservation({communityId:"c1",amenityId:"a1",personName:"Ana",date:"2026-09-01",time:"10:00"},[{amenityId:"a1",date:"2026-09-01",time:"10:00",status:"confirmed"}])).toThrow("Ese horario ya está reservado."));
  it("requires a closing date for votes",()=>expect(()=>createVote({communityId:"c1",title:"Pintura"})).toThrow("Completa comunidad, asunto y fecha de cierre."));
});
