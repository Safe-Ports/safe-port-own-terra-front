import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkflowForm from "./WorkflowForm";
import {createPortal} from "react-dom";

describe("WorkflowForm", () => {
  it("valida espacios y rango sin enviar, permite ir al campo y corregir", async () => {
    const save = vi.fn();
    render(<WorkflowForm onSubmit={save}><label>Nombre<input required defaultValue="   " /></label><label>Importe<input type="number" min="1" defaultValue="0" /></label><button>Guardar</button></WorkflowForm>);
    fireEvent.click(screen.getByRole("button", {name:"Guardar"}));
    expect(save).not.toHaveBeenCalled();expect(screen.getByRole("alert")).toHaveTextContent("El mínimo es 1");
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
    fireEvent.input(screen.getByLabelText("Nombre"),{target:{value:"Mariana"}});fireEvent.input(screen.getByLabelText("Importe"),{target:{value:"100"}});
    fireEvent.click(screen.getByRole("button", {name:"Guardar"}));expect(save).toHaveBeenCalledTimes(1);
  });
  it("respeta la validación específica de pantallas con noValidate", () => {
    const save=vi.fn();render(<WorkflowForm noValidate onSubmit={save}><input required /><button>Guardar</button></WorkflowForm>);
    fireEvent.click(screen.getByRole("button",{name:"Guardar"}));expect(save).toHaveBeenCalledOnce();
  });
  it("evita doble envío mientras espera la respuesta",async()=>{
    let done;const save=vi.fn(()=>new Promise(resolve=>{done=resolve}));const {container}=render(<WorkflowForm onSubmit={save}><button>Guardar</button></WorkflowForm>);
    fireEvent.submit(container.querySelector("form"));fireEvent.submit(container.querySelector("form"));expect(save).toHaveBeenCalledOnce();expect(container.querySelector("form")).toHaveAttribute("aria-busy","true");
    await act(async()=>done());expect(container.querySelector("form")).toHaveAttribute("aria-busy","false");
    fireEvent.submit(container.querySelector("form"));expect(save).toHaveBeenCalledTimes(2);await act(async()=>done());
  });
  it("conserva los valores y permite reintentar después de un fallo",async()=>{
    const save=vi.fn().mockRejectedValueOnce({response:{status:503,data:{error:{message:"Servicio no disponible"}}}}).mockResolvedValueOnce({});
    render(<WorkflowForm onSubmit={save}><label>Nombre<input defaultValue="Ana" /></label><button>Guardar</button></WorkflowForm>);
    fireEvent.click(screen.getByRole("button",{name:"Guardar"}));expect(await screen.findByRole("alert")).toHaveTextContent("El servicio no está disponible");expect(screen.getByLabelText("Nombre")).toHaveValue("Ana");
    fireEvent.click(screen.getByRole("button",{name:"Guardar"}));await waitFor(()=>expect(screen.queryByRole("alert")).not.toBeInTheDocument());expect(save).toHaveBeenCalledTimes(2);
  });
  it("bloquea envíos de una mutación externa en curso",()=>{
    const save=vi.fn();render(<WorkflowForm busy onSubmit={save}><button>Guardar</button></WorkflowForm>);fireEvent.click(screen.getByRole("button",{name:"Guardar"}));expect(save).not.toHaveBeenCalled();
  });
  it("crear un registro en un modal no envía el formulario que lo abrió",()=>{
    const outer=vi.fn(),inner=vi.fn();render(<WorkflowForm onSubmit={outer}>{createPortal(<WorkflowForm onSubmit={inner}><button>Crear contacto</button></WorkflowForm>,document.body)}</WorkflowForm>);
    fireEvent.click(screen.getByRole("button",{name:"Crear contacto"}));expect(inner).toHaveBeenCalledOnce();expect(outer).not.toHaveBeenCalled();
  });

});
