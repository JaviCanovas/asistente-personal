// Stub vacío de chrono-node para el bundle del navegador.
// chrono-node solo se usa en el servidor (clasificarItem en page.tsx server components).
export const es = {
  parse: () => [],
  parseDate: () => null,
}
export const parse = () => []
export const parseDate = () => null
export default { es, parse, parseDate }
