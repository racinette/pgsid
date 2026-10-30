import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
  int4: 'to_char(v4, t) IS NOT DISTINCT FROM expected',
  int8: 'to_char(v8, t) IS NOT DISTINCT FROM expected',
  numeric: 'to_char(vn, t) IS NOT DISTINCT FROM expected',
  float8: 'to_char(vd, t) IS NOT DISTINCT FROM expected',
  float4: 'to_char(vr, t) IS NOT DISTINCT FROM expected',
  lazy: 'CASE WHEN skip THEN true ELSE to_char(v8, t) IS NOT DISTINCT FROM expected END',
}
const templates = [
  '9999',
  '0000',
  'FM9999',
  '9,999',
  '9G999',
  '99.99',
  '9D99',
  'FM99.99',
  'FM00.00',
  'FM9990.00',
  'FM0.999',
  '099',
  'S9999',
  '9999S',
  'SG9999',
  '9999MI',
  '9999PL',
  '9999PR',
  'FM9999PR',
  'RN',
  'FMRN',
  'rn',
  '9EEEE',
  '9.99EEEE',
  '999th',
  'FM999TH',
  '99V99',
  '9V9',
  '9V9999999999',
  '9V99999999999999999999',
  'L999',
  '"val:"999',
  '"a\\"b"9',
  'B999',
  '999 abc',
  'FM9,999,999',
  '',
  '9.9.9',
  'EEEE9',
  '9PR9',
  'S9S',
  'RN9',
  '9V9.9',
  'FMEEEE',
]
const values = [
  0n,
  1n,
  -1n,
  5n,
  12n,
  21n,
  113n,
  -42n,
  25n,
  35n,
  999n,
  1000n,
  1999n,
  3999n,
  4000n,
  123456n,
  -2147483648n,
  2147483647n,
  9223372036854775807n,
  -9223372036854775808n,
]
const numerics = [
  '0',
  '1.5',
  '-1.5',
  '2.5',
  '-2.5',
  '0.004',
  '-0.004',
  '0.5',
  '9.995',
  '-9.995',
  '1234.5678',
  '0.00123',
  '123.456',
  '1000000000000000000000000000000',
  '3999.4',
  '3999.5',
  'NaN',
  'Infinity',
  '-Infinity',
]
const floats = [
  '0',
  '-0',
  '1.5',
  '-1.5',
  '2.5',
  '0.125',
  '0.1',
  '-0.004',
  '9.995',
  '1.1',
  '12345.678',
  '123456789.123',
  '1e15',
  '1e300',
  '1e-300',
  '0.000123',
  '3999.5',
  'NaN',
  'Infinity',
  '-Infinity',
]
const input = (value: string | bigint | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
// D, G, S and L read the locale; SG, SP and PL only contain those letters.
const locale = /[DGSLdgsl]/u
const packet = 'artifacts/goal-checks/number-format-active'

// PostgreSQL 18.6 multiplies int4 values for V after a C cast of the power to int32; that cast
// and the product are undefined outside the int32 range, so those results defer.
const undefinedInt4 = (value: bigint, template: string) => {
  const multiplier = /V(9*)/u.exec(template)
  if (!multiplier) return false
  const power = 10n ** BigInt(multiplier[1]!.length)
  const product = value * power
  return power > 2147483647n || product > 2147483647n || product < -2147483648n
}

it('formats int4 and int8 through number templates as PostgreSQL does', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-number-format-'))
  try {
    for (const setting of ['lc_numeric', 'lc_monetary'])
      expect(
        (await pg.query<{ value: string }>(`SELECT current_setting('${setting}') value`)).rows[0]!
          .value,
      ).toBe('C')
    await pg.exec(`CREATE TABLE number_formats (v4 int4, v8 int8, vn numeric, vd float8, vr float4, t text, expected text, skip bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'number_formats')!
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
    const checks = constraints.map((constraint) => {
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
    })
    const declared = prepareCheckRustGroup(checks, { numericLocale: 'C', moneyLocale: 'C' })
    const undeclared = prepareCheckRustGroup(checks)
    for (const group of [declared, undeclared])
      group.checks.forEach((check, i) => expect(check.kind, constraints[i]!.name).toBe('supported'))
    const native = async (sql: string, value: bigint | string, template: string) => {
      try {
        return {
          text: (
            await pg.query<{ text: string | null }>(`SELECT to_char($1::${sql}, $2) text`, [
              String(value),
              template,
            ])
          ).rows[0]!.text,
        }
      } catch (error) {
        return { code: (error as { code: string }).code }
      }
    }
    const known: { name: string; row: Row; expected: Outcome }[] = []
    const deferred: { name: string; row: Row; expected: Outcome }[] = []
    const add = (target: typeof known, name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        target.push({ name: `${name}_${suffix}`, row, expected })
    }
    for (const template of templates)
      for (const value of values) {
        const narrow = value >= -2147483648n && value <= 2147483647n
        for (const [name, sql] of [
          ['int4', 'int4'],
          ['int8', 'int8'],
          ['lazy', 'int8'],
        ] as const) {
          if (name === 'int4' && !narrow) continue
          const result = await native(sql, value, template)
          const row: Row = {
            v4: input(narrow ? Number(value) : null),
            v8: input(value),
            vn: input(null),
            vd: input(null),
            vr: input(null),
            t: input(template),
            expected: input(result.text ?? null),
            skip: input(false),
          }
          let expected: Outcome =
            result.code !== undefined
              ? { kind: 'Error', value: { state: Number.parseInt(result.code, 36) } }
              : { kind: 'True' }
          if (name === 'int4' && result.code !== '42601' && undefinedInt4(value, template))
            expected = { kind: 'Unknown' }
          add(known, name, row, expected)
          if (result.code === undefined)
            add(
              known,
              name,
              { ...row, expected: input('wrong') },
              expected.kind === 'Unknown' ? expected : { kind: 'False' },
            )
          if (name === 'lazy') add(known, name, { ...row, skip: input(true) }, { kind: 'True' })
          // Without declared locales, locale keywords defer while syntax errors stay definite.
          if (
            template !== '' &&
            locale.test(template.replace(/"[^"]*"/gu, '').replace(/SG|SP|PL|sg|sp|pl/gu, '')) &&
            name !== 'lazy'
          )
            add(deferred, name, row, result.code === '42601' ? expected : { kind: 'Unknown' })
        }
      }
    for (const template of templates)
      for (const value of numerics) {
        const result = await native('numeric', value, template)
        const row: Row = {
          v4: input(null),
          v8: input(null),
          vn: input(value),
          vd: input(null),
          vr: input(null),
          t: input(template),
          expected: input(result.text ?? null),
          skip: input(false),
        }
        const expected: Outcome =
          result.code !== undefined
            ? { kind: 'Error', value: { state: Number.parseInt(result.code, 36) } }
            : { kind: 'True' }
        add(known, 'numeric', row, expected)
        if (result.code === undefined)
          add(known, 'numeric', { ...row, expected: input('wrong') }, { kind: 'False' })
        if (
          template !== '' &&
          locale.test(template.replace(/"[^"]*"/gu, '').replace(/SG|SP|PL|sg|sp|pl/gu, ''))
        )
          add(deferred, 'numeric', row, result.code === '42601' ? expected : { kind: 'Unknown' })
      }
    const floatBits = async (type: 'float4' | 'float8', text: string): Promise<Input> => {
      const hex = (
        await pg.query<{ hex: string }>(`SELECT encode(${type}send($1::${type}),'hex') hex`, [text])
      ).rows[0]!.hex
      return type === 'float4'
        ? input(Number(BigInt.asIntN(32, BigInt('0x' + hex))))
        : input(BigInt.asIntN(64, BigInt('0x' + hex)))
    }
    for (const template of templates)
      for (const value of floats)
        for (const type of ['float8', 'float4'] as const) {
          // float4 cannot hold the extreme float8 magnitudes.
          if (type === 'float4' && ['1e300', '1e-300'].includes(value)) continue
          const result = await native(type, value, template)
          const row: Row = {
            v4: input(null),
            v8: input(null),
            vn: input(null),
            vd: type === 'float8' ? await floatBits('float8', value) : input(null),
            vr: type === 'float4' ? await floatBits('float4', value) : input(null),
            t: input(template),
            expected: input(result.text ?? null),
            skip: input(false),
          }
          // V beyond 10^22 needs pow() results that are no longer exact powers of ten.
          const wide = /V(9*)/u.exec(template)
          const expected: Outcome =
            result.code !== undefined
              ? { kind: 'Error', value: { state: Number.parseInt(result.code, 36) } }
              : wide && wide[1]!.length > 22
                ? { kind: 'Unknown' }
                : { kind: 'True' }
          add(known, type, row, expected)
          if (result.code === undefined)
            add(
              known,
              type,
              { ...row, expected: input('wrong') },
              expected.kind === 'Unknown' ? expected : { kind: 'False' },
            )
          if (
            template !== '' &&
            locale.test(template.replace(/"[^"]*"/gu, '').replace(/SG|SP|PL|sg|sp|pl/gu, ''))
          )
            add(deferred, type, row, result.code === '42601' ? expected : { kind: 'Unknown' })
        }
    for (const name of ['int4', 'int8'] as const) {
      const base: Row = {
        v4: input(1),
        v8: input(1n),
        vn: input(null),
        vd: input(null),
        vr: input(null),
        t: input('9'),
        expected: input(' 1'),
        skip: input(false),
      }
      add(
        known,
        name,
        { ...base, v4: { kind: 'Unknown' }, v8: { kind: 'Unknown' } },
        { kind: 'Unknown' },
      )
      add(known, name, { ...base, t: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(known, name, { ...base, t: input(null) }, { kind: 'False' })
      add(known, name, { ...base, t: input(null), expected: input(null) }, { kind: 'True' })
      add(
        known,
        name,
        {
          ...base,
          v4: { kind: 'Error', value: { state: 3452547 } },
          v8: { kind: 'Error', value: { state: 3452547 } },
        },
        { kind: 'Error', value: { state: 3452547 } },
      )
    }
    await mkdir(join(directory, 'declared'))
    await mkdir(join(directory, 'undeclared'))
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'fixtures.json'),
      JSON.stringify(
        { known, deferred },
        (_, v: unknown) => (typeof v === 'bigint' ? String(v) : v),
        1,
      ) + '\n',
    )
    await runCheckParity(
      join(directory, 'declared'),
      'numberformat',
      declared,
      constraints.map((c) => c.name),
      known,
    )
    await runCheckParity(
      join(directory, 'undeclared'),
      'numberformatlocale',
      undeclared,
      constraints.map((c) => c.name),
      deferred,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
