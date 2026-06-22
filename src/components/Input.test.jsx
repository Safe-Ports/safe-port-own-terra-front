import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";

describe("Input", () => {
  it("renderiza con el valor dado", () => {
    render(<Input value="Hola" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Hola")).toBeInTheDocument();
  });

  it("muestra el placeholder", () => {
    render(<Input value="" onChange={vi.fn()} placeholder="Escribe aquí" />);
    expect(screen.getByPlaceholderText("Escribe aquí")).toBeInTheDocument();
  });

  it("llama onChange con el valor nuevo al escribir", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} />);
    await user.type(screen.getByRole("textbox"), "A");
    expect(handleChange).toHaveBeenCalledWith("A");
  });

  it("usa type=password si se especifica", () => {
    render(<Input value="" onChange={vi.fn()} type="password" />);
    expect(document.querySelector("input")).toHaveAttribute("type", "password");
  });

  it("aplica className adicional", () => {
    render(<Input value="" onChange={vi.fn()} className="extra" />);
    expect(document.querySelector("input")).toHaveClass("extra");
  });

  it("no lanza error si onChange es undefined", async () => {
    const user = userEvent.setup();
    render(<Input value="" />);
    await expect(user.type(document.querySelector("input"), "A")).resolves.toBeUndefined();
  });
});
