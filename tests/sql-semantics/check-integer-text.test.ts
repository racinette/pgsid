import { describe, expect, it } from 'vitest'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const values = new Set([0n, -1n, 1n, -9223372036854775808n, 9223372036854775807n])
for (let power = 10n; power <= 1000000000000000000n; power *= 10n)
  for (const offset of [-1n, 0n, 1n]) {
    values.add(power + offset)
    values.add(0n - power + offset)
  }
let state = 7919n
for (let index = 0; index < 1000; index++) {
  state = BigInt.asUintN(64, state * 6364136223846793005n + 1442695040888963407n)
  values.add(BigInt.asIntN(64, state))
}

describe('CHECK signed integer text construction', () => {
  it('builds exact decimal text for numeric and calendar results in Rust, Go and TypeScript', async () => {
    const builder = await readFile('crates/check-evaluator/src/text_builder.rs', 'utf8')
    const source = builder.slice(builder.indexOf('pub fn text_signed_number('))
    expect(source).toMatch(/^pub fn text_signed_number/u)
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const format = (context.exports as { textSignedNumber(value: bigint): string }).textSignedNumber
    for (const value of values) expect(format(value)).toBe(value.toString())
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-signed-integer-text-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module integertext\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import ("testing"; "strconv")
func TestDecimalText(t *testing.T) {
  for _, value := range []int64{${[...values].join(',')}} {
    if actual := TextSignedNumber(value); actual != strconv.FormatInt(value,10) {
      t.Fatalf("%d: %s",value,actual)
    }
  }
}`,
      )
      await writeFile(
        join(directory, 'text.rs'),
        source +
          `
#[test] fn decimal_text() {
  for value in [${[...values].map((value) => value.toString() + 'i64').join(',')}] {
    assert_eq!(text_signed_number(value), value.to_string());
  }
}`,
      )
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', ['--test', join(directory, 'text.rs'), '-o', join(directory, 'text')])
      await run(join(directory, 'text'), [])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
