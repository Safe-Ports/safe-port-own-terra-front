import { describe, expect, it, vi } from "vitest";
import { isSupportedMapImage, mapFileFromUrl } from "./mapImage";

describe("map images", () => {
  it("accepts iPad HEIC images by MIME type or extension", () => {
    expect(isSupportedMapImage(new File(["x"], "plano", { type: "image/heic" }))).toBe(true);
    expect(isSupportedMapImage(new File(["x"], "plano.HEIF", { type: "" }))).toBe(true);
  });

  it("rejects files that are not supported images", () => {
    expect(isSupportedMapImage(new File(["x"], "plano.pdf", { type: "application/pdf" }))).toBe(false);
    expect(isSupportedMapImage(new File(["x"], "lotes.xlsx", { type: "image/unknown" }))).toBe(false);
  });

  it("creates a backend-compatible filename and MIME type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["image"], { type: "image/jpeg" })),
    }));

    const file = await mapFileFromUrl("data:image/jpeg;base64,aW1hZ2U=");

    expect(file.name).toBe("map.jpg");
    expect(file.type).toBe("image/jpeg");
    vi.unstubAllGlobals();
  });

});
