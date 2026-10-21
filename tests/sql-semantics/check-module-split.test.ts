import { expect, it } from 'vitest'
import ts from 'typescript'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkRustAsset } from '../../src/codegen/shared/check-rust-assets.js'
import {
  checkTypescriptArtifacts,
  splitCheckTypescript,
} from '../../tools/check-transpiler/typescript/split.js'

it('splits many cross-module Go symbols within a bounded WASM heap', () => {
  const count = 512
  const items = Array.from({ length: count }, (_, index) => ({
    kind: 'function',
    module: 'regex_engine',
    visibility: 'private',
    name: `measure_${index}`,
    returnType: { kind: 'path', segments: ['usize'] },
    parameters: [],
    body: [{ kind: 'expression', value: { kind: 'integer', digits: String(index) } }],
  }))
  const input = Buffer.from(
    JSON.stringify({
      ast: {
        schemaVersion: 1,
        items: [
          ...items,
          ...items.map((item, index) => ({
            ...item,
            module: 'pg_catalog',
            name: `invoke_${index}`,
            body: [
              {
                kind: 'expression',
                value: { kind: 'call', callee: { kind: 'path', segments: [item.name] } },
              },
            ],
          })),
        ],
      },
      options: { immutableValueTypes: [], split: true, schemaImportPath: 'checks/pg_catalog' },
    }),
  )
  const wasm = (
    globalThis as unknown as {
      WebAssembly: {
        Module: { new (bytes: Uint8Array): unknown; imports(module: unknown): unknown[] }
        Instance: new (module: unknown) => { exports: unknown }
      }
    }
  ).WebAssembly
  const module = new wasm.Module(new Uint8Array(checkRustAsset('check-go-transpiler.wasm')))
  expect(wasm.Module.imports(module)).toEqual([])
  const bridge = new wasm.Instance(module).exports as {
    memory: { buffer: ArrayBufferLike }
    _initialize(): void
    alloc(size: number): number
    transpile_configured(): number
    output_ptr(): number
    output_len(): number
    dispose(): void
  }
  bridge._initialize()
  const pointer = bridge.alloc(input.length) >>> 0
  try {
    new Uint8Array(bridge.memory.buffer, pointer, input.length).set(input)
    expect(bridge.transpile_configured()).toBe(0)
    const files = JSON.parse(
      Buffer.from(
        new Uint8Array(bridge.memory.buffer, bridge.output_ptr(), bridge.output_len()),
      ).toString('utf8'),
    ) as Record<string, string>
    for (let index = 0; index < count; index++) {
      expect(files.regex).toContain(`func Measure${index}() int`)
      expect(files.operations).toContain(`return regexengine.Measure${index}()`)
    }
    expect(bridge.memory.buffer.byteLength).toBeLessThanOrEqual(128 * 1024 * 1024)
  } finally {
    bridge.dispose()
  }
})

it('qualifies module references while preserving shadowed locals, property names and string contents', async () => {
  const generated = `
    function count(): number { return 9; }
    function sqlPgCatalogMeasure(): number {
      let count = 2;
      const row = { count: count };
      const message = "count sqlPgCatalogMeasure";
      return count + row.count + message.length;
    }
    function sqlPgCatalogInvoke(): number { return count(); }
    export function evaluateCheck(): number { return sqlPgCatalogMeasure() + sqlPgCatalogInvoke(); }
  `
  const files = splitCheckTypescript(generated, [
    { kind: 'function', name: 'count', module: 'regex_engine', visibility: 'public' },
    {
      kind: 'function',
      name: 'sql_pg_catalog_measure',
      module: 'pg_catalog',
      visibility: 'public',
    },
    { kind: 'function', name: 'sql_pg_catalog_invoke', module: 'pg_catalog', visibility: 'public' },
    { kind: 'function', name: 'evaluate_check', module: 'checks', visibility: 'public' },
  ])
  expect(files.operations).toContain('let count = 2')
  expect(files.operations).toContain('row.count')
  expect(files.operations).toContain('"count sqlPgCatalogMeasure"')
  expect(files.operations).toContain('return regexengine.count()')
  expect(files.operations).not.toContain('let regexengine.count')
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-split-'))
  try {
    const paths: string[] = []
    for (const artifact of checkTypescriptArtifacts(files)) {
      const path = join(directory, artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
      paths.push(path)
    }
    await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }))
    const program = ts.createProgram(paths, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      strict: true,
      types: [],
      skipLibCheck: true,
    })
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    ).toEqual([])
    const checks = await import(pathToFileURL(join(directory, 'checks.ts')).href)
    expect(checks.evaluateCheck()).toBe(4 + 'count sqlPgCatalogMeasure'.length + 9)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('re-exports public array and composite value constructors from their runtime source files', () => {
  const files = splitCheckTypescript(
    'export function arrayUnknown(): number {return 1;} export function arrayElementFamily(): number {return 2;} export function compositeUnknown(): number {return 4;} export function privateHelper(): number {return 3;} export function evaluateCheck(): number {return arrayUnknown()+arrayElementFamily()+compositeUnknown();}',
    [
      { kind: 'function', name: 'evaluate_check', module: 'checks', visibility: 'public' },
      {
        kind: 'function',
        name: 'array_unknown',
        module: 'checkruntime',
        visibility: 'public',
        sourceFile: 'runtime/array.rs',
      },
      {
        kind: 'function',
        name: 'array_element_family',
        module: 'checkruntime',
        visibility: 'public',
        sourceFile: 'runtime/array_elements.rs',
      },
      {
        kind: 'function',
        name: 'composite_unknown',
        module: 'checkruntime',
        visibility: 'public',
        sourceFile: 'runtime/composite.rs',
      },
      {
        kind: 'function',
        name: 'private_helper',
        module: 'checkruntime',
        visibility: 'public',
        sourceFile: 'runtime/private.rs',
      },
    ],
  )
  expect(files.checks).toContain('export { arrayUnknown, arrayElementFamily, compositeUnknown }')
  expect(files.checks).not.toContain('privateHelper')
})
