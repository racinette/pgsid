import { expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
const source = String.raw`
#[derive(Clone)]
struct Cursor { characters: Vec<char>, position: usize }
pub(crate) fn cursor_read(input: &Cursor) -> char { input.characters[input.position] }
pub(crate) fn cursor_next(input: Cursor) -> Cursor {
 let mut characters=input.characters;
 characters[input.position]='b';
 Cursor { characters: characters, position: input.position+1 }
}
pub fn evaluate_check_crate_transfers(input:&str)->i32 {
 let initial=Cursor {characters:input.chars().collect(),position:0};
 let original=initial.clone();let mut cursor=initial;let mut count:i32=0;
 while cursor.position<cursor.characters.len() {
  if cursor_read(&cursor)=='a' {count=count+1;};cursor=cursor_next(cursor);
 }
 if original.characters[0]!='a' || cursor.characters[0]!='b' {return -1;};count
}
`
it('moves crate-visible cursors and borrows their buffers without per-step copies while preserving explicit clones', async () => {
  const generated = transpileCheckRust(source),
    sandbox = createContext({ exports: {} })
  runInContext(
    ts.transpileModule(generated.typescript, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    sandbox,
  )
  expect(
    runInContext('exports.evaluateCheckCrateTransfers("a".repeat(50000))', sandbox, {
      timeout: 10000,
    }),
  ).toBe(50000)
  expect(runInContext('exports.evaluateCheckCrateTransfers("a雪a")', sandbox)).toBe(2)
  expect(generated.typescript).toContain('export function cursorNext')
  expect(generated.go).toContain('func CursorNext')
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-crate-transfers-')),
    run = promisify(execFile)
  try {
    await writeFile(join(directory, 'runtime.go'), generated.go)
    await writeFile(join(directory, 'go.mod'), 'module cratetransfers\n\ngo 1.25\n')
    await writeFile(
      join(directory, 'runtime_test.go'),
      `package generated
import("strings";"testing")
func TestTransfers(t *testing.T){if EvaluateCheckCrateTransfers(strings.Repeat("a",50000))!=50000 {t.Fatal("long transfer")};if EvaluateCheckCrateTransfers("a雪a")!=2 {t.Fatal("unicode")}}
`,
    )
    await writeFile(
      join(directory, 'source.rs'),
      source +
        `\n#[test] fn transfers(){assert_eq!(evaluate_check_crate_transfers(&"a".repeat(50000)),50000);assert_eq!(evaluate_check_crate_transfers("a雪a"),2);}`,
    )
    await run('rustc', ['--test', join(directory, 'source.rs'), '-o', join(directory, 'probe')])
    await run(join(directory, 'probe'), [], { timeout: 10000 })
    await run('go', ['test', './...'], { cwd: directory, timeout: 20000 })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 40000)
