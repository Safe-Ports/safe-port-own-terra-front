import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoreTopbarActions from "./CoreTopbarActions";

const logout = vi.fn();
vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ currentUser: { name: "Ana" }, logout, notificationCount: 0 }) }));
vi.mock("@/components/layout/AppLauncher", () => ({ default: () => <button>Aplicaciones</button> }));

const setup = () => render(<MemoryRouter initialEntries={["/properties"]}><CoreTopbarActions /></MemoryRouter>);
describe("Confirmación de cierre de sesión", () => {
  beforeEach(() => logout.mockClear());
  it("abre el diálogo sin cerrar la sesión y permite cancelar", () => {
    setup();
    const trigger = screen.getByRole("button", { name: "Cerrar sesión" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "¿Cerrar sesión?" });
    expect(dialog.closest(".dialog-theme").parentElement).toBe(document.body);
    expect(logout).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Seguir aquí" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("cierra sólo después de confirmar", () => {
    setup(); fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
