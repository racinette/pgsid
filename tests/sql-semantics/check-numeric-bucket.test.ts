import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const expressions = {
  same: 'pg_catalog.width_bucket(value_num,lower_num,upper_num,buckets) = recorded',
  skipped:
    'CASE WHEN skip THEN true ELSE pg_catalog.width_bucket(value_num,lower_num,upper_num,buckets) = recorded END',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const defaults = (): Row => ({
  value_num: input('1'),
  lower_num: input('0'),
  upper_num: input('10'),
  buckets: input(10),
  recorded: input(2),
  skip: input(false),
})
const values = [
  '-Infinity',
  'Infinity',
  'NaN',
  '-10',
  '-0.0000',
  '0',
  '0.00001',
  '1',
  '5',
  '9.99999',
  '10',
  '20',
  null,
]
const bounds = [
  ['-10', '10'],
  ['10', '-10'],
  ['0', '10'],
  ['10', '0'],
  ['0', '1'],
  ['1', '0'],
  ['-0.001', '0.001'],
  ['0', '0'],
  ['NaN', '10'],
  ['0', 'NaN'],
  ['Infinity', '10'],
  ['0', '-Infinity'],
  [null, '10'],
  ['0', null],
] as const

describe('numeric histogram buckets', () => {
  it('matches PostgreSQL ascending and descending histograms, exact decimal edges, oversized private arithmetic, invalid arguments, strict values and lazy branches in every target', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-bucket-'))
    let pg = await PGlite.create()
    try {
      expect(
        builtinCallables().find(
          (fn) => fn.kind === 'function' && fn.rustName === 'sql__pg_catalog__width_bucket__mx75',
        ),
      ).toMatchObject({
        name: 'width_bucket',
        args: [
          'pg_catalog."numeric"',
          'pg_catalog."numeric"',
          'pg_catalog."numeric"',
          'pg_catalog.int4',
        ],
        result: 'pg_catalog.int4',
        strict: true,
        volatility: 'i',
      })
      await pg.exec(`CREATE TABLE numeric_bucket_checks (value_num numeric,lower_num numeric,upper_num numeric,buckets integer,recorded integer,skip boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'numeric_bucket_checks')!
      const prepared = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'raw'
              ? { name, type: 'check', definition: `CHECK (${sql})` }
              : table.constraints.find((item) => item.name === name)!,
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      )
      const group = prepareCheckRustGroup(prepared)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (
        row: Row,
        expected: Outcome,
        names: readonly string[] = Object.keys(expressions),
      ) => {
        for (const name of names)
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      let count = 0
      const execute = async (
        value: string | null,
        lower: string | null,
        upper: string | null,
        buckets: number | null,
      ) => {
        if (count > 0 && count % 500 === 0) {
          await pg.close()
          pg = await PGlite.create()
        }
        count++
        const row: Row = {
          value_num: input(value),
          lower_num: input(lower),
          upper_num: input(upper),
          buckets: input(buckets),
          recorded: input(0),
          skip: input(false),
        }
        let result: number | null
        try {
          result = (
            await pg.query<{ value: number | null }>(
              'SELECT pg_catalog.width_bucket($1::numeric,$2::numeric,$3::numeric,$4::integer) value',
              [value, lower, upper, buckets],
            )
          ).rows[0]!.value
        } catch (failure) {
          const code = (failure as { code: string }).code
          expect(['2201G', '22003']).toContain(code)
          record(row, error(code))
          return
        }
        row.recorded = input(result)
        record(row, { kind: result === null ? 'Null' : 'True' })
        if (result !== null)
          record({ ...row, recorded: input(result === 0 ? 1 : 0) }, { kind: 'False' })
      }
      for (const value of values)
        for (const [lower, upper] of bounds)
          for (const buckets of [-2147483648, -1, 0, 1, 2, 10, 2147483647, null])
            await execute(value, lower, upper, buckets)
      for (const [value, lower, upper, buckets] of [
        ['0', '-9e131071', '9e131071', 10],
        ['0', '9e131071', '-9e131071', 2147483647],
        ['-3', '-1e131071', '1e131071', 2],
        ['3', '-1e131071', '1e131071', 2],
        ['2e-16383', '1e-16383', '3e-16383', 10],
        ['0.3333333333333333333333', '0', '1', 3],
        ['0.3333333333333333333334', '0', '1', 3],
        ['0.0000000000000000000001', '0', '1e-20', 2147483647],
      ] as const)
        await execute(value, lower, upper, buckets)
      const names = ['value_num', 'lower_num', 'upper_num', 'buckets']
      for (const [index, name] of names.entries()) {
        for (const state of [input(null), { kind: 'Unknown' }, error('22003')] as Input[])
          record({ ...defaults(), [name]: state }, state as Outcome)
        if (index > 0) {
          record(
            { ...defaults(), [names[0]!]: { kind: 'Unknown' }, [name]: error('22012') },
            error('22012'),
          )
          record(
            { ...defaults(), [names[0]!]: error('22003'), [name]: error('22012') },
            error('22003'),
          )
        }
      }
      record(
        { ...defaults(), skip: input(true), buckets: input(0), recorded: error('22012') },
        { kind: 'True' },
        ['skipped'],
      )
      record(
        {
          ...defaults(),
          skip: input(true),
          value_num: error('22003'),
          buckets: { kind: 'Unknown' },
          recorded: error('22012'),
        },
        { kind: 'True' },
        ['skipped'],
      )
      await runCheckParity(
        directory,
        'pgsid-numeric-bucket',
        group,
        prepared.map((item) => item.identity.constraint),
        fixtures,
      ).catch(async (failure: { stdout?: string; stderr?: string }) => {
        await writeFile(
          '/tmp/pgsid-numeric-bucket-subprocess.log',
          (failure.stdout ?? '') + (failure.stderr ?? ''),
        )
        throw failure
      })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 900000)
})
