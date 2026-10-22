import { compositeGoInput } from '../../tools/check-rust/composite-input.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { rangeRustCell, type RangeInputCell } from '../../tools/check-rust/range-input.js'
import { readRangeFixture, readRangeBoundCell } from './check-range-fixtures.js'

type Cell =
  | RangeInputCell
  | { kind: 'Composite'; value: Payload }
  | {
      kind: 'Array'
      value: {
        elementType: string
        elementKind: number
        dimensions: { lower: number; length: number }[]
        elements: Cell[]
        nullBitmap: { kind: 'Value'; value: boolean }
      }
    }
type Payload = { typeName: string; fields: Cell[] }
const sql = (value: string) => "'" + value.replaceAll("'", "''") + "'"

it('validates typed public composite fields before ownership copies and preserves row versus datum NULL composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-payload-')),
    run = promisify(execFile)
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','mid','a');CREATE DOMAIN positive AS int4 CHECK(VALUE>0);
CREATE TYPE leaf AS(score positive,discard integer,label text COLLATE "C",phase stage,span int4range,bag numeric[],doc jsonb);
ALTER TYPE leaf DROP ATTRIBUTE discard;
CREATE TYPE envelope AS(child leaf,other leaf,history leaf[]);
CREATE TABLE records(v envelope,w envelope,expected_null bool,expected_not_null bool,choose_first bool,bypass bool,
CONSTRAINT score CHECK(CASE WHEN bypass THEN true ELSE (v).child.score>=2 END),
CONSTRAINT label CHECK(CASE WHEN bypass THEN true ELSE length((v).child.label)>=2 END),
CONSTRAINT phase CHECK(CASE WHEN bypass THEN true ELSE (v).child.phase<>'a' END),
CONSTRAINT span CHECK(CASE WHEN bypass THEN true ELSE lower((v).child.span)<=10 END),
CONSTRAINT bag CHECK(CASE WHEN bypass THEN true ELSE cardinality((v).child.bag)<=3 END),
CONSTRAINT doc CHECK(CASE WHEN bypass THEN true ELSE (v).child.doc ? 'ok' END),
CONSTRAINT history CHECK(CASE WHEN bypass THEN true ELSE ((v).history[1]).score>=2 END),
CONSTRAINT row_null CHECK(CASE WHEN bypass THEN true ELSE (v IS NULL)=expected_null END),
CONSTRAINT row_not_null CHECK(CASE WHEN bypass THEN true ELSE (v IS NOT NULL)=expected_not_null END),
CONSTRAINT coalesced CHECK(CASE WHEN bypass THEN true ELSE (COALESCE(v,w)).child.score>=2 END),
CONSTRAINT json_score CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(v)#>>'{child,score}')::int4>=2 END),
CONSTRAINT json_phase CHECK(CASE WHEN bypass THEN true ELSE (to_json(v)::jsonb#>>'{child,phase}')<>'a' END),
CONSTRAINT json_row CHECK(CASE WHEN bypass THEN true ELSE (row_to_json(v,true)::jsonb#>'{child,doc}') ? 'ok' END),
CONSTRAINT selected CHECK((CASE WHEN choose_first THEN v ELSE w END).child.score>=2));`)
    const leaf = async (
      score = 2,
      label = 'hi',
      phase = 'z',
      span = '[1,3)',
      bag = '{1.00,2}',
      doc = '{"ok":true}',
    ) => {
      const range = await readRangeFixture(
        pg,
        'SELECT $1::int4range span',
        'span',
        'pg_catalog.int4range',
        [span],
      )
      const value: Payload = {
        typeName: 'public.leaf',
        fields: [
          { kind: 'Int4', value: score },
          { kind: 'Text', value: label },
          { kind: 'Enum', value: { ordinal: ['z', 'mid', 'a'].indexOf(phase), labelOid: 0n } },
          { kind: 'Range', value: range! },
          {
            kind: 'Array',
            value: {
              elementType: 'pg_catalog."numeric"',
              elementKind: 10,
              dimensions: [
                { lower: 1, length: bag === '{}' ? 0 : bag.slice(1, -1).split(',').length },
              ],
              elements:
                bag === '{}'
                  ? []
                  : bag
                      .slice(1, -1)
                      .split(',')
                      .map((value) => ({ kind: 'Numeric', value })),
              nullBitmap: { kind: 'Value', value: false },
            },
          },
          await readRangeBoundCell(pg, 'pg_catalog.jsonb', doc),
        ],
      }
      return {
        sql: `ROW(${score},${sql(label)},${sql(phase)}::stage,${sql(span)}::int4range,${sql(bag)}::numeric[],${sql(doc)}::jsonb)::leaf`,
        value,
      }
    }
    const good = await leaf(),
      one = await leaf(1)
    const envelope = (
      child: typeof good | null,
      other: typeof good | null,
      history: typeof good | null,
    ) => ({
      sql: `ROW(${child?.sql ?? 'NULL::leaf'},${other?.sql ?? 'NULL::leaf'},${history ? 'ARRAY[' + history.sql + ']' : 'NULL::leaf[]'})::envelope`,
      value: {
        typeName: 'public.envelope',
        fields: [
          child ? { kind: 'Composite', value: child.value } : { kind: 'Null' },
          other ? { kind: 'Composite', value: other.value } : { kind: 'Null' },
          history
            ? {
                kind: 'Array',
                value: {
                  elementType: 'public.leaf',
                  elementKind: 44,
                  dimensions: [{ lower: 1, length: 1 }],
                  elements: [{ kind: 'Composite', value: history.value }],
                  nullBitmap: { kind: 'Value', value: false },
                },
              }
            : { kind: 'Null' },
        ],
      } as Payload,
    })
    const present = envelope(good, null, good),
      all = envelope(good, good, good),
      empty = envelope(null, null, null)
    const nullLeaf = {
      sql: 'ROW(NULL,NULL,NULL,NULL,NULL,NULL)::leaf',
      value: {
        typeName: 'public.leaf',
        fields: Array.from({ length: 6 }, () => ({ kind: 'Null' }) as Cell),
      },
    }
    const samples = [
      { name: 'null', v: null, w: null, choose: true, bypass: false },
      {
        name: 'present_null_fields',
        v: empty,
        w: envelope(one, null, one),
        choose: true,
        bypass: false,
      },
      {
        name: 'nested_null_fields',
        v: envelope(nullLeaf, null, null),
        w: null,
        choose: true,
        bypass: false,
      },
      { name: 'mixed', v: present, w: all, choose: true, bypass: false },
      { name: 'all', v: all, w: present, choose: false, bypass: false },
      { name: 'score', v: envelope(one, null, good), w: all, choose: true, bypass: false },
      {
        name: 'label',
        v: envelope(await leaf(2, 'x'), null, good),
        w: all,
        choose: true,
        bypass: false,
      },
      {
        name: 'phase',
        v: envelope(await leaf(2, 'hi', 'a'), null, good),
        w: all,
        choose: true,
        bypass: false,
      },
      {
        name: 'span',
        v: envelope(await leaf(2, 'hi', 'z', '[20,30)'), null, good),
        w: all,
        choose: true,
        bypass: false,
      },
      {
        name: 'bag',
        v: envelope(await leaf(2, 'hi', 'z', '[1,3)', '{1,2,3,4}'), null, good),
        w: all,
        choose: true,
        bypass: false,
      },
      {
        name: 'doc',
        v: envelope(await leaf(2, 'hi', 'z', '[1,3)', '{1}', '{}'), null, good),
        w: all,
        choose: true,
        bypass: false,
      },
      { name: 'history', v: envelope(good, null, one), w: all, choose: true, bypass: false },
      { name: 'coalesced', v: null, w: envelope(one, null, one), choose: true, bypass: false },
      { name: 'selected', v: present, w: envelope(one, null, one), choose: false, bypass: false },
    ]
    const catalog = await snapshotCatalog(pg),
      options = {
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
        compositeTypeGraph: catalog.compositeTypeGraph,
        executionContext: { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const },
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      options,
    )
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'compositepublic/schema',
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
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const evaluate = (row: unknown) =>
      Object.fromEntries(
        (
          generated.evaluatePublicRecordsChecks(row) as {
            constraint: string
            result: { certain: boolean; value?: boolean | null }
          }[]
        ).map((c) => [c.constraint, c.result]),
      )
    const rt = (name: string) => go.selector(go.ident('checkruntime'), name)
    const wrapper = compositeGoInput
    const table = catalog.tables.find((t) => t.name === 'records')!
    const targets = table.constraints
      .filter((c) => c.type === 'check')
      .flatMap((c) =>
        (['source', 'stored'] as const).map((origin) => ({
          constraint: c.name,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: 'records',
            constraint: origin + '_' + c.name,
          },
          expression: lowerTableCheck(
            table,
            c,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        })),
      )
    const prepared = prepareCheckRustGroup(targets, options.executionContext)
    expect(prepared.checks.every((c) => c.kind === 'supported')).toBe(true)
    writeCheckRustSources(join(root, 'checks.rs'), prepared.source!)
    const rustCell = (c: Cell): string => {
      if (c.kind === 'Composite') return `ArrayElement::Composite(${rustPayload(c.value)})`
      if (c.kind === 'Array')
        return `ArrayElement::Array(ArrayPayload {element_type:${rustStringLiteral(c.value.elementType)}.to_owned(),element_kind:${c.value.elementKind},dimensions:vec![${c.value.dimensions.map((d) => `ArrayDimension {lower:${d.lower},length:${d.length}}`).join(',')}],elements:vec![${c.value.elements.map(rustCell).join(',')}],null_bitmap:BoolValue::Value(${c.value.nullBitmap.kind === 'Value' && c.value.nullBitmap.value})})`
      return rangeRustCell(c)
    }
    const rustPayload = (p: Payload): string =>
      `CompositePayload {type_name:${rustStringLiteral(p.typeName)}.to_owned(),fields:vec![${p.fields.map(rustCell).join(',')}]}`
    const rustWrapper = (p: Payload | null): string =>
      p ? `CompositeValue::Value(${rustPayload(p)})` : 'CompositeValue::Null'
    const rustHelpers: string[] = [],
      rustAssertions: string[] = []
    const cases: string[] = [],
      reference: unknown[] = []
    for (const sample of samples) {
      const v = sample.v?.sql ?? 'NULL::envelope',
        w = sample.w?.sql ?? 'NULL::envelope'
      const flags = (
        await pg.query<{ a: boolean; b: boolean }>(`SELECT (${v}) IS NULL a,(${v}) IS NOT NULL b`)
      ).rows[0]!
      for (const wrong of [false, true]) {
        const row = {
          v: sample.v ? { kind: 'Value', value: sample.v.value } : { kind: 'Null' },
          w: sample.w ? { kind: 'Value', value: sample.w.value } : { kind: 'Null' },
          expected_null: wrong ? !flags.a : flags.a,
          expected_not_null: flags.b,
          choose_first: sample.choose,
          bypass: sample.bypass,
        }
        const expected: Record<string, unknown> = {}
        for (const c of catalog.tables.find((t) => t.name === 'records')!.constraints) {
          if (c.type !== 'check') continue
          const expression = c.definition.replace(/^CHECK \(/, '').replace(/\)$/, '')
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${expression}) value FROM(SELECT ${v} v,${w} w,$1::bool expected_null,$2::bool expected_not_null,$3::bool choose_first,$4::bool bypass)q`,
              [row.expected_null, row.expected_not_null, row.choose_first, row.bypass],
            )
          ).rows[0]!.value
          expected[c.name] = { certain: true, value }
        }
        const saved = structuredClone(row)
        expect(evaluate(row), sample.name + ' ' + wrong).toEqual(expected)
        expect(row).toEqual(saved)
        const insert = pg.query(`INSERT INTO records VALUES(${v},${w},$1,$2,$3,$4)`, [
          row.expected_null,
          row.expected_not_null,
          row.choose_first,
          row.bypass,
        ])
        if (Object.values(expected).some((x) => (x as { value: boolean | null }).value === false))
          await expect(insert).rejects.toMatchObject({ code: '23514' })
        else await insert
        reference.push({ name: sample.name, wrong, expected })
        const nativeIndex = reference.length
        rustHelpers.push(`fn native_v_${nativeIndex}()->CompositeValue {${rustWrapper(sample.v?.value ?? null)}}
fn native_w_${nativeIndex}()->CompositeValue {${rustWrapper(sample.w?.value ?? null)}}`)
        for (const [index, target] of targets.entries()) {
          const entry = prepared.checks[index]!
          if (entry.kind !== 'supported') throw new Error('Unsupported native target')
          const args = entry.inputs.map((input) =>
            input.rustType === 'CompositeValue'
              ? `native_${input.name}_${nativeIndex}()`
              : input.nullness
                ? 'BoolValue::Value(false)'
                : `BoolValue::Value(${Reflect.get(row, input.name)})`,
          )
          const expectedValue = (expected[target.constraint] as { value: boolean | null }).value
          rustAssertions.push(
            `let actual=${entry.entryName}(${args.join(',')});assert!(actual==CheckOutcome::${expectedValue === null ? 'Null' : expectedValue ? 'True' : 'False'},"${sample.name} ${wrong} ${target.identity.constraint}");`,
          )
        }

        const vexpr = printGoFile({
          package: 'public',
          imports: [],
          declarations: [
            {
              kind: 'function',
              name: 'fixture',
              parameters: [],
              results: [{ type: rt('CompositeValue') }],
              body: [{ kind: 'return', expressions: [wrapper(sample.v?.value ?? null)] }],
            },
          ],
        }).match(/return ([\s\S]*)\n\}/)![1]!
        const wexpr = printGoFile({
          package: 'public',
          imports: [],
          declarations: [
            {
              kind: 'function',
              name: 'fixture',
              parameters: [],
              results: [{ type: rt('CompositeValue') }],
              body: [{ kind: 'return', expressions: [wrapper(sample.w?.value ?? null)] }],
            },
          ],
        }).match(/return ([\s\S]*)\n\}/)![1]!
        cases.push(
          `{v:${vexpr},w:${wexpr},rowNull:${row.expected_null},rowNotNull:${row.expected_not_null},choose:${row.choose_first},expected:map[string]int{${Object.entries(
            expected,
          )
            .map(
              ([name, x]) =>
                JSON.stringify(name) +
                ':' +
                ((x as { value: boolean | null }).value === null
                  ? 2
                  : (x as { value: boolean }).value
                    ? 1
                    : 0),
            )
            .join(',')}}}`,
        )
      }
    }
    const base = {
      v: { kind: 'Value', value: structuredClone(present.value) },
      w: { kind: 'Value', value: structuredClone(all.value) },
      expected_null: false,
      expected_not_null: false,
      choose_first: false,
      bypass: false,
    }
    const forged = structuredClone(base)
    const rootChild = forged.v.value.fields[0]!
    if (rootChild.kind !== 'Composite') throw new Error('Expected child composite')
    const range = rootChild.value.fields[3]!
    if (range.kind !== 'Range') throw new Error('Expected child range')
    Object.assign(range.value, {
      support: { comparison: 99, canonical: 99 },
      enumLabels: 'forged',
      enumCount: 999,
      boundProfile: { nodes: [{ child: -1 }] },
    })
    expect(evaluate(forged)).toEqual(evaluate(base))
    const bad = structuredClone(base)
    bad.v.value.fields.pop()
    expect(evaluate(bad).score).toMatchObject({ certain: false })
    expect(evaluate(bad).json_score).toMatchObject({ certain: false })
    for (const c of Object.values(evaluate({ ...bad, bypass: true })))
      expect(c).toMatchObject({ certain: true, value: true })
    const invalid = structuredClone(base)
    const inner = invalid.v.value.fields[0]!
    if (inner.kind !== 'Composite') throw new Error('Expected child')
    inner.value.fields[2] = { kind: 'Enum', value: { ordinal: 999, labelOid: 0n } }
    expect(evaluate(invalid).score).toMatchObject({ certain: false })
    expect(evaluate(invalid).json_phase).toMatchObject({ certain: false })
    await writeFile(
      join(root, 'schema/public/composite_test.go'),
      `package public
import("testing";"reflect";checkruntime "compositepublic/schema/public/checkrust/checkruntime")
func TestCompositePayloads(t *testing.T){
 cases:=[]struct{v,w checkruntime.CompositeValue;rowNull,rowNotNull,choose bool;expected map[string]int}{${cases.join(',')}}
 for i,c:=range cases{skip:=false;row:=PublicRecordsCheckInput{V:KnownCheckValue(c.v),W:KnownCheckValue(c.w),ExpectedNull:KnownCheckValue(&c.rowNull),ExpectedNotNull:KnownCheckValue(&c.rowNotNull),ChooseFirst:KnownCheckValue(&c.choose),Bypass:KnownCheckValue(&skip)}
 for _,result:=range EvaluatePublicRecordsChecks(row){want:=c.expected[result.Constraint];got:=result.Result;if !got.Certain||(!got.Value.Valid&&want!=2)||(got.Value.Valid&&(want==2||got.Value.Value!=(want==1))){t.Fatal(i,result.Constraint,got,want)}}
 }
 c:=cases[6];c.choose=false;skip:=false
 evaluate:=func(v checkruntime.CompositeValue)[]CheckEvaluation {return EvaluatePublicRecordsChecks(PublicRecordsCheckInput{V:KnownCheckValue(v),W:KnownCheckValue(c.w),ExpectedNull:KnownCheckValue(&c.rowNull),ExpectedNotNull:KnownCheckValue(&c.rowNotNull),ChooseFirst:KnownCheckValue(&c.choose),Bypass:KnownCheckValue(&skip)})}
 baseline:=evaluate(c.v)
 forged:=checkruntime.CompositeFromCoercedValue(c.v)
 field:=&forged.Value.Fields[0].Composite.Fields[3].Range
 field.Support.Comparison=99;field.Support.Canonical=99
 field.EnumLabels="forged";field.EnumCount=999
 field.BoundProfile=checkruntime.RangeBoundContext{Nodes:[]checkruntime.RangeBoundProfile{{Child:-1}}}
 if !reflect.DeepEqual(evaluate(forged),baseline){t.Fatal("caller range hints changed composite results")}
 if field.Support.Comparison!=99||field.BoundProfile.Nodes[0].Child!=-1{t.Fatal("composite adapter mutated input metadata")}
 invalid:=checkruntime.CompositeFromCoercedValue(c.v)
 invalid.Value.Fields[0].Composite.Fields[2].Enum.Ordinal=999
 for _,result:=range evaluate(invalid){if result.Constraint=="score"&&result.Result.Certain{t.Fatal("invalid ordinal accepted")}}
 malformed:=checkruntime.CompositeFromCoercedValue(c.v);malformed.Value.Fields=malformed.Value.Fields[:2]
 for _,result:=range evaluate(malformed){if result.Constraint=="score"&&result.Result.Certain{t.Fatal("incomplete composite accepted")}}
 skip=true
 for _,result:=range evaluate(malformed){if !result.Result.Certain||!result.Result.Value.Valid||!result.Result.Value.Value{t.Fatal("skipped malformed input changed result")}}
}
`,
    )
    await writeFile(
      join(root, 'native.rs'),
      `include!("checks.rs");\n${rustHelpers.join('\n')}\n#[test]fn native_composite_checks(){${rustAssertions.join('\n')}}`,
    )
    await run('rustc', [
      '--edition',
      '2021',
      '-Awarnings',
      '--test',
      join(root, 'native.rs'),
      '-o',
      join(root, 'native-test'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    await run(join(root, 'native-test'), []).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    await writeFile(join(root, 'go.mod'), 'module compositepublic\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/composite-payload', { recursive: true })
    await writeFile(
      'artifacts/composite-payload/report.json',
      JSON.stringify(
        {
          nativeInserts: reference.length,
          nativeRustComparisons: rustAssertions.length,
          profiles: 2,
          compiledContexts: true,
          forgedHints: true,
          invalidFields: true,
          reference,
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
