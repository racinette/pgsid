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
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'

const input = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('preserves nominal record-domain array coercion, text I/O, comparison and composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-domain-arrays-'))
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int2,label varchar(3) COLLATE "C");
CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);
CREATE DOMAIN required AS approved NOT NULL;
CREATE DOMAIN strict_reading AS required CHECK((VALUE).label<>'bad');`)
    const forms = ['approved', 'required', 'strict_reading'].flatMap((type) =>
      Object.entries({
        equality: `lhs::${type}[]=rhs::${type}[]`,
        ordering: `lhs::${type}[]<rhs::${type}[]`,
        contains: `lhs::${type}[] @> rhs::${type}[]`,
        sorted: `array_sort(lhs::${type}[])=lhs::${type}[]`,
        search: `array_position(lhs::${type}[],ROW(n,label)::${type}) IS NOT NULL`,
        nullif: `NULLIF(lhs::${type}[],rhs::${type}[]) IS NULL`,
        constructor: `cardinality(ARRAY[ROW(n,label)::leaf]::${type}[])=1`,
        drop_domain: `(lhs::${type}[])::leaf[]=rhs::leaf[]`,
        add_domain: `(lhs::leaf[])::${type}[]=rhs::${type}[]`,
        output: `length((lhs::${type}[])::text)>2`,
        any: `ROW(n,label)::${type}=ANY(lhs::${type}[])`,
        selected: `(CASE WHEN n>0 THEN lhs::${type}[] ELSE rhs::${type}[] END)=lhs::${type}[]`,
        bounds: `array_lower(lhs::${type}[],1) IS NOT DISTINCT FROM array_lower(rhs::${type}[],1)`,
      }).map(([name, sql]) => ({ name: type + '_' + name, type, sql })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE gate_${form.name}(lhs text,rhs text,n int4,label text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END))`,
      )
    await pg.exec('CREATE TABLE inputs(lhs text,rhs text,n int4,label text,bypass bool)')
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
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const rows: [string | null, string | null, number | null, string | null][] = [
        [null, null, null, null],
        ['{}', '{}', 1, 'abc'],
        ['{NULL}', '{NULL}', 1, 'abc'],
        ['{"(,)"}', '{"(,)"}', null, null],
        ['{"(1,abc)"}', '{"(2,def)"}', 1, 'abc'],
        ['{"(-1,abc)"}', '{"(1,abc)"}', -1, 'abc'],
        ['{"(1,bad)"}', '{"(1,abc)"}', 1, 'bad'],
        ['{"(1,abcd)"}', '{"(1,abc)"}', 1, 'abcd'],
        ['[-1:0]={"(1,abc)","(2,def)"}', '{"(1,abc)"}', 2, 'def'],
        ['{"(-1,abc)"', '{"(1,abc)"}', 32768, 'abc'],
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [lhs, rhs, n, label] of rows)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3,$4,$5)', [lhs, rhs, n, label, bypass])
        for (const form of forms) {
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
          const insert = pg.query(`INSERT INTO gate_${form.name} VALUES($1,$2,$3,$4,$5)`, [
            lhs,
            rhs,
            n,
            label,
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
            label: input(label),
            bypass: input(bypass),
          }
          reference.push({ name: form.name, lhs, rhs, n, label, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: form.name + '_' + origin, row, expected })
        }
      }
    await mkdir('artifacts/composite-domain-arrays', { recursive: true })
    await writeFile(
      'artifacts/composite-domain-arrays/plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    await writeFile('artifacts/composite-domain-arrays/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositedomainarrays',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-domain-arrays/report.json',
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

it('keeps nominal public array headers distinct from physical records without replaying element domain checks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-domain-arrays-public-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,phase stage,label varchar(3) COLLATE "C");
CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);CREATE DOMAIN required AS approved NOT NULL;
CREATE TABLE supplied(v required);
CREATE TABLE bundles(a required[],bypass bool NOT NULL,
CONSTRAINT first_score CHECK(CASE WHEN bypass THEN true ELSE (a[1]).n>=2 END),
CONSTRAINT equal CHECK(CASE WHEN bypass THEN true ELSE a=a END),
CONSTRAINT count CHECK(CASE WHEN bypass THEN true ELSE cardinality(a)<=3 END),
CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE a::text='{"(2,z,hi)"}' END));
INSERT INTO bundles VALUES(ARRAY[ROW(2,'z','hi')::required],false);`)
    await expect(pg.exec(`SELECT '{NULL}'::required[]`)).rejects.toMatchObject({ code: '23502' })
    expect(
      (
        await pg.query<{ value: boolean }>(
          `SELECT cardinality(ARRAY[(SELECT v FROM supplied)])=1 value`,
        )
      ).rows[0]!.value,
    ).toBe(true)
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
        'compositedomainpublic/schema',
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
          elementType: '"public"."required"',
          elementKind: 44,
          dimensions: [{ lower: 1, length: 1 }],
          elements: [
            {
              kind: 'Composite',
              value: {
                typeName: 'public.leaf',
                fields: [
                  { kind: 'Int2', value: 2 },
                  { kind: 'Enum', value: { ordinal: 0, labelOid: 777n } },
                  { kind: 'Text', value: 'hi' },
                ],
              },
            },
          ],
          nullBitmap: { kind: 'Value', value: false },
        },
      },
      expected = {
        first_score: { certain: true, value: true },
        equal: { certain: true, value: true },
        count: { certain: true, value: true },
        output: { certain: true, value: true },
      },
      before = structuredClone(good)
    expect(evaluate({ a: good, bypass: false })).toEqual(expected)
    expect(good).toEqual(before)
    const mutations: ((v: typeof good) => void)[] = [
      (v) => {
        v.value.elementType = 'public.leaf'
      },
      (v) => {
        v.value.elementType = '"public"."approved"'
      },
      (v) => {
        v.value.elements[0]!.value.typeName = 'public.required'
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
    ]
    for (const mutate of mutations) {
      const value = structuredClone(good)
      mutate(value)
      for (const result of Object.values(evaluate({ a: value, bypass: false })))
        expect(result).toMatchObject({ certain: false })
      expect(evaluate({ a: value, bypass: true })).toEqual(expected)
    }
    const nullCell = {
      ...good,
      value: {
        ...good.value,
        elements: [{ kind: 'Null' }],
        nullBitmap: { kind: 'Value', value: true },
      },
    }
    expect(evaluate({ a: nullCell, bypass: false })).toEqual({
      first_score: { certain: true, value: null },
      equal: { certain: true, value: true },
      count: { certain: true, value: true },
      output: { certain: true, value: false },
    })
    const nullFields = structuredClone(good)
    for (const field of nullFields.value.elements[0]!.value.fields)
      Object.assign(field, { kind: 'Null' })
    expect(evaluate({ a: nullFields, bypass: false })).toEqual(
      evaluate({ a: nullCell, bypass: false }),
    )
    await writeFile(
      join(root, 'schema/public/domain_arrays_test.go'),
      `package public
import("testing";"reflect";checkruntime "compositedomainpublic/schema/public/checkrust/checkruntime")
func TestDomainArrayPayloads(t *testing.T){
 value:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:${JSON.stringify('"public"."required"')},ElementKind:44,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementComposite,Composite:checkruntime.CompositePayload{TypeName:"public.leaf",Fields:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt2,Int2:2},{Kind:checkruntime.ArrayElementEnum,Enum:checkruntime.EnumPayload{Ordinal:0,LabelOid:777}},{Kind:checkruntime.ArrayElementText,Text:"hi"}}}}},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:false}}}
 evaluate:=func(value checkruntime.ArrayValue,skip bool)[]CheckEvaluation{return EvaluatePublicBundlesChecks(PublicBundlesCheckInput{A:KnownCheckValue(value),Bypass:KnownCheckValue(skip)})}
 before:=checkruntime.CopyArrayValue(value)
 for _,result:=range evaluate(value,false){if !result.Result.Certain||!result.Result.Value.Valid||!result.Result.Value.Value{t.Fatal(result)}}
 if !reflect.DeepEqual(value,before){t.Fatal("domain array input mutated")}
 invalid:=checkruntime.CopyArrayValue(value);invalid.Value.ElementType="public.leaf"
 for _,result:=range evaluate(invalid,false){if result.Result.Certain{t.Fatal("base header accepted",result)}}
 invalid=checkruntime.CopyArrayValue(value);invalid.Value.Elements[0].Composite.TypeName="public.required"
 for _,result:=range evaluate(invalid,false){if result.Result.Certain{t.Fatal("nominal name accepted as physical record",result)}}
 nullCell:=checkruntime.CopyArrayValue(value);nullCell.Value.Elements=[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementNull}};nullCell.Value.NullBitmap=checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:true}
 for _,result:=range evaluate(nullCell,false){if !result.Result.Certain{t.Fatal("coerced NULL element deferred",result)};if result.Constraint=="first_score"&&result.Result.Value.Valid{t.Fatal("NULL field result lost",result)};if result.Constraint=="output"&&(!result.Result.Value.Valid||result.Result.Value.Value){t.Fatal("NULL array output lost",result)}}
}
`,
    )
    await writeFile(join(root, 'schema/go.mod'), 'module compositedomainpublic/schema\n\ngo 1.23\n')
    await run('go', ['test', './...'], { cwd: join(root, 'schema') }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/composite-domain-arrays-public', { recursive: true })
    await writeFile(
      'artifacts/composite-domain-arrays-public/report.json',
      JSON.stringify(
        {
          goAndTypescript: true,
          nominalHeaderMutations: mutations.length,
          coercedNullElementsPreserved: true,
          physicalRecordIdentityChecked: true,
          inputUnchanged: true,
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

it('prepares fresh domain array literals eagerly and recovers stored constants without replaying later checks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-domain-arrays-literals-'))
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int2,label varchar(3));CREATE DOMAIN legacy AS leaf NOT NULL;
CREATE TABLE literals(n int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE cardinality('{"(-1,abc)"}'::legacy[])=n END));
ALTER DOMAIN legacy ADD CONSTRAINT positive_later CHECK((VALUE).n>0) NOT VALID;`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'literals')!,
      constraint = table.constraints.find((c) => c.name === 'valid')!,
      plans = (['source', 'stored'] as const).map((origin) => ({
        name: origin,
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
          owner: 'literals',
          constraint: origin,
        },
      })),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const n of [null, 0, 1])
      for (const bypass of [false, true]) {
        await expect(
          pg.query(
            `SELECT CASE WHEN $1 THEN true ELSE cardinality('{"(-1,abc)"}'::legacy[])=$2 END`,
            [bypass, n],
          ),
        ).rejects.toMatchObject({ code: '23514' })
        const expected = outcome(bypass ? true : n === null ? null : n === 1),
          insert = pg.query('INSERT INTO literals VALUES($1,$2)', [n, bypass])
        if (expected.kind === 'False') await expect(insert).rejects.toMatchObject({ code: '23514' })
        else await insert
        const row: Row = { n: input(n), bypass: input(bypass) }
        fixtures.push(
          {
            name: 'source',
            row,
            expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
          },
          { name: 'stored', row, expected },
        )
      }
    await mkdir('artifacts/composite-domain-arrays-literals', { recursive: true })
    await writeFile(
      'artifacts/composite-domain-arrays-literals/evaluators.rs',
      group.evaluatorSource!,
    )
    await runCheckParity(
      root,
      'compositedomainliterals',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-domain-arrays-literals/report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          freshInputBeforeBranches: true,
          storedDomainChecksNotReplayed: true,
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

it('defers reached custom base-record comparators even when builtin record equality succeeds', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-domain-arrays-callbacks-'))
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int4);CREATE DOMAIN approved AS leaf;
CREATE FUNCTION unavailable_compare(leaf,leaf) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'selected comparator';END$$;
CREATE OPERATOR CLASS leaf_order_ops DEFAULT FOR TYPE leaf USING btree AS FUNCTION 1 unavailable_compare(leaf,leaf);`)
    const forms = {
      equal: 'lhs::approved[]=rhs::approved[]',
      ordered: 'lhs::approved[]<rhs::approved[]',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(lhs text,rhs text,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec('CREATE TABLE inputs(lhs text,rhs text,bypass bool)')
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
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
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const rows: [string | null, string | null][] = [
        [null, null],
        ['{}', '{}'],
        ['{NULL}', '{NULL}'],
        ['{}', '{"(1)"}'],
        ['{"()"}', '{"()"}'],
        ['{"(1)"}', '{"(1)"}'],
        ['{"(1)"}', '{"(2)"}'],
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [lhs, rhs] of rows)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3)', [lhs, rhs, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome, nativeCode: string | undefined
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END) value FROM inputs`,
                )
              ).rows[0]!.value,
            )
          } catch (e) {
            nativeCode = (e as { code: string }).code
            expect(nativeCode).toBe('P0001')
            expected = { kind: 'Unknown' }
          }
          const insert = pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3)`, [lhs, rhs, bypass])
          if (nativeCode || expected.kind === 'False')
            await expect(insert).rejects.toMatchObject({ code: nativeCode ?? '23514' })
          else await insert
          reference.push({ name, lhs, rhs, bypass, nativeCode, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { lhs: input(lhs), rhs: input(rhs), bypass: input(bypass) },
              expected,
            })
        }
      }
    await mkdir('artifacts/composite-domain-arrays-callbacks', { recursive: true })
    await writeFile(
      'artifacts/composite-domain-arrays-callbacks/evaluators.rs',
      group.evaluatorSource!,
    )
    await runCheckParity(
      root,
      'compositedomaincallbacks',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-domain-arrays-callbacks/report.json',
      JSON.stringify({ fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
