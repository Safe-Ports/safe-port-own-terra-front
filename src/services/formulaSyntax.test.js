import {describe,it,expect} from "vitest";
import {validateFormula} from "./formulaEngine";
describe("estructura del plan",()=>{
 it("rechaza expresiones incompletas antes de guardar",()=>{for(const formula of ["CAPITAL +", "(CAPITAL / MESES", "CAPITAL MESES"]){expect(()=>validateFormula(formula)).toThrow()}});
 it("valida sin inventar valores ni confundir división por cero con sintaxis",()=>{expect(validateFormula("(A-B)/(C-D)")).toBe(true);expect(validateFormula("max(CAPITAL,0)/MESES")).toBe(true)});
});
