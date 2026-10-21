import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import type { CompositeInputCell } from '../../tools/check-rust/composite-input.js'

import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'

const schema = `CREATE TYPE leaf AS(n int2,label varchar(3) COLLATE "C");
CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);
CREATE DOMAIN batch AS approved[] CHECK(cardinality(VALUE)>0);
CREATE DOMAIN required_batch AS batch NOT NULL;
CREATE DOMAIN batch_set AS required_batch[] CHECK(cardinality(VALUE)>0);`
const input = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const record = (n: number | null, label: string | null): CompositeInputCell => ({
  kind: 'Composite',
  value: {
    typeName: 'public.leaf',
    fields: [
      n === null ? { kind: 'Null' } : { kind: 'Int2', value: n },
      label === null ? { kind: 'Null' } : { kind: 'Text', value: label },
    ],
  },
})
const array = (
  elementType: string,
  elementKind: number,
  elements: CompositeInputCell[],
  lower = 1,
): CompositeInputCell => ({
  kind: 'Array',
  value: {
    elementType,
    elementKind,
    elements,
    dimensions: elements.length ? [{ lower, length: elements.length }] : [],
    nullBitmap: { kind: 'Value', value: elements.some((c) => c.kind === 'Null') },
  },
})

it('admits nested record-domain arrays with compiled leaves, nominal headers, bounds and recursive SQL composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nested-composite-containers-'))
  try {
    await pg.exec(schema)
    const forms: Record<string, string> = {
      shape: 'cardinality(a)=n',
      equality: 'a=b',
      ordering: 'a<b',
      comparator: 'pg_catalog.btarraycmp(a,b)<=0',
      contains: 'a @> b',
      overlap: 'a && b',
      sorted: 'array_sort(a)=a',
      search: 'array_position(a,a[1]) IS NOT NULL',
      any: 'a[1]=ANY(b)',
      all: 'a[1]<=ALL(b)',
      fetch: 'cardinality(a[1])>0',
      slice: 'a[1:2]=b[1:2]',
      nullif: 'NULLIF(a,b) IS NULL',
      greatest: 'GREATEST(a,b) IS NOT DISTINCT FROM a',
      selected: '(CASE WHEN n>0 THEN a ELSE b END)=a',
      coalesced: 'COALESCE(a,b)=b',
      output: 'a::text IS NOT DISTINCT FROM encoded',
      roundtrip: 'encoded::TYPE[]=a',
    }
    const types = ['batch', 'required_batch', 'batch_set']
    for (const type of types)
      for (const [name, form] of Object.entries(forms))
        await pg.exec(
          `CREATE TABLE gate_${type}_${name}(a ${type}[],b ${type}[],encoded text,n int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.replaceAll('TYPE', type)} END))`,
        )
    for (const type of types)
      await pg.exec(
        `CREATE TABLE inputs_${type}(a ${type}[],b ${type}[],encoded text,n int4,bypass bool)`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = types.flatMap((type) =>
      Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === `gate_${type}_${name}`)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: `${type}_${name}_${origin}`,
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
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await mkdir('artifacts/nested-composite-containers', { recursive: true })
    await writeFile(
      'artifacts/nested-composite-containers/plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/nested-composite-containers/evaluators.rs',
      group.evaluatorSource ?? '',
    )
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const type of types) {
      const nested = (elements: CompositeInputCell[]) => {
        const inner = array('"public"."approved"', 44, elements)
        return type === 'batch_set' ? array('"public"."required_batch"', 41, [inner]) : inner
      }
      const nativeInner = (sql: string) =>
        type === 'batch_set' ? `ARRAY[${sql}::required_batch]::batch_set` : `${sql}::${type}`
      const samples = [
        { sql: `NULL::${type}[]`, payload: null },
        { sql: `ARRAY[]::${type}[]`, payload: array(`"public"."${type}"`, 41, []) },
        {
          sql: `ARRAY[${nativeInner("ARRAY[ROW(1,'a')::approved]")}]`,
          payload: array(`"public"."${type}"`, 41, [nested([record(1, 'a')])]),
        },
        {
          sql: `ARRAY[${nativeInner("ARRAY[ROW(2,'b')::approved,ROW(NULL,NULL)::approved,NULL::approved]")}]`,
          payload: array(`"public"."${type}"`, 41, [
            nested([record(2, 'b'), record(null, null), { kind: 'Null' }]),
          ]),
        },
        {
          sql: `array_fill(${nativeInner("ARRAY[ROW(1,'a')::approved]")},ARRAY[1],ARRAY[-2])`,
          payload: array(`"public"."${type}"`, 41, [nested([record(1, 'a')])], -2),
        },
      ]
      for (const [left, right] of [
        [0, 0],
        [0, 2],
        [1, 1],
        [1, 2],
        [2, 2],
        [2, 3],
        [3, 3],
        [4, 2],
      ]) {
        const a = samples[left!]!,
          b = samples[right!]!
        const text = async (sql: string) =>
          (await pg.query<{ value: string | null }>(`SELECT (${sql})::text value`)).rows[0]!.value
        const lhs = await text(a.sql),
          rhs = await text(b.sql)
        for (const bypass of [false, true]) {
          await pg.exec(`TRUNCATE inputs_${type}`)
          await pg.query(
            `INSERT INTO inputs_${type} VALUES($1::${type}[],$2::${type}[],$3,$4,$5)`,
            [lhs, rhs, lhs, 1, bypass],
          )
          for (const [name, form] of Object.entries(forms)) {
            let expected: Outcome
            try {
              expected = outcome(
                (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT (CASE WHEN bypass THEN true ELSE ${form.replaceAll('TYPE', type)} END)value FROM inputs_${type}`,
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
              `INSERT INTO gate_${type}_${name} VALUES($1::${type}[],$2::${type}[],$3,$4,$5)`,
              [lhs, rhs, lhs, 1, bypass],
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
              a:
                a.payload?.kind === 'Array'
                  ? { kind: 'Value', value: a.payload.value }
                  : { kind: 'Null' },
              b:
                b.payload?.kind === 'Array'
                  ? { kind: 'Value', value: b.payload.value }
                  : { kind: 'Null' },
              encoded: input(lhs),
              n: input(1),
              bypass: input(bypass),
            }
            reference.push({ type, name, left, right, bypass, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: `${type}_${name}_${origin}`, row, expected })
          }
        }
      }
    }
    await runCheckParity(
      root,
      'nestedcompositecontainers',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/nested-composite-containers/report.json',
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

it('validates public nested container headers and record leaves while preserving already-coerced values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nested-composite-containers-public-')),
    run = promisify(execFile)
  try {
    await pg.exec(
      schema +
        `CREATE TABLE bundles(a required_batch[],bypass bool NOT NULL,
CONSTRAINT score CHECK(CASE WHEN bypass THEN true ELSE ((a[1])[1]).n>=2 END),
CONSTRAINT equal CHECK(CASE WHEN bypass THEN true ELSE a=a END),
CONSTRAINT count CHECK(CASE WHEN bypass THEN true ELSE cardinality(a)=1 END),
CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE length(a::text)>2 END));`,
    )
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
        'nestedcompositepublic/schema',
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
      evaluate = (a: unknown, bypass = false) =>
        generated.evaluatePublicBundlesChecks({ a, bypass }) as {
          constraint: string
          result: { certain: boolean; value?: boolean | null }
        }[]
    const good = {
      kind: 'Value',
      value: {
        elementType: '"public"."required_batch"',
        elementKind: 41,
        dimensions: [{ lower: 1, length: 1 }],
        nullBitmap: { kind: 'Value', value: false },
        elements: [
          {
            kind: 'Array',
            value: {
              elementType: '"public"."approved"',
              elementKind: 44,
              dimensions: [{ lower: 1, length: 1 }],
              nullBitmap: { kind: 'Value', value: false },
              elements: [
                {
                  kind: 'Composite',
                  value: {
                    typeName: 'public.leaf',
                    fields: [
                      { kind: 'Int2', value: 2 },
                      { kind: 'Text', value: 'abc' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    }
    const before = structuredClone(good)
    expect(evaluate(good).every((c) => c.result.certain && c.result.value === true)).toBe(true)
    expect(good).toEqual(before)
    const mutations: ((value: typeof good) => void)[] = [
      (v) => {
        v.value.elementType = 'public.batch'
      },
      (v) => {
        v.value.elementKind = 44
      },
      (v) => {
        v.value.elements[0]!.value.elementType = 'public.leaf'
      },
      (v) => {
        v.value.elements[0]!.value.elementKind = 2
      },
      (v) => {
        v.value.elements[0]!.value.dimensions[0]!.length = 2
      },
      (v) => {
        v.value.elements[0]!.value.elements[0]!.value.typeName = 'public.approved'
      },
      (v) => {
        v.value.elements[0]!.value.elements[0]!.value.fields.pop()
      },
      (v) => {
        v.value.elements[0]!.value.elements[0]!.value.fields[0]!.value = 40000
      },
    ]
    for (const mutate of mutations) {
      const v = structuredClone(good)
      mutate(v)
      expect(evaluate(v).every((c) => !c.result.certain)).toBe(true)
      expect(evaluate(v, true).every((c) => c.result.certain && c.result.value === true)).toBe(true)
    }
    const partial = structuredClone(good)
    Object.assign(partial.value.elements[0]!.value.elements[0]!.value.fields[0]!, {
      kind: 'Unknown',
    })
    expect(
      Object.fromEntries(evaluate(partial).map((c) => [c.constraint, c.result])),
    ).toMatchObject({
      score: { certain: false },
      equal: { certain: false },
      count: { certain: true, value: true },
      output: { certain: false },
    })
    await pg.exec('CREATE TABLE supplied(value required_batch)')
    expect(
      (await pg.query<{ value: string }>('SELECT ARRAY[(SELECT value FROM supplied)]::text value'))
        .rows[0]!.value,
    ).toBe('{NULL}')
    const nullInner = {
      ...good,
      value: {
        ...good.value,
        elements: [{ kind: 'Null' }],
        nullBitmap: { kind: 'Value', value: true },
      },
    }
    expect(
      Object.fromEntries(evaluate(nullInner).map((c) => [c.constraint, c.result])),
    ).toMatchObject({
      score: { certain: true, value: null },
      equal: { certain: true, value: true },
      count: { certain: true, value: true },
      output: { certain: true, value: true },
    })
    const negative = structuredClone(good)
    negative.value.elements[0]!.value.elements[0]!.value.fields[0]!.value = -1
    expect(
      Object.fromEntries(evaluate(negative).map((c) => [c.constraint, c.result])),
    ).toMatchObject({
      score: { certain: true, value: false },
      equal: { certain: true, value: true },
    })
    await writeFile(
      join(root, 'schema/public/nested_test.go'),
      `package public
import("testing";"reflect";r "nestedcompositepublic/schema/public/checkrust/checkruntime")
func TestNestedPayloads(t *testing.T){
 inner:=r.ArrayPayload{ElementType:${JSON.stringify('"public"."approved"')},ElementKind:44,Dimensions:[]r.ArrayDimension{{Lower:1,Length:1}},Elements:[]r.ArrayElement{{Kind:r.ArrayElementComposite,Composite:r.CompositePayload{TypeName:"public.leaf",Fields:[]r.ArrayElement{{Kind:r.ArrayElementInt2,Int2:2},{Kind:r.ArrayElementText,Text:"abc"}}}}}}
 value:=r.ArrayValue{Kind:r.ArrayValueValue,Value:r.ArrayPayload{ElementType:${JSON.stringify('"public"."required_batch"')},ElementKind:41,Dimensions:[]r.ArrayDimension{{Lower:1,Length:1}},Elements:[]r.ArrayElement{{Kind:r.ArrayElementArray,Array:inner}}}}
 evaluate:=func(v r.ArrayValue)[]CheckEvaluation{return EvaluatePublicBundlesChecks(PublicBundlesCheckInput{A:KnownCheckValue(v),Bypass:KnownCheckValue(false)})}
 before:=r.CopyArrayValue(value)
 for _,c:=range evaluate(value){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(c)}}
 if !reflect.DeepEqual(value,before){t.Fatal("input mutated")}
 for i:=0;i<4;i++{v:=r.CopyArrayValue(value);switch i{case 0:v.Value.ElementType="public.batch";case 1:v.Value.Elements[0].Array.ElementType="public.leaf";case 2:v.Value.Elements[0].Array.Elements[0].Composite.TypeName="public.approved";case 3:v.Value.Elements[0].Array.Elements[0].Composite.Fields[0].Int2=40000};for _,c:=range evaluate(v){if c.Result.Certain{t.Fatal(i,c)}}}
 v:=r.CopyArrayValue(value);v.Value.Elements[0].Array.Elements[0].Composite.Fields[0].Int2=-1
 for _,c:=range evaluate(v){if !c.Result.Certain{t.Fatal("coerced value deferred",c)};if c.Constraint=="score"&&(!c.Result.Value.Valid||c.Result.Value.Value){t.Fatal(c)}}
}
`,
    )
    await writeFile(join(root, 'schema/go.mod'), 'module nestedcompositepublic/schema\n\ngo 1.23\n')
    await run('go', ['test', './...'], { cwd: join(root, 'schema') }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await writeFile(
      'artifacts/nested-composite-containers/public-report.json',
      JSON.stringify(
        {
          goAndTypescript: true,
          typescriptMutations: mutations.length,
          goMutations: 4,
          inputUnchanged: true,
          coercedDomainChecksNotReplayed: true,
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

it('preserves fresh nested domain errors and stored literal provenance at every container level', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nested-composite-containers-input-'))
  try {
    await pg.exec(schema + `CREATE TABLE inputs(encoded text,n int4,bypass bool);`)
    const forms: Record<string, string> = {
      count: 'cardinality(encoded::required_batch[])=n',
      score: '(((encoded::required_batch[])[1])[1]).n>=n',
      output: 'length((encoded::required_batch[])::text)>=n',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(encoded text,n int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const quote = (s: string) => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
    const encode = (s: string) => '{' + quote(s) + '}'
    const samples = [
      null,
      '{}',
      '{NULL}',
      encode('{}'),
      encode('{NULL}'),
      encode('{"(,)"}'),
      encode('{"(1,abc)"}'),
      encode('{"(-1,abc)"}'),
      encode('{"(1,abcd)"}'),
      encode('{"(40000,abc)"}'),
      encode('{"(40000,abc)"'),
      encode('{"(1,abc)"'),
      '[0:0]=' + encode('[-2:-2]={"(1,abc)"}'),
    ]
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
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const encoded of samples)
      for (const n of [null, 1, 40000])
        for (const bypass of [false, true]) {
          await pg.exec('TRUNCATE inputs')
          await pg.query('INSERT INTO inputs VALUES($1,$2,$3)', [encoded, n, bypass])
          for (const [name, sql] of Object.entries(forms)) {
            let expected: Outcome
            try {
              expected = outcome(
                (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END)value FROM inputs`,
                  )
                ).rows[0]!.value,
              )
            } catch (e) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((e as { code: string }).code, 36) },
              }
            }
            const insert = pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3)`, [
              encoded,
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
            reference.push({ name, encoded, n, bypass, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { encoded: input(encoded), n: input(n), bypass: input(bypass) },
                expected,
              })
          }
        }
    await runCheckParity(
      root,
      'nestedcompositeinput',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/nested-composite-containers/input-report.json',
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
    await pg.exec(
      'DROP SCHEMA public CASCADE;CREATE SCHEMA public;CREATE TYPE leaf AS(n int2,label varchar(3));CREATE DOMAIN approved AS leaf;CREATE DOMAIN batch AS approved[] NOT NULL;CREATE DOMAIN required_batch AS batch NOT NULL;',
    )
    const literals = [
      ['record', '{"(-1,abc)"}'],
      ['container', '{"(1,abc)"}'],
    ] as const
    for (const [name, inner] of literals) {
      const literal = encode(inner).replaceAll("'", "''")
      await pg.exec(
        `CREATE TABLE literal_${name}(n int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE cardinality('${literal}'::required_batch[])=n END))`,
      )
    }
    await pg.exec(
      'ALTER DOMAIN approved ADD CONSTRAINT positive_later CHECK((VALUE).n>0) NOT VALID;ALTER DOMAIN batch ADD CONSTRAINT count_later CHECK(cardinality(VALUE)>1) NOT VALID;',
    )
    const storedCatalog = await snapshotCatalog(pg),
      literalPlans = literals.flatMap(([name]) => {
        const table = storedCatalog.tables.find((t) => t.name === 'literal_' + name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            constraint,
            storedCatalog.enums,
            storedCatalog.domains,
            origin,
            storedCatalog.rangeTypes,
            storedCatalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
        }))
      }),
      literalGroup = prepareCheckRustGroup(literalPlans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      }),
      literalFixtures: { name: string; row: Row; expected: Outcome }[] = []
    expect(literalGroup.checks.every((c) => c.kind === 'supported')).toBe(true)
    for (const [name, inner] of literals)
      for (const n of [null, 0, 1])
        for (const bypass of [false, true]) {
          const literal = encode(inner!).replaceAll("'", "''")
          await expect(
            pg.query(
              `SELECT CASE WHEN $1 THEN true ELSE cardinality('${literal}'::required_batch[])=$2 END`,
              [bypass, n],
            ),
          ).rejects.toMatchObject({ code: '23514' })
          const expected = outcome(bypass ? true : n === null ? null : n === 1),
            insert = pg.query(`INSERT INTO literal_${name} VALUES($1,$2)`, [n, bypass])
          if (expected.kind === 'False')
            await expect(insert).rejects.toMatchObject({ code: '23514' })
          else await insert
          const row: Row = { n: input(n), bypass: input(bypass) }
          literalFixtures.push(
            {
              name: name + '_source',
              row,
              expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
            },
            { name: name + '_stored', row, expected },
          )
        }
    await mkdir(join(root, 'literals'), { recursive: true })
    await runCheckParity(
      join(root, 'literals'),
      'nestedcompositeliterals',
      literalGroup,
      literalPlans.map((p) => p.name),
      literalFixtures,
    )
    await writeFile(
      'artifacts/nested-composite-containers/literals-report.json',
      JSON.stringify(
        {
          fixtures: literalFixtures.length,
          sourceAlwaysEager: true,
          storedDomainsNotReplayed: true,
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

it('constructs and transforms nested record containers with ordered leaf and whole-domain coercion', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nested-composite-containers-constructors-'))
  try {
    await pg.exec(schema + 'CREATE TABLE inputs(n int4,label text,bypass bool)')
    const forms: Record<string, string> = {
      constructor: 'cardinality(ARRAY[ARRAY[ROW(n,label)::approved]::required_batch])=1',
      deep: 'cardinality(ARRAY[ARRAY[ARRAY[ROW(n,label)::approved]::required_batch]::batch_set])=1',
      appended:
        'cardinality(array_append(ARRAY[]::required_batch[],ARRAY[ROW(n,label)::approved]::required_batch))=1',
      relabel:
        '((ARRAY[ROW(n,label)::approved]::required_batch)::leaf[])[1] IS NOT DISTINCT FROM ROW(n,label)::leaf',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(n int4,label text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
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
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    await writeFile(
      'artifacts/nested-composite-containers/constructors-plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/nested-composite-containers/constructors-evaluators.rs',
      group.evaluatorSource!,
    )
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const rows: [number | null, string | null][] = [
        [null, null],
        [1, 'abc'],
        [-1, 'abc'],
        [0, 'abc'],
        [40000, 'abc'],
        [1, 'abcdef'],
        [2, 'a,b'],
        [2, null],
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [n, label] of rows)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3)', [n, label, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END)value FROM inputs`,
                )
              ).rows[0]!.value,
            )
          } catch (e) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3)`, [n, label, bypass])
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          reference.push({ name, n, label, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { n: input(n), label: input(label), bypass: input(bypass) },
              expected,
            })
        }
      }
    await runCheckParity(
      root,
      'nestedcompositeconstructors',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/nested-composite-containers/constructors-report.json',
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
