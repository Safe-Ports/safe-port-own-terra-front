import { describe, expect, it } from "vitest";
import { inviteMessage, mailtoUrl, whatsappNumber, whatsappUrl } from "./shareLinks";

describe("shareLinks", () => {
  it("normalizes Mexican phones for wa.me and leaves the number empty when it is not usable", () => {
    expect(whatsappNumber("(33) 1234-5678")).toBe("523312345678");
    expect(whatsappNumber("+52 1 33 1234 5678")).toBe("5213312345678");
    expect(whatsappNumber("1234")).toBe("");
    expect(whatsappUrl({ phone: "", text: "hola" })).toBe("https://wa.me/?text=hola");
  });

  it("builds the invitation text with the first name and an encoded mailto", () => {
    const text = inviteMessage({ name: "Laura Méndez", url: "https://x.mx/portal/invitacion?token=a&b" });
    expect(text).toMatch(/^Hola Laura,/);
    expect(text).toContain("https://x.mx/portal/invitacion?token=a&b");
    const mail = mailtoUrl({ email: "laura@correo.mx", subject: "Tu acceso", body: text });
    expect(mail.startsWith("mailto:laura%40correo.mx?subject=Tu%20acceso&body=Hola%20Laura")).toBe(true);
  });
});
