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

it('exposes precise reached XPath requirements through the stable public Go and TypeScript result shape', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-diagnostic-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TABLE xpath_reason_payloads(v xml,path text,expected text,flag bool,bypass bool,
      CONSTRAINT matches CHECK(CASE WHEN bypass THEN true ELSE (xpath(path,v))[1]::text=expected END),
      CONSTRAINT shape CHECK(CASE WHEN bypass THEN true ELSE cardinality(xpath(path,v))=1 END),
      CONSTRAINT shape_flag CHECK(CASE WHEN bypass THEN true ELSE cardinality(xpath(path,v))=1 AND flag END),
      CONSTRAINT present CHECK(CASE WHEN bypass THEN true ELSE xpath_exists(path,v) END));`)
    const catalog = await snapshotCatalog(pg),
      options = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        xpathRecursionLimit: 5000,
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { executionContext: options },
    )
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8, xpathRecursionLimit: 5000 }\n    go:\n      schema: { outDir: schema }\n',
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      config,
      {},
      join(root, 'schema'),
      'xpathreason/schema',
    )
    expect(go.diagnostics).toEqual([])
    const tsCalls = [...ts.checks.matchAll(/\b_checkRust\.(evaluateCheck\w+)\s*\(/gu)]
    const goCalls = go.artifacts.flatMap((artifact) => [
      ...artifact.content.matchAll(/\bcheckrust\.(EvaluateCheck\w+)\s*\(/gu),
    ])
    expect(tsCalls).toHaveLength(4)
    expect(goCalls).toHaveLength(4)
    for (const match of [...tsCalls, ...goCalls])
      expect(match[1]).toMatch(/DiagnosticH[a-z0-9]{4}$/u)
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
      owner: string
      constraint: string
      message?: string
      result: { certain: boolean; value?: boolean; error?: string }
    }
    const evaluate = (row: unknown): Result[] =>
      generated.evaluatePublicXpathReasonPayloadsChecks(row)
    const base = {
      v: { kind: 'Value', value: '<r/>' },
      path: '1 div 3',
      expected: '0.3333333333333333',
      flag: true,
      bypass: false,
    }
    type Sample = { name: string; row: Record<string, unknown>; unknown: Record<string, string> }
    const samples: Sample[] = [
      { name: 'formatting', row: base, unknown: { matches: 'extraFloatDigits' } },
      {
        name: 'missing_flag',
        row: { ...base, flag: undefined },
        unknown: { matches: 'extraFloatDigits', shape_flag: '' },
      },
      { name: 'missing_expected', row: { ...base, expected: undefined }, unknown: { matches: '' } },
      {
        name: 'missing_xml',
        row: { ...base, v: undefined },
        unknown: { matches: '', shape: '', shape_flag: '', present: '' },
      },
      {
        name: 'power',
        row: { ...base, path: "number('1e23')" },
        unknown: {
          matches: 'xpathPowerOfTenBits',
          shape: 'xpathPowerOfTenBits',
          shape_flag: 'xpathPowerOfTenBits',
          present: 'xpathPowerOfTenBits',
        },
      },
      {
        name: 'rendered_storage',
        row: {
          ...base,
          v: { kind: 'RenderedText', value: '<?xml version="a"b"?><r/>' },
          path: '/',
        },
        unknown: {
          matches: 'original XML storage',
          shape: 'original XML storage',
          shape_flag: 'original XML storage',
          present: 'original XML storage',
        },
      },
      { name: 'bypass', row: { ...base, bypass: true }, unknown: {} },
    ]
    const reference: unknown[] = []
    for (const sample of samples) {
      const results = evaluate(sample.row)
      for (const check of results) {
        if (check.constraint in sample.unknown) {
          expect(check.result, sample.name + '_' + check.constraint).toEqual({ certain: false })
          expect(Object.keys(check).sort()).toEqual(['constraint', 'message', 'owner', 'result'])
          expect(check.message).toBeTruthy()
          const specific = sample.unknown[check.constraint]!
          if (specific) expect(check.message).toContain(specific)
          else
            expect(check.message).not.toMatch(
              /extraFloatDigits|xpathPowerOfTenBits|original XML storage/u,
            )
        } else {
          expect(check.result, sample.name + '_' + check.constraint).toEqual({
            certain: true,
            value: true,
          })
          expect(check.message).toBeUndefined()
        }
      }
      reference.push({ name: sample.name, results })
    }
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, file),
        (await readFile('tests/fixtures/codegen/project/' + file, 'utf8')).replace(
          /^module .+$/mu,
          'module xpathreason',
        ),
      )
    await writeFile(
      join(root, 'schema/public/xpath_reason_test.go'),
      `package public
import("testing";"strings";runtime "xpathreason/schema/public/checkrust/checkruntime")
func TestXPathReasons(t *testing.T){
 path:="1 div 3"; expected:="0.3333333333333333";flag:=true;bypass:=false
 base:=PublicXpathReasonPayloadsCheckInput{V:KnownCheckValue(runtime.MakeXmlValue("<r/>")),Path:KnownCheckValue(&path),Expected:KnownCheckValue(&expected),Flag:KnownCheckValue(&flag),Bypass:KnownCheckValue(&bypass)}
 for _,sample:=range []string{"formatting","missing_flag","missing_expected","missing_xml","power","rendered_storage","bypass"}{
  input:=base;wanted:=map[string]string{"matches":"extraFloatDigits"};path="1 div 3";bypass=false
  switch sample{
  case "missing_flag":input.Flag=CheckOptional[*bool]{};wanted["shape_flag"]=""
  case "missing_expected":input.Expected=CheckOptional[*string]{};wanted["matches"]=""
  case "missing_xml":input.V=CheckOptional[runtime.XmlValue]{};wanted=map[string]string{"matches":"","shape":"","shape_flag":"","present":""}
  case "power":path="number('1e23')";wanted=map[string]string{"matches":"xpathPowerOfTenBits","shape":"xpathPowerOfTenBits","shape_flag":"xpathPowerOfTenBits","present":"xpathPowerOfTenBits"}
  case "rendered_storage":path="/";input.V=KnownCheckValue(runtime.XmlValue{Kind:runtime.XmlValueRenderedText,RenderedText:"<?xml version=\\"a\\"b\\"?><r/>"});wanted=map[string]string{"matches":"original XML storage","shape":"original XML storage","shape_flag":"original XML storage","present":"original XML storage"}
  case "bypass":bypass=true;wanted=map[string]string{}
  }
  for _,check:=range EvaluatePublicXpathReasonPayloadsChecks(input){text,unknown:=wanted[check.Constraint]
   if unknown {if check.Result.Certain||check.Message==""{t.Fatal(sample,check)};if text!=""&&!strings.Contains(check.Message,text){t.Fatal(sample,check)};if text==""&&(strings.Contains(check.Message,"extraFloatDigits")||strings.Contains(check.Message,"xpathPowerOfTenBits")||strings.Contains(check.Message,"original XML storage")){t.Fatal("spurious reason",sample,check)}}else if !check.Result.Certain||!check.Result.Value.Value||check.Message!=""{t.Fatal(sample,check)}
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
      'artifacts/goal-checks/xml-xpath-diagnostics-active/payload-reference.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
