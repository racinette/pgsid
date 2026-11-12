import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
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
import { writeGoModule } from '../support/go-module.js'

it('validates public int8range values in TypeScript, range payloads in Go, and lazy behavior in both', async () => {
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
    const value = {
      empty: false,
      lower: { value: 9007199254740993n, inclusive: true },
      upper: { value: 9007199254740999n, inclusive: false },
    }
    for (const result of Object.values(evaluate(value)))
      expect(result).toEqual({ certain: true, value: true })
    expect(evaluate(value, 9007199254740994n).bound).toEqual({ certain: true, value: false })
    expect(evaluate(value, 9007199254740994n, true).guarded).toEqual({ certain: true, value: true })
    const exclusive = { ...value, lower: { value: 9007199254740992n, inclusive: false } }
    for (const result of Object.values(evaluate(exclusive)))
      expect(result).toEqual({ certain: true, value: true })
    // An unbounded side has no inclusivity: the lower bound is NULL and not inclusive.
    const [unbounded] = (
      await pg.query<{ bound: boolean; shape: boolean }>(
        "SELECT lower(r) IS NOT DISTINCT FROM NULL AS bound,lower_inc(r) AND NOT upper_inc(r) AND NOT isempty(r) AS shape FROM (SELECT '(,9007199254740999)'::int8range AS r) s",
      )
    ).rows
    const open = evaluate({ ...value, lower: null }, null)
    expect(open.bound).toEqual({ certain: true, value: unbounded!.bound })
    expect(open.shape).toEqual({ certain: true, value: unbounded!.shape })
    expect(open.present).toEqual({ certain: true, value: true })
    expect(evaluate({ empty: true }, null).shape).toEqual({ certain: true, value: false })
    const invalid: unknown[] = [
      undefined,
      '[1,9)',
      1,
      {},
      { kind: 'Value', value: {} },
      { kind: 'Null' },
      { ...value, lower: { value: 9007199254740993, inclusive: true } },
      { ...value, lower: { value: 9007199254740993n, inclusive: 'true' } },
      { lower: { value: 1n, inclusive: true }, upper: { value: 9n, inclusive: false } },
      { empty: false, lower: { value: 1n, inclusive: true }, upper: { value: 9n } },
      {
        empty: 'false',
        lower: { value: 1n, inclusive: true },
        upper: { value: 9n, inclusive: false },
      },
      // A bound is an object with a value and its inclusivity, never a bare value or a null one.
      { ...value, lower: 9007199254740993n },
      { ...value, lower: { value: null, inclusive: true } },
      { ...value, lower: { inclusive: true } },
      { ...value, lower: undefined },
      { empty: false, upper: { value: 9n, inclusive: false } },
      // The former flat shape is not a public value.
      { empty: false, lower: 1n, upper: 9n, lowerInclusive: true, upperInclusive: false },
      { empty: false, lower: null, upper: 9n, lowerInclusive: true, upperInclusive: false },
      'empty',
    ]
    for (const input of invalid)
      expectUndecidedOrRejected(
        () => evaluate(input, null, true),
        JSON.stringify(input, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
        ['bound', 'shape', 'present'],
      )
    // A bound outside int8 is sent as is, and int8range input rejects it with 22003 while
    // reading the value, before any CHECK can skip it.
    for (const input of [
      { ...value, lower: { value: 9223372036854775808n, inclusive: true } },
      { ...value, upper: { value: -9223372036854775809n, inclusive: false } },
    ]) {
      await expect(
        pg.query('SELECT $1::int8range', [
          `[${String(input.lower.value)},${String(input.upper.value)})`,
        ]),
      ).rejects.toMatchObject({ code: '22003' })
      for (const result of Object.values(evaluate(input, null, true)))
        expect(result).toEqual({ certain: true, error: '22003' })
    }
    // The former payloads are not public values.
    for (const input of [
      { kind: 'Value', value: {} },
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22000', 36) } },
      {
        kind: 'Value',
        value: {
          typeName: 'pg_catalog.int8range',
          elementType: 'pg_catalog.int8',
          elementKind: 3,
          empty: false,
          lowerInclusive: true,
          upperInclusive: false,
          bounds: [
            { kind: 'Int8', value: 1n },
            { kind: 'Int8', value: 9n },
          ],
        },
      },
    ])
      for (const bypass of [false, true])
        expect(() => evaluate(input, null, bypass)).toThrow(TypeError)
    const result = evaluate(null, null, true)
    expect(result.bound).toEqual({ certain: true, value: true })
    expect(result.shape).toEqual({ certain: true, value: null })
    expect(result.present).toEqual({ certain: true, value: false })
    // The server rejects a reversed range while reading the value, before any CHECK can skip it.
    for (const result of Object.values(
      evaluate(
        {
          ...value,
          lower: { value: 9n, inclusive: true },
          upper: { value: 1n, inclusive: false },
        },
        null,
        true,
      ),
    ))
      expect.soft(result).toEqual({ certain: true, error: '22000' })
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
    await writeGoModule(root, 'rangepayload')
    await writeFile(
      join(root, 'schema/public/range_test.go'),
      `package public
import("testing";checkruntime "rangepayload/schema/public/checkrust/checkruntime")
func TestPublicRanges(t *testing.T){
 expected:=int64(9007199254740993);bypass:=true
 value:=checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"pg_catalog.int8range",ElementType:"pg_catalog.int8",ElementKind:3,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740993},{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740999}}})
 input:=PublicRangePayloadsCheckInput{Span:KnownCheckValue(value),Expected:KnownCheckValue(&expected),Bypass:KnownCheckValue(&bypass)}
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangePayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range",c)}}
 bad:=value;bad.Value.TypeName="pg_catalog.int4range";input.Span=KnownCheckValue(bad)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangePayloadsChecks(input); if e != nil {panic(e)}; return r}(){if c.Constraint=="guarded" {if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy",c)}} else if c.Result.Certain {t.Fatal("wrong nominal identity",c)}}
 for _,kind:=range []checkruntime.ArrayElementKind{checkruntime.ArrayElementInt4,255} {bad=value;bad.Value.Bounds=append([]checkruntime.ArrayElement(nil),value.Value.Bounds...);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:kind,Int4:1};input.Span=KnownCheckValue(bad);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangePayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint!="guarded" && c.Result.Certain {t.Fatal("invalid bound",c)}}}
 partial:=value;partial.Value.Bounds=append([]checkruntime.ArrayElement(nil),value.Value.Bounds...);partial.Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown};input.Span=KnownCheckValue(partial)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangePayloadsChecks(input); if e != nil {panic(e)}; return r}(){if c.Constraint=="bound" {if c.Result.Certain {t.Fatal("partial bound",c)}} else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("partial structure",c)}}
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
