import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows, storedOrRejected } from '../support/check-entries.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'

it('validates public XML arrays and record fields while preserving storage, output, partial states and owned snapshots', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-container-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE xml_packet AS(x xml,xs xml[]);
CREATE TABLE xml_container_payloads(xs xml[],r xml_packet,expected text,bypass boolean,
 CONSTRAINT array_storage CHECK(CASE WHEN bypass THEN true ELSE xs[1]::text IS NOT DISTINCT FROM expected END),
 CONSTRAINT record_storage CHECK(CASE WHEN bypass THEN true ELSE (r).x::text IS NOT DISTINCT FROM expected END),
 CONSTRAINT array_output CHECK(CASE WHEN bypass THEN true ELSE array_to_string(xs,'') IS NOT DISTINCT FROM expected END),
 CONSTRAINT record_output CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(r)->>'x') IS NOT DISTINCT FROM expected END),
 CONSTRAINT nested_output CHECK(CASE WHEN bypass THEN true ELSE array_to_string((r).xs,'') IS NOT DISTINCT FROM expected END));`)
    const catalog = await snapshotCatalog(pg),
      options = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        clientEncoding: 'UTF8' as const,
        xmlOption: 'content' as const,
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { executionContext: options, compositeTypeGraph: catalog.compositeTypeGraph },
    )
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8, clientEncoding: UTF8, xmlOption: content }\n    go:\n      schema: { outDir: schema }\n',
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      config,
      {},
      join(root, 'schema'),
      'xmlpayload/schema',
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
    const evaluate = (xs: unknown, r: unknown, expected: string | null, bypass = false) =>
      Object.fromEntries(
        generated
          .evaluatePublicXmlContainerPayloadsChecks({ xs, r, expected, bypass })
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    const raw = '<?xml version="1.0"?><r/>',
      rendered = '<r/>'
    const known = { certain: true, value: true },
      unknown = { certain: false }
    const names = [
      'array_storage',
      'record_storage',
      'array_output',
      'record_output',
      'nested_output',
    ]
    // Public XML is the server's text: the cast to text keeps it as stored, output drops the
    // default declaration, and each check decides what PostgreSQL decides.
    const quoted = (value: string) => `"${value.replace(/["\\]/gu, (c) => '\\' + c)}"`
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [value, expected, bypass] of [
      [raw, raw, false],
      [raw, rendered, false],
      [rendered, rendered, false],
      ['text <b/>', 'text <b/>', false],
      [raw, null, true],
      [null, null, false],
      [null, '', false],
    ] as const) {
      const xs = [value],
        r = { x: value, xs: [value] },
        element = value === null ? 'NULL' : quoted(value)
      const before = structuredClone({ xs, r })
      const local = evaluate(xs, r, expected, bypass)
      expect({ xs, r }).toEqual(before)
      mismatches.push(
        ...differingChecks(
          JSON.stringify({ value, expected, bypass }),
          local,
          await serverCheckResults(pg, 'xml_container_payloads', {
            xs: `{${element}}`,
            r: `(${value === null ? '' : element},${quoted(`{${element}}`)})`,
            expected,
            bypass: String(bypass),
          }),
        ),
      )
    }
    expect(mismatches).toEqual([])
    for (const name of ['array_storage', 'record_storage'])
      expect(evaluate([raw], { x: raw, xs: [raw] }, raw)[name]).toEqual(known)
    for (const name of ['array_output', 'record_output', 'nested_output'])
      expect(evaluate([raw], { x: raw, xs: [raw] }, rendered)[name]).toEqual(known)
    expect(Object.values(evaluate(null, null, null))).toEqual(Array(5).fill(known))
    // Text a parameter cannot carry, values of other shapes and the former payloads are type errors.
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
    const record = (cell: unknown) => ({
      kind: 'Value',
      value: {
        typeName: 'public.xml_packet',
        fields: [cell, { kind: 'Array', value: array(cell).value }],
      },
    })
    for (const bad of ['\0', '\ud800', 1, { kind: 'Text', value: rendered }]) {
      expect(() => evaluate([bad], { x: bad, xs: [bad] }, rendered)).toThrow(TypeError)
      expect(() => evaluate([bad], { x: bad, xs: [bad] }, rendered, true)).toThrow(TypeError)
    }
    for (const bad of [
      { kind: 'Xml', value: raw },
      { kind: 'Xml', value: '\0' },
      { kind: 'Xml', value: '\ud800' },
      { kind: 'XmlRenderedText', value: rendered },
      { kind: 'XmlRenderedText', value: '\udc00' },
      { kind: 'Xml', value: 1 },
      { kind: 'Text', value: rendered },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ]) {
      expect(() => evaluate(array(bad), null, rendered)).toThrow(TypeError)
      // A record ignores keys that name none of its fields, so a former payload is a record
      // whose fields are all NULL.
      for (const bypass of [false, true])
        expect(evaluate(null, record(bad), rendered, bypass)).toEqual(
          evaluate(null, { x: null, xs: null }, rendered, bypass),
        )
      expect(() => evaluate([bad], { x: bad, xs: [bad] }, rendered)).toThrow(TypeError)
    }
    // Values known only by their output, unknown or failed cells and failed columns are no public
    // values; the evaluator entries take them directly.
    const runtimeChecks = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtimeChecks)
    const outcome = (result: unknown) => {
      const kind = (result as { kind: string }).kind
      return kind === 'True' || kind === 'False'
        ? { certain: true, value: kind === 'True' }
        : kind === 'Error'
          ? {
              certain: true,
              error: (result as { value: { state: number } }).value.state
                .toString(36)
                .toUpperCase()
                .padStart(5, '0'),
            }
          : ['Unknown', 'Unimplemented'].includes(kind)
            ? unknown
            : result
    }
    const storedArray = (cell: unknown) =>
      runtimeChecks.makeArrayValue({
        elementType: 'pg_catalog.xml',
        elementKind: 45,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [cell],
        nullBitmap: { kind: 'Value', value: (cell as { kind: string }).kind === 'Null' },
      })
    const stored = (xs: unknown, r: unknown, expected: string, bypass = false) =>
      Object.fromEntries(
        Object.entries(
          internal('public.xml_container_payloads', {
            xs,
            r,
            expected: runtimeChecks.makeTextValue(expected),
            bypass: runtimeChecks.makeBoolValue(bypass),
          }),
        ).map(([name, result]) => [name, outcome(result)]),
      )
    const storedCells = (cell: unknown, expected: string, bypass = false) => {
      const xs = storedArray(cell)
      return stored(
        xs,
        runtimeChecks.makeCompositeValue({
          typeName: 'public.xml_packet',
          fields: [cell, runtimeChecks.arrayElementFromArray(xs)],
        }),
        expected,
        bypass,
      )
    }
    const storedCell = { kind: 'Xml', value: raw }
    for (const name of ['array_storage', 'record_storage'])
      expect(storedCells(storedCell, raw)[name]).toEqual(known)
    for (const name of ['array_output', 'record_output', 'nested_output'])
      expect(storedCells(storedCell, rendered)[name]).toEqual(known)
    const partial = storedCells({ kind: 'XmlRenderedText', value: rendered }, rendered)
    expect(partial.array_storage).toEqual(unknown)
    expect(partial.record_storage).toEqual(unknown)
    for (const name of ['array_output', 'record_output', 'nested_output'])
      expect(partial[name]).toEqual(known)
    expect(storedCells({ kind: 'Unknown' }, rendered)).toEqual(
      Object.fromEntries(names.map((n) => [n, unknown])),
    )
    const failure = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    expect(Object.values(stored(failure, failure, rendered))).toEqual(
      Array(5).fill({ certain: true, error: '22003' }),
    )
    // Cells whose text no value holds never decide a check that reads them.
    for (const bad of [
      { kind: 'Xml', value: '\0' },
      { kind: 'Xml', value: '\ud800' },
      { kind: 'XmlRenderedText', value: '\udc00' },
    ]) {
      const results = storedOrRejected(() => storedCells(bad, rendered))
      if (results) for (const name of names) expect(results[name], name).toEqual(unknown)
    }
    const cell = { kind: 'Xml', value: raw },
      xs = array(cell),
      r = record(cell)
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const copied = runtime.arrayFromCoercedValue(xs, 'pg_catalog.xml', 45)
    const recordCopy = runtime.compositeFromCoercedValue(r)
    cell.value = '<changed/>'
    xs.value.dimensions[0]!.lower = 9
    expect(copied.value.elements[0].value).toBe(raw)
    expect(copied.value.dimensions[0].lower).toBe(1)
    expect(recordCopy.value.fields[0].value).toBe(raw)
    expect(recordCopy.value.fields[1].value.elements[0].value).toBe(raw)
    await writeFile(
      join(root, 'go.mod'),
      (await readFile('tests/fixtures/codegen/project/go.mod', 'utf8')).replace(
        /^module .+$/mu,
        'module xmlpayload',
      ),
    )
    await writeFile(
      join(root, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(root, 'schema/public/xml_container_payload_test.go'),
      `package public
import("testing";runtime "xmlpayload/schema/public/checkrust/checkruntime")
func TestXmlContainerPayload(t *testing.T){
 raw:=${JSON.stringify(raw)};expected:=raw;bypass:=false
 cell:=runtime.ArrayElement{Kind:runtime.ArrayElementXml,Xml:raw}
 payload:=runtime.ArrayPayload{ElementType:"pg_catalog.xml",ElementKind:45,Dimensions:[]runtime.ArrayDimension{{Lower:1,Length:1}},Elements:[]runtime.ArrayElement{cell},NullBitmap:runtime.MakeBoolValue(false)}
 xs:=runtime.ArrayValue{Kind:runtime.ArrayValueValue,Value:payload}
 record:=runtime.CompositeValue{Kind:runtime.CompositeValueValue,Value:runtime.CompositePayload{TypeName:"public.xml_packet",Fields:[]runtime.ArrayElement{cell,{Kind:runtime.ArrayElementArray,Array:payload}}}}
 row:=PublicXmlContainerPayloadsCheckInput{Xs:KnownCheckValue(xs),R:KnownCheckValue(record),Expected:KnownCheckValue(&expected),Bypass:KnownCheckValue(&bypass)}
 evaluate:=func()map[string]EvalBool {out:=map[string]EvalBool{};for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicXmlContainerPayloadsChecks(row); if e != nil {panic(e)}; return r}(){out[c.Constraint]=c.Result};return out}
 check:=func(names []string,want bool){t.Helper();for _,name:=range names{got:=evaluate()[name];if got.Certain!=want || want&&(!got.Value.Value||got.Value.Error!=""){t.Fatal(name,got)}}}
 check([]string{"array_storage","record_storage"},true)
 expected="<r/>";check([]string{"array_output","record_output","nested_output"},true)
 row.Xs.V.Value.Elements=[]runtime.ArrayElement{{Kind:runtime.ArrayElementXmlRenderedText,XmlRenderedText:expected}}
 row.R.V.Value.Fields=[]runtime.ArrayElement{{Kind:runtime.ArrayElementXmlRenderedText,XmlRenderedText:expected},{Kind:runtime.ArrayElementArray,Array:row.Xs.V.Value}}
 check([]string{"array_storage","record_storage"},false);check([]string{"array_output","record_output","nested_output"},true)
 for _,bad:=range []runtime.ArrayElement{{Kind:runtime.ArrayElementXml,Xml:"a\\x00b"},{Kind:runtime.ArrayElementXml,Xml:string([]byte{255})},{Kind:runtime.ArrayElementXmlRenderedText,XmlRenderedText:string([]byte{255})},{Kind:runtime.ArrayElementText,Text:expected}}{
  row.Xs.V.Value.Elements=[]runtime.ArrayElement{bad};row.R.V.Value.Fields=[]runtime.ArrayElement{bad,{Kind:runtime.ArrayElementArray,Array:row.Xs.V.Value}}
  if _,e:=EvaluatePublicXmlContainerPayloadsChecks(row);e==nil{t.Fatal("bad XML container admitted",bad)}
  bypass=true;if _,e:=EvaluatePublicXmlContainerPayloadsChecks(row);e==nil{t.Fatal("bad XML container admitted under bypass",bad)};bypass=false
 }
 owned:=runtime.ArrayFromCoercedValue(xs,"pg_catalog.xml",45);saved:=runtime.CompositeFromCoercedValue(record)
 payload.Elements[0]=runtime.ArrayElement{Kind:runtime.ArrayElementXml,Xml:"<changed/>"};payload.Dimensions[0].Lower=9
 if owned.Value.Elements[0].Xml!=raw||owned.Value.Dimensions[0].Lower!=1||saved.Value.Fields[0].Xml!=raw||saved.Value.Fields[1].Array.Elements[0].Xml!=raw{t.Fatal("XML ownership lost")}
 row.Xs=KnownCheckValue(runtime.ArrayValue{Kind:runtime.ArrayValueError,Error:runtime.MakeSqlError(${parseInt('22003', 36)})});row.R=KnownCheckValue(runtime.CompositeValue{Kind:runtime.CompositeValueError,Error:runtime.MakeSqlError(${parseInt('22003', 36)})})
 for _,result:=range evaluate(){if !result.Certain||result.Value.Error!="22003"{t.Fatal("error lost",result)}}
}
`,
    )
    await run('go', ['test', '-p', '1', '-mod=readonly', './schema/...'], {
      cwd: root,
      env: { ...process.env, GOTOOLCHAIN: 'local' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
  } catch (e) {
    await mkdir('artifacts/goal-checks/xml-containers-active', { recursive: true })
    await rm('artifacts/goal-checks/xml-containers-active/public-generated', {
      recursive: true,
      force: true,
    })
    await cp(root, 'artifacts/goal-checks/xml-containers-active/public-generated', {
      recursive: true,
      filter: (path) => path !== join(root, 'node_modules'),
    })
    throw e
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
