import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

describe('CHECK signed Unicode code point primitive', () => {
  it('preserves Unicode scalars in Rust and both targets, rejecting invalid target characters', async () => {
    const source = 'pub fn codepoint(value: char) -> i32 { value as i32 }'
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const codepoint = (context['exports'] as { codepoint: (value: string) => number }).codepoint
    const values = [
      0, 1, 9, 39, 65, 92, 127, 128, 233, 2047, 2048, 55295, 57344, 65535, 65536, 128512, 1114111,
    ]
    for (const value of values) expect(codepoint(String.fromCodePoint(value))).toBe(value)
    for (const value of ['', 'ab', '\ud800', '\udfff']) expect(() => codepoint(value)).toThrow()
    const root = await mkdtemp(join(tmpdir(), 'pgsid-codepoints-'))
    try {
      await writeFile(join(root, 'runtime.go'), generated.go)
      await writeFile(join(root, 'go.mod'), 'module codepoints\n\ngo 1.25\n')
      await writeFile(
        join(root, 'codepoints_test.go'),
        `package generated
import "testing"
func TestCodepoints(t *testing.T) {
  for _, value := range []rune{${values.join(',')}} {
    if actual := Codepoint(value); actual != int(value) { t.Fatalf("%d: got %d", value, actual) }
  }
}
func TestInvalidCodepoints(t *testing.T) {
  for _, value := range []rune{-1, 0xd800, 0xdfff, 0x110000} {
    t.Run("invalid", func(t *testing.T) {
      defer func() { if recover() == nil { t.Fatal("accepted invalid scalar") } }()
      Codepoint(value)
    })
  }
}
`,
      )
      await writeFile(
        join(root, 'codepoints.rs'),
        source +
          `
#[test] fn unicode_scalars() {
  ${values.map((value) => `assert_eq!(codepoint('\\u{${value.toString(16)}}'), ${value});`).join('\n')}
}
`,
      )
      const run = promisify(execFile)
      await run('go', ['test', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', ['--test', join(root, 'codepoints.rs'), '-o', join(root, 'codepoints')])
      await run(join(root, 'codepoints'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 120000)
})
