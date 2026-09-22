import { describe, expect, it } from "vitest";
import { communityKindFromRegimen, createCommunity, createCommunityPerson, createPersonUnitRelation, regimenFromCommunityKind, validateCommunity, validateCommunityPerson } from "./communityModel";

describe("Properties community model", () => {
  it("requires a property and name to configure a community",()=>{
    expect(validateCommunity({propertyId:"",name:""})).toEqual({propertyId:"Selecciona el inmueble que representa la comunidad.",name:"Ingresa el nombre de la comunidad."});
    expect(createCommunity({propertyId:"prop-1",name:" Privada Norte ",kind:"private_community",cuotaBase:"1500",billingDay:"5",reglamentoUrl:" https://reglamento.mx "})).toMatchObject({name:"Privada Norte",kind:"private_community",regime:"fraccionamiento",cuotaBase:1500,billingDay:5,reglamentoUrl:"https://reglamento.mx",status:"active"});
  });

  it("only accepts a billing day the backend can store",()=>{
    expect(validateCommunity({propertyId:"prop-1",name:"Norte",billingDay:"31"}).billingDay).toBe("El día de cobro debe estar entre 1 y 28.");
    expect(validateCommunity({propertyId:"prop-1",name:"Norte",cuotaBase:"-1"}).cuotaBase).toBe("La cuota base no puede ser negativa.");
    expect(validateCommunity({propertyId:"prop-1",name:"Norte",billingDay:"28",cuotaBase:"0"})).toEqual({});
  });

  it("keeps the community type and the backend regimen in sync both ways",()=>{
    for(const kind of ["condominium","horizontal_condominium","private_community","mixed_community"]){
      expect(communityKindFromRegimen(regimenFromCommunityKind(kind))).toBe(kind);
    }
    // `condominio` es un valor heredado del backend que la UI muestra como vertical.
    expect(communityKindFromRegimen("condominio")).toBe("condominium");
  });

  it("requires identity, contact and a community role", () => {
    expect(validateCommunityPerson({ name:"", email:"bad", roles:[] })).toEqual({
      name:"Ingresa el nombre de la persona.",
      email:"Ingresa un correo válido.",
      roles:"Selecciona al menos un rol.",
    });
  });

  it("normalizes a person that can have more than one role", () => {
    expect(createCommunityPerson({ name:"  Ana López ", email:" ANA@MAIL.MX ", phone:" 555 ", roles:["owner","resident","owner"], notes:" Vive ahí " })).toMatchObject({
      name:"Ana López", email:"ana@mail.mx", phone:"555", roles:["owner","resident"], status:"active",
    });
  });

  it("prevents the same active relation from being assigned twice", () => {
    const draft={communityId:"community-1",personId:"person-1",unitId:"unit-1",role:"resident"};
    const relation=createPersonUnitRelation(draft);
    expect(()=>createPersonUnitRelation(draft,[relation])).toThrow("Esta relación ya existe para la unidad.");
  });

  it("keeps payment, voting and access responsibilities independent", () => {
    const relation=createPersonUnitRelation({
      communityId:"community-1",personId:"person-1",unitId:"unit-1",role:"owner",
      isPrimary:true,isPaymentResponsible:false,canVote:true,amenityAccess:false,accessPermission:true,
      startsAt:"2026-01-01",endsAt:"2026-12-31",
    });
    expect(relation).toMatchObject({
      isPrimary:true,isPaymentResponsible:false,canVote:true,amenityAccess:false,accessPermission:true,
    });
  });

  it("rejects a relation whose end date is before its start date", () => {
    expect(()=>createPersonUnitRelation({communityId:"community-1",personId:"person-1",unitId:"unit-1",role:"tenant",startsAt:"2026-08-10",endsAt:"2026-08-01"})).toThrow("La fecha de terminación no puede ser anterior al inicio.");
  });
});
