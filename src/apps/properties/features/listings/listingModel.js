import { demoRentalListings } from "./demoRentalListings";

export const RENTAL_LISTING_STORAGE_KEY = "ot_properties_rental_listings_v2";
const LEGACY_RENTAL_LISTING_STORAGE_KEY = "ot_properties_rental_listings_v1";
export const RENTAL_INQUIRY_STORAGE_KEY = "ot_properties_rental_inquiries_v1";

export const RENTAL_LISTING_STATUS = Object.freeze({
  draft: "Borrador",
  published: "Publicada",
  paused: "Pausada",
});

export const EMPTY_RENTAL_LISTING = Object.freeze({
  unitId: "",
  title: "",
  summary: "",
  description: "",
  monthlyRent: "",
  deposit: "",
  availableFrom: "",
  minimumTerm: "12",
  furnished: false,
  petPolicy: "A consideración",
  parkingSpaces: "0",
  amenities: "",
  photoPosition: "top-left",
  featured: false,
  status: "draft",
});

const clean = (value) => String(value || "").trim();
const amount = (value) => Number(value) || 0;
const id = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}`;

export function slugifyRentalListing(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `inmueble-${Date.now()}`;
}

export function validateRentalListing(draft, units = [], listings = [], editingId = null) {
  const errors = {};
  const unit = units.find((item) => item.id === draft.unitId);
  if (!unit) errors.unitId = "Selecciona una unidad del inventario.";
  else if (unit.status !== "available") errors.unitId = "Sólo puedes publicar una unidad disponible.";
  const duplicate = listings.some((item) => item.id !== editingId && item.unitId === draft.unitId);
  if (!errors.unitId && duplicate) errors.unitId = "Esta unidad ya tiene una publicación.";
  if (!clean(draft.title)) errors.title = "Escribe un título para el catálogo.";
  if (clean(draft.summary).length < 20) errors.summary = "Resume el inmueble en al menos 20 caracteres.";
  if (clean(draft.description).length < 40) errors.description = "Agrega una descripción de al menos 40 caracteres.";
  if (amount(draft.monthlyRent) <= 0) errors.monthlyRent = "La renta debe ser mayor a cero.";
  if (!clean(draft.availableFrom)) errors.availableFrom = "Selecciona la fecha disponible.";
  if (amount(draft.minimumTerm) <= 0) errors.minimumTerm = "Indica la estancia mínima.";
  return errors;
}

export function createRentalListing(draft, units = [], listings = []) {
  const errors = validateRentalListing(draft, units, listings);
  if (Object.keys(errors).length) throw new Error("Revisa la información de la publicación.");
  const now = new Date().toISOString();
  return {
    id: id("rental-listing"),
    slug: `${slugifyRentalListing(draft.title)}-${id("ref").slice(-6)}`,
    unitId: draft.unitId,
    title: clean(draft.title),
    summary: clean(draft.summary),
    description: clean(draft.description),
    monthlyRent: amount(draft.monthlyRent),
    deposit: amount(draft.deposit),
    availableFrom: draft.availableFrom,
    minimumTerm: amount(draft.minimumTerm),
    furnished: Boolean(draft.furnished),
    petPolicy: clean(draft.petPolicy) || "A consideración",
    parkingSpaces: amount(draft.parkingSpaces),
    amenities: clean(draft.amenities).split(",").map(clean).filter(Boolean),
    photoPosition: draft.photoPosition || "top-left",
    featured: Boolean(draft.featured),
    status: draft.status || "draft",
    inquiries: 0,
    publishedAt: draft.status === "published" ? now : "",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateRentalListing(listing, draft, units = [], listings = []) {
  const errors = validateRentalListing(draft, units, listings, listing.id);
  if (Object.keys(errors).length) throw new Error("Revisa la información de la publicación.");
  const now = new Date().toISOString();
  return {
    ...listing,
    unitId: draft.unitId,
    title: clean(draft.title),
    summary: clean(draft.summary),
    description: clean(draft.description),
    monthlyRent: amount(draft.monthlyRent),
    deposit: amount(draft.deposit),
    availableFrom: draft.availableFrom,
    minimumTerm: amount(draft.minimumTerm),
    furnished: Boolean(draft.furnished),
    petPolicy: clean(draft.petPolicy) || "A consideración",
    parkingSpaces: amount(draft.parkingSpaces),
    amenities: Array.isArray(draft.amenities) ? draft.amenities : clean(draft.amenities).split(",").map(clean).filter(Boolean),
    photoPosition: draft.photoPosition || listing.photoPosition,
    featured: Boolean(draft.featured),
    status: draft.status || listing.status,
    publishedAt: draft.status === "published" ? listing.publishedAt || now : listing.publishedAt,
    updatedAt: now,
  };
}

export function changeRentalListingStatus(listing, status) {
  if (!RENTAL_LISTING_STATUS[status]) throw new Error("Estado de publicación inválido.");
  return {
    ...listing,
    status,
    publishedAt: status === "published" ? listing.publishedAt || new Date().toISOString() : listing.publishedAt,
    updatedAt: new Date().toISOString(),
  };
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function readRentalListings() {
  const rows = readJson(RENTAL_LISTING_STORAGE_KEY, null);
  if (Array.isArray(rows)) return rows;
  const legacyRows = readJson(LEGACY_RENTAL_LISTING_STORAGE_KEY, null);
  if (!Array.isArray(legacyRows)) return demoRentalListings;
  const legacyIds = new Set(legacyRows.map((item) => item.id));
  const migrated = [...legacyRows, ...demoRentalListings.filter((item) => !legacyIds.has(item.id))];
  persistRentalListings(migrated);
  return migrated;
}

export function persistRentalListings(listings) {
  try { globalThis.localStorage?.setItem(RENTAL_LISTING_STORAGE_KEY, JSON.stringify(listings)); } catch { /* almacenamiento opcional */ }
  return listings;
}

export function readRentalInquiries() {
  const rows = readJson(RENTAL_INQUIRY_STORAGE_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export function recordRentalInquiry({ listing, name, phone, email, message }) {
  if (!clean(name)) throw new Error("Escribe tu nombre.");
  if (!clean(phone) && !clean(email)) throw new Error("Comparte teléfono o correo.");
  const inquiry = {
    id: id("catalog-inquiry"),
    name: clean(name),
    phone: clean(phone),
    email: clean(email).toLowerCase(),
    unitId: listing.unitId,
    listingId: listing.id,
    source: "Catálogo público",
    budget: listing.monthlyRent,
    desiredMoveIn: listing.availableFrom,
    status: "new",
    notes: clean(message) || `Interés en: ${listing.title}`,
    createdAt: new Date().toISOString(),
  };
  const current = readRentalInquiries();
  try { globalThis.localStorage?.setItem(RENTAL_INQUIRY_STORAGE_KEY, JSON.stringify([inquiry, ...current])); } catch { /* almacenamiento opcional */ }
  persistRentalListings(readRentalListings().map((item) => item.id === listing.id
    ? { ...item, inquiries:Number(item.inquiries || 0) + 1, updatedAt:new Date().toISOString() }
    : item));
  return inquiry;
}
