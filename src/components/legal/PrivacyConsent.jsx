import Checkbox from "@/components/ui/Checkbox";
import { PRIVACY_NOTICE_VERSION } from "@/pages/Legal/PrivacyNoticeBody";
import "./privacy-consent.css";

export { PRIVACY_NOTICE_VERSION };

export function emptyConsent() {
  return { termsAccepted: false, financialConsentAccepted: false, secondaryUseOptOut: false };
}

export function isConsentValid(value) {
  return Boolean(value?.termsAccepted) && Boolean(value?.financialConsentAccepted);
}

/** Campos a enviar al backend cuando se envía el formulario (core-back: timestamps). */
export function buildConsentFields(value, version = PRIVACY_NOTICE_VERSION) {
  const now = new Date().toISOString();
  return {
    privacy_version: version,
    terms_accepted_at: value?.termsAccepted ? now : null,
    financial_consent_accepted_at: value?.financialConsentAccepted ? now : null,
    secondary_use_optout_at: value?.secondaryUseOptOut ? now : null,
  };
}

/**
 * Igual que `buildConsentFields`, pero con el contrato de `service_network`
 * (properties-back): booleanos de entrada — el servidor fija el timestamp.
 */
export function buildConsentBooleans(value, version = PRIVACY_NOTICE_VERSION) {
  return {
    consent_version: version,
    consent_accepted: Boolean(value?.termsAccepted),
    financial_consent_version: version,
    financial_consent_accepted: Boolean(value?.financialConsentAccepted),
    secondary_use_optout: Boolean(value?.secondaryUseOptOut),
  };
}

/**
 * Una sola casilla de aceptación con enlaces al Aviso de Privacidad y a los
 * términos, que abren en otra pestaña para no perder lo capturado. El texto
 * es corto a pedido de producto; el consentimiento para datos patrimoniales y
 * financieros queda cubierto por la aceptación del aviso (sección 15).
 *
 * Nota: el propio aviso (sección 15) pide que el consentimiento para datos
 * patrimoniales/financieros sea una casilla independiente de la aceptación de
 * términos. Un solo checkbox es una simplificación de producto deliberada
 * (pedida explícitamente) — por diseño ya no se ofrece un checkbox aparte
 * para oponerse a finalidades secundarias, algo que el propio aviso permite
 * hacer en cualquier momento por correo sin necesidad de una casilla.
 */
function PrivacyConsent({ value, onChange, idPrefix = "privacy" }) {
  const accepted = isConsentValid(value || emptyConsent());
  const toggle = (checked) => onChange({ termsAccepted: checked, financialConsentAccepted: checked, secondaryUseOptOut: false });

  return (
    <div className="pc-root">
      <Checkbox id={`${idPrefix}-accept`} checked={accepted} onChange={toggle} required>
        He leído y acepto el{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer">Aviso de Privacidad</a> y los{" "}
        <a href="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</a>.
      </Checkbox>
    </div>
  );
}

export default PrivacyConsent;
