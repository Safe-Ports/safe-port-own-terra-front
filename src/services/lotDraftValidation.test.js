import {describe,it,expect} from "vitest";
import {validateLotDraft} from "./lotDraftValidation";
describe("captura de lotes",()=>{
 it("detecta códigos duplicados en otra sección antes de escribir",()=>{expect(validateLotDraft({id:"new",code:" a-01 "},[{lots:[{id:"old",code:"A-01"}]}]).code).toMatch(/Ya existe/)});
 it("permite datos opcionales vacíos y decimales, pero señala importes negativos",()=>{expect(validateLotDraft({id:"old",code:"A-01",area:"",price:"10.25"})).toEqual({});expect(validateLotDraft({code:"A-02",price:-1}).price).toBeTruthy()});
 it("exige código y respeta el límite del contrato API",()=>{expect(validateLotDraft({code:"  "}).code).toBeTruthy();expect(validateLotDraft({code:"A".repeat(51)}).code).toBeTruthy()});
});
