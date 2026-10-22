import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PropertiesWorkspace from "./PropertiesWorkspace";

const mocks = vi.hoisted(() => ({ data: {} }));
vi.mock("../data/PropertiesDataContext", () => ({ usePropertiesData: () => mocks.data }));
vi.mock("@/pages/Ecosystem/EcoLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
const tree = () => <MemoryRouter><Routes><Route element={<PropertiesWorkspace />}><Route index element={<><h1>Portafolio cargado</h1><input aria-label="Captura pendiente" /></>} /></Route></Routes></MemoryRouter>;
function mount() { return render(tree()); }

describe("Estados compartidos de Properties", () => {
  it("anuncia la carga sin mostrar un portafolio vacío", () => {
    mocks.data = { propertiesLoading: true }; mount();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando Properties");
    expect(screen.queryByText("Portafolio cargado")).not.toBeInTheDocument();
  });
  it("muestra error normalizado y permite reintentar", () => {
    const retry = vi.fn(); mocks.data = { propertiesError: new Error("Sin conexión"), retryProperties: retry }; mount();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("conserva la captura cuando una invalidación vuelve a cargar datos", () => {
    mocks.data = { propertiesLoading: false, propertiesError: null };
    const view = mount();
    fireEvent.change(screen.getByLabelText("Captura pendiente"), { target: { value: "token-de-un-solo-uso" } });
    mocks.data = { propertiesLoading: true, propertiesError: null };
    view.rerender(tree());
    expect(screen.getByLabelText("Captura pendiente")).toHaveValue("token-de-un-solo-uso");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("abre la vista cuando termina la carga", () => {
    mocks.data = { propertiesLoading: false, propertiesError: null }; mount();
    expect(screen.getByRole("heading", { name: "Portafolio cargado" })).toBeInTheDocument();
  });
});
