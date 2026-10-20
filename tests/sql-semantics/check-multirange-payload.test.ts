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

it('validates public multirange payloads, nominal subtype guards, partial finite bounds and lazy behavior in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-multirange-payload-')),
    run = promisify(execFile)
  try {
    const schema = `CREATE DOMAIN retained_range AS int8multirange;CREATE DOMAIN nested_range AS retained_range;
   CREATE TABLE multirange_payloads(span nested_range,expected bigint,bypass boolean,
   CONSTRAINT bound CHECK(lower(span) IS NOT DISTINCT FROM expected),
   CONSTRAINT shape CHECK(lower_inc(span) AND NOT upper_inc(span) AND NOT isempty(span)),
   CONSTRAINT present CHECK(span IS NOT NULL),
   CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE lower(span) IS NOT DISTINCT FROM expected END))`
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg)
    const ts = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains)
    const shifted = await PGlite.create()
    try {
      await shifted.exec(
        'CREATE TABLE discarded_catalog_slots(value text); DROP TABLE discarded_catalog_slots;',
      )
      await shifted.exec(schema)
      const other = await snapshotCatalog(shifted)
      expect(other.domains.find((d) => d.name === 'nested_range')!.oid).not.toBe(
        catalog.domains.find((d) => d.name === 'nested_range')!.oid,
      )
      expect(renderTypescriptSchemaCheckArtifacts(other.tables, other.domains).checks).toBe(
        ts.checks,
      )
    } finally {
      await shifted.close()
    }
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'multirangepayload/schema',
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
          .evaluatePublicMultirangePayloadsChecks({ span, expected, bypass })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const member = {
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
    const payload = {
      typeName: 'pg_catalog.int8multirange',
      rangeType: 'pg_catalog.int8range',
      elementType: 'pg_catalog.int8',
      elementKind: 3,
      ranges: [{ kind: 'Value', value: member }],
    }
    const value = { kind: 'Value', value: payload }
    for (const result of Object.values(evaluate(value)))
      expect(result).toEqual({ certain: true, value: true })
    expect(evaluate(value, 9007199254740994n).bound).toEqual({ certain: true, value: false })
    expect(evaluate(value, 9007199254740994n, true).guarded).toEqual({ certain: true, value: true })
    const invalid: unknown[] = [
      undefined,
      '{[1,9)}',
      1,
      {},
      { kind: 'Value', value: {} },
      { kind: 'Value', value: null },
      { kind: 'Error', value: { state: -1 } },
    ]
    for (const change of [
      { typeName: 'pg_catalog.int4multirange' },
      { rangeType: 'pg_catalog.int4range' },
      { ranges: null },
      { ranges: [{ kind: 'Null' }] },
      { ranges: [{ kind: 'Unknown' }] },
      { ranges: [{ kind: 'Value', value: { ...member, empty: true } }] },
      { ranges: [{ kind: 'Value', value: { ...member, typeName: 'pg_catalog.int4range' } }] },
      { elementType: 'pg_catalog.int4' },
      { elementKind: 2 },
      { typeName: 'bad\0name' },
      { elementType: '\ud800' },
    ])
      invalid.push({ kind: 'Value', value: { ...payload, ...change } })
    for (const change of [
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
      invalid.push({
        kind: 'Value',
        value: { ...payload, ranges: [{ kind: 'Value', value: { ...member, ...change } }] },
      })
    invalid.push({
      kind: 'Value',
      value: {
        ...payload,
        typeName: 'public.other',
        get ranges() {
          throw new Error('Wrong nominal identity must precede member copies')
        },
      },
    })
    invalid.push({
      kind: 'Value',
      value: {
        ...payload,
        ranges: [
          {
            kind: 'Value',
            value: {
              ...member,
              typeName: 'public.other_range',
              get bounds() {
                throw new Error('Wrong member identity must precede bound copies')
              },
            },
          },
        ],
      },
    })
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
      value: {
        ...payload,
        ranges: [
          {
            kind: 'Value',
            value: { ...member, bounds: [{ kind: 'Unknown' }, { kind: 'Int8', value: 9n }] },
          },
        ],
      },
    }
    expect(evaluate(partial).bound).toMatchObject({ certain: false })
    expect(evaluate(partial).shape).toEqual({ certain: true, value: true })
    expect(evaluate(partial).present).toEqual({ certain: true, value: true })
    const error = evaluate({ kind: 'Error', value: { state: parseInt('22012', 36) } }, null, true)
    expect(error.bound).toEqual({ certain: true, error: '22012' })
    expect(error.shape).toEqual({ certain: true, error: '22012' })
    expect(error.present).toEqual({ certain: true, error: '22012' })
    expect(error.guarded).toEqual({ certain: true, value: true })
    for (const [first, expectedError] of [
      [{ kind: 'Unknown' }, null],
      [{ kind: 'Null' }, null],
      [{ kind: 'Error', value: { state: parseInt('22012', 36) } }, '22012'],
    ] as const) {
      const result = evaluate(
        {
          kind: 'Value',
          value: {
            ...payload,
            ranges: [first, { kind: 'Error', value: { state: parseInt('22003', 36) } }],
          },
        },
        null,
        true,
      )
      if (expectedError === null) expect(result.bound).toMatchObject({ certain: false })
      else expect(result.bound).toEqual({ certain: true, error: expectedError })
      expect(result.guarded).toEqual({ certain: true, value: true })
    }
    await pg.query(
      "INSERT INTO multirange_payloads VALUES('{[9007199254740993,9007199254740999)}'::int8multirange,$1,false)",
      [9007199254740993n],
    )
    await expect(
      pg.query(
        "INSERT INTO multirange_payloads VALUES('{[9007199254740993,9007199254740999)}'::int8multirange,$1,false)",
        [9007199254740994n],
      ),
    ).rejects.toMatchObject({ code: '23514' })
    await writeFile(join(root, 'go.mod'), 'module multirangepayload\n\ngo 1.25\n')
    await writeFile(
      join(root, 'schema/public/range_test.go'),
      `package public
import("testing";checkruntime "multirangepayload/schema/public/checkrust/checkruntime")
func TestPublicMultiranges(t *testing.T){
 expected:=int64(9007199254740993);bypass:=true
 span:=checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"pg_catalog.int8range",ElementType:"pg_catalog.int8",ElementKind:3,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740993},{Kind:checkruntime.ArrayElementInt8,Int8:9007199254740999}}})
 value:=checkruntime.MakeCoercedMultirangeValue(checkruntime.MultirangePayload{TypeName:"pg_catalog.int8multirange",RangeType:"pg_catalog.int8range",ElementType:"pg_catalog.int8",ElementKind:3,Ranges:[]checkruntime.RangeValue{span}})
 input:=PublicMultirangePayloadsCheckInput{Span:KnownCheckValue(value),Expected:KnownCheckValue(&expected),Bypass:KnownCheckValue(&bypass)}
 for _,c:=range EvaluatePublicMultirangePayloadsChecks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range",c)}}
 bad:=value;bad.Value.TypeName="pg_catalog.int4multirange";input.Span=KnownCheckValue(bad)
 for _,c:=range EvaluatePublicMultirangePayloadsChecks(input){if c.Constraint=="guarded" {if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy",c)}} else if c.Result.Certain {t.Fatal("wrong nominal identity",c)}}
 for _,kind:=range []checkruntime.ArrayElementKind{checkruntime.ArrayElementInt4,255} {bad=value;bad.Value.Ranges=append([]checkruntime.RangeValue(nil),value.Value.Ranges...);bad.Value.Ranges[0].Value.Bounds=append([]checkruntime.ArrayElement(nil),span.Value.Bounds...);bad.Value.Ranges[0].Value.Bounds[0]=checkruntime.ArrayElement{Kind:kind,Int4:1};input.Span=KnownCheckValue(bad);for _,c:=range EvaluatePublicMultirangePayloadsChecks(input){if c.Constraint!="guarded" && c.Result.Certain {t.Fatal("invalid bound",c)}}}
 partial:=value;partial.Value.Ranges=append([]checkruntime.RangeValue(nil),value.Value.Ranges...);partial.Value.Ranges[0].Value.Bounds=append([]checkruntime.ArrayElement(nil),span.Value.Bounds...);partial.Value.Ranges[0].Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown};input.Span=KnownCheckValue(partial)
 for _,c:=range EvaluatePublicMultirangePayloadsChecks(input){if c.Constraint=="bound" {if c.Result.Certain {t.Fatal("partial bound",c)}} else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("partial structure",c)}}
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
