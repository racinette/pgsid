import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const value = (value: number | bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const column = (type: string, right = false): string => {
  if (type === 'pg_catalog.float4') return right ? 'b' : 'a'
  if (type === 'pg_catalog.float8') return right ? 'e' : 'd'
  return (
    {
      'pg_catalog.int2': 'small',
      'pg_catalog.int4': 'i',
      'pg_catalog.int8': 'big',
      'pg_catalog."numeric"': 'decimal',
    } as Record<string, string>
  )[type]!
}
const expectedColumn = (type: string): string =>
  (
    ({
      'pg_catalog.float4': 'expected4',
      'pg_catalog.float8': 'expected8',
      'pg_catalog.int2': 'expected_small',
      'pg_catalog.int4': 'expected_i',
      'pg_catalog.int8': 'expected_big',
      'pg_catalog."numeric"': 'expected_decimal',
    }) as Record<string, string>
  )[type]!
const maintained = ['float_core', 'float_arithmetic', 'float_numeric', 'float_send']
  .map((name) =>
    readFileSync(
      new URL(`../../crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, import.meta.url),
      'utf8',
    ),
  )
  .join('\n')
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata =>
    fn.kind === 'function' && maintained.includes(`fn ${fn.rustName}(`),
)
const expressions: Record<string, string> = Object.fromEntries(
  functions.map((fn) => {
    const call = `pg_catalog.${fn.name}(${fn.args.map((type, index) => column(type, index === 1)).join(',')})`
    return [
      fn.rustName,
      fn.result === 'pg_catalog.bool'
        ? call
        : fn.result === 'pg_catalog.int4' && fn.name.startsWith('bt')
          ? `${call} = expected_cmp`
          : fn.result === 'pg_catalog.bytea'
            ? `${call} = wire`
            : `${call} IS NOT DISTINCT FROM ${expectedColumn(fn.result)}`,
    ]
  }),
)
const composition: Record<string, string> = {
  literal_nullif: 'NULLIF(1::float8,1::float8) IS NULL',
  literal_distinct: '1::float8 IS DISTINCT FROM 1::float8',
  greatest_integer: 'GREATEST(big,d) IS NOT DISTINCT FROM expected8',
  nullif_integer: 'NULLIF(big,d) IS NOT DISTINCT FROM expected8',
  row_integer: 'ROW(d,big) < ROW(e,big)',
  null4: 'a IS NULL',
  null8: 'd IS NOT NULL',
  literal4: "a = '1.000000059604644775390625000001'::real",
  literal8: "d = '1.2345678901234567'::double precision",
  null_literal: 'NULL::real IS NULL AND NULL::float8 IS NULL',
  case_mixed: '(CASE WHEN skip THEN a ELSE d END) = expected8',
  coalesce_mixed: 'COALESCE(a,d) = expected8',
  coalesce_integer: 'COALESCE(big,d) = expected8',
  coalesce_abs: 'COALESCE(abs(1.5::float8),0::float8) IS NULL',
  case_integer: '(CASE WHEN skip THEN big ELSE d END) = expected8',
  distinct: 'a IS DISTINCT FROM d',
  nullif: 'NULLIF(a,d) IS NOT DISTINCT FROM expected4',
  greatest: 'GREATEST(a,d) IS NOT DISTINCT FROM expected8',
  least: 'LEAST(a,d) IS NOT DISTINCT FROM expected8',
  membership: "a IN ('-0'::real, '1'::real, 'NaN'::real)",
  between: "d BETWEEN '-Infinity'::float8 AND 'Infinity'::float8",
  row: 'ROW(a,d) < ROW(b,e)',
  parsed4: 'source::real IS NOT DISTINCT FROM expected4',
  parsed8: 'source::float8 IS NOT DISTINCT FROM expected8',
  parsed_varchar: 'alternate::real IS NOT DISTINCT FROM expected4',
  lazy_parse: 'CASE WHEN skip THEN true ELSE source::real = a END',
  lazy_divide: 'skip OR a / b = expected4',
  lazy_cast: 'CASE WHEN skip THEN true ELSE d::bigint = big END',
  conditional_constant: "CASE WHEN skip THEN true ELSE ('1e999'::text)::float8 > d END",
  decimal_constant: 'd > 0.5',
  integer_constant: 'a > 1',
  mixed_integer: 'd > big',
}
const columns: Record<string, string> = {
  a: 'real',
  b: 'real',
  d: 'float8',
  e: 'float8',
  small: 'smallint',
  i: 'integer',
  big: 'bigint',
  decimal: 'numeric',
  expected4: 'real',
  expected8: 'float8',
  expected_small: 'smallint',
  expected_i: 'integer',
  expected_big: 'bigint',
  expected_decimal: 'numeric',
  expected_cmp: 'integer',
  wire: 'bytea',
  source: 'text',
  alternate: 'varchar',
  skip: 'boolean',
}
type Sample = { text: string | null; input: Input }

describe('portable SQL floating-point values', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-float-'))
    await pg.exec(`CREATE DOMAIN checked_reading AS real CHECK (VALUE >= '0'::real);
      CREATE DOMAIN nested_reading AS checked_reading;
      CREATE TABLE public_float_values (a nested_reading, d float8, skip bool,
        CONSTRAINT positive4 CHECK (a >= '0'::real),
        CONSTRAINT positive8 CHECK (d >= '0'::float8),
        CONSTRAINT guarded_divide CHECK (skip OR a / '0'::real > '0'::real));
      CREATE TABLE float_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')}, ${Object.entries({ ...expressions, ...composition })
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('binds real CHECKs and matches comparisons, arithmetic, casts and sends in Rust, Go and TypeScript', async () => {
    expect(functions).toHaveLength(76)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'float_checks')!
    const constraints = Object.entries({ ...expressions, ...composition }).flatMap(
      ([name, sql]) => {
        const stored = table.constraints.find((c) => c.name === name)!
        return [
          {
            name: name + '_raw',
            expression: lowerTableCheck(
              table,
              { ...stored, definition: `CHECK (${sql})` },
              catalog.enums,
              catalog.domains,
            )!.expression,
          },
          {
            name: name + '_stored',
            expression: lowerTableCheck(table, stored, catalog.enums, catalog.domains)!.expression,
          },
        ]
      },
    )
    expect(constraints.filter((c) => hasUncertain(c.expression)).map((c) => c.name)).toEqual([])
    const group = prepareCheckRustGroup(
      constraints.map(({ name, expression }) => ({
        expression,
        identity: { schema: 'public', kind: 'table', owner: 'float_checks', constraint: name },
      })),
    )
    expect(
      group.checks
        .map((check, index) =>
          check.kind === 'unsupported'
            ? { name: constraints[index]!.name, reason: check.reason }
            : null,
        )
        .filter(Boolean),
    ).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      fixtures.push(
        { name: name + '_raw', row, expected },
        { name: name + '_stored', row, expected },
      )
    }
    const floatInput = async (type: string, text: string | null): Promise<Input> => {
      if (text === null) return value(null)
      const width = type === 'pg_catalog.float4' ? 4 : 8
      const hex = (
        await pg.query<{ hex: string }>(`SELECT encode(float${width}send($1::${type}),'hex') hex`, [
          text,
        ])
      ).rows[0]!.hex
      const bits = BigInt.asIntN(width === 4 ? 32 : 64, BigInt('0x' + hex))
      return value(width === 4 ? Number(bits) : bits)
    }
    const samples = new Map<string, Sample[]>()
    for (const type of ['pg_catalog.float4', 'pg_catalog.float8']) {
      const texts = [
        '-Infinity',
        '-3.5',
        '-0',
        '0',
        '1',
        '1.5',
        '2.5',
        '3.5',
        'Infinity',
        'NaN',
        ...(type.endsWith('float4')
          ? ['1.401298464324817e-45', '3.4028234663852886e38', '100000.5', '100001.5']
          : [
              '5e-324',
              '1.7976931348623157e308',
              '9223372036854775808',
              '-9223372036854775808',
              '1.2345678901234567',
            ]),
        null,
      ]
      samples.set(
        type,
        await Promise.all(
          texts.map(async (text) => ({ text, input: await floatInput(type, text) })),
        ),
      )
    }
    for (const [type, texts] of Object.entries({
      'pg_catalog.int2': ['-32768', '-1', '0', '32767'],
      'pg_catalog.int4': ['-2147483648', '16777217', '2147483647'],
      'pg_catalog.int8': ['-9223372036854775808', '4611686293305294849', '9223372036854775807'],
      'pg_catalog."numeric"': [
        '-0.00',
        'NaN',
        'Infinity',
        '-Infinity',
        '1.000000059604644775390625000001',
        '1e-1000',
        '1e1000',
        '1_000.25',
      ],
    }))
      samples.set(type, [
        ...texts.map((text) => ({
          text,
          input: value(
            type.endsWith('"numeric"') ? text : type.endsWith('int8') ? BigInt(text) : Number(text),
          ),
        })),
        { text: null, input: value(null) },
      ])
    let seed = 0x6a09e667f3bcc909n
    for (let index = 0; index < 256; index++) {
      seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
      const integer = BigInt.asIntN(64, seed)
      samples.get('pg_catalog.int8')!.push({ text: String(integer), input: value(integer) })
    }
    for (const fn of functions) {
      const args = fn.args.map((type, index) => column(type, index === 1))
      const left = samples.get(fn.args[0]!)!
      const right =
        fn.args.length === 1 ? [{ text: null, input: value(null) }] : samples.get(fn.args[1]!)!
      for (const a of left)
        for (const b of right) {
          const row: Row = {
            [args[0]!]: a.input,
            ...(fn.args.length === 2 ? { [args[1]!]: b.input } : {}),
          }
          try {
            const params = fn.args.map((_, index) => (index === 0 ? a.text : b.text))
            const call = `pg_catalog.${fn.name}(${fn.args.map((type, index) => `$${index + 1}::${type}`).join(',')})`
            const sql =
              fn.result === 'pg_catalog.bool'
                ? `SELECT (${call}) result`
                : fn.result === 'pg_catalog.bytea'
                  ? `SELECT encode(${call},'hex') result`
                  : fn.result.endsWith('float4') || fn.result.endsWith('float8')
                    ? `SELECT encode(float${fn.result.endsWith('float4') ? 4 : 8}send(${call}),'hex') result`
                    : `SELECT (${call})::text result`
            const result = (await pg.query<{ result: string | boolean | null }>(sql, params))
              .rows[0]!.result
            if (fn.result === 'pg_catalog.bool')
              add(fn.rustName, row, outcome(result as boolean | null))
            else if (fn.result === 'pg_catalog.bytea')
              add(
                fn.rustName,
                { ...row, wire: value(result as string | null) },
                result === null ? { kind: 'Null' } : { kind: 'True' },
              )
            else if (fn.name.startsWith('bt'))
              add(
                fn.rustName,
                { ...row, expected_cmp: value(result === null ? 0 : Number(result)) },
                result === null ? { kind: 'Null' } : { kind: 'True' },
              )
            else {
              const expected = expectedColumn(fn.result)
              let converted: Input
              if (result === null) converted = value(null)
              else if (fn.result.endsWith('float4') || fn.result.endsWith('float8')) {
                const bits = BigInt.asIntN(
                  fn.result.endsWith('float4') ? 32 : 64,
                  BigInt('0x' + result),
                )
                converted = value(fn.result.endsWith('float4') ? Number(bits) : bits)
              } else
                converted = value(
                  fn.result.endsWith('"numeric"')
                    ? String(result)
                    : fn.result.endsWith('int8')
                      ? BigInt(String(result))
                      : Number(result),
                )
              add(fn.rustName, { ...row, [expected]: converted }, { kind: 'True' })
            }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            add(
              fn.rustName,
              { ...row, [expectedColumn(fn.result) ?? 'expected_cmp']: value(0) },
              error(code),
            )
          }
        }
      const row: Row = Object.fromEntries(args.map((name) => [name, value(0)]))
      const expected =
        fn.result === 'pg_catalog.bytea'
          ? 'wire'
          : fn.name.startsWith('bt')
            ? 'expected_cmp'
            : expectedColumn(fn.result)
      if (expected)
        row[expected] = value(
          fn.result === 'pg_catalog.bytea' || fn.result.endsWith('"numeric"') ? '' : 0,
        )
      add(fn.rustName, { ...row, [args[0]!]: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(fn.rustName, { ...row, [args[0]!]: error('22012') }, error('22012'))
      if (args.length === 2)
        add(
          fn.rustName,
          { ...row, [args[0]!]: { kind: 'Unknown' }, [args[1]!]: error('22003') },
          error('22003'),
        )
    }
    const texts = ['-0', '1', '1.5', 'NaN', 'Infinity', null]
    for (const a of texts)
      for (const d of texts)
        for (const skip of [true, false, null]) {
          const raw: Record<string, string | boolean | null> = {
            a,
            b: '2',
            d,
            e: '2',
            big: '1',
            expected4: '1',
            expected8: '1',
            source: '1',
            alternate: '1',
            skip,
          }
          const row: Row = {
            a: await floatInput('pg_catalog.float4', a),
            b: await floatInput('pg_catalog.float4', '2'),
            d: await floatInput('pg_catalog.float8', d),
            e: await floatInput('pg_catalog.float8', '2'),
            big: value(1n),
            expected4: await floatInput('pg_catalog.float4', '1'),
            expected8: await floatInput('pg_catalog.float8', '1'),
            source: value('1'),
            alternate: value('1'),
            skip: value(skip),
          }
          const keys = Object.keys(raw)
          for (const [name, sql] of Object.entries(composition)) {
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT ${keys.map((key, index) => `$${index + 1}::${columns[key]} AS ${key}`).join(',')}) SELECT (${sql}) result FROM candidate`,
                  keys.map((key) => raw[key]),
                )
              ).rows[0]!.result
              add(name, row, outcome(result))
            } catch (caught) {
              const code = (caught as { code: string }).code
              expect(['22003', '22012']).toContain(code)
              add(name, row, error(code))
            }
          }
        }
    const one4 = await floatInput('pg_catalog.float4', '1')
    const one8 = await floatInput('pg_catalog.float8', '1')
    for (const skip of [true, false]) {
      add(
        'lazy_parse',
        { a: one4, source: value('invalid'), skip: value(skip) },
        skip ? { kind: 'True' } : error('22P02'),
      )
      add(
        'lazy_divide',
        { a: one4, b: value(0), expected4: one4, skip: value(skip) },
        skip ? { kind: 'True' } : error('22012'),
      )
      add(
        'lazy_cast',
        { d: await floatInput('pg_catalog.float8', 'Infinity'), big: value(1n), skip: value(skip) },
        skip ? { kind: 'True' } : error('22003'),
      )
      add(
        'case_mixed',
        { a: one4, d: error('22012'), expected8: one8, skip: value(skip) },
        skip ? { kind: 'True' } : error('22012'),
      )
      add('coalesce_mixed', { a: one4, d: error('22012'), expected8: one8 }, { kind: 'True' })
    }
    add('null4', { a: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('null8', { d: error('22003') }, error('22003'))
    const names = constraints.map((c) => c.name)
    await runCheckParity(directory, 'floatchecks', group, names, fixtures)
  }, 180_000)
  it('exposes SQL-coerced float inputs, domains, exact bit carriers and error diagnostics in the public TypeScript API', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'public_float_values')!
    const output = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [])
    const folder = join(directory, 'public')
    await mkdir(folder)
    await writeFile(join(folder, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(folder, 'checks.ts'), output.checks)
    for (const artifact of checkTypescriptArtifacts(output.rustFiles!)) {
      const path = join(folder, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(folder, 'js'),
      join(folder, 'checks.ts'),
    ])
    const generated = await import(pathToFileURL(join(folder, 'js/checks.js')).href)
    const evaluate = (a: unknown, d: unknown = 1, skip: boolean = true) =>
      generated.evaluatePublicPublicFloatValuesChecks({ a, d, skip }) as {
        constraint: string
        result: { certain: boolean; value?: boolean | null; error?: string }
        message?: string
      }[]
    const result = (a: unknown, d: unknown = 1, name = 'positive4') =>
      evaluate(a, d).find((check) => check.constraint === name)!.result
    expect(result(-1)).toEqual({ certain: true, value: false })
    for (const a of [0, -0, 1, Math.fround(1.1), Infinity, NaN])
      expect(result(a)).toEqual({ certain: true, value: true })
    expect(result(null)).toEqual({ certain: true, value: null })
    for (const a of [undefined, 1.1, 1e100, 1e-100, '1', {}, { kind: 'Value', value: 2147483648 }])
      expect(result(a)).toEqual({ certain: false })
    expect(result({ kind: 'Value', value: 0x3f800000 })).toEqual({ certain: true, value: true })
    expect(result({ kind: 'Value', value: -2147483648 })).toEqual({ certain: true, value: true })
    expect(result(1, { kind: 'Value', value: 0x3ff0000000000000n }, 'positive8')).toEqual({
      certain: true,
      value: true,
    })
    expect(result(1, 1.1, 'positive8')).toEqual({ certain: true, value: true })
    expect(result(1, { kind: 'Value', value: 9223372036854775808n }, 'positive8')).toEqual({
      certain: false,
    })
    expect(result({ kind: 'Error', value: { state: parseInt('22003', 36) } })).toMatchObject({
      certain: true,
      error: '22003',
    })
    const failure = evaluate(1, 1, false).find((check) => check.constraint === 'guarded_divide')!
    expect(failure.result).toMatchObject({ certain: true, error: '22012' })
    expect(failure.message).toBeTruthy()
    expect(evaluate(1).find((check) => check.constraint === 'guarded_divide')!.result).toEqual({
      certain: true,
      value: true,
    })
  }, 120_000)
})
