import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { go, printGoFile, type GoStatement } from '../../src/codegen/go/ast.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const run = promisify(execFile)
const doublePatterns = [
  '0000000000000000',
  '8000000000000000',
  '3ff0000000000000',
  'bff0000000000000',
  '0000000000000001',
  '8000000000000001',
  '000fffffffffffff',
  '0010000000000000',
  '7fefffffffffffff',
  'ffefffffffffffff',
  '7ff0000000000000',
  'fff0000000000000',
  '7ff8000000000000',
  'fff8000000000000',
  '7ff8000000000001',
  '7ff0000000000001',
  'ffffffffffffffff',
  '3ff0000010000000',
  '3ff0000030000000',
].map((hex) => BigInt.asIntN(64, BigInt('0x' + hex)))
const singlePatterns = [
  '00000000',
  '80000000',
  '3f800000',
  'bf800000',
  '00000001',
  '80000001',
  '007fffff',
  '00800000',
  '7f7fffff',
  'ff7fffff',
  '7f800000',
  'ff800000',
  '7fc00000',
  'ffc00000',
  '7fc00001',
  '7f800001',
  'ffffffff',
].map((hex) => Number(BigInt.asIntN(32, BigInt('0x' + hex))))

let patternSeed = 0x6a09e667f3bcc909n
for (let index = 0; index < 256; index++) {
  patternSeed = BigInt.asUintN(64, patternSeed * 6364136223846793005n + 1442695040888963407n)
  doublePatterns.push(BigInt.asIntN(64, patternSeed))
  singlePatterns.push(Number(BigInt.asIntN(32, patternSeed >> 32n)))
}

const bitsOf = (value: number): bigint => {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  return view.getBigInt64(0)
}
const numberOf = (bits: bigint): number => {
  const view = new DataView(new ArrayBuffer(8))
  view.setBigInt64(0, bits)
  return view.getFloat64(0)
}

describe('CHECK IEEE bit conversions', () => {
  it('preserves binary carriers and rounds single precision like native Rust', async () => {
    const source = await readFile('tools/check-transpiler/float_bits_smoke.rs', 'utf8')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-float-bits-'))
    try {
      await writeFile(join(directory, 'bits.rs'), source)
      await writeFile(
        join(directory, 'oracle.rs'),
        `include!("bits.rs");
fn main() {
${doublePatterns.map((bits) => `println!("{} {}", double_roundtrip(${bits}i64), rounded_single_bits(${bits}i64));`).join('\n')}
${singlePatterns.map((bits) => `println!("{} {}", single_roundtrip(${bits}), widened_single_bits(${bits}));`).join('\n')}
}`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        join(directory, 'oracle.rs'),
        '-o',
        join(directory, 'oracle'),
      ])
      const expected = (await run(join(directory, 'oracle'), [])).stdout
        .trim()
        .split('\n')
        .map((line) => line.split(' ').map(BigInt))
      expect(doublePatterns).toHaveLength(275)
      expect(singlePatterns).toHaveLength(273)
      expect(expected).toHaveLength(doublePatterns.length + singlePatterns.length)
      const generated = transpileCheckRust(source)
      const context = createContext({ exports: {} })
      runInContext(
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
        context,
      )
      const functions = context.exports as {
        doubleFromBits(value: bigint): number
        doubleToBits(value: number): bigint
        singleFromBits(value: number): number
        singleToBits(value: number): number
        doubleRoundtrip(value: bigint): bigint
        singleRoundtrip(value: number): number
        roundedSingleBits(value: bigint): number
        widenedSingleBits(value: number): bigint
      }
      const statements: GoStatement[] = []
      const assertGo = (name: string, input: bigint | number, output: bigint | number) => {
        statements.push(
          go.if(go.notEqual(go.call(go.ident(name), [go.number(input)]), go.number(output)), [
            go.expression(
              go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(`${name}(${input})`)]),
            ),
          ]),
        )
      }
      for (const [index, bits] of doublePatterns.entries()) {
        const [roundtrip, rounded] = expected[index]!
        expect(roundtrip).toBe(bits)
        expect(functions.doubleRoundtrip(bits)).toBe(roundtrip)
        expect(bitsOf(functions.doubleFromBits(bits))).toBe(bits)
        expect(functions.doubleToBits(numberOf(bits))).toBe(bits)
        expect(functions.roundedSingleBits(bits)).toBe(Number(rounded))
        expect(functions.singleToBits(numberOf(bits))).toBe(Number(rounded))
        assertGo('DoubleRoundtrip', bits, roundtrip!)
        assertGo('RoundedSingleBits', bits, Number(rounded))
        statements.push(
          go.if(
            go.notEqual(
              go.call(go.ident('DoubleToBits'), [
                go.call(go.ident('DoubleFromBits'), [go.number(bits)]),
              ]),
              go.number(bits),
            ),
            [
              go.expression(
                go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(`double ${bits}`)]),
              ),
            ],
          ),
        )
      }
      for (const [index, bits] of singlePatterns.entries()) {
        const [roundtrip, widened] = expected[doublePatterns.length + index]!
        expect(functions.singleRoundtrip(bits)).toBe(Number(roundtrip))
        expect(functions.widenedSingleBits(bits)).toBe(widened)
        expect(bitsOf(functions.singleFromBits(bits))).toBe(widened)
        assertGo('SingleRoundtrip', bits, Number(roundtrip))
        assertGo('WidenedSingleBits', bits, widened!)
        statements.push(
          go.if(
            go.notEqual(
              go.call(go.ident('SingleToBits'), [
                go.call(go.ident('SingleFromBits'), [go.number(bits)]),
              ]),
              go.number(Number(roundtrip)),
            ),
            [
              go.expression(
                go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(`single ${bits}`)]),
              ),
            ],
          ),
        )
      }
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(
        join(directory, 'runtime_test.go'),
        printGoFile({
          package: 'generated',
          imports: [{ path: 'testing' }],
          declarations: [
            go.function(
              'TestFloatBits',
              [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
              [],
              statements,
            ),
          ],
        }),
      )
      await run('go', ['test', join(directory, 'runtime.go'), join(directory, 'runtime_test.go')])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)

  it('supports a real-narrowing CHECK scaffold with NULL, Unknown, SQL errors and lazy branches', async () => {
    const primitiveSource = await readFile('tools/check-transpiler/float_bits_smoke.rs', 'utf8')
    const evaluatorSource = `pub fn evaluate_check(input_bits: Int8Value, input_expected: Int4Value, input_skip: BoolValue) -> CheckOutcome {
    let guard = check_from_bool(input_skip);
    let mut result: CheckOutcome = check_unknown();
    if case_guard_stops(guard) {
        result = guard;
    } else {
        if case_guard_takes(guard) {
            result = check_from_bool(input_skip);
        } else {
            let comparison = single_bits_check(input_bits, input_expected);
            result = check_from_bool(comparison);
        };
    };
    result
}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'checkruntime')!
      .files.push({
        path: 'float_bits_check_smoke.rs',
        source:
          primitiveSource +
          `
const FLOAT_BITS_NUMERIC_RANGE: u32 = ${parseInt('22003', 36)};
fn single_bits_convert(input: Int8Value) -> Int4Value {
    if let Int8Value::Error(error) = input { return Int4Value::Error(error); }
    if input == Int8Value::Null { return Int4Value::Null; }
    if let Int8Value::Value(bits) = input {
        let value = double_from_bits(bits);
        let rounded_bits = single_to_bits(value);
        let rounded = single_from_bits(rounded_bits);
        let infinity = 1.0f64 / 0.0f64;
        if (value.abs() != infinity && rounded.abs() == infinity)
            || (value != 0.0f64 && rounded == 0.0f64) {
            return Int4Value::Error(make_sql_error(FLOAT_BITS_NUMERIC_RANGE));
        };
        return Int4Value::Value(rounded_bits);
    };
    Int4Value::Unknown
}
pub fn single_bits_check(input: Int8Value, expected: Int4Value) -> BoolValue {
    let rounded = single_bits_convert(input);
    if let Int4Value::Error(error) = rounded { return BoolValue::Error(error); }
    if let Int4Value::Error(error) = expected { return BoolValue::Error(error); }
    if rounded == Int4Value::Null || expected == Int4Value::Null { return BoolValue::Null; }
    if let Int4Value::Value(bits) = rounded {
        if let Int4Value::Value(wire) = expected { return BoolValue::Value(bits == wire); };
    };
    BoolValue::Unknown
}`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [
        {
          kind: 'supported',
          entryName: 'evaluate_check',
          inputs: [
            {
              name: 'bits',
              type: 'pg_catalog.int8',
              rustName: 'input_bits',
              rustType: 'Int8Value',
            },
            {
              name: 'expected',
              type: 'pg_catalog.int4',
              rustName: 'input_expected',
              rustType: 'Int4Value',
            },
            {
              name: 'skip',
              type: 'pg_catalog.bool',
              rustName: 'input_skip',
              rustType: 'BoolValue',
            },
          ],
        },
      ],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const value = (value: number | bigint | boolean | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (row: Row, expected: Outcome) => fixtures.push({ name: 'narrowing', row, expected })
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-float-bits-check-'))
    try {
      for (const text of [
        '0',
        '-0',
        '1',
        '-1',
        'NaN',
        'Infinity',
        '-Infinity',
        '1.000000059604644775390625',
        '1.000000178813934326171875',
        '3.4028234663852886e38',
        '3.4028236e38',
        '-3.4028236e38',
        '1.401298464324817e-45',
        '-1.401298464324817e-45',
        '7.006492321624085e-46',
        '7.006492321624086e-46',
        '1e-100',
        '-1e-100',
        null,
      ]) {
        const double = (
          await pg.query<{ hex: string | null }>(
            "SELECT encode(float8send($1::float8),'hex') hex",
            [text],
          )
        ).rows[0]!.hex
        let wire = 0
        try {
          const single = (
            await pg.query<{ hex: string | null }>(
              "SELECT encode(float4send($1::float8::real),'hex') hex",
              [text],
            )
          ).rows[0]!.hex
          if (single !== null) wire = Number(BigInt.asIntN(32, BigInt('0x' + single)))
        } catch (error) {
          expect(error).toMatchObject({ code: '22003' })
        }
        for (const skip of [false, true, null])
          for (const expectedWire of [wire, wire === 0 ? 1 : 0, null]) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT $1::float8 amount, $2::bytea wire, $3::bool skip)
              SELECT CASE WHEN skip THEN true ELSE float4send(amount::real) = wire END result FROM candidate`,
                  [
                    text,
                    expectedWire === null
                      ? null
                      : new Uint8Array([
                          (expectedWire >>> 24) & 255,
                          (expectedWire >>> 16) & 255,
                          (expectedWire >>> 8) & 255,
                          expectedWire & 255,
                        ]),
                    skip,
                  ],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              expect(error).toMatchObject({ code: '22003' })
              expected = { kind: 'Error', value: { state: parseInt('22003', 36) } }
            }
            add(
              {
                bits: value(double === null ? null : BigInt.asIntN(64, BigInt('0x' + double))),
                expected: value(expectedWire),
                skip: value(skip),
              },
              expected,
            )
          }
      }
      const base: Row = { bits: value(bitsOf(1)), expected: value(0x3f800000), skip: value(false) }
      const incoming: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
      for (const key of ['bits', 'expected', 'skip']) {
        add({ ...base, [key]: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add({ ...base, [key]: incoming }, incoming as Outcome)
      }
      add({ ...base, bits: incoming, skip: value(true) }, { kind: 'True' })
      add({ ...base, bits: { kind: 'Unknown' }, skip: value(true) }, { kind: 'True' })
      add({ ...base, bits: value(null), expected: { kind: 'Unknown' } }, { kind: 'Null' })
      add({ ...base, bits: { kind: 'Unknown' }, expected: value(null) }, { kind: 'Null' })
      add({ ...base, bits: value(null), expected: incoming }, incoming as Outcome)
      add({ ...base, bits: { kind: 'Unknown' }, expected: incoming }, incoming as Outcome)
      add({ ...base, bits: incoming, expected: { kind: 'Unknown' } }, incoming as Outcome)
      add(
        { ...base, bits: value(bitsOf(1e100)), expected: { kind: 'Unknown' } },
        {
          kind: 'Error',
          value: { state: parseInt('22003', 36) },
        },
      )
      expect(fixtures).toHaveLength(185)
      await runCheckParity(directory, 'floatbitschecks', group, ['narrowing'], fixtures)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 180000)
})
