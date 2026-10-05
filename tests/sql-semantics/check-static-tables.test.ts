import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const source = `const WIDE_VALUES: &[i64] = &[-9223372036854775808i64, 9007199254740993i64, 9223372036854775807i64];
const OFFSETS: &[i32] = &[-3600, 0, 3600];
const NAMES: &[&str] = &["UTC", "Europe/Moscow", "😀"];
const EMPTY: &[usize] = &[];
const COMPACT_IDS: &[u16] = &[0, 32768, 65535];
const LOOKUP_IDS: &[u16] = &[2, 0, 1];
pub fn wide(index: usize) -> i64 { WIDE_VALUES[index] }
pub fn offset(index: usize) -> i32 { let value = OFFSETS[index]; value + 1 }
pub fn word(index: usize) -> bool { NAMES[index] == "😀" }
pub fn size() -> usize { WIDE_VALUES.len() + EMPTY.len() }
pub fn dictionary_index(index: usize) -> usize { let id = COMPACT_IDS[index]; id as usize }
pub fn lookup(index: usize) -> i64 { let id = LOOKUP_IDS[index] as usize; WIDE_VALUES[id] }
`

describe('CHECK static lookup tables', () => {
  it('preserves scalar types, exact integers, and index bounds in Rust, Go, and TypeScript', async () => {
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context.exports as {
      wide(index: number): bigint
      offset(index: number): number
      word(index: number): boolean
      size(): number
      dictionaryIndex(index: number): number
      lookup(index: number): bigint
    }
    expect([0, 1, 2].map((index) => functions.wide(index))).toEqual([
      -9223372036854775808n,
      9007199254740993n,
      9223372036854775807n,
    ])
    expect([0, 1, 2].map((index) => functions.offset(index))).toEqual([-3599, 1, 3601])
    expect([0, 1, 2].map((index) => functions.word(index))).toEqual([false, false, true])
    expect(functions.size()).toBe(3)
    expect([0, 1, 2].map((index) => functions.dictionaryIndex(index))).toEqual([0, 32768, 65535])
    expect([0, 1, 2].map((index) => functions.lookup(index))).toEqual([
      9223372036854775807n,
      -9223372036854775808n,
      9007199254740993n,
    ])
    expect(runInContext('compactIds.BYTES_PER_ELEMENT', context)).toBe(2)
    for (const read of [
      functions.wide,
      functions.offset,
      functions.word,
      functions.dictionaryIndex,
      functions.lookup,
    ]) {
      expect(() => read(3)).toThrow()
      expect(() => read(-1)).toThrow()
    }
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-static-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module statictables\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import ("testing"; "unsafe")
func TestTables(t *testing.T) {
  if Wide(0) != -9223372036854775808 || Wide(1) != 9007199254740993 || Wide(2) != 9223372036854775807 { t.Fatal("integer precision") }
  if Offset(0) != -3599 || Offset(1) != 1 || Offset(2) != 3601 { t.Fatal("signed offsets") }
  if Word(0) || Word(1) || !Word(2) || Size() != 3 { t.Fatal("names and lengths") }
  if DictionaryIndex(0) != 0 || DictionaryIndex(1) != 32768 || DictionaryIndex(2) != 65535 { t.Fatal("unsigned index widening") }
  if Lookup(0) != 9223372036854775807 || Lookup(1) != -9223372036854775808 || Lookup(2) != 9007199254740993 { t.Fatal("dictionary lookup") }
  if unsafe.Sizeof(compactIds[0]) != 2 { t.Fatal("index storage width") }
  for _, index := range []int{-1,3} {
    func(){ defer func(){if recover() == nil {t.Fatal("expected bounds error")}}(); Wide(index) }()
  }
}`,
      )
      await writeFile(
        join(directory, 'tables.rs'),
        source +
          `
#[test] fn values() {
  assert_eq!(wide(0),i64::MIN); assert_eq!(wide(1),9007199254740993); assert_eq!(wide(2),i64::MAX);
  assert_eq!(offset(0),-3599); assert_eq!(offset(2),3601);
  assert!(!word(0)); assert!(word(2)); assert_eq!(size(),3);
  assert_eq!(dictionary_index(0),0); assert_eq!(dictionary_index(1),32768); assert_eq!(dictionary_index(2),65535);
  assert_eq!(lookup(0),i64::MAX); assert_eq!(lookup(1),i64::MIN); assert_eq!(lookup(2),9007199254740993);
  assert_eq!(std::mem::size_of_val(&COMPACT_IDS[0]),2);
}
#[test] #[should_panic] fn bounds() {wide(3);}
`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        '--test',
        join(directory, 'tables.rs'),
        '-o',
        join(directory, 'test'),
      ])
      await run(join(directory, 'test'))
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 60_000)
})
