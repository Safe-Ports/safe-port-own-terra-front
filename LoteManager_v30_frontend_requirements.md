# LoteManager v30 — Especificación Funcional del Frontend

Fuente analizada: `/Users/fernandoestrada/Downloads/LoteManager_v30 (14) (1).html`

Este documento resume lo que realmente contiene el HTML original y lo traduce a una especificación de frontend para reconstrucción moderna sin perder funcionalidad ni diseño.

## 1. Objetivo del producto

LoteManager es un sistema inmobiliario orientado a:

- gestión de lotes y fraccionamientos
- CRM de clientes y prospectos
- contratos de compraventa, arrendamiento y reserva
- control de pagos y cobranza
- gestión documental vinculada a clientes, contratos y lotes
- cálculo financiero y amortización
- seguimiento operativo diario para administradores y vendedores

El frontend no es una landing ni un dashboard genérico. Es una aplicación operativa con navegación interna, estados persistentes, modales de trabajo, vistas de gestión y flujos cruzados entre módulos.

## 2. Alcance funcional real del HTML

El HTML original incluye estas vistas principales:

- `Mi Día`
- `Dashboard`
- `Carga de Lotes`
- `Fraccionamientos`
- `Clientes & CRM`
- `Contratos`
- `Pagos`
- `Documentos`
- `Calculadora`
- `Configuración` como placeholder visual en sidebar

También incluye:

- login local con persistencia opcional
- búsqueda global tipo Spotlight con `⌘K`
- generación de estado de cuenta imprimible por cliente
- carga documental con preview inline
- editor de lotes manual y constructor de fraccionamientos
- modo de carga manual y modo CAD/archivo
- exportación de fraccionamiento a visor HTML standalone tipo `GeoLotes`

## 3. Diseño visual y sistema de estilos

### 3.1 Paleta principal

Variables detectadas en el HTML:

| Token | Color | Uso |
|---|---|---|
| `--bg` | `#F4F1EB` | fondo general cálido |
| `--sf` | `#FFFDF8` | superficie principal |
| `--sf2` | `#F0EDE5` | superficie secundaria |
| `--bd` | `#DDD8CE` | bordes |
| `--forest` | `#2A7A50` | color principal positivo |
| `--forest-lt` | `#3A9A68` | variante verde |
| `--forest-pale` | `#D4EAE0` | fondos positivos suaves |
| `--tan` | `#2A7A50` | en el HTML apunta al mismo verde |
| `--tan-dk` | `#1A5C3C` | verde profundo |
| `--tan-lt` | `#D4EAE0` | fondo verde suave |
| `--navy` | `#183024` | encabezados oscuros, contraste |
| `--brown` | `#5C5040` | tono tierra oscuro |
| `--brown-lt` | `#7A6A58` | texto secundario tierra |
| `--brown-pale` | `#EDE8DE` | fondos neutros |
| `--red` | `#C0392B` | alertas y mora |
| `--red-lt` | `#FDECEA` | fondo de error/alerta |
| `--grn` | `#1A7A45` | confirmaciones |
| `--grn-lt` | `#D4EAE0` | fondo confirmación |
| `--amb` | `#B07820` | apartados, warning |
| `--amb-lt` | `#FEF3E2` | fondo warning |
| `--sky` | `#1A5280` | contratos, info, documentos |
| `--sky-lt` | `#E8F1FA` | fondo info |
| `--tx` | `#1A1410` | texto principal |
| `--tx2` | `#3D3028` | texto secundario |
| `--mu` | `#8C8070` | texto tenue |

### 3.2 Paleta secundaria del editor de lotes

El módulo `Carga de Lotes` usa una subpaleta azul distinta:

- `#1B5FA8`
- `#2D7DD2`
- `#C2D9F0`
- `#E0EEFF`
- `#E8F2FC`
- `#0C1F3A`
- `#7A9AB8`

### 3.3 Tipografía

- `Playfair Display`: títulos editoriales y encabezados importantes
- `DM Sans`: UI general
- `Inter`: reportes y tablas
- `JetBrains Mono`: atajos o etiquetas técnicas

### 3.4 Lenguaje visual

El frontend debe conservar:

- sidebar fija con secciones
- topbar con búsqueda global y acciones contextuales
- tarjetas claras con bordes suaves
- badges de estado
- tablas limpias
- módulos en tarjetas
- modales oscuros sobre overlay
- estética CRM/ERP premium en tonos tierra y verde
- uso frecuente de iconografía emoji como parte del lenguaje funcional

## 4. Arquitectura funcional del frontend

### 4.1 Layout global

El shell base se compone de:

- sidebar izquierda
- topbar superior
- área de contenido con vistas intercambiables
- modales superpuestos
- sistema de toasts

### 4.2 Navegación principal

Botones reales del sidebar:

- `Dashboard`
- `Mi Día`
- `Carga de Lotes`
- `Fraccionamientos`
- `Clientes & CRM`
- `Contratos`
- `Pagos`
- `Documentos`
- `Calculadora`
- `Configuración`

### 4.3 Acciones contextuales en topbar

En `Carga de Lotes`:

- contador de lotes
- `❓ Ayuda`
- `🗂 Nuevo Plano`
- `🏘️ Crear Fraccionamiento`

En `Clientes`:

- `+ Nuevo Cliente`

En `Contratos`:

- `+ Generar Contrato`

Siempre visible:

- búsqueda global `Buscar en todo el sistema...`
- atajo visual `⌘K`

## 5. Persistencia, sesión y origen de datos

El HTML actual es local-first y guarda información en `localStorage`.

### 5.1 Keys detectadas

- `lm_clients`
- `lm_contracts`
- `lm_payments`
- `lm_documents`
- `lm_session`
- `lm_seed_version`

### 5.2 Seed data incluida

El HTML ya trae datos demo reales para:

- clientes
- contratos
- pagos generados automáticamente
- un fraccionamiento demo

### 5.3 Implicaciones para el frontend nuevo

El frontend debe estar preparado para dos modos:

- modo demo/local usando persistencia local
- modo API futura con FastAPI/JWT

La interfaz no debe asumir que todo viene del backend. Debe soportar seed data, estados vacíos, modo offline parcial y migración posterior a API.

## 6. Autenticación actual

### 6.1 Usuarios demo reales

- `admin` / `admin123`
- `admin@lotemanager.mx` / `admin123`
- `vendedor` / `vende123`

### 6.2 Comportamiento

- valida usuario y contraseña
- muestra error si faltan campos
- muestra estado `Verificando...`
- puede recordar sesión
- si la sesión existe, entra directo
- al iniciar sesión abre `Mi Día`
- al cerrar sesión elimina `lm_session`

### 6.3 Requisito de frontend

Debe existir:

- pantalla de login
- estado loading
- errores visuales
- persistencia opcional
- soporte de roles `Admin` y `Vendedor`

## 7. Modelos de negocio mínimos

### 7.1 Cliente

Campos identificados:

- `id`
- `name`
- `phone`
- `email`
- `type`: `buyer`, `tenant`, `lead`
- `paidM`
- `totalM`
- `monthlyAmt`
- `notes`
- `initials`
- `color`
- `status`
- `seller`

### 7.2 Contrato

Campos identificados:

- `id`
- `num`
- `lot`
- `clientId`
- `type`: `sale`, `rent`, `reserve`
- `date`
- `amount`
- `paidM`
- `totalM`
- `notes`
- `status`

### 7.3 Pago

Campos identificados:

- `id`
- `clientId`
- `clientName`
- `contractId`
- `contractNum`
- `cuota`
- `amount`
- `dueDate`
- `paidDate`
- `status`: `pending`, `overdue`, `paid`
- `notes`

### 7.4 Documento

Campos identificados:

- `id`
- `name`
- `size`
- `mimeType`
- `data`
- `uploadedAt`
- `category`
- `status`
- `linkedTo`
- `notes`
- `uploadedBy`

### 7.5 Lote

Campos identificados:

- `id`
- `num`
- `name`
- `points`
- `status`: `available`, `sold`, `reserved`
- `area`
- `price`
- `priceF`
- `interest`
- `dp`
- `months`
- `seller`
- `buyer`
- `buyerId`
- `payments`

### 7.6 Fraccionamiento

Campos identificados:

- `id`
- `name`
- `lots`
- `bg`
- `avail`
- `sold`
- `res`
- `minX`
- `minY`
- `maxX`
- `maxY`

## 8. Reglas de negocio transversales

### 8.1 Pagos

- un pago `pending` pasa a `overdue` automáticamente si la fecha límite ya venció
- `quickPay` marca el pago como `paid` y registra la fecha actual
- los pagos próximos son los que vencen en 7 días
- la cartera activa se calcula con pendientes + cobrados

### 8.2 Contratos

- tipos válidos: compraventa, arrendamiento, reserva
- el avance se expresa como porcentaje `paidM / totalM`
- un contrato puede vincular documentos
- un contrato debe poder abrir expediente de cliente

### 8.3 Clientes

- si `type === lead`, el cliente es prospecto
- si no es lead y `paidM === 0`, el HTML le asigna estado `reserved`
- si el cliente tiene pagos vencidos, se trata como cuenta con mora

### 8.4 Documentos

- se pueden vincular a `contract`, `client` o `lot`
- soportan categorías
- soportan preview inline
- soportan descarga
- soportan eliminación
- el sistema sugiere categoría por nombre de archivo
- avisa si el archivo supera 5 MB

### 8.5 Amortización

- se usa fórmula de pago amortizado mensual
- por defecto el cálculo financiero parte de 20% de enganche y 80% financiado
- tasa base usada repetidamente: `12% anual`
- plazo por defecto: `96 meses`

## 9. Módulos y funcionalidades requeridas

## 9.1 Mi Día

Es la vista inicial real del sistema.

### Objetivo

Entregar una consola operativa diaria distinta por rol.

### Comportamiento

- saludo dinámico por hora
- fecha larga en español
- modo `Admin`
- modo `Vendedor`
- KPIs adaptados al rol
- lista de tareas priorizadas
- actividad reciente
- próximos vencimientos
- para admin, pulso del equipo

### KPIs admin

- tareas críticas
- ingresos del mes
- equipo activo
- pagos vencidos

### KPIs vendedor

- mis tareas hoy
- pagos por cobrar
- mis clientes
- comisión proyectada al 3%

### Tareas automáticas admin

- lotes apartados sin avance
- pagos vencidos del equipo
- prospectos sin contactar
- lotes sin vendedor asignado
- contratos sin documentos

### Tareas automáticas vendedor

- llamar clientes con pago vencido
- reservas por vencer
- dar seguimiento a prospectos
- recordar pagos próximos

### Botones/acciones

- `Ver`
- `Gestionar`
- `Asignar`
- `Llamar`
- `Acciones`
- `Marcar ✓`
- `Recordar`

Cada uno debe navegar a la vista correcta o lanzar la acción rápida correspondiente.

## 9.2 Dashboard

### Objetivo

Vista ejecutiva con KPIs, ventas, alertas y contratos recientes.

### Componentes

- KPIs superiores
- gráfica de ventas mensuales
- resumen del año
- donut de portafolio
- alertas
- top clientes
- contratos recientes

### KPIs reales

- fraccionamientos activos
- ventas del año
- ingresos del año
- pagos vencidos

### Botones/acciones

- cambiar año `‹` y `›`
- `Ver todos →` en contratos recientes
- hover de barras con tooltip

### Lógica

- agrupa ventas por mes usando fecha del contrato
- si no hay datos del año, muestra demo para evitar gráfico vacío
- calcula mejor mes
- calcula promedio mensual

## 9.3 Carga de Lotes

Es uno de los módulos más complejos del HTML.

### Objetivo

Permitir crear fraccionamientos desde plano o desde estructura tabular.

### Pantalla 1: selector de modo

Opciones:

- `Carga Manual`
- `Carga Automatica CAD`

### Botones/acciones

- `Abrir editor →`
- `Subir archivo CAD →`

### Pantalla 2: carga de mapa

Funciones:

- drag and drop de imagen
- click para cargar imagen
- aceptar `JPG`, `PNG`, `WEBP`
- continuar sin imagen
- cambiar modo

### Botones/acciones

- `← Cambiar modo`
- `Continuar sin imagen`

### Pantalla 3: editor dividido

Panel izquierdo:

- preview del plano
- estado vacío si no hay imagen
- cambiar imagen

Panel derecho:

- tablero de lotes
- alta de secciones
- carga por Excel/CSV
- demo rápida
- creación de fraccionamiento

### Botones/acciones del builder

- `← Cambiar mapa`
- `🏘️ Crear Fraccionamiento`
- `+ Sección`
- `📋 Subir`
- `⚡ Cargar ejemplo rápido`
- `📂 Subir imagen`
- `🖼 Cambiar imagen`

### Editor legacy incluido

El HTML todavía contiene editor manual con herramientas:

- seleccionar
- pan
- dibujar
- rectángulo
- editar datos de lote
- eliminar lote
- crear fraccionamiento

### Requisitos funcionales del lote

Debe permitir editar:

- nombre
- número
- estado
- superficie
- precio contado
- precio financiado
- interés
- enganche

## 9.4 Fraccionamientos

### Objetivo

Visualizar fraccionamientos creados y operar sobre lotes.

### Modos detectados

- estado vacío inicial
- galería de fraccionamientos
- mapa de fraccionamiento individual

### Vista del mapa

Debe incluir:

- filtros por estado
- búsqueda
- detalle lateral del lote
- minimapa o fondo del plano si existe
- selección visual del lote
- exportación

### Botones/acciones

- `← Todos`
- `✏ Editar`
- `⬇ Exportar`
- click sobre lote
- acciones desde sidebar/galería

### Regla clave

`Crear Fraccionamiento` solo funciona si ya existen lotes configurados.

## 9.5 Clientes & CRM

### Objetivo

Administrar clientes, prospectos y expediente del cliente.

### Estructura

- panel izquierdo con lista
- buscador
- filtros por tipo
- botón nuevo
- panel derecho con detalle

### Filtros

- `Todos`
- `Compradores`
- `Arrendatarios`
- `Prospectos`

### Expediente del cliente

Debe mostrar:

- avatar e iniciales
- datos de contacto
- tipo y estatus
- resumen financiero
- contratos vinculados
- progreso de pagos
- notas
- acciones
- documentos vinculados

### Botones/acciones

- `+ Nuevo`
- `✏ Editar`
- `💬 Mensaje`
- `+ Crear Reserva` si es prospecto
- `⚠ Recordatorio` si tiene mora
- `📄 Nuevo Contrato`
- `🖨 Estado de Cuenta` si no es prospecto
- click sobre contrato vinculado
- `+ Subir` documentos del cliente

### CRUD de cliente

Debe existir modal para:

- crear
- editar
- eliminar

Campos mínimos:

- nombre
- teléfono
- email
- tipo
- pagos hechos
- total de pagos
- mensualidad
- notas

## 9.6 Contratos

### Objetivo

Repositorio de contratos con acciones sobre expediente y documentos.

### Tabla real

Columnas:

- N° Contrato
- Tipo
- Propiedad
- Cliente
- Monto Total
- Avance
- Estado
- Acciones

### Botones/acciones

- `+ Generar Contrato`
- `Editar`
- `📁` subir documento al contrato
- `🖨` abrir estado de cuenta del cliente
- `⬇ PDF`

### CRUD de contrato

Debe existir modal para:

- crear
- editar
- eliminar

Campos mínimos:

- número de contrato
- lote
- cliente
- tipo
- fecha
- monto
- pagos realizados
- plazo total
- notas

## 9.7 Pagos

### Objetivo

Gestionar cobranza, mora, próximos vencimientos y registro de cuotas.

### KPIs reales

- pagos vencidos
- vencen en 7 días
- pendientes totales
- pagos recibidos
- cartera total activa

### Filtros

- `Todos`
- `⚠ Vencidos`
- `⏰ Próximos (7 días)`
- `Pendientes`
- `Pagados`

### Tabla real

Columnas:

- Cliente
- Contrato
- Cuota #
- Monto
- Fecha límite
- Estado
- Días
- Acciones

### Timeline adicional

Debe existir una sección de próximos vencimientos a 30 días.

### Botones/acciones

- `+ Registrar Pago`
- `✓ Pagar`
- `✏`
- `📲` para recordatorio en vencidos
- CTA del banner de vencidos
- CTA del banner de próximos
- `✓ Pagar` también desde timeline

### Modal de pago

Debe permitir:

- elegir cliente
- filtrar contratos del cliente
- elegir cuota
- autocalcular monto
- autocalcular fecha
- elegir estatus
- agregar notas
- ver preview de amortización de la cuota
- editar o eliminar registro existente

## 9.8 Gestión Documental

### Objetivo

Centralizar todos los archivos vinculados al negocio.

### Categorías reales

- `contrato`
- `identificacion`
- `comprobante`
- `escritura`
- `plano`
- `otro`

### Vista principal

Debe contener:

- encabezado con CTA de subida
- KPI strip
- buscador
- filtros por categoría
- filtro por vinculación
- ordenamiento
- grid de documentos
- empty state

### Filtros de vinculación

- toda vinculación
- contratos
- clientes
- lotes
- sin vincular

### Ordenamiento

- más recientes
- más antiguos
- por nombre
- por tamaño

### Botones/acciones

- `⬆ Subir Documento`
- categoría pill
- `👁 Ver`
- `⬇ Bajar`
- `🗑`
- `+ Subir` en paneles inline por cliente/contrato/lote

### Modal de carga

Debe soportar:

- drag and drop
- selección manual de archivo
- detección de categoría sugerida
- alerta por tamaño
- nombre descriptivo
- categoría
- estado documental
- vinculación contextual o manual
- notas

### Preview documental

Debe soportar:

- imagen inline
- PDF en iframe
- fallback de descarga para otros formatos

## 9.9 Calculadora

### Objetivo

Calcular amortización y mostrar tabla de pagos.

### Inputs reales

- monto total
- enganche
- tasa anual
- plazo en meses

### Outputs reales

- monto a financiar
- cuota mensual
- total de intereses
- total a pagar financiado
- metadata de cuotas y tasa
- tabla de amortización

### Requisito

El cálculo se actualiza en vivo con `oninput`.

## 9.10 Búsqueda global

### Objetivo

Permitir búsqueda rápida en todo el sistema.

### Entidades indexadas

- clientes
- contratos
- lotes
- fraccionamientos
- pagos
- documentos

### Acciones rápidas incluidas

- ir al dashboard
- ir a fraccionamientos
- cargar nuevos lotes
- nuevo cliente
- pagos
- documentos
- generar contrato
- calculadora

### Interacción

- abrir con `⌘K`
- abrir con `/` si no se está escribiendo
- navegar con flechas
- abrir con enter
- cerrar con `ESC`

## 9.11 Estado de cuenta del cliente

### Objetivo

Generar reporte imprimible y exportable a PDF.

### Contenido real

- portada/resumen
- información del cliente
- lotes adquiridos
- inversión total
- pagado a la fecha
- saldo pendiente
- progreso de pago
- estatus de cuenta
- próximo pago
- tablas de amortización por contrato
- historial de pagos
- encabezado y pie formales
- botón imprimir/guardar PDF

### Botones/acciones

- `🖨 Imprimir / Guardar PDF`
- `✕ Cerrar`

## 9.12 Exportación de fraccionamiento

### Objetivo

Exportar a un visor HTML standalone llamado `GeoLotes`.

### El visor exportado incluye

- navbar propia
- KPIs del fraccionamiento
- mapa SVG interactivo
- tooltip por lote
- panel lateral de detalle
- zoom in
- zoom out
- reset
- botón `📄 Registrar Venta` en detalle

## 10. Inventario de botones que el nuevo frontend no debe omitir

Lista consolidada de botones/CTAs detectados:

- `Dashboard`
- `Mi Día`
- `Carga de Lotes`
- `Fraccionamientos`
- `Clientes & CRM`
- `Contratos`
- `Pagos`
- `Documentos`
- `Calculadora`
- `Configuración`
- `❓ Ayuda`
- `🗂 Nuevo Plano`
- `🏘️ Crear Fraccionamiento`
- `+ Nuevo Cliente`
- `+ Generar Contrato`
- `Ver todos →`
- `Abrir editor →`
- `Subir archivo CAD →`
- `← Cambiar modo`
- `Continuar sin imagen`
- `← Cambiar mapa`
- `+ Sección`
- `📋 Subir`
- `⚡ Cargar ejemplo rápido`
- `📂 Subir imagen`
- `🖼 Cambiar imagen`
- `+ Nuevo`
- `✏ Editar`
- `💬 Mensaje`
- `+ Crear Reserva`
- `⚠ Recordatorio`
- `📄 Nuevo Contrato`
- `🖨 Estado de Cuenta`
- `Editar`
- `📁`
- `⬇ PDF`
- `+ Registrar Pago`
- `✓ Pagar`
- `✏`
- `📲`
- `⬆ Subir Documento`
- `👁 Ver`
- `⬇ Bajar`
- `🗑`
- `+ Subir`
- `🖨 Imprimir / Guardar PDF`
- `✕ Cerrar`
- `← Todos`
- `⬇ Exportar`
- `✏ Editar`
- `📄 Registrar Venta`

## 11. Requisitos no funcionales del frontend

- conservar el diseño visual del HTML original
- conservar copy y naming del sistema
- no eliminar ninguna acción ya presente
- permitir navegación entre módulos sin recarga
- mantener feedback inmediato con toasts, badges y estados vacíos
- mantener persistencia local en modo demo
- preparar servicios para backend futuro
- separar dominio, UI y estado
- soportar responsive sin romper el layout de escritorio
- mantener experiencia premium tipo sistema interno empresarial

## 12. Qué debe llevar el nuevo frontend en React

### 12.1 Capas recomendadas

- `layouts`: shell, sidebar, topbar, modales base
- `pages`: una por vista principal
- `components`: tablas, cards, filtros, formularios, panels, badges, charts
- `context` o store: sesión, UI global, filtros globales
- `services`: auth, clients, contracts, payments, documents, fracs
- `hooks`: búsqueda, amortización, filtros, storage, responsive
- `utils`: formato moneda, fechas, amortización, badges, export

### 12.2 Módulos que deben reconstruirse completos

- Auth
- Mi Día
- Dashboard
- Lotes
- Fraccionamientos
- Clientes
- Contratos
- Pagos
- Documentos
- Calculadora
- Global Search
- Estado de Cuenta
- Exportación GeoLotes

### 12.3 Dependencias visuales y de interacción sugeridas

- React Router para vistas
- React Query para datos
- Axios para servicios
- TailwindCSS para UI
- PWA si el producto seguirá móvil
- librería de gráficos solo si respeta el look actual
- generador PDF o impresión browser-friendly para estados de cuenta

## 13. Riesgos si se reconstruye sin este documento

- convertirlo en dashboard genérico y perder la lógica inmobiliaria
- omitir botones porque “parecen demo”
- romper el flujo entre clientes, contratos, pagos y documentos
- perder el carácter local-first del prototipo
- rehacer el diseño con otra paleta y ya no parecerse al HTML original
- eliminar el módulo de lotes por ser más complejo
- dejar la búsqueda global o los reportes fuera de alcance

## 14. Conclusión

El HTML original ya define un producto bastante concreto. No es solo una maqueta visual. Tiene:

- diseño definido
- navegación definida
- estados definidos
- modelos de negocio definidos
- reglas de cobranza definidas
- acciones contextuales definidas
- módulos conectados entre sí

Si se va a rehacer el frontend, la meta correcta no es “hacer algo parecido”, sino reproducir este comportamiento con mejor arquitectura, mejor mantenibilidad y mejor soporte responsive, sin perder la lógica ni la experiencia del sistema.
