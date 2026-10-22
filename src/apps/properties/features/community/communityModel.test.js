import { describe, expect, it } from "vitest";
import { communityAlerts, communityKindFromRegimen, DEFAULT_UNIT_MEMBER_FLAGS, EMPTY_UNIT_MEMBER, PERSON_UNIT_ROLE_LABEL, personUnitRoles, validateUnitMember, createCommunity, createCommunityPerson, createPersonUnitRelation, regimenFromCommunityKind, validateCommunity, validateCommunityPerson } from "./communityModel";

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

  it("requires a name and a valid email only when one is given", () => {
    expect(validateCommunityPerson({ name:"", email:"bad", roles:[] })).toEqual({
      name:"Ingresa el nombre de la persona.",
      email:"Ingresa un correo válido.",
    });
    // Dueño o residente ya no se piden en la persona: viven en el vínculo.
    expect(validateCommunityPerson({ name:"Ana", email:"", roles:[] })).toEqual({});
  });

  it("adds a person to a unit in one step, new or from the directory", () => {
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER })).toEqual({ name:"Ingresa el nombre de la persona." });
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER, name:"Ana", email:"ana@" })).toEqual({ email:"Ingresa un correo válido." });
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER, mode:"existing" })).toEqual({ personId:"Elige a la persona del directorio." });
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER, name:"Ana", role:"payment_responsible" }).role).toBe("Elige la relación con la unidad.");
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER, name:"Ana", startsAt:"2026-10-01", endsAt:"2026-09-01" }).endsAt).toBe("La fecha de fin no puede ser anterior al inicio.");
    expect(validateUnitMember({ ...EMPTY_UNIT_MEMBER, name:"Ana" })).toEqual({});
  });

  it("suggests permissions by role and only offers roles the backend accepts", () => {
    expect(Object.keys(PERSON_UNIT_ROLE_LABEL)).toEqual(["owner","resident","tenant"]);
    expect(DEFAULT_UNIT_MEMBER_FLAGS.owner).toEqual({ isPaymentResponsible:true, canVote:true, amenityAccess:true });
    expect(DEFAULT_UNIT_MEMBER_FLAGS.tenant.canVote).toBe(false);
  });

  it("derives directory groups from active unit links", () => {
    const relations=[{personId:"p1",role:"owner",status:"active"},{personId:"p1",role:"resident",status:"active"},{personId:"p1",role:"tenant",status:"archived"},{personId:"p2",role:"tenant",status:"active"}];
    expect(personUnitRoles("p1",relations)).toEqual(["owner","resident"]);
    expect(personUnitRoles("p3",relations)).toEqual([]);
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

  it("lists what a community needs attended, from persisted data only",()=>{
    const community={id:"c1",propertyId:"p1"};
    const base={community,units:[{id:"u1",propertyId:"p1",status:"available"}],relations:[{id:"r1",communityId:"c1",status:"active"}]};
    expect(communityAlerts(base)).toEqual([]);
    const alerts=communityAlerts({...base,
      charges:[{communityId:"c1",status:"overdue",amount:1500,paidAmount:500},{communityId:"c1",status:"paid",amount:900},{communityId:"c2",status:"overdue",amount:100}],
      packages:[{communityId:"c1",status:"pending"},{communityId:"c1",status:"delivered"}],
      reservations:[{communityId:"c1",status:"requested"},{communityId:"c1",status:"confirmed"}],
      votes:[{communityId:"c1",status:"open"},{communityId:"c1",status:"open"},{communityId:"c1",status:"closed"}],
    });
    expect(alerts.map(alert=>[alert.key,alert.count,alert.module])).toEqual([["charges",1,"charges"],["reservations",1,"amenities"],["packages",1,"packages"],["votes",2,"committee"]]);
    expect(alerts[0]).toMatchObject({tone:"danger",amount:1000,label:"1 cargo vencido"});
    expect(alerts[3].label).toBe("2 votaciones abiertas");
  });

  it("flags a community that is not ready to operate",()=>{
    const community={id:"c1",propertyId:"p1"};
    expect(communityAlerts({community})[0]).toMatchObject({key:"setup",label:"Faltan unidades por registrar"});
    expect(communityAlerts({community,units:[{propertyId:"p1",status:"available"}]})[0]).toMatchObject({key:"setup",label:"Faltan personas vinculadas a unidades"});
    expect(communityAlerts({community:null})).toEqual([]);
  });
});
