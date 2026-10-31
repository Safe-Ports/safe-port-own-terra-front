import { describe, expect, it } from "vitest";
import { TOUR_ECOSISTEMA } from "./definitions";

describe("TOUR_ECOSISTEMA", () => {
  it("termina sobre la galería de aplicaciones principales", () => {
    expect(TOUR_ECOSISTEMA.steps.at(-1).target).toBe('[data-tour="apps"]');
  });

  it("no usa emojis en sus textos", () => {
    const text = TOUR_ECOSISTEMA.steps.map((step) => `${step.title} ${step.content}`).join(" ");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
