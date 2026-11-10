import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'

it('validates partial text cells in public arrays and nested records', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-text-knowledge-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE text_knowledge_packet AS(v text,a text[]);
      CREATE TABLE text_knowledge(xs text[],r text_knowledge_packet,expected text,
      CONSTRAINT array_null CHECK(xs[1] IS NULL),
      CONSTRAINT record_null CHECK((r).v IS NULL),
      CONSTRAINT nested_null CHECK((r).a[1] IS NULL),
      CONSTRAINT array_bytes CHECK(xs[1]=expected),
      CONSTRAINT record_bytes CHECK((r).v=expected));`)
    const catalog = await snapshotCatalog(pg),
      options = { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { executionContext: options, compositeTypeGraph: catalog.compositeTypeGraph },
    )
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8 }\n    go:\n      schema: { outDir: schema }\n',
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      config,
      {},
      join(root, 'schema'),
      'textknowledge/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    for (const artifact of go.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    type Result = {
      constraint: string
      message?: string
      result: { certain: boolean; value?: boolean | null; error?: string }
    }
    const evaluate = (row: object) => generated.evaluatePublicTextKnowledgeChecks(row) as Result[]
    const quoted = (value: string) => `"${value.replace(/["\\]/gu, (c) => '\\' + c)}"`
    // Public text is the whole value, so each cell decides what PostgreSQL decides for it.
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [cell, expected] of [
      ['present', 'present'],
      ['other', 'present'],
      [null, 'present'],
      ['', null],
    ] as const) {
      const results = evaluate({ xs: [cell], r: { v: cell, a: [cell] }, expected })
      expect(results).toHaveLength(5)
      for (const check of results)
        if (!check.result.certain || 'error' in check.result) expect(check.message).toBeTruthy()
        else expect(check.message).toBeUndefined()
      const element = cell === null ? 'NULL' : quoted(cell)
      mismatches.push(
        ...differingChecks(
          JSON.stringify(cell),
          Object.fromEntries(results.map((check) => [check.constraint, check.result])),
          await serverCheckResults(pg, 'text_knowledge', {
            xs: `{${element}}`,
            r: `(${cell === null ? '' : element},${quoted(`{${element}}`)})`,
            expected,
          }),
        ),
      )
    }
    expect(mismatches).toEqual([])
    // A cell known only to be present, an unknown cell and a failed cell are no public values; the
    // evaluator entries take them directly.
    const array = (cell: { kind: string }) =>
      runtime.makeArrayValue({
        elementType: 'pg_catalog.text',
        elementKind: 8,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [cell],
        nullBitmap: { kind: 'Value', value: cell.kind === 'Null' },
      })
    const outcome = (result: unknown) => {
      const kind = (result as { kind: string }).kind
      return kind === 'True' || kind === 'False' || kind === 'Null'
        ? { certain: true, value: kind === 'Null' ? null : kind === 'True' }
        : kind === 'Error'
          ? {
              certain: true,
              error: (result as { value: { state: number } }).value.state
                .toString(36)
                .toUpperCase()
                .padStart(5, '0'),
            }
          : ['Unknown', 'Unimplemented'].includes(kind)
            ? { certain: false }
            : result
    }
    const fixtures = [
      {
        cell: { kind: 'TextNonNull' },
        nullness: { certain: true, value: false },
        bytes: { certain: false },
      },
      {
        cell: { kind: 'Null' },
        nullness: { certain: true, value: true },
        bytes: { certain: true, value: null },
      },
      { cell: { kind: 'Unknown' }, nullness: { certain: false }, bytes: { certain: false } },
      {
        cell: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        nullness: { certain: true, error: '22003' },
        bytes: { certain: true, error: '22003' },
      },
    ]
    const reference: unknown[] = []
    for (const fixture of fixtures) {
      const xs = array(fixture.cell),
        results = Object.entries(
          internal('public.text_knowledge', {
            xs,
            r: runtime.makeCompositeValue({
              typeName: 'public.text_knowledge_packet',
              fields: [fixture.cell, runtime.arrayElementFromArray(xs)],
            }),
            expected: runtime.makeTextValue('present'),
          }),
        )
      expect(results).toHaveLength(5)
      for (const [constraint, result] of results) {
        const wanted = constraint.endsWith('_bytes') ? fixture.bytes : fixture.nullness
        expect(outcome(result), JSON.stringify(fixture.cell) + '_' + constraint).toEqual(wanted)
      }
      reference.push({ cell: fixture.cell, results: Object.fromEntries(results) })
    }
    // A value of another shape, and the former payloads, are not public text.
    const payload = (cell: unknown) => ({
      kind: 'Value',
      value: {
        elementType: 'pg_catalog.text',
        elementKind: 8,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [cell],
        nullBitmap: { kind: 'Value', value: false },
      },
    })
    for (const cell of [
      { kind: 'Xml', value: 'plain' },
      { kind: 'Text', value: 'present' },
      ...fixtures.map((fixture) => fixture.cell),
      1,
    ]) {
      expect(() => evaluate({ xs: [cell], r: null, expected: 'present' })).toThrow(TypeError)
      expect(() => evaluate({ xs: payload(cell), r: null, expected: 'present' })).toThrow(TypeError)
      expect(() => evaluate({ xs: null, r: { v: cell, a: null }, expected: 'present' })).toThrow(
        TypeError,
      )
      expect(() => evaluate({ xs: null, r: { v: null, a: [cell] }, expected: 'present' })).toThrow(
        TypeError,
      )
    }
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, file),
        (await readFile('tests/fixtures/codegen/project/' + file, 'utf8')).replace(
          /^module .+$/mu,
          'module textknowledge',
        ),
      )
    await writeFile(
      join(root, 'schema/public/text_knowledge_test.go'),
      `package public
import("testing";"strings";runtime "textknowledge/schema/public/checkrust/checkruntime")
func TestPartialText(t *testing.T){
 expected:="present"
 for _,cell:=range []runtime.ArrayElement{{Kind:runtime.ArrayElementTextNonNull},{Kind:runtime.ArrayElementNull},{Kind:runtime.ArrayElementUnknown},{Kind:runtime.ArrayElementError,Error:runtime.MakeSqlError(${parseInt('22003', 36)})},{Kind:runtime.ArrayElementXml,Xml:"plain"}} {
  array:=runtime.ArrayValue{Kind:runtime.ArrayValueValue,Value:runtime.ArrayPayload{ElementType:"pg_catalog.text",ElementKind:8,Dimensions:[]runtime.ArrayDimension{{Lower:1,Length:1}},Elements:[]runtime.ArrayElement{cell},NullBitmap:runtime.BoolValue{Kind:runtime.BoolValueValue,Value:cell.Kind==runtime.ArrayElementNull}}}
  record:=runtime.CompositeValue{Kind:runtime.CompositeValueValue,Value:runtime.CompositePayload{TypeName:"public.text_knowledge_packet",Fields:[]runtime.ArrayElement{cell,{Kind:runtime.ArrayElementArray,Array:array.Value}}}}
  input:=PublicTextKnowledgeCheckInput{Xs:KnownCheckValue(array),R:KnownCheckValue(record),Expected:KnownCheckValue(&expected)}
  checks,e:=EvaluatePublicTextKnowledgeChecks(input)
  if e!=nil{if cell.Kind==runtime.ArrayElementTextNonNull||cell.Kind==runtime.ArrayElementNull||cell.Kind==runtime.ArrayElementError||cell.Kind==runtime.ArrayElementUnknown{t.Fatal(cell,e)};continue}
  if len(checks)!=5{t.Fatal(checks)}
  for _,check:=range checks{
   bytes:=strings.HasSuffix(check.Constraint,"_bytes");r:=check.Result
   switch cell.Kind{
   case runtime.ArrayElementTextNonNull:
    if bytes{if r.Certain||check.Message==""{t.Fatal(cell,check)}}else if !r.Certain||!r.Value.Valid||r.Value.Value||r.Value.Error!=""||check.Message!=""{t.Fatal(cell,check)}
   case runtime.ArrayElementNull:
    if !r.Certain||r.Value.Error!=""||check.Message!=""||bytes&&r.Value.Valid||!bytes&&(!r.Value.Valid||!r.Value.Value){t.Fatal(cell,check)}
   case runtime.ArrayElementError:
    if !r.Certain||r.Value.Error!="22003"||check.Message==""{t.Fatal(cell,check)}
   default:if r.Certain||check.Message==""{t.Fatal(cell,check)}
   }
  }
 }
}`,
    )
    await run('go', ['test', '-p', '1', '-mod=readonly', './schema/...'], {
      cwd: root,
      env: { ...process.env, GOTOOLCHAIN: 'local' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
    await mkdir('artifacts/goal-checks/xml-text-knowledge-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-text-knowledge-active/text-payload-reference.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
