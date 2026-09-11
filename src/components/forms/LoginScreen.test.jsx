import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginScreen from "./LoginScreen";
import { parseApiError } from "@/errors/parseApiError";

const register = vi.fn();
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ register, resendVerification: vi.fn(), showToast: vi.fn() }),
}));

async function fillRegistration(password = "una frase nueva de prueba") {
  const user = userEvent.setup();
  render(<LoginScreen />);
  await user.click(screen.getByRole("button", { name: "Crear cuenta nueva" }));
  for (const [label, value] of [
    ["Nombre de la empresa / proyecto", "Empresa Prueba"],
    ["Tu nombre completo", "Persona Prueba"],
    ["Correo electrónico", "qa@example.com"],
    ["Contraseña", password],
    ["Confirmar contraseña", password],
  ]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  return user;
}

beforeEach(() => register.mockReset());

describe("Registro: requisitos y errores de contraseña", () => {
  it("muestra ayuda y bloquea contraseñas de menos de 12 caracteres", async () => {
    const user = await fillRegistration("once-letras");
    expect(screen.getByText("Mínimo 12 caracteres.")).toBeVisible();
    expect(screen.queryByText(/Puedes usar una frase larga/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tu contraseña tiene 11 caracteres. Necesitas al menos 12.");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(register).not.toHaveBeenCalled();
  });

  it("muestra el rechazo por filtración en el recuadro y permite corregir sin perder datos", async () => {
    const message = "Esta contraseña apareció en una filtración de datos conocida. Elige otra distinta.";
    register.mockResolvedValueOnce({ ok: false, error: parseApiError({ response: {
      status: 422, data: { error: { code: "OT-SYS-1000", message: "Algunos datos no son válidos.",
        details: [{ loc: ["body", "password"], msg: `Value error, ${message}` }] } },
    } }) });
    const user = await fillRegistration();
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText(/Value error/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert").querySelector(".ie-card")).toBeInTheDocument();
    expect(screen.queryByText(/contacta a soporte/)).not.toBeInTheDocument();
    expect(screen.queryByText("Algunos datos no son válidos.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("qa@example.com");
    register.mockResolvedValueOnce({ ok: true, pendingVerification: true, email: "qa@example.com" });
    for (const label of ["Contraseña", "Confirmar contraseña"]) {
      fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value: "otra frase larga distinta" } });
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(await screen.findByText("Confirma tu correo")).toBeVisible();
  });

  it("acepta 12 caracteres sin exigir símbolos o mayúsculas", async () => {
    register.mockResolvedValue({ ok: true, pendingVerification: true });
    const user = await fillRegistration("abcdefghijkl");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ password: "abcdefghijkl" }));
    expect(await screen.findByText("Confirma tu correo")).toBeVisible();
  });

  it("marca la confirmación cuando no coincide", async () => {
    const user = await fillRegistration();
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "otra distinta" } });
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(register).not.toHaveBeenCalled();
  });

  it("conserva el error general y la referencia para fallos ajenos a validación", async () => {
    register.mockResolvedValue({ ok: false, error: parseApiError({ response: {
      status: 500, data: { error: { code: "OT-SYS-9000", message: "No pudimos crear la cuenta.", request_id: "ref_test" } },
    } }) });
    const user = await fillRegistration();
    await user.click(screen.getByRole("button", { name: /🚀 Crear cuenta/ }));
    expect(await screen.findByText(/ref_test/)).toBeVisible();
  });
});
