import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkReachDirectory } from './reach.js'

// Prints the CHECK owner suites the fast tier runs for the changes since a base revision
// (default HEAD, which covers uncommitted work):
// - changed owner suites themselves;
// - suites whose recorded reach includes a changed runtime source file;
// - a smoke set when shared TypeScript, transpiler or harness code changed, because those affect
//   every suite in ways reach does not record. The full tier (check.sh) covers the rest.
// Suites without reach data are reported on stderr; a full run records them.
const smoke = [
  'tests/sql-semantics/check-float.test.ts',
  'tests/sql-semantics/check-number-format.test.ts',
  'tests/sql-semantics/check-jsonb-shapes.test.ts',
  'tests/sql-semantics/check-json-populate.test.ts',
  'tests/sql-semantics/check-time-functions.test.ts',
  'tests/sql-semantics/check-interval-operations.test.ts',
  'tests/sql-semantics/check-text-format.test.ts',
  'tests/sql-semantics/check-composite-projections.test.ts',
  'tests/sql-semantics/check-name-patterns.test.ts',
  'tests/sql-semantics/check-range-support-values.test.ts',
  'tests/sql-semantics/check-timestamptz-session-input.test.ts',
  'tests/sql-semantics/check-anonymous-record-json.test.ts',
  'tests/sql-semantics/check-translation-reuse.test.ts',
]

const base = process.argv[2] ?? 'HEAD'
const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.length > 0)
const changed = new Set([
  ...git(['diff', '--name-only', base]),
  ...git(['ls-files', '--others', '--exclude-standard']),
])

const owners = readdirSync('tests/sql-semantics')
  .filter((name) => /^check-.*\.test\.ts$/u.test(name))
  .map((name) => join('tests/sql-semantics', name))
const selected = new Set<string>()
for (const path of changed) if (owners.includes(path) && existsSync(path)) selected.add(path)

const runtimeChanges = [...changed].filter((path) => /^crates\/[^/]+\/src\//u.test(path))
const missing: string[] = []
if (runtimeChanges.length)
  for (const suite of owners) {
    const record = join(checkReachDirectory, suite.split('/').pop()! + '.json')
    if (!existsSync(record)) {
      missing.push(suite)
      continue
    }
    const files = new Set((JSON.parse(readFileSync(record, 'utf8')) as { files: string[] }).files)
    if (runtimeChanges.some((path) => files.has(path))) selected.add(suite)
  }

if (
  [...changed].some(
    (path) =>
      /^src\//u.test(path) ||
      /^tools\/check-(?:transpiler|rust)\//u.test(path) ||
      path === 'scripts/build-check-rust-wasm.sh',
  )
)
  for (const suite of smoke) selected.add(suite)

if (missing.length)
  process.stderr.write(
    `${missing.length} CHECK suites have no reach record and are not selected; a full run records them.\n`,
  )
for (const suite of [...selected].sort()) process.stdout.write(suite + '\n')
