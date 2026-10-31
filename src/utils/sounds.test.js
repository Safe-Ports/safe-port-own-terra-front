import { afterEach, describe, expect, it, vi } from "vitest";

describe("sonidos en pruebas automáticas", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it("con el navegador manejado por pruebas, ni la música ni los avisos crean audio", async () => {
    const AudioContext = vi.fn();
    vi.stubGlobal("AudioContext", AudioContext);
    window.AudioContext = AudioContext;
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, get: () => true });
    const { tourMusic, playNotification } = await import("./sounds");

    tourMusic.start();
    playNotification();

    expect(AudioContext).not.toHaveBeenCalled();
    expect(tourMusic.playing).toBe(false);
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, get: () => false });
    delete window.AudioContext;
  });
});
