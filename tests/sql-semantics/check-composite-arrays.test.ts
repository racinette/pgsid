import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'

const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const input = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const pairArray = (
  values: ([number | null, string | null] | null)[],
  dimensions = values.length ? [{ lower: 1, length: values.length }] : [],
): OwnedArrayInputPayload => ({
  elementType: 'public.pair',
  elementKind: 44,
  dimensions,
  nullBitmap: { kind: 'Value', value: values.some((value) => value === null) },
  elements: values.map((value) =>
    value === null
      ? { kind: 'Null' }
      : {
          kind: 'Composite',
          value: {
            typeName: 'public.pair',
            fields: [
              value[0] === null ? { kind: 'Null' } : { kind: 'Int4', value: value[0] },
              value[1] === null ? { kind: 'Null' } : { kind: 'Text', value: value[1] },
            ],
          },
        },
  ),
})

it('admits root record arrays with compiled fields, dimensions, comparisons, searches and owned composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-arrays-'))
  try {
    await pg.exec('CREATE TYPE pair AS(n int4,label text COLLATE "C");')
    const forms: Record<string, string> = {
      equality: 'a=b',
      ordering: 'a<b',
      comparator: 'pg_catalog.btarraycmp(a,b)<=0',
      distinct: 'a IS DISTINCT FROM b',
      nullif: 'NULLIF(a,b) IS NULL',
      greatest: 'GREATEST(a,b) IS NOT DISTINCT FROM a',
      coalesced: 'COALESCE(a,b)=b',
      selected: '(CASE WHEN n>0 THEN a ELSE b END)=a',
      contains: 'a @> b',
      overlaps: 'a && b',
      position: 'array_position(a,ROW(n,label)::pair) IS NOT NULL',
      positions: 'cardinality(array_positions(a,ROW(n,label)::pair))>0',
      removed: 'cardinality(array_remove(a,ROW(n,label)::pair))<=cardinality(a)',
      replaced: 'array_replace(a,ROW(n,label)::pair,NULL::pair)=a',
      sorted: 'array_sort(a)=a',
      extrema: 'pg_catalog.array_larger(a,b) IS NOT DISTINCT FROM GREATEST(a,b)',
      bucket: 'width_bucket(ROW(n,label)::pair,a)>=0',
      quantifier: 'ROW(n,label)::pair=ANY(a)',
      all: 'ROW(n,label)::pair<=ALL(a)',
      fetched: '(a[1]).n>=n',
      sliced: 'a[1:2]=b[1:2]',
      shape: 'array_dims(a) IS NOT DISTINCT FROM array_dims(b)',
      appended: 'cardinality(array_append(a,ROW(n,label)::pair))=COALESCE(cardinality(a),0)+1',
      concatenated: 'cardinality(a||b)>=COALESCE(cardinality(a),0)',
      text: 'length(a::text)>=2',
      literal: 'a=\'{"(1,a)"}\'::pair[]',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(a pair[],b pair[],n int4,label text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec('CREATE TABLE inputs(a pair[],b pair[],n int4,label text,bypass bool)')
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
        }))
      })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const samples: { text: string | null; payload: OwnedArrayInputPayload | null }[] = [
        { text: null, payload: null },
        { text: '{}', payload: pairArray([]) },
        { text: '{"(1,a)"}', payload: pairArray([[1, 'a']]) },
        { text: '{"(1,a)",NULL}', payload: pairArray([[1, 'a'], null]) },
        {
          text: '{"(2,z)","(,)"}',
          payload: pairArray([
            [2, 'z'],
            [null, null],
          ]),
        },
        {
          text: '[-2:-1]={"(1,a)",NULL}',
          payload: pairArray([[1, 'a'], null], [{ lower: -2, length: 2 }]),
        },
        {
          text: '{{"(1,a)","(2,z)"},{"(,)",NULL}}',
          payload: pairArray(
            [[1, 'a'], [2, 'z'], [null, null], null],
            [
              { lower: 1, length: 2 },
              { lower: 1, length: 2 },
            ],
          ),
        },
      ],
      cases = [
        [0, 0],
        [0, 2],
        [1, 1],
        [1, 2],
        [2, 2],
        [2, 4],
        [3, 4],
        [3, 5],
        [6, 6],
      ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [left, right] of cases)
      for (const bypass of [false, true]) {
        const a = samples[left!]!,
          b = samples[right!]!,
          n = 1,
          label = 'a'
        await pg.exec('TRUNCATE inputs')
        await pg.query('INSERT INTO inputs VALUES($1::pair[],$2::pair[],$3,$4,$5)', [
          a.text,
          b.text,
          n,
          label,
          bypass,
        ])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END) value FROM inputs`,
                )
              ).rows[0]!.value,
            )
          } catch (e) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(
            `INSERT INTO gate_${name} VALUES($1::pair[],$2::pair[],$3,$4,$5)`,
            [a.text, b.text, n, label, bypass],
          )
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          const row: Row = {
            a: a.payload === null ? { kind: 'Null' } : { kind: 'Value', value: a.payload },
            b: b.payload === null ? { kind: 'Null' } : { kind: 'Value', value: b.payload },
            n: input(n),
            label: input(label),
            bypass: input(bypass),
          }
          reference.push({ name, left, right, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
      }
    await mkdir('artifacts/composite-arrays', { recursive: true })
    await writeFile('artifacts/composite-arrays/plans.json', JSON.stringify(plans, null, 2) + '\n')
    await writeFile('artifacts/composite-arrays/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositearrays',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-arrays/report.json',
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)

it('shares record array text grammar and output while preserving field coercion and recursive missing support', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-arrays-io-'))
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);
CREATE TYPE leaf AS(n int4,label text COLLATE "C");
CREATE TYPE guarded AS(n positive,label varchar(3));
CREATE TYPE document AS(n int4,doc json);
CREATE TYPE nesting AS(value leaf,history leaf[]);`)
    const definitions = {
      leaf: "ROW(1,'a,b')::leaf",
      guarded: "ROW(1,'abc')::guarded",
      document: "ROW(1,'{}'::json)::document",
      nesting: "ROW(ROW(1,'a')::leaf,ARRAY[ROW(2,'b')::leaf])::nesting",
    }
    const forms = Object.entries(definitions).flatMap(([type]) =>
      Object.entries({
        equality: `lhs::${type}[]=rhs::${type}[]`,
        output: `length((lhs::${type}[])::text)>2`,
        count: `cardinality(lhs::${type}[])<=2`,
        selected: `(CASE WHEN n>0 THEN lhs::${type}[] ELSE rhs::${type}[] END)::text IS NOT DISTINCT FROM (lhs::${type}[])::text`,
      }).map(([name, sql]) => ({ name: type + '_' + name, type, sql })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE gate_${form.name}(lhs text,rhs text,n int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END))`,
      )
    await pg.exec('CREATE TABLE inputs(lhs text,rhs text,n int4,bypass bool)')
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((form) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + form.name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: form.name + '_' + origin,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
        }))
      })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [type, constructor] of Object.entries(definitions)) {
      const valid = (await pg.query<{ value: string }>(`SELECT ARRAY[${constructor}]::text value`))
          .rows[0]!.value,
        rows: [string | null, string | null, number][] = [
          [null, null, 1],
          ['{}', '{}', 1],
          ['{NULL}', '{NULL}', 1],
          [valid, valid, 1],
          ['{"(,)"}', valid, 1],
          ['{"(1,abcd)"}', valid, 1],
          ['{"(-1,x)"}', valid, 1],
          ['{"(x,x)"}', valid, 1],
          ['{"(x,x)"', valid, 1],
          ['{"(-1,x)"', valid, 1],
          ['{"(2147483648,x)"', valid, 1],
          [valid, 'not an array', 0],
        ]
      for (const [lhs, rhs, n] of rows)
        for (const bypass of [false, true]) {
          await pg.exec('TRUNCATE inputs')
          await pg.query('INSERT INTO inputs VALUES($1,$2,$3,$4)', [lhs, rhs, n, bypass])
          for (const form of forms.filter((f) => f.type === type)) {
            let expected: Outcome
            try {
              expected = outcome(
                (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT (CASE WHEN bypass THEN true ELSE ${form.sql} END) value FROM inputs`,
                  )
                ).rows[0]!.value,
              )
            } catch (e) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((e as { code: string }).code, 36) },
              }
            }
            const insert = pg.query(`INSERT INTO gate_${form.name} VALUES($1,$2,$3,$4)`, [
              lhs,
              rhs,
              n,
              bypass,
            ])
            if (expected.kind === 'False' || expected.kind === 'Error')
              await expect(insert).rejects.toMatchObject({
                code:
                  expected.kind === 'Error'
                    ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : '23514',
              })
            else await insert
            const row: Row = {
              lhs: input(lhs),
              rhs: input(rhs),
              n: input(n),
              bypass: input(bypass),
            }
            reference.push({ name: form.name, lhs, rhs, n, bypass, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: form.name + '_' + origin, row, expected })
          }
        }
    }
    await mkdir('artifacts/composite-arrays-io', { recursive: true })
    await writeFile(
      'artifacts/composite-arrays-io/plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    await writeFile('artifacts/composite-arrays-io/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositearraysio',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-arrays-io/report.json',
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)

it('validates public record array payloads before copying and keeps raw query parameters separate', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-arrays-public-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,phase stage,label text COLLATE "C");
CREATE TABLE bundles(a leaf[],bypass bool NOT NULL,
CONSTRAINT first_score CHECK(CASE WHEN bypass THEN true ELSE (a[1]).n>=2 END),
CONSTRAINT equal CHECK(CASE WHEN bypass THEN true ELSE a=a END),
CONSTRAINT count CHECK(CASE WHEN bypass THEN true ELSE cardinality(a)<=3 END),
CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE a::text='{"(2,z,hi)"}' END));`)
    await pg.exec(`INSERT INTO bundles VALUES(ARRAY[ROW(2,'z','hi')::leaf],false)`)
    await expect(
      pg.exec(`INSERT INTO bundles VALUES(ARRAY[ROW(1,'z','hi')::leaf],false)`),
    ).rejects.toMatchObject({ code: '23514' })
    const catalog = await snapshotCatalog(pg),
      options = {
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
        compositeTypeGraph: catalog.compositeTypeGraph,
        executionContext: { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const },
      },
      ts = renderTypescriptSchemaCheckArtifacts(
        catalog.tables,
        catalog.domains,
        catalog.domains,
        options,
      ),
      generatedGo = renderGoSchemaArtifacts(
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
        ),
        {},
        join(root, 'schema'),
        'compositearrayspublic/schema',
      )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    for (const artifact of [
      { path: join(root, 'checks.ts'), content: ts.checks },
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        path: join(root, 'checks-rust', a.path),
        content: a.content,
      })),
      ...generatedGo.artifacts,
    ]) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await run('node', [
      'node_modules/typescript/bin/tsc',
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
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href),
      evaluate = (row: unknown) =>
        Object.fromEntries(
          (
            generated.evaluatePublicBundlesChecks(row) as {
              constraint: string
              result: { certain: boolean; value?: boolean | null }
            }[]
          ).map((c) => [c.constraint, c.result]),
        )
    const good = {
      kind: 'Value',
      value: {
        elementType: 'public.leaf',
        elementKind: 44,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [
          {
            kind: 'Composite',
            value: {
              typeName: 'public.leaf',
              fields: [
                { kind: 'Int2', value: 2 },
                { kind: 'Enum', value: { ordinal: 0, labelOid: 999n } },
                { kind: 'Text', value: 'hi' },
              ],
            },
          },
        ],
        nullBitmap: { kind: 'Value', value: false },
      },
    }
    const expected = {
      first_score: { certain: true, value: true },
      equal: { certain: true, value: true },
      count: { certain: true, value: true },
      output: { certain: true, value: true },
    }
    const before = structuredClone(good)
    expect(evaluate({ a: good, bypass: false })).toEqual(expected)
    expect(good).toEqual(before)
    const partial = structuredClone(good)
    Object.assign(partial.value.elements[0]!.value.fields[1]!, { kind: 'Unknown' })
    expect(evaluate({ a: partial, bypass: false })).toEqual({
      first_score: { certain: true, value: true },
      count: { certain: true, value: true },
      equal: { certain: false },
      output: { certain: false },
    })
    const mutations: ((value: typeof good) => void)[] = [
      (v) => {
        v.value.elementType = 'public.other'
      },
      (v) => {
        v.value.elementKind = 2
      },
      (v) => {
        v.value.elements[0]!.value.typeName = 'public.other'
      },
      (v) => {
        v.value.elements[0]!.value.fields.pop()
      },
      (v) => {
        Object.assign(v.value.elements[0]!.value.fields[0]!, { kind: 'Int2', value: 40000 })
      },
      (v) => {
        Object.assign(v.value.elements[0]!.value.fields[1]!, {
          kind: 'Enum',
          value: { ordinal: 99, labelOid: 0n },
        })
      },
      (v) => {
        Object.assign(v.value.elements[0]!.value.fields[2]!, { kind: 'Text', value: '\ud800' })
      },
      (v) => {
        Object.assign(v.value.elements[0]!.value.fields[2]!, { kind: 'Text', value: 'bad\0label' })
      },
    ]
    for (const mutate of mutations) {
      const value = structuredClone(good)
      mutate(value)
      for (const result of Object.values(evaluate({ a: value, bypass: false })))
        expect(result).toMatchObject({ certain: false })
      expect(evaluate({ a: value, bypass: true })).toEqual(expected)
    }
    for (const result of Object.values(evaluate({ a: '{"(2,z,hi)"}', bypass: false })))
      expect(result).toMatchObject({ certain: false })
    await writeFile(
      join(root, 'schema/public/composite_arrays_test.go'),
      `package public
import("testing";"reflect";checkruntime "compositearrayspublic/schema/public/checkrust/checkruntime")
func TestPublicCompositeArrays(t *testing.T){
 value:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:"public.leaf",ElementKind:44,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementComposite,Composite:checkruntime.CompositePayload{TypeName:"public.leaf",Fields:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt2,Int2:2},{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:0,LabelOid:999}},{Kind:checkruntime.ArrayElementText,Text:"hi"}}}}},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:false}}}
 evaluate:=func(value checkruntime.ArrayValue,bypass bool)[]CheckEvaluation{return EvaluatePublicBundlesChecks(PublicBundlesCheckInput{A:KnownCheckValue(value),Bypass:KnownCheckValue(bypass)})}
 before:=checkruntime.CopyArrayValue(value)
 for _,result:=range evaluate(value,false){if !result.Result.Certain||!result.Result.Value.Valid||!result.Result.Value.Value{t.Fatal(result)}}
 if !reflect.DeepEqual(value,before){t.Fatal("public array input mutated")}
 invalid:=checkruntime.CopyArrayValue(value);invalid.Value.Elements[0].Composite.Fields[1].Enum.Ordinal=99
 for _,result:=range evaluate(invalid,false){if result.Result.Certain{t.Fatal("invalid enum accepted",result)}}
 for _,result:=range evaluate(invalid,true){if !result.Result.Certain||!result.Result.Value.Valid||!result.Result.Value.Value{t.Fatal("bypass failed",result)}}
 invalid=checkruntime.CopyArrayValue(value);invalid.Value.Elements[0].Composite.Fields[0].Int2=40000
 for _,result:=range evaluate(invalid,false){if result.Result.Certain{t.Fatal("invalid smallint accepted",result)}}
}
`,
    )
    await writeFile(join(root, 'schema/go.mod'), 'module compositearrayspublic/schema\n\ngo 1.23\n')
    await run('go', ['test', './...'], { cwd: join(root, 'schema') }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/composite-arrays-public', { recursive: true })
    await writeFile(
      'artifacts/composite-arrays-public/report.json',
      JSON.stringify(
        {
          nativeInsertParity: true,
          publicGoAndTypescript: true,
          invalidPayloadMutations: mutations.length,
          rawInputsDefer: true,
          inputMetadataUnchanged: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)

it('enforces whole-array domain chains over records without replaying checks on SQL-coerced values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-arrays-domains-'))
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int4,label text COLLATE "C");
CREATE DOMAIN nonempty AS leaf[] CHECK(cardinality(VALUE)>0);
CREATE DOMAIN approved AS nonempty CHECK((VALUE[1]).n>0);
CREATE DOMAIN required AS approved NOT NULL;`)
    const forms = {
      required: 'cardinality(lhs::public.required)>0',
      coalesced: 'cardinality(COALESCE(lhs::public.approved,rhs::public.approved))>0',
      constructor: 'cardinality(ARRAY[ROW(n,label)::leaf]::public.required)=1',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(lhs text,rhs text,n int4,label text,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec('CREATE TABLE inputs(lhs text,rhs text,n int4,label text,bypass bool)')
    await pg.exec(`CREATE DOMAIN legacy AS leaf[];
CREATE TABLE gate_inherited(v legacy,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE v::legacy IS NOT NULL END));
INSERT INTO gate_inherited VALUES('{}',false);
ALTER DOMAIN legacy ADD CONSTRAINT nonempty_later CHECK(cardinality(VALUE)>0) NOT VALID;
INSERT INTO gate_inherited SELECT v,false FROM gate_inherited LIMIT 1;`)
    await expect(
      pg.exec(`INSERT INTO gate_inherited VALUES('{}'::leaf[],false)`),
    ).rejects.toMatchObject({ code: '23514' })
    const catalog = await snapshotCatalog(pg),
      plans = [...Object.keys(forms), 'inherited'].flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints.find((c) => c.type === 'check')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const rows: [string | null, string | null, number | null][] = [
        [null, null, null],
        ['{}', '{"(1,a)"}', 1],
        ['{"(1,a)"}', null, 1],
        ['{"(0,a)"}', '{"(1,a)"}', 0],
        ['{NULL}', null, null],
        ['{"(,)"}', null, 2],
        ['not an array', '{"(1,a)"}', -1],
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const origin of ['source', 'stored'])
      fixtures.push({
        name: 'inherited_' + origin,
        row: {
          v: {
            kind: 'Value',
            value: {
              elementType: 'public.leaf',
              elementKind: 44,
              dimensions: [],
              elements: [],
              nullBitmap: { kind: 'Value', value: false },
            },
          },
          bypass: input(false),
        },
        expected: { kind: 'True' },
      })
    for (const [lhs, rhs, n] of rows)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3,$4,$5)', [lhs, rhs, n, 'a', bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END) value FROM inputs`,
                )
              ).rows[0]!.value,
            )
          } catch (e) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3,$4,$5)`, [
            lhs,
            rhs,
            n,
            'a',
            bypass,
          ])
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          const row: Row = {
            lhs: input(lhs),
            rhs: input(rhs),
            n: input(n),
            label: input('a'),
            bypass: input(bypass),
          }
          reference.push({ name, lhs, rhs, n, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
      }
    await mkdir('artifacts/composite-arrays-domains', { recursive: true })
    await writeFile(
      'artifacts/composite-arrays-domains/plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    await writeFile('artifacts/composite-arrays-domains/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositearraysdomains',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-arrays-domains/report.json',
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
