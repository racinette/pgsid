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
  it('constructs Unicode characters for chr CHECKs with a scalar fallback', async () => {
    const source = `pub fn character(value: i32, fallback: char) -> char {
      char::from_u32(value as u32).unwrap_or(fallback)
    }
    pub fn character_text(value: i32) -> String {
      let mut output = String::new();
      output.push(character(value, 'X'));
      output
    }`
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context['exports'] as {
      character(value: number, fallback: string): string
      characterText(value: number): string
    }
    for (let value = -1; value <= 0x110000; value++) {
      const expected =
        value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)
          ? 'X'
          : String.fromCodePoint(value)
      if (
        functions.character(value, 'X') !== expected ||
        functions.characterText(value) !== expected
      )
        throw new Error(`Unicode construction disagrees at ${value}`)
    }
    for (const value of [-2147483648, 2147483647])
      expect(functions.character(value, '😀')).toBe('😀')
    for (const fallback of ['', 'ab', '\ud800', '\udfff'])
      expect(() => functions.character(65, fallback)).toThrow()
    const root = await mkdtemp(join(tmpdir(), 'pgsid-character-construction-'))
    try {
      await writeFile(join(root, 'runtime.go'), generated.go)
      await writeFile(join(root, 'go.mod'), 'module characterconstruction\n\ngo 1.25\n')
      await writeFile(
        join(root, 'construction_test.go'),
        `package generated
import "testing"
func TestUnicodeConstruction(t *testing.T) {
  for value := -1; value <= 0x110000; value++ {
    expected := rune(value)
    if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) { expected = 'X' }
    if actual := Character(value, 'X'); actual != expected || CharacterText(value) != string(expected) {
      t.Fatalf("%d: got %d, expected %d", value, actual, expected)
    }
  }
  for _, value := range []int{-2147483648, 2147483647} {
    if Character(value, '😀') != '😀' { t.Fatal(value) }
  }
}
func TestInvalidFallback(t *testing.T) {
  for _, fallback := range []rune{-1, 0xd800, 0xdfff, 0x110000} {
    t.Run("invalid", func(t *testing.T) {
      defer func() { if recover() == nil { t.Fatal("accepted invalid fallback") } }()
      Character(65, fallback)
    })
  }
}
`,
      )
      await writeFile(
        join(root, 'construction.rs'),
        source +
          `
#[test] fn unicode_construction() {
  for value in -1..=0x110000 {
    let expected = char::from_u32(value as u32).unwrap_or('X');
    assert_eq!(character(value, 'X'), expected);
    assert_eq!(character_text(value), expected.to_string());
  }
  assert_eq!(character(i32::MIN, '😀'), '😀');
  assert_eq!(character(i32::MAX, '😀'), '😀');
}
`,
      )
      const run = promisify(execFile)
      await run('go', ['test', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
      await run('rustc', [
        '--test',
        join(root, 'construction.rs'),
        '-o',
        join(root, 'construction'),
      ])
      await run(join(root, 'construction'))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 120000)

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
