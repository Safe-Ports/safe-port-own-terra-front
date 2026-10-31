import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ toast: { kind: "warning", message: "No se pudo agregar" } }),
}));

import Toast from "./Toast";

describe("Toast", () => {
  it("se monta en document.body para no quedar detrás de un modal", () => {
    const { container } = render(<div className="layout"><Toast /></div>);
    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("No se pudo agregar");
    expect(toast.parentElement).toBe(document.body);
    expect(container.querySelector(".app-toast")).toBeNull();
  });
});
