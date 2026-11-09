import { expect, it } from 'vitest'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { internalCheckRows, storedOrRejected } from '../support/check-entries.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { domainElementType } from '../../src/sql-semantics/expressions.js'
import { arrayIdentityPlan } from '../../src/codegen/shared/check-array-types.js'
import { parseConfigString } from '../../src/config/loader.js'

it('validates nested domain array identities and owned payloads in public Go and TypeScript inputs', async () => {
  const pg = await PGlite.create()
  const root = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-cell-input-'))
  const run = promisify(execFile)
  try {
    const schema = `CREATE DOMAIN slot_group AS integer[] CHECK(cardinality(VALUE)>0);
      CREATE TABLE nested_plans(groups slot_group[],expected_outer integer,expected_inner integer,expected_lower integer,expected_first integer,bypass boolean,
      CONSTRAINT outer_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups) IS NOT DISTINCT FROM expected_outer END),
      CONSTRAINT inner_count CHECK(CASE WHEN bypass THEN true ELSE cardinality(groups[1]) IS NOT DISTINCT FROM expected_inner END),
      CONSTRAINT inner_lower CHECK(CASE WHEN bypass THEN true ELSE array_lower(groups[1],1) IS NOT DISTINCT FROM expected_lower END),
      CONSTRAINT inner_first CHECK(CASE WHEN bypass THEN true ELSE (groups[1])[5] IS NOT DISTINCT FROM expected_first END));`
    await pg.exec(schema)
    await pg.exec(
      `INSERT INTO nested_plans VALUES(ARRAY['[5:6]={10,20}'::slot_group,'[-3:-3]={30}'::slot_group],2,2,5,10,false)`,
    )
    await pg.exec('INSERT INTO nested_plans VALUES(NULL,NULL,NULL,NULL,NULL,false)')
    await expect(
      pg.exec(
        `INSERT INTO nested_plans VALUES(ARRAY['[5:6]={10,20}'::slot_group,'[-3:-3]={30}'::slot_group],3,2,5,10,false)`,
      ),
    ).rejects.toMatchObject({ code: '23514' })
    const catalog = await snapshotCatalog(pg)
    const elementType = domainElementType(
      { schema: 'public', name: 'slot_group' },
      'array:pg_catalog.int4',
    )
    const plan = arrayIdentityPlan('array:' + elementType)!
    expect(plan.types.split('\0')).toEqual([elementType, 'pg_catalog.int4'])
    expect([...plan.kinds].map((value) => value.codePointAt(0))).toEqual([41, 2])
    const typescript = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains, [], {
      enums: catalog.enums,
    })
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(root, 'schema'),
      'nestedinput/schema',
    )
    expect(go.diagnostics).toEqual([])
    await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), typescript.checks)
    for (const artifact of checkTypescriptArtifacts(typescript.rustFiles!)) {
      const target = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, artifact.content)
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
    ]).catch((error) => {
      throw new Error(error.stdout + error.stderr)
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(typescript.checks, runtime)
    const sample = () => ({
      elementType,
      elementKind: 41,
      dimensions: [{ lower: 1, length: 2 }],
      elements: [
        {
          kind: 'Array',
          value: {
            elementType: 'pg_catalog.int4',
            elementKind: 2,
            dimensions: [{ lower: 5, length: 2 }],
            elements: [
              { kind: 'Int4', value: 10 },
              { kind: 'Int4', value: 20 },
            ],
            nullBitmap: { kind: 'Value', value: false },
          },
        },
        {
          kind: 'Array',
          value: {
            elementType: 'pg_catalog.int4',
            elementKind: 2,
            dimensions: [{ lower: -3, length: 1 }],
            elements: [{ kind: 'Int4', value: 30 }],
            nullBitmap: { kind: 'Value', value: false },
          },
        },
      ],
      nullBitmap: { kind: 'Value', value: false },
    })
    const row = {
      expected_outer: 2,
      expected_inner: 2,
      expected_lower: 5,
      expected_first: 10,
      bypass: false,
    }
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (groups: unknown, extra: Record<string, unknown> = {}) =>
      generated.evaluatePublicNestedPlansChecks({ ...row, groups, ...extra }) as {
        constraint: string
        result: Result
      }[]
    for (const result of evaluate(null, {
      expected_outer: null,
      expected_inner: null,
      expected_lower: null,
      expected_first: null,
    }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    for (const result of evaluate(undefined)) expect(result.result.certain).toBe(false)
    for (const result of evaluate(undefined, { bypass: true }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    // The column declares one dimension, so each element of the outer list is one group, itself a
    // list, and the server reads each as quoted array text with the domain's check applied.
    const mismatches: ReturnType<typeof differingChecks> = []
    for (const [groups, text, extra] of [
      [
        [],
        '{}',
        { expected_outer: 0, expected_inner: null, expected_lower: null, expected_first: null },
      ],
      [
        [null, null],
        '{NULL,NULL}',
        { expected_inner: null, expected_lower: null, expected_first: null },
      ],
      [[null, null], '{NULL,NULL}', {}],
      [
        [
          [10, 20],
          [30, 40],
        ],
        '{"{10,20}","{30,40}"}',
        {},
      ],
      [
        [
          [10, 20],
          [30, 40],
        ],
        '{"{10,20}","{30,40}"}',
        { bypass: true },
      ],
      [[[10]], '{"{10}"}', { bypass: true }],
      [[[10], []], '{"{10}","{}"}', {}],
      [[[10], null], '{"{10}",NULL}', { expected_outer: 2, expected_inner: 1, expected_lower: 1 }],
    ] as const) {
      const local = Object.fromEntries(
        evaluate(groups, extra).map((item) => [item.constraint, item.result]),
      )
      const values: Record<string, unknown> = { ...row, ...extra }
      mismatches.push(
        ...differingChecks(
          JSON.stringify({ groups, extra }),
          local,
          await serverCheckResults(pg, 'nested_plans', {
            groups: text,
            ...Object.fromEntries(
              Object.entries(values).map(([name, value]) => [
                name,
                value === null ? null : String(value),
              ]),
            ),
          }),
        ),
      )
    }
    expect.soft(mismatches).toEqual([])
    // The former payloads are not public values.
    for (const value of [
      { kind: 'Value', value: sample() },
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      sample(),
    ])
      expect(() => evaluate(value), JSON.stringify(value)).toThrow(TypeError)
    // Former cells inside a list are malformed elements, which never decide a check.
    for (const value of [
      [{ kind: 'Array', value: sample().elements[0]!.value }],
      [{ kind: 'Int4', value: 10 }],
    ])
      expectUndecidedOrRejected(() => evaluate(value), JSON.stringify(value))
    // Inner arrays not starting at 1, unknown or failed cells and stored values of other types go
    // to the evaluator entries directly.
    const outcome = (result: unknown): Result => {
      const kind = (result as { kind: string }).kind
      return kind === 'True' || kind === 'False' || kind === 'Null'
        ? { certain: true, value: kind === 'Null' ? null : kind === 'True' }
        : kind === 'Error'
          ? {
              certain: true,
              error: (result as { value: { state: number } }).value.state
                .toString(36)
                .toUpperCase()
                .padStart(5, '0'),
            }
          : { certain: false }
    }
    const stored = (groups: unknown, extra: Record<string, unknown> = {}) => {
      const values: Record<string, unknown> = { ...row, ...extra }
      return Object.entries(
        internal('public.nested_plans', {
          groups:
            groups && typeof groups === 'object' && 'elementType' in groups
              ? runtime.makeArrayValue(groups)
              : groups,
          ...Object.fromEntries(
            Object.entries(values).map(([name, value]) => [
              name,
              value === null
                ? name === 'bypass'
                  ? runtime.boolNull()
                  : runtime.int4Null()
                : name === 'bypass'
                  ? runtime.makeBoolValue(value)
                  : runtime.makeInt4Value(value),
            ]),
          ),
        }),
      ).map(([constraint, result]) => ({ constraint, result: outcome(result) }))
    }
    for (const result of stored(sample()))
      expect(result.result, result.constraint + ': ' + JSON.stringify(result)).toMatchObject({
        certain: true,
        value: true,
      })
    for (const result of stored(runtime.arrayNull(), {
      expected_outer: null,
      expected_inner: null,
      expected_lower: null,
      expected_first: null,
    }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    for (const result of stored(runtime.arrayUnknown())) expect(result.result.certain).toBe(false)
    for (const result of stored(runtime.arrayUnknown(), { bypass: true }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const withNull = sample()
    withNull.elements[0] = { kind: 'Null' } as unknown as (typeof withNull.elements)[number]
    withNull.nullBitmap.value = true
    for (const result of stored(withNull, {
      expected_inner: null,
      expected_lower: null,
      expected_first: null,
    }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const partial = sample()
    partial.elements[0]!.value.elements[0] = {
      kind: 'Unknown',
    } as unknown as (typeof partial.elements)[number]['value']['elements'][number]
    for (const result of stored(partial))
      expect(result.result.certain, result.constraint).toBe(result.constraint !== 'inner_first')
    const error = sample()
    error.elements[0]!.value.elements[0] = {
      kind: 'Error',
      value: { state: parseInt('22012', 36) },
    } as unknown as (typeof error.elements)[number]['value']['elements'][number]
    for (const result of stored(error))
      expect(result.result).toMatchObject({ certain: true, error: '22012' })
    for (const result of stored(error, { bypass: true }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const wrongIdentity = sample()
    wrongIdentity.elements[0]!.value.elementType = 'pg_catalog.text'
    const wrongFamily = sample()
    wrongFamily.elements[0]!.value.elementKind = 8
    const wrongShape = sample()
    wrongShape.elements[0]!.value.dimensions[0]!.length = 3
    const wrongPrimitive = sample()
    wrongPrimitive.elements[0]!.value.elements[0]!.value = 2 ** 40
    // A stored value no column could hold is rejected as it is built or decides nothing.
    for (const value of [wrongFamily, wrongShape, wrongPrimitive]) {
      const results = storedOrRejected(() => stored(value))
      if (results)
        for (const result of results)
          expect(result.result, JSON.stringify(value) + ' ' + result.constraint).toEqual({
            certain: false,
          })
    }
    // The stored inner array's type name is not read, so it decides only what the well-formed
    // value decides.
    const wellFormed = stored(sample())
    const renamed = storedOrRejected(() => stored(wrongIdentity))
    if (renamed)
      for (const [index, result] of renamed.entries())
        if (result.result.certain)
          expect(result.result, result.constraint).toEqual(wellFormed[index]!.result)
    // A cyclic payload is no value at all: it never reaches a check.
    const cycle = sample()
    cycle.elements[0] = {
      kind: 'Array',
      value: cycle,
    } as unknown as (typeof cycle.elements)[number]
    expect(() => evaluate(cycle)).toThrow(TypeError)
    expect(() => evaluate({ kind: 'Value', value: cycle })).toThrow(TypeError)
    expect(storedOrRejected(() => stored(cycle))).toBeUndefined()
    await writeFile(
      join(root, 'go.mod'),
      'module nestedinput\n\ngo 1.25\n\nrequire (\n github.com/jackc/pgx/v5 v5.10.0\n github.com/shopspring/decimal v1.4.0\n)\n',
    )
    await writeFile(
      join(root, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(root, 'schema/public/checks_test.go'),
      `package public
import("testing";"nestedinput/schema/public/checkrust/checkruntime")
func sampleNested() checkruntime.ArrayValue {
 first:=checkruntime.MakeArrayArguments("pg_catalog.int4",2)
 first=checkruntime.AppendArrayDimension(first,5,2)
 first=checkruntime.AppendArrayArgument(first,checkruntime.ArrayElementFromInt4(checkruntime.MakeInt4Value(10)))
 first=checkruntime.AppendArrayArgument(first,checkruntime.ArrayElementFromInt4(checkruntime.MakeInt4Value(20)))
 second:=checkruntime.MakeArrayArguments("pg_catalog.int4",2)
 second=checkruntime.AppendArrayDimension(second,-3,1)
 second=checkruntime.AppendArrayArgument(second,checkruntime.ArrayElementFromInt4(checkruntime.MakeInt4Value(30)))
 outer:=checkruntime.MakeArrayArguments(${JSON.stringify(elementType)},41)
 outer=checkruntime.AppendArrayDimension(outer,1,2)
 outer=checkruntime.AppendArrayArgument(outer,checkruntime.ArrayElementFromArray(checkruntime.FinishArrayArguments(first)))
 outer=checkruntime.AppendArrayArgument(outer,checkruntime.ArrayElementFromArray(checkruntime.FinishArrayArguments(second)))
 return checkruntime.FinishArrayArguments(outer)
}
func nestedInt(value int32) *int32 {return &value}
func nestedBool(value bool) *bool {return &value}
func nestedRow(value checkruntime.ArrayValue) PublicNestedPlansCheckInput {
 return PublicNestedPlansCheckInput{Groups:KnownCheckValue(value),ExpectedOuter:KnownCheckValue(nestedInt(2)),ExpectedInner:KnownCheckValue(nestedInt(2)),ExpectedLower:KnownCheckValue(nestedInt(5)),ExpectedFirst:KnownCheckValue(nestedInt(10)),Bypass:KnownCheckValue(nestedBool(false))}
}
func TestNestedPublicInputs(t *testing.T) {
 for _,result:=range func() []CheckEvaluation {r, e := EvaluatePublicNestedPlansChecks(nestedRow(sampleNested())); if e != nil {panic(e)}; return r}() {if !result.Result.Certain || !result.Result.Value.Valid || !result.Result.Value.Value {t.Fatal("nested value",result)}}
 for mode:=0;mode<5;mode++ {
  value:=sampleNested()
  if mode==0 {value.Value.Elements[0].Array.ElementType="pg_catalog.text"}
  if mode==1 {value.Value.Elements[0].Array.ElementKind=8}
  if mode==2 {value.Value.Elements[0].Array.Dimensions[0].Length=3}
  if mode==3 {value.Value.Elements[0].Array.Elements[0].Int4=1099511627776}
  if mode==4 {value.Value.Elements[0].Array=value.Value}
  for _,result:=range func() []CheckEvaluation {r, e := EvaluatePublicNestedPlansChecks(nestedRow(value)); if e != nil {return nil}; return r}() {if result.Result.Certain {t.Fatal("invalid nested input",mode,result)}}
 }
 value:=sampleNested()
 value.Value.Elements[0].Array.Elements[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown}
 for _,result:=range func() []CheckEvaluation {r, e := EvaluatePublicNestedPlansChecks(nestedRow(value)); if e != nil {return nil}; return r}() {if result.Result.Certain!=(result.Constraint!="inner_first") {t.Fatal("partial nested input",result)}}
 value=sampleNested()
 value.Value.Elements[0].Array.Elements[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementError,Error:checkruntime.SqlError{State:3452582}}
 for _,result:=range func() []CheckEvaluation {r, e := EvaluatePublicNestedPlansChecks(nestedRow(value)); if e != nil {panic(e)}; return r}() {if !result.Result.Certain || result.Result.Value.Error!="22012" {t.Fatal("nested error",result)}}
 row:=nestedRow(value);row.Bypass=KnownCheckValue(nestedBool(true))
 for _,result:=range func() []CheckEvaluation {r, e := EvaluatePublicNestedPlansChecks(row); if e != nil {panic(e)}; return r}() {if !result.Result.Certain || !result.Result.Value.Valid || !result.Result.Value.Value {t.Fatal("skipped nested error",result)}}
}`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch((error) => {
      throw new Error(error.stdout + error.stderr)
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)
