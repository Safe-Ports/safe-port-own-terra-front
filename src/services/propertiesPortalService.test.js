import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
vi.mock("./api", () => ({ BASE_URL: "http://core.test/api/v1" }));
vi.mock("./propertiesApi", () => ({ PROPERTIES_BASE_URL: "http://properties.test/api/v1" }));
import service from "./propertiesPortalService";

const seed = () => localStorage.setItem("ownterra_portal_session", JSON.stringify({access_token:"old-portal",refresh_token:"old-refresh"}));
beforeEach(()=>{service.logout();localStorage.clear();});

describe("sesión portal Core independiente de staff",()=>{
 it("login se dirige a Core, guarda el par y no altera staff",async()=>{
  localStorage.setItem("lm_session",JSON.stringify({token:"staff-token"}));
  server.use(http.post("http://core.test/api/v1/portal/auth/login",async({request})=>{
   expect(request.headers.get("authorization")).toBeNull();expect(await request.json()).toEqual({email:"qa@example.com",password:"synthetic"});
   return HttpResponse.json({access_token:"portal",refresh_token:"refresh"});
  }));
  await service.login({email:"qa@example.com",password:"synthetic"});expect(service.hasSession()).toBe(true);
  expect(JSON.parse(localStorage.getItem("ownterra_portal_session"))).toEqual({access_token:"portal",refresh_token:"refresh"});
  service.logout();expect(JSON.parse(localStorage.getItem("lm_session"))).toEqual({token:"staff-token"});
 });
 it("consulta identidad en Core y unidades en Properties usando solo JWT portal",async()=>{
  seed();localStorage.setItem("lm_session",JSON.stringify({token:"staff-token"}));
  server.use(http.get("http://core.test/api/v1/portal/auth/me",({request})=>{expect(request.headers.get("authorization")).toBe("Bearer old-portal");return HttpResponse.json({email:"qa@example.com"});}),
   http.get("http://properties.test/api/v1/portal/units",({request})=>{expect(request.headers.get("authorization")).toBe("Bearer old-portal");return HttpResponse.json([]);}));
  await Promise.all([service.identity(),service.units()]);
 });
 it("401 concurrentes renuevan una sola vez y reintentan sus consultas",async()=>{
  seed();let refreshes=0;
  server.use(http.post("http://core.test/api/v1/portal/auth/refresh",async({request})=>{refreshes++;expect(await request.json()).toEqual({refresh_token:"old-refresh"});return HttpResponse.json({access_token:"new-portal",refresh_token:"new-refresh"});}),
   http.get("http://properties.test/api/v1/portal/:resource",({request,params})=>request.headers.get("authorization")==="Bearer old-portal"?new HttpResponse(null,{status:401}):HttpResponse.json({resource:params.resource})));
  expect(await Promise.all([service.units(),service.statement()])).toEqual([{resource:"units"},{resource:"statement"}]);expect(refreshes).toBe(1);
 });
 it("refresh rechazado cierra portal sin cerrar staff",async()=>{
  seed();localStorage.setItem("lm_session",'"staff"');server.use(http.get("http://properties.test/api/v1/portal/units",()=>new HttpResponse(null,{status:401})),http.post("http://core.test/api/v1/portal/auth/refresh",()=>new HttpResponse(null,{status:401})));
  await expect(service.units()).rejects.toBeDefined();expect(service.hasSession()).toBe(false);expect(localStorage.getItem("lm_session")).toBe('"staff"');
 });
 it("fallo temporal al renovar conserva sesión y permite reintentar",async()=>{
  seed();server.use(http.get("http://properties.test/api/v1/portal/units",()=>new HttpResponse(null,{status:401})),http.post("http://core.test/api/v1/portal/auth/refresh",()=>new HttpResponse(null,{status:503})));
  await expect(service.units()).rejects.toMatchObject({response:{status:503}});expect(service.hasSession()).toBe(true);
 });
 it("no revive una sesión cerrada durante el refresh",async()=>{
  seed();let finish;let started;const ready=new Promise(resolve=>{started=resolve});const gate=new Promise(resolve=>{finish=resolve});
  server.use(http.get("http://properties.test/api/v1/portal/units",()=>new HttpResponse(null,{status:401})),http.post("http://core.test/api/v1/portal/auth/refresh",async()=>{started();await gate;return HttpResponse.json({access_token:"new",refresh_token:"new-refresh"});}));
  const request=service.units().catch(error=>error);await ready;service.logout();finish();await request;expect(service.hasSession()).toBe(false);
 });
 it("login fallido no conserva la identidad anterior",async()=>{
  seed();server.use(http.post("http://core.test/api/v1/portal/auth/login",()=>new HttpResponse(null,{status:401})));
  await expect(service.login({email:"otro@example.com",password:"synthetic"})).rejects.toBeDefined();expect(service.hasSession()).toBe(false);
 });
 it("la activación conserva el body real de Core",async()=>{
  server.use(http.post("http://core.test/api/v1/portal/auth/accept-invite",async({request})=>{expect(await request.json()).toEqual({token:"synthetic-invite",new_password:"synthetic-password"});return new HttpResponse(null,{status:204});}));
  await service.acceptInvite({token:"synthetic-invite",new_password:"synthetic-password"});
 });
});
