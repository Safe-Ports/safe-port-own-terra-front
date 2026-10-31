import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playNotification } = vi.hoisted(() => ({ playNotification: vi.fn() }));
vi.mock("@/utils/sounds", () => ({ playNotification }));

import useChimeOnIncrease from "./useChimeOnIncrease";

describe("useChimeOnIncrease", () => {
  beforeEach(() => playNotification.mockClear());

  it("no suena con la primera lectura, sí cuando el número sube", () => {
    const { rerender } = renderHook(({ count }) => useChimeOnIncrease(count), { initialProps: { count: 5 } });
    expect(playNotification).not.toHaveBeenCalled();
    rerender({ count: 6 });
    expect(playNotification).toHaveBeenCalledTimes(1);
  });

  it("no suena cuando baja ni mientras no hay dato", () => {
    const { rerender } = renderHook(({ count }) => useChimeOnIncrease(count), { initialProps: { count: undefined } });
    rerender({ count: 3 });
    rerender({ count: 1 });
    rerender({ count: undefined });
    expect(playNotification).not.toHaveBeenCalled();
  });
});
