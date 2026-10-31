import { readFileSync } from 'node:fs'

// Each report line holds the suite directory, check, fixture, expected and actual outcomes, and
// the sites that started the deferral, joined by a unit separator. A site reads
// "<flavor>@<file>:<line>" with the line's text in braces when the file is generated code.
const [report, ...options] = process.argv.slice(2)
if (!report) throw new Error('usage: origins.ts <origins.tsv> [--rows N]')
const rowsOption = options.indexOf('--rows')
const limit = rowsOption === -1 ? 60 : Number(options[rowsOption + 1])

// Crate helpers that return an unresolved value only as a placeholder their caller replaces.
const placeholders = new Set(['crates/check-evaluator/src/logic.rs#distinct_nulls_finish'])
// Generated stand-ins: initializers every branch assigns, the upper bound a range finishes with
// before its lower bound lets parsing continue, and the symbolic inputs of a domain preparation.
const generatedPlaceholders = [
  /^let mut \w+\s*:\s*\w+\s*=\s*\w+_unknown\(\);$/u,
  /^let range_input_unknown_?\d*\s*=\s*\w+_unknown\(\);$/u,
  /^let domain_preparation_input_?\d*\s*=\s*\w+_unknown\(\);$/u,
]
const sources = new Map<string, string[]>()

const enclosingFunction = (path: string, line: number): string => {
  if (!sources.has(path)) {
    try {
      sources.set(path, readFileSync(path, 'utf8').split('\n'))
    } catch {
      sources.set(path, [])
    }
  }
  const lines = sources.get(path)!
  for (let index = Math.min(line, lines.length) - 1; index >= 0; index--) {
    const match = /^(?:pub(?:\(crate\))? )?fn (\w+)/u.exec(lines[index]!)
    if (match) return match[1]!
  }
  return '?'
}

// Generated sites group by their text without fresh-name suffixes, since lines differ by suite.
const site = (raw: string): { label: string; place: string } | null => {
  const match = /^(first\d|[IU])@([^:]+):(\d+)(?:\{(.*)\})?$/u.exec(raw)
  if (!match) return null
  const [, label, path, line, text] = match
  if (text !== undefined) {
    const shown = text
      .replace(/\{ crate::checkruntime::parity_origin\(\d, \d\); (.*?) \}/gu, '$1')
      .trim()
    if (generatedPlaceholders.some((pattern) => pattern.test(shown))) return null
    return { label: label!, place: 'generated: ' + shown.replace(/_\d+\b/gu, '') }
  }
  const name = enclosingFunction(path!, Number(line))
  if (placeholders.has(`${path}#${name}`)) return null
  return { label: label!, place: `${path}:${line} (${name})` }
}

const counts = new Map<string, number>()
const examples = new Map<string, string[]>()
const outcomes = new Map<string, number>()
for (const line of readFileSync(report, 'utf8').split('\n')) {
  const [directory, check, fixture, expected, actual, sites] = line.split('\t')
  if (sites === undefined) continue
  const suite = directory!.replace(/^.*\/pgsid-|-[A-Za-z0-9]{6}$/gu, '')
  // Unimplemented wins every join, so only origins of the result's own flavor can have decided it.
  const kept = sites
    .split('\u001f')
    .filter(Boolean)
    .map(site)
    .filter((item) => item !== null)
    .filter((item) => item.label === actual || item.label.startsWith('first'))
  // A row without a recorded site took its unresolved value from a fixture input.
  const places = kept.length ? kept : [{ label: '?', place: 'no origin recorded (fixture input)' }]
  outcomes.set(actual!, (outcomes.get(actual!) ?? 0) + 1)
  for (const key of new Set(places.map((item) => `${actual}\t${item.label}\t${item.place}`))) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
    const shown = examples.get(key) ?? []
    if (shown.length < 3) shown.push(`${suite}/${check}#${fixture} (expected ${expected})`)
    examples.set(key, shown)
  }
}
console.log('outcomes:', Object.fromEntries(outcomes))
for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit)) {
  const [actual, label, place] = key.split('\t')
  console.log(`${String(count).padStart(6)}  result ${actual}  origin ${label}  ${place}`)
  for (const example of examples.get(key)!) console.log(`          ${example}`)
}
