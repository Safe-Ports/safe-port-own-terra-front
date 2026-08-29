// AUTOGENERADO por scripts/sync-errors.mjs desde shared/errors.catalog.json.
// NO EDITAR A MANO. El backend (app/errors/catalog.py) es la fuente de verdad.

export const CATALOG_VERSION = 1;

export const ERROR_CATALOG = {
  "OT-AUTH-1001": {
    "action": "Revisa el correo e inténtalo con uno válido.",
    "domain": "AUTH",
    "http_status": 400,
    "message": "El correo no existe o su dominio no puede recibir mensajes.",
    "name": "AUTH_EMAIL_UNDELIVERABLE",
    "severity": "warning"
  },
  "OT-AUTH-2001": {
    "action": "Verifica tus datos e inténtalo de nuevo.",
    "domain": "AUTH",
    "http_status": 401,
    "message": "Correo o contraseña incorrectos.",
    "name": "AUTH_INVALID_CREDENTIALS",
    "severity": "warning"
  },
  "OT-AUTH-2003": {
    "action": "Si crees que es un error, contacta a tu administrador.",
    "domain": "AUTH",
    "http_status": 403,
    "message": "No tienes permiso para esta acción.",
    "name": "AUTH_FORBIDDEN",
    "severity": "warning"
  },
  "OT-AUTH-2004": {
    "action": "Contacta a tu administrador para reactivarlo.",
    "domain": "AUTH",
    "http_status": 403,
    "message": "Tu usuario está inactivo.",
    "name": "AUTH_INACTIVE_USER",
    "severity": "warning"
  },
  "OT-AUTH-2005": {
    "action": "Revisa tu bandeja de entrada y verifica tu correo.",
    "domain": "AUTH",
    "http_status": 403,
    "message": "Confirma tu correo antes de iniciar sesión.",
    "name": "AUTH_EMAIL_NOT_VERIFIED",
    "severity": "warning"
  },
  "OT-AUTH-2010": {
    "action": "Inicia sesión otra vez para continuar.",
    "domain": "AUTH",
    "http_status": 401,
    "message": "Tu sesión expiró.",
    "name": "AUTH_INVALID_TOKEN",
    "severity": "warning"
  },
  "OT-AUTH-2011": {
    "action": "Solicita un nuevo enlace de verificación.",
    "domain": "AUTH",
    "http_status": 400,
    "message": "El enlace de verificación no es válido o expiró.",
    "name": "AUTH_INVALID_VERIFICATION_TOKEN",
    "severity": "warning"
  },
  "OT-AUTH-2012": {
    "action": "Solicita uno nuevo desde \"Olvidé mi contraseña\".",
    "domain": "AUTH",
    "http_status": 400,
    "message": "El enlace para restablecer la contraseña expiró.",
    "name": "AUTH_INVALID_RESET_TOKEN",
    "severity": "warning"
  },
  "OT-AUTH-2013": {
    "action": "Vuelve a escribirla; si no la recuerdas, usa \"Olvidé mi contraseña\".",
    "domain": "AUTH",
    "http_status": 400,
    "message": "Tu contraseña actual no es correcta.",
    "name": "AUTH_WRONG_CURRENT_PASSWORD",
    "severity": "warning"
  },
  "OT-AUTH-2014": {
    "action": "Elige una distinta.",
    "domain": "AUTH",
    "http_status": 400,
    "message": "La nueva contraseña es igual a la actual.",
    "name": "AUTH_SAME_PASSWORD",
    "severity": "warning"
  },
  "OT-CALC-1001": {
    "action": "Revisa la sintaxis: solo se permiten números, variables, + - * / % ^, paréntesis y funciones (min, max, abs, round, floor, ceil, sqrt, pow).",
    "domain": "CALC",
    "http_status": 400,
    "message": "La fórmula no es válida.",
    "name": "CALC_INVALID_FORMULA",
    "severity": "warning"
  },
  "OT-CALC-1002": {
    "action": "Captura un valor para cada variable detectada.",
    "domain": "CALC",
    "http_status": 400,
    "message": "Falta el valor de una variable de la fórmula.",
    "name": "CALC_MISSING_VARIABLE",
    "severity": "warning"
  },
  "OT-CALC-1003": {
    "action": "Revisa divisiones por cero o valores fuera de rango.",
    "domain": "CALC",
    "http_status": 400,
    "message": "La fórmula produce un resultado no válido.",
    "name": "CALC_BAD_RESULT",
    "severity": "warning"
  },
  "OT-CALC-3001": {
    "action": "Activa una calculadora antes de continuar.",
    "domain": "CALC",
    "http_status": 409,
    "message": "No hay una calculadora activa para este módulo.",
    "name": "CALC_NO_ACTIVE",
    "severity": "warning"
  },
  "OT-CLI-1001": {
    "action": "Revísalo: deben ser 12 o 13 caracteres.",
    "domain": "CLI",
    "http_status": 400,
    "message": "El RFC no tiene un formato válido.",
    "name": "CLI_INVALID_RFC",
    "severity": "warning"
  },
  "OT-CLI-3010": {
    "action": "Agrega un correo o teléfono al cliente.",
    "domain": "CLI",
    "http_status": 400,
    "message": "El cliente no tiene datos de contacto.",
    "name": "CLI_NO_CONTACT",
    "severity": "warning"
  },
  "OT-CLI-3020": {
    "action": "Crea o activa el contrato necesario antes de continuar.",
    "domain": "CLI",
    "http_status": 409,
    "message": "Se requiere un contrato activo para esta etapa.",
    "name": "CLI_CONTRACT_REQUIRED",
    "severity": "warning"
  },
  "OT-CON-1001": {
    "action": "Indica la fecha de expiración de la reserva.",
    "domain": "CON",
    "http_status": 400,
    "message": "Falta la fecha de expiración.",
    "name": "CON_MISSING_EXPIRATION",
    "severity": "warning"
  },
  "OT-CON-1002": {
    "action": "Debe ser entre 7 y 60 días desde la fecha del contrato.",
    "domain": "CON",
    "http_status": 400,
    "message": "La fecha de expiración no es válida.",
    "name": "CON_INVALID_EXPIRATION",
    "severity": "warning"
  },
  "OT-CON-3001": {
    "action": "Cierra o cancela los contratos antes de continuar.",
    "domain": "CON",
    "http_status": 409,
    "message": "Este registro tiene contratos activos.",
    "name": "CON_HAS_ACTIVE",
    "severity": "warning"
  },
  "OT-CON-3002": {
    "action": "Revisa el estado actual del contrato.",
    "domain": "CON",
    "http_status": 409,
    "message": "No se puede cambiar el contrato a ese estado.",
    "name": "CON_INVALID_STATUS",
    "severity": "warning"
  },
  "OT-CON-3003": {
    "action": "Debes esperar al menos 30 días para esta acción.",
    "domain": "CON",
    "http_status": 409,
    "message": "El contrato se canceló hace muy poco.",
    "name": "CON_TOO_RECENT",
    "severity": "warning"
  },
  "OT-CON-3004": {
    "action": "Reasigna el lote a un vendedor activo o elige otro.",
    "domain": "CON",
    "http_status": 409,
    "message": "El vendedor asignado está deshabilitado.",
    "name": "CON_SELLER_INACTIVE",
    "severity": "warning"
  },
  "OT-CON-3005": {
    "action": "Rechaza el contrato y arma uno nuevo sobre otro lote.",
    "domain": "CON",
    "http_status": 409,
    "message": "El lote ya se vendió mientras este contrato esperaba aprobación.",
    "name": "CON_LOT_TAKEN_MEANWHILE",
    "severity": "warning"
  },
  "OT-CON-3006": {
    "action": "Actualiza la lista: alguien más pudo haberlo resuelto.",
    "domain": "CON",
    "http_status": 409,
    "message": "Este contrato ya no está esperando aprobación.",
    "name": "CON_NOT_PENDING",
    "severity": "warning"
  },
  "OT-DOC-1010": {
    "action": "Sube uno más pequeño.",
    "domain": "DOC",
    "http_status": 400,
    "message": "El archivo es demasiado grande.",
    "name": "DOC_FILE_TOO_LARGE",
    "severity": "warning"
  },
  "OT-DOC-1011": {
    "action": "Verifica el archivo y vuelve a subirlo.",
    "domain": "DOC",
    "http_status": 400,
    "message": "El archivo está vacío.",
    "name": "DOC_EMPTY_FILE",
    "severity": "warning"
  },
  "OT-DOC-1012": {
    "action": "Usa un formato válido.",
    "domain": "DOC",
    "http_status": 400,
    "message": "Tipo de archivo no permitido.",
    "name": "DOC_INVALID_FILE_TYPE",
    "severity": "warning"
  },
  "OT-DOC-1013": {
    "action": "Revisa que no esté dañado e inténtalo de nuevo.",
    "domain": "DOC",
    "http_status": 400,
    "message": "No pudimos leer el archivo.",
    "name": "DOC_UNREADABLE_FILE",
    "severity": "warning"
  },
  "OT-DOC-1020": {
    "action": "Revisa el tipo de entidad e inténtalo de nuevo.",
    "domain": "DOC",
    "http_status": 400,
    "message": "Tipo de entidad no válido.",
    "name": "DOC_INVALID_ENTITY_TYPE",
    "severity": "warning"
  },
  "OT-DOC-1021": {
    "action": "Especifica la entidad del documento.",
    "domain": "DOC",
    "http_status": 400,
    "message": "Falta indicar a qué registro pertenece.",
    "name": "DOC_MISSING_ENTITY_ID",
    "severity": "warning"
  },
  "OT-DOC-1022": {
    "action": "Elige otra carpeta destino.",
    "domain": "DOC",
    "http_status": 400,
    "message": "No puedes mover una carpeta dentro de sí misma.",
    "name": "DOC_INVALID_PARENT",
    "severity": "warning"
  },
  "OT-DOC-3001": {
    "action": "Usa otro nombre para la carpeta.",
    "domain": "DOC",
    "http_status": 409,
    "message": "Ya existe una carpeta con ese nombre.",
    "name": "DOC_DUPLICATE_FOLDER",
    "severity": "warning"
  },
  "OT-DOC-3002": {
    "action": "Las carpetas creadas automáticamente por app no se pueden eliminar.",
    "domain": "DOC",
    "http_status": 403,
    "message": "Esta es una carpeta de sistema.",
    "name": "DOC_SYSTEM_FOLDER",
    "severity": "warning"
  },
  "OT-INM-3001": {
    "action": "Cierra o transfiere las ventas antes de archivarlo.",
    "domain": "INM",
    "http_status": 409,
    "message": "No se puede archivar el inmueble: tiene ventas activas.",
    "name": "INM_HAS_SOLD_LOTS",
    "severity": "warning"
  },
  "OT-LOT-1001": {
    "action": "El estado \"vendido\" solo se asigna mediante contrato.",
    "domain": "LOT",
    "http_status": 400,
    "message": "Ese cambio de estado del lote no está permitido.",
    "name": "LOT_FORBIDDEN_TRANSITION",
    "severity": "warning"
  },
  "OT-LOT-1002": {
    "action": "Indica una fecha de vencimiento futura al apartar.",
    "domain": "LOT",
    "http_status": 400,
    "message": "El vencimiento del apartado no es válido.",
    "name": "LOT_RESERVATION_INVALID",
    "severity": "warning"
  },
  "OT-LOT-1003": {
    "action": "Busca o crea el cliente antes de confirmar el apartado.",
    "domain": "LOT",
    "http_status": 400,
    "message": "Falta indicar el cliente interesado.",
    "name": "LOT_CLIENT_REQUIRED",
    "severity": "warning"
  },
  "OT-LOT-3002": {
    "action": "Elige otro lote disponible.",
    "domain": "LOT",
    "http_status": 409,
    "message": "El lote no está disponible.",
    "name": "LOT_NOT_AVAILABLE",
    "severity": "warning"
  },
  "OT-LOT-3003": {
    "action": "Elige otro lote.",
    "domain": "LOT",
    "http_status": 409,
    "message": "El lote ya fue vendido.",
    "name": "LOT_SOLD",
    "severity": "warning"
  },
  "OT-LOT-3004": {
    "action": "Cancela el contrato para liberarlo: ahí se define qué pasa con lo ya cobrado.",
    "domain": "LOT",
    "http_status": 409,
    "message": "El lote tiene un contrato vigente.",
    "name": "LOT_HAS_LIVE_CONTRACT",
    "severity": "warning"
  },
  "OT-LOT-3010": {
    "action": "Usa un código de lote distinto.",
    "domain": "LOT",
    "http_status": 409,
    "message": "El código de lote ya existe en este inmueble.",
    "name": "LOT_DUPLICATE_CODE",
    "severity": "warning"
  },
  "OT-NET-9001": {
    "action": "Puede ser tu conexión o que el servicio no esté disponible por el momento. Intenta de nuevo en unos segundos.",
    "domain": "NET",
    "http_status": null,
    "message": "No pudimos conectar con el servidor.",
    "name": "NET_OFFLINE",
    "severity": "error"
  },
  "OT-ORG-3001": {
    "action": "Recarga la lista o verifica que siga existiendo.",
    "domain": "ORG",
    "http_status": 404,
    "message": "No encontramos el fraccionamiento.",
    "name": "ORG_NOT_FOUND",
    "severity": "warning"
  },
  "OT-ORG-3011": {
    "action": "Usa un código distinto.",
    "domain": "ORG",
    "http_status": 409,
    "message": "Ya existe un registro con ese código.",
    "name": "ORG_DUPLICATE_CODE",
    "severity": "warning"
  },
  "OT-PAY-3001": {
    "action": "No es necesario volver a procesarlo.",
    "domain": "PAY",
    "http_status": 409,
    "message": "El pago ya fue procesado anteriormente.",
    "name": "PAY_ALREADY_PROCESSED",
    "severity": "warning"
  },
  "OT-PAY-3002": {
    "action": "Revisa su estado antes de continuar.",
    "domain": "PAY",
    "http_status": 409,
    "message": "Este pago no se puede modificar.",
    "name": "PAY_INVALID_STATUS",
    "severity": "warning"
  },
  "OT-PAY-3003": {
    "action": "Revisa el monto: no puede exceder lo que falta por cobrar.",
    "domain": "PAY",
    "http_status": 409,
    "message": "El abono supera el saldo de la cuota.",
    "name": "PAY_OVERPAYMENT",
    "severity": "warning"
  },
  "OT-RPT-1010": {
    "action": "Agrega el ID de lote en esa fila.",
    "domain": "RPT",
    "http_status": 400,
    "message": "Una fila no tiene identificador de lote.",
    "name": "RPT_ROW_MISSING_CODE",
    "severity": "warning"
  },
  "OT-RPT-1011": {
    "action": "Indica el inmueble en esa fila.",
    "domain": "RPT",
    "http_status": 400,
    "message": "Una fila no tiene inmueble asociado.",
    "name": "RPT_ROW_MISSING_INMUEBLE",
    "severity": "warning"
  },
  "OT-RPT-1012": {
    "action": "Revisa el formato de los datos de esa fila.",
    "domain": "RPT",
    "http_status": 400,
    "message": "No se pudo procesar una fila del archivo.",
    "name": "RPT_ROW_PARSE_ERROR",
    "severity": "warning"
  },
  "OT-RPT-1013": {
    "action": "Usa un estado de lote permitido en esa fila.",
    "domain": "RPT",
    "http_status": 400,
    "message": "El estado de una fila no es válido.",
    "name": "RPT_ROW_INVALID_STATUS",
    "severity": "warning"
  },
  "OT-RPT-1014": {
    "action": "Revisa los importes/medidas de esa fila.",
    "domain": "RPT",
    "http_status": 400,
    "message": "Un valor numérico de una fila no es válido.",
    "name": "RPT_ROW_INVALID_DECIMAL",
    "severity": "warning"
  },
  "OT-RPT-1030": {
    "action": "Descarga la plantilla y vuelve a generarlo.",
    "domain": "RPT",
    "http_status": 400,
    "message": "El archivo CSV no es válido.",
    "name": "RPT_INVALID_CSV",
    "severity": "warning"
  },
  "OT-RPT-1031": {
    "action": "Agrega la columna o especifica el fraccionamiento.",
    "domain": "RPT",
    "http_status": 400,
    "message": "Falta la columna 'Fraccionamiento'.",
    "name": "RPT_FRACC_COLUMN_REQUIRED",
    "severity": "warning"
  },
  "OT-RPT-1032": {
    "action": "Revisa que el archivo tenga todas las columnas requeridas.",
    "domain": "RPT",
    "http_status": 400,
    "message": "Falta una columna obligatoria en el archivo.",
    "name": "RPT_MISSING_COLUMN",
    "severity": "warning"
  },
  "OT-RPT-1033": {
    "action": "Divide el archivo en lotes más pequeños.",
    "domain": "RPT",
    "http_status": 400,
    "message": "El archivo tiene demasiadas filas.",
    "name": "RPT_TOO_MANY_ROWS",
    "severity": "warning"
  },
  "OT-RPT-1035": {
    "action": "En Excel presiona Ctrl+Fin para ver hasta dónde llega el rango usado, selecciona esas filas y columnas vacías, elimínalas (clic derecho → Eliminar, no solo Suprimir contenido), guarda y vuelve a subirlo.",
    "domain": "RPT",
    "http_status": 400,
    "message": "El archivo tiene formato (bordes, colores) aplicado mucho más allá de tus datos reales.",
    "name": "RPT_PHANTOM_RANGE",
    "severity": "warning"
  },
  "OT-SUB-2001": {
    "action": "Regulariza el pago para continuar.",
    "domain": "SUB",
    "http_status": 402,
    "message": "La suscripción no está al corriente o expiró.",
    "name": "SUB_NOT_PAID",
    "severity": "warning"
  },
  "OT-SUB-3001": {
    "action": "Reactívala para volver a usar el servicio.",
    "domain": "SUB",
    "http_status": 403,
    "message": "La suscripción está cancelada.",
    "name": "SUB_CANCELLED",
    "severity": "warning"
  },
  "OT-SUB-4001": {
    "action": "Mejora tu plan para agregar más.",
    "domain": "SUB",
    "http_status": 403,
    "message": "Alcanzaste el límite de tu plan.",
    "name": "SUB_QUOTA_EXCEEDED",
    "severity": "warning"
  },
  "OT-SYS-1000": {
    "action": "Revisa los campos marcados e inténtalo otra vez.",
    "domain": "SYS",
    "http_status": 422,
    "message": "Algunos datos no son válidos.",
    "name": "SYS_VALIDATION",
    "severity": "warning"
  },
  "OT-SYS-3000": {
    "action": "Verifica el enlace o vuelve al inicio.",
    "domain": "SYS",
    "http_status": 404,
    "message": "No encontramos lo que buscabas.",
    "name": "SYS_NOT_FOUND",
    "severity": "warning"
  },
  "OT-SYS-4000": {
    "action": "Espera un momento antes de volver a intentar.",
    "domain": "SYS",
    "http_status": 429,
    "message": "Demasiadas solicitudes.",
    "name": "SYS_RATE_LIMIT",
    "severity": "warning"
  },
  "OT-SYS-9000": {
    "action": "Si vuelve a pasar, repórtalo con el código y la Ref.",
    "domain": "SYS",
    "http_status": 500,
    "message": "Ocurrió un error inesperado. Ya lo registramos.",
    "name": "SYS_INTERNAL",
    "severity": "fatal"
  },
  "OT-SYS-9001": {
    "action": "Espera unos minutos e intenta de nuevo.",
    "domain": "SYS",
    "http_status": 503,
    "message": "El servicio no está disponible por el momento.",
    "name": "SYS_UNAVAILABLE",
    "severity": "error"
  },
  "OT-UI-9001": {
    "action": "Recarga la página; si sigue, repórtalo con la Ref.",
    "domain": "UI",
    "http_status": null,
    "message": "Algo se rompió en la pantalla.",
    "name": "UI_CRASH",
    "severity": "error"
  },
  "OT-USER-1001": {
    "action": "Verifica que la app sea la misma en la URL y el formulario.",
    "domain": "USER",
    "http_status": 400,
    "message": "La app indicada no coincide con la de la solicitud.",
    "name": "USER_APP_KEY_MISMATCH",
    "severity": "warning"
  },
  "OT-USER-1002": {
    "action": "Elige una app vertical válida.",
    "domain": "USER",
    "http_status": 400,
    "message": "Solo se pueden asignar apps verticales.",
    "name": "USER_APP_NOT_ASSIGNABLE",
    "severity": "warning"
  },
  "OT-USER-1003": {
    "action": "Elige un rol permitido para la app.",
    "domain": "USER",
    "http_status": 400,
    "message": "El rol no es válido para esta app.",
    "name": "USER_APP_ROLE_INVALID",
    "severity": "warning"
  },
  "OT-USER-1004": {
    "action": "Reactívalo antes de continuar.",
    "domain": "USER",
    "http_status": 400,
    "message": "El usuario destino no está activo.",
    "name": "USER_INACTIVE_TARGET",
    "severity": "warning"
  },
  "OT-USER-1005": {
    "action": "Dale acceso a la app correspondiente antes de transferirle la cartera.",
    "domain": "USER",
    "http_status": 400,
    "message": "El usuario destino no tiene acceso a esos datos.",
    "name": "USER_TARGET_NO_APP_ACCESS",
    "severity": "warning"
  },
  "OT-USER-2001": {
    "action": "Pide a otro administrador que la realice.",
    "domain": "USER",
    "http_status": 403,
    "message": "No puedes realizar esta acción sobre tu propio usuario.",
    "name": "USER_CANNOT_MODIFY_SELF",
    "severity": "warning"
  },
  "OT-USER-3010": {
    "action": "Usa un correo distinto.",
    "domain": "USER",
    "http_status": 409,
    "message": "Ya existe un usuario con ese correo.",
    "name": "USER_EMAIL_EXISTS",
    "severity": "warning"
  },
  "OT-USER-3020": {
    "action": "Asigna otro administrador antes de eliminarlo.",
    "domain": "USER",
    "http_status": 409,
    "message": "No puedes eliminar al último administrador.",
    "name": "USER_LAST_ADMIN",
    "severity": "warning"
  },
  "OT-USER-3030": {
    "action": "Transfiere sus clientes/contratos antes de eliminarlo.",
    "domain": "USER",
    "http_status": 409,
    "message": "El usuario tiene datos asignados.",
    "name": "USER_HAS_ASSIGNED_DATA",
    "severity": "warning"
  }
};
