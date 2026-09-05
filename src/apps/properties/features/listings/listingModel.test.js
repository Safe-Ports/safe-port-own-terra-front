import { afterEach, describe, expect, it } from "vitest";
import { demoUnits } from "../../data/demoPropertiesData";
import { demoRentalListings } from "./demoRentalListings";
import {
  RENTAL_INQUIRY_STORAGE_KEY, RENTAL_LISTING_STORAGE_KEY, changeRentalListingStatus,
  createRentalListing, persistRentalListings, readRentalInquiries, readRentalListings,
  recordRentalInquiry, validateRentalListing,
} from "./listingModel";

const validDraft = {
  unitId:"unit-jp1", title:"Estacionamiento privado y seguro",
  summary:"Cajón independiente con acceso controlado.",
  description:"Cajón de estacionamiento independiente dentro de Torre Jacarandas, con acceso controlado y disponibilidad inmediata.",
  monthlyRent:"1800", deposit:"1800", availableFrom:"2026-09-10", minimumTerm:"6",
  amenities:"Acceso controlado, Techado", photoPosition:"top-left", status:"draft",
};
const apartmentListing = demoRentalListings.find((item) => item.id === "listing-j401");

describe("rental listing model", () => {
  afterEach(() => {
    localStorage.removeItem(RENTAL_LISTING_STORAGE_KEY);
    localStorage.removeItem(RENTAL_INQUIRY_STORAGE_KEY);
  });

  it("sólo publica unidades disponibles y sin otra publicación", () => {
    expect(validateRentalListing({ ...validDraft, unitId:"unit-j101" }, demoUnits, [])).toHaveProperty("unitId");
    expect(validateRentalListing({ ...validDraft, unitId:"unit-j401" }, demoUnits, demoRentalListings)).toHaveProperty("unitId");
    expect(validateRentalListing(validDraft, demoUnits, demoRentalListings)).toEqual({});
  });

  it("normaliza contenido y cambia el estado de publicación", () => {
    const listing=createRentalListing(validDraft,demoUnits,demoRentalListings);
    expect(listing).toMatchObject({ unitId:"unit-jp1", monthlyRent:1800, amenities:["Acceso controlado","Techado"], status:"draft" });
    expect(changeRentalListingStatus(listing,"published")).toMatchObject({ status:"published", publishedAt:expect.any(String) });
  });

  it("comparte publicaciones con el catálogo público mediante almacenamiento local", () => {
    persistRentalListings([apartmentListing]);
    expect(readRentalListings()).toHaveLength(1);
    expect(readRentalListings()[0].slug).toBe("departamento-jacarandas-401");
  });

  it("convierte una consulta pública en un prospecto compatible con Rentas", () => {
    const inquiry=recordRentalInquiry({ listing:apartmentListing, name:" Laura ", phone:"55 2000 3000", email:"", message:"Quiero visitar el sábado" });
    expect(inquiry).toMatchObject({ name:"Laura", unitId:"unit-j401", source:"Catálogo público", status:"new" });
    expect(readRentalInquiries()).toHaveLength(1);
    expect(readRentalListings().find((item)=>item.id===apartmentListing.id).inquiries).toBe(apartmentListing.inquiries+1);
  });
});
