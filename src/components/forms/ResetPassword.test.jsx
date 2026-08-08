import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const resetPassword = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ resetPassword }),
}));

function renderView(search = "") {
  window.history.replaceState({}, "", `/reset-password${search}`);
  return render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  );
}

describe("ResetPassword", () => {
  beforeEach(() => {
    resetPassword.mockReset();
  });

  it("rechaza enlaces que no incluyen token", () => {
    renderView();
    expect(screen.getByText("Enlace inválido")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });

  it("valida que ambas contraseñas coincidan", () => {
    renderView("?token=reset-token");
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("actualiza la contraseña usando el token del correo", async () => {
    resetPassword.mockResolvedValue({ ok: true });
    renderView("?token=reset-token");
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "Password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("reset-token", "Password123"));
    expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
