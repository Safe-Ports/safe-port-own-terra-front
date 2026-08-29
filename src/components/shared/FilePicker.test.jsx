import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import FilePicker from "./FilePicker";

const archivo = (nombre) => new File(["x"], nombre, { type: "application/pdf" });

/** El input real está oculto; se llega a él por el contenedor. */
function inputDe(container) {
  return container.querySelector('input[type="file"]');
}

describe("FilePicker", () => {
  it("con un solo archivo mantiene el contrato de siempre", () => {
    const onChange = vi.fn();
    const { container } = render(<FilePicker value={null} onChange={onChange} />);
    fireEvent.change(inputDe(container), { target: { files: [archivo("uno.pdf")] } });
    expect(onChange).toHaveBeenCalledWith(expect.any(File));
    expect(onChange.mock.calls[0][0].name).toBe("uno.pdf");
  });

  it("con multiple acumula en vez de reemplazar", () => {
    // Un apartado trae transferencia e identificación: elegir el segundo no
    // puede borrar el primero.
    function Envoltura() {
      const [files, setFiles] = useState([]);
      return <FilePicker multiple value={files} onChange={setFiles} />;
    }
    const { container } = render(<Envoltura />);

    fireEvent.change(inputDe(container), { target: { files: [archivo("transferencia.pdf")] } });
    expect(screen.getByText("transferencia.pdf")).toBeInTheDocument();

    fireEvent.change(inputDe(container), { target: { files: [archivo("ine.pdf")] } });
    expect(screen.getByText("transferencia.pdf")).toBeInTheDocument();
    expect(screen.getByText("ine.pdf")).toBeInTheDocument();
  });

  it("quita solo el archivo señalado", () => {
    function Envoltura() {
      const [files, setFiles] = useState([]);
      return <FilePicker multiple value={files} onChange={setFiles} />;
    }
    const { container } = render(<Envoltura />);
    fireEvent.change(inputDe(container), {
      target: { files: [archivo("uno.pdf"), archivo("dos.pdf")] },
    });

    fireEvent.click(screen.getByLabelText("Quitar uno.pdf"));
    expect(screen.queryByText("uno.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("dos.pdf")).toBeInTheDocument();
  });

  it("la zona de arrastre sigue disponible para agregar otro", () => {
    function Envoltura() {
      const [files, setFiles] = useState([archivo("uno.pdf")]);
      return <FilePicker multiple value={files} onChange={setFiles} />;
    }
    render(<Envoltura />);
    expect(screen.getByText(/Agregar otro archivo/)).toBeInTheDocument();
  });
});
