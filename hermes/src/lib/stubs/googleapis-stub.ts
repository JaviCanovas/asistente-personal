// Stub vacío de googleapis para el bundle del navegador.
// googleapis solo se usa en el servidor para sincronización con Google Calendar.
export const google = {
  auth: { OAuth2: class {} },
  calendar: () => ({}),
}
export default { google }
