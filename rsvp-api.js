/* ------------------------------------------------------------------
   Capa de datos del RSVP (Fase 2 de RSVP-SPEC.md)
   Único lugar donde vive la URL del Web App de Apps Script.
   Pasos completos en INSTRUCCIONES-BASE-DATOS.md
------------------------------------------------------------------ */
const ENDPOINT_DATOS = 'https://script.google.com/macros/s/AKfycbz18Ybt26ubAgW68b6FelAIci1tJU9oBBXwWFlTLThbdb5lOMBiJgqA3-eRqkwfTmho/exec';

const RSVP_TIMEOUT_MS = 10000;

function iniciarTimeout(ms) {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), ms);
  return { signal: controlador.signal, cancelar: () => clearTimeout(id) };
}

function errorConCodigo(codigo) {
  const err = new Error(codigo);
  err.codigo = codigo;
  return err;
}

async function llamarApi(url, opciones) {
  const { signal, cancelar } = iniciarTimeout(RSVP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opciones, signal });
    const respuesta = await res.json();
    if (!respuesta.ok) throw errorConCodigo(respuesta.error || 'ERROR_INTERNO');
    return respuesta.data;
  } catch (err) {
    if (err.name === 'AbortError') throw errorConCodigo('TIMEOUT');
    if (err.codigo) throw err;
    throw errorConCodigo('ERROR_INTERNO');
  } finally {
    cancelar();
  }
}

/**
 * Consulta los datos de un invitado por su token.
 * Rechaza con un Error cuyo `.codigo` es uno de los definidos en
 * RSVP-SPEC.md (TOKEN_INVALIDO, NO_ENCONTRADO, CERRADO, ERROR_INTERNO,
 * TIMEOUT).
 */
function lookupInvitado(token) {
  const url = ENDPOINT_DATOS + '?action=lookup&token=' + encodeURIComponent(token);
  return llamarApi(url);
}

/**
 * Envía o actualiza la confirmación de un invitado.
 * payload: { token, asiste, pases, acompanantes, mensaje }
 * Rechaza con un Error cuyo `.codigo` puede ser EXCEDE_MAX, CERRADO,
 * DATOS_INVALIDOS, TOKEN_INVALIDO, NO_ENCONTRADO, ERROR_INTERNO, TIMEOUT.
 */
function enviarRsvp(payload) {
  return llamarApi(ENDPOINT_DATOS, {
    method: 'POST',
    // text/plain evita el preflight de CORS, que Apps Script no responde.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'rsvp', ...payload }),
  });
}

/* ------------------------------------------------------------------
   Prueba manual de Fase 2: si la URL trae ?i=token, se hace un lookup
   y se muestra el resultado en consola. No toca el DOM ni la UI — eso
   llega en la Fase 3. Se puede borrar este bloque en ese momento.
------------------------------------------------------------------ */
(function pruebaLookup() {
  const token = (new URLSearchParams(location.search).get('i') || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);

  if (!token) return;

  console.log('[rsvp-api] probando lookupInvitado con token:', token);
  lookupInvitado(token)
    .then(data => console.log('[rsvp-api] lookup OK', data))
    .catch(err => console.warn('[rsvp-api] lookup ERROR', err.codigo || err.message));
})();
