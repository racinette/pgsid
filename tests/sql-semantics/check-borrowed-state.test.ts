import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const source = `
#[derive(Clone)]
pub(crate) struct XmlBuffer { characters: Vec<char> }
pub(crate) fn xml_make_buffer(input: &str) -> XmlBuffer {
    XmlBuffer { characters: input.chars().collect() }
}
pub(crate) fn xml_read_character(input: &XmlBuffer, position: usize) -> char {
    input.characters[position]
}
pub fn evaluate_check_borrowed_scan(input: &str) -> i32 {
    let buffer = xml_make_buffer(input);
    let mut position: usize = 0;
    let mut count: i32 = 0;
    while position < buffer.characters.len() {
        let character = xml_read_character(&buffer, position);
        if character == 'a' { count = count + 1; }
        position += 1;
    }
    count
}
pub fn evaluate_check_borrow_then_move(input: &str) -> bool {
    let buffer = XmlBuffer { characters: input.chars().collect() };
    let original = xml_read_character(&buffer, 0);
    let mut characters = buffer.characters;
    characters[0] = 'b';
    let replacement = XmlBuffer { characters: characters };
    original == 'a' && xml_read_character(&replacement, 0) == 'b'
}
pub fn evaluate_check_discarded_borrow(input: &str) -> bool {
    let buffer = xml_make_buffer(input);
    let _reason = xml_read_character(&buffer, 1);
    true
}
`

describe('CHECK private borrowed state', () => {
  it('scans an XML name-sized buffer through read-only helpers and transfers ownership afterwards', async () => {
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    expect(
      runInContext('exports.evaluateCheckBorrowedScan("a".repeat(50000))', context, {
        timeout: 10_000,
      }),
    ).toBe(50000)
    expect(runInContext('exports.evaluateCheckBorrowedScan("a😊éa")', context)).toBe(2)
    expect(runInContext('exports.evaluateCheckBorrowThenMove("a😊é")', context)).toBe(true)
    expect(runInContext('exports.evaluateCheckDiscardedBorrow("a😊")', context)).toBe(true)
    expect(() => runInContext('exports.evaluateCheckDiscardedBorrow("a")', context)).toThrow()
    expect(
      runInContext(
        `(() => {
      const buffer = exports.xmlMakeBuffer('a😊é');
      buffer.characters = new Proxy(buffer.characters, {get(target, key) {
        if (key === Symbol.iterator || key === 'slice' || key === 'map') throw new Error('borrow copied storage');
        return Reflect.get(target, key);
      }});
      return exports.xmlReadCharacter(buffer, 1);
    })()`,
        context,
      ),
    ).toBe('😊')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-borrowed-state-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module borrowedstate\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import ("strings"; "testing")
func TestBorrowedBuffer(t *testing.T) {
 if EvaluateCheckBorrowedScan(strings.Repeat("a", 50000)) != 50000 { t.Fatal("large buffer") }
 if EvaluateCheckBorrowedScan("a😊éa") != 2 { t.Fatal("Unicode buffer") }
 if !EvaluateCheckBorrowThenMove("a😊é") { t.Fatal("ownership after borrowing") }
 if !EvaluateCheckDiscardedBorrow("a😊") { t.Fatal("discarded diagnostic") }
 func(){defer func(){if recover()==nil {t.Fatal("discarded borrow was skipped")}}(); EvaluateCheckDiscardedBorrow("a")}()
}`,
      )
      await writeFile(
        join(directory, 'buffer.rs'),
        source +
          `
#[test] fn borrowed_buffer() {
 assert_eq!(evaluate_check_borrowed_scan(&"a".repeat(50000)), 50000);
 assert_eq!(evaluate_check_borrowed_scan("a😊éa"), 2);
 assert!(evaluate_check_borrow_then_move("a😊é"));
 assert!(evaluate_check_discarded_borrow("a😊"));
 assert!(std::panic::catch_unwind(|| evaluate_check_discarded_borrow("a")).is_err());
}`,
      )
      await run('rustc', ['--test', join(directory, 'buffer.rs'), '-o', join(directory, 'buffer')])
      await run(join(directory, 'buffer'), [])
      await run('go', ['test', './...'], { cwd: directory, timeout: 20_000 })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 40_000)
})
