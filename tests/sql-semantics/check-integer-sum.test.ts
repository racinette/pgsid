import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { isIntegerSumCallable } from '../../src/sql-semantics/integer-sum-callables.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const packet = 'artifacts/goal-checks/integer-sum-active'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const fail = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const integerStates = [
  null,
  '-9223372036854775808',
  '-9223372036854775807',
  '-1',
  '0',
  '1',
  '9223372036854775806',
  '9223372036854775807',
]
const profiles = [
  {
    name: 'int2_sum',
    state: 'bigint',
    amount: 'smallint',
    states: integerStates,
    values: [null, '-32768', '-1', '0', '1', '32767'],
  },
  {
    name: 'int4_sum',
    state: 'bigint',
    amount: 'int',
    states: integerStates,
    values: [null, '-2147483648', '-1', '0', '1', '2147483647'],
  },
  {
    name: 'int8_sum',
    state: 'numeric',
    amount: 'bigint',
    states: [
      null,
      '-999999999999999999999.000',
      '-9223372036854775808',
      '-1.2500',
      '0',
      '0.0000',
      '1.20',
      '9223372036854775807',
      '999999999999999999999.999',
      'NaN',
      'Infinity',
      '-Infinity',
    ],
    values: [
      null,
      '-9223372036854775808',
      '-1',
      '0',
      '1',
      '9007199254740993',
      '9223372036854775807',
    ],
  },
] as const

it('admits only the three immutable non-strict native sum transition signatures', () => {
  const functions = builtinCallables().filter(isIntegerSumCallable)
  expect(functions.map((f) => f.name).sort()).toEqual(profiles.map((p) => p.name).sort())
  for (const fn of functions) {
    expect(isIntegerSumCallable({ ...fn, schema: 'custom' })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, strict: true })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, volatility: 's' })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, returnsSet: true })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, args: fn.args.slice(1) })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, result: 'pg_catalog.bool' })).toBe(false)
    expect(isIntegerSumCallable({ ...fn, variadic: 'pg_catalog.int8' })).toBe(false)
  }
})

it('matches native sum states, wraparound, numeric scales, eager errors and lazy branches in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-integer-sum-'))
  try {
    const forms = profiles.flatMap((profile) => {
      const fn = (a: string, b: string) => `pg_catalog.${profile.name}(${a},${b})`
      return [
        { suffix: 'result', value: `${fn('state', 'amount')}::text`, bool: false },
        { suffix: 'nullness', value: `${fn('state', 'amount')} IS NULL`, bool: true },
        { suffix: 'compose', value: `${fn(fn('state', 'amount'), 'extra')}::text`, bool: false },
        { suffix: 'left_eager', value: `${fn('state/denominator', 'amount')} IS NULL`, bool: true },
        {
          suffix: 'right_eager',
          value: `${fn('state', `(amount::bigint/denominator)::${profile.amount}`)} IS NULL`,
          bool: true,
        },
      ].map((form) => ({
        ...form,
        profile,
        name: profile.name + '_' + form.suffix,
        expression: `CASE WHEN bypass THEN true ELSE (${form.value}) IS NOT DISTINCT FROM ${form.bool ? 'expected_bool' : 'expected_text'} END`,
      }))
    })
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(state ${f.profile.state},amount ${f.profile.amount},extra ${f.profile.amount},denominator bigint,expected_text text COLLATE "C",expected_bool bool,bypass bool,CONSTRAINT result CHECK(${f.expression}))`,
      )
    const c = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const f of forms)
      for (const origin of ['source', 'stored'] as const) {
        const t = c.tables.find((t) => t.name === f.name)!
        const lower = lowerTableCheck(
          t,
          t.constraints[0]!,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
          origin === 'source' ? `CHECK(${f.expression})` : undefined,
        )!
        expect(hasUncertain(lower.expression), f.name + origin).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: f.name,
            constraint: f.name + '_' + origin,
          },
          expression: lower.expression,
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C' })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations = []
    const input = (value: string | null, type: string): Input =>
      known(
        value === null
          ? null
          : type === 'numeric'
            ? value
            : type === 'bigint'
              ? BigInt(value)
              : Number(value),
      )
    for (const f of forms)
      for (const rawState of f.profile.states)
        for (const amount of f.profile.values)
          for (const variant of f.suffix === 'compose'
            ? [null, '0', '1']
            : f.suffix.endsWith('eager')
              ? ['0', '-1', '1']
              : ['1']) {
            const state = (
              await pg.query<{ value: string | null }>(
                `SELECT $1::${f.profile.state}::text value`,
                [rawState],
              )
            ).rows[0]!.value
            const extra = f.suffix === 'compose' ? variant : '1'
            const denominator = f.suffix.endsWith('eager') ? variant : '1'
            let output: string | boolean | null = null
            let expected: Outcome = { kind: 'True' }
            try {
              output = (
                await pg.query<{ value: string | boolean | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::${f.profile.state} state,$2::${f.profile.amount} amount,$3::${f.profile.amount} extra,$4::bigint denominator)SELECT ${f.value} value FROM args`,
                  [state, amount, extra, denominator],
                )
              ).rows[0]!.value
            } catch (e) {
              const code = (e as { code?: string }).code
              if (!code) throw e
              expected = fail(code)
            }
            const row: Row = {
              state: input(state, f.profile.state),
              amount: input(amount, f.profile.amount),
              extra: input(extra, f.profile.amount),
              denominator: input(denominator, 'bigint'),
              expected_text: known(f.bool ? null : (output as string | null)),
              expected_bool: known(f.bool ? (output as boolean | null) : null),
              bypass: known(false),
            }
            for (const origin of ['source', 'stored']) {
              const name = f.name + '_' + origin
              fixtures.push({ name, row, expected })
              if (expected.kind === 'True')
                fixtures.push({
                  name,
                  row: {
                    ...row,
                    ...(f.bool
                      ? { expected_bool: known(!output) }
                      : { expected_text: known('wrong') }),
                  },
                  expected: { kind: 'False' },
                })
            }
            observations.push({ name: f.name, state, amount, extra, denominator, output, expected })
          }
    for (const p of profiles)
      for (const origin of ['source', 'stored']) {
        const name = p.name + '_result_' + origin
        const row: Row = {
          state: { kind: 'Unknown' },
          amount: known(null),
          extra: input('1', p.amount),
          denominator: known(1n),
          expected_text: known(null),
          expected_bool: known(null),
          bypass: known(false),
        }
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
        fixtures.push({
          name,
          row: { ...row, state: known(null), amount: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        })
        fixtures.push({
          name,
          row: { ...row, state: known(null), amount: fail('22012') as Input },
          expected: fail('22012'),
        })
        fixtures.push({
          name,
          row: { ...row, state: fail('22003') as Input, amount: fail('22012') as Input },
          expected: fail('22003'),
        })
        fixtures.push({ name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } })
      }
    for (const state of ['NaN', 'Infinity', '-Infinity'])
      for (const origin of ['source', 'stored']) {
        const row: Row = {
          state: known(state),
          amount: { kind: 'Unknown' },
          extra: known(1n),
          denominator: known(1n),
          expected_text: known(state),
          expected_bool: known(false),
          bypass: known(false),
        }
        fixtures.push({ name: 'int8_sum_result_' + origin, row, expected: { kind: 'True' } })
        fixtures.push({
          name: 'int8_sum_right_eager_' + origin,
          row: { ...row, amount: known(1n), denominator: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        })
        fixtures.push({
          name: 'int8_sum_result_' + origin,
          row: { ...row, amount: fail('22012') as Input },
          expected: fail('22012'),
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'integer_sum',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
