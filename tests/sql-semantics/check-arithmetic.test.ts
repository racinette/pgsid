import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const context = createContext({})
runInContext(
  ts.transpileModule(readFileSync('tools/check-transpiler/typescript/runtime-prelude.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText,
  context,
)
const cases = [
  ['checkedSignedMultiply', -2147483648, 1, -2147483648],
  ['checkedSignedMultiply', 2147483647, 1, 2147483647],
  ['checkedSignedMultiply', -7, -3, 21],
  ['checkedSignedMultiply', -7, 0, 0],
  ['checkedSignedDivide', -7, 3, -2],
  ['checkedSignedDivide', 7, -3, -2],
  ['checkedSignedDivide', -1, 3, 0],
  ['checkedSignedDivide', -2147483648, 1, -2147483648],
  ['checkedSignedRemainder', -7, 3, -1],
  ['checkedSignedRemainder', 7, -3, 1],
  ['checkedSignedRemainder', -6, 3, 0],
] as const

describe('CHECK signed calendar arithmetic', () => {
  it.each(cases)('%s(%i, %i) follows Rust integer arithmetic', (name, left, right, result) => {
    expect((context[name] as (a: number, b: number) => number)(left, right)).toBe(result)
  })
  for (const name of ['checkedSignedMultiply', 'checkedSignedDivide', 'checkedSignedRemainder']) {
    it(`${name} rejects the signed minimum with negative one`, () => {
      expect(() => (context[name] as (a: number, b: number) => number)(-2147483648, -1)).toThrow()
    })
  }
  it('rejects zero divisors and multiplication overflow', () => {
    for (const name of ['checkedSignedDivide', 'checkedSignedRemainder'])
      expect(() => (context[name] as (a: number, b: number) => number)(1, 0)).toThrow()
    expect(() =>
      (context['checkedSignedMultiply'] as (a: number, b: number) => number)(2147483647, 2),
    ).toThrow()
  })
})

describe('CHECK timestamp arithmetic', () => {
  const minimum = -9223372036854775808n
  const maximum = 9223372036854775807n
  it.each([
    ['checkedI64Add', maximum, 0n, maximum],
    ['checkedI64Add', minimum, maximum, -1n],
    ['checkedI64Subtract', minimum, minimum, 0n],
    ['checkedI64Subtract', 9007199254740993n, 9007199254740992n, 1n],
    ['checkedI64Multiply', minimum, 1n, minimum],
    ['checkedI64Multiply', maximum, 1n, maximum],
    ['checkedI64Multiply', -7n, -3n, 21n],
    ['checkedI64Multiply', minimum, 0n, 0n],
    ['checkedI64Divide', 9007199254740993n, 3n, 3002399751580331n],
    ['checkedI64Divide', -7n, 3n, -2n],
    ['checkedI64Divide', 7n, -3n, -2n],
    ['checkedI64Divide', -1n, 3n, 0n],
    ['checkedI64Divide', minimum, 1n, minimum],
    ['checkedI64Remainder', -7n, 3n, -1n],
    ['checkedI64Remainder', 7n, -3n, 1n],
    ['checkedI64Remainder', minimum, 3n, -2n],
  ] as const)('%s preserves exact int8 results', (name, left, right, result) => {
    expect((context[name] as (a: bigint, b: bigint) => bigint)(left, right)).toBe(result)
  })
  it.each([
    ['checkedI64Add', maximum, 1n],
    ['checkedI64Add', minimum, -1n],
    ['checkedI64Subtract', minimum, 1n],
    ['checkedI64Subtract', maximum, -1n],
    ['checkedI64Multiply', minimum, -1n],
    ['checkedI64Multiply', -1n, minimum],
    ['checkedI64Multiply', maximum, 2n],
    ['checkedI64Multiply', minimum, minimum],
    ['checkedI64Divide', minimum, -1n],
    ['checkedI64Remainder', minimum, -1n],
    ['checkedI64Divide', 1n, 0n],
    ['checkedI64Remainder', 1n, 0n],
  ] as const)('%s rejects int8 overflow', (name, left, right) => {
    expect(() => (context[name] as (a: bigint, b: bigint) => bigint)(left, right)).toThrow()
  })
  it('executes timestamp construction arithmetic through Rust and both target emitters', async () => {
    const source = `pub fn timestamp_parts(day: i32, clock: i64, zone: i32) -> i64 {
      let days = day as i64;
      let offset = zone as i64;
      let local = days * 86400000000i64 + clock;
      local - offset * 1000000i64
    }
    pub fn add(left: i64, right: i64) -> i64 { left + right }
    pub fn subtract(left: i64, right: i64) -> i64 { left - right }
    pub fn multiply(left: i64, right: i64) -> i64 { left * right }
    pub fn divide(left: i64, right: i64) -> i64 { left / right }
    pub fn remainder(left: i64, right: i64) -> i64 { left % right }
    `
    const generated = transpileCheckRust(source)
    const generatedContext = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      generatedContext,
    )
    const functions = generatedContext['exports'] as Record<
      string,
      (...args: (number | bigint)[]) => bigint
    >
    expect(functions['timestampParts']!(0, 19800000000n, 19800)).toBe(0n)
    expect(functions['subtract']!(9007199254740993n, 9007199254740992n)).toBe(1n)
    expect(functions['divide']!(9007199254740993n, 3n)).toBe(3002399751580331n)
    expect(functions['divide']!(-7n, 3n)).toBe(-2n)
    expect(functions['remainder']!(-7n, 3n)).toBe(-1n)
    expect(functions['remainder']!(minimum, 3n)).toBe(-2n)
    for (const [name, left, right] of [
      ['add', maximum, 1n],
      ['subtract', minimum, 1n],
      ['multiply', minimum, -1n],
      ['divide', minimum, -1n],
      ['remainder', minimum, -1n],
      ['divide', 1n, 0n],
      ['remainder', 1n, 0n],
    ] as const)
      expect(() => functions[name]!(left, right)).toThrow()
    const root = await mkdtemp(join(tmpdir(), 'pgsid-check-i64-'))
    try {
      await writeFile(join(root, 'runtime.go'), generated.go)
      await writeFile(join(root, 'go.mod'), 'module arithmetic\n\ngo 1.25\n')
      await writeFile(
        join(root, 'arithmetic_test.go'),
        `package generated
import "testing"
func TestArithmetic(t *testing.T) {
  if TimestampParts(0, 19800000000, 19800) != 0 { t.Fatal("timestamp arithmetic") }
  if Subtract(9007199254740993, 9007199254740992) != 1 { t.Fatal("lost precision") }
  if Divide(9007199254740993, 3) != 3002399751580331 { t.Fatal("division precision") }
  if Divide(-7, 3) != -2 || Remainder(-7, 3) != -1 || Remainder(-9223372036854775808, 3) != -2 { t.Fatal("signed division") }
  for _, operation := range []func(){
    func(){ Add(9223372036854775807, 1) },
    func(){ Subtract(-9223372036854775808, 1) },
    func(){ Multiply(-9223372036854775808, -1) },
    func(){ Divide(-9223372036854775808, -1) },
    func(){ Remainder(-9223372036854775808, -1) },
    func(){ Divide(1, 0) },
    func(){ Remainder(1, 0) },
  } { func(){ defer func(){ if recover() == nil { t.Fatal("expected overflow") } }(); operation() }() }
}
`,
      )
      await writeFile(
        join(root, 'arithmetic.rs'),
        source +
          `
#[test] fn exact() {
  assert_eq!(timestamp_parts(0, 19800000000, 19800), 0);
  assert_eq!(subtract(9007199254740993, 9007199254740992), 1);
  assert_eq!(divide(9007199254740993, 3), 3002399751580331);
  assert_eq!(divide(-7, 3), -2);
  assert_eq!(remainder(-7, 3), -1);
  assert_eq!(remainder(-9223372036854775808, 3), -2);
}
#[test] #[should_panic] fn addition_overflow() { add(9223372036854775807, 1); }
#[test] #[should_panic] fn subtraction_overflow() { subtract(-9223372036854775808, 1); }
#[test] #[should_panic] fn multiplication_overflow() { multiply(-9223372036854775808, -1); }
#[test] #[should_panic] fn division_overflow() { divide(-9223372036854775808, -1); }
#[test] #[should_panic] fn remainder_overflow() { remainder(-9223372036854775808, -1); }
#[test] #[should_panic] fn zero_divisor() { divide(1, 0); }
#[test] #[should_panic] fn zero_remainder_divisor() { remainder(1, 0); }
`,
      )
      const run = promisify(execFile)
      await run('go', ['test', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', ['--test', join(root, 'arithmetic.rs'), '-o', join(root, 'arithmetic')])
      await run(join(root, 'arithmetic'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 120_000)
})

describe('CHECK bigint narrowing primitive', () => {
  it('preserves Rust truncation through both target emitters', async () => {
    const source = 'pub fn narrow(value: i64) -> i32 { value as i32 }'
    const generated = transpileCheckRust(source)
    const generatedContext = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      generatedContext,
    )
    const narrow = (generatedContext['exports'] as { narrow: (value: bigint) => number }).narrow
    const cases = [
      [-9223372036854775808n, 0],
      [-9007199254740993n, -1],
      [-4294967296n, 0],
      [-2147483649n, 2147483647],
      [-2147483648n, -2147483648],
      [-1n, -1],
      [0n, 0],
      [1n, 1],
      [2147483647n, 2147483647],
      [2147483648n, -2147483648],
      [4294967295n, -1],
      [4294967296n, 0],
      [9007199254740993n, 1],
      [9223372036854775807n, -1],
    ] as const
    for (const [input, expected] of cases) expect(narrow(input)).toBe(expected)
    const root = await mkdtemp(join(tmpdir(), 'pgsid-check-narrow-'))
    try {
      await writeFile(join(root, 'runtime.go'), generated.go)
      await writeFile(join(root, 'go.mod'), 'module narrowing\n\ngo 1.25\n')
      await writeFile(
        join(root, 'narrow_test.go'),
        `package generated
import "testing"
func TestNarrow(t *testing.T) {
  for _, test := range []struct { input int64; expected int }{
    ${cases.map(([input, expected]) => `{${input}, ${expected}}`).join(',\n')},
  } { if actual := Narrow(test.input); actual != test.expected { t.Fatalf("%d: got %d, expected %d", test.input, actual, test.expected) } }
}
`,
      )
      await writeFile(
        join(root, 'narrow.rs'),
        source +
          `
#[test] fn truncates() {
  ${cases.map(([input, expected]) => `assert_eq!(narrow(${input}i64), ${expected});`).join('\n')}
}
`,
      )
      const run = promisify(execFile)
      await run('go', ['test', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', ['--test', join(root, 'narrow.rs'), '-o', join(root, 'narrow')])
      await run(join(root, 'narrow'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 120_000)
})
