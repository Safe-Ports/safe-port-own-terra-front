import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  it("renderiza el texto hijo", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("variant primary usa clase btn-p", () => {
    render(<Button variant="primary">OK</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-p");
  });

  it("variant secondary usa clase btn-s", () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-s");
  });

  it("variant danger usa clase btn-dan", () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-dan");
  });

  it("disabled deshabilita el botón", () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("llama al onClick al hacer clic", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("no llama onClick si está disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("acepta className adicional", () => {
    render(<Button className="mi-clase">OK</Button>);
    expect(screen.getByRole("button")).toHaveClass("mi-clase");
  });
});
