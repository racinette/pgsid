import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { go, printGoFile, type GoStatement } from '../../src/codegen/go/ast.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)
const cases = [-2147483648, -100, -1, 0, 1, 10, 2147483647].flatMap((value) =>
  [0, 23, 2147483647].map((fallback) => ({
    value,
    fallback,
    expected: value < 0 ? fallback : value,
  })),
)
const counts = [0, 1, 65535, 2147483647]
const states = [-2147483648, -1, 0, 1, 23, 2147483647]

describe('CHECK regex position and capture foundations', () => {
  it('preserves signed/index conversion, unit variants, eager fallbacks and owned capture snapshots in all targets', async () => {
    const source = await readFile('tools/check-transpiler/regex_position_smoke.rs', 'utf8')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-foundations-'))
    try {
      await writeFile(join(directory, 'positions.rs'), source)
      await writeFile(
        join(directory, 'native.rs'),
        `
include!("positions.rs");
#[test]
fn position_and_capture_semantics() {
    for value in [-2147483648, -100, -1, 0, 1, 10, 2147483647] {
        for fallback in [0, 23, 2147483647] {
            assert_eq!(checked_position(value, fallback), if value < 0 { fallback } else { value as usize });
        }
    }
    for value in [0, 1, 65535, 2147483647] { assert_eq!(match_count(value), value as i32); }
    for value in [-2147483648, -1, 0, 1, 23, 2147483647] {
        assert_eq!(regex_count_state(value), if value < 0 { -1 } else { value });
    }
    assert!(owned_spans_snapshot());
    assert_eq!(eager_fallback(7, 1), 7);
    assert_eq!(eager_fallback(-1, 1), 1);
    assert!(std::panic::catch_unwind(|| eager_fallback(7, 0)).is_err());
}
`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        '--test',
        join(directory, 'native.rs'),
        '-o',
        join(directory, 'native'),
      ])
      await run(join(directory, 'native'), [])
      const generated = transpileCheckRust(source)
      const context = createContext({ exports: {} })
      runInContext(
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
        context,
      )
      const functions = context.exports as {
        checkedPosition(value: number, fallback: number): number
        matchCount(value: number): number
        eagerFallback(value: number, divisor: number): number
        regexCountState(mode: number): number
        ownedSpansSnapshot(): boolean
      }
      for (const row of cases)
        expect(functions.checkedPosition(row.value, row.fallback)).toBe(row.expected)
      for (const value of counts) expect(functions.matchCount(value)).toBe(value)
      for (const value of states)
        expect(functions.regexCountState(value)).toBe(value < 0 ? -1 : value)
      expect(functions.ownedSpansSnapshot()).toBe(true)
      expect(functions.eagerFallback(7, 1)).toBe(7)
      expect(functions.eagerFallback(-1, 1)).toBe(1)
      expect(() => functions.eagerFallback(7, 0)).toThrow()

      const fail = (message: string): GoStatement =>
        go.expression(go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(message)]))
      const assertion = (name: string, args: number[], expected: number): GoStatement =>
        go.if(go.notEqual(go.call(go.ident(name), args.map(go.number)), go.number(expected)), [
          fail(name),
        ])
      const statements: GoStatement[] = cases.map((row) =>
        assertion('CheckedPosition', [row.value, row.fallback], row.expected),
      )
      for (const value of counts) statements.push(assertion('MatchCount', [value], value))
      for (const value of states)
        statements.push(assertion('RegexCountState', [value], value < 0 ? -1 : value))
      statements.push(
        go.if(go.notEqual(go.call(go.ident('OwnedSpansSnapshot'), []), go.ident('true')), [
          fail('owned capture snapshots'),
        ]),
      )
      statements.push(assertion('EagerFallback', [7, 1], 7), assertion('EagerFallback', [-1, 1], 1))
      statements.push(
        go.defer(
          go.call(
            {
              kind: 'function-literal',
              parameters: [],
              results: [],
              body: [
                go.if(go.notEqual(go.call(go.ident('recover'), []), go.ident('nil')), [
                  go.return(),
                ]),
                fail('fallback must evaluate eagerly'),
              ],
            },
            [],
          ),
        ),
        go.expression(go.call(go.ident('EagerFallback'), [go.number(7), go.number(0)])),
      )
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(
        join(directory, 'runtime_test.go'),
        printGoFile({
          package: 'generated',
          imports: [{ path: 'testing' }],
          declarations: [
            go.function(
              'TestPositionAndCaptureSemantics',
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
  }, 240000)
})
