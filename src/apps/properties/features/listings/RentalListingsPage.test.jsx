import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PropertiesDataProvider } from "../../data/PropertiesDataContext";
import RentalListingsPage from "./RentalListingsPage";
import { RENTAL_LISTING_STORAGE_KEY, readRentalListings } from "./listingModel";

const showToast=vi.fn();
vi.mock("@/context/AppContext",()=>({useAppContext:()=>({canUseFeature:()=>true,showToast})}));
vi.mock("@/pages/Ecosystem/EcoLayout",()=>({default:({children})=><div className="eco-root">{children}</div>}));

function renderPage(){return render(<MemoryRouter><PropertiesDataProvider><RentalListingsPage/></PropertiesDataProvider></MemoryRouter>)}

describe("RentalListingsPage",()=>{
  beforeEach(()=>{localStorage.removeItem(RENTAL_LISTING_STORAGE_KEY);showToast.mockClear()});

  it("administra publicaciones conectadas al marketplace público",()=>{
    renderPage();
    expect(screen.getByRole("heading",{name:"Publicaciones de renta"})).toBeInTheDocument();
    expect(screen.getByRole("link",{name:/Ver catálogo público/})).toHaveAttribute("href","/rentas");
    fireEvent.click(screen.getAllByRole("button",{name:/Pausar/})[0]);
    expect(readRentalListings().some((item)=>item.status==="paused")).toBe(true);
    expect(showToast).toHaveBeenCalledWith("Publicación actualizada","success");
  });

  it("abre el editor con inventario disponible",()=>{
    renderPage();
    fireEvent.click(screen.getByRole("button",{name:"Nueva publicación"}));
    expect(screen.getByRole("dialog",{name:"Nueva publicación"})).toBeInTheDocument();
    expect(screen.getByLabelText("Unidad disponible *")).toBeInTheDocument();
    expect(screen.getByLabelText("Título del anuncio *")).toBeInTheDocument();
  });
});
