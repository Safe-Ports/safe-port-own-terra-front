import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceRegistration } from "./ServiceAccessPages";

const api = vi.hoisted(() => ({ info: vi.fn(), apply: vi.fn() }));
vi.mock("@/services/propertiesService", () => ({ default: { serviceNetwork: { public: api } } }));
const setup = () => render(<MemoryRouter><ServiceRegistration /></MemoryRouter>);
const fill = () => {
  fireEvent.change(screen.getByPlaceholderText("Tu nombre y apellidos"), { target: { value: "  Juan Pérez  " } });
  fireEvent.change(screen.getByPlaceholderText("contacto@correo.mx"), { target: { value: "juan@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("+52 55 0000 0000"), { target: { value: " +525500000000 " } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Confirmo/ }));
};
describe("Inscripción pública de proveedores", () => {
  beforeEach(() => {
    vi.clearAllMocks(); window.history.replaceState({}, "", "/servicio/registro?token=public-test");
    api.info.mockResolvedValue({ organization_name: "Jacarandas", specialties: [{ id: "plumbing", label: "Plomería" }] });
    api.apply.mockResolvedValue({ folio: "SOL-0042", status: "pending" });
  });
  it("valida los campos y el consentimiento antes de enviar", async () => {
    setup(); fireEvent.click(await screen.findByRole("button", { name: "Enviar solicitud para revisión" }));
    expect(screen.getByText("Escribe tu nombre o razón social.")).toBeVisible();
    expect(screen.getByText("Escribe un correo válido.")).toBeVisible();
    expect(screen.getByText("Acepta el consentimiento para enviar la solicitud.")).toBeVisible();
    expect(api.apply).not.toHaveBeenCalled();
  });
  it("envía el body público y muestra el folio sin acceso automático", async () => {
    setup(); await screen.findByRole("button", { name: "Enviar solicitud para revisión" }); fill();
    fireEvent.click(screen.getByRole("checkbox", { name: "Plomería" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud para revisión" }));
    await waitFor(() => expect(api.apply).toHaveBeenCalledWith("public-test", {
      kind: "independent", name: "Juan Pérez", representative_name: null, email: "juan@example.com", phone: "+525500000000", specialty_ids: ["plumbing"], coverage: null, experience: null, consent_version: "2026-10-08", consent_accepted: true,
    }));
    expect(await screen.findByText("Solicitud SOL-0042")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("no habilita acceso");
  });
  it("conserva la captura ante un fallo del backend y permite reenviar", async () => {
    api.apply.mockRejectedValueOnce({ response: { status: 503, data: { error: { code: "OT-SYS-9001", message: "Registro no disponible" } } } });
    setup(); await screen.findByRole("button", { name: "Enviar solicitud para revisión" }); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud para revisión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Registro no disponible");
    expect(screen.getByPlaceholderText("Tu nombre y apellidos")).toHaveValue("  Juan Pérez  ");
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud para revisión" }));
    expect(await screen.findByText("Solicitud SOL-0042")).toBeVisible();
  });
  it("anuncia el fallo del enlace y permite reintentar", async () => {
    api.info.mockRejectedValueOnce({ response: { status: 503, data: { error: { code: "OT-SYS-9001", message: "Formulario no disponible" } } } });
    setup(); expect(await screen.findByRole("alert")).toHaveTextContent("Formulario no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Enviar solicitud para revisión" })).toBeVisible();
  });
});
