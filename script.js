// Abrir sobre inicial. El sello viene integrado en la imagen, así que el
// sobre completo es el botón: no hay nada que posicionar por JS.
document.getElementById('envelope-btn')?.addEventListener('click', function abrirSobre() {
  const boton = this;
  const screen = document.getElementById('envelope-screen');
  const site = document.getElementById('site');

  if (boton.classList.contains('abriendo')) return; // evita dobles toques
  boton.classList.add('abriendo');

  site.classList.remove('hidden');
  // permitir scroll en la página una vez abierto el sobre
  try { document.body.style.overflow = 'auto'; } catch (e) {}

  // Pulsación breve y luego desvanecer toda la portada
  setTimeout(() => screen.classList.add('closed'), 220);

  // Reproducir música y hacer zoom en los nombres
  const heroNames = document.querySelector('.hero-names');
  if (heroNames) {
    heroNames.classList.add('zoom');
    // quitar zoom tras completar la transición CSS (~7s)
    setTimeout(() => heroNames.classList.remove('zoom'), 8000);
  }
  reproducirMusica();

  setTimeout(() => { screen.style.display = 'none'; }, 1100);
});

/* ------------------------------------------------------------------
   Música de fondo
------------------------------------------------------------------ */
// Se buscan al vuelo y no al cargar el script: así el orden de las etiquetas
// en el HTML no puede dejarlos en null.
const audio = () => document.getElementById('wedding-audio');
const btnAudio = () => document.getElementById('audio-btn');

function marcarEstadoAudio() {
  const a = audio();
  const b = btnAudio();
  if (!a || !b) return;
  const sonando = !a.paused;
  b.classList.toggle('sonando', sonando);
  b.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música');
  b.title = sonando ? 'Pausar música' : 'Reproducir música';
}

function reproducirMusica() {
  const audioBoda = audio();
  if (!audioBoda) return Promise.resolve();

  audioBoda.volume = 0.8;

  // Ojo: NO tocar currentTime antes de reproducir. Si el archivo todavía no
  // cargó metadatos (habitual al estar hosteado, no en local), asignarlo lanza
  // una excepción que impedía que play() llegara a ejecutarse.
  const promesa = audioBoda.play();

  if (promesa && promesa.catch) {
    return promesa
      .then(marcarEstadoAudio)
      .catch(err => {
        // El navegador bloqueó la reproducción: el invitado puede iniciarla
        // con el botón, que queda resaltado.
        console.warn('La música no pudo iniciarse automáticamente:', err.name, err.message);
        btnAudio()?.classList.add('pendiente');
        marcarEstadoAudio();
      });
  }
  marcarEstadoAudio();
  return Promise.resolve();
}

document.addEventListener('DOMContentLoaded', () => {
  const a = audio();
  const b = btnAudio();
  if (!a || !b) return;

  b.addEventListener('click', () => {
    b.classList.remove('pendiente');
    if (a.paused) reproducirMusica();
    else { a.pause(); marcarEstadoAudio(); }
  });

  a.addEventListener('play', marcarEstadoAudio);
  a.addEventListener('pause', marcarEstadoAudio);
  a.addEventListener('error', () => {
    console.error('No se pudo cargar el audio:', a.currentSrc || a.src);
  });
  marcarEstadoAudio();
});

// Menú
document.getElementById('home-btn').addEventListener('click', () => {
  document.getElementById('menu').classList.toggle('open');
});

// Carruseles
document.querySelectorAll('.carousel').forEach(carousel => {
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dotsWrap = carousel.querySelector('.dots');
  let index = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function goTo(i) {
    slides[index].classList.remove('active');
    dotsWrap.children[index].classList.remove('active');
    index = (i + slides.length) % slides.length;
    slides[index].classList.add('active');
    dotsWrap.children[index].classList.add('active');
  }

  carousel.querySelector('.prev').addEventListener('click', () => goTo(index - 1));
  carousel.querySelector('.next').addEventListener('click', () => goTo(index + 1));
});

// Carrusel de hospedaje: la foto cambia junto con el hotel
const hotelCarousel = document.getElementById('hotel-carousel');
if (hotelCarousel) {
  const slides = hotelCarousel.querySelectorAll('.hotel-slide');
  const photos = document.querySelectorAll('.hospedaje-photo img');
  const dotsWrap = document.querySelector('.hotel-dots');
  let current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => show(i));
    dotsWrap.appendChild(dot);
  });

  function show(i) {
    const next = (i + slides.length) % slides.length;
    [slides, photos, dotsWrap.children].forEach(group => {
      group[current]?.classList.remove('active');
      group[next]?.classList.add('active');
    });
    current = next;
  }

  hotelCarousel.querySelectorAll('.hotel-nav').forEach(btn => {
    btn.addEventListener('click', () => show(current + Number(btn.dataset.dir)));
  });
}

// Carrusel de "Nuestra Historia" (efecto coverflow)
const historiaCarousel = document.getElementById('historia-carousel');
if (historiaCarousel) {
  const slides = [...historiaCarousel.querySelectorAll('.historia-slide')];
  const dotsWrap = document.querySelector('.historia-dots');
  const total = slides.length;
  let current = 0;

  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => go(i));

    const dot = document.createElement('span');
    dot.addEventListener('click', () => go(i));
    dotsWrap.appendChild(dot);
  });

  function layout() {
    slides.forEach((slide, i) => {
      let offset = i - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      const distance = Math.abs(offset);

      slide.style.transform =
        `translateX(-50%) translateX(${offset * 62}%) scale(${1 - distance * 0.14}) rotateY(${offset * -24}deg)`;
      slide.style.opacity = distance > 2 ? 0 : 1 - distance * 0.25;
      slide.style.zIndex = total - distance;
      slide.classList.toggle('is-active', offset === 0);
      dotsWrap.children[i].classList.toggle('active', offset === 0);
    });
  }

  function go(i) {
    current = (i + total) % total;
    layout();
  }

  historiaCarousel.parentElement.querySelectorAll('.historia-nav').forEach(btn => {
    btn.addEventListener('click', () => { go(current + Number(btn.dataset.dir)); reiniciarAuto(); });
  });

  layout();

  // Avance automático: recorre las fotos solo y se pausa al interactuar
  const PAUSA = 2000;
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let auto = null;

  function iniciarAuto() {
    if (sinMovimiento || auto) return;
    auto = setInterval(() => go(current + 1), PAUSA);
  }
  function detenerAuto() {
    clearInterval(auto);
    auto = null;
  }
  function reiniciarAuto() {
    detenerAuto();
    iniciarAuto();
  }

  slides.forEach(slide => slide.addEventListener('click', reiniciarAuto));
  dotsWrap.addEventListener('click', reiniciarAuto);
  historiaCarousel.addEventListener('mouseenter', detenerAuto);
  historiaCarousel.addEventListener('mouseleave', iniciarAuto);

  // Solo corre mientras la sección está a la vista
  new IntersectionObserver(([entrada]) => {
    entrada.isIntersecting ? iniciarAuto() : detenerAuto();
  }, { threshold: 0.35 }).observe(historiaCarousel);
}

/* ------------------------------------------------------------------
   Conexión con la hoja de cálculo (Google Apps Script)
   La URL del Web App vive en un solo lugar: ENDPOINT_DATOS, declarada
   en rsvp-api.js (que se carga antes que este archivo).
------------------------------------------------------------------ */
const ESPERA_MINIMA = 5000; // ms entre envíos, para frenar spam accidental

function puedeEnviar(clave) {
  const ultimo = Number(localStorage.getItem(clave) || 0);
  return Date.now() - ultimo > ESPERA_MINIMA;
}

function registrarEnvio(clave) {
  localStorage.setItem(clave, String(Date.now()));
}

function mostrarEstado(el, mensaje, tipo) {
  el.textContent = mensaje;
  el.className = 'form-estado' + (tipo ? ' form-estado--' + tipo : '');
}

async function enviarDatos(datos) {
  if (!ENDPOINT_DATOS || ENDPOINT_DATOS.startsWith('PEGA_AQUI')) {
    throw new Error('Falta configurar ENDPOINT_DATOS');
  }
  // text/plain evita la petición preflight de CORS, que Apps Script no responde.
  const res = await fetch(ENDPOINT_DATOS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(datos),
  });
  const respuesta = await res.json();
  if (!respuesta.ok) throw new Error(respuesta.error || 'Error al guardar');
  return respuesta;
}

/* ------------------------------------------------------------------
   Invitado: el token viene en el enlace personal (?i=xxxxxxxx).
   La hoja responde solo con SUS datos (ver rsvp-api.js).
------------------------------------------------------------------ */
const TOKEN_INVITADO = (new URLSearchParams(location.search).get('i') || '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 8);

const MENSAJES_ERROR_RSVP = {
  NO_ENCONTRADO: 'No pudimos reconocer tu enlace de invitación. Escríbenos y lo revisamos contigo.',
  TOKEN_INVALIDO: 'No pudimos reconocer tu enlace de invitación. Escríbenos y lo revisamos contigo.',
  CERRADO: 'El plazo para confirmar ya cerró. Si necesitas hacer un cambio, escríbenos directamente.',
  EXCEDE_MAX: 'Ese número de pases excede los que tienes asignados. Ajusta la cantidad e inténtalo de nuevo.',
  DATOS_INVALIDOS: 'Algo no cuadró con tu confirmación. Inténtalo de nuevo.',
  TIMEOUT: 'La conexión tardó demasiado. Revisa tu internet e inténtalo de nuevo.',
  ERROR_INTERNO: 'No pudimos procesar tu confirmación en este momento. Inténtalo más tarde.',
};

function mensajeErrorRsvp(codigo) {
  return MENSAJES_ERROR_RSVP[codigo] || MENSAJES_ERROR_RSVP.ERROR_INTERNO;
}

async function cargarInvitado() {
  const bloque = document.getElementById('rsvp-invitado');
  const aviso = document.getElementById('rsvp-aviso');
  const form = document.getElementById('rsvp-form');
  if (!bloque || !aviso || !form) return;

  const mostrarAviso = (texto) => {
    aviso.textContent = texto;
    aviso.hidden = false;
    bloque.hidden = true;
    form.hidden = true;
  };

  if (!TOKEN_INVITADO) {
    return mostrarAviso(
      'Consulta tu invitación personalizada en el enlace que te enviamos. ' +
      'Si no lo encuentras, escríbenos y con gusto te lo reenviamos.'
    );
  }

  // Estado de carga: nunca dejar el bloque vacío mientras responde el servidor.
  mostrarAviso('Cargando tu invitación…');

  try {
    const datos = await lookupInvitado(TOKEN_INVITADO);

    document.getElementById('rsvp-invitado-nombre').textContent = datos.nombre_display;
    document.getElementById('rsvp-boletos-num').textContent = datos.pases_max;
    document.getElementById('rsvp-boletos-texto').textContent =
      datos.pases_max === 1 ? 'lugar' : 'lugares';

    // El selector se arma con los pases asignados: no hay forma de elegir más.
    const selector = document.getElementById('rsvp-asistentes');
    selector.innerHTML = '';
    for (let i = 1; i <= datos.pases_max; i++) {
      const op = document.createElement('option');
      op.value = String(i);
      op.textContent = i === 1 ? '1 persona' : i + ' personas';
      selector.appendChild(op);
    }

    const asistenciaSelect = document.getElementById('rsvp-asistencia');
    const campoAsistentes = document.getElementById('campo-asistentes');
    const boton = form.querySelector('button[type="submit"]');
    const yaRespondio = datos.estatus === 'confirmado' || datos.estatus === 'no_asiste';

    if (yaRespondio) {
      asistenciaSelect.value = datos.estatus === 'confirmado' ? 'si' : 'no';
      if (campoAsistentes) campoAsistentes.hidden = datos.estatus !== 'confirmado';
      selector.value = String(datos.pases_confirmados || datos.pases_max);
      boton.textContent = 'Actualizar mi confirmación';
      mostrarEstado(
        document.getElementById('rsvp-estado'),
        `Ya tenemos tu confirmación: ${datos.pases_confirmados} de ${datos.pases_max} pases. Si algo cambió, puedes actualizarla.`,
        'ok'
      );
    } else {
      selector.value = String(datos.pases_max);
    }

    if (!datos.editable) {
      asistenciaSelect.disabled = true;
      selector.disabled = true;
      boton.disabled = true;
      mostrarEstado(document.getElementById('rsvp-estado'), 'El plazo para confirmar o editar tu respuesta ya cerró.', 'error');
    }

    bloque.hidden = false;
    form.hidden = false;
    aviso.hidden = true;
  } catch (err) {
    console.error(err);
    mostrarAviso(mensajeErrorRsvp(err.codigo));
  }
}

// El campo de asistentes solo tiene sentido si la respuesta es "sí"
document.getElementById('rsvp-asistencia')?.addEventListener('change', (e) => {
  const campo = document.getElementById('campo-asistentes');
  if (campo) campo.hidden = e.target.value !== 'si';
});

cargarInvitado();

// Sugerencia de canciones
document.getElementById('song-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const input = document.getElementById('song-input');
  const estado = document.getElementById('song-estado');
  const boton = form.querySelector('button[type="submit"]');
  const cancion = input.value.trim();

  if (!cancion) return;
  if (!puedeEnviar('ultima-cancion')) {
    return mostrarEstado(estado, 'Espera unos segundos antes de enviar otra.', 'error');
  }

  boton.disabled = true;
  mostrarEstado(estado, 'Enviando…');

  try {
    await enviarDatos({
      tipo: 'cancion',
      cancion,
      codigo: TOKEN_INVITADO,
      website: form.querySelector('[name="website"]').value,
    });

    registrarEnvio('ultima-cancion');
    const li = document.createElement('li');
    li.textContent = cancion;
    document.getElementById('song-list').appendChild(li);
    input.value = '';
    mostrarEstado(estado, '¡Gracias! Tu sugerencia quedó registrada.', 'ok');
  } catch (err) {
    mostrarEstado(estado, 'No pudimos guardar tu sugerencia. Inténtalo de nuevo.', 'error');
    console.error(err);
  } finally {
    boton.disabled = false;
  }
});

// Tabs Novia/Novio
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
  });
});

// Confirmación de asistencia
document.getElementById('rsvp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const estado = document.getElementById('rsvp-estado');
  const boton = form.querySelector('button[type="submit"]');

  const asistencia = document.getElementById('rsvp-asistencia').value;
  const asistentes = document.getElementById('rsvp-asistentes').value;

  if (!asistencia) {
    return mostrarEstado(estado, 'Indícanos si podrás acompañarnos.', 'error');
  }
  if (form.querySelector('[name="website"]').value) return; // campo trampa
  if (!puedeEnviar('ultimo-rsvp')) {
    return mostrarEstado(estado, 'Ya recibimos tu confirmación hace un momento.', 'error');
  }

  const textoOriginalBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Enviando…';
  mostrarEstado(estado, 'Enviando…');

  try {
    const datos = await enviarRsvp({
      token: TOKEN_INVITADO,
      asiste: asistencia === 'si',
      pases: asistencia === 'si' ? parseInt(asistentes, 10) : 0,
    });

    registrarEnvio('ultimo-rsvp');
    boton.textContent = 'Actualizar mi confirmación';
    mostrarEstado(
      estado,
      datos.estatus === 'confirmado'
        ? `Confirmado: ${datos.pases_confirmados} de ${datos.pases_max} pases. ¡Los esperamos!`
        : 'Gracias por avisarnos, te vamos a extrañar.',
      'ok'
    );
  } catch (err) {
    boton.textContent = textoOriginalBoton;
    mostrarEstado(estado, mensajeErrorRsvp(err.codigo), 'error');
    console.error(err);
  } finally {
    boton.disabled = false;
  }
});

// Posicionar el sello exactamente sobre la solapa del sobre (responsive)
// Debounce helper
function debounce(fn, wait = 100) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function updateCountdown() {
  const target = new Date('2026-12-18T16:30:00');
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-min');
  const secsEl = document.getElementById('cd-sec');

  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  if (diff <= 0) {
    daysEl.textContent = '00';
    hoursEl.textContent = '00';
    minsEl.textContent = '00';
    secsEl.textContent = '00';
    return;
  }

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  daysEl.textContent = String(days).padStart(2, '0');
  hoursEl.textContent = String(hours).padStart(2, '0');
  minsEl.textContent = String(mins).padStart(2, '0');
  secsEl.textContent = String(secs).padStart(2, '0');
}

window.addEventListener('load', () => {
  // Inicializar observer para que todos los elementos .reveal aparezcan con animación al hacer scroll
  const revealItems = Array.from(document.querySelectorAll('.reveal'));

  if (revealItems.length) {
    const io = new IntersectionObserver((entries) => {
      // El escalonado se cuenta solo entre los elementos que entran juntos y
      // se limita a 300 ms. Antes usaba la posición global en la página, así
      // que las secciones del final tardaban varios segundos en aparecer.
      entries
        .filter(entry => entry.isIntersecting)
        .forEach((entry, i) => {
          entry.target.style.transitionDelay = Math.min(i * 80, 300) + 'ms';
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        });
    }, { threshold: 0.2 });

    revealItems.forEach(it => io.observe(it));
  }

  const addCalendarBtn = document.getElementById('add-calendar-btn');
  const calendarModal = document.getElementById('calendar-modal');
  const closeCalendarModal = document.getElementById('close-calendar-modal');
  const calendarCloseBtn = document.getElementById('calendar-close-btn');
  const gmailLink = document.getElementById('gmail-link');
  const outlookLink = document.getElementById('outlook-link');
  const yahooLink = document.getElementById('yahoo-link');
  const appleLink = document.getElementById('apple-link');

  const eventTitle = 'Boda de Ailec y Omar';
  const eventDescription = 'Ceremonia de boda en la iglesia y celebración con familiares y amigos.';
  const eventLocation = 'Iglesia de la Ciudad, Saltillo';
  const start = new Date('2026-12-18T16:30:00');
  const end = new Date('2026-12-18T18:30:00');
  const formatDate = (date) => date.toISOString().replace(/-|:|\.00Z/g, '');

  const gmailUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}&dates=${formatDate(start)}/${formatDate(end)}`;
  const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(eventDescription)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}&location=${encodeURIComponent(eventLocation)}`;
  const yahooUrl = `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(eventTitle)}&st=${encodeURIComponent(formatDate(start))}&dur=0200&desc=${encodeURIComponent(eventDescription)}&in_loc=${encodeURIComponent(eventLocation)}`;
  const appleUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:${encodeURIComponent(eventTitle)}%0ADESCRIPTION:${encodeURIComponent(eventDescription)}%0ALOCATION:${encodeURIComponent(eventLocation)}%0ADTSTART:${encodeURIComponent(formatDate(start))}%0ADTEND:${encodeURIComponent(formatDate(end))}%0AEND:VEVENT%0AEND:VCALENDAR`;

  if (gmailLink) gmailLink.href = gmailUrl;
  if (outlookLink) outlookLink.href = outlookUrl;
  if (yahooLink) yahooLink.href = yahooUrl;
  if (appleLink) appleLink.href = appleUrl;

  const closeModal = () => {
    calendarModal?.classList.remove('open');
  };

  addCalendarBtn?.addEventListener('click', () => {
    calendarModal?.classList.add('open');
  });
  closeCalendarModal?.addEventListener('click', closeModal);
  calendarCloseBtn?.addEventListener('click', closeModal);
  calendarModal?.addEventListener('click', (event) => {
    if (event.target === calendarModal) closeModal();
  });

  updateCountdown();
  setInterval(updateCountdown, 1000);
});