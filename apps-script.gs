/**
 * Backend de la invitación de Ailec & Omar.
 *
 * RSVP con pases personalizados por invitado (ver RSVP-SPEC.md).
 * Cada invitado tiene un `token` de 8 caracteres que da acceso ÚNICAMENTE a
 * sus propios datos: nunca la lista completa ni conteos globales.
 *
 * También conserva, sin tocar su contrato, la sugerencia de canciones
 * (Canciones) que ya operaba antes del RSVP y no forma parte de esta spec.
 *
 * Instalación: ver INSTRUCCIONES-BASE-DATOS.md
 */

// Fecha límite para poder confirmar/editar el RSVP ('' = sin límite).
// Formato: 'YYYY-MM-DDTHH:mm:ss' en la zona horaria del proyecto de Apps Script.
const FECHA_CORTE = '2026-11-20T23:59:59';

// Dirección donde está publicada la invitación, sin barra final.
// Se usa solo para armar los enlaces de WhatsApp (generarEnlacesWhatsapp).
const URL_INVITACION = 'https://ailecomar.weeding.workers.dev';

const HOJA_INVITADOS = 'Invitados';
const HOJA_RESUMEN = 'Resumen';
const HOJA_LOG = 'Log';
const HOJA_CANCIONES = 'Canciones'; // fuera del alcance de RSVP-SPEC, se conserva tal cual

// Columnas (1-indexadas) de la hoja Invitados.
const COL = {
  TOKEN: 1,
  NOMBRE: 2,
  TIPO: 3,
  PASES_MAX: 4,
  PASES_CONFIRMADOS: 5,
  ESTATUS: 6,
  ACOMPANANTES: 7,
  TELEFONO: 8,
  MENSAJE: 9,
  FECHA_RESPUESTA: 10,
  ENLACE_WHATSAPP: 11,
};

const ENCABEZADOS = {
  [HOJA_INVITADOS]: [
    'token', 'nombre_display', 'tipo', 'pases_max', 'pases_confirmados',
    'estatus', 'acompanantes', 'telefono', 'mensaje', 'fecha_respuesta',
    'enlace_whatsapp',
  ],
  [HOJA_LOG]: ['timestamp', 'token', 'accion', 'resultado'],
  [HOJA_CANCIONES]: ['Fecha', 'Canción sugerida', 'Sugerida por'],
};

/* ============================ LECTURA ============================ */

/**
 * Único dato consultable: los datos de UN invitado, dado su token.
 * Sin token válido no devuelve nada.
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    if (params.action !== 'lookup') {
      return responder({ ok: false, error: 'DATOS_INVALIDOS' });
    }

    const token = normalizarToken(params.token || '');
    if (!esTokenValido(token)) {
      return responder({ ok: false, error: 'TOKEN_INVALIDO' });
    }

    const invitado = buscarInvitado(token);
    if (!invitado) {
      registrarLog(token, 'lookup', 'NO_ENCONTRADO');
      return responder({ ok: false, error: 'NO_ENCONTRADO' });
    }

    registrarLog(token, 'lookup', 'ok');
    return responder({
      ok: true,
      data: {
        nombre_display: invitado.nombre_display,
        tipo: invitado.tipo,
        pases_max: invitado.pases_max,
        pases_confirmados: invitado.pases_confirmados,
        acompanantes: invitado.acompanantes,
        estatus: invitado.estatus,
        editable: !haCerrado(),
      },
    });
  } catch (err) {
    return responder({ ok: false, error: 'ERROR_INTERNO' });
  }
}

/* ============================ ESCRITURA ============================ */

function doPost(e) {
  // Un candado evita que dos envíos simultáneos se pisen la misma fila.
  const candado = LockService.getScriptLock();
  try {
    candado.waitLock(20000);
  } catch (err) {
    return responder({ ok: false, error: 'ERROR_INTERNO' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responder({ ok: false, error: 'DATOS_INVALIDOS' });
    }

    const datos = JSON.parse(e.postData.contents);

    // Campo trampa: solo lo llenan los bots. Respondemos ok para que no
    // reintenten, pero no se guarda nada.
    if (datos.website) return responder({ ok: true });

    if (datos.action === 'rsvp') return guardarRsvp(datos);
    if (datos.tipo === 'cancion') return guardarCancion(datos);

    return responder({ ok: false, error: 'DATOS_INVALIDOS' });
  } catch (err) {
    return responder({ ok: false, error: 'ERROR_INTERNO' });
  } finally {
    candado.releaseLock();
  }
}

function guardarRsvp(datos) {
  const token = normalizarToken(datos.token || '');
  if (!esTokenValido(token)) {
    registrarLog(token, 'rsvp', 'TOKEN_INVALIDO');
    return responder({ ok: false, error: 'TOKEN_INVALIDO' });
  }

  if (typeof datos.asiste !== 'boolean') {
    registrarLog(token, 'rsvp', 'DATOS_INVALIDOS');
    return responder({ ok: false, error: 'DATOS_INVALIDOS' });
  }

  // El invitado y su pases_max se leen de la hoja EN ESTE MOMENTO: es la
  // única fuente de verdad, sin importar lo que haya mandado el navegador.
  const invitado = buscarInvitado(token);
  if (!invitado) {
    registrarLog(token, 'rsvp', 'NO_ENCONTRADO');
    return responder({ ok: false, error: 'NO_ENCONTRADO' });
  }

  if (haCerrado()) {
    registrarLog(token, 'rsvp', 'CERRADO');
    return responder({ ok: false, error: 'CERRADO' });
  }

  const asiste = datos.asiste === true;
  let pases = parseInt(datos.pases, 10);
  if (isNaN(pases) || pases < 0) pases = 0;

  if (asiste) {
    if (pases > invitado.pases_max) {
      registrarLog(token, 'rsvp', 'EXCEDE_MAX');
      return responder({ ok: false, error: 'EXCEDE_MAX' });
    }
  } else {
    pases = 0;
  }

  const acompanantes = Array.isArray(datos.acompanantes)
    ? datos.acompanantes.map(n => limpiar(n, 80)).filter(Boolean).slice(0, invitado.pases_max).join(';')
    : '';
  const mensaje = limpiar(datos.mensaje, 500);
  const estatus = asiste ? 'confirmado' : 'no_asiste';

  const h = hoja(HOJA_INVITADOS);
  h.getRange(invitado.fila, COL.PASES_CONFIRMADOS).setValue(pases);
  h.getRange(invitado.fila, COL.ESTATUS).setValue(estatus);
  h.getRange(invitado.fila, COL.ACOMPANANTES).setValue(acompanantes);
  h.getRange(invitado.fila, COL.MENSAJE).setValue(mensaje);
  h.getRange(invitado.fila, COL.FECHA_RESPUESTA).setValue(new Date());

  registrarLog(token, 'rsvp', 'ok');
  return responder({
    ok: true,
    data: {
      pases_confirmados: pases,
      pases_max: invitado.pases_max,
      estatus: estatus,
    },
  });
}

// Sugerencia de canciones: no forma parte de RSVP-SPEC, se conserva igual
// que antes de esta migración (mismo contrato que ya usa script.js).
function guardarCancion(datos) {
  const cancion = limpiar(datos.cancion, 120);
  if (!cancion) return responder({ ok: false, error: 'cancion_requerida' });

  const invitado = buscarInvitado(normalizarToken(datos.codigo));
  hoja(HOJA_CANCIONES).appendRow([new Date(), cancion, invitado ? invitado.nombre_display : '—']);

  return responder({ ok: true });
}

/* ============================ AUXILIARES ============================ */

function buscarInvitado(token) {
  if (!token) return null;

  const filas = hoja(HOJA_INVITADOS).getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (normalizarToken(filas[i][COL.TOKEN - 1]) !== token) continue;

    return {
      fila: i + 1,
      token: token,
      nombre_display: limpiar(filas[i][COL.NOMBRE - 1], 80),
      tipo: String(filas[i][COL.TIPO - 1] || 'familia').trim(),
      pases_max: Math.min(Math.max(parseInt(filas[i][COL.PASES_MAX - 1], 10) || 1, 1), 10),
      pases_confirmados: parseInt(filas[i][COL.PASES_CONFIRMADOS - 1], 10) || 0,
      estatus: String(filas[i][COL.ESTATUS - 1] || 'pendiente').trim(),
      acompanantes: String(filas[i][COL.ACOMPANANTES - 1] || ''),
    };
  }
  return null;
}

function haCerrado() {
  if (!FECHA_CORTE) return false;
  return new Date() > new Date(FECHA_CORTE);
}

function registrarLog(token, accion, resultado) {
  try {
    hoja(HOJA_LOG).appendRow([new Date(), token || '', accion, resultado]);
  } catch (err) {
    // No bloquear la operación principal si falla el registro de auditoría.
  }
}

function hoja(nombre) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    const encabezados = ENCABEZADOS[nombre];
    if (encabezados) {
      h.appendRow(encabezados);
      h.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
      h.setFrozenRows(1);
    }
  }
  return h;
}

function hojaResumen() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA_RESUMEN);
  if (h) return h;

  h = libro.insertSheet(HOJA_RESUMEN);
  // Separador ";" entre argumentos: la hoja usa configuración regional en
  // español, donde "," rompe COUNTIF/SUMIF con #ERROR!.
  const filas = [
    ['Métrica', 'Valor'],
    ['Invitados totales', '=COUNTA(Invitados!B2:B)'],
    ['Confirmados', '=COUNTIF(Invitados!F2:F;"confirmado")'],
    ['Pendientes', '=COUNTIF(Invitados!F2:F;"pendiente")'],
    ['No asisten', '=COUNTIF(Invitados!F2:F;"no_asiste")'],
    ['Pases comprometidos', '=SUMIF(Invitados!F2:F;"confirmado";Invitados!E2:E)'],
    ['Pases liberados', '=SUMIF(Invitados!F2:F;"confirmado";Invitados!D2:D)+SUMIF(Invitados!F2:F;"no_asiste";Invitados!D2:D)-SUMIF(Invitados!F2:F;"confirmado";Invitados!E2:E)'],
  ];
  h.getRange(1, 1, filas.length, 2).setValues(filas);
  h.getRange(1, 1, 1, 2).setFontWeight('bold');
  h.setFrozenRows(1);
  return h;
}

function normalizarToken(valor) {
  return String(valor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function esTokenValido(token) {
  return /^[a-z0-9]{8}$/.test(token);
}

function limpiar(valor, maximo) {
  return String(valor || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maximo);
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==================================================================
   UTILIDAD MANUAL
   Ejecútala desde el editor (menú Ejecutar) después de escribir los
   nombres y pases_max en la pestaña "Invitados". Rellena los tokens que
   falten (8 caracteres, minúsculas, no secuenciales) e inicializa
   estatus/pases_confirmados/tipo por defecto. También crea la hoja
   "Resumen" si no existe.
================================================================== */
function generarTokens() {
  const h = hoja(HOJA_INVITADOS);
  const filas = h.getDataRange().getValues();
  const usados = {};
  filas.slice(1).forEach(f => {
    const t = normalizarToken(f[COL.TOKEN - 1]);
    if (t) usados[t] = true;
  });

  let generados = 0;
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i][COL.NOMBRE - 1] || '').trim();
    if (!nombre) continue;

    const tokenActual = normalizarToken(filas[i][COL.TOKEN - 1]);
    if (!tokenActual) {
      let token;
      do {
        token = tokenAleatorio();
      } while (usados[token]);
      usados[token] = true;
      h.getRange(i + 1, COL.TOKEN).setValue(token);
      generados++;
    }

    if (!filas[i][COL.TIPO - 1]) h.getRange(i + 1, COL.TIPO).setValue('familia');
    if (!filas[i][COL.ESTATUS - 1]) h.getRange(i + 1, COL.ESTATUS).setValue('pendiente');
    if (filas[i][COL.PASES_CONFIRMADOS - 1] === '' || filas[i][COL.PASES_CONFIRMADOS - 1] === null) {
      h.getRange(i + 1, COL.PASES_CONFIRMADOS).setValue(0);
    }
  }

  hojaResumen();
  SpreadsheetApp.getActiveSpreadsheet().toast(generados + ' token(s) nuevo(s) generado(s).');
}

function tokenAleatorio() {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
  }
  return token;
}

/* ==================================================================
   UTILIDAD MANUAL — FASE 5
   Ejecútala después de generarTokens() para armar, por cada invitado,
   un link de WhatsApp con su mensaje y su enlace personal ya escritos.
   Si la columna "telefono" tiene un número, el link abre el chat
   directo con ese invitado; si está vacía, abre el selector de
   contactos de WhatsApp para que elijas a quién mandárselo.
================================================================== */
function generarEnlacesWhatsapp() {
  if (!URL_INVITACION || URL_INVITACION === 'https://ejemplo.pages.dev') {
    SpreadsheetApp.getActiveSpreadsheet().toast('Define URL_INVITACION con tu dominio real antes de generar los enlaces.');
    return;
  }

  const h = hoja(HOJA_INVITADOS);
  const filas = h.getDataRange().getValues();

  if (!filas[0][COL.ENLACE_WHATSAPP - 1]) {
    h.getRange(1, COL.ENLACE_WHATSAPP).setValue('enlace_whatsapp').setFontWeight('bold');
  }

  let generados = 0;
  for (let i = 1; i < filas.length; i++) {
    const token = normalizarToken(filas[i][COL.TOKEN - 1]);
    if (!token) continue; // corre generarTokens() primero si falta

    const nombre = String(filas[i][COL.NOMBRE - 1] || '').trim();
    const pasesMax = parseInt(filas[i][COL.PASES_MAX - 1], 10) || 1;
    const telefono = String(filas[i][COL.TELEFONO - 1] || '').replace(/[^0-9]/g, '');

    const enlace = URL_INVITACION + '?i=' + token;
    const mensaje =
      '¡Hola!\n\n' +
      'Con mucho cariño queremos invitarte a celebrar nuestra boda. Será el domingo 18 de diciembre de 2026 a las 4:30 pm — nos encantaría tenerte ahí.\n\n' +
      'Reservamos ' + pasesMax + (pasesMax === 1 ? ' pase' : ' pases') + ' para ' + nombre + '.\n\n' +
      'Aquí puedes ver todos los detalles y confirmar tu asistencia:\n' + enlace + '\n\n' +
      '¡Te esperamos!\n' +
      'Ailec & Omar';

    const base = telefono ? 'https://wa.me/' + telefono : 'https://wa.me/';
    const urlWhatsapp = base + '?text=' + encodeURIComponent(mensaje);

    h.getRange(i + 1, COL.ENLACE_WHATSAPP).setValue(urlWhatsapp);
    generados++;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(generados + ' enlace(s) de WhatsApp generado(s).');
}
