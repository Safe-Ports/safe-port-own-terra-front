# Comunidades: imágenes y acceso a unidades

Revisión: 2026-10-11. Frontend: `feature/properties-condos-mvp`.

## Resultado

- Cada tarjeta tiene **Ver unidades**, con el conteo de unidades activas de esa comunidad.
- La lista permite buscar por unidad o persona y abrir la ficha; comunidad, pestaña y unidad seleccionada quedan en la URL para recuperar el contexto al recargar.
- **Agregar unidad** funciona dentro de la comunidad y conserva el inmueble padre. Al crearla se abre su ficha. Las fotos se agregan cuando ya existe su identificador.
- En teléfono las unidades se muestran en filas con el nombre completo, personas y saldo, sin exigir desplazamiento horizontal para encontrar la unidad.
- Las fotos del inmueble sirven como portada de la comunidad. Las fotos de cada unidad se guardan en su propia galería.
- Se incorporaron los siete archivos originales de `images_condos` al selector de fotos de la comunidad, sin modificar los originales. Elegir una foto llama al endpoint de carga real.
- Las imágenes sugeridas para comunidades sin galería llevan una etiqueta explícita; no cuentan como archivos guardados.
- La galería indica carga, cantidad de fotos, error de consulta, fallo de imagen y reintento. Una subida parcial conserva las fotos confirmadas y reintenta solamente los archivos pendientes.

## Comprobación en sesión real

Se utilizó el frontend local con la sesión existente contra la API de desarrollo. Se cargó una foto a cada una de las cinco comunidades; la galería confirmó el archivo y se recuperó nuevamente después de recargar el frontend:

| Comunidad | Archivo |
|---|---|
| Condominio Plaza Norte A.C. | `1636406582.jpg` |
| Condominio Residencial La Arboleda A.C. | `1625338881.jpg` |
| Condominio Torre Jacarandas A.C. | `Ley-de-condominios-scaled-1.jpg` |
| Refugio Bosque Alto A.C. | `378070762.jpg` |
| Villas del Lago A.C. | `8d49e1f42a25f39552b52fa6de90477e.jpg` |

No se modificaron datos generales, contactos ni cuotas. Las fotos se guardan al subirlas, independientemente del botón Guardar cambios del formulario. Esta prueba confirma carga y lectura mediante la API y el navegador; no es una auditoría directa del bucket R2 ni verifica recuperación ante caída del proveedor de almacenamiento.

## Contrato que consume el frontend

Base: API Properties `/api/v1`. Sesión y organización provienen del contexto compartido.

| Método y ruta | Body esperado | Resultado |
|---|---|---|
| GET `/media/{entity_type}/{entity_id}` | Sin body | Array de archivos, ordenados por posición. |
| POST `/media/{entity_type}/{entity_id}` | `multipart/form-data`, campo `file` con el archivo binario | 201 con `MediaAssetResponse`. |
| PUT `/media/{entity_type}/{entity_id}/order` | JSON `{"asset_ids":["uuid-portada","uuid-siguiente"]}` | Array ordenado; debe incluir todos los archivos, incluidos PDFs. |
| DELETE `/media/asset/{asset_id}` | Sin body | 204. |

Para comunidad: `entity_type=inmueble`, `entity_id=community.inmuebleId`. Para unidad: `entity_type=property`, `entity_id=unit.id`.

`MediaAssetResponse`: `id`, `entity_type`, `entity_id`, `filename`, `content_type`, `size_bytes`, `position`, `url`, `created_at`. El frontend exige `id` como confirmación de subida. Las URL de almacenamiento pueden vencer: reconsultar la galería obtiene una nueva URL. No se persisten esas URL en datos de comunidad o unidad.

## Pendientes detectados en backend

Inspección de `safe-ports-own-terra-properties-back`, rama `feature/mvp-properties`; no se hicieron cambios en ese repositorio:

1. `app/features/media/service.py`: comprobar existencia y pertenencia a la organización de la entidad destino antes de cargar. El servicio actual crea el registro de media con la organización de la sesión, pero no verifica la entidad destino.
2. La consulta de posición máxima de upload debe incluir `organization_id`, igual que list/reorder.
3. `app/features/media/router.py`: verificar autorización de escritura por rol/vertical para upload, order y delete. Las dependencias visibles exigen usuario activo y organización; el frontend ocultando acciones no reemplaza el control del API.
4. `app/shared/storage_service.py`: el borrado captura fallos de almacenamiento mientras el servicio elimina el registro de DB. Revisar recuperación de blobs huérfanos y consistencia ante fallos del commit posterior al upload.

Son hallazgos de lectura de código, no pruebas de explotación ni fallos reproducidos en otra organización. Las pruebas locales automatizadas usan datos simulados; no alteran datos de la API de desarrollo.

## Contrato esperado para resolver cada pendiente

Estos endpoints **ya existen** en Properties; los pendientes son correcciones de
comportamiento. No se necesita crear una API distinta. Todas las rutas siguientes
incluyen el prefijo `/api/v1` y requieren `Authorization: Bearer <token>`.
La organización se obtiene del claim `org` del token; no se acepta
`organization_id` en el body para cambiar el alcance de la operación.

### 1. Validar existencia y organización del destino antes de subir

**Endpoints afectados:**

- POST `/api/v1/media/{entity_type}/{entity_id}`.
- POST `/api/v1/properties/{property_id}/media` (atajo existente para unidades).

**Body esperado actual:** `multipart/form-data`, un campo requerido `file` de tipo
archivo binario. No es un body JSON. Ejemplo para comunidad:

```http
POST /api/v1/media/inmueble/16909cbd-10af-45df-a2f7-7f8afca7f824
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=ownterra-photo

--ownterra-photo
Content-Disposition: form-data; name="file"; filename="fachada.jpg"
Content-Type: image/jpeg

<bytes del archivo>
--ownterra-photo--
```

`entity_type` es uno de `inmueble`, `property`, `announcement`, `package`;
`entity_id` y `property_id` son UUID. Para la comunidad se usa su inmueble, no el
UUID de la comunidad. `file` no puede estar vacío y admite como máximo 10 MB.
El backend existente admite JPEG, PNG, WEBP, HEIC y PDF; el selector de fotos del
frontend admite únicamente imágenes. Al usar FormData, el cliente debe dejar que
el navegador genere el boundary.

**Respuesta actual esperada: 201**, objeto `MediaAssetResponse`:

```json
{
  "id": "bd79fc5b-2abb-4335-a89a-0384d48f8588",
  "entity_type": "inmueble",
  "entity_id": "16909cbd-10af-45df-a2f7-7f8afca7f824",
  "filename": "fachada.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 245678,
  "position": 0,
  "url": "https://storage.example.com/archivo.jpg?firma=ejemplo",
  "created_at": "2026-10-11T18:00:00Z"
}
```

La URL es ilustrativa; el API genera la URL de lectura vigente del archivo real.

**Comportamiento faltante requerido:** comprobar que la entidad existe y pertenece
a la organización de la sesión **antes** de escribir en storage o DB. Un UUID de
otra organización debe tratarse como no encontrado, sin revelar a quién pertenece.
Aplicar la misma comprobación al atajo de properties.

**Errores esperados:** 401 sin sesión válida; 403 sin permiso de escritura;
404 para destino inexistente o de otra organización; 422 para UUID, tipo o archivo
inválido. Usar el envelope y los códigos existentes del catálogo; por ejemplo
`OT-PROP-3001` para inmueble no encontrado y `OT-SYS-1000` para validación.

**Aceptación:** subir a un inmueble propio devuelve 201 y luego aparece en GET;
subir a un destino ajeno/inexistente no crea ni blob ni registro.

### 2. Calcular posición con aislamiento de organización

**Endpoint afectado:** POST `/api/v1/media/{entity_type}/{entity_id}` y su atajo
POST `/api/v1/properties/{property_id}/media`.

**Body esperado:** el mismo multipart del pendiente 1, campo requerido `file`.
No se envía `position` ni `organization_id` desde el frontend.

**Respuesta esperada:** 201 con el mismo `MediaAssetResponse`; `position` es un
entero calculado por el servidor. La primera foto de una galería vacía ocupa 0.

**Corrección requerida:** la consulta de posición máxima debe filtrar por
`organization_id`, `entity_type` y `entity_id`, además de validar el destino como
se indica en el pendiente 1. No hace falta un endpoint nuevo.

**Aceptación:** el orden y la portada de una galería no dependen de registros de
otra organización; GET devuelve la galería propia ordenada por `position`.

### 3. Aplicar permisos de escritura en la API

| Método y endpoint existente | Body esperado | Respuesta exitosa |
|---|---|---|
| POST `/api/v1/media/{entity_type}/{entity_id}` | Multipart, campo requerido `file`, como en el pendiente 1. | 201, `MediaAssetResponse`. |
| POST `/api/v1/properties/{property_id}/media` | Multipart, campo requerido `file`, como en el pendiente 1. | 201, `MediaAssetResponse`. |
| PUT `/api/v1/media/{entity_type}/{entity_id}/order` | JSON con `asset_ids`, ejemplo abajo. | 200, array de `MediaAssetResponse` ordenado. |
| DELETE `/api/v1/media/asset/{asset_id}` | **Sin body**. `asset_id` es UUID en la ruta. | 204, sin body de respuesta. |

Body concreto de reordenamiento:

```json
{
  "asset_ids": [
    "bd79fc5b-2abb-4335-a89a-0384d48f8588",
    "e04f4130-0310-4e9d-8242-744bdef8410c"
  ]
}
```

`asset_ids` es requerido, array de UUID que debe incluir todos los archivos de la
galería propia, incluidos PDFs. El primer ID será la portada si corresponde a una
imagen. Como validación requerida, rechazar IDs duplicados o de otra galería.

**Comportamiento faltante requerido:** validar acceso a Properties y permiso de
escritura de la sesión en cada mutación. Manager/admin autorizado puede operar;
viewer y owner de solo lectura reciben 403. Mantener además el aislamiento por
organización. La comprobación debe usar el modelo de permisos compartido, sin
confiar en un rol enviado por el cliente.

**Errores esperados:** 401 para sesión inválida; 403 `OT-AUTH-2003` para escritura
no autorizada; 404 para archivo/destino ajeno o inexistente; 422 `OT-SYS-1000`
para lista de orden inválida. Conservar el envelope Own Terra.

**Aceptación:** probar los cuatro endpoints con usuario de solo lectura y con
manager, además de intentar modificar un archivo de otra organización. Las
solicitudes rechazadas no cambian storage ni DB.

### 4. Mantener consistencia entre storage y DB ante fallos

**Endpoints afectados:** POST `/api/v1/media/{entity_type}/{entity_id}`, POST
`/api/v1/properties/{property_id}/media` y DELETE `/api/v1/media/asset/{asset_id}`.

**Bodies esperados:** los POST conservan multipart con `file`; DELETE **no lleva
body**. No se necesita un endpoint público de limpieza: la compensación y
recuperación de archivos huérfanos son trabajo interno del backend.

**Contrato de éxito conservado:** POST devuelve 201 con `MediaAssetResponse`
solo al confirmar el archivo y su registro; DELETE devuelve 204, sin body.

**Comportamiento propuesto para implementar:**

- Si falla storage al subir, no crear el registro de DB ni devolver 201.
- Si se sube el blob pero falla el commit, intentar compensar su eliminación;
  si esa compensación falla, registrar el trabajo pendiente para recuperación.
- Si falla storage al borrar, conservar el registro y devolver un error visible,
  en lugar de responder 204 y perder la referencia al blob. El reintento debe
  poder completar la eliminación; un objeto ya ausente no debe impedirla.
- Registrar fallos y permitir recuperación interna sin exponer claves de storage
  ni detalles de credenciales al frontend.

**Respuesta de error propuesta:** 503 con el envelope Own Terra y el código
existente `OT-SYS-9001` cuando storage está temporalmente indisponible. Un fallo
inesperado de DB usa el error interno normalizado del backend; no anunciar éxito.
Esta política de recuperación es propuesta, no comportamiento verificado hoy.

**Aceptación:** simular fallo de upload, fallo de commit y fallo de delete en un
entorno desechable. Comprobar respuestas de error, conservación de referencias y
recuperación posterior sin dejar archivos huérfanos sin seguimiento.

## Validación

- Vitest: 338 pruebas aprobadas, 64 archivos.
- Playwright: cinco casos específicos en Chromium, Android y WebKit/iOS: navegación y recarga, creación dentro de comunidad, carga/lectura de foto, reintento de consulta y recuperación de subida parcial sin duplicados.
- Playwright: 222 pruebas aprobadas al incluir la regresión responsive de Properties y los casos anteriores.
- Build de producción completado; permanece el aviso existente de tamaño de bundle.
- Capturas con datos simulados: `community-units-media/community-mobile.png`, `community-units-media/unit-mobile.png`, `community-units-media/units-desktop.png`.
