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
#[derive(Clone, Copy)]
struct EntityIndex { start: usize, end: usize }
#[derive(Clone)]
struct EntityArena { characters: Vec<char>, entries: Vec<EntityIndex> }
fn append_entity(input: EntityArena, character: char) -> EntityArena {
    let mut characters = input.characters;
    let mut entries = input.entries;
    let start = characters.len();
    characters.push(character);
    entries[0] = EntityIndex { start: start, end: characters.len() };
    entries.push(EntityIndex { start: 0, end: start });
    EntityArena { characters: characters, entries: entries }
}
pub fn evaluate_check_entity_arena(input: &str) -> bool {
    let mut entries: Vec<EntityIndex> = Vec::new();
    entries.push(EntityIndex { start: 0, end: 0 });
    let original = EntityArena { characters: input.chars().collect(), entries: entries };
    let mut current = original.clone();
    let saved = current.clone();
    current = append_entity(current, '😊');
    if original.characters.len() + 1 != current.characters.len()
        || saved.characters.len() != original.characters.len()
        || original.entries.len() != 1 || saved.entries.len() != 1
        || current.entries.len() != 2 || saved.entries[0].end != 0
        || original.entries[0].end != 0 { return false; }
    let previous = current.clone();
    current = append_entity(current, 'é');
    current.characters.len() == previous.characters.len() + 1
        && previous.entries.len() == 2 && current.entries.len() == 3
        && current.characters[current.characters.len() - 1] == 'é'
        && previous.characters[previous.characters.len() - 1] == '😊'
        && previous.entries[0].start == original.characters.len()
        && previous.entries[0].end == original.characters.len() + 1
        && current.entries[0].start == original.characters.len() + 1
}
`

describe('CHECK private owned state', () => {
  it('keeps XML entity arena snapshots independent across clones and whole record replacement', async () => {
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const evaluate = (
      context.exports as {
        evaluateCheckEntityArena(input: string): boolean
      }
    ).evaluateCheckEntityArena
    for (const input of ['', 'abc', 'a😊é']) expect(evaluate(input), input).toBe(true)
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-state-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module ownedstate\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestArena(t *testing.T) {
 for _, input := range []string{"", "abc", "a😊é"} {
  if !EvaluateCheckEntityArena(input) { t.Fatalf("arena snapshot: %q", input) }
 }
}`,
      )
      await writeFile(
        join(directory, 'arena.rs'),
        source +
          `
#[test] fn arena() {
 for input in ["", "abc", "a😊é"] { assert!(evaluate_check_entity_arena(input)); }
}`,
      )
      await run('rustc', ['--test', join(directory, 'arena.rs'), '-o', join(directory, 'arena')])
      await run(join(directory, 'arena'), [])
      await run('go', ['test', './...'], { cwd: directory })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('rejects vector cloning, owned vector elements, public aggregates and field mutation', () => {
    for (const rejected of [
      'pub fn f(x: Vec<char>) -> Vec<char> { x.clone() }',
      '#[derive(Clone)] pub struct Arena { pub characters: Vec<char> }',
      '#[derive(Clone)] pub struct Arena { characters: Vec<char> }',
      '#[derive(Clone)] struct Entry { value: String } #[derive(Clone)] struct Arena { entries: Vec<Entry> } pub fn f() -> Arena { let entries: Vec<Entry> = Vec::new(); Arena { entries: entries } }',
      "#[derive(Clone)] struct Arena { characters: Vec<char> } pub fn f(mut input: Arena) -> Arena { input.characters.push('a'); input }",
      '#[derive(Clone)] struct Arena { characters: Vec<char> } pub fn evaluate_check(input: Arena) -> bool { true }',
    ])
      expect(() => transpileCheckRust(rejected), rejected).toThrow()
  })
})
