import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RENTAL_INQUIRY_STORAGE_KEY, RENTAL_LISTING_STORAGE_KEY, readRentalInquiries } from "../features/listings/listingModel";
import RentalCatalogPage from "./RentalCatalogPage";

function renderCatalog(path="/rentas") {
  return render(<MemoryRouter initialEntries={[path]}><RentalCatalogPage/></MemoryRouter>);
}

describe("RentalCatalogPage", () => {
  afterEach(() => {
    localStorage.removeItem(RENTAL_LISTING_STORAGE_KEY);
    localStorage.removeItem(RENTAL_INQUIRY_STORAGE_KEY);
  });

  it("presenta el marketplace público con búsqueda, filtros y favoritos", () => {
    renderCatalog();
    expect(screen.getByRole("heading", { name:/Encuentra un lugar/ })).toBeInTheDocument();
    expect(screen.getByText("5 inmuebles disponibles")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Cualquier precio"), { target:{ value:"15000" } });
    expect(screen.getByText("1 inmueble disponible")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Guardar en favoritos"));
    expect(screen.getByLabelText("Quitar de favoritos")).toBeInTheDocument();
  });

  it("incluye casas completas como un tipo de inmueble filtrable", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name:"Casa" }));
    expect(screen.getByText("1 inmueble disponible")).toBeInTheDocument();
    expect(screen.getByText("Casa familiar con jardín en Valle de Bravo")).toBeInTheDocument();
  });

  it("abre el detalle y registra una solicitud como prospecto", () => {
    renderCatalog();
    fireEvent.click(screen.getByLabelText("Ver Departamento luminoso con balcón arbolado"));
    expect(screen.getByRole("heading", { name:"Departamento luminoso con balcón arbolado" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name:"Solicitar información" }));
    const dialog=screen.getByRole("dialog", { name:"Solicitar información" });
    fireEvent.change(within(dialog).getByLabelText("Nombre *"), { target:{ value:"Laura Méndez" } });
    fireEvent.change(within(dialog).getByLabelText("Teléfono"), { target:{ value:"55 4000 5000" } });
    fireEvent.click(within(dialog).getByRole("button", { name:"Enviar solicitud" }));
    expect(screen.getByRole("heading", { name:"Recibimos tu interés" })).toBeInTheDocument();
    expect(readRentalInquiries()[0]).toMatchObject({ name:"Laura Méndez", unitId:"unit-j401", source:"Catálogo público" });
  });
});
