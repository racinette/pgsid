import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const conditions = [
  ['22003', 'numeric value out of range'],
  ['22007', 'invalid date/time format'],
  ['22008', 'date/time field value out of range'],
  ['22009', 'time zone displacement out of range'],
  ['22012', 'division by zero'],
  ['22013', 'invalid preceding or following size'],
  ['22011', 'substring error'],
  ['2201B', 'invalid regular expression'],
  ['22023', 'invalid parameter value'],
  ['22025', 'invalid escape sequence'],
  ['22P02', 'invalid text representation'],
  ['22026', 'string data length mismatch'],
  ['22001', 'string data right truncation'],
  ['2202E', 'array subscript error'],
  ['0A000', 'feature not supported'],
  ['54000', 'program limit exceeded'],
  ['XX000', 'internal error'],
  ['ZZZZZ', 'SQL evaluation failed'],
] as const

describe('CHECK SQL error diagnostics', () => {
  it('preserves condition descriptions and unknown-state fallback in Rust and both targets', async () => {
    const values = await readFile('crates/check-evaluator/src/values.rs', 'utf8')
    const start = values.indexOf('#[derive(Clone, Copy, PartialEq, Eq)]\npub struct SqlError {')
    const end = values.indexOf('#[derive(Clone, Copy, PartialEq, Eq)]\npub enum BoolValue {')
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    const source = values.slice(start, end)
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const runtime = context['exports'] as {
      makeSqlError: (state: number) => unknown
      sqlErrorMessage: (error: unknown) => { message: string }
    }
    for (const [state, message] of conditions)
      expect(
        runtime.sqlErrorMessage(runtime.makeSqlError(parseInt(state, 36))).message,
        state,
      ).toBe(message)
    const root = await mkdtemp(join(tmpdir(), 'pgsid-check-diagnostics-'))
    try {
      await writeFile(join(root, 'runtime.go'), generated.go)
      await writeFile(join(root, 'go.mod'), 'module diagnostics\n\ngo 1.25\n')
      await writeFile(
        join(root, 'diagnostics_test.go'),
        `package generated
import "testing"
func TestConditions(t *testing.T) {
${conditions.map(([state, message]) => `if value := SqlErrorMessage(MakeSqlError(${parseInt(state, 36)})); value.Message != ${JSON.stringify(message)} { t.Fatalf("${state}: %s", value.Message) }`).join('\n')}
}
`,
      )
      await writeFile(
        join(root, 'diagnostics.rs'),
        source +
          `\n#[test] fn conditions() {\n${conditions.map(([state, message]) => `assert_eq!(sql_error_message(make_sql_error(${parseInt(state, 36)})).message, ${JSON.stringify(message)});`).join('\n')}\n}\n`,
      )
      const run = promisify(execFile)
      await run('go', ['test', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', ['--test', join(root, 'diagnostics.rs'), '-o', join(root, 'diagnostics')])
      await run(join(root, 'diagnostics'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 120000)
})
