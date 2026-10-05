import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const source = readFileSync(
  new URL('../../crates/check-evaluator/src/operations/pg_catalog/smallint.rs', import.meta.url),
  'utf8',
)
const callables = builtinCallables()
  .filter((fn): fn is FunctionMetadata => fn.kind === 'function')
  .filter((fn) => fn.result === 'pg_catalog.int4' && source.includes(`fn ${fn.rustName}(`))
const expressions: Record<string, string> = {
  small_add: 'small + wide = expected',
  wide_add: 'wide + small = expected',
  small_subtract: 'small - wide = expected',
  wide_subtract: 'wide - small = expected',
  small_multiply: 'small * wide = expected',
  wide_multiply: 'wide * small = expected',
  small_divide: 'small / wide = expected',
  wide_divide: 'wide / small = expected',
  literal_add: 'small + 1 = expected',
  literal_subtract: '1 - small = expected',
  literal_multiply: 'small * 65536 = expected',
  literal_divide: 'small / -1 = expected',
  literal_left_divide: '-2147483648 / small = expected',
  nested: '(small + wide) - small = wide',
  selected: '(CASE WHEN flag THEN small + wide ELSE wide - small END) = expected',
  lazy_case: 'CASE WHEN flag THEN true ELSE wide / small = expected END',
  lazy_and: 'flag AND wide / small = expected',
  lazy_or: 'flag OR wide / small = expected',
}
for (const fn of callables)
  expressions[`call_${fn.name}`] = `pg_catalog.${fn.name}(${fn.args
    .map((type) => (type === 'pg_catalog.int2' ? 'small' : 'wide'))
    .join(',')}) = expected`

const value = (value: number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const otherError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }

describe('mixed smallint/integer CHECK arithmetic', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-mixed-integers-'))
    await pg.exec(`CREATE DOMAIN short_adjustment AS smallint;
      CREATE DOMAIN nested_adjustment AS short_adjustment;
      CREATE TABLE mixed_checks (small nested_adjustment, wide integer, expected integer, flag bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((t) => t.name === 'mixed_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('resolves both operand orders and literals, preserving integer results, errors and lazy branches in all targets', async () => {
    expect(callables).toHaveLength(8)
    const constraints = table.constraints.filter((c) => c.type === 'check')
    const ordered = constraints.map((c) => c.name)
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: table.schema,
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    expect(group.checks.map((c) => c.kind)).toEqual(ordered.map(() => 'supported'))
    for (const fn of callables) expect(group.evaluatorSource).toContain(fn.rustName)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const small of [-32768, -32767, -7, -1, 0, 1, 7, 32766, 32767, null])
      for (const wide of [
        -2147483648,
        -65537,
        -65536,
        -3,
        -1,
        0,
        1,
        3,
        65536,
        65537,
        2147483647,
        null,
      ])
        for (const name of Object.keys(expressions)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ v: boolean | null }>(
                  `SELECT (${expressions[name]}) AS v FROM
                (SELECT $1::smallint small, $2::integer wide, $3::integer expected, $4::bool flag) candidate`,
                  [small, wide, wide, false],
                )
              ).rows[0]!.v,
            )
          } catch (caught) {
            const state = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(state)
            expected = { kind: 'Error', value: { state: parseInt(state, 36) } }
          }
          fixtures.push({
            name,
            row: {
              small: value(small),
              wide: value(wide),
              expected: value(wide),
              flag: value(false),
            },
            expected,
          })
        }
    for (const fn of callables) {
      const [left, right] = fn.args.map((type) => (type === 'pg_catalog.int2' ? 'small' : 'wide'))
      for (const [a, b, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Null' }, { kind: 'Unknown' }],
        [{ kind: 'Null' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [error, { kind: 'Unknown' }, error],
        [{ kind: 'Unknown' }, otherError, otherError],
        [error, otherError, error],
      ] as [Input, Input, Outcome][])
        fixtures.push({
          name: `call_${fn.name}`,
          row: { [left!]: a, [right!]: b, expected: value(0) },
          expected,
        })
    }
    fixtures.push(
      {
        name: 'literal_add',
        row: { small: value(32767), expected: value(32768) },
        expected: { kind: 'True' },
      },
      {
        name: 'literal_divide',
        row: { small: value(-32768), expected: value(32768) },
        expected: { kind: 'True' },
      },
      {
        name: 'literal_multiply',
        row: { small: value(-32768), expected: value(-2147483648) },
        expected: { kind: 'True' },
      },
      { name: 'nested', row: { small: value(1), wide: value(2147483647) }, expected: error },
      {
        name: 'selected',
        row: { flag: value(true), small: value(32767), wide: value(1), expected: value(32768) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_case',
        row: { flag: value(true), small: value(0), wide: error, expected: value(0) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_and',
        row: { flag: value(false), small: value(0), wide: value(1), expected: value(0) },
        expected: { kind: 'False' },
      },
      {
        name: 'lazy_or',
        row: { flag: value(true), small: value(-1), wide: value(-2147483648), expected: value(0) },
        expected: { kind: 'True' },
      },
    )
    await runCheckParity(directory, 'mixedintegers', group, ordered, fixtures)
  }, 120_000)

  it('defers narrowing casts and implicit promotions without a mixed catalog operator', () => {
    for (const sql of ['wide::smallint > 0', 'small % wide = 0']) {
      const lowered = lowerTableCheck(
        table,
        { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
        [],
        catalog.domains,
      )!
      const group = prepareCheckRustGroup([
        {
          expression: lowered.expression,
          identity: { schema: table.schema, kind: 'table', owner: table.name, constraint: 'probe' },
        },
      ])
      if (group.checks[0]!.kind === 'supported')
        expect(group.evaluatorSource).toContain('check_unknown()')
      else expect(group.checks[0]!.kind).toBe('unsupported')
    }
  })
})
