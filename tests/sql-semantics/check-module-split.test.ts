import { expect, it } from 'vitest'
import ts from 'typescript'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  checkTypescriptArtifacts,
  splitCheckTypescript,
} from '../../tools/check-transpiler/typescript/split.js'

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

it('re-exports public array value constructors from their runtime source files', () => {
  const files = splitCheckTypescript(
    'export function arrayUnknown(): number {return 1;} export function arrayElementFamily(): number {return 2;} export function privateHelper(): number {return 3;} export function evaluateCheck(): number {return arrayUnknown()+arrayElementFamily();}',
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
        name: 'private_helper',
        module: 'checkruntime',
        visibility: 'public',
        sourceFile: 'runtime/private.rs',
      },
    ],
  )
  expect(files.checks).toContain('export { arrayUnknown, arrayElementFamily }')
  expect(files.checks).not.toContain('privateHelper')
})
