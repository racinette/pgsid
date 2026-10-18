import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const source = `
#[derive(Clone)]
pub enum NestedValue { Unknown, Null, Error(i32), Number(i64), Array(NestedPayload) }
#[derive(Clone)]
pub struct NestedPayload { pub lower: i32, pub items: Vec<NestedValue> }
pub fn copy_nested(input: NestedValue) -> NestedValue { input.clone() }
pub fn build_nested(first_count: usize) -> NestedValue {
    let mut first: Vec<NestedValue> = Vec::new();
    let mut i: usize = 0;
    while i < first_count { first.push(NestedValue::Number(1i64)); i += 1; }
    let mut second: Vec<NestedValue> = Vec::new();
    second.push(NestedValue::Number(3i64));
    let mut items: Vec<NestedValue> = Vec::new();
    items.push(NestedValue::Array(NestedPayload { lower: 5, items: first }));
    items.push(NestedValue::Array(NestedPayload { lower: 1, items: second }));
    NestedValue::Array(NestedPayload { lower: -2, items: items })
}
pub fn first_count(input: NestedValue) -> usize {
    if let NestedValue::Array(outer) = input {
        if outer.items.len() > 0 {
            let first = outer.items[0].clone();
            if let NestedValue::Array(inner) = first {
                return inner.items.len();
            }
        }
    }
    0
}
pub fn revise_nested(input: NestedValue) -> NestedValue {
    if let NestedValue::Array(outer) = input {
        if outer.items.len() > 0 {
            let first = outer.items[0].clone();
            if let NestedValue::Array(inner) = first {
                let mut first = inner.items;
                first.push(NestedValue::Number(99i64));
                let replacement = NestedValue::Array(NestedPayload { lower: inner.lower, items: first });
                let mut items = outer.items;
                items[0] = replacement;
                return NestedValue::Array(NestedPayload { lower: outer.lower, items: items });
            }
        }
        return NestedValue::Array(outer);
    }
    input
}
pub fn wrap_nested(input: NestedValue, depth: usize) -> NestedValue {
    let mut value = input;
    let mut i: usize = 0;
    while i < depth {
        let mut items: Vec<NestedValue> = Vec::new();
        items.push(value);
        value = NestedValue::Array(NestedPayload { lower: i as i32, items: items });
        i += 1;
    }
    value
}
pub fn nested_depth(input: NestedValue) -> usize {
    if let NestedValue::Array(value) = input {
        if value.items.len() > 0 {
            let child = value.items[0].clone();
            return 1 + nested_depth(child);
        }
        return 1;
    }
    0
}
pub fn evaluate_check_nested(input: NestedValue, expected: i32) -> i32 {
    if let NestedValue::Unknown = input { return 0; }
    if let NestedValue::Null = input { return 1; }
    if let NestedValue::Error(error) = input { return error; }
    if let NestedValue::Array(outer) = input {
        if outer.items.len() as i32 != expected { return 2; }
        if outer.items.len() == 0 { return 1; }
        let first = outer.items[0].clone();
        if let NestedValue::Null = first { return 1; }
        if let NestedValue::Error(error) = first { return error; }
        if let NestedValue::Array(inner) = first {
            if inner.items.len() == 2 { return 3; }
            return 2;
        }
    }
    0
}
`

type Value =
  | { kind: 'Unknown' | 'Null' }
  | { kind: 'Error'; value: number }
  | { kind: 'Number'; value: bigint }
  | { kind: 'Array'; value: { lower: number; items: Value[] } }

const functions = () => {
  const generated = transpileCheckRust(source)
  const context = createContext({ exports: {} })
  runInContext(
    ts.transpileModule(generated.typescript, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  return {
    generated,
    evaluate: context.exports as {
      copyNested(input: Value): Value
      buildNested(firstCount: number): Value
      firstCount(input: Value): number
      reviseNested(input: Value): Value
      wrapNested(input: Value, depth: number): Value
      nestedDepth(input: Value): number
      evaluateCheckNested(input: Value, expected: number): number
    },
  }
}

describe('CHECK recursive owned values', () => {
  it('copies recursive vector values at public boundaries, extraction, replacement and explicit clones', async () => {
    const { generated, evaluate } = functions()
    expect(generated.typescript).toContain('readonly items: NestedValue[]')
    expect(generated.typescript).toContain('readonly lower: number')
    for (const count of [0, 1, 2, 5]) {
      const input = evaluate.buildNested(count)
      const saved = evaluate.copyNested(input)
      const changed = evaluate.reviseNested(input)
      expect(saved).toEqual(input)
      expect(evaluate.firstCount(input)).toBe(count)
      expect(evaluate.firstCount(changed)).toBe(count + 1)
      if (input.kind !== 'Array' || saved.kind !== 'Array' || changed.kind !== 'Array')
        throw new Error('Missing recursive array')
      expect(changed.value.lower).toBe(-2)
      const originalFirst = input.value.items[0]!
      const savedFirst = saved.value.items[0]!
      if (originalFirst.kind !== 'Array' || savedFirst.kind !== 'Array')
        throw new Error('Missing inner array')
      originalFirst.value.items.push({ kind: 'Number', value: 1000n })
      expect(savedFirst.value.items).toHaveLength(count)
      expect(evaluate.firstCount(changed)).toBe(count + 1)
    }
    for (const depth of [0, 1, 8, 48]) {
      const input = evaluate.wrapNested(evaluate.buildNested(2), depth)
      expect(evaluate.nestedDepth(evaluate.copyNested(input))).toBe(depth + 2)
    }
    for (const value of [
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Error', value: 23514 },
      { kind: 'Number', value: 9007199254740993n },
    ] as Value[])
      expect(evaluate.copyNested(value)).toEqual(value)

    const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-recursive-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module recursivevalues\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import ("testing"; "reflect")
func TestRecursiveOwnership(t *testing.T) {
 for _, count := range []int{0,1,2,5} {
  input := BuildNested(count)
  saved := CopyNested(input)
  changed := ReviseNested(input)
  if !reflect.DeepEqual(input,saved) || FirstCount(input)!=count || FirstCount(changed)!=count+1 { t.Fatal("recursive snapshots") }
  if changed.Array.Lower != -2 || changed.Array.Items[0].Array.Lower != 5 { t.Fatal("nested bounds") }
  input.Array.Items[0].Array.Items = append(input.Array.Items[0].Array.Items,NestedValue{Kind:NestedValueNumber,Number:1000})
  if FirstCount(saved)!=count || FirstCount(changed)!=count+1 { t.Fatal("caller mutation leaked") }
 }
 for _, depth := range []int{0,1,8,48} {
  if NestedDepth(CopyNested(WrapNested(BuildNested(2),depth))) != depth+2 { t.Fatal("nested clone depth") }
 }
}`,
      )
      await writeFile(
        join(directory, 'recursive.rs'),
        source +
          `
#[test] fn recursive_ownership() {
 for count in [0usize,1,2,5] {
  let input=build_nested(count); let saved=copy_nested(input.clone()); let changed=revise_nested(input.clone());
  assert_eq!(first_count(input),count); assert_eq!(first_count(saved),count); assert_eq!(first_count(changed),count+1);
 }
 for depth in [0usize,1,8,48] { assert_eq!(nested_depth(copy_nested(wrap_nested(build_nested(2),depth))),depth+2); }
}`,
      )
      await run('rustc', [
        '--test',
        join(directory, 'recursive.rs'),
        '-o',
        join(directory, 'recursive'),
      ])
      await run(join(directory, 'recursive'), [])
      await run('go', ['test', './...'], { cwd: directory })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('models distinct inner arrays required by a concrete domain-array CHECK', async () => {
    const { generated, evaluate } = functions()
    const pg = await PGlite.create()
    const cases: { count: number; expected: number; outcome: number }[] = []
    try {
      await pg.exec(`CREATE DOMAIN slot_group AS int[] CHECK (cardinality(VALUE)>0);
CREATE TABLE nested_plans(groups slot_group[], expected int,
 CHECK(cardinality(groups)=expected AND cardinality(groups[1])=2));`)
      for (const count of [1, 2, 3])
        for (const expected of [1, 2, 3]) {
          const input = `ARRAY[ARRAY[${Array(count).fill(1).join(',')}]::slot_group,ARRAY[3]::slot_group]`
          const result = (
            await pg.query<{ result: boolean | null }>(
              `SELECT cardinality(groups)=${expected} AND cardinality(groups[1])=2 AS result FROM (SELECT ${input} AS groups) candidate`,
            )
          ).rows[0]!.result
          const outcome = result === null ? 1 : result ? 3 : 2
          cases.push({ count, expected, outcome })
          expect(evaluate.evaluateCheckNested(evaluate.buildNested(count), expected)).toBe(outcome)
          if (result === false)
            await expect(
              pg.exec(`INSERT INTO nested_plans VALUES(${input},${expected})`),
            ).rejects.toMatchObject({ code: '23514' })
          else await pg.exec(`INSERT INTO nested_plans VALUES(${input},${expected})`)
        }
      await pg.exec('INSERT INTO nested_plans VALUES(NULL,2)')
      expect(evaluate.evaluateCheckNested({ kind: 'Null' }, 2)).toBe(1)
      expect(evaluate.evaluateCheckNested({ kind: 'Unknown' }, 2)).toBe(0)
      expect(evaluate.evaluateCheckNested({ kind: 'Error', value: 23514 }, 2)).toBe(23514)
    } finally {
      await pg.close()
    }
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-recursive-check-'))
    const run = promisify(execFile)
    try {
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module recursivecheck\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestPostgresChecks(t *testing.T) {
 ${cases.map(({ count, expected, outcome }) => `if EvaluateCheckNested(BuildNested(${count}),${expected}) != ${outcome} { t.Fatal("PostgreSQL CHECK",${count},${expected}) }`).join('\n')}
 if EvaluateCheckNested(NestedValue{Kind:NestedValueNull},2)!=1 { t.Fatal("NULL") }
 if EvaluateCheckNested(NestedValue{Kind:NestedValueUnknown},2)!=0 { t.Fatal("Unknown") }
 if EvaluateCheckNested(NestedValue{Kind:NestedValueError,Error:23514},2)!=23514 { t.Fatal("error") }
}`,
      )
      await writeFile(
        join(directory, 'checks.rs'),
        source +
          `
#[test] fn postgres_checks() {
 ${cases.map(({ count, expected, outcome }) => `assert_eq!(evaluate_check_nested(build_nested(${count}),${expected}),${outcome});`).join('\n')}
 assert_eq!(evaluate_check_nested(NestedValue::Null,2),1);
 assert_eq!(evaluate_check_nested(NestedValue::Unknown,2),0);
 assert_eq!(evaluate_check_nested(NestedValue::Error(23514),2),23514);
}`,
      )
      await run('rustc', ['--test', join(directory, 'checks.rs'), '-o', join(directory, 'checks')])
      await run(join(directory, 'checks'), [])
      await run('go', ['test', './...'], { cwd: directory })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
