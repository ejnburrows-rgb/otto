import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// Regenera docs/cambios.md desde el historial de commits de main.
// Filtra cambios internos (chore, ci, test, refactor) y traduce los prefijos
// comunes a frases en español simple, orientadas al cliente.

const EXCLUDED_PREFIXES = [
  'chore', 'ci', 'test', 'refactor', 'build', 'style', 'merge branch',
  'merge pull', 'wip', 'revert', 'docs internal', 'chore:', 'ci:', 'test:',
  'refactor:', 'build:', 'style:', 'revert:'
]

const PREFIX_MAP = {
  'feat': 'Ahora se puede',
  'fix': 'Se corrigió',
  'perf': 'Ahora carga más rápido:',
  'a11y': 'Ahora es más fácil de usar:',
  'docs': 'Documentación actualizada:',
  'security': 'Seguridad mejorada:'
}

function toOutcome(message) {
  const lower = message.toLowerCase().trim()
  for (const prefix of EXCLUDED_PREFIXES) {
    if (lower.startsWith(prefix)) return null
  }
  for (const [prefix, spanish] of Object.entries(PREFIX_MAP)) {
    const re = new RegExp(`^${prefix}\\(?[^)]*\\)?:\\s*`, 'i')
    if (re