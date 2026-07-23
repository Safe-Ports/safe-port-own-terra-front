import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useEscapeKey from "./useEscapeKey";

describe("useEscapeKey", () => {
  it("closes the active layer with Escape", () => {
    const close = vi.fn();
    renderHook(() => useEscapeKey(close));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("only closes the topmost layer", () => {
    const closeBehind = vi.fn();
    const closeTop = vi.fn();
    renderHook(() => useEscapeKey(closeBehind));
    const top = renderHook(() => useEscapeKey(closeTop));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBehind).not.toHaveBeenCalled();

    top.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(closeBehind).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const close = vi.fn();
    renderHook(() => useEscapeKey(close, false));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(close).not.toHaveBeenCalled();
  });
});
