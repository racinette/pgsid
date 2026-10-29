import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const expressions = {
  in_range8: 'pg_catalog.in_range(v, b, o, s, l)',
  in_range4: 'pg_catalog.in_range(v4, b4, o, s, l)',
  bucket: 'pg_catalog.width_bucket(v, b, o, c) = w',
  bucket_lazy: 'CASE WHEN s THEN true ELSE pg_catalog.width_bucket(v, b, o, c) = w END',
  count: 'pg_catalog.int8inc_float8_float8(n, v, b) = m',
}
const doubles = [
  '0',
  '-0',
  '1',
  '-1',
  '0.5',
  '2.5',
  '10',
  '-10',
  '0.1',
  '5e-324',
  '1e308',
  '-1e308',
  '1.7976931348623157e308',
  '-1.7976931348623157e308',
  'Infinity',
  '-Infinity',
  'NaN',
  null,
]
// Float4 columns use values float4 can represent, so the candidate itself never overflows.
const singles = [
  '0',
  '-0',
  '1',
  '-1',
  '0.5',
  '2.5',
  '10',
  '0.1',
  '3.4028235e38',
  'Infinity',
  '-Infinity',
  'NaN',
  null,
]
const counts = [1, 3, 10, 2147483647, 0, -1, null]
const counters = [0n, 41n, 9223372036854775807n, -9223372036854775808n, null]
const input = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('matches float8 and float4 in_range, float8 width_bucket and regr_count increments in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-float-window-support-'))
  try {
    await pg.exec(`CREATE TABLE float_window_support (v float8, b float8, o float8, s bool, l bool,
      v4 float4, b4 float4, c int4, w int4, n int8, m int8,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'float_window_support')!
    const constraints = Object.keys(expressions).flatMap((name) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        {
          ...stored,
          name: name + '_raw',
          definition: `CHECK (${expressions[name as keyof typeof expressions]})`,
        },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => {
        const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
        expect(expression.kind, constraint.name).not.toBe('uncertain')
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        }
      }),
    )
    group.checks.forEach((check, i) => expect(check.kind, constraints[i]!.name).toBe('supported'))
    const bits = async (type: 'float4' | 'float8', text: string | null): Promise<Input> => {
      if (text === null) return input(null)
      const hex = (
        await pg.query<{ hex: string }>(`SELECT encode(${type}send($1::${type}),'hex') hex`, [text])
      ).rows[0]!.hex
      return type === 'float4'
        ? input(Number(BigInt.asIntN(32, BigInt('0x' + hex))))
        : input(BigInt.asIntN(64, BigInt('0x' + hex)))
    }
    const evaluate = async (sql: string, parameters: unknown[]): Promise<Outcome> => {
      try {
        return outcome(
          (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT $1::float8 v, $2::float8 b, $3::float8 o,
                $4::bool s, $5::bool l, $6::float4 v4, $7::float4 b4, $8::int4 c, $9::int4 w,
                $10::int8 n, $11::int8 m) candidate`,
              parameters,
            )
          ).rows[0]!.value,
        )
      } catch (error) {
        return {
          kind: 'Error',
          value: { state: Number.parseInt((error as { code: string }).code, 36) },
        }
      }
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = async (name: keyof typeof expressions, parameters: unknown[]) => {
      const [v, b, o, s, l, v4, b4, c, w, n, m] = parameters as [
        string | null,
        string | null,
        string | null,
        boolean | null,
        boolean | null,
        string | null,
        string | null,
        number | null,
        number | null,
        bigint | null,
        bigint | null,
      ]
      const row: Row = {
        v: await bits('float8', v),
        b: await bits('float8', b),
        o: await bits('float8', o),
        s: input(s),
        l: input(l),
        v4: await bits('float4', v4),
        b4: await bits('float4', b4),
        c: input(c),
        w: input(w),
        n: input(n),
        m: input(m),
      }
      const expected = await evaluate(
        expressions[name],
        parameters.map((parameter) =>
          typeof parameter === 'bigint' ? String(parameter) : parameter,
        ),
      )
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: `${name}_${suffix}`, row, expected })
    }
    for (const v of doubles)
      for (const b of doubles)
        for (const o of ['0', '1', '2.5', '1e308', 'Infinity', '-1', 'NaN', null])
          for (const [s, l] of [
            [true, true],
            [true, false],
            [false, true],
            [false, false],
          ] as const)
            await add('in_range8', [v, b, o, s, l, null, null, null, null, null, null])
    await add('in_range8', ['1', '1', '1', null, true, null, null, null, null, null, null])
    await add('in_range8', ['1', '1', '1', true, null, null, null, null, null, null, null])
    for (const v of singles)
      for (const b of singles)
        for (const o of ['0', '1', '1e-50', '1e308', 'Infinity', '-1', 'NaN'])
          for (const [s, l] of [
            [true, true],
            [false, false],
          ] as const)
            await add('in_range4', [null, null, o, s, l, v, b, null, null, null, null])
    // The recorded bucket comes from PostgreSQL, and its successor gives the false outcome.
    for (const v of doubles)
      for (const [b, o] of [
        ['0', '10'],
        ['10', '0'],
        ['-1', '2.5'],
        ['-1.7976931348623157e308', '1.7976931348623157e308'],
        ['1.7976931348623157e308', '-1e308'],
        ['1', '1'],
        ['0', 'Infinity'],
        ['NaN', '1'],
        [null, '1'],
      ])
        for (const c of counts) {
          let recorded: number | null = null
          try {
            recorded =
              (
                await pg.query<{ bucket: number | null }>(
                  'SELECT width_bucket($1::float8, $2::float8, $3::float8, $4::int4) bucket',
                  [v, b, o, c],
                )
              ).rows[0]!.bucket ?? null
          } catch {
            recorded = 0
          }
          for (const w of recorded === null
            ? [0]
            : recorded < 2147483647
              ? [recorded, recorded + 1]
              : [recorded])
            for (const s of [false, true])
              for (const name of ['bucket', 'bucket_lazy'] as const)
                await add(name, [v, b, o, s, null, null, null, c, w, null, null])
        }
    for (const [v, b, o, c] of [
      ['0.30000000000000004', '0', '1', 10],
      ['0.9999999999999999', '0', '1', 2147483647],
      ['-0.9999999999999999', '0', '-1', 2147483646],
      ['1e308', '-1.7976931348623157e308', '1.7976931348623157e308', 7],
    ] as const) {
      const recorded = (
        await pg.query<{ bucket: number }>(
          'SELECT width_bucket($1::float8, $2::float8, $3::float8, $4::int4) bucket',
          [v, b, o, c],
        )
      ).rows[0]!.bucket
      await add('bucket', [v, b, o, false, null, null, null, c, recorded, null, null])
    }
    for (const n of counters)
      for (const v of ['1', 'NaN', null])
        for (const b of ['-0', null])
          await add('count', [
            v,
            b,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            n,
            n === null || n === 9223372036854775807n ? n : n + 1n,
          ])
    await runCheckParity(
      directory,
      'floatwindowsupport',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
