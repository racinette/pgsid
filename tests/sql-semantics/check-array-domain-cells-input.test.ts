import { expect, it } from 'vitest'
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
    const sample = () => ({
      kind: 'Value',
      value: {
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
            },
          },
          {
            kind: 'Array',
            value: {
              elementType: 'pg_catalog.int4',
              elementKind: 2,
              dimensions: [{ lower: -3, length: 1 }],
              elements: [{ kind: 'Int4', value: 30 }],
            },
          },
        ],
      },
    })
    const row = {
      expected_outer: 2,
      expected_inner: 2,
      expected_lower: 5,
      expected_first: 10,
      bypass: false,
    }
    const evaluate = (groups: unknown, extra: Record<string, unknown> = {}) =>
      generated.evaluatePublicNestedPlansChecks({ ...row, groups, ...extra }) as {
        constraint: string
        result: { certain: boolean; value?: boolean; error?: string }
      }[]
    for (const result of evaluate(sample()))
      expect(result.result, result.constraint + ': ' + JSON.stringify(result)).toMatchObject({
        certain: true,
        value: true,
      })
    for (const result of evaluate(null, {
      expected_outer: null,
      expected_inner: null,
      expected_lower: null,
      expected_first: null,
    }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    for (const result of evaluate({ kind: 'Unknown' })) expect(result.result.certain).toBe(false)
    for (const result of evaluate({ kind: 'Unknown' }, { bypass: true }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const withNull = sample()
    withNull.value.elements[0] = {
      kind: 'Null',
    } as unknown as (typeof withNull.value.elements)[number]
    for (const result of evaluate(withNull, {
      expected_inner: null,
      expected_lower: null,
      expected_first: null,
    }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const partial = sample()
    partial.value.elements[0]!.value.elements[0] = {
      kind: 'Unknown',
    } as unknown as (typeof partial.value.elements)[number]['value']['elements'][number]
    for (const result of evaluate(partial))
      expect(result.result.certain, result.constraint).toBe(result.constraint !== 'inner_first')
    const error = sample()
    error.value.elements[0]!.value.elements[0] = {
      kind: 'Error',
      value: { state: parseInt('22012', 36) },
    } as unknown as (typeof error.value.elements)[number]['value']['elements'][number]
    for (const result of evaluate(error))
      expect(result.result).toMatchObject({ certain: true, error: '22012' })
    for (const result of evaluate(error, { bypass: true }))
      expect(result.result).toMatchObject({ certain: true, value: true })
    const wrongIdentity = sample()
    wrongIdentity.value.elements[0]!.value.elementType = 'pg_catalog.text'
    const wrongFamily = sample()
    wrongFamily.value.elements[0]!.value.elementKind = 8
    const wrongShape = sample()
    wrongShape.value.elements[0]!.value.dimensions[0]!.length = 3
    const wrongPrimitive = sample()
    wrongPrimitive.value.elements[0]!.value.elements[0]!.value = 2 ** 40
    const cycle = sample()
    cycle.value.elements[0] = {
      kind: 'Array',
      value: cycle.value,
    } as unknown as (typeof cycle.value.elements)[number]
    for (const value of [wrongIdentity, wrongFamily, wrongShape, wrongPrimitive, cycle])
      for (const result of evaluate(value)) expect(result.result.certain).toBe(false)
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
 for _,result:=range EvaluatePublicNestedPlansChecks(nestedRow(sampleNested())) {if !result.Result.Certain || !result.Result.Value.Valid || !result.Result.Value.Value {t.Fatal("nested value",result)}}
 for mode:=0;mode<5;mode++ {
  value:=sampleNested()
  if mode==0 {value.Value.Elements[0].Array.ElementType="pg_catalog.text"}
  if mode==1 {value.Value.Elements[0].Array.ElementKind=8}
  if mode==2 {value.Value.Elements[0].Array.Dimensions[0].Length=3}
  if mode==3 {value.Value.Elements[0].Array.Elements[0].Int4=1099511627776}
  if mode==4 {value.Value.Elements[0].Array=value.Value}
  for _,result:=range EvaluatePublicNestedPlansChecks(nestedRow(value)) {if result.Result.Certain {t.Fatal("invalid nested input",mode,result)}}
 }
 value:=sampleNested()
 value.Value.Elements[0].Array.Elements[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementUnknown}
 for _,result:=range EvaluatePublicNestedPlansChecks(nestedRow(value)) {if result.Result.Certain!=(result.Constraint!="inner_first") {t.Fatal("partial nested input",result)}}
 value=sampleNested()
 value.Value.Elements[0].Array.Elements[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementError,Error:checkruntime.SqlError{State:3452582}}
 for _,result:=range EvaluatePublicNestedPlansChecks(nestedRow(value)) {if !result.Result.Certain || result.Result.Value.Error!="22012" {t.Fatal("nested error",result)}}
 row:=nestedRow(value);row.Bypass=KnownCheckValue(nestedBool(true))
 for _,result:=range EvaluatePublicNestedPlansChecks(row) {if !result.Result.Certain || !result.Result.Value.Valid || !result.Result.Value.Value {t.Fatal("skipped nested error",result)}}
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
