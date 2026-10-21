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
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { rangeGoInput } from '../../tools/check-rust/range-input.js'
import { multirangeGoInput } from '../../tools/check-rust/multirange-input.js'
import { arrayGoInput, type OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'

it('attaches compiled enum definitions before public range, multirange and recursive array validation in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-enum-range-payload-')),
    run = promisify(execFile)
  try {
    const schema = `CREATE TYPE public.stage_label AS ENUM('z','a');ALTER TYPE public.stage_label ADD VALUE 'mid' BEFORE 'a';
      CREATE TYPE public.stage_span AS RANGE(subtype=public.stage_label,multirange_type_name=stage_set);
      CREATE DOMAIN public.stage_history AS public.stage_span[];
      CREATE TABLE enum_payloads(v stage_span,w stage_span,m stage_set,items stage_span[],nested stage_history[],bypass bool,
        CONSTRAINT ordered CHECK(CASE WHEN bypass THEN true ELSE v<w END),
        CONSTRAINT contained CHECK(CASE WHEN bypass THEN true ELSE m @> v END),
        CONSTRAINT position CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END),
        CONSTRAINT nested_order CHECK(CASE WHEN bypass THEN true ELSE array_sort(nested)=nested END),
        CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE v::text='[z,mid]' END));`
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg),
      p = customRangeProfiles(catalog)[0]!,
      context = { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const }
    const options = {
      enums: catalog.enums,
      rangeTypes: catalog.rangeTypes,
      executionContext: context,
    }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      options,
    )
    const shifted = await PGlite.create()
    try {
      await shifted.exec('CREATE TABLE discarded(v text);DROP TABLE discarded;' + schema)
      const other = await snapshotCatalog(shifted)
      expect(other.enums[0]!.valueOids).not.toEqual(catalog.enums[0]!.valueOids)
      expect(
        renderTypescriptSchemaCheckArtifacts(other.tables, other.domains, other.domains, {
          enums: other.enums,
          rangeTypes: other.rangeTypes,
          executionContext: context,
        }),
      ).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'enumpublic/schema',
    )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of [
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        ...a,
        path: join(root, 'checks-rust', a.path),
      })),
      ...generatedGo.artifacts,
    ]) {
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
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const first = '[z,mid]',
      last = '[mid,a]',
      multi = `{${first},${last}}`,
      array = rangeArrayText([first, null, last], -2)
    const v = (await readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [
        first,
      ]))!,
      w = (await readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [
        last,
      ]))!,
      m = (await readMultirangeFixture(pg, p.multirangeType, multi))!,
      items = (await readRangeArrayFixture(pg, p.rangeType, array))!
    const nested: OwnedArrayInputPayload = {
      elementType: '"public"."stage_history"',
      elementKind: 41,
      dimensions: [{ lower: 1, length: 2 }],
      elements: [{ kind: 'Array', value: structuredClone(items) }, { kind: 'Null' }],
      nullBitmap: { kind: 'Value', value: true },
    }
    const row = {
      v: { kind: 'Value', value: v },
      w: { kind: 'Value', value: w },
      m: { kind: 'Value', value: m },
      items: { kind: 'Value', value: items },
      nested: { kind: 'Value', value: nested },
      bypass: false,
    }
    const map = (row: unknown) =>
      Object.fromEntries(
        (
          generated.evaluatePublicEnumPayloadsChecks(row) as {
            constraint: string
            result: { certain: boolean; value?: boolean | null }
          }[]
        ).map((c) => [c.constraint, c.result]),
      )
    for (const forge of [false, true]) {
      const candidate = structuredClone(row)
      const edit = (value: unknown): void => {
        if (!value || typeof value !== 'object') return
        if ('enumLabels' in value) {
          if (forge) {
            Object.assign(value, {
              enumLabels: 'forged',
              enumCount: 999,
              support: { comparison: 99, canonical: 99 },
            })
          } else {
            Reflect.deleteProperty(value, 'enumLabels')
            Reflect.deleteProperty(value, 'enumCount')
          }
        }
        for (const child of Object.values(value))
          if (Array.isArray(child)) child.forEach(edit)
          else edit(child)
      }
      edit(candidate)
      const before = structuredClone(candidate)
      for (const result of Object.values(map(candidate)))
        expect(result).toEqual({ certain: true, value: true })
      expect(candidate).toEqual(before)
      const bad = structuredClone(candidate)
      bad.v.value.bounds[0] = { kind: 'Enum', value: { ordinal: 3, labelOid: 0n } }
      expect(map(bad).ordered).toMatchObject({ certain: false })
      for (const result of Object.values(map({ ...bad, bypass: true })))
        expect(result).toEqual({ certain: true, value: true })
      const wrong = structuredClone(candidate)
      wrong.v.value.elementType = 'public.other_label'
      expect(map(wrong).ordered).toMatchObject({ certain: false })
    }
    await pg.query(
      'INSERT INTO enum_payloads VALUES($1,$2,$3,$4::stage_span[],ARRAY[($4::stage_span[])::stage_history,NULL::stage_history],false)',
      [first, last, multi, array],
    )
    await expect(
      pg.query(
        'INSERT INTO enum_payloads VALUES($1,$2,$3,$4::stage_span[],ARRAY[($4::stage_span[])::stage_history,NULL::stage_history],false)',
        [last, first, multi, array],
      ),
    ).rejects.toMatchObject({ code: '23514' })
    const known = (value: ReturnType<typeof go.ident>) =>
      go.call(go.ident('KnownCheckValue'), [value])
    await writeFile(
      join(root, 'schema/public/enum_fixture_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'enumpublic/schema/public/checkrust/checkruntime' },
        ],
        declarations: [
          {
            kind: 'function',
            name: 'enumFixture',
            parameters: [],
            results: [{ type: go.ident('PublicEnumPayloadsCheckInput') }],
            body: [
              {
                kind: 'assign',
                targets: [go.ident('bypass')],
                expressions: [go.ident('false')],
                operator: ':=',
              },
              {
                kind: 'return',
                expressions: [
                  go.composite(go.ident('PublicEnumPayloadsCheckInput'), [
                    go.keyValue('V', known(rangeGoInput(v))),
                    go.keyValue('W', known(rangeGoInput(w))),
                    go.keyValue('M', known(multirangeGoInput(m))),
                    go.keyValue('Items', known(arrayGoInput(items))),
                    go.keyValue('Nested', known(arrayGoInput(nested))),
                    go.keyValue('Bypass', known(go.address(go.ident('bypass')))),
                  ]),
                ],
              },
            ],
          },
        ],
      }),
    )
    await writeFile(
      join(root, 'schema/public/enum_payload_test.go'),
      `package public
import("testing";"reflect";checkruntime "enumpublic/schema/public/checkrust/checkruntime")
func forgeEnumSpan(span checkruntime.RangeValue)checkruntime.RangeValue{span.Value.EnumLabels="forged";span.Value.EnumCount=999;span.Value.Support=checkruntime.MakeRangeSupport(99,99);return span}
func forgeEnumArray(input checkruntime.ArrayValue)checkruntime.ArrayValue{for i,cell:=range input.Value.Elements{if cell.Kind==checkruntime.ArrayElementRange{input.Value.Elements[i].Range=forgeEnumSpan(checkruntime.RangeValue{Kind:checkruntime.RangeValueValue,Value:cell.Range}).Value};if cell.Kind==checkruntime.ArrayElementArray{input.Value.Elements[i].Array=forgeEnumArray(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:cell.Array}).Value}};return input}
func TestEnumPayload(t *testing.T){
row:=enumFixture();row.V.V=forgeEnumSpan(row.V.V);row.W.V=forgeEnumSpan(row.W.V);for i,span:=range row.M.V.Value.Ranges{row.M.V.Value.Ranges[i]=forgeEnumSpan(span)};row.M.V.Value.Support=checkruntime.MakeRangeSupport(99,99);row.Items.V=forgeEnumArray(row.Items.V);row.Nested.V=forgeEnumArray(row.Nested.V)
before:=enumFixture();before.V.V=checkruntime.CopyRangeValue(row.V.V);before.W.V=checkruntime.CopyRangeValue(row.W.V);before.M.V=checkruntime.CopyMultirangeValue(row.M.V);before.Items.V=checkruntime.CopyArrayValue(row.Items.V);before.Nested.V=checkruntime.CopyArrayValue(row.Nested.V)
for _,c:=range EvaluatePublicEnumPayloadsChecks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("compiled definition",c)}}
if !reflect.DeepEqual(row,before){t.Fatal("input mutated")}
bad:=checkruntime.CopyRangeValue(row.V.V);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:3,LabelOid:0}};row.V=KnownCheckValue(bad)
for _,c:=range EvaluatePublicEnumPayloadsChecks(row){if c.Constraint=="ordered"&&c.Result.Certain{t.Fatal("invalid ordinal",c)}}
skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range EvaluatePublicEnumPayloadsChecks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy invalid bound",c)}}
}
`,
    )
    await writeFile(join(root, 'go.mod'), 'module enumpublic\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/enum-range-payload', { recursive: true })
    await writeFile(
      'artifacts/enum-range-payload/report.json',
      JSON.stringify({
        nativeInserts: 2,
        independentCatalogs: true,
        compiledDefinitions: true,
        recursiveArrays: true,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
