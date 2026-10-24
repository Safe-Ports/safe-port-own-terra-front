import { describe, expect, it } from "vitest";
import { neighborLabel, postKind, reactionSentence, reactionSummary, shortName, timeAgo, validateComment, validatePost } from "./feedModel";

describe("feedModel", () => {
  it("shows neighbors as first name, initial and unit", () => {
    expect(shortName("Laura Méndez (prueba)")).toBe("Laura M.");
    expect(neighborLabel({ name: "Laura Méndez", unit_label: "Casa 202" })).toBe("Laura M. · Casa 202");
    expect(neighborLabel({ anonymous: true, unit_label: "Casa 202" })).toBe("Vecino de Casa 202");
    expect(neighborLabel({ is_admin: true })).toBe("Administración");
  });

  it("summarizes reactions like a social network", () => {
    expect(reactionSummary({ like: 3, love: 5, sad: 0, haha: 1, wow: 1 })).toEqual({ top: ["love", "like", "haha"], total: 10 });
    expect(reactionSentence(4, true)).toBe("Tú y 3 vecinos más");
    expect(reactionSentence(1, true)).toBe("Tú");
    expect(reactionSentence(2, false)).toBe("2 vecinos");
  });

  it("reads an urgent announcement as urgent until the backend sends a kind", () => {
    expect(postKind({ is_urgent: true })).toBe("urgent");
    expect(postKind({ kind: "event", is_urgent: false })).toBe("event");
    expect(postKind({})).toBe("announcement");
  });

  it("validates posts and comments", () => {
    expect(validatePost({ kind: "event", title: "Posada", body: "Ven" })).toEqual({ eventAt: "Indica cuándo es el evento." });
    expect(validateComment("   ")).toBe("Escribe un comentario.");
    expect(validateComment("x".repeat(501))).toMatch(/500/);
    expect(timeAgo("2026-10-14T11:30:00", new Date("2026-10-14T12:00:00"))).toBe("hace 30 min");
  });
});
