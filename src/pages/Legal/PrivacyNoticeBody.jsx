export const PRIVACY_UPDATED = "17 de octubre de 2026";
export const PRIVACY_NOTICE_VERSION = "2.1";

const PROVEEDORES = [
  ["Supabase", "Base de datos", "Almacenamiento de la información de la plataforma", "Global", "Remisión"],
  ["Hetzner", "Servidor de aplicación", "Ejecución de la plataforma", "Global", "Remisión"],
  ["Cloudflare", "Archivos y red", "Almacenamiento de contratos y comprobantes", "Infraestructura global", "Remisión"],
  ["Resend", "Correo transaccional", "Verificación, recuperación de contraseña y recordatorios de pago", "Según configuración del proveedor", "Remisión"],
  ["Google Gemini", "Inteligencia artificial", "Soporte mediante bot", "Global", "Remisión"],
  ["Google Calendar", "Calendario (opcional)", "Crear o borrar eventos si el usuario conecta su cuenta", "Global", "Remisión, por decisión del usuario"],
  ["Sentry", "Monitoreo de errores", "Diagnóstico técnico", "Según configuración del proveedor", "Remisión"],
  ["GitHub Pages", "Alojamiento web", "Sitio público", "Global", "Remisión"],
  ["Stripe", "Pagos", "Cobro de la suscripción", "Global", "Transferencia necesaria para el contrato"],
  ["Apple y Google", "Tiendas de apps", "Distribución de las aplicaciones móviles", "Global", "Responsables propios"],
  ["Contador y personal técnico", "Servicios profesionales", "Contabilidad, operación y soporte", "México", "Remisión"],
  ["Autoridades", "—", "Cumplimiento de mandato legal", "México", "Transferencia legal"],
];

/**
 * Cuerpo del Aviso de Privacidad Integral (15 secciones + Anexo A), sin
 * envoltorio de página — lo usan tanto `/privacidad` (página completa) como
 * el modal de consentimiento, para no duplicar el texto legal en dos lados.
 */
function PrivacyNoticeBody({ headingLevel: H = "h2" }) {
  return (
    <>
      <H>1. Identidad y domicilio del responsable</H>
      <p>
        <strong>Fernando Estrada</strong>, persona física con actividad empresarial, titular de la
        plataforma OwnTerra ("OwnTerra"), con domicilio para oír y recibir notificaciones en Vallarta
        500, Torre 2F, Depto. 8, Av. Principal, C.P. 48315, Puerto Vallarta, Jalisco, México, es
        responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de
        Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y demás normatividad
        aplicable.
      </p>
      <p>
        Contacto para privacidad y derechos ARCO:{" "}
        <a href="mailto:safeports.contacto@gmail.com">safeports.contacto@gmail.com</a>.
      </p>

      <H>2. Qué es OwnTerra</H>
      <p>
        OwnTerra es un software inmobiliario por suscripción mensual (SaaS), disponible en web y
        aplicación móvil con una misma cuenta, con dos productos: Lands (venta de terrenos y lotes) y
        Properties (administración de inmuebles y condominios). Sus clientes ("clientes de la
        plataforma") son personas físicas u organizaciones, como inmobiliarias, fraccionadoras,
        administradoras de condominios y negocios de renta, que usan la plataforma para su propia
        operación.
      </p>

      <H>3. Calidad con la que OwnTerra trata los datos</H>
      <ul>
        <li>
          <strong>Como responsable:</strong> OwnTerra trata (a) los datos de los clientes de la
          plataforma y de los colaboradores que invitan, relativos al registro, acceso, seguridad,
          suscripción y cobro; (b) los datos de prospectos y visitantes del sitio web que llenan el
          formulario; y (c) las credenciales y registros de acceso de quienes tienen una cuenta de
          portal (propietarios, inquilinos, residentes y proveedores).
        </li>
        <li>
          <strong>Como encargado:</strong> OwnTerra trata, por cuenta e instrucciones de cada cliente,
          los datos que este registra para su operación: compradores, arrendatarios, inquilinos,
          residentes, propietarios, proveedores, trabajadores de terceros y los documentos
          relacionados. Frente a esos datos el cliente es el responsable y debe contar con su propio
          aviso de privacidad y con el consentimiento que corresponda. Si usted es titular de esos
          datos y desea ejercer sus derechos, puede dirigirse al cliente o al contacto indicado arriba;
          OwnTerra canalizará su solicitud.
        </li>
      </ul>

      <H>4. Datos personales que se tratan</H>
      <ul>
        <li><strong>Identificación:</strong> nombre completo, RFC, número de identificación oficial, foto de perfil.</li>
        <li><strong>Contacto:</strong> correo electrónico, teléfono, domicilio.</li>
        <li><strong>Patrimoniales y financieros:</strong> monto del contrato, enganche, tasa de interés, mensualidades, método de pago, comprobantes, finiquitos o liquidaciones, saldos, adeudos y porcentaje de propiedad de cada unidad.</li>
        <li><strong>Acceso y uso:</strong> correo y contraseña, bitácora de actividad, dirección IP y registros de acceso.</li>
        <li><strong>Agenda y soporte:</strong> citas de la agenda y conversaciones con el bot de soporte.</li>
        <li><strong>Documentos cargados por los clientes:</strong> identificaciones oficiales, comprobantes y contratos firmados, que pueden incluir firmas. El cliente decide su contenido.</li>
        <li><strong>En Properties:</strong> firma y foto en la recepción de paquetería, votos en asambleas y datos de cuentas de portal.</li>
        <li><strong>Pagos de suscripción:</strong> los datos de tarjeta los recibe directamente Stripe; OwnTerra solo conserva identificadores, plan y estado del pago.</li>
      </ul>
      <p>
        No se solicitan datos personales sensibles (salud, biométricos, origen étnico, religión, entre
        otros). Los clientes que diseñen formularios públicos no deben solicitarlos.
      </p>

      <H>5. Cómo se obtienen</H>
      <ul>
        <li>Directamente de usted: formularios del sitio y de la aplicación, uso de la plataforma, y medios informales como WhatsApp o correo.</li>
        <li>Indirectamente: los datos de compradores, inquilinos, residentes y trabajadores de terceros los carga el cliente de la plataforma.</li>
        <li>Opcionalmente, si el usuario conecta su cuenta de Google Calendar: su correo de Google y un permiso de acceso cifrado para crear o borrar eventos.</li>
      </ul>

      <H>6. Finalidades</H>
      <p>Los datos se utilizan para:</p>
      <ul>
        <li>Relacionar el inmueble con la persona correspondiente y gestionar la documentación de una compra, venta, renta o administración.</li>
        <li>Crear y operar cuentas, dar acceso a la plataforma y a la aplicación, y brindar soporte, incluido el soporte con inteligencia artificial.</li>
        <li>Cobrar la suscripción y enviar correos de verificación, recuperación de contraseña y recordatorios de pago.</li>
        <li>Seguridad, auditoría de accesos y monitoreo de errores.</li>
        <li>Dar seguimiento a prospectos que dejan sus datos en el formulario.</li>
        <li>Cumplir obligaciones legales.</li>
      </ul>
      <p>
        <strong>Finalidades secundarias</strong> (no necesarias para el servicio): respecto de los datos
        que OwnTerra trata como responsable (sección 3), y de forma disociada, anonimizada o agregada
        siempre que sea posible, utilizamos la información para construir y mantener las bases de datos
        propias de OwnTerra y para desarrollar, entrenar y mejorar herramientas de inteligencia
        artificial y funciones de la plataforma, de modo que nuestros servicios sean cada vez más
        precisos y útiles. Esto no incluye los datos que sus clientes capturan por cuenta propia en la
        plataforma (sección 3, OwnTerra como encargado), salvo que el cliente así lo instruya o se
        obtenga el consentimiento correspondiente. Si usted no desea que sus datos se usen para estas
        finalidades secundarias, puede manifestarlo en cualquier momento, incluso al registrarse,
        escribiendo a <a href="mailto:safeports.contacto@gmail.com">safeports.contacto@gmail.com</a>, sin
        que ello afecte la contratación ni el uso de la plataforma.
      </p>

      <H>7. Remisiones y transferencias</H>
      <p>
        OwnTerra se apoya en proveedores que tratan datos por su cuenta (remisiones) y, en algunos
        casos, en terceros que reciben datos para sus propias funciones (transferencias). La lista
        vigente está en el Anexo A, al final de este aviso, y se actualiza sin modificar este aviso
        cuando cambia un proveedor dentro de la misma categoría.
      </p>
      <p>
        Varios de estos proveedores almacenan o procesan datos fuera de México. Las remisiones no
        requieren su consentimiento; las transferencias que lo requieran se recabarán al aceptar este
        aviso. OwnTerra no vende sus datos.
      </p>

      <H>8. Cookies y almacenamiento local</H>
      <p>
        La plataforma web guarda su sesión y algunas preferencias en el almacenamiento local del
        navegador (localStorage), y la aplicación móvil guarda la sesión en el teléfono. Son cookies y
        almacenamiento estrictamente necesarios para el funcionamiento. No se usan cookies de rastreo ni
        de terceros, Google Analytics, píxeles, publicidad personalizada ni geolocalización. Puede
        borrarlos desde su navegador o dispositivo, lo que cerrará su sesión.
      </p>
      <ul>
        <li>Monitoreo de errores: Sentry puede recibir la dirección IP y el identificador de usuario cuando ocurre un error, solo para diagnóstico.</li>
        <li>Sitio público: GitHub Pages registra la dirección IP de los visitantes.</li>
        <li>Notificaciones: la aplicación puede programar recordatorios de agenda que muestren en la pantalla bloqueada el nombre de un cliente y la hora de una cita. Puede desactivarlas en su dispositivo.</li>
        <li>Desbloqueo biométrico: es opcional y lo verifica su propio teléfono; la aplicación solo recibe una respuesta de sí o no y nunca recibe ni guarda su huella o rostro.</li>
      </ul>

      <H>9. Documentos y enlaces públicos</H>
      <p>
        Los clientes deciden qué documentos suben y no deben cargar datos que no necesiten. Las
        cotizaciones pueden compartirse por enlace público o por WhatsApp: cualquier persona con el
        enlace podrá abrirlas.
      </p>

      <H>10. Conservación</H>
      <p>
        Los datos de cuenta se conservan mientras la suscripción esté activa y hasta 60 días después de
        cancelarla, periodo en que el cliente puede exportarlos; después se eliminan. Los respaldos se
        rotan en un máximo de 30 días. Los datos de prospectos se conservan hasta 18 meses. La
        información de pagos y facturación se conserva 5 años por obligaciones fiscales. Si la ley exige
        un plazo mayor, se conserva por ese plazo.
      </p>

      <H>11. Derechos ARCO, revocación y limitación de uso</H>
      <p>
        Usted puede Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos, revocar su
        consentimiento y limitar su uso o divulgación. Envíe su solicitud a{" "}
        <a href="mailto:safeports.contacto@gmail.com">safeports.contacto@gmail.com</a> con: (i) su nombre
        y medio de respuesta; (ii) documentos que acrediten su identidad o representación; (iii)
        descripción clara de los datos y del derecho; y (iv) elementos que faciliten localizarlos.
      </p>
      <p>
        OwnTerra responderá en un máximo de 20 días hábiles y, si procede, la hará efectiva en los 15
        días hábiles siguientes. Si los datos fueron capturados por un cliente de la plataforma, su
        solicitud se canalizará al cliente, que es el responsable, y OwnTerra le dará el apoyo técnico
        necesario. La cancelación puede estar sujeta a conservar datos por obligaciones legales.
      </p>

      <H>12. Seguridad</H>
      <p>
        OwnTerra mantiene medidas de seguridad administrativas, técnicas y físicas para proteger sus
        datos contra daño, pérdida, alteración, destrucción o acceso, uso o tratamiento no autorizado.
      </p>

      <H>13. Cambios al aviso</H>
      <p>
        Las modificaciones se publicarán en el sitio web y la aplicación. Si cambian las finalidades, la
        identidad del responsable o las transferencias de forma que requiera su consentimiento, se lo
        haremos saber antes de que surtan efectos.
      </p>

      <H>14. Autoridad</H>
      <p>
        Si considera vulnerado su derecho a la protección de datos, puede acudir ante la autoridad
        competente en la materia (actualmente la Secretaría Anticorrupción y Buen Gobierno).
      </p>

      <H>15. Consentimiento</H>
      <p>
        Al aceptar los términos y condiciones, usted manifiesta haber leído este aviso. Para el
        tratamiento de sus datos patrimoniales y financieros, y para las transferencias que lo
        requieran, otorga su consentimiento expreso marcando la casilla correspondiente, que no aparece
        marcada por defecto y es independiente de la aceptación de los términos. Para las finalidades
        secundarias descritas en la sección 6 no se requiere marcar casilla alguna, pero usted puede
        oponerse en cualquier momento conforme a ese apartado y a la sección 11.
      </p>

      <H>Anexo A — Proveedores y terceros</H>
      <p className="lg-upd" style={{ marginBottom: 14 }}>
        Versión 2.0 · 13 de octubre de 2026 · Se actualiza sin modificar el aviso integral
      </p>
      <div className="lg-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Categoría</th>
              <th>Finalidad</th>
              <th>Ubicación</th>
              <th>Carácter</th>
            </tr>
          </thead>
          <tbody>
            {PROVEEDORES.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default PrivacyNoticeBody;
