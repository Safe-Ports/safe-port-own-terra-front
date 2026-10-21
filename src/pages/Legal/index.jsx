import "./legal.css";
import Checkbox from "@/components/ui/Checkbox";
import PrivacyNoticeBody, { PRIVACY_UPDATED, PRIVACY_NOTICE_VERSION } from "./PrivacyNoticeBody";

/**
 * Páginas legales públicas (sin sesión): Aviso de Privacidad y Términos.
 * Se renderizan desde App.jsx según la ruta (/privacidad, /terminos).
 */
const UPDATED = "12 de agosto de 2026";
export { PRIVACY_UPDATED, PRIVACY_NOTICE_VERSION };

/**
 * El checkbox de aceptación vive aquí, en el propio Aviso de Privacidad, no
 * duplicado en otro componente — `PrivacyConsent` (el overlay que se abre al
 * registrarse) renderiza este mismo `Privacidad` con `showAccept`. En la ruta
 * pública /privacidad (sin flujo que aceptar) se omite.
 */
export function Privacidad({ showAccept = false, accepted = false, onAcceptChange, idPrefix = "privacy" }) {
  return (
    <>
      <h1>Aviso de Privacidad Integral</h1>
      <p className="lg-upd">Versión {PRIVACY_NOTICE_VERSION} · Última actualización: {PRIVACY_UPDATED}</p>
      <PrivacyNoticeBody />
      {showAccept ? (
        <div className="lg-accept-row">
          <Checkbox id={`${idPrefix}-accept`} checked={accepted} onChange={onAcceptChange} required>
            <strong>He leído y acepto</strong> el Aviso de Privacidad y los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</a>, incluido el
            consentimiento expreso para mis datos patrimoniales y financieros (sección 15).
          </Checkbox>
        </div>
      ) : null}
    </>
  );
}

function Terminos() {
  return (
    <>
      <h1>Términos del Servicio</h1>
      <p className="lg-upd">Última actualización: {UPDATED}</p>

      <p>
        Al usar <strong>OwnTerra</strong> aceptas estos términos. OwnTerra es una plataforma de gestión
        inmobiliaria para administrar fraccionamientos, lotes, clientes, contratos, pagos y agenda.
      </p>

      <h2>1. Uso del servicio</h2>
      <p>
        Te comprometes a usar la plataforma de forma lícita, a mantener la confidencialidad de tus
        credenciales y a ser responsable de la información que registras y de la de tus clientes.
      </p>

      <h2>2. Integraciones de terceros</h2>
      <p>
        OwnTerra puede integrarse con servicios como Google Calendar. El uso de esas integraciones se
        rige además por los términos del proveedor correspondiente. Puedes desconectarlas en cualquier
        momento.
      </p>

      <h2>3. Disponibilidad</h2>
      <p>
        Procuramos la mayor disponibilidad posible, pero el servicio se ofrece "tal cual" y puede tener
        mantenimientos o interrupciones.
      </p>

      <h2>4. Contacto</h2>
      <p>
        Para cualquier asunto sobre estos términos: <a href="mailto:soporte@own-terra.com">soporte@own-terra.com</a>.
      </p>
    </>
  );
}

export default function LegalPage() {
  const isTerms = window.location.pathname.startsWith("/terminos");
  return (
    <div className="lg-root">
      <div className="lg-card">
        <a className="lg-brand" href="/">OwnTerra</a>
        <div className="legal-doc">
          {isTerms ? <Terminos /> : <Privacidad />}
        </div>
        <div className="lg-foot">
          <a href="/privacidad">Aviso de Privacidad</a>
          <span>·</span>
          <a href="/terminos">Términos</a>
          <span>·</span>
          <a href="/">Ir a la app</a>
        </div>
      </div>
    </div>
  );
}
