import { parseRust } from '../../tools/check-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../tools/check-transpiler/typescript/go-wasm.js'
import { transpile } from '../../tools/check-transpiler/typescript/transpile.js'
import { checkRustAsset } from '../../src/codegen/shared/check-rust-assets.js'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import {
  transpileCheckRust,
  transpileCheckRustFiles,
  checkTypescriptArtifacts,
} from '../../src/codegen/shared/check-rust-transpile.js'
const declarations = `
#[derive(Clone,Copy)] pub struct Vertex { pub x:i64, pub y:i64 }
#[derive(Clone)] pub struct PathPayload { pub closed:bool, pub points:Vec<Vertex> }
#[derive(Clone)] pub enum PathValue { Unknown, Null, Value(PathPayload) }
pub fn make_path(input:PathPayload)->PathValue { PathValue::Value(input) }
pub fn path_npoints(input:PathValue)->usize { if let PathValue::Value(path)=input { return path.points.len(); } 0 }
pub fn path_first_x(input:PathValue)->i64 { if let PathValue::Value(path)=input { return path.points[0].x; } 0i64 }
`
const operations = `
pub fn path_open(input:PathValue)->PathValue {
 if let PathValue::Value(path)=input { return PathValue::Value(PathPayload{closed:false,points:path.points}); } input
}
pub fn extend_path(input:PathValue)->PathValue {
 if let PathValue::Value(path)=input {
  let mut points:Vec<Vertex>=path.points;
  points[0]=Vertex{x:17i64,y:19i64};
  points.push(Vertex{x:23i64,y:29i64});
  return PathValue::Value(PathPayload{closed:false,points:points});
 } input
}
`
const evaluator = `
pub fn evaluate_check_owned(input:PathValue)->bool {
 let saved=input.clone();
 let opened=path_open(input.clone());
 let changed=extend_path(input);
 if let PathValue::Value(original)=saved {
  if let PathValue::Value(open)=opened {
   if let PathValue::Value(replaced)=changed {
    return original.closed && open.closed==false && replaced.closed==false
      && original.points.len()==2 && open.points.len()==2 && replaced.points.len()==3
      && original.points[0].x==1i64 && open.points[0].x==1i64 && replaced.points[0].x==17i64;
   }
  }
 } false
}
`
const source = declarations + operations + evaluator
it('copies exported point-list value payloads at construction, calls, extraction and explicit clones in Rust, Go and TypeScript', async () => {
  const generated = transpileCheckRust(source),
    context = createContext({ exports: {} })
  runInContext(
    ts.transpileModule(generated.typescript, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  const api = context.exports as {
    makePath(input: { closed: boolean; points: { x: bigint; y: bigint }[] }): unknown
    pathFirstX(input: unknown): bigint
    pathNpoints(input: unknown): number
    extendPath(input: unknown): unknown
    evaluateCheckOwned(input: unknown): boolean
  }
  const points = [
      { x: 1n, y: 2n },
      { x: 3n, y: 4n },
    ],
    payload = { closed: true, points },
    value = api.makePath(payload)
  points[0]!.x = 99n
  points.push({ x: 101n, y: 103n })
  payload.closed = false
  expect(api.pathNpoints(value)).toBe(2)
  expect(api.pathFirstX(value)).toBe(1n)
  expect(api.evaluateCheckOwned(value)).toBe(true)
  const changed = api.extendPath(value)
  expect(api.pathFirstX(changed)).toBe(17n)
  expect(api.pathNpoints(changed)).toBe(3)
  expect(api.pathFirstX(value)).toBe(1n)
  expect(api.pathNpoints(value)).toBe(2)
  expect(generated.typescript).toMatch(/readonly points:/u)
  expect(generated.typescript).toMatch(/readonly value:/u)
  const root = await mkdtemp(join(tmpdir(), 'pgsid-owned-value-')),
    run = promisify(execFile)
  try {
    await writeFile(join(root, 'runtime.go'), generated.go)
    await writeFile(join(root, 'go.mod'), 'module ownedvalue\n\ngo 1.25\n')
    await writeFile(
      join(root, 'runtime_test.go'),
      `package generated
import "testing"
func TestOwnedValue(t *testing.T) {
 points:=[]Vertex{{X:1,Y:2},{X:3,Y:4}};payload:=PathPayload{Closed:true,Points:points};value:=MakePath(payload)
 points[0].X=99;points=append(points,Vertex{X:101,Y:103});payload.Closed=false
 if PathNpoints(value)!=2 || PathFirstX(value)!=1 || !EvaluateCheckOwned(value) {t.Fatal("owned payload alias or snapshot loss")}
 changed:=ExtendPath(value)
 if PathNpoints(changed)!=3 || PathFirstX(changed)!=17 || PathNpoints(value)!=2 || PathFirstX(value)!=1 {t.Fatal("owned call changed input")}
}`,
    )
    await writeFile(
      join(root, 'probe.rs'),
      source +
        `\n#[test] fn owned_value(){let mut points:Vec<Vertex>=Vec::new();points.push(Vertex{x:1,y:2});points.push(Vertex{x:3,y:4});let payload=PathPayload{closed:true,points};let value=make_path(payload.clone());assert!(evaluate_check_owned(value.clone()));let changed=extend_path(value.clone());assert_eq!(path_npoints(value),2);assert_eq!(path_npoints(changed),3);}\n`,
    )
    await run('rustc', [
      '--edition=2024',
      '--test',
      join(root, 'probe.rs'),
      '-o',
      join(root, 'probe'),
    ])
    await run(join(root, 'probe'), [])
    await run('go', ['test', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    await writeFile(join(root, 'runtime.ts'), generated.typescript)
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--noEmit',
      join(root, 'runtime.ts'),
    ])
    const group = {
      schemaVersion: 1 as const,
      modules: [
        {
          name: 'checkruntime',
          dependencies: [],
          files: [{ path: 'values.rs', source: declarations }],
        },
        {
          name: 'pg_catalog',
          dependencies: ['checkruntime'],
          files: [{ path: 'operations.rs', source: operations }],
        },
        {
          name: 'checks',
          dependencies: ['checkruntime', 'pg_catalog'],
          files: [{ path: 'checks.rs', source: evaluator }],
        },
      ],
    }
    const split = transpileCheckRustFiles(group, 'ownedvalue/split/pg_catalog')
    const directory = join(root, 'split')
    await mkdir(directory)
    for (const [folder, body] of [
      ['checkruntime', split.go.runtime],
      ['pg_catalog', split.go.operations],
      ['langruntime', split.go.language],
      ['', split.go.checks],
    ] as const) {
      await mkdir(join(directory, folder), { recursive: true })
      await writeFile(join(directory, folder, 'value.go'), body)
    }
    await writeFile(
      join(directory, 'value_test.go'),
      `package generated
import("testing"; runtime "ownedvalue/split/checkruntime")
func TestSplit(t *testing.T){value:=runtime.MakePath(runtime.PathPayload{Closed:true,Points:[]runtime.Vertex{{X:1,Y:2},{X:3,Y:4}}});if !EvaluateCheckOwned(value){t.Fatal("split owned snapshot")}}
`,
    )
    await run('go', ['test', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    for (const artifact of checkTypescriptArtifacts(split.typescript)) {
      const path = join(root, 'typescript', artifact.path)
      await mkdir(join(path, '..'), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--noEmit',
      join(root, 'typescript/checks.ts'),
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
it('keeps bare public vectors, hidden mutable payloads, non-Copy elements and field builders outside the exported value contract', () => {
  for (const rejected of [
    '#[derive(Clone)] pub struct Arena { pub characters:Vec<char> }',
    '#[derive(Clone)] pub struct Payload { characters:Vec<char> } #[derive(Clone)] pub enum Value { Item(Payload) }',
    '#[derive(Clone)] struct Element { value:String } #[derive(Clone)] pub struct Payload { pub entries:Vec<Element> } #[derive(Clone)] pub enum Value { Item(Payload) }',
    '#[derive(Clone)] pub enum Value { Item(Vec<char>) }',
    declarations +
      'pub fn f(mut input:PathPayload)->PathPayload { input.points.push(Vertex{x:1i64,y:2i64});input }',
  ])
    expect(() => transpileCheckRust(rejected), rejected).toThrow()
})

it('rejects undeclared readonly value metadata in both target emitters', () => {
  const ast = parseRust(source, checkRustAsset('check-rust-parser.wasm'))
  const document = JSON.parse(ast) as Parameters<typeof transpile>[0]
  const options = { immutableValueTypes: [], readonlyValueTypes: ['Missing'] }
  expect(() =>
    transpile(document, options, checkRustAsset('check-ts-prelude.ts').toString('utf8')),
  ).toThrow('readonly value type must be a nonopaque Clone type: Missing')
  expect(() =>
    transpileGo(Buffer.from(ast), checkRustAsset('check-go-transpiler.wasm'), options),
  ).toThrow('readonly value type must be a nonopaque Clone type: Missing')
})
