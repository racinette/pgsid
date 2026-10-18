import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'

it('validates public range payloads, nominal subtype guards, partial finite bounds and lazy behavior in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-range-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE DOMAIN retained_range AS int8range;CREATE DOMAIN nested_range AS retained_range;
   CREATE TABLE range_payloads(span nested_range,expected bigint,bypass boolean,
   CONSTRAINT bound CHECK(lower(span) IS NOT DISTINCT FROM expected),
   CONSTRAINT shape CHECK(lower_inc(span) AND NOT upper_inc(span) AND NOT isempty(span)),
   CONSTRAINT present CHECK(span IS NOT NULL),
   CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE lower(span) IS NOT DISTINCT FROM expected END))`)
    const catalog = await snapshotCatalog(pg)
    const ts = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains)
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'rangepayload/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const a of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', a.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, a.content)
    }
    for (const a of go.artifacts) {
      await mkdir(dirname(a.path), { recursive: true })
      await writeFile(a.path, a.content)
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
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (
      span: unknown,
      expected: bigint | null = 9007199254740993n,
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicRangePayloadsChecks({ span, expected, bypass })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const payload = {
      typeName: 'pg_catalog.int8range',
      elementType: 'pg_catalog.int8',
      elementKind: 3,
      empty: false,
      lowerInclusive: true,
      upperInclusive: false,
      bounds: [
        { kind: 'Int8', value: 9007199254740993n },
        { kind: 'Int8', value: 9007199254740999n },
      ],
    }
    const value = { kind: 'Value', value: payload }
    for (const result of Object.values(evaluate(value)))
      expect(result).toEqual({ certain: true, value: true })
    expect(evaluate(value, 9007199254740994n).bound).toEqual({ certain: true, value: false })
    expect(evaluate(value, 9007199254740994n, true).guarded).toEqual({ certain: true, value: true })
    const invalid: unknown[] = [
      undefined,
      '[1,9)',
      1,
      {},
      { kind: 'Value', value: {} },
      { kind: 'Value', value: null },
      { kind: 'Error', value: { state: -1 } },
    ]
    for (const change of [
      { typeName: 'pg_catalog.int4range' },
      { elementType: 'pg_catalog.int4' },
      { elementKind: 2 },
      { typeName: 'bad\0name' },
      { elementType: '\ud800' },
      { empty: 'false' },
      { empty: true },
      { lowerInclusive: 'true' },
      { bounds: [] },
      { bounds: [{ kind: 'Int8', value: 1n }] },
      { bounds: [{ kind: 'Null' }, { kind: 'Int8', value: 9n }] },
      {
        bounds: [
          { kind: 'Int4', value: 1 },
          { kind: 'Int8', value: 9n },
        ],
      },
      {
        bounds: [
          { kind: 'Int8', value: 9007199254740993 },
          { kind: 'Int8', value: 9n },
        ],
      },
      {
        bounds: [
          { kind: 'Int8', value: 9223372036854775808n },
          { kind: 'Int8', value: 9n },
        ],
      },
    ])
      invalid.push({ kind: 'Value', value: { ...payload, ...change } })
    for (const input of invalid) {
      const result = evaluate(input, null, true)
      expect(result.bound, 'invalid range payload').toMatchObject({ certain: false })
      expect(result.shape, 'invalid range payload').toMatchObject({ certain: false })
      expect(result.present, 'invalid range payload').toMatchObject({ certain: false })
      expect(result.guarded).toEqual({ certain: true, value: true })
    }
    for (const input of [null, { kind: 'Null' }]) {
      const result = evaluate(input, null, true)
      expect(result.bound).toEqual({ certain: true, value: true })
      expect(result.shape).toEqual({ certain: true, value: null })
      expect(result.present).toEqual({ certain: true, value: false })
    }
    const partial = {
      kind: 'Value',
      value: { ...payload, bounds: [{ kind: 'Unknown' }, { kind: 'Int8', value: 9n }] },
    }
    expect(evaluate(partial).bound).toMatchObject({ certain: false })
    expect(evaluate(partial).shape).toEqual({ certain: true, value: true })
    expect(evaluate(partial).present).toEqual({ certain: true, value: true })
    const error = evaluate({ kind: 'Error', value: { state: parseInt('22012', 36) } }, null, true)
    expect(error.bound).toEqual({ certain: true, error: '22012' })
    expect(error.shape).toEqual({ certain: true, error: '22012' })
    expect(error.present).toEqual({ certain: true, error: '22012' })
    expect(error.guarded).toEqual({ certain: true, value: true })
    await pg.query(
      "INSERT INTO range_payloads VALUES('[9007199254740993,9007199254740999)'::int8range,$1,false)",
      [9007199254740993n],
    )
    await expect(
      pg.query(
        "INSERT INTO range_payloads VALUES('[9007199254740993,9007199254740999)'::int8range,$1,false)",
        [9007199254740994n],
      ),
    ).rejects.toMatchObject({ code: '23514' })
    await writeFile(join(root, 'go.mod'), 'module rangepayload\n\ngo 1.25\n')
    await writeFile(
      join(root, 'schema/public/range_test.go'),
      `package public
import("testing";checkruntime "rangepayload/schema/public/checkrust/checkruntime")
func TestPublicRanges(t *testing.T){
 expected:=int64(9007199254740993);bypass:=true
 value:=checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"pg_catalog.int8range",ElementType:"pg_catalog.int8",ElementKind:3,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740993},{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740999}}})
 input:=PublicRangePayloadsCheckInput{Span:KnownCheckValue(value),Expected:KnownCheckValue(&expected),Bypass:KnownCheckValue(&bypass)}
 for _,c:=range EvaluatePublicRangePayloadsChecks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range",c)}}
 bad:=value;bad.Value.TypeName="pg_catalog.int4range";input.Span=KnownCheckValue(bad)
 for _,c:=range EvaluatePublicRangePayloadsChecks(input){if c.Constraint=="guarded" {if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy",c)}} else if c.Result.Certain {t.Fatal("wrong nominal identity",c)}}
 for _,kind:=range []checkruntime.ArrayElementKind{checkruntime.ArrayElementInt4,255} {bad=value;bad.Value.Bounds=append([]checkruntime.ArrayElement(nil),value.Value.Bounds...);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:kind,Int4:1};input.Span=KnownCheckValue(bad);for _,c:=range EvaluatePublicRangePayloadsChecks(input){if c.Constraint!="guarded" && c.Result.Certain {t.Fatal("invalid bound",c)}}}
 partial:=value;partial.Value.Bounds=append([]checkruntime.ArrayElement(nil),value.Value.Bounds...);partial.Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown};input.Span=KnownCheckValue(partial)
 for _,c:=range EvaluatePublicRangePayloadsChecks(input){if c.Constraint=="bound" {if c.Result.Certain {t.Fatal("partial bound",c)}} else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("partial structure",c)}}
}
`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180000)
