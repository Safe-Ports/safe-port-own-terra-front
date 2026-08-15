import "./legal.css";

/**
 * Páginas legales públicas (sin sesión): Aviso de Privacidad y Términos.
 * Se renderizan desde App.jsx según la ruta (/privacidad, /terminos). El aviso
 * incluye la divulgación del uso de datos de Google (requisito para el OAuth con
 * Google Calendar).
 */
const UPDATED = "12 de agosto de 2026";

function Privacidad() {
  return (
    <>
      <h1>Aviso de Privacidad</h1>
      <p className="lg-upd">Última actualización: {UPDATED}</p>

      <p>
        En <strong>OwnTerra</strong> (operado por Safe Ports) protegemos la información de nuestros
        usuarios y de sus clientes. Este aviso explica qué datos tratamos, con qué fin y cómo los
        cuidamos.
      </p>

      <h2>1. Datos que tratamos</h2>
      <ul>
        <li><strong>De tu cuenta:</strong> nombre, correo, organización y rol dentro de la plataforma.</li>
        <li><strong>Operativos:</strong> fraccionamientos, lotes, clientes, contratos, pagos y citas que registras en la app.</li>
        <li><strong>Técnicos:</strong> registros de acceso y de errores para operar y dar soporte.</li>
      </ul>

      <h2>2. Uso de datos de Google (Google Calendar)</h2>
      <p>
        Si decides conectar tu cuenta de Google, OwnTerra solicita el permiso
        <code> Google Calendar API — ver y editar eventos</code> con un único fin:
        <strong> crear y gestionar los eventos que tú agendas en OwnTerra</strong> (incluyendo generar
        un enlace de Google Meet cuando lo pides).
      </p>
      <ul>
        <li>Solo creamos, editamos o eliminamos eventos <strong>a partir de acciones que tú realizas</strong> en la app.</li>
        <li><strong>No</strong> leemos, vendemos ni compartimos el contenido de tu calendario con terceros.</li>
        <li><strong>No</strong> usamos estos datos para publicidad ni para entrenar modelos de inteligencia artificial.</li>
        <li>El acceso se limita estrictamente a esa función y se ajusta a la
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"> Política de Datos de Usuario de los Servicios API de Google</a>,
          incluidos sus requisitos de Uso Limitado.</li>
        <li>Guardamos de forma <strong>cifrada</strong> únicamente el token necesario para mantener la conexión.</li>
      </ul>

      <h2>3. Cómo revocar el acceso</h2>
      <p>
        Puedes desconectar tu cuenta de Google cuando quieras desde <em>Agenda → Conectar Google
        Calendar → Desconectar</em>, o directamente en la
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer"> configuración de permisos de tu cuenta de Google</a>.
        Al hacerlo eliminamos el token guardado.
      </p>

      <h2>4. Con quién compartimos datos</h2>
      <p>
        No vendemos tus datos. Solo los procesamos con proveedores de infraestructura necesarios para
        operar el servicio (alojamiento, base de datos, correo y pagos), bajo obligaciones de
        confidencialidad.
      </p>

      <h2>5. Conservación y seguridad</h2>
      <p>
        Conservamos la información mientras tu cuenta esté activa o según lo exija la ley. Aplicamos
        cifrado en tránsito y en reposo para los datos sensibles, y controles de acceso por rol.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación o eliminación de tus datos escribiéndonos al correo de
        contacto. Atenderemos tu solicitud conforme a la legislación aplicable.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Dudas sobre este aviso o sobre tus datos: <a href="mailto:soporte@own-terra.com">soporte@own-terra.com</a>.
      </p>
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
        {isTerms ? <Terminos /> : <Privacidad />}
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
