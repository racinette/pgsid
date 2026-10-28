import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/integer-null-active'
const known = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const unknown: Input = { kind: 'Unknown' }
const sources = ['integer', 'bigint', 'bigint_arithmetic', 'smallint']
  .map((name) =>
    readFileSync(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
  )
  .join('\n')
const callables = builtinCallables().filter(
  (fn) =>
    fn.kind === 'function' &&
    sources.includes(`fn ${fn.rustName}(`) &&
    fn.args.length === 2 &&
    fn.args.every((type) =>
      ['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'].includes(type),
    ),
)

it('preserves strict integer NULLs without hiding reached or possible operand failures', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-integer-null-'))
  try {
    const forms = callables.map((fn, index) => {
      expect(fn.kind).toBe('function')
      expect('strict' in fn && fn.strict).toBe(true)
      return {
        name: `integer_${index}`,
        left: 'l' + fn.args[0]!.slice(-1),
        right: 'r' + fn.args[1]!.slice(-1),
        types: fn.args,
        sql: `pg_catalog.${fn.name}(l${fn.args[0]!.slice(-1)},r${fn.args[1]!.slice(-1)})`,
      }
    })
    expect(forms.length).toBeGreaterThan(60)
    const nested = [
      { name: 'sum', sql: '(l4/r4)+n4' },
      { name: 'divisor', sql: 'n4/(l4/r4)' },
      { name: 'comparison', sql: '(l4/r4)=n4' },
      { name: 'selected', sql: '(CASE WHEN branch THEN l4/r4 ELSE n4 END)+n4' },
      { name: 'coalesced', sql: 'COALESCE(l4/r4,n4)' },
    ]
    const checks = [...forms, ...nested].map((form) => ({
      ...form,
      expression: `CASE WHEN bypass THEN true ELSE (${form.sql}) IS NULL END`,
    }))
    await pg.exec(`CREATE TABLE integer_null_inputs(
      l2 int2,r2 int2,l4 int4,r4 int4,l8 int8,r8 int8,n4 int4,branch bool,bypass bool,
      ${checks.map((form) => `CONSTRAINT ${form.name} CHECK(${form.expression})`).join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'integer_null_inputs')!
    const plans = checks.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => {
        const expression = lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === form.name)!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!.expression
        expect(hasUncertain(expression), form.name + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression,
        }
      }),
    )
    const group = prepareCheckRustGroup(plans)
    group.checks.forEach((check) => expect(check.kind).toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const row = (): Row => ({
      l2: known(6),
      r2: known(2),
      l4: known(6),
      r4: known(2),
      l8: known(6n),
      r8: known(2n),
      n4: known(null),
      branch: known(true),
      bypass: known(false),
    })
    const add = (name: string, inputs: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: inputs, expected })
    }
    for (const form of forms) {
      const query = `SELECT (${form.sql}) IS NULL AS value FROM (SELECT $1::${form.types[0]} ${form.left},$2::${form.types[1]} ${form.right}) args`
      for (const [left, right] of [
        [null, 0],
        [0, null],
        [null, -1],
        [-1, null],
        [null, null],
        [6, 2],
        [1, 0],
      ]) {
        let expected: Outcome
        try {
          const value = (await pg.query<{ value: boolean }>(query, [left, right])).rows[0]!.value
          expected = { kind: value ? 'True' : 'False' }
        } catch (cause) {
          expected = failure((cause as { code: string }).code)
        }
        if (left === null || right === null) expect(expected).toEqual({ kind: 'True' })
        observations.push({ name: form.name, sql: form.sql, left, right, expected })
        const payload = (value: number | null | undefined, type: string): Input =>
          known(
            value === null || value === undefined
              ? null
              : type === 'pg_catalog.int8'
                ? BigInt(value)
                : value,
          )
        add(
          form.name,
          {
            ...row(),
            [form.left]: payload(left, form.types[0]!),
            [form.right]: payload(right, form.types[1]!),
          },
          expected,
        )
      }
      for (const [left, right, expected] of [
        [unknown, known(null), { kind: 'True' }],
        [known(null), unknown, { kind: 'True' }],
        [unknown, unknown, { kind: 'Unknown' }],
        [failure('22012'), known(null), failure('22012')],
        [known(null), failure('22003'), failure('22003')],
        [failure('22012'), failure('22003'), failure('22012')],
        [unknown, failure('22003'), failure('22003')],
        [failure('22012'), unknown, failure('22012')],
      ] as [Input, Input, Outcome][]) {
        const inputs = { ...row(), [form.left]: left, [form.right]: right }
        add(form.name, inputs, expected)
        add(form.name, { ...inputs, bypass: known(true) }, { kind: 'True' })
      }
    }
    for (const form of nested) {
      for (const [left, right, expected] of [
        [unknown, known(0), { kind: 'Unknown' }],
        [known(1), known(0), failure('22012')],
        [known(null), unknown, { kind: 'True' }],
        [failure('22003'), known(0), failure('22003')],
      ] as [Input, Input, Outcome][]) {
        const inputs = { ...row(), l4: left, r4: right }
        add(form.name, inputs, expected)
        add(form.name, { ...inputs, bypass: known(true) }, { kind: 'True' })
        if (form.name === 'selected')
          add(form.name, { ...inputs, branch: known(false) }, { kind: 'True' })
      }
      for (const [left, right] of [
        [1, 0],
        [null, 0],
        [6, 2],
      ]) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean }>(
              `SELECT (${form.sql}) IS NULL value FROM (SELECT $1::int l4,$2::int r4,NULL::int n4,true branch) args`,
              [left, right],
            )
          ).rows[0]!.value
          expected = { kind: value ? 'True' : 'False' }
        } catch (cause) {
          expected = failure((cause as { code: string }).code)
        }
        add(form.name, { ...row(), l4: known(left ?? null), r4: known(right ?? null) }, expected)
        observations.push({ name: form.name, left, right, expected })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'observations.json'),
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'integer_null',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
