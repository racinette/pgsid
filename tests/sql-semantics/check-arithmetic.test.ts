import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'

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
