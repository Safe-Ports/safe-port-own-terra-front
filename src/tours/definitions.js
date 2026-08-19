/**
 * Tutoriales guiados: definición de pasos, separada de la UI.
 *
 * NADA se auto-lanza por visitar una pantalla. El usuario decide cuándo empezar cada
 * tour desde el panel de "Tours guiados" (dentro de ❓ Guías, en cualquier página).
 *
 * Cada paso apunta a un elemento REAL de la pantalla mediante `data-tour="..."`.
 * Se usa ese atributo en vez de clases CSS a propósito: las clases cambian al
 * rediseñar y romperían el tour en silencio; un `data-tour` existe solo para esto,
 * así que quien lo borre sabe lo que está tocando.
 *
 * `key` es lo que se guarda en el servidor (users.tours_seen) para no repetirlo.
 *
 * Cada tour EXPUESTO en el panel lleva además:
 *   - `label`: nombre corto para la lista.
 *   - `description`: una línea explicando qué enseña.
 *   - `route`: a dónde navegar antes de lanzarlo (el panel puede estar en
 *     cualquier página). Solo lo usa el panel — NO dispara nada por sí solo.
 * Los tours "encadenados" (las partes 2, 3... de un mismo flujo) no llevan
 * label/description/route propios: no tiene sentido listarlos por separado en el
 * panel, ya que el usuario los ve como UN solo recorrido. Se marcan con
 * `hidden: true` para excluirlos de esa lista sin dejar de existir como tours
 * reales (con su propia entrada en tours_seen).
 *
 * `next` conecta un tour con su continuación: SOLO se dispara si el usuario
 * COMPLETA el tour actual (lo salta o lo cierra y ahí queda). Si la continuación
 * trae `waitFor`, espera en silencio a que su ancla aparezca en el DOM — es decir,
 * a que el usuario haga la acción real que la revela — en vez de asumir que ya
 * pasó. Así una vez que alguien arranca un flujo desde el panel, lo completo lo
 * guía paso a paso sin que tenga que volver a pedir cada parte.
 */

export const TOUR_ECOSISTEMA = {
  key: "ecosistema",
  label: "El ecosistema OwnTerra",
  description: "Los dos niveles de la app, tu agenda y dónde encontrar el resto de tutoriales.",
  route: "/ecosistema",
  steps: [
    {
      target: "body",
      placement: "center",
      title: "Te enseño la casa en un minuto",
      content:
        "OwnTerra tiene dos niveles: el Ecosistema, donde estás ahora, y las apps donde " +
        "trabajas el día a día. Vamos a verlos.",
    },
    {
      // Este paso va CASI al principio a propósito: es el punto de partida de todo
      // lo demás. Crear el primer fraccionamiento, la calculadora, los contratos y
      // las restricciones tienen su propio tour, pero ninguno se lanza solo — todos
      // se encuentran y se inician aquí, cuando el usuario quiera.
      target: '[data-tour="topbar-help"]',
      placement: "bottom",
      title: "Tu punto de partida: este botón",
      content:
        "Aquí vas a encontrar TODOS los tutoriales de la app — crear tu primer " +
        "fraccionamiento, la calculadora de financiamiento, generar contratos y las " +
        "restricciones que existen — con un check de qué ya completaste. Ve " +
        "marcándolos a tu ritmo, cuando quieras.",
    },
    {
      target: '[data-tour="apps"]',
      title: "Tus aplicaciones",
      content:
        "Cada tarjeta es una app del ecosistema. OwnTerra Lands es la de lotes y " +
        "fraccionamientos: ahí vive tu operación diaria. Las demás llegarán después.",
    },
    {
      target: '[data-tour="nav-miday"]',
      placement: "right",
      title: "Mi Día",
      content:
        "Tu punto de partida cada mañana: las citas de hoy, los pagos por cobrar y lo " +
        "que requiere tu atención, todo en una pantalla.",
    },
    {
      target: '[data-tour="nav-agenda"]',
      placement: "right",
      title: "Agenda",
      content:
        "Tu calendario personal. Solo tú ves tus eventos, y puedes suscribirlo a Google " +
        "Calendar para tenerlo en el teléfono.",
    },
    {
      target: '[data-tour="nav-team"]',
      placement: "right",
      title: "Equipo",
      content:
        "Aquí das de alta vendedores y decides a qué apps entra cada uno. Un vendedor " +
        "solo ve lo que le corresponde.",
    },
    {
      target: "body",
      placement: "center",
      title: "Eso es todo por ahora",
      content:
        "Cuando quieras seguir aprendiendo, ya sabes dónde: el botón ❓ Guías, en " +
        "cualquier pantalla de la app.",
    },
  ],
};

/**
 * Primer fraccionamiento, paso 0: la pantalla de elegir método (Carga Manual vs CAD).
 * Es lo primero que se ve al llegar a /lotes, así que no necesita `waitFor`: arranca
 * en cuanto la ruta coincide, igual que el tour del ecosistema.
 */
export const TOUR_LANDS_SELECTOR = {
  key: "lands-frac-selector",
  label: "Crea tu primer fraccionamiento",
  description: "El recorrido completo: elegir método, nombrar, subir el plano y generar los lotes.",
  route: "/lotes",
  next: "lands-frac-inicio",
  steps: [
    {
      target: '[data-tour="frac-carga-manual"]',
      placement: "right",
      title: "Empieza por aquí",
      // El botón propio de este globo dice "Entendido" (no "Empezar" ni "Siguiente")
      // a propósito: la acción real es darle clic a la TARJETA de abajo, no a este
      // globo. Con la etiqueta genérica, algunos usuarios le daban clic al botón del
      // tour pensando que ERA la acción, y se quedaban viendo una pantalla oscura
      // sin que nada pasara — el tour seguía esperando la ancla de la SIGUIENTE
      // pantalla, que solo aparece al darle clic a la tarjeta real.
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "\"Carga Manual\" es tu camino: dale clic a esa tarjeta (no a este mensaje) " +
        "para subir el plano y armar los lotes. \"Importar CAD\" llega más adelante.",
    },
  ],
};

/**
 * Primer fraccionamiento, parte 1: la pantalla donde se nombra y se sube el plano.
 * `waitFor` es imprescindible aquí: esta pantalla NO existe hasta que el usuario
 * pulsa "Carga Manual" en el paso anterior, así que el tour espera en silencio a
 * que aparezca en vez de intentar arrancar sobre un elemento que aún no existe
 * (eso dispararía TARGET_NOT_FOUND y lo cerraría sin haberlo mostrado).
 */
export const TOUR_LANDS_INICIO = {
  key: "lands-frac-inicio",
  hidden: true, // continúa lands-frac-selector; no aparece suelto en el panel
  waitFor: '[data-tour="frac-inicio"]',
  next: "lands-frac-tablero",
  steps: [
    {
      target: '[data-tour="frac-inicio"]',
      placement: "center",
      title: "Tu primer fraccionamiento",
      content:
        "Un fraccionamiento es el terreno que vas a lotificar. Aquí lo das de alta: " +
        "le pones nombre, subes su plano y defines cuántos lotes tiene.",
    },
    {
      target: '[data-tour="frac-nombre-inicial"]',
      title: "Ponle nombre",
      content:
        "El nombre con el que lo conoces y con el que aparecerá en contratos y " +
        "reportes. Por ejemplo: Residencial Las Palmas.",
    },
    {
      target: '[data-tour="frac-plano"]',
      title: "Sube el plano",
      content:
        "Una foto o imagen del plano (JPG, PNG, WEBP o HEIC). Sobre ella vas a ir " +
        "colocando los lotes, así que sirve cualquier plano legible.",
    },
    {
      target: "body",
      placement: "center",
      title: "Sigue tú",
      content:
        "Escribe el nombre y elige el plano. En cuanto lo hagas aparece el tablero de " +
        "lotes, y ahí retomo el tutorial para terminar juntos.",
    },
  ],
};

/**
 * Primer fraccionamiento, parte 2: nombrar y crear la primera sección. No tiene ruta
 * propia porque vive en la misma pantalla; se dispara cuando aparece su ancla, o sea
 * cuando el usuario ya subió el plano (o pulsó "Continuar" sin él).
 *
 * A propósito NO incluye el paso de guardar: eso solo tiene sentido una vez que existe
 * al menos una sección con lotes, y ese es justo el trabajo del siguiente tour
 * (TOUR_LANDS_MATRIZ), que espera la prueba real de que el usuario completó este paso.
 */
export const TOUR_LANDS_TABLERO = {
  key: "lands-frac-tablero",
  hidden: true, // continúa lands-frac-selector; no aparece suelto en el panel
  waitFor: '[data-tour="frac-guardar"]',
  next: "lands-frac-matriz",
  steps: [
    {
      target: '[data-tour="frac-nombre"]',
      title: "Ya casi",
      content:
        "Este es el tablero de tu fraccionamiento. Aquí puedes corregir el nombre " +
        "antes de guardarlo.",
    },
    {
      target: '[data-tour="frac-secciones"]',
      title: "Crea tu primera sección",
      content:
        "Una sección es una manzana o etapa. Escribe un nombre (por ejemplo " +
        "\"Manzana A\") y cuántos lotes tiene esa sección.",
    },
    {
      target: '[data-tour="frac-agregar"]',
      title: "Dale clic a Agregar",
      content:
        "Al pulsarlo, esa sección se genera sola con sus lotes ya numerados. Puedes " +
        "repetirlo por cada manzana o etapa de tu plano. Cuando termines, sigo yo.",
    },
    {
      target: '[data-tour="frac-excel"]',
      title: "¿Ya tienes tu inventario en Excel?",
      content:
        "Es más rápido que escribir sección por sección. Descarga la Plantilla, " +
        "revisa Ver formato para llenarla bien, y luego Subir. También sirve para " +
        "cargar lotes que se te quedaron pendientes más adelante.",
    },
  ],
};

/**
 * Primer fraccionamiento, parte 3: los lotes ya generados. Su ancla (`frac-matriz`)
 * solo existe una vez que hay al menos una sección — es decir, solo después de que el
 * usuario de verdad pulsó "Agregar" en el paso anterior. Es la prueba de que la acción
 * ocurrió; no hace falta escuchar el estado de React desde aquí.
 */
export const TOUR_LANDS_MATRIZ = {
  key: "lands-frac-matriz",
  hidden: true, // continúa lands-frac-selector; no aparece suelto en el panel
  waitFor: '[data-tour="frac-matriz"]',
  steps: [
    {
      target: '[data-tour="frac-matriz"]',
      title: "Ahí están tus lotes",
      // A propósito NO invita a darle clic a un lote: eso abre el modal de "Editar
      // lote" por encima del tour, y el paso siguiente (frac-leyenda) queda tapado
      // detrás — el tour deja pasar los clics hacia la app real para que el resto de
      // la cadena funcione, así que aquí solo describe, no invita a esa acción.
      content:
        "Cada cuadro es un lote de la sección, ya numerado. Si tu plano tiene más " +
        "manzanas, repite arriba: nombre, cantidad y Agregar.",
    },
    {
      target: '[data-tour="frac-leyenda"]',
      title: "Sus tres estados",
      content:
        "Disponible es lo normal al crearlos. Se vuelven Apartado o Vendido solos, al " +
        "registrar una visita o generar un contrato — no hace falta cambiarlos a mano.",
    },
    {
      target: '[data-tour="frac-guardar"]',
      title: "Por último, guarda",
      // Última parada de TODO el flujo: sin este cambio de etiqueta, "Empezar"
      // cierra el tour dejando al usuario creyendo que ya guardó, cuando en
      // realidad no le dio clic al botón real.
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón verde \"Crear fraccionamiento\" (no a este mensaje). Al " +
        "guardar, tu fraccionamiento queda listo para vender: ya puedes registrar " +
        "clientes, apartar lotes y generar contratos con su plan de pagos.",
    },
  ],
};

/**
 * Calculadora de financiamiento, parte 1: la lista de guardadas y el botón para
 * crear una nueva. Ambas anclas existen desde que se entra a /calculadora, así que
 * no necesita `waitFor`.
 */
export const TOUR_CALCULADORA_LISTA = {
  key: "calculadora-lista",
  label: "Calculadora de financiamiento",
  description: "Crear la fórmula de la mensualidad, probarla y activarla para las ventas.",
  route: "/calculadora",
  next: "calculadora-editor",
  steps: [
    {
      target: '[data-tour="calc-lista"]',
      placement: "right",
      title: "Tus calculadoras guardadas",
      content:
        "El interruptor marca cuál está ACTIVA. Solo una puede estarlo a la vez, y " +
        "es la que se usa al registrar una venta.",
    },
    {
      target: '[data-tour="calc-nueva"]',
      title: "Crea la primera",
      // Ver el comentario de TOUR_LANDS_SELECTOR: la acción real es el botón de la
      // app, no este globo.
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón \"+ Nueva calculadora\" de la pantalla (no a este " +
        "mensaje) para definir la fórmula de tu mensualidad.",
    },
  ],
};

/**
 * Calculadora, parte 2: el editor con nombre, fórmula y el botón "Analizar". Su
 * ancla (`calc-editor`) solo existe una vez que el usuario pulsó "+ Nueva" o eligió
 * una guardada — de ahí el `waitFor`.
 */
export const TOUR_CALCULADORA_EDITOR = {
  key: "calculadora-editor",
  waitFor: '[data-tour="calc-editor"]',
  hidden: true, // continúa calculadora-lista
  next: "calculadora-prueba",
  steps: [
    {
      target: '[data-tour="calc-editor"]',
      placement: "left",
      title: "Nombre y fórmula",
      content:
        "Ponle un nombre (por ejemplo \"Plan 12% interés simple\") y escribe la " +
        "fórmula de la mensualidad. Usa las variables que quieras: Precio_Lote, " +
        "Enganche, Tasa, Plazo... se detectan solas.",
    },
    {
      target: '[data-tour="calc-analizar"]',
      title: "Dale clic a Analizar fórmula",
      // Encadena con TOUR_CALCULADORA_PRUEBA (waitFor calc-prueba): si el usuario le
      // da clic a "Empezar" en vez de al botón real, el tour queda esperando en
      // silencio una ancla que nunca aparece — exactamente el bug reportado con
      // "Generar Contrato".
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón \"Analizar fórmula\" (no a este mensaje). El sistema " +
        "detecta las variables y genera campos para probarla con números reales.",
    },
  ],
};

/**
 * Calculadora, parte 3: el modo prueba. Su ancla (`calc-prueba`) solo existe cuando
 * `vars.length > 0`, es decir, después de un "Analizar fórmula" exitoso.
 */
export const TOUR_CALCULADORA_PRUEBA = {
  key: "calculadora-prueba",
  waitFor: '[data-tour="calc-prueba"]',
  hidden: true, // continúa calculadora-lista
  steps: [
    {
      target: '[data-tour="calc-prueba"]',
      placement: "left",
      title: "Pruébala con números reales",
      content:
        "Captura valores de ejemplo y verás la mensualidad calculada y la tabla de " +
        "amortización proyectada, antes de guardar nada.",
    },
    {
      target: '[data-tour="calc-guardar"]',
      title: "Guarda cuando estés conforme",
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón \"Guardar configuración\" (no a este mensaje) cuando " +
        "estés conforme. Importante: al registrar una venta se congela una COPIA " +
        "exacta de la fórmula y los valores usados — editar la calculadora después " +
        "no recalcula ventas pasadas.",
    },
  ],
};

/**
 * Generar contrato, parte 1: el botón que abre el formulario. Vive en /contratos y
 * siempre está visible, así que no necesita `waitFor`.
 */
export const TOUR_CONTRATO_BOTON = {
  key: "contrato-boton",
  label: "Generar un contrato",
  description: "Vincular lote y cliente, condiciones financieras y qué queda congelado.",
  route: "/contratos",
  next: "contrato-form",
  steps: [
    {
      target: '[data-tour="contrato-generar"]',
      title: "Genera tu primer contrato",
      // Ver el comentario de TOUR_LANDS_SELECTOR: la acción real es el botón de la
      // app, no este globo.
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón verde \"+ Generar Contrato\" de la pantalla (no a este " +
        "mensaje) para abrir el formulario.",
    },
  ],
};

/**
 * Generar contrato, parte 2: el formulario completo. El modal (Modal.jsx) solo
 * renderiza sus campos cuando está abierto, así que TODAS las anclas de este tour
 * viven detrás de un único `waitFor`: no hace falta encadenar varios sub-tours como
 * en Lots, porque aquí no hay una revelación progresiva — todo aparece de una vez.
 *
 * `zIndex` en 65: el resto de los tours va a 45 a propósito (por debajo de CUALQUIER
 * modal de la app, z-index 60, para que un modal AJENO al tour que se abra por
 * accidente gane y quede usable). Pero aquí las anclas viven DENTRO del modal de
 * Generar Contrato (el propio z-index 60) — si el tour se quedara en 45, su
 * sobrecapa y su globo de texto quedarían tapados por el modal que se supone que
 * está señalando, y el usuario vería el formulario sin ninguna indicación encima
 * (justo el bug reportado: "mira como lo pone por detrás").
 */
export const TOUR_CONTRATO_FORM = {
  key: "contrato-form",
  waitFor: '[data-tour="contrato-frac-lote"]',
  zIndex: 65,
  hidden: true, // continúa contrato-boton
  steps: [
    {
      target: '[data-tour="contrato-frac-lote"]',
      title: "Elige el fraccionamiento y el lote",
      content:
        "Solo se listan lotes disponibles del fraccionamiento elegido. Al guardar el " +
        "contrato, ese lote pasa a Vendido (o Apartado, si el tipo es Reserva) — no " +
        "hace falta cambiarlo a mano en el tablero de lotes.",
    },
    {
      target: '[data-tour="contrato-cliente"]',
      title: "Vincula al cliente",
      content:
        "Busca por nombre. Si el cliente no existe todavía, créalo primero desde " +
        "Clientes — este formulario no da de alta clientes nuevos.",
    },
    {
      target: '[data-tour="contrato-tipo"]',
      title: "El tipo de contrato cambia lo que pasa después",
      content:
        "Compraventa marca el lote Vendido. Reserva lo marca Apartado y te pide " +
        "además una fecha de vencimiento. Arrendamiento no toca el estado del lote. " +
        "Fecha de firma y Primer pago son obligatorias en los tres casos.",
    },
    {
      target: '[data-tour="contrato-vendedor"]',
      title: "Vendedor asignado",
      content:
        "Queda como responsable de este cliente y este lote — es quien lo verá en " +
        "su cartera si algún día hay que transferirla.",
    },
    {
      target: '[data-tour="contrato-financiero"]',
      title: "Monto, enganche y plazo",
      content:
        "El monto total y el plazo son obligatorios para una venta. El enganche es " +
        "opcional; si lo capturas, verás qué porcentaje representa del total.",
    },
    {
      target: '[data-tour="contrato-mensualidad"]',
      title: "La mensualidad se congela aquí",
      content:
        "Si tienes una calculadora activa, aquí ves la mensualidad que calcula — se " +
        "guarda una COPIA exacta en el contrato, así que cambios futuros a la " +
        "calculadora no afectan ventas ya hechas. Sin una calculadora activa, no " +
        "podrás registrar la venta hasta crear una.",
    },
    {
      target: '[data-tour="contrato-documentos"]',
      title: "Documentos, aquí o después",
      content:
        "Puedes adjuntar identificación, comprobante de domicilio o la escritura " +
        "ahora mismo, o dejarlo para después desde Documentos — no bloquea el " +
        "registro del contrato.",
    },
    {
      target: '[data-tour="contrato-guardar"]',
      title: "Por último, registra",
      locale: { last: "Entendido, ya le doy clic" },
      content:
        "Dale clic al botón \"Registrar\" (no a este mensaje). El contrato queda " +
        "listo para generar su plan de pagos y su PDF — podrás editarlo después, " +
        "salvo el fraccionamiento y el lote.",
    },
  ],
};

/**
 * Restricciones: recorrido puramente informativo (sin pantalla propia), por eso no
 * lleva `route` — nunca se auto-lanza, solo se inicia a mano desde el panel de
 * Tours guiados. Cada regla está verificada contra el código (catálogo de errores /
 * app/shared/plan_limits.py / permisos por rol), no es una suposición.
 */
export const TOUR_RESTRICCIONES = {
  key: "restricciones",
  label: "Restricciones que existen",
  description: "Reglas de negocio, límites de tu plan y qué puede hacer cada rol.",
  steps: [
    {
      target: "body",
      placement: "center",
      title: "Cosas que a veces confunden",
      content:
        "Un repaso rápido de reglas que la app aplica solas, límites de tu plan y qué " +
        "puede hacer cada rol. Nada de esto es un error: es cómo está diseñada la app.",
    },
    {
      target: "body",
      placement: "center",
      title: "Un lote no se marca \"Vendido\" a mano",
      content:
        "Ese cambio solo ocurre al generar un contrato de Compraventa. Un contrato de " +
        "Reserva lo marca \"Apartado\". Si intentas cambiarlo manualmente en el lote, " +
        "la app lo rechaza.",
    },
    {
      target: "body",
      placement: "center",
      title: "Bajas que piden un paso antes",
      content:
        "No puedes archivar un fraccionamiento con ventas activas, ni dar de baja a " +
        "un usuario con clientes, contratos o lotes asignados — primero hay que " +
        "transferirlos a otra persona. Tampoco puedes eliminar al único administrador " +
        "ni a ti mismo.",
    },
    {
      target: "body",
      placement: "center",
      title: "Vender exige una calculadora activa",
      content:
        "Para registrar una venta necesitas al menos una calculadora de " +
        "financiamiento activa (Calculadora → activarla con el interruptor). Sin " +
        "eso, el formulario de contrato no te deja continuar.",
    },
    {
      target: "body",
      placement: "center",
      title: "Los límites de tu plan",
      content:
        "Cada plan tiene un tope de usuarios, fraccionamientos, lotes, formularios y " +
        "calculadoras (la prueba gratuita no tiene límites). Al alcanzarlo verás " +
        "\"Alcanzaste el límite... Mejora tu plan\". Archivar o dar de baja lo que ya " +
        "no usas libera cupo de inmediato.",
    },
    {
      target: "body",
      placement: "center",
      title: "Lo que es solo de administrador",
      content:
        "El precio, enganche, tasa de interés, plazo y el vendedor asignado de un " +
        "lote solo los edita un admin, sin importar qué acceso tenga el vendedor a " +
        "la app. Y un vendedor solo cambia el estado de SUS propios lotes, no los de " +
        "sus compañeros.",
    },
  ],
};

/**
 * Documentos: la bóveda centralizada. Un solo tour (sin waitFor): el árbol de
 * carpetas y el botón Subir existen desde que se entra a /documentos, sin
 * necesitar una acción previa del usuario.
 */
export const TOUR_DOCUMENTOS = {
  key: "documentos",
  label: "Bóveda de documentos",
  description: "Carpetas, subir archivos y dónde buscar lo que ya subiste.",
  route: "/documentos",
  steps: [
    {
      target: '[data-tour="docs-sidebar"]',
      placement: "right",
      title: "Tus carpetas",
      content:
        "\"Todos\" y \"Sin carpeta\" son vistas fijas; el resto son las carpetas que " +
        "creaste. \"+ Nueva carpeta\" abajo crea otra, y se pueden anidar.",
    },
    {
      target: '[data-tour="docs-subir"]',
      title: "Subir un documento",
      content:
        "Elige primero la carpeta destino en el árbol, luego Subir. Puedes asignarle " +
        "una categoría (contrato, identificación, escritura...) al subirlo.",
    },
    {
      target: '[data-tour="docs-buscar"]',
      title: "Buscarlo después",
      content:
        "Filtra por nombre dentro de la carpeta activa. Para buscar en todo, " +
        "selecciona \"Todos\" primero. Cada archivo tiene su propio menú para " +
        "moverlo de carpeta, verlo o descargarlo.",
    },
  ],
};

/**
 * Estado de cuenta (Reportes), parte 1: la lista de clientes. Siempre visible al
 * entrar a /reportes, así que no necesita `waitFor`.
 */
export const TOUR_REPORTES_CLIENTES = {
  key: "reportes-clientes",
  label: "Estado de cuenta",
  description: "El reporte financiero de un cliente: comportamiento, saldo, plan de pagos y PDF.",
  route: "/reportes",
  next: "reportes-detalle",
  steps: [
    {
      target: '[data-tour="rp-clientes"]',
      placement: "right",
      title: "Elige un cliente",
      content:
        "Busca por nombre, correo o teléfono. En cuanto elijas uno, se arma su " +
        "reporte completo: comportamiento de pago, contratos, saldo y plan de pagos.",
    },
  ],
};

/**
 * Estado de cuenta, parte 2: el reporte en sí. Sus anclas solo existen una vez que
 * hay un cliente seleccionado — de ahí el `waitFor` sobre la gráfica.
 */
export const TOUR_REPORTES_DETALLE = {
  key: "reportes-detalle",
  waitFor: '[data-tour="rp-comportamiento"]',
  hidden: true, // continúa reportes-clientes
  steps: [
    {
      target: '[data-tour="rp-comportamiento"]',
      title: "Comportamiento de pago",
      content:
        "Los últimos 12 meses: verde es pago puntual, rojo es vencido. Te dice de un " +
        "vistazo qué tan cumplido es este cliente.",
    },
    {
      target: '[data-tour="rp-resumen"]',
      title: "Cumplimiento y contratos",
      content:
        "Cuántas cuotas están al corriente, por vencer o vencidas, y la lista de " +
        "contratos de este cliente con su monto y estado.",
    },
    {
      target: '.rp-payments-scroll',
      title: "El plan de pagos, cuota por cuota",
      content:
        "Cada abono programado: número, fecha, monto, estado y cuándo se pagó (si ya " +
        "se pagó). Es el detalle completo detrás del resumen de arriba.",
    },
    {
      target: '[data-tour="rp-acciones"]',
      title: "Compártelo",
      content:
        "Descarga el estado de cuenta en PDF, o envíalo directo al correo " +
        "registrado del cliente — sin salir de esta pantalla.",
    },
  ],
};

/**
 * Control Financiero (Pagos): un solo tour, sin waitFor. Todo lo que explica está
 * visible desde que se entra a /pagos, en la pestaña "Amortizaciones" que abre por
 * defecto.
 */
export const TOUR_PAGOS = {
  key: "pagos",
  label: "Control financiero",
  description: "Cobros, egresos, y cómo detectar quién va atrasado.",
  route: "/pagos",
  steps: [
    {
      target: '[data-tour="pagos-kpis"]',
      title: "El panorama del mes",
      content:
        "Ingresos ya cobrados, lo pendiente por cobrar, cuánto está en mora, y tus " +
        "egresos operativos — con el flujo neto del mes.",
    },
    {
      target: '[data-tour="pagos-registrar"]',
      title: "Registrar un pago o un egreso",
      content:
        "\"Registrar pago\" aplica un abono a una cuota programada. \"Registrar " +
        "egreso\" es para gastos operativos (nómina, servicios...) — no toca ningún " +
        "contrato.",
    },
    {
      target: '[data-tour="pagos-tabs"]',
      title: "Dos vistas distintas",
      content:
        "Amortizaciones de Lotes es el calendario de cobranza por contrato. " +
        "Registro de Egresos es el historial de gastos, aparte.",
    },
    {
      target: '[data-tour="pagos-filtros"]',
      title: "Encuentra a quién le toca cobrar",
      content:
        "Los filtros Al día / Próximos / Atrasados son los que más vas a usar: " +
        "\"Atrasados\" te dice exactamente a quién llamar hoy.",
    },
  ],
};

export const TOURS = [
  TOUR_ECOSISTEMA,
  TOUR_LANDS_SELECTOR,
  TOUR_LANDS_INICIO,
  TOUR_LANDS_TABLERO,
  TOUR_LANDS_MATRIZ,
  TOUR_CALCULADORA_LISTA,
  TOUR_CALCULADORA_EDITOR,
  TOUR_CALCULADORA_PRUEBA,
  TOUR_CONTRATO_BOTON,
  TOUR_CONTRATO_FORM,
  TOUR_DOCUMENTOS,
  TOUR_REPORTES_CLIENTES,
  TOUR_REPORTES_DETALLE,
  TOUR_PAGOS,
  TOUR_RESTRICCIONES,
];
