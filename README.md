# Ownterra / LoteManager V1

Frontend local para la primera version funcional de LoteManager, enfocado en gestion inmobiliaria de lotes, fraccionamientos, clientes, contratos, pagos y documentos.

## Alcance de V1

- Login con perfiles demo de administrador y vendedor.
- Vista "Mi Dia" adaptada por rol, con KPIs, tareas criticas, actividad reciente y accesos rapidos.
- Dashboard ejecutivo con resumen de ventas, portafolio, clientes destacados, contratos recientes y alertas.
- Carga de lotes con tablero visual, importacion manual, carga por Excel/CSV y creacion de fraccionamientos.
- Vista de fraccionamientos con galeria, detalle de lotes, filtros por estado, panel de lote y cotizador.
- Permisos por rol en fraccionamientos: administrador puede crear/eliminar; vendedor consulta proyectos y lotes.
- Clientes & CRM con expedientes, estados, reservas y acciones comerciales.
- Contratos con repositorio, edicion, documentos vinculados, reportes y descarga simulada de PDF.
- Control de pagos con pagos vencidos, proximos cobros, historial y estados de cuenta.
- Gestion documental local para contratos, clientes y lotes.
- Calculadora de amortizacion para simulaciones financieras.
- Persistencia local en navegador usando `localStorage`.
- Layout responsive para escritorio y vistas moviles principales.

## Credenciales Demo

| Rol | Usuario | Password |
| --- | --- | --- |
| Administrador | `admin` | `admin123` |
| Vendedor | `vendedor` | `vende123` |

## Desarrollo Local

Instalar dependencias:

```bash
npm install
```

Levantar el entorno local:

```bash
npm run dev
```

Generar build de produccion:

```bash
npm run build
```

## Notas Tecnicas

- La app se sirve con Vite.
- La entrada React carga la experiencia V1 desde `public/LoteManager_v32_rento.html`.
- Esta version no requiere backend para la demo; los datos se guardan localmente en el navegador.
- En entorno local se limpian service workers y cache para evitar que el navegador muestre builds viejos.
