import { describe, expect, it } from 'vitest'
import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import {
  transpileCheckRust,
  transpileCheckRustFiles,
  checkTypescriptArtifacts,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'

const source = `
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Span { pub start: usize, pub end: usize }
#[derive(Clone)]
pub struct Document { pub characters: Vec<char>, pub spans: Vec<Span> }
#[derive(Clone)]
pub enum Argument { Unknown, Null, Error(i32), Text(String), Number(i64), Boolean(bool), Tree(Document) }
#[derive(Clone)]
pub struct Arguments { pub items: Vec<Argument> }
#[derive(Clone)]
pub enum Batch { Value(Arguments) }
fn append_batch(input: Batch, value: Argument) -> Batch {
    if let Batch::Value(batch) = input {
        let mut items = batch.items;
        items.push(value);
        return Batch::Value(Arguments { items: items });
    }
    input
}
fn replace(input: Batch, index: usize, value: Argument) -> Batch {
    if let Batch::Value(batch) = input {
        let mut items = batch.items;
        items[index] = value;
        return Batch::Value(Arguments { items: items });
    }
    input
}
fn item(input: Batch, index: usize) -> Argument {
    if let Batch::Value(batch) = input { return batch.items[index].clone(); }
    Argument::Unknown
}
pub fn count(input: Batch) -> usize {
    if let Batch::Value(batch) = input { return batch.items.len(); }
    0
}
fn revise(input: Argument) -> Argument {
    if let Argument::Tree(tree) = input {
        let mut characters = tree.characters;
        let mut spans = tree.spans;
        characters.push('😊');
        spans[0] = Span { start: 1, end: characters.len() };
        return Argument::Tree(Document { characters: characters, spans: spans });
    }
    Argument::Text("replaced".to_owned())
}
fn same(left: Argument, right: Argument) -> bool {
    if let Argument::Unknown = left { if let Argument::Unknown = right { return true; } }
    if let Argument::Null = left { if let Argument::Null = right { return true; } }
    if let Argument::Error(a) = left { if let Argument::Error(b) = right { return a == b; } }
    if let Argument::Boolean(a) = left { if let Argument::Boolean(b) = right { return a == b; } }
    if let Argument::Number(a) = left { if let Argument::Number(b) = right { return a == b; } }
    if let Argument::Text(a) = left { if let Argument::Text(b) = right { return a == b; } return false; }
    if let Argument::Tree(a) = left {
        if let Argument::Tree(b) = right {
            if a.characters.len() != b.characters.len() || a.spans.len() != b.spans.len() { return false; }
            let mut i: usize = 0;
            while i < a.characters.len() {
                if a.characters[i] != b.characters[i] { return false; }
                i += 1;
            }
            i = 0;
            while i < a.spans.len() {
                if a.spans[i] != b.spans[i] { return false; }
                i += 1;
            }
            return true;
        }
    }
    false
}
pub fn build_batch(input: Argument) -> Batch {
    let mut items: Vec<Argument> = Vec::new();
    items.push(input);
    items.push(Argument::Number(9007199254740993i64));
    items.push(Argument::Null);
    items.push(Argument::Text("tail".to_owned()));
    Batch::Value(Arguments { items: items })
}
pub fn evaluate_check_batch_copy(input: Batch) -> Batch { input.clone() }
pub fn evaluate_check_batch(input: Argument, minimum: usize) -> bool {
    let original = build_batch(input.clone());
    let saved = original.clone();
    let mut current = original.clone();
    current = append_batch(current, Argument::Boolean(true));
    let before = item(current.clone(), 0);
    let changed = revise(before.clone());
    current = replace(current, 0, changed.clone());
    count(original.clone()) == 4 && count(saved.clone()) == 4 && count(current.clone()) == 5
        && count(saved.clone()) >= minimum
        && same(item(original.clone(), 0), input.clone())
        && same(item(saved.clone(), 0), input.clone())
        && same(item(current.clone(), 0), changed)
        && same(item(saved.clone(), 1), Argument::Number(9007199254740993i64))
        && same(item(saved.clone(), 2), Argument::Null)
        && same(item(saved.clone(), 3), Argument::Text("tail".to_owned()))
        && same(item(current.clone(), 4), Argument::Boolean(true))
}
#[derive(Clone)]
pub enum Flag { Null, Value(bool) }
pub fn evaluate_check_local_values(input: Flag) -> bool {
    let mut flags: Vec<Flag> = Vec::new();
    flags.push(input.clone());
    flags.push(Flag::Null);
    let first = flags[0].clone();
    flags[0] = Flag::Value(false);
    if let Flag::Value(value) = first { return value; }
    false
}
`

type Argument =
  | { kind: 'Unknown' | 'Null' }
  | { kind: 'Error'; value: number }
  | { kind: 'Text'; value: string }
  | { kind: 'Number'; value: bigint }
  | { kind: 'Boolean'; value: boolean }
  | { kind: 'Tree'; value: { characters: string[]; spans: { start: number; end: number }[] } }

describe('CHECK owned value batches', () => {
  it('copies heterogeneous value enums and their nested arenas at ownership transfers', async () => {
    const generated = transpileCheckRust(source)
    expect(generated.typescript).toContain('readonly items: Argument[]')
    expect(generated.typescript).toContain('function copyFlag(')
    expect(generated.go).toContain('func copyFlag(')
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context.exports as {
      evaluateCheckBatch(input: Argument, minimum: number): boolean
      evaluateCheckLocalValues(input: { kind: 'Value'; value: boolean }): boolean
    }
    const values: Argument[] = [
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Error', value: 22023 },
      { kind: 'Text', value: '雪😊' },
      { kind: 'Number', value: 9007199254740993n },
      { kind: 'Boolean', value: true },
      { kind: 'Tree', value: { characters: ['a', '雪'], spans: [{ start: 0, end: 2 }] } },
    ]
    const before = structuredClone(values)
    for (const value of values) {
      expect(functions.evaluateCheckBatch(value, 4), value.kind).toBe(true)
      expect(functions.evaluateCheckBatch(value, 5), value.kind).toBe(false)
    }
    expect(values).toEqual(before)
    expect(functions.evaluateCheckLocalValues({ kind: 'Value', value: true })).toBe(true)
    expect(functions.evaluateCheckLocalValues({ kind: 'Value', value: false })).toBe(false)

    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-value-batches-'))
    const run = promisify(execFile)
    try {
      const oracle: unknown[] = []
      for (const value of [null, '雪😊', '[1,{"a":null}]']) {
        for (const minimum of [4, 5]) {
          const result = await pg.query<{ accepted: boolean }>(
            `SELECT jsonb_array_length(jsonb_build_array($1::text,9007199254740993::bigint,NULL::text,'tail')) >= $2::integer accepted`,
            [value, minimum],
          )
          const accepted = result.rows[0]!.accepted
          expect(
            functions.evaluateCheckBatch(
              value === null ? { kind: 'Null' } : { kind: 'Text', value },
              minimum,
            ),
          ).toBe(accepted)
          oracle.push({ value, minimum, accepted })
        }
      }
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'runtime.ts'), generated.typescript)
      await writeFile(join(directory, 'go.mod'), 'module valuebatches\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestBatches(t *testing.T) {
 values := []Argument{
  {Kind: ArgumentUnknown}, {Kind: ArgumentNull}, {Kind: ArgumentError, Error: 22023},
  {Kind: ArgumentText, Text: "雪😊"}, {Kind: ArgumentNumber, Number: 9007199254740993},
  {Kind: ArgumentBoolean, Boolean: true},
  {Kind: ArgumentTree, Tree: Document{Characters: []rune{'a','雪'}, Spans: []Span{{Start:0,End:2}}}},
 }
 for _, value := range values {
  if !EvaluateCheckBatch(value,4) || EvaluateCheckBatch(value,5) { t.Fatalf("batch: %#v",value) }
 }
 if values[6].Tree.Characters[0] != 'a' || len(values[6].Tree.Characters) != 2 || values[6].Tree.Spans[0].Start != 0 { t.Fatal("nested input mutated") }
 if !EvaluateCheckLocalValues(Flag{Kind:FlagValue,Value:true}) || EvaluateCheckLocalValues(Flag{Kind:FlagValue,Value:false}) { t.Fatal("local enum vector") }
}`,
      )
      await writeFile(
        join(directory, 'batches.rs'),
        source +
          `
#[test] fn batches() {
 let values = [Argument::Unknown,Argument::Null,Argument::Error(22023),Argument::Text("雪😊".to_owned()),Argument::Number(9007199254740993i64),Argument::Boolean(true),Argument::Tree(Document{characters:vec!['a','雪'],spans:vec![Span{start:0,end:2}]})];
 for value in values { assert!(evaluate_check_batch(value.clone(),4)); assert!(!evaluate_check_batch(value,5)); }
 assert!(evaluate_check_local_values(Flag::Value(true)));
 assert!(!evaluate_check_local_values(Flag::Value(false)));
}`,
      )
      await run('rustc', [
        '--test',
        join(directory, 'batches.rs'),
        '-o',
        join(directory, 'batches'),
      ])
      await run(join(directory, 'batches'), [])
      await run('go', ['test', './...'], { cwd: directory })
      await run(process.execPath, [
        'node_modules/typescript/bin/tsc',
        '--noEmit',
        '--target',
        'es2022',
        '--skipLibCheck',
        join(directory, 'runtime.ts'),
      ])
      const splitEvaluator = `pub fn evaluate_check_split(input: Argument) -> bool {
        let original = build_batch(input.clone());
        let passed = pass_batch(original.clone());
        count(passed) == 4 && count(original) == 4 && evaluate_check_batch(input, 4)
      }`
      const graph = {
        schemaVersion: 1 as const,
        modules: [
          { name: 'checkruntime', dependencies: [], files: [{ path: 'values.rs', source }] },
          {
            name: 'pg_catalog',
            dependencies: ['checkruntime'],
            files: [
              {
                path: 'operations.rs',
                source:
                  'pub fn pass_batch(input: Batch) -> Batch { evaluate_check_batch_copy(input) }',
              },
            ],
          },
          {
            name: 'checks',
            dependencies: ['checkruntime', 'pg_catalog'],
            files: [{ path: 'checks.rs', source: splitEvaluator }],
          },
        ],
      }
      const split = transpileCheckRustFiles(graph, 'valuebatches/split/pg_catalog')
      for (const [folder, content] of [
        ['checkruntime', split.go.runtime],
        ['pg_catalog', split.go.operations],
        ['langruntime', split.go.language],
        ['', split.go.checks],
      ] as const) {
        await mkdir(join(directory, 'split', folder), { recursive: true })
        await writeFile(join(directory, 'split', folder, 'runtime.go'), content)
      }
      await writeFile(
        join(directory, 'split', 'runtime_test.go'),
        `package generated
import("testing"; runtime "valuebatches/split/checkruntime")
func TestSplit(t *testing.T) {
 for _, value := range []runtime.Argument{{Kind:runtime.ArgumentNull},{Kind:runtime.ArgumentUnknown},{Kind:runtime.ArgumentText,Text:"雪😊"},{Kind:runtime.ArgumentTree,Tree:runtime.Document{Characters:[]rune{'a','雪'},Spans:[]runtime.Span{{Start:0,End:2}}}}} {
  if !EvaluateCheckSplit(value) {t.Fatal("split batch")}
 }
}`,
      )
      await run('go', ['test', './split/...'], { cwd: directory })
      for (const artifact of checkTypescriptArtifacts(split.typescript)) {
        const file = join(directory, 'typescript', artifact.path)
        await mkdir(join(file, '..'), { recursive: true })
        await writeFile(file, artifact.content)
      }
      await run(process.execPath, [
        'node_modules/typescript/bin/tsc',
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'commonjs',
        '--outDir',
        join(directory, 'javascript'),
        join(directory, 'typescript', 'checks.ts'),
      ])
      await run(process.execPath, [
        '-e',
        `const {evaluateCheckSplit} = require(${JSON.stringify(join(directory, 'javascript', 'checks.js'))}); for (const input of [{kind:'Null'},{kind:'Unknown'},{kind:'Text',value:'雪😊'},{kind:'Tree',value:{characters:['a','雪'],spans:[{start:0,end:2}]}}]) { if (!evaluateCheckSplit(input)) throw new Error('split batch'); }`,
      ])
      writeCheckRustSources(join(directory, 'split.rs'), graph)
      await appendFile(
        join(directory, 'split.rs'),
        "\n#[test] fn split_batch() { assert!(evaluate_check_split(Argument::Tree(Document { characters: vec!['a','雪'], spans: vec![Span { start:0,end:2 }] }))); }\n",
      )
      await run('rustc', [
        '--test',
        join(directory, 'split.rs'),
        '-o',
        join(directory, 'split-native'),
      ])
      await run(join(directory, 'split-native'), [])
      await mkdir('artifacts/owned-value-batches', { recursive: true })
      await writeFile(
        'artifacts/owned-value-batches/oracle.json',
        JSON.stringify(
          {
            expression:
              "jsonb_array_length(jsonb_build_array(input,9007199254740993::bigint,NULL::text,'tail')) >= minimum",
            scope:
              'Heterogeneous argument-batch ownership foundation; SQL builder binding and construction remain pending',
            cases: oracle,
            preservedVariants: values.map((value) => value.kind),
            targets: ['Rust', 'Go', 'TypeScript'],
            moduleForms: ['combined', 'split'],
          },
          null,
          2,
        ) + '\n',
      )
      expect(oracle).toHaveLength(6)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('rejects unsupported elements, direct ownership cycles, borrowed batches and field mutation', () => {
    for (const rejected of [
      '#[derive(Clone)] struct Item { text: String } struct Batch { items: Vec<Item> }',
      'enum Item { Text(String) } struct Batch { items: Vec<Item> }',
      '#[derive(Clone)] enum Item { Text(String) } pub fn f(items: Vec<Item>) -> Vec<Item> { items.clone() }',
      '#[derive(Clone)] enum Item { Text(String) } pub fn f(items: &Vec<Item>) -> usize { items.len() }',
      '#[derive(Clone)] pub enum Item { Text(String) } #[derive(Clone)] pub struct Batch { pub items: Vec<Item> }',
      '#[derive(Clone)] pub enum Item { Text(String) } #[derive(Clone)] pub struct Batch { items: Vec<Item> } #[derive(Clone)] pub enum Value { Batch(Batch) }',
      '#[derive(Clone)] enum Item { Batch(Batch) } #[derive(Clone)] struct Batch { items: Vec<Item>, direct: Item }',
      '#[derive(Clone)] enum Item { Text(String) } struct Batch { items: Vec<Item> } fn f(mut input: Batch) -> Batch { input.items.push(Item::Text("x".to_owned())); input }',
      '#[derive(Clone)] enum Item { Text(String) } fn f() -> usize { let items: Vec<Item> = Vec::new(); items.push(Item::Text("x".to_owned())); items.len() }',
      '#[derive(Clone)] enum Item { Text(String) } fn f() -> usize { let mut items: Vec<Item> = Vec::new(); items.push(1); items.len() }',
    ])
      expect(() => transpileCheckRust(rejected), rejected).toThrow()
  })
})
