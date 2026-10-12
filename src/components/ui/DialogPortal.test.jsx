import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";
import WorkflowForm from "@/components/forms/WorkflowForm";

// JSDOM no calcula layout; emular controles visibles para probar el ciclo de foco.
function visibleControls() {
  return vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 44, height: 44 }]);
}

describe("Modal en portal", () => {
  it("sale del contenedor y conserva el tema de Properties", () => {
    const { container } = render(<div className="eco-root properties-focus"><div className="scroll-area"><Modal open title="Editar unidad" onClose={() => {}}><label>Nombre<input /></label></Modal></div></div>);
    const dialog = screen.getByRole("dialog", { name: "Editar unidad" });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.closest(".dialog-theme").parentElement).toBe(document.body);
    expect(dialog.closest(".dialog-theme")).toHaveClass("properties-focus");
    expect(dialog.closest(".scroll-area")).toBeNull();
  });

  it("retiene Tab dentro del diálogo y devuelve el foco al cerrar", () => {
    const visibility = visibleControls();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger); trigger.focus();
    const { unmount } = render(<Modal open title="Editar" onClose={onClose} footer={<button>Guardar</button>}><input aria-label="Nombre" /></Modal>);
    const close = screen.getByRole("button", { name: "Cerrar" });
    const save = screen.getByRole("button", { name: "Guardar" });
    save.focus(); fireEvent.keyDown(save, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    unmount(); expect(trigger).toHaveFocus(); trigger.remove(); visibility.mockRestore();
  });
  it("no permite cerrar ni cancelar un guardado en curso", () => {
    const close = vi.fn(); const cancel = vi.fn();
    const { rerender } = render(<Modal open title="Captura" onClose={close} footer={<button onClick={cancel}>Cancelar</button>}><WorkflowForm busy><input aria-label="Nombre" defaultValue="Ana" /></WorkflowForm></Modal>);
    fireEvent.click(screen.getByRole("button", {name:"Cerrar"}));
    fireEvent.keyDown(document, {key:"Escape"});
    fireEvent.click(screen.getByRole("button", {name:"Cancelar"}));
    expect(close).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
    rerender(<Modal open title="Captura" onClose={close}><WorkflowForm><input aria-label="Nombre" defaultValue="Ana" /></WorkflowForm></Modal>);
    fireEvent.click(screen.getByRole("button", {name:"Cerrar"})); expect(close).toHaveBeenCalledOnce();
  });

});
