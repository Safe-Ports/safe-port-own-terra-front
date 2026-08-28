import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiAssistant from "./AiAssistant";

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ currentUser: { id: "user-test" } }),
}));

const property = {
  id: "lot-1",
  name: "Lote 18",
  development: "Tierra de Encinos",
  location: "Tapalpa, Jalisco",
  status: "Disponible",
  surface_m2: 320,
  dimensions: "12 × 26.67 m",
  price: 768000,
  price_per_m2: 2400,
  amenities: ["Casa club"],
};

function serviceWith(message) {
  return {
    isDemo: true,
    sendMessage: vi.fn().mockResolvedValue({ conversationId: "conv-1", message }),
    confirmAction: vi.fn().mockResolvedValue({
      status: "demo",
      message: "Confirmación registrada. No se modificó ningún lote.",
    }),
  };
}

describe("AiAssistant", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("abre el chat con bienvenida, sugerencias y aviso de datos simulados", async () => {
    render(<AiAssistant service={serviceWith({})} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir Ownterra AI" }));

    expect(screen.getByRole("heading", { name: "Ownterra AI" })).toBeInTheDocument();
    expect(screen.getByText(/datos simulados/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar lotes/i })).toBeInTheDocument();
  });

  it("envía el historial y representa lotes como tarjetas enriquecidas", async () => {
    const service = serviceWith({
      id: "answer-1",
      role: "assistant",
      content: "Encontré una opción.",
      properties: [property],
      createdAt: new Date().toISOString(),
    });
    render(<AiAssistant service={service} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir Ownterra AI" }));
    await userEvent.click(screen.getByRole("button", { name: /buscar lotes/i }));

    await waitFor(() => expect(screen.getByText("Lote 18")).toBeInTheDocument());
    expect(screen.getByText("Tierra de Encinos")).toBeInTheDocument();
    expect(screen.getByText("320 m²")).toBeInTheDocument();
    expect(service.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      message: "Muéstrame lotes disponibles en Tapalpa",
      messages: [
        { role: "user", content: "Muéstrame lotes disponibles en Tapalpa" },
      ],
    }));
  });

  it("pide confirmación humana antes de enviar una modificación", async () => {
    const action = {
      id: "action-1",
      title: "Cambiar estado del lote",
      description: "Marcar Lote 5 como vendido",
      entity_label: "Lote 5 · Tierra de Encinos",
      confirmation_token: "token",
    };
    const service = serviceWith({
      id: "answer-action",
      role: "assistant",
      content: "Necesito tu confirmación.",
      pendingAction: action,
      createdAt: new Date().toISOString(),
    });
    render(<AiAssistant service={service} />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir Ownterra AI" }));
    const textarea = screen.getByRole("textbox", { name: "Mensaje para Ownterra AI" });
    fireEvent.change(textarea, { target: { value: "Marca el lote 5 como vendido" } });
    await userEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar" })).toBeInTheDocument());

    expect(service.confirmAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByRole("dialog", { name: "Cambiar estado del lote" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Probar confirmación" }));
    await waitFor(() => expect(service.confirmAction).toHaveBeenCalledWith(action));
    expect(await screen.findByText(/no se modificó ningún lote/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revisar" })).not.toBeInTheDocument();
  });
});
