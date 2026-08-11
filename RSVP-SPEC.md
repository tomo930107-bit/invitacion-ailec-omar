# Especificación — RSVP con pases personalizados por invitado

> Documento de referencia para implementación. Léelo completo antes de escribir código.
> Si algo aquí contradice el código existente, pregunta antes de cambiarlo.

---

## 1. Contexto del proyecto

- Sitio estático de invitación de boda (HTML + CSS + JS vanilla), desplegado en **Cloudflare Pages**.
- Estética editorial: Cormorant Garamond + Montserrat, dorado `#b59b7c`. **No introducir frameworks, build steps ni dependencias nuevas.**
- Backend: **Google Apps Script** (archivo `.gs` ya existente en el repo) publicado como Web App, con **Google Sheets** como base de datos.
- Los invitados reciben su link personalizado por WhatsApp.

## 2. Objetivo

Cada invitado abre un link único que:

1. Lo saluda por su nombre (o el de su familia).
2. Le muestra cuántos pases tiene reservados.
3. Le permite confirmar **como máximo** ese número de pases, nunca más.
4. Guarda la respuesta en Google Sheets y le permite editarla hasta una fecha de corte.

## 3. Modelo de datos — Hoja `Invitados`

| Columna | Tipo | Notas |
|---|---|---|
| `token` | texto | 8 caracteres, aleatorio, alfanumérico en minúsculas. **Nunca secuencial.** Clave primaria. |
| `nombre_display` | texto | "Familia Torres Mijares" / "Ana Sofía Delgado" |
| `tipo` | enum | `familia` \| `individual` |
| `pases_max` | entero | 1–10 |
| `pases_confirmados` | entero | vacío hasta que responda |
| `estatus` | enum | `pendiente` \| `confirmado` \| `no_asiste` |
| `acompanantes` | texto | nombres capturados, separados por `;` |
| `telefono` | texto | formato E.164 sin `+` (ej. `5213312345678`) |
| `mensaje` | texto | mensaje libre del invitado |
| `fecha_respuesta` | fecha | timestamp de la última actualización |

Hoja adicional `Resumen`: conteos con `COUNTIF`/`SUMIF` (invitados totales, confirmados, pendientes, pases comprometidos, pases liberados).

Hoja adicional `Log`: append-only, un renglón por intento (`timestamp`, `token`, `accion`, `resultado`) para auditoría.

## 4. Contrato de API

Web App de Apps Script desplegada con acceso "Cualquier persona".

### GET — consultar invitación

```
GET {WEBAPP_URL}?action=lookup&token=k7m2qx
```

Respuesta OK:
```json
{ "ok": true, "data": {
    "nombre_display": "Familia Torres Mijares",
    "tipo": "familia",
    "pases_max": 4,
    "pases_confirmados": 3,
    "acompanantes": "Omar;Ana;Sofía",
    "estatus": "confirmado",
    "editable": true
}}
```

Respuesta error:
```json
{ "ok": false, "error": "NO_ENCONTRADO" }
```

Códigos de error: `NO_ENCONTRADO`, `TOKEN_INVALIDO`, `CERRADO`, `EXCEDE_MAX`, `DATOS_INVALIDOS`, `ERROR_INTERNO`.

**Nunca** devolver datos de otros invitados, ni la lista completa, ni conteos globales.

### POST — guardar confirmación

```json
{ "action": "rsvp", "token": "k7m2qx", "asiste": true,
  "pases": 3, "acompanantes": ["Omar", "Ana", "Sofía"], "mensaje": "..." }
```

Reglas de validación **en el servidor** (la hoja es la única fuente de verdad):

- El token existe y tiene exactamente 8 caracteres `[a-z0-9]`.
- `pases` es entero, `0 <= pases <= pases_max` leído de la hoja **en ese momento**.
- Si `asiste === false`, forzar `pases = 0` y `estatus = 'no_asiste'`.
- Si la fecha actual es posterior a `FECHA_CORTE` (constante configurable), rechazar con `CERRADO`.
- `mensaje` truncado a 500 caracteres; sanitizar antes de escribir.
- Escritura protegida con `LockService` para evitar condiciones de carrera.
- Registrar todo intento en `Log`, exitoso o no.

## 5. Comportamiento del frontend

1. Al cargar, leer `?i=` de la URL.
2. **Sin token**: mostrar el sitio en modo genérico, con la sección RSVP reemplazada por un mensaje tipo "Consulta tu invitación personalizada en el link que te enviamos". No mostrar formulario.
3. **Con token**: llamar a `lookup`.
   - Mostrar skeleton/estado de carga mientras responde (no dejar el bloque vacío).
   - Si falla: mensaje amable ("No pudimos encontrar tu invitación") + contacto de WhatsApp de los novios.
   - Si funciona: personalizar el saludo y renderizar el formulario.
4. El selector de pases se genera dinámicamente con las opciones `1..pases_max`. Si `tipo === 'individual'` y `pases_max === 1`, omitir el selector y asumir 1.
5. Un campo de nombre por cada pase seleccionado (se agregan/quitan al cambiar el número).
6. Si ya había respondido, precargar sus datos y cambiar el botón a "Actualizar mi confirmación".
7. Al guardar: deshabilitar el botón, mostrar spinner, y al éxito mostrar un resumen ("Confirmado: 3 de 4 pases") — no un simple `alert()`.
8. Manejar el error `EXCEDE_MAX` mostrando el mensaje del servidor, no el estado local.

## 6. Restricciones técnicas

- **CORS**: Apps Script no responde bien a preflight. El `fetch` del POST debe usar `Content-Type: text/plain;charset=utf-8` y enviar el JSON como string en el body; el `.gs` lo parsea con `JSON.parse(e.postData.contents)`. No usar `application/json`.
- La URL del Web App va en un solo lugar (`config.js` o constante al inicio del JS), nunca repetida.
- El código de la Web App es público por diseño: **no** poner ahí secretos, ni la lista de invitados en el bundle del frontend.
- Todo el JS existente del sitio (música, animaciones, cronograma) debe seguir funcionando; no reescribir lo que ya opera.

## 7. Fases de implementación

Trabajar **una fase a la vez**, con commit al final de cada una.

1. **Fase 1 — Backend.** `doGet` (lookup) y `doPost` (rsvp) en el `.gs`, con validación, `LockService` y log. Incluir una función `generarTokens()` que rellene la columna `token` para las filas vacías.
2. **Fase 2 — Capa de datos en el frontend.** Módulo `rsvp-api.js` con `lookupInvitado(token)` y `enviarRsvp(payload)`, manejo de errores y timeouts. Probar con `console.log` antes de tocar la UI.
3. **Fase 3 — UI del RSVP.** Personalización del saludo, selector dinámico de pases, campos de acompañantes, estados de carga/éxito/error, respetando el CSS existente.
4. **Fase 4 — Modo edición y fecha de corte.** Precarga de respuesta previa, bloqueo posterior al corte.
5. **Fase 5 — Utilidad de distribución.** Fórmula o script que genere el link `wa.me` con el mensaje precargado por invitado.

## 8. Criterios de aceptación

- Un token inexistente no revela nada ni rompe el sitio.
- Modificar el `<select>` desde DevTools para enviar más pases de los asignados **es rechazado por el servidor** y la hoja no cambia.
- Confirmar dos veces actualiza el mismo renglón; no duplica filas.
- Con `asiste = false`, `pases_confirmados` queda en 0.
- El sitio sin `?i=` sigue siendo navegable y bonito.
- El total de `Resumen` cuadra con la suma manual de la columna.
