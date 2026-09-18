import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import Decimal from 'decimal.js'
import { PGlite } from '@electric-sql/pglite'
import {
  PG18_BUILTIN_GROUPS,
  PG18_BUILTINS_VERSION,
} from '../src/postgres/builtins/groups.generated.js'
import { observeSql } from '../tests/support/postgres/observe.js'
import type { SqlObservation } from '../tests/support/postgres/observe.js'

type Operation = 'power' | 'sqrt' | 'exp' | 'ln' | 'log10' | 'log'
interface Spec {
  name: string
  operation: Operation
  left: string | null
  right: string
  sql: string
}
interface LibraryObservation {
  kind: 'value' | 'null' | 'library-error' | 'timeout'
  value?: string
  message?: string
  elapsedMs: number
}
const run = promisify(execFile)
const specs: Spec[] = []
const literal = (value: string | null) => (value === null ? 'NULL::numeric' : `'${value}'::numeric`)
const add = (operation: Operation, left: string | null, right = '0', label = '') => {
  const sql =
    operation === 'power'
      ? `power(${literal(left)},${literal(right)})`
      : operation === 'log'
        ? `log(${literal(right)},${literal(left)})`
        : `${operation}(${literal(left)})`
  specs.push({
    name: `${operation} ${left}${['power', 'log'].includes(operation) ? ` / ${right}` : ''}${label ? ` ${label}` : ''}`,
    operation,
    left,
    right,
    sql,
  })
}
for (const operation of ['sqrt', 'ln', 'log10'] as const)
  for (const value of [
    null,
    '0',
    '1',
    '2',
    '4',
    '10',
    '0.1',
    '0.9',
    '1.1',
    '1.2300',
    '1.00000000000000000001',
    '0.99999999999999999999',
    '-1',
    '-0.1',
    'NaN',
    'Infinity',
    '-Infinity',
    '1e100',
    '1e-100',
  ])
    add(operation, value)
for (const value of [
  null,
  '0',
  '1',
  '-1',
  '2',
  '-2',
  '0.1',
  '-0.1',
  '10',
  '-10',
  '100',
  '-100',
  '1e-20',
  'NaN',
  'Infinity',
  '-Infinity',
  '6000',
  '-6000',
])
  add('exp', value)
for (const [left, right] of [
  ['2', '10'],
  ['2', '-3'],
  ['2', '0.5'],
  ['4', '0.5'],
  ['9', '0.5'],
  ['27', '0.33333333333333333333'],
  ['1.2300', '2.0'],
  ['0', '0'],
  ['0', '2'],
  ['0', '0.5'],
  ['0', '-1'],
  ['-2', '3'],
  ['-2', '4'],
  ['-2', '-3'],
  ['-2', '0.5'],
  ['1', 'NaN'],
  ['NaN', '0'],
  ['NaN', '1'],
  ['Infinity', '0'],
  ['Infinity', '-1'],
  ['-Infinity', '3'],
  ['-Infinity', '0.5'],
  ['2', 'Infinity'],
  ['0.5', 'Infinity'],
  ['-1', 'Infinity'],
  ['1.00000000000000000001', '1000000'],
  ['1e100', '0.5'],
  ['1e-100', '0.5'],
  ['3', '-100'],
  [null, '0'],
] as const)
  add('power', left, right)
for (const [value, base] of [
  ['64', '2'],
  ['100', '10'],
  ['1', '10'],
  ['0.1', '10'],
  ['2', '0.5'],
  ['2', '1'],
  ['2', '0'],
  ['2', '-1'],
  ['0', '2'],
  ['-1', '2'],
  ['NaN', '0'],
  ['Infinity', 'Infinity'],
  ['2', 'Infinity'],
  ['Infinity', '2'],
  ['Infinity', '0.5'],
  ['1.00000000000000000001', '1.00000000000000000002'],
  ['2', '1.00000000000000000001'],
  [null, '1'],
] as const)
  add('log', value, base)
for (const operation of ['sqrt', 'ln', 'log10'] as const)
  for (const value of [
    '1e-1000',
    '1.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
    '1.' + '0'.repeat(999) + '1',
  ])
    add(operation, value, '0', 'high precision')
for (const [left, right] of [
  ['2.000' + '0'.repeat(995), '0.5'],
  ['3.000' + '0'.repeat(995), '-1'],
] as const)
  add('power', left, right, 'high precision')
let seed = 0x1f83d9ab
for (let index = 0; index < 16; index++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const value = `${1 + (seed % 999)}.${seed.toString().padStart(10, '0')}`
  for (const operation of ['sqrt', 'ln', 'log10'] as const)
    add(operation, value, '0', `sample ${index}`)
  add('power', value, `${(index % 7) - 3}.125`, `sample ${index}`)
}

function target(expected: SqlObservation): { scale: number; digits: number } {
  if (expected.kind !== 'value' || !/^-?\d+(?:\.\d+)?$/.test(expected.value))
    return { scale: 16, digits: 34 }
  const [integer, fraction = ''] = expected.value.replace('-', '').split('.')
  return {
    scale: fraction.length,
    digits: Math.max(1, integer!.replace(/^0+/, '').length + fraction.length),
  }
}
function javascript(
  spec: Spec,
  scale: number,
  digits: number,
  guard: number | null,
  minimumPrecision = 34,
): LibraryObservation {
  const start = performance.now()
  try {
    if (spec.left === null) return { kind: 'null', elapsedMs: 0 }
    const Constructor = Decimal.clone({
      precision: guard === null ? 20 : Math.max(minimumPrecision, digits + guard),
      rounding: Decimal.ROUND_HALF_UP,
    })
    const a = new Constructor(spec.left),
      b = new Constructor(spec.right)
    let value: Decimal
    switch (spec.operation) {
      case 'sqrt':
        value = a.sqrt()
        break
      case 'power':
        value = a.pow(b)
        break
      case 'exp':
        value = a.exp()
        break
      case 'ln':
        value = a.ln()
        break
      case 'log10':
        value = a.log(10)
        break
      case 'log':
        value = a.log(b)
        break
    }
    return {
      kind: 'value',
      value:
        guard === null ? value.toString() : value.toDP(scale, Decimal.ROUND_HALF_UP).toFixed(scale),
      elapsedMs: performance.now() - start,
    }
  } catch (error) {
    return { kind: 'library-error', message: String(error), elapsedMs: performance.now() - start }
  }
}
function matches(expected: SqlObservation, actual: LibraryObservation, numeric = false): boolean {
  if (expected.kind !== actual.kind) return false
  if (expected.kind === 'null') return true
  if (expected.kind !== 'value') return false
  if (!numeric) return expected.value === actual.value
  if (expected.value === actual.value) return true
  try {
    return new Decimal(expected.value).eq(new Decimal(actual.value!))
  } catch {
    return false
  }
}

const directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-math-'))
const pg = await PGlite.create()
try {
  const version = await pg.query<{ server_version_num: string }>('SHOW server_version_num')
  if (Number(version.rows[0]!.server_version_num) !== PG18_BUILTINS_VERSION)
    throw new Error('Unexpected PostgreSQL version')
  for (const name of ['go.mod', 'go.sum'])
    await writeFile(
      join(directory, name),
      await readFile(new URL(`../tests/fixtures/sql-semantics/projects/${name}`, import.meta.url)),
    )
  await writeFile(
    join(directory, 'main.go'),
    await readFile(
      new URL('../tests/fixtures/sql-semantics/numeric-math/main.go', import.meta.url),
    ),
  )
  const binary = join(directory, 'probe')
  await run(process.env.PGSID_GO_BINARY ?? 'go', ['build', '-buildvcs=false', '-o', binary, '.'], {
    cwd: directory,
    timeout: 60000,
    env: {
      ...process.env,
      GOTOOLCHAIN: 'local',
      GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
      GOMODCACHE: process.env.GOMODCACHE ?? join(tmpdir(), 'pgsid-decimal-go-mod-cache'),
      GOFLAGS: '-mod=readonly',
    },
  })
  const rows: (Spec & {
    expected: SqlObservation
    calibration: { scale: number; digits: number }
    observations: Record<string, { decimalJs: LibraryObservation; shopspring: LibraryObservation }>
    refinement?: {
      workingPrecision: number
      decimalJs: LibraryObservation
      shopspring: LibraryObservation
    }
  })[] = process.argv.includes('--refine-only')
    ? JSON.parse(
        await readFile(
          new URL('../artifacts/sql-semantics/numeric-math-probe.json', import.meta.url),
          'utf8',
        ),
      ).rows
    : []
  for (const [index, spec] of (process.argv.includes('--refine-only') ? [] : specs).entries()) {
    const expected = await observeSql(pg, spec.sql)
    const { scale, digits } = target(expected)
    const observations: Record<
      string,
      { decimalJs: LibraryObservation; shopspring: LibraryObservation }
    > = {}
    for (const guard of [null, 0, 8, 16]) {
      const mode = guard === null ? 'native' : `guard${guard}`
      const output = join(directory, `${index}-${mode}.json`)
      let shopspring: LibraryObservation
      if (spec.left === null) shopspring = { kind: 'null', elapsedMs: 0 }
      else {
        const start = performance.now()
        try {
          await run(
            binary,
            [
              spec.operation,
              spec.left,
              spec.right,
              mode,
              String(scale),
              String(guard ?? 0),
              output,
            ],
            { timeout: 3000 },
          )
          shopspring = JSON.parse(await readFile(output, 'utf8')) as LibraryObservation
        } catch (error) {
          shopspring = {
            kind:
              error !== null && typeof error === 'object' && 'killed' in error && error.killed
                ? 'timeout'
                : 'library-error',
            message: String(error),
            elapsedMs: performance.now() - start,
          }
        }
      }
      observations[mode] = { decimalJs: javascript(spec, scale, digits, guard), shopspring }
    }
    rows.push({ ...spec, expected, calibration: { scale, digits }, observations })
    if ((index + 1) % 32 === 0)
      process.stderr.write(`Probed ${index + 1}/${specs.length} numeric math cases\n`)
  }
  const finite = rows.filter(
    (row) => row.expected.kind === 'value' && /^-?\d+(?:\.\d+)?$/.test(row.expected.value),
  )
  const finiteInputs = finite.filter(
    (row) =>
      row.left !== null && new Decimal(row.left).isFinite() && new Decimal(row.right).isFinite(),
  )
  for (const row of finiteInputs.filter(
    (row) =>
      [
        'sqrt 1e100',
        'power 1e100 / 0.5',
        'log 2 / 1.00000000000000000001',
        'sqrt 1.00000000000000000001',
        'sqrt 0.99999999999999999999',
      ].includes(row.name) ||
      (row.operation === 'sqrt' &&
        row.name.includes('high precision') &&
        row.left?.startsWith('1.')),
  )) {
    const { scale, digits } = row.calibration
    const workingPrecision =
      row.operation === 'log'
        ? digits + (row.right.split('.')[1]?.length ?? 0) + 16
        : row.left === '1e100'
          ? digits + 16
          : 2 * scale + 20
    const output = join(directory, `refinement-${rows.indexOf(row)}.json`)
    let shopspring: LibraryObservation
    const start = performance.now()
    try {
      await run(
        binary,
        [
          row.operation,
          row.left!,
          row.right,
          'refinement',
          String(scale),
          String(workingPrecision - scale),
          output,
        ],
        { timeout: 3000 },
      )
      shopspring = JSON.parse(await readFile(output, 'utf8')) as LibraryObservation
    } catch (error) {
      shopspring = {
        kind:
          error !== null && typeof error === 'object' && 'killed' in error && error.killed
            ? 'timeout'
            : 'library-error',
        message: String(error),
        elapsedMs: performance.now() - start,
      }
    }
    row.refinement = {
      workingPrecision,
      decimalJs: javascript(row, scale, digits, 0, 1),
      shopspring,
    }
  }
  const summary = Object.fromEntries(
    ['native', 'guard0', 'guard8', 'guard16'].map((mode) => [
      mode,
      Object.fromEntries(
        ['decimalJs', 'shopspring'].map((library) => {
          const key = library as 'decimalJs' | 'shopspring'
          return [
            library,
            {
              finiteCases: finite.length,
              exactText: finite.filter((row) => matches(row.expected, row.observations[mode]![key]))
                .length,
              numericValue: finite.filter((row) =>
                matches(row.expected, row.observations[mode]![key], true),
              ).length,
              finiteInputCases: finiteInputs.length,
              finiteInputExact: finiteInputs.filter((row) =>
                matches(row.expected, row.observations[mode]![key]),
              ).length,
              libraryErrors: rows.filter(
                (row) => row.observations[mode]![key].kind === 'library-error',
              ).length,
              timeouts: rows.filter((row) => row.observations[mode]![key].kind === 'timeout')
                .length,
            },
          ]
        }),
      ),
    ]),
  )
  const names = new Set(['pow', 'power', 'sqrt', 'exp', 'ln', 'log', 'log10', '^'])
  const pending = PG18_BUILTIN_GROUPS.flatMap((group) => Object.entries(group.inventory))
    .filter(
      ([, metadata]) =>
        names.has(metadata.name) && metadata.args.every((type) => type === 'pg_catalog."numeric"'),
    )
    .map(([signature]) => signature)
  const path = new URL('../artifacts/sql-semantics/numeric-math-probe.json', import.meta.url)
  await mkdir(dirname(fileURLToPath(path)), { recursive: true })
  await writeFile(
    path,
    JSON.stringify(
      {
        calibration:
          'Configured modes use PostgreSQL result scale and an upper bound on digit count to isolate library computation; JavaScript uses at least 34 significant digits. Refinements test direct target precision for square roots and additional working precision for Go magnitude, cancellation, and near-halfway cases. This calibration does not implement PostgreSQL scale selection, special-value handling, or SQLSTATE mapping.',
        cases: rows.length,
        pending,
        summary,
        rows,
      },
      null,
      2,
    ) + '\n',
  )
  process.stdout.write(JSON.stringify({ cases: rows.length, pending, summary }, null, 2) + '\n')
} finally {
  await pg.close()
  await rm(directory, { recursive: true, force: true })
}
