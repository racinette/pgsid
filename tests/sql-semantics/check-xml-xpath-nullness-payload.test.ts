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

it('preserves validated partial XML knowledge through public scalars, arrays and records', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-nullness-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE xml_null_packet AS(x xml,xs xml[]);
      CREATE TABLE xml_null_payloads(x xml,xs xml[],r xml_null_packet,expected text,bad text,
      CONSTRAINT scalar_null CHECK(x IS NULL),
      CONSTRAINT text_null CHECK((x::text) IS NULL),
      CONSTRAINT document CHECK(x IS DOCUMENT),
      CONSTRAINT array_null CHECK(xs[1] IS NULL),
      CONSTRAINT record_null CHECK((r).x IS NULL),
      CONSTRAINT nested_null CHECK((r).xs[1] IS NULL),
      CONSTRAINT scalar_bytes CHECK(x::text=expected),
      CONSTRAINT array_bytes CHECK(xs[1]::text=expected),
      CONSTRAINT record_bytes CHECK((r).x::text=expected),
      CONSTRAINT coalesced_null CHECK(COALESCE(x,XMLPARSE(DOCUMENT bad)) IS NULL));`)
    const catalog = await snapshotCatalog(pg),
      options = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        xmlOption: 'content' as const,
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { executionContext: options, compositeTypeGraph: catalog.compositeTypeGraph },
    )
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8, xmlOption: content }\n    go:\n      schema: { outDir: schema }\n',
    )
    const go = renderGoSchemaArtifacts(catalog, config, {}, join(root, 'schema'), 'xmlnull/schema')
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
    const array = (cell: unknown) => ({
      kind: 'Value',
      value: {
        elementType: 'pg_catalog.xml',
        elementKind: 45,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [cell],
        nullBitmap: { kind: 'Value', value: false },
      },
    })
    const row = (x: unknown, cell: unknown) => ({
      x,
      xs: array(cell),
      r: {
        kind: 'Value',
        value: {
          typeName: 'public.xml_null_packet',
          fields: [cell, { kind: 'Array', value: array(cell).value }],
        },
      },
      expected: '0.3333333333333333',
      bad: '<broken',
    })
    type Result = {
      constraint: string
      message?: string
      result: { certain: boolean; value?: boolean | null; error?: string }
    }
    const evaluate = (input: unknown): Result[] =>
      generated.evaluatePublicXmlNullPayloadsChecks(input)
    const reference: unknown[] = []
    for (const document of [
      { kind: 'Value', value: false },
      { kind: 'Value', value: true },
      { kind: 'Unknown' },
    ]) {
      const knowledge = { document },
        results = evaluate(
          row({ kind: 'NonNull', value: knowledge }, { kind: 'XmlNonNull', value: knowledge }),
        )
      expect(results).toHaveLength(10)
      for (const check of results) {
        const unknown =
          check.constraint.endsWith('_bytes') ||
          (check.constraint === 'document' && document.kind === 'Unknown')
        expect(check.result, check.constraint).toEqual(
          unknown
            ? { certain: false }
            : { certain: true, value: check.constraint === 'document' ? document.value : false },
        )
        if (unknown) expect(check.message).toBeTruthy()
        else expect(check.message).toBeUndefined()
      }
      reference.push({ document, results })
    }
    const invalid: unknown[] = [
      {},
      null,
      { document: null },
      { document: { kind: 'Null' } },
      { document: { kind: 'Error', value: { state: 1 } } },
      { document: { kind: 'Value', value: 'false' } },
      { document: { kind: 'alien' } },
    ]
    invalid.push(
      { document: { kind: 'Value', value: true }, content: { kind: 'Value', value: false } },
      { document: { kind: 'Unknown' }, content: { kind: 'Null' } },
      { document: { kind: 'Unknown' }, content: { kind: 'Error', value: { state: 1 } } },
      { document: { kind: 'Unknown' }, content: { kind: 'Value', value: 'true' } },
    )
    for (const value of invalid) {
      const input = row({ kind: 'NonNull', value }, { kind: 'XmlNonNull', value })
      for (const check of evaluate(input))
        expect(check.result, check.constraint).toEqual({ certain: false })
    }
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, file),
        (await readFile('tests/fixtures/codegen/project/' + file, 'utf8')).replace(
          /^module .+$/mu,
          'module xmlnull',
        ),
      )
    await writeFile(
      join(root, 'schema/public/xml_null_test.go'),
      `package public
import("testing";"strings";runtime "xmlnull/schema/public/checkrust/checkruntime")
func TestXmlKnowledge(t *testing.T){
 expected:="0.3333333333333333";bad:="<broken"
 for _,document:=range []runtime.BoolValue{{Kind:runtime.BoolValueValue,Value:false},{Kind:runtime.BoolValueValue,Value:true},{Kind:runtime.BoolValueUnknown},{Kind:runtime.BoolValueNull},{Kind:runtime.BoolValueError,Error:runtime.MakeSqlError(1)},{Kind:runtime.BoolValueKind(99)}} {
  knowledge:=runtime.XmlKnowledge{Document:document}
  cell:=runtime.ArrayElement{Kind:runtime.ArrayElementXmlNonNull,XmlNonNull:knowledge}
  array:=runtime.ArrayValue{Kind:runtime.ArrayValueValue,Value:runtime.ArrayPayload{ElementType:"pg_catalog.xml",ElementKind:45,Dimensions:[]runtime.ArrayDimension{{Lower:1,Length:1}},Elements:[]runtime.ArrayElement{cell},NullBitmap:runtime.BoolValue{Kind:runtime.BoolValueValue,Value:false}}}
  record:=runtime.CompositeValue{Kind:runtime.CompositeValueValue,Value:runtime.CompositePayload{TypeName:"public.xml_null_packet",Fields:[]runtime.ArrayElement{cell,{Kind:runtime.ArrayElementArray,Array:array.Value}}}}
  input:=PublicXmlNullPayloadsCheckInput{X:KnownCheckValue(runtime.XmlValue{Kind:runtime.XmlValueNonNull,NonNull:knowledge}),Xs:KnownCheckValue(array),R:KnownCheckValue(record),Expected:KnownCheckValue(&expected),Bad:KnownCheckValue(&bad)}
  invalid:=document.Kind!=runtime.BoolValueUnknown&&document.Kind!=runtime.BoolValueValue
  checks:=EvaluatePublicXmlNullPayloadsChecks(input);if len(checks)!=10{t.Fatal(checks)}
  for _,check:=range checks{
   unknown:=invalid||strings.HasSuffix(check.Constraint,"_bytes")||check.Constraint=="document"&&document.Kind==runtime.BoolValueUnknown
   if unknown {if check.Result.Certain||check.Message==""{t.Fatal(document,check)}} else {want:=check.Constraint=="document"&&document.Value;if !check.Result.Certain||!check.Result.Value.Valid||check.Result.Value.Value!=want||check.Result.Value.Error!=""||check.Message!=""{t.Fatal(document,check)}}
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
      'artifacts/goal-checks/xml-xpath-nullness-active/payload-reference.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
