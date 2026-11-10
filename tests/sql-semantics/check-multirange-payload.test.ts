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
import {
  multirangeTypescriptInput,
  type MultirangeInputPayload,
} from '../../tools/check-rust/multirange-input.js'
import { serverCheckResults } from '../support/check-server-results.js'
import { internalCheckRows } from '../support/check-entries.js'

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
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
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
    const range = (
      lower: unknown,
      upper: unknown,
      lowerInclusive = true,
      upperInclusive = false,
    ) => ({
      empty: false,
      lower,
      upper,
      lowerInclusive,
      upperInclusive,
    })
    const value = [range(9007199254740993n, 9007199254740999n)]
    // Public multiranges are compared against what the server makes of the same value.
    for (const [span, text, expected, bypass] of [
      [value, '{[9007199254740993,9007199254740999)}', 9007199254740993n, false],
      [value, '{[9007199254740993,9007199254740999)}', 9007199254740994n, false],
      [value, '{[9007199254740993,9007199254740999)}', 9007199254740994n, true],
      // Members are canonicalized, sorted and merged, and empty members dropped, on input.
      [
        [
          range(9007199254740995n, 9007199254740999n),
          range(9007199254740992n, 9007199254740996n, false, true),
        ],
        '{[9007199254740995,9007199254740999),(9007199254740992,9007199254740996]}',
        9007199254740993n,
        false,
      ],
      [
        [range(5n, 5n), range(9007199254740993n, null)],
        '{[5,5),[9007199254740993,)}',
        9007199254740993n,
        false,
      ],
      [[{ empty: true }], '{empty}', null, false],
      [[], '{}', null, false],
      [[range(9n, 1n)], '{[9,1)}', null, false],
      [[range(null, 9n, true, true)], '{[,9]}', null, false],
      [null, null, null, true],
    ] as const) {
      const shown = JSON.stringify({ span, expected, bypass }, (_, item: unknown) =>
        typeof item === 'bigint' ? `${item}n` : item,
      )
      expect({ shown, results: evaluate(span, expected, bypass) }).toEqual({
        shown,
        results: await serverCheckResults(pg, 'multirange_payloads', {
          span: text,
          expected: expected === null ? null : String(expected),
          bypass: String(bypass),
        }),
      })
    }
    for (const result of Object.values(evaluate(value)))
      expect(result).toEqual({ certain: true, value: true })
    expect(evaluate(value, 9007199254740994n).bound).toEqual({ certain: true, value: false })
    expect(evaluate(value, 9007199254740994n, true).guarded).toEqual({ certain: true, value: true })
    // A missing value decides nothing that reads it.
    expectUndecidedOrRejected(() => evaluate(undefined, null, true), undefined, [
      'bound',
      'shape',
      'present',
    ])
    expect(evaluate(undefined, null, true).guarded).toEqual({ certain: true, value: true })
    // A bound outside int8 is sent as is, and int8multirange input rejects it with 22003 while
    // reading the value, before any CHECK can skip it.
    await expect(
      pg.query('SELECT $1::int8multirange', ['{[9223372036854775808,9)}']),
    ).rejects.toMatchObject({ code: '22003' })
    for (const result of Object.values(evaluate([range(9223372036854775808n, 9n)], null, true)))
      expect(result).toEqual({ certain: true, error: '22003' })
    // Payloads and malformed public values are type errors before any check runs.
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
    const invalid: unknown[] = [
      '{[1,9)}',
      1,
      {},
      range(1n, 9n),
      [null],
      [undefined],
      [[range(1n, 9n)]],
      [{ empty: 'false' }],
      [{ empty: false }],
      [{ ...range(1n, 9n), lowerInclusive: 'true' }],
      [{ ...range(1n, 9n), lower: undefined }],
      [range(1, 9n)],
      [range(9007199254740993, 9n)],
      [range('1', 9n)],
      [{ kind: 'Value', value: member }],
      { kind: 'Value', value: {} },
      { kind: 'Value', value: null },
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Value', value: payload },
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
    for (const [index, input] of invalid.entries())
      expect(() => evaluate(input, null, true), `invalid input ${index}`).toThrow(TypeError)
    // States no public value expresses go to the evaluator entries directly: members and bounds
    // that are unknown or failed, and nominal identities other than the column's.
    const multirange = (input: MultirangeInputPayload): unknown =>
      runtime.makeCoercedMultirangeValue(multirangeTypescriptInput(input, runtime))
    const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
    const rows = (span: unknown, expected: bigint | null = 9007199254740993n, bypass = false) =>
      internal('public.multirange_payloads', {
        span,
        expected: expected === null ? runtime.int8Null() : runtime.makeInt8Value(expected),
        bypass: runtime.makeBoolValue(bypass),
      })
    const undecided = (outcome: unknown) =>
      expect(['Unknown', 'Unimplemented']).toContain((outcome as { kind: string }).kind)
    expect(rows(multirange(payload as MultirangeInputPayload))).toEqual({
      bound: { kind: 'True' },
      shape: { kind: 'True' },
      present: { kind: 'True' },
      guarded: { kind: 'True' },
    })
    for (const change of [
      { typeName: 'pg_catalog.int4multirange' },
      { ranges: [{ kind: 'Null' }] },
      { ranges: [{ kind: 'Unknown' }] },
      { ranges: [{ kind: 'Value', value: { ...member, typeName: 'pg_catalog.int4range' } }] },
      { elementType: 'pg_catalog.int4' },
    ]) {
      const result = rows(
        multirange({ ...payload, ...change } as MultirangeInputPayload),
        null,
        true,
      )
      for (const name of ['bound', 'shape', 'present']) undecided(result[name])
      expect(result['guarded']).toEqual({ kind: 'True' })
    }
    const partial = rows(
      multirange({
        ...payload,
        ranges: [
          {
            kind: 'Value',
            value: { ...member, bounds: [{ kind: 'Unknown' }, { kind: 'Int8', value: 9n }] },
          },
        ],
      } as MultirangeInputPayload),
    )
    undecided(partial['bound'])
    expect(partial['shape']).toEqual({ kind: 'True' })
    expect(partial['present']).toEqual({ kind: 'True' })
    const error = rows(failure('22012'), null, true)
    expect(error['bound']).toEqual(failure('22012'))
    expect(error['shape']).toEqual(failure('22012'))
    expect(error['present']).toEqual(failure('22012'))
    expect(error['guarded']).toEqual({ kind: 'True' })
    for (const [first, expectedError] of [
      [{ kind: 'Unknown' }, null],
      [{ kind: 'Null' }, null],
      [failure('22012'), '22012'],
    ] as const) {
      const result = rows(
        multirange({ ...payload, ranges: [first, failure('22003')] } as MultirangeInputPayload),
        null,
        true,
      )
      if (expectedError === null) undecided(result['bound'])
      else expect(result['bound']).toEqual(failure(expectedError))
      expect(result['guarded']).toEqual({ kind: 'True' })
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
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicMultirangePayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range",c)}}
 bad:=value;bad.Value.TypeName="pg_catalog.int4multirange";input.Span=KnownCheckValue(bad)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicMultirangePayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint=="guarded" {if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy",c)}} else if c.Result.Certain {t.Fatal("wrong nominal identity",c)}}
 for _,kind:=range []checkruntime.ArrayElementKind{checkruntime.ArrayElementInt4,255} {bad=value;bad.Value.Ranges=append([]checkruntime.RangeValue(nil),value.Value.Ranges...);bad.Value.Ranges[0].Value.Bounds=append([]checkruntime.ArrayElement(nil),span.Value.Bounds...);bad.Value.Ranges[0].Value.Bounds[0]=checkruntime.ArrayElement{Kind:kind,Int4:1};input.Span=KnownCheckValue(bad);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicMultirangePayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint!="guarded" && c.Result.Certain {t.Fatal("invalid bound",c)}}}
 partial:=value;partial.Value.Ranges=append([]checkruntime.RangeValue(nil),value.Value.Ranges...);partial.Value.Ranges[0].Value.Bounds=append([]checkruntime.ArrayElement(nil),span.Value.Bounds...);partial.Value.Ranges[0].Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown};input.Span=KnownCheckValue(partial)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicMultirangePayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint=="bound" {if c.Result.Certain {t.Fatal("partial bound",c)}} else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("partial structure",c)}}
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
