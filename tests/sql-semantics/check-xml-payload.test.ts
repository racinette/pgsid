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
import { internalCheckRows } from '../support/check-entries.js'
import { serverCheckResults } from '../support/check-server-results.js'

it('validates public XML storage/rendered profiles in Go and TypeScript without reparsing coerced constructor values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE DOMAIN retained_xml AS xml; CREATE TABLE xml_payloads(v retained_xml,expected text,bypass boolean,
   CONSTRAINT storage CHECK(CASE WHEN bypass THEN true ELSE v::text IS NOT DISTINCT FROM expected END),
   CONSTRAINT rendered CHECK(CASE WHEN bypass THEN true ELSE encode(xml_send(v),'hex')=expected END),
   CONSTRAINT present CHECK(v IS NOT NULL));`)
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
      { executionContext: options },
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
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    // A public xml value is the server's text, read through its input function.
    const evaluate = (v: unknown, expected: string | null, bypass = false) =>
      Object.fromEntries(
        generated
          .evaluatePublicXmlPayloadsChecks({ v, expected, bypass })
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    const server = (v: string | null, expected: string | null, bypass = false) =>
      serverCheckResults(pg, 'xml_payloads', { v, expected, bypass: String(bypass) })
    // Stored XML known only by its rendering, or holding text the input rejects, is no public
    // value; the evaluator entry takes it directly.
    const stored = (v: unknown, expected: string | null, bypass = false) =>
      internal('public.xml_payloads', {
        v,
        expected: expected === null ? runtime.textNull() : runtime.makeTextValue(expected),
        bypass: runtime.makeBoolValue(bypass),
      }) as Record<string, unknown>
    const raw = '<?xml version="1.0"?><r/>',
      rendered = '<r/>'
    expect(evaluate(raw, raw).storage).toEqual({
      certain: true,
      value: true,
    })
    expect(evaluate(raw, rendered).storage).toEqual({
      certain: true,
      value: false,
    })
    for (const expected of [raw, rendered, Buffer.from(raw).toString('hex'), null])
      expect(evaluate(raw, expected)).toEqual(await server(raw, expected))
    expect(stored({ kind: 'Value', value: raw }, raw).storage).toEqual({ kind: 'True' })
    expect(stored({ kind: 'Value', value: raw }, rendered).storage).toEqual({ kind: 'False' })
    expect(stored({ kind: 'Value', value: '\u0001' }, '\u0001').storage).toEqual({ kind: 'True' })
    // The input function rejects a control character the stored value can hold.
    expect(evaluate('\u0001', '\u0001').storage).toMatchObject({ certain: true, error: '2200N' })
    expect(evaluate('\u0001', '\u0001')).toEqual(await server('\u0001', '\u0001'))
    expect(stored({ kind: 'RenderedText', value: rendered }, rendered).storage).toEqual({
      kind: 'Unknown',
    })
    expect(
      stored({ kind: 'RenderedText', value: rendered }, Buffer.from(rendered).toString('hex'))
        .rendered,
    ).toEqual({ kind: 'True' })
    expect(stored({ kind: 'RenderedText', value: '' }, '').rendered).toEqual({ kind: 'True' })
    expect(evaluate(rendered, Buffer.from(rendered).toString('hex')).rendered).toEqual({
      certain: true,
      value: true,
    })
    for (const [v, expected] of [
      [rendered, Buffer.from(rendered).toString('hex')],
      [rendered, rendered],
      ['', ''],
      ['<a>', ''],
      ['text <b/>', 'text <b/>'],
    ] as const)
      expect(evaluate(v, expected), v).toEqual(await server(v, expected))
    expect(Object.values(evaluate(undefined, 'expected'))).toEqual([
      { certain: false },
      { certain: false },
      { certain: false },
    ])
    expect(evaluate(undefined, 'expected', true).storage).toEqual({ certain: true, value: true })
    for (const v of [
      42,
      {},
      '\0',
      '\ud800',
      { kind: 'Value', value: raw },
      { kind: 'RenderedText', value: rendered },
      { kind: 'Value' },
      { kind: 'Value', value: 1 },
      { kind: 'Value', value: '\0' },
      { kind: 'Value', value: '\ud800' },
      { kind: 'RenderedText', value: '\udc00' },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'Other', value: 'valid' },
    ]) {
      expect(() => evaluate(v, 'expected')).toThrow(TypeError)
      expect(() => evaluate(v, 'expected', true)).toThrow(TypeError)
    }
    expect(evaluate(null, null).storage).toEqual({ certain: true, value: true })
    expect(evaluate(null, null).present).toEqual({ certain: true, value: false })
    expect(evaluate(null, null)).toEqual(await server(null, null))
    for (const c of Object.values(
      stored({ kind: 'Error', value: runtime.makeSqlError(parseInt('22003', 36)) }, ''),
    ))
      expect(c).toMatchObject({ kind: 'Error', value: { state: parseInt('22003', 36) } })
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
      join(root, 'schema/public/xml_payload_test.go'),
      `package public
import("testing";runtime "xmlpayload/schema/public/checkrust/checkruntime")
func TestXmlPayload(t *testing.T){
 expected:=${JSON.stringify(raw)};bypass:=false
 input:=publicXmlPayloadsCheckInput{V:KnownCheckValue(runtime.MakeXmlValue(expected)),Expected:KnownCheckValue(&expected),Bypass:KnownCheckValue(&bypass)}
 result:=func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {panic(e)}; return r}()
 if !result[2].Result.Certain || !result[2].Result.Value.Value {t.Fatal("storage lost",result)}
 input.V=KnownCheckValue(runtime.XmlValue{Kind:runtime.XmlValueRenderedText,RenderedText:"<r/>"})
 result=func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {panic(e)}; return r}();if result[2].Result.Certain {t.Fatal("rendered source guessed",result)}
 expected="3c722f3e";result=func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {panic(e)}; return r}();if !result[1].Result.Certain || !result[1].Result.Value.Value {t.Fatal("rendered wire lost",result)}
 expected="";input.V=KnownCheckValue(runtime.XmlValue{Kind:runtime.XmlValueRenderedText,RenderedText:""});result=func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {panic(e)}; return r}();if !result[1].Result.Certain || !result[1].Result.Value.Value {t.Fatal("empty rendered wire lost",result)}
 for _,bad:=range []runtime.XmlValue{{Kind:runtime.XmlValueValue,Value:"a\\x00b"},{Kind:runtime.XmlValueValue,Value:string([]byte{255})},{Kind:runtime.XmlValueRenderedText,RenderedText:string([]byte{255})},{Kind:255}}{
  input.V=KnownCheckValue(bad);for _,check:=range func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {return nil}; return r}(){if check.Result.Certain{t.Fatal("bad XML encoding admitted",check)}}
 }
 input.V=KnownCheckValue(runtime.XmlValue{Kind:runtime.XmlValueError,Error:runtime.MakeSqlError(${parseInt('22003', 36)})});for _,check:=range func() []CheckEvaluation {r, e := evaluatePublicXmlPayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !check.Result.Certain||check.Result.Value.Error!="22003" {t.Fatal("error lost",check)}}
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
    await mkdir('artifacts/goal-checks/xml-sql-active', { recursive: true })
    await rm('artifacts/goal-checks/xml-sql-active/public-generated', {
      recursive: true,
      force: true,
    })
    await cp(root, 'artifacts/goal-checks/xml-sql-active/public-generated', {
      recursive: true,
      filter: (path) => path !== join(root, 'node_modules'),
    })
    throw e
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
