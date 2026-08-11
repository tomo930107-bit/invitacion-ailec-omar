## Invitación Ailec & Omar

Sitio estático (HTML/CSS/JS vanilla) en Cloudflare Pages + Google Apps Script con Sheets.
Estética editorial: Cormorant Garamond, Montserrat, dorado #b59b7c.

## Reglas
- Sin frameworks, sin build step, sin dependencias nuevas.
- No reescribir código que ya funciona (música, animaciones, cronograma).
- Antes de implementar, proponer plan y esperar aprobación.
- Un commit por fase, en español, con mensaje descriptivo.

## Trabajo actual
Ver docs/RSVP-SPEC.md — implementación por fases.

- Celebración: Invitación digital para Ailec y Omar
- Fecha: 18 de diciembre de 2026
- Estado del contenido: estructura base adaptada y lista para seguir llenando punto por punto
- Secciones incluidas: portada, contador, datos familiares, itinerario, ubicación, historia, mesa de regalos, código de vestimenta, galería y RSVP

## Cómo trabajar en local

1. Abre la carpeta `proyecto-invitacion` en Visual Studio Code.
2. Instala la extensión **Live Server** (o usa `npx serve`) para previsualizar
   con recarga automática.
3. Coloca tus propias fotos dentro de `assets/` respetando los nombres usados
   en `index.html` (o cambia las rutas).
4. Abre `index.html` con Live Server y haz clic en el sello para probar la
   apertura del sobre.

## Sobre (archivo PNG)

- Coloca en la carpeta `assets/` un archivo `envelope.png` con fondo transparente.
- El `envelope.png` debe tener dimensiones grandes (por ejemplo 2000x1200px) para
  cubrir pantallas grandes y conservar la calidad al usar `object-fit: cover`.
- Si prefieres WebP transparente, puedes usar `envelope.webp` y actualizar la ruta
  en `index.html`.

## Secciones incluidas

- Portada / sobre animado con sello de cera
- Hero con nombres y parallax simple
- Contador regresivo a la fecha del evento
- Tarjetas de padres de familia
- Carrusel de padrinos
- Itinerario en timeline con iconos
- Ubicación de recepción + botón a Google Maps
- Carrusel de hospedaje
- Widget de clima (datos estáticos, se puede conectar a una API tipo
  OpenWeather más adelante)
- Nuestra historia (collage de fotos)
- Mesa de regalos con datos bancarios colapsables
- Código de vestimenta con paleta de colores
- Galería de fotos en grid
- Formulario de sugerencia de canciones
- Sección de contactos (tabs Novia/Novio) + formulario RSVP

## Próximos pasos sugeridos

- Conectar el formulario RSVP a un backend (Google Sheets, Firebase o
  Formspree) para recibir confirmaciones reales.
- Sustituir el emoji de los iconos del itinerario por SVGs propios.
- Agregar animaciones más suaves con la librería `AOS` (Animate On Scroll) si
  se desea, o mantener el `IntersectionObserver` ya incluido.
- Optimizar imágenes (WebP) para tiempos de carga más rápidos.

## Créditos de diseño

Estructura y efectos inspirados de forma general en plantillas comerciales de
invitaciones digitales, pero implementados aquí con código, textos y assets
propios.