import propertiesPortalService from "@/services/propertiesPortalService";
import propertiesService from "@/services/propertiesService";
import { DEFAULT_POLICY, normalizePolicy } from "./collectionsModel";

/* Reportes de pago y política de cobranza.
 *
 * El backend todavía no expone estos endpoints (propuesta para properties-back:
 * docs/2026-10-14_properties-cobranza-contrato-front-backend.md). Mientras tanto la pantalla corre
 * en VISTA PREVIA: los reportes y la política se guardan en este navegador y la
 * interfaz lo dice. Cuando el backend esté listo, basta con poner
 * COLLECTIONS_API_READY en true: las pantallas ya llaman a este módulo y la forma
 * de los datos es la del contrato.
 *
 * Importante: la vista previa sólo comparte datos entre pestañas del MISMO origen
 * (mismo host y puerto). Para probar residente → administración, abre el portal
 * y Properties en el mismo servidor.
 */
export const COLLECTIONS_API_READY = false;

const REPORTS_KEY = "ownterra_preview_payment_reports";
const POLICY_KEY = "ownterra_preview_collection_policy";
// localStorage no aguanta archivos grandes: en vista previa el comprobante se limita.
export const PREVIEW_EVIDENCE_MAX_BYTES = 2 * 1024 * 1024;

const read = (key, fallback) => { try { return JSON.parse(window.localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("El navegador no tiene espacio para guardar la vista previa. Usa un comprobante más ligero."); }
  window.dispatchEvent(new Event("ownterra-preview-collections"));
};
const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 250));
const fileToDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("No pudimos leer el archivo.")); reader.readAsDataURL(file); });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Avisa a las pantallas cuando otra pestaña cambia la vista previa. */
export function onPreviewChange(callback) {
  const handler = (event) => { if (!event.key || event.key === REPORTS_KEY || event.key === POLICY_KEY) callback(); };
  window.addEventListener("storage", handler);
  window.addEventListener("ownterra-preview-collections", callback);
  return () => { window.removeEventListener("storage", handler); window.removeEventListener("ownterra-preview-collections", callback); };
}

/* ── Portal del residente ─────────────────────────────────────────────── */
export const portalPayments = {
  async list() {
    if (COLLECTIONS_API_READY) return propertiesPortalService.paymentReports();
    return delay(read(REPORTS_KEY, []).filter((report) => report.preview_owner === "portal-session"));
  },
  /** `context` sólo se usa en vista previa: el backend ya sabe quién es la persona. */
  async submit({ chargeIds, amount, currency = "MXN", paidOn, method, reference, note, file }, context = {}) {
    if (COLLECTIONS_API_READY) {
      const body = new FormData();
      chargeIds.forEach((id) => body.append("charge_ids", id));
      body.append("amount", String(amount)); body.append("currency", currency); body.append("paid_on", paidOn); body.append("method", method);
      if (reference) body.append("reference", reference);
      if (note) body.append("note", note);
      body.append("evidence", file);
      return propertiesPortalService.reportPayment(body);
    }
    if (file.size > PREVIEW_EVIDENCE_MAX_BYTES) throw new Error("En la vista previa el comprobante debe pesar menos de 2 MB.");
    const report = {
      id: uid(), preview_owner: "portal-session", status: "submitted",
      charge_ids: chargeIds, amount: Number(amount), currency, paid_on: paidOn, method, reference: reference || null, note: note || null,
      persona_id: context.personaId || null, persona_name: context.personaName || "Residente", property_id: context.propertyId || null, property_label: context.propertyLabel || "", community_id: context.communityId || null,
      charges: context.charges || [],
      evidence: { filename: file.name, content_type: file.type, url: await fileToDataUrl(file) },
      rejection_reason: null, reviewed_at: null, settlement_id: null, created_at: new Date().toISOString(),
    };
    write(REPORTS_KEY, [report, ...read(REPORTS_KEY, [])]);
    return delay(report);
  },
  async cancel(id) {
    if (COLLECTIONS_API_READY) return propertiesPortalService.cancelPaymentReport(id);
    write(REPORTS_KEY, read(REPORTS_KEY, []).map((report) => report.id === id && report.status === "submitted" ? { ...report, status: "cancelled" } : report));
    return delay(null);
  },
};

/* ── Administración ───────────────────────────────────────────────────── */
export const staffPayments = {
  async list({ communityId, status } = {}) {
    if (COLLECTIONS_API_READY) return propertiesService.paymentReports.list({ community_id: communityId, status });
    // En vista previa no hay comunidad confiable en el reporte: se muestran todos.
    return delay(read(REPORTS_KEY, []).filter((report) => !status || report.status === status));
  },
  async approve(id, body) {
    if (COLLECTIONS_API_READY) return propertiesService.paymentReports.approve(id, body);
    write(REPORTS_KEY, read(REPORTS_KEY, []).map((report) => report.id === id ? { ...report, status: "approved", reviewed_at: new Date().toISOString(), approved_amount: Number(body.amount) || report.amount } : report));
    return delay(null);
  },
  async reject(id, reason) {
    if (COLLECTIONS_API_READY) return propertiesService.paymentReports.reject(id, reason);
    write(REPORTS_KEY, read(REPORTS_KEY, []).map((report) => report.id === id ? { ...report, status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString() } : report));
    return delay(null);
  },
};

export const collectionPolicy = {
  async get(communityId) {
    if (COLLECTIONS_API_READY) return normalizePolicy(await propertiesService.communities.collectionPolicy(communityId));
    return delay(normalizePolicy(read(POLICY_KEY, {})[communityId] || DEFAULT_POLICY));
  },
  async save(communityId, policy) {
    if (COLLECTIONS_API_READY) return propertiesService.communities.saveCollectionPolicy(communityId, policy);
    write(POLICY_KEY, { ...read(POLICY_KEY, {}), [communityId]: policy });
    return delay(policy);
  },
};
