import { useState } from "react";
import DialogPortal from "@/components/ui/DialogPortal";
import { Privacidad } from "@/pages/Legal";
import { PRIVACY_NOTICE_VERSION } from "@/pages/Legal/PrivacyNoticeBody";
import "@/pages/Legal/legal.css";
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
 * Aviso de Privacidad como página completa (no un modal flotante): el
 * formulario solo muestra un botón/resumen compacto; al abrirlo se cubre
 * toda la pantalla renderizando el mismo componente `Privacidad` que usa la
 * ruta pública /privacidad (el checkbox de aceptación vive ahí, no duplicado
 * acá), con `showAccept` para mostrar, hasta abajo, el único checkbox de
 * "acepto / no acepto".
 *
 * Nota: el propio aviso (sección 15) pide que el consentimiento para datos
 * patrimoniales/financieros sea una casilla independiente de la aceptación de
 * términos. Un solo checkbox es una simplificación de producto deliberada
 * (pedida explícitamente) — por diseño ya no se ofrece un checkbox aparte
 * para oponerse a finalidades secundarias, algo que el propio aviso permite
 * hacer en cualquier momento por correo sin necesidad de una casilla.
 */
function PrivacyConsent({ value, onChange, idPrefix = "privacy" }) {
  const [open, setOpen] = useState(false);
  const v = value || emptyConsent();
  const accepted = isConsentValid(v);
  const [draftAccepted, setDraftAccepted] = useState(accepted);

  const openPage = () => { setDraftAccepted(accepted); setOpen(true); };
  const cancel = () => { setDraftAccepted(accepted); setOpen(false); };
  const confirm = () => {
    onChange({ termsAccepted: draftAccepted, financialConsentAccepted: draftAccepted, secondaryUseOptOut: false });
    setOpen(false);
  };

  return (
    <div className="pc-root">
      {accepted ? (
        <div className="pc-summary">
          <span className="pc-summary-check" aria-hidden="true">✓</span>
          <span className="pc-summary-text">Aceptaste el <strong>Aviso de Privacidad</strong>.</span>
          <button type="button" className="pc-summary-edit" onClick={openPage}>Editar</button>
        </div>
      ) : (
        <button type="button" className="pc-open" onClick={openPage}>
          <span className="pc-open-ico" aria-hidden="true">🔒</span>
          <span className="pc-open-text">
            <strong>Leer y aceptar el Aviso de Privacidad</strong>
            <small>Necesario para continuar</small>
          </span>
        </button>
      )}

      {open ? (
        <DialogPortal className="pc-page lg-root">
          <div className="lg-card">
            <div className="pc-page-top">
              <button type="button" className="pc-page-back" onClick={cancel}>← Volver</button>
              <span className="lg-brand" aria-hidden="true">OwnTerra</span>
            </div>

            <div className="legal-doc">
              <Privacidad showAccept accepted={draftAccepted} onAcceptChange={setDraftAccepted} idPrefix={idPrefix} />
            </div>

            <div className="pc-page-actions">
              <button type="button" className="btn-s" onClick={cancel}>Cancelar</button>
              <button type="button" className="btn-p" disabled={!draftAccepted} onClick={confirm}>
                Aceptar y continuar
              </button>
            </div>
          </div>
        </DialogPortal>
      ) : null}
    </div>
  );
}

export default PrivacyConsent;
