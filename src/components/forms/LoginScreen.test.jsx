import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginScreen from "./LoginScreen";
import { parseApiError } from "@/errors/parseApiError";

const register = vi.fn();
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ register, resendVerification: vi.fn(), showToast: vi.fn() }),
}));
// El aviso real abre una página completa; aquí basta un control que acepte.
vi.mock("@/components/legal/PrivacyConsent", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: ({ value, onChange }) => (
      <label>
        <input type="checkbox" checked={actual.isConsentValid(value)}
          onChange={(e) => onChange({ termsAccepted: e.target.checked, financialConsentAccepted: e.target.checked, secondaryUseOptOut: false })} />
        Acepto el Aviso de Privacidad
      </label>
    ),
  };
});

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
  await user.click(screen.getByLabelText("Acepto el Aviso de Privacidad"));
  return user;
}

beforeEach(() => register.mockReset());

const fieldOf = (label) => screen.getByLabelText(label, { exact: true }).closest(".lf-field");
const createButton = () => screen.getByRole("button", { name: "Crear cuenta" });

describe("Registro: cada error se explica en su campo", () => {
  it("no muestra íconos ni emojis en el formulario", async () => {
    await fillRegistration();
    const form = screen.getByText("Crear cuenta nueva").closest("form");
    expect(form.querySelector(".lf-ico")).toBeNull();
    expect(form.textContent).not.toMatch(/[\p{Emoji_Presentation}\uFE0F]/u);
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveTextContent("Ver");
  });

  it("explica cómo elegir contraseña mientras no hay error", async () => {
    await fillRegistration("");
    expect(screen.getByText(/Usa una frase que te sea fácil de recordar/)).toBeVisible();
  });

  it("marca cada campo vacío o inválido debajo del campo, sin aviso general, y enfoca el primero", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole("button", { name: "Crear cuenta nueva" }));
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "juan@empresa" } });
    await user.click(createButton());
    expect(fieldOf("Nombre de la empresa / proyecto")).toHaveTextContent("Escribe el nombre de tu empresa o proyecto.");
    expect(fieldOf("Tu nombre completo")).toHaveTextContent("Escribe tu nombre completo.");
    expect(fieldOf("Correo electrónico")).toHaveTextContent("formato nombre@empresa.com");
    expect(fieldOf("Contraseña")).toHaveTextContent("Escribe una contraseña.");
    expect(document.querySelector(".ie-card")).toBeNull();
    await vi.waitFor(() => expect(screen.getByLabelText("Nombre de la empresa / proyecto")).toHaveFocus());
    expect(register).not.toHaveBeenCalled();
  });

  it("si falta aceptar el aviso de privacidad lo indica debajo del aviso", async () => {
    const user = await fillRegistration();
    await user.click(screen.getByLabelText("Acepto el Aviso de Privacidad"));
    await user.click(createButton());
    expect(screen.getByRole("alert")).toHaveTextContent("Lee y acepta el Aviso de Privacidad");
    expect(register).not.toHaveBeenCalled();
  });

  it("explica el rechazo por filtración debajo de la contraseña y permite corregir sin perder datos", async () => {
    const message = "Esta contraseña apareció en una filtración de datos conocida. Elige otra distinta.";
    register.mockResolvedValueOnce({ ok: false, error: parseApiError({ response: {
      status: 422, data: { error: { code: "OT-SYS-1000", message: "Algunos datos no son válidos.",
        details: [{ loc: ["body", "password"], msg: `Value error, ${message}` }] } },
    } }) });
    const user = await fillRegistration();
    await user.click(createButton());
    const alert = await screen.findByRole("alert");
    expect(fieldOf("Contraseña")).toContainElement(alert);
    expect(alert).toHaveTextContent("filtraciones de datos públicas");
    expect(alert).toHaveTextContent("frase de tres o cuatro palabras");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(document.querySelector(".ie-card")).toBeNull();
    expect(screen.queryByText("Algunos datos no son válidos.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("qa@example.com");
    register.mockResolvedValueOnce({ ok: true, pendingVerification: true, email: "qa@example.com" });
    for (const label of ["Contraseña", "Confirmar contraseña"]) {
      fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value: "otra frase larga distinta" } });
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(createButton());
    expect(await screen.findByText("Confirma tu correo")).toBeVisible();
  });

  it("si el correo ya existe lo dice en el campo y ofrece iniciar sesión", async () => {
    register.mockResolvedValueOnce({ ok: false, error: parseApiError({ response: {
      status: 409, data: { error: { code: "OT-USER-3010", message: "Ya existe un usuario con ese correo." } },
    } }) });
    const user = await fillRegistration();
    await user.click(createButton());
    expect(await screen.findByText("Ya existe una cuenta con este correo.")).toBeVisible();
    expect(fieldOf("Correo electrónico")).toHaveTextContent("Ya existe una cuenta con este correo.");
    await user.click(screen.getByRole("button", { name: "Inicia sesión" }));
    expect(screen.getByText("Bienvenido")).toBeVisible();
  });

  it("acepta contraseñas cortas sin exigir un largo mínimo", async () => {
    register.mockResolvedValue({ ok: true, pendingVerification: true });
    const user = await fillRegistration("corta");
    await user.click(createButton());
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ password: "corta" }));
    expect(await screen.findByText("Confirma tu correo")).toBeVisible();
  });

  it("marca la confirmación cuando no coincide", async () => {
    const user = await fillRegistration();
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "otra distinta" } });
    await user.click(createButton());
    expect(fieldOf("Confirmar contraseña")).toHaveTextContent("No coincide con la contraseña de arriba.");
    expect(register).not.toHaveBeenCalled();
  });

  it("si el backend rechaza campos que el cliente no ve, dice que el problema es nuestro", async () => {
    register.mockResolvedValueOnce({ ok: false, error: parseApiError({ response: {
      status: 422, data: { error: { code: "OT-SYS-1000", message: "Algunos datos no son válidos.", request_id: "ref_extra",
        details: [{ loc: ["body", "privacy_version"], msg: "Extra inputs are not permitted" }] } },
    } }) });
    const user = await fillRegistration();
    await user.click(createButton());
    expect(await screen.findByText("No pudimos crear tu cuenta por un problema de nuestro lado.")).toBeVisible();
    expect(screen.queryByText(/Revisa los campos marcados/)).not.toBeInTheDocument();
    expect(screen.getByText(/ref_extra/)).toBeVisible();
  });

  it("conserva el error general y la referencia para fallos ajenos a validación", async () => {
    register.mockResolvedValue({ ok: false, error: parseApiError({ response: {
      status: 500, data: { error: { code: "OT-SYS-9000", message: "No pudimos crear la cuenta.", request_id: "ref_test" } },
    } }) });
    const user = await fillRegistration();
    await user.click(createButton());
    expect(await screen.findByText(/ref_test/)).toBeVisible();
  });
});

describe("Enlace desde el sitio público", () => {
  it("con ?registro abre directo el alta de cuenta", () => {
    window.history.replaceState(null, "", "/?registro=1");
    render(<LoginScreen />);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });

  it("sin el parámetro abre el inicio de sesión", () => {
    render(<LoginScreen />);
    expect(screen.queryByRole("button", { name: "Crear cuenta" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear cuenta nueva" })).toBeInTheDocument();
  });
});

describe("LoginScreen · entrada por Properties", () => {
  it("shows the Properties brand and slogan only when the visit comes through /properties", () => {
    window.history.pushState({}, "", "/properties/comunidades");
    const { unmount } = render(<LoginScreen />);
    expect(screen.getByText(/Cada unidad\./)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "OwnTerra Properties" })).toBeInTheDocument();
    expect(screen.getByText("Inicia sesión")).toBeInTheDocument();
    unmount();
    window.history.pushState({}, "", "/");
    render(<LoginScreen />);
    expect(screen.queryByText(/Cada unidad\./)).not.toBeInTheDocument();
    expect(screen.getByText("Bienvenido")).toBeInTheDocument();
  });
});
