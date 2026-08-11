# Conectar la invitación a tu hoja de cálculo

Las confirmaciones de asistencia y las sugerencias de canciones se guardan en
una hoja de Google Sheets tuya. Es gratis, sin límite de envíos, y no requiere
que los invitados tengan cuenta.

Son 5 pasos y se hacen una sola vez (unos 10 minutos).

---

## 1. Crear la hoja de cálculo

1. Entra a [sheets.new](https://sheets.new) para crear una hoja nueva.
2. Ponle un nombre, por ejemplo **Boda Ailec & Omar**.
3. Cambia el nombre de la primera pestaña a **Invitados** (clic derecho sobre
   la pestaña → Cambiar nombre) y escribe estos encabezados en la fila 1:

   | A | B | C | D |
   |---|---|---|---|
   | Código | Nombre | Boletos | Enlace personalizado |

4. Llena **solo las columnas B y C** con tu lista. La columna A y la D se
   generan solas más adelante:

   | Código | Nombre | Boletos | Enlace personalizado |
   |---|---|---|---|
   | | Familia Garagarza Iñiguez | 4 | |
   | | Hugo de Santiago | 2 | |
   | | Carolina Preciado | 1 | |

   **Boletos** es el total de personas de ese grupo, incluyendo al titular.

Las pestañas **Confirmaciones** y **Canciones** se crean solas cuando llegue
el primer dato.

---

## 2. Pegar el script

1. En la hoja, ve al menú **Extensiones → Apps Script**.
2. Se abre una pestaña con un archivo `Código.gs` que trae unas líneas de
   ejemplo. **Borra todo** lo que tenga.
3. Abre el archivo `apps-script.gs` de esta carpeta, copia **todo** su
   contenido y pégalo ahí.
4. Guarda con el ícono del disquete (o `Ctrl + S`).

---

## 3. Implementar (publicar) el script

1. Arriba a la derecha, botón azul **Implementar → Nueva implementación**.
2. En el ícono del engrane, elige **Aplicación web**.
3. Configura así:
   - **Descripción:** `Formularios invitación`
   - **Ejecutar como:** `Yo (tu correo)`
   - **Quién tiene acceso:** **Cualquier usuario** ← importante
4. Clic en **Implementar**.
5. Google te pedirá autorizar. Acepta. Si aparece la pantalla
   *"Google no ha verificado esta aplicación"*, entra en
   **Configuración avanzada → Ir a (nombre del proyecto)**. Es tu propio
   script, no hay riesgo.
6. Al terminar te muestra una **URL de la aplicación web**. Cópiala.
   Se ve parecida a:

   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> **"Quién tiene acceso: Cualquier usuario" no significa que tus datos sean
> públicos.** Significa que cualquiera puede *enviar* información. El script
> no tiene ningún método para *leer* la hoja, así que nadie puede descargar tu
> lista de invitados aunque tenga la URL.

---

## 4. Pegar la URL en la invitación

Abre `script.js` y busca la primera línea del bloque de configuración:

```js
const ENDPOINT_DATOS = 'PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT';
```

Reemplaza el texto entre comillas por tu URL:

```js
const ENDPOINT_DATOS = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Guarda el archivo.

---

## 5. Generar los enlaces personalizados

Cada invitado recibe su propio enlace. Al abrirlo, la invitación ya muestra su
nombre y sus boletos, y **no puede elegir más de los que le asignaste**.

1. Vuelve al editor de Apps Script.
2. Arriba del todo, en la línea `const URL_INVITACION = ...`, pon la dirección
   donde vas a publicar la invitación, sin barra al final. Por ejemplo:

   ```js
   const URL_INVITACION = 'https://ailecyomar.com';
   ```

3. Guarda, y en la barra superior elige la función **`generarCodigosYEnlaces`**
   en el desplegable y presiona **Ejecutar**.
4. Regresa a la hoja: las columnas **Código** y **Enlace personalizado** ya
   están llenas.

   | Código | Nombre | Boletos | Enlace personalizado |
   |---|---|---|---|
   | K7M2QX | Familia Garagarza Iñiguez | 4 | https://ailecyomar.com?c=K7M2QX |

5. Ese enlace de la columna D es el que le mandas a cada invitado por WhatsApp.

> Si después agregas invitados nuevos, solo escribe nombre y boletos y vuelve a
> ejecutar `generarCodigosYEnlaces`. Los códigos ya existentes **no cambian**.

---

## 6. Probar

1. Abre la invitación **usando uno de los enlaces con `?c=...`**. Debe aparecer
   el nombre de ese invitado y sus lugares reservados.
2. Manda una confirmación de prueba y una canción.
3. Revisa la hoja: deben aparecer las pestañas **Confirmaciones** y
   **Canciones** con tus datos.
4. Borra las filas de prueba.

> Si abres la invitación **sin** el `?c=...`, el formulario no aparece: en su
> lugar sale un aviso pidiendo usar el enlace personal. Es a propósito.

Si algo falla, abre la consola del navegador (`F12` → pestaña *Console*): ahí
aparece el error exacto.

---

## Contar asistentes sin hacerlo a mano

En la pestaña **Confirmaciones**, la columna **Asistentes** ya trae el número
real de personas de cada grupo. Para el total, escribe esta fórmula en
cualquier celda vacía:

```
=SUMA(E2:E)
```

Cuántos grupos aún no responden:

```
=CONTARA(Invitados!B2:B)-CONTARA(B2:B)
```

Cuántos dijeron que no:

```
=CONTAR.SI(D2:D;"No")
```

---

## Recibir un correo por cada confirmación (opcional)

En la hoja: **Herramientas → Reglas de notificación → Notificarme cuando... se
realicen cambios → Correo electrónico, al instante**.

---

## Si cambias el script después

Cada vez que edites `apps-script.gs` tienes que volver a implementar:
**Implementar → Administrar implementaciones → ícono de lápiz → Versión: Nueva
versión → Implementar**. La URL **no cambia** si actualizas la implementación
existente en lugar de crear una nueva.

---

## Protecciones incluidas

- **El tope de boletos se aplica en la hoja, no en el navegador.** Aunque
  alguien modifique el formulario desde su equipo, el script recorta la
  cantidad al número que le asignaste. Es la única cifra que cuenta.
- **El nombre se toma de tu lista**, no de lo que escriba el invitado, así que
  nadie puede confirmar a nombre de otro.
- **Sin código válido no se guarda nada.**
- **No se puede descargar la lista.** La única consulta posible devuelve el
  nombre y los boletos de un código concreto, uno por uno.
- **Si alguien confirma dos veces, se actualiza su fila** en lugar de
  duplicarse, para que el conteo nunca se infle.
- **Campo trampa** invisible en ambos formularios: los bots lo llenan, las
  personas no. Esos envíos se descartan.
- **Espera de 5 segundos** entre envíos desde el mismo navegador.
- **Límites de longitud** en todos los campos de texto.
- **Candado de escritura** para que dos envíos simultáneos no se pisen.
