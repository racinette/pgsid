import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const source = `#[derive(Clone, PartialEq, Eq)]
pub enum TextValue { Null, Value(String) }
pub fn evaluate_check_build(input: TextValue) -> TextValue {
    let saved = input.clone();
    if let TextValue::Value(text) = saved {
        let mut output = text;
        output.push('😀');
        output.push_str("é");
        let borrow = output.as_str();
        let chars: Vec<char> = borrow.chars().collect();
        if chars.len() == 3 { return TextValue::Value(output); }
    }
    input
}
pub fn empty() -> String { let mut value = String::new(); value.push('é'); value }
pub fn owned(value: &str) -> String { value.to_owned() }
`

describe('CHECK owned text dialect', () => {
  it('builds Unicode text without copying public immutable wrappers', async () => {
    const generated = transpileCheckRust(source)
    expect(generated.typescript).not.toContain('copyTextValue')
    expect(generated.go).not.toContain('copyTextValue')
    expect(generated.typescript).toContain('readonly value: string')
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context.exports as {
      evaluateCheckBuild(input: { kind: string; value: string }): { value: string }
      empty(): string
      owned(value: string): string
    }
    const input = { kind: 'Value', value: 'a' }
    expect(functions.evaluateCheckBuild(input).value).toBe('a😀é')
    expect(input.value).toBe('a')
    expect(functions.empty()).toBe('é')
    expect(functions.owned('😀')).toBe('😀')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-text-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module ownedtext\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestOwned(t *testing.T) {
 input := TextValue{Kind: TextValueValue, Value: "a"}
 if EvaluateCheckBuild(input).Value != "a😀é" || input.Value != "a" || Empty() != "é" || Owned("😀") != "😀" { t.Fatal("owned text") }
}`,
      )
      await writeFile(
        join(directory, 'text.rs'),
        source +
          `
#[test] fn owned_text() {
 let input = TextValue::Value("a".to_owned());
 assert!(evaluate_check_build(input.clone()) == TextValue::Value("a😀é".to_owned()));
 assert!(input == TextValue::Value("a".to_owned()));
 assert_eq!(empty(), "é"); assert_eq!(owned("😀"), "😀");
}`,
      )
      await run('go', ['test', './...'], { cwd: directory })
      await run('rustc', ['--test', join(directory, 'text.rs'), '-o', join(directory, 'text')])
      await run(join(directory, 'text'), [])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  it('rejects mutable aggregates and unsupported string methods', () => {
    for (const rejected of [
      "pub fn f() -> String { let x = String::new(); x.push('a'); x }",
      'pub fn f() -> String { let mut x = String::new(); x.push(true); x }',
      'pub fn f(x: Vec<char>) -> Vec<char> { x.clone() }',
      '#[derive(Clone, Copy)] pub struct Value { pub text: String }',
      '#[derive(Clone)] pub struct Value { pub text: Vec<char> }',
      'pub fn f(x: String) -> usize { x.len() }',
      'pub fn f(x: char) -> String { x.to_owned() }',
      "#[derive(Clone)] pub struct Value { pub text: String } pub fn f(mut x: Value) -> Value { x.text.push('a'); x }",
    ])
      expect(() => transpileCheckRust(rejected)).toThrow()
  })
})
