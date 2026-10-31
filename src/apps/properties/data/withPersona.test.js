import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/propertiesService", () => ({
  default: { personas: { create: vi.fn(), archive: vi.fn() } },
}));

import propertiesService from "@/services/propertiesService";
import { withPersona } from "./withPersona";

const draft = { name: " Laura Méndez ", email: " laura@ejemplo.mx ", phone: "" };

describe("withPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    propertiesService.personas.create.mockResolvedValue({ id: "p-1" });
    propertiesService.personas.archive.mockResolvedValue(null);
  });

  it("crea a la persona y la vincula", async () => {
    const link = vi.fn().mockResolvedValue({});
    await expect(withPersona(null, draft, link)).resolves.toBe("p-1");
    expect(propertiesService.personas.create).toHaveBeenCalledWith({
      nombre: "Laura Méndez", correo: "laura@ejemplo.mx", telefono: null, direccion: null,
    });
    expect(link).toHaveBeenCalledWith("p-1");
    expect(propertiesService.personas.archive).not.toHaveBeenCalled();
  });

  it("si el vínculo falla, archiva a la persona nueva y propaga el error", async () => {
    const error = new Error("La unidad ya tiene responsable de pago");
    const link = vi.fn().mockRejectedValue(error);
    await expect(withPersona(null, draft, link)).rejects.toBe(error);
    expect(propertiesService.personas.archive).toHaveBeenCalledWith("p-1");
  });

  it("el error original gana aunque archivar también falle", async () => {
    const error = new Error("vínculo rechazado");
    propertiesService.personas.archive.mockRejectedValue(new Error("red"));
    await expect(withPersona(null, draft, vi.fn().mockRejectedValue(error))).rejects.toBe(error);
  });

  it("con una persona existente no crea ni archiva a nadie", async () => {
    const link = vi.fn().mockRejectedValue(new Error("falla"));
    await expect(withPersona("p-9", draft, link)).rejects.toThrow("falla");
    expect(propertiesService.personas.create).not.toHaveBeenCalled();
    expect(propertiesService.personas.archive).not.toHaveBeenCalled();
  });
});
