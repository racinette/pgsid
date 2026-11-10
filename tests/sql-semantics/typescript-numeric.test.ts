import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import {
  typescriptNumericFiles,
  typescriptNumericModule,
} from '../../src/codegen/typescript/numeric-module.js'
import { buildTypescriptNumericAsset } from '../../scripts/build-typescript-numeric.js'

// The public numeric against PostgreSQL itself: every operation over a fixed sweep of values,
// compared by exact output text or by SQLSTATE.
type Numeric = {
  toString(): string
  toJSON(): string
  toNumber(): number
  add(other: Numeric): Numeric
  sub(other: Numeric): Numeric
  mul(other: Numeric): Numeric
  div(other: Numeric): Numeric
  mod(other: Numeric): Numeric
  neg(): Numeric
  abs(): Numeric
  round(scale?: number): Numeric
  trunc(scale?: number): Numeric
  compare(other: Numeric): number
  equals(other: Numeric): boolean
  isNaN(): boolean
  isInfinite(): boolean
  sign(): number
}
type Module = {
  numeric(value: string | bigint): Numeric
  numericFromServer(text: string): Numeric
  isNumeric(value: unknown): value is Numeric
}

const values = [
  '0',
  '1',
  '-1',
  '3',
  '7',
  '1.50',
  '-2.5',
  '0.1',
  '2.675',
  '0.000001',
  '-0.00500',
  '99999999999999999999.999',
  '123456789012345678901234567890.123456789',
  '1e20',
  '-1e-5',
  'NaN',
  'Infinity',
  '-Infinity',
]
const inputs = [
  ...values,
  ' 12 ',
  '+.5',
  '-0',
  '-0.000',
  '1_000',
  '0x1F',
  '1E+3',
  '1e',
  'abc',
  '',
  '1.2.3',
  'nan',
  '-inf',
  '1e100000',
]
const scales = [-3, -1, 0, 1, 2, 5]

let root: string
let db: PGlite
let one: Module
let other: Module

async function emit(directory: string): Promise<Module> {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'numeric.ts'), typescriptNumericModule)
  for (const file of typescriptNumericFiles()) {
    const path = join(directory, 'numeric', file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.content)
  }
  return (await import(join(directory, 'numeric.ts'))) as Module
}

type Outcome = { text: string } | { code: string }
async function server(sql: string, params: unknown[]): Promise<Outcome> {
  try {
    const result = await db.query<{ v: string | number | boolean }>(`SELECT (${sql}) AS v`, params)
    return { text: String(result.rows[0]!.v) }
  } catch (error) {
    return { code: (error as { code: string }).code }
  }
}
function local(run: () => unknown): Outcome {
  try {
    return { text: String(run()) }
  } catch (error) {
    return { code: (error as { code?: string }).code ?? String(error) }
  }
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-numeric-'))
  one = await emit(join(root, 'one'))
  other = await emit(join(root, 'other'))
  db = new PGlite()
}, 120_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

describe('TypeScript numeric', () => {
  it('reads input as numeric input does', async () => {
    for (const input of inputs)
      expect([input, local(() => one.numeric(input))]).toEqual([
        input,
        await server('$1::numeric::text', [input]),
      ])
    expect(one.numeric(-12345678901234567890n).toString()).toBe('-12345678901234567890')
    expect(() => one.numeric(1 as unknown as string)).toThrow(TypeError)
  })

  it('computes and compares as PostgreSQL does', async () => {
    const binary = [
      ['add', '+'],
      ['sub', '-'],
      ['mul', '*'],
      ['div', '/'],
      ['mod', '%'],
    ] as const
    for (const left of values)
      for (const right of values) {
        const a = one.numeric(left)
        const b = one.numeric(right)
        for (const [method, operator] of binary)
          expect([left, method, right, local(() => a[method](b))]).toEqual([
            left,
            method,
            right,
            await server(`($1::numeric ${operator} $2::numeric)::text`, [left, right]),
          ])
        expect([left, right, a.compare(b), a.equals(b)]).toEqual([
          left,
          right,
          Number(
            (
              (await server('numeric_cmp($1::numeric, $2::numeric)', [left, right])) as {
                text: string
              }
            ).text,
          ),
          ((await server('$1::numeric = $2::numeric', [left, right])) as { text: string }).text ===
            'true',
        ])
      }
    for (const value of values) {
      const a = one.numeric(value)
      const unary: [string, () => unknown, string][] = [
        ['neg', () => a.neg(), '(-$1::numeric)::text'],
        ['abs', () => a.abs(), 'abs($1::numeric)::text'],
        ['round', () => a.round(), 'round($1::numeric)::text'],
        ['trunc', () => a.trunc(), 'trunc($1::numeric)::text'],
        ['sign', () => a.sign(), 'sign($1::numeric)::float8::text'],
        ...scales.flatMap((scale): [string, () => unknown, string][] => [
          [`round ${scale}`, () => a.round(scale), `round($1::numeric, ${scale})::text`],
          [`trunc ${scale}`, () => a.trunc(scale), `trunc($1::numeric, ${scale})::text`],
        ]),
      ]
      for (const [name, run, sql] of unary)
        expect([value, name, local(run)]).toEqual([value, name, await server(sql, [value])])
      expect(a.isNaN()).toBe(value === 'NaN')
      expect(a.isInfinite()).toBe(value.endsWith('Infinity'))
      expect(Object.is(a.toNumber(), Number(a.toString()))).toBe(true)
    }
  }, 120_000)

  it('keeps the exact text and refuses implicit arithmetic', () => {
    const price = one.numeric('19.90')
    expect(price.toString()).toBe('19.90')
    expect(`${price}`).toBe('19.90')
    expect(JSON.stringify({ price })).toBe('{"price":"19.90"}')
    expect(price.toNumber()).toBe(19.9)
    expect(Object.prototype.toString.call(price)).toBe('[object PgsidNumeric]')
    expect(() => (price as unknown as number) + 1).toThrow(TypeError)
    expect(() => (price as unknown as number) < 1).toThrow(TypeError)
    expect(() => price.add('1' as unknown as Numeric)).toThrow(TypeError)
    expect(() => price.round(1.5)).toThrow(TypeError)
    expect(Object.isFrozen(price)).toBe(true)
  })

  it('takes values from another copy of the module', () => {
    const a = one.numeric('1.25')
    const b = other.numeric('2.5')
    expect(other.isNumeric(a)).toBe(true)
    expect(a.add(b).toString()).toBe('3.75')
    expect(b.mul(a).toString()).toBe('3.125')
    expect(one.numericFromServer('-0.50').abs().toString()).toBe('0.50')
    // A forged value that only claims to be numeric is refused.
    const forged = { [Symbol.for('pgsid.numeric')]: true, toString: () => 'abc' }
    expect(() => a.add(forged as unknown as Numeric)).toThrow(TypeError)
  })

  it('ships the asset its build produces', async () => {
    expect(
      await readFile(
        new URL('../../src/codegen/go/assets/typescript-numeric.json', import.meta.url),
        'utf8',
      ),
    ).toBe(buildTypescriptNumericAsset())
  }, 300_000)
})
