import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const tests = ['TRUE', 'NOT TRUE', 'FALSE', 'NOT FALSE', 'UNKNOWN', 'NOT UNKNOWN'] as const
const operands = {
  flag: 'flag',
  comparison: 'amount > 0',
  conjunction: 'flag AND amount / divisor > 0',
  disjunction: 'flag OR amount / divisor > 0',
  conditional: 'CASE WHEN flag THEN amount / divisor > 0 ELSE NULL END',
  fallback: 'COALESCE(flag, amount / divisor > 0)',
  null_literal: 'NULL',
  typed_null: 'NULL::bool',
  true_literal: 'true',
  false_literal: 'false',
  division: 'amount / divisor > 0',
  constant_error: '1 / 0 > 0',
}
const expressions: Record<string, string> = Object.fromEntries(
  tests.flatMap((test, index) =>
    Object.entries(operands).map(([name, sql]) => [`${name}_${index}`, `(${sql}) IS ${test}`]),
  ),
)
Object.assign(expressions, {
  nested_test: '(flag IS UNKNOWN) IS NOT FALSE',
  null_test: '(flag IS TRUE) IS NULL',
  equality: '(flag IS UNKNOWN) = (amount IS NULL)',
  case_guard: 'CASE WHEN flag IS NOT TRUE THEN true ELSE amount / divisor > 0 END',
  case_result: 'CASE WHEN flag THEN amount IS NOT NULL ELSE flag IS UNKNOWN END',
  coalesce: 'COALESCE(flag IS TRUE, amount / divisor > 0)',
  constant_guard: 'CASE WHEN NULL IS UNKNOWN THEN flag ELSE 1 / 0 > 0 END',
  skipped_constant: 'CASE WHEN false IS TRUE THEN 1 / 0 > 0 ELSE flag END',
})
const value = (value: boolean | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const incoming: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const divideError: Outcome = { kind: 'Error', value: { state: parseInt('22012', 36) } }
const base: Row = { flag: value(true), amount: value(7), divisor: value(2) }

describe('Boolean IS predicates in CHECK evaluators', () => {
  let pg: PGlite
  let directory: string
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-boolean-tests-'))
    await pg.exec(`CREATE DOMAIN approval_flag AS boolean;
      CREATE TABLE boolean_checks (flag approval_flag, amount integer, divisor integer,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')});`)
    table = (await snapshotCatalog(pg)).tables.find((item) => item.name === 'boolean_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('rejects non-Boolean operands instead of interpreting them as truth values', async () => {
    for (const sql of ['amount IS TRUE', '1 IS UNKNOWN', "'value'::text IS FALSE"]) {
      await expect(pg.query(`SELECT ${sql} FROM boolean_checks`)).rejects.toMatchObject({
        code: '42804',
      })
      const expression = lowerTableCheck(table, {
        name: 'invalid_operand',
        type: 'check',
        definition: `CHECK (${sql})`,
      })!.expression
      expect(hasUncertain(expression)).toBe(true)
    }
  })

  it('binds and executes every form with raw/stored SQL, partial inputs, errors, and lazy branches', async () => {
    const catalog = await snapshotCatalog(pg)
    const entries = table.constraints
      .filter((constraint) => constraint.type === 'check')
      .flatMap((constraint) => [
        {
          ...constraint,
          name: `raw_${constraint.name}`,
          definition: `CHECK (${expressions[constraint.name]})`,
        },
        { ...constraint, name: `stored_${constraint.name}` },
      ])
    const group = prepareCheckRustGroup(
      entries.map((constraint) => {
        const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
        expect(hasUncertain(expression), constraint.name).toBe(false)
        return {
          expression,
          identity: {
            schema: table.schema,
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        }
      }),
    )
    expect(group.checks.every((item) => item.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const flag of [true, false, null])
      for (const [amount, divisor] of [
        [7, 2],
        [0, 2],
        [-7, 2],
        [7, 0],
        [null, 2],
        [7, null],
        [null, null],
        [-2147483648, -1],
      ])
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ value: boolean | null }>(
                `WITH candidate AS MATERIALIZED (SELECT $1::bool flag, $2::integer amount, $3::integer divisor) SELECT (${sql}) value FROM candidate`,
                [flag, amount, divisor],
              )
            ).rows[0]!.value
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (error) {
            const code = (error as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          for (const prefix of ['raw', 'stored'])
            fixtures.push({
              name: `${prefix}_${name}`,
              row: { flag: value(flag), amount: value(amount!), divisor: value(divisor!) },
              expected,
            })
        }
    for (const prefix of ['raw', 'stored']) {
      for (const index of tests.keys())
        for (const state of [{ kind: 'Unknown' }, incoming] as Input[])
          fixtures.push(
            {
              name: `${prefix}_flag_${index}`,
              row: { ...base, flag: state },
              expected: state as Outcome,
            },
            {
              name: `${prefix}_comparison_${index}`,
              row: { ...base, amount: state },
              expected: state as Outcome,
            },
          )
      fixtures.push(
        {
          name: `${prefix}_nested_test`,
          row: { ...base, flag: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_case_guard`,
          row: { ...base, flag: value(false), divisor: incoming },
          expected: { kind: 'True' },
        },
        {
          name: `${prefix}_case_guard`,
          row: { ...base, flag: value(true), divisor: value(0) },
          expected: divideError,
        },
        {
          name: `${prefix}_coalesce`,
          row: { ...base, flag: value(null), divisor: incoming },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_constant_guard`,
          row: { ...base, flag: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_skipped_constant`,
          row: { ...base, flag: incoming },
          expected: incoming,
        },
        {
          name: `${prefix}_conjunction_0`,
          row: { ...base, flag: value(false), divisor: incoming },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_disjunction_0`,
          row: { ...base, flag: value(true), divisor: incoming },
          expected: { kind: 'True' },
        },
      )
    }
    await runCheckParity(
      directory,
      'booleantestchecks',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  }, 120_000)
})
