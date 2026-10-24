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

it('evaluates public XPath XML payloads and recovers query-invariant rendered storage in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-payload-')),
    run = promisify(execFile)
  const packet = 'artifacts/goal-checks/xml-xpath-sql-active'
  try {
    await pg.exec(`SET extra_float_digits=1;SET xmloption=CONTENT;
   CREATE TABLE xpath_payloads(v xml,path text,expected text,found bool,amount int,bypass bool,
    CONSTRAINT matches CHECK(CASE WHEN bypass THEN true ELSE (xpath(path,v))[1]::text IS NOT DISTINCT FROM expected END),
    CONSTRAINT present CHECK(CASE WHEN bypass THEN true ELSE xpath_exists(path,v) IS NOT DISTINCT FROM found END),
    CONSTRAINT size CHECK(CASE WHEN bypass THEN true ELSE cardinality(xpath(path,v)) IS NOT DISTINCT FROM amount END));`)
    const catalog = await snapshotCatalog(pg),
      options = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        clientEncoding: 'UTF8' as const,
        extraFloatDigits: 1,
        xpathRecursionLimit: 5000,
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { executionContext: options },
    )
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8, clientEncoding: UTF8, extraFloatDigits: 1, xpathRecursionLimit: 5000 }\n    go:\n      schema: { outDir: schema }\n',
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      config,
      {},
      join(root, 'schema'),
      'xpathpayload/schema',
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
    type Result = {
      constraint: string
      result: { certain: boolean; value?: boolean; error?: string }
    }
    const evaluate = (row: unknown): Result[] => generated.evaluatePublicXpathPayloadsChecks(row)
    const cases: {
      storage: string
      rendered: string
      path: string
      expected: string | null
      found: boolean | null
      amount: number | null
      error: string
      renderedUnknown: boolean
    }[] = []
    let inserts = 0
    for (const raw of [
      '<r a="&amp;"><x/>é😊</r>',
      '<?xml version="1.0" encoding=""?><r/>',
      "<?xml version='a\"b'?><r/>",
      '<?xml version="1.1" standalone="yes"?><r/>',
      '\n\n<r/>',
      'plain',
      '',
    ])
      for (const path of ['/', '/*', '//missing', 'false()', '1 div 3', '']) {
        const input = (
          await pg.query<{ storage: string; rendered: string }>(
            'SELECT v::text storage,v rendered FROM(SELECT $1::xml v)input',
            [raw],
          )
        ).rows[0]!
        let expected: string | null = null,
          found: boolean | null = null,
          amount: number | null = null,
          error = ''
        try {
          const result = (
            await pg.query<{ hex: string | null; found: boolean; amount: number }>(
              "SELECT encode(convert_to((xpath($1,$2::xml))[1]::text,'UTF8'),'hex')hex,xpath_exists($1,$2::xml)found,cardinality(xpath($1,$2::xml))amount",
              [path, input.storage],
            )
          ).rows[0]!
          expected = result.hex === null ? null : Buffer.from(result.hex, 'hex').toString('utf8')
          found = result.found
          amount = result.amount
        } catch (e) {
          error = (e as { code: string }).code
        }
        const record = {
          ...input,
          path,
          expected,
          found,
          amount,
          error,
          renderedUnknown: raw.includes("version='a\"b'") && path !== '',
        }
        cases.push(record)
        const native = pg.query('INSERT INTO xpath_payloads VALUES($1::xml,$2,$3,$4,$5,false)', [
          input.storage,
          path,
          expected,
          found,
          amount,
        ])
        if (error) await expect(native).rejects.toMatchObject({ code: error })
        else await native
        inserts++
        for (const kind of ['Value', 'RenderedText']) {
          const row = {
            v: { kind, value: kind === 'Value' ? input.storage : input.rendered },
            path,
            expected,
            found,
            amount,
            bypass: false,
          }
          const result = evaluate(row)
          for (const check of result) {
            if (kind === 'RenderedText' && record.renderedUnknown)
              expect(check.result).toEqual({ certain: false })
            else if (error) expect(check.result).toMatchObject({ certain: true, error })
            else expect(check.result).toEqual({ certain: true, value: true })
          }
          for (const check of evaluate({ ...row, bypass: true }))
            expect(check.result).toEqual({ certain: true, value: true })
        }
      }
    for (const v of [
      undefined,
      '<r/>',
      { kind: 'Value', value: '\0' },
      { kind: 'RenderedText', value: '\ud800' },
    ]) {
      const row = { v, path: '/*', expected: '<r/>', found: true, amount: 1, bypass: false }
      for (const check of evaluate(row)) expect(check.result).toEqual({ certain: false })
      for (const check of evaluate({ ...row, bypass: true }))
        expect(check.result).toEqual({ certain: true, value: true })
    }
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, file),
        (await readFile('tests/fixtures/codegen/project/' + file, 'utf8')).replace(
          /^module .+$/mu,
          'module xpathpayload',
        ),
      )
    await writeFile(
      join(root, 'schema/public/xpath_payload_test.go'),
      `package public
import("testing";"encoding/json";runtime "xpathpayload/schema/public/checkrust/checkruntime")
func TestXPathPayload(t *testing.T){
 var cases []struct{Storage,Rendered,Path string;Expected *string;Found *bool;Amount *int32;Error string;RenderedUnknown bool}
 if err:=json.Unmarshal([]byte(${JSON.stringify(JSON.stringify(cases))}),&cases);err!=nil{t.Fatal(err)}
 bypass:=false
 for _,c:=range cases{for _,rendered:=range []bool{false,true}{
  path:=c.Path;value:=runtime.MakeXmlValue(c.Storage);if rendered{value=runtime.XmlValue{Kind:runtime.XmlValueRenderedText,RenderedText:c.Rendered}}
  input:=PublicXpathPayloadsCheckInput{V:KnownCheckValue(value),Path:KnownCheckValue(&path),Expected:KnownCheckValue(c.Expected),Found:KnownCheckValue(c.Found),Amount:KnownCheckValue(c.Amount),Bypass:KnownCheckValue(&bypass)}
  for _,check:=range EvaluatePublicXpathPayloadsChecks(input){r:=check.Result
   if rendered&&c.RenderedUnknown{if r.Certain{t.Fatal("rendered source guessed",c,check)}}else if c.Error!=""{if !r.Certain||r.Value.Error!=c.Error{t.Fatal("error lost",c,check)}}else{if !r.Certain||!r.Value.Value{t.Fatal("query result lost",c,check)}}
  }
  bypass=true;for _,check:=range EvaluatePublicXpathPayloadsChecks(input){if !check.Result.Certain||!check.Result.Value.Value{t.Fatal("lazy query reached",c,check)}};bypass=false
 }}
}
`,
    )
    await run('go', ['test', '-p', '1', '-mod=readonly', './schema/...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache', GOTOOLCHAIN: 'local' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/payload-reference.json',
      JSON.stringify(
        {
          cases: cases.length,
          inserts,
          renderedUnknown: cases.filter((c) => c.renderedUnknown).length,
          records: cases,
        },
        null,
        2,
      ) + '\n',
    )
    console.info('XPath public payload parity', { cases: cases.length, inserts })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
