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
    const array = (cell: { kind: string }) => ({
      kind: 'Value',
      value: {
        elementType: 'pg_catalog.text',
        elementKind: 8,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [cell],
        nullBitmap: { kind: 'Value', value: cell.kind === 'Null' },
      },
    })
    type Result = {
      constraint: string
      message?: string
      result: { certain: boolean; value?: boolean | null; error?: string }
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
      {
        cell: { kind: 'Xml', value: 'plain' },
        nullness: { certain: false },
        bytes: { certain: false },
      },
    ]
    const reference: unknown[] = []
    for (const fixture of fixtures) {
      const xs = array(fixture.cell),
        r = {
          kind: 'Value',
          value: {
            typeName: 'public.text_knowledge_packet',
            fields: [fixture.cell, { kind: 'Array', value: xs.value }],
          },
        },
        results = generated.evaluatePublicTextKnowledgeChecks({
          xs,
          r,
          expected: 'present',
        }) as Result[]
      expect(results).toHaveLength(5)
      for (const check of results) {
        const wanted = check.constraint.endsWith('_bytes') ? fixture.bytes : fixture.nullness
        expect(check.result, JSON.stringify(fixture.cell) + '_' + check.constraint).toEqual(wanted)
        if (!wanted.certain) expect(check.message).toBeTruthy()
        else if ('error' in wanted) expect(check.message).toBeTruthy()
        else expect(check.message).toBeUndefined()
      }
      reference.push({ cell: fixture.cell, results })
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
  checks:=EvaluatePublicTextKnowledgeChecks(input);if len(checks)!=5{t.Fatal(checks)}
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
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache', GOTOOLCHAIN: 'local' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
    await writeFile(
      'artifacts/goal-checks/xml-text-knowledge-active/text-payload-reference.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
