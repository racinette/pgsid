import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  goParityModule,
  runCheckParity,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

it('parses and renders record text with ordered field conversion, NULL fields, quoting, modifiers and lazy casts', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-text-'))
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);CREATE TYPE stage AS ENUM('z','a');
CREATE TYPE words AS(a text,obsolete int4,b text);ALTER TYPE words DROP ATTRIBUTE obsolete;
CREATE TYPE numbers AS(a int4,b text);CREATE TYPE guarded_words AS(a positive,b text);
CREATE TYPE widths AS(a varchar(3),b char(3));CREATE TYPE flags AS(a bool,b stage);
CREATE TYPE quantities AS(a numeric(5,2),b int2);CREATE TYPE containers AS(a int4[],b jsonb);
CREATE TYPE nested AS(a numbers,b text);CREATE TYPE enum_bags AS(a stage[],b text);CREATE TYPE no_fields AS();`)
    const inputs: Record<string, (string | null)[]> = {
      words: [
        null,
        '(,)',
        '(a,b)',
        ' (a,b) \t',
        '("",)',
        '(,"NULL")',
        '(NULL,null)',
        '( a , b )',
        '("a,b","x)y")',
        '(a"b"c,d)',
        '("a""b",c)',
        String.raw`(a\,b,x\\y)`,
        '(雪,😊)',
        '("a\nb",x)',
        '(a,b)junk',
        '(a,b,c)',
        '(a)',
        '(a,"unterminated)',
        'a,b',
        '(a,b',
        '(,)',
        String.raw`("\\",q)`,
      ],
      numbers: [
        null,
        '(1,a)',
        '(-1,"")',
        '(,x)',
        '(2147483648,"unterminated)',
        '(2147483648,x,y)',
        '(bad,x)',
        '(1,x,y)',
        '(1)',
        '()',
      ],
      guarded_words: [
        null,
        '(1,x)',
        '(,x)',
        '(,"unterminated)',
        '(-1,"unterminated)',
        '(0,x)',
        '(2147483648,x)',
        '(2,x,y)',
      ],
      widths: ['(abc,x)', '(abcd,x)', '(abc ,x)', '(,)', '("","")', '(雪😊,a)'],
      flags: ['(true,z)', '(off,a)', '(,z)', '(true,bad)', '(bad,z)'],
      quantities: [
        '(1.235,2)',
        '(999.999,2)',
        '(NaN,32767)',
        '(1.00,32768)',
        '(,)',
        '(Infinity,2)',
      ],
      containers: ['("{1,NULL,2}","{""a"":1.00}")', '(,null)', '("{}",[])', '(bad,null)'],
      nested: ['("(1,x)",y)', '("(2147483648,x)",y)', '(,y)', '("(1,"")",y)'],
      enum_bags: ['("{z,a}",x)', '(,x)', '("{z,NULL,a}",x)'],
      no_fields: ['()', ' () ', '(,)', '(x)', '', null],
    }
    for (const type of Object.keys(inputs))
      await pg.exec(
        `CREATE TABLE gate_${type}(payload text,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (payload::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.keys(inputs).flatMap((type) => {
      const table = catalog.tables.find((t) => t.name === 'gate_' + type)!,
        c = table.constraints.find((c) => c.name === 'valid')!
      return (['source', 'stored'] as const).map((origin) => ({
        name: type + '_' + origin,
        expression: lowerTableCheck(
          table,
          c,
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
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [type, values] of Object.entries(inputs))
      for (const value of values) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ($1::text::${type})::text value`, [
              value,
            ])
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const expected: Outcome =
            error && !bypass
              ? { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: 'True' }
          const row: Row = {
            payload: value === null ? { kind: 'Null' } : { kind: 'Value', value },
            expected: output === null ? { kind: 'Null' } : { kind: 'Value', value: output },
            bypass: { kind: 'Value', value: bypass },
          }
          const insert = pg.query(`INSERT INTO gate_${type} VALUES($1,$2,$3)`, [
            value,
            output,
            bypass,
          ])
          if (error && !bypass) await expect(insert).rejects.toMatchObject({ code: error })
          else await insert
          reference.push({ type, value, bypass, output, error })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: type + '_' + origin, row, expected })
        }
      }
    await mkdir('artifacts/composite-text', { recursive: true })
    await writeFile('artifacts/composite-text/plans.json', JSON.stringify(plans, null, 2))
    await writeFile('artifacts/composite-text/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositetext',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-text/report.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)

it('owns record cursor snapshots and preserves partial fields and ordered failed conversions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-composite-text-states-'))
  try {
    const error = parseInt('22003', 36),
      syntax = parseInt('22P02', 36)
    const probes: { rust: string; expected: Outcome }[] = [
      { rust: 'composite_text_snapshot()', expected: { kind: 'True' } },
      { rust: 'composite_output_snapshot()', expected: { kind: 'True' } },
      {
        rust: 'composite_row_is_null(finish_composite_text(prepare_composite_text(TextValue::Unknown,2),"public.pair"))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'composite_row_is_null(finish_composite_text(prepare_composite_text(TextValue::Null,2),"public.pair"))',
        expected: { kind: 'True' },
      },
      {
        rust: `composite_row_is_null(finish_composite_text(prepare_composite_text(TextValue::Error(make_sql_error(${error})),2),"public.pair"))`,
        expected: { kind: 'Error', value: { state: error } },
      },
      {
        rust: 'composite_row_is_null(finish_composite_text(append_composite_text(prepare_composite_text(make_text_value("(a,unterminated"),2),ArrayElement::Unknown,false),"public.pair"))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: `composite_row_is_null(finish_composite_text(append_composite_text(prepare_composite_text(make_text_value("(a,unterminated"),2),ArrayElement::Error(make_sql_error(${error})),false),"public.pair"))`,
        expected: { kind: 'Error', value: { state: error } },
      },
      {
        rust: `composite_row_is_null(finish_composite_text(append_composite_text(prepare_composite_text(make_text_value("(a,unterminated"),2),ArrayElement::Int4(1),false),"public.pair"))`,
        expected: { kind: 'Error', value: { state: syntax } },
      },
      { rust: 'int4_is_null(composite_text_partial_field())', expected: { kind: 'Unknown' } },
      { rust: 'composite_row_is_not_null(composite_text_partial())', expected: { kind: 'False' } },
      {
        rust: 'composite_text_equal(finish_composite_output(append_composite_output(TextValue::Unknown,TextValue::Null,true)),"()")',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'composite_text_equal(finish_composite_output(append_composite_output(TextValue::Null,TextValue::Unknown,true)),"()")',
        expected: { kind: 'Null' },
      },
      {
        rust: `composite_text_equal(finish_composite_output(append_composite_output(TextValue::Error(make_sql_error(${error})),TextValue::Unknown,true)),"()")`,
        expected: { kind: 'Error', value: { state: error } },
      },
      {
        rust: 'composite_text_equal(prepare_composite_output(make_composite_fields("public.other"),"public.pair",0),"()")',
        expected: { kind: 'Unknown' },
      },
    ]
    const helper = `
fn composite_text_equal(input:TextValue,expected:&str)->BoolValue {
 if let TextValue::Error(error)=input{return BoolValue::Error(error);};
 if let TextValue::Null=input{return BoolValue::Null;};
 if let TextValue::Value(text)=input{return make_bool_value(text.as_str()==expected);};BoolValue::Unknown
}
fn composite_text_partial()->CompositeValue {
 let first=prepare_composite_text(make_text_value("(,x)"),2);
 let second=append_composite_text(first,ArrayElement::Unknown,true);
 let third=append_composite_text(second,ArrayElement::Null,true);
 finish_composite_text(third,"public.pair")
}
fn composite_text_partial_field()->Int4Value {array_element_to_int4(composite_field_at(composite_text_partial(),make_int4_value(0)))}
fn composite_text_snapshot()->BoolValue {
 let first=prepare_composite_text(make_text_value("(a,b)"),2);
 let child=append_composite_field(make_composite_fields("public.child"),ArrayElement::Int4(7));
 let original=append_composite_text(first,array_element_from_composite(child),false);let saved=original.clone();
 if let CompositeTextPlan::Value(payload)=original {
  let mut characters=payload.characters;characters[3]='x';
  let mut current=payload.current;if let TextValue::Value(text)=current {let mut changed=text;changed.push('x');};
  let cell=payload.fields[0].clone();if let ArrayElement::Composite(value)=cell {let mut nested=value.fields;nested[0]=ArrayElement::Int4(99);};
  let mut fields=payload.fields;fields[0]=ArrayElement::Unknown;
 };
 let text=composite_text_field(saved.clone());if let TextValue::Value(value)=text {if value.as_str()!="b" {return make_bool_value(false);};};
 let finished=finish_composite_text(append_composite_text(saved,ArrayElement::Null,false),"public.pair");
 let nested=array_element_to_composite(composite_field_at(finished,make_int4_value(0)));
 let number=array_element_to_int4(composite_field_at(nested,make_int4_value(0)));
 if let Int4Value::Value(n)=number{return make_bool_value(n==7);};BoolValue::Unknown
}
fn composite_output_snapshot()->BoolValue {
 let original=append_composite_output(make_text_value("("),make_text_value("a,b"),true);let saved=original.clone();
 if let TextValue::Value(text)=original {let mut changed=text;changed.push('x');};
 composite_text_equal(finish_composite_output(append_composite_output(saved,TextValue::Null,false)),"(\\\"a,b\\\",)")
}
pub fn composite_text_state_probe(mode:Int4Value)->BoolValue {if let Int4Value::Value(n)=mode {${probes.map((p, i) => `if n==${i}{return ${p.rust};};`).join('\n')}};BoolValue::Unknown}
pub fn composite_text_kept_cursor(input:CompositeTextPlan)->CompositeTextPlan {input.clone()}
`
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'record_cursor',
        constraint: 'states',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=composite_text_state_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/composite_text_states.rs', source: helper })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    await mkdir(join(root, 'go/pg_catalog'), { recursive: true })
    await writeFile(
      join(root, 'go/pg_catalog/composite_text_boundary_test.go'),
      `package pg_catalog
import (
 "testing"
 . "${goParityModule}/checkruntime"
)
func TestCompositeTextCursorCopies(t *testing.T) {
 original:=AppendCompositeText(PrepareCompositeText(MakeTextValue("(a,b)"),2),ArrayElement{Kind:ArrayElementComposite,Composite:CompositePayload{TypeName:"public.child",Fields:[]ArrayElement{{Kind:ArrayElementInt4,Int4:7}}}},false)
 saved:=CompositeTextKeptCursor(original)
 original.Value.Characters[3]='x'
 original.Value.Fields[0].Composite.Fields[0]=ArrayElement{Kind:ArrayElementInt4,Int4:99}
 if saved.Value.Characters[3]!='b'||saved.Value.Fields[0].Composite.Fields[0].Int4!=7 {t.Fatal("cursor clone aliases input")}
}
`,
    )
    await runCheckParity(
      root,
      'compositetextstates',
      group,
      ['record_cursor'],
      probes.map((p, i) => ({
        name: 'record_cursor',
        row: { mode: { kind: 'Value', value: i } },
        expected: p.expected,
      })),
    )
    const runtime = await import(
      pathToFileURL(join(root, 'typescript/checkruntime/runtime.ts')).href
    )
    const operations = await import(
      pathToFileURL(join(root, 'typescript/pg_catalog/operations.ts')).href
    )
    const original = operations.appendCompositeText(
      operations.prepareCompositeText(runtime.makeTextValue('(a,b)'), 2),
      {
        kind: 'Composite',
        value: { typeName: 'public.child', fields: [{ kind: 'Int4', value: 7 }] },
      },
      false,
    )
    const saved = operations.compositeTextKeptCursor(original)
    original.value.characters[3] = 'x'
    original.value.fields[0].value.fields[0] = { kind: 'Int4', value: 99 }
    expect(saved.value.characters[3]).toBe('b')
    expect(saved.value.fields[0].value.fields[0]).toEqual({ kind: 'Int4', value: 7 })
    await mkdir('artifacts/composite-text-states', { recursive: true })
    await writeFile(
      'artifacts/composite-text-states/report.json',
      JSON.stringify({
        fixtures: probes.length,
        ownedCursorSnapshots: true,
        ownedOutputSnapshots: true,
      }) + '\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)

it('requires captured input implementations for source records and output implementations for stored records', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TYPE reading AS(score int4,label text);CREATE TABLE inputs(payload text,CHECK (('(1,x)'::reading).score=1));`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'inputs')!,
      constraint = table.constraints.find((c) => c.type === 'check')!
    for (const [identity, property, origin, supported] of [
      ['public.reading', 'input', 'source', false],
      ['public.reading', 'input', 'stored', true],
      ['public.reading', 'output', 'source', true],
      ['public.reading', 'output', 'stored', false],
      ['pg_catalog.int4', 'input', 'source', false],
      ['pg_catalog.int4', 'input', 'stored', true],
      ['pg_catalog.int4', 'output', 'source', true],
      ['pg_catalog.int4', 'output', 'stored', false],
    ] as const) {
      const graph = structuredClone(catalog.compositeTypeGraph)!
      graph.definitions.find((d) => d.identity === identity)![property] =
        'function:["application","custom_io"](pg_catalog.cstring)'
      const expression = lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          graph,
        )!.expression,
        result = prepareCheckRustGroup([
          {
            expression,
            identity: { schema: 'public', kind: 'table', owner: 'inputs', constraint: 'metadata' },
          },
        ]).checks[0]!
      expect(result.kind, [identity, property, origin].join('/')).toBe(
        supported ? 'supported' : 'unsupported',
      )
    }
  } finally {
    await pg.close()
  }
})

it('prepares source literals eagerly and restores stored records without replaying field-domain checks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-text-literals-'))
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);CREATE TYPE saved_pair AS(n positive,label text);
CREATE TYPE wrapper AS(child saved_pair,label text);CREATE TYPE duration AS(value interval hour,label text);CREATE DOMAIN hour_value AS interval hour;CREATE TYPE inherited_duration AS(value hour_value,label text);
CREATE TABLE old_literal(bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ('(1,x)'::saved_pair).n=1 END));
CREATE TABLE old_nested(bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ('("(1,x)",y)'::wrapper).child.n=1 END));
ALTER DOMAIN positive DROP CONSTRAINT positive_check;ALTER DOMAIN positive ADD CHECK(VALUE>5);
CREATE TABLE literal_inputs(payload text,bypass bool);
CREATE TABLE duration_inputs(payload text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE extract(hour FROM (payload::duration).value)>=1 END));CREATE TABLE inherited_duration_inputs(payload text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE extract(hour FROM (payload::inherited_duration).value)>=1 END));`)
    const catalog = await snapshotCatalog(pg)
    const targets: {
      name: string
      expression: NonNullable<ReturnType<typeof lowerTableCheck>>['expression']
      identity: { schema: string; kind: 'table'; owner: string; constraint: string }
    }[] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const tableName of ['old_literal', 'old_nested']) {
      const table = catalog.tables.find((t) => t.name === tableName)!,
        constraint = table.constraints.find((c) => c.name === 'valid')!
      for (const origin of ['source', 'stored'] as const) {
        const name = tableName + '_' + origin
        targets.push({
          name,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: { schema: 'public', kind: 'table', owner: tableName, constraint: origin },
        })
        for (const bypass of [false, true]) {
          let expected: Outcome = { kind: 'True' }
          if (origin === 'stored') await pg.query(`INSERT INTO ${tableName} VALUES($1)`, [bypass])
          else {
            try {
              await pg.query(
                `SELECT ${constraint.definition.replace(/^CHECK \(/, '').replace(/\)$/, '')} value FROM (SELECT $1::bool bypass)q`,
                [bypass],
              )
            } catch (e) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((e as { code: string }).code, 36) },
              }
            }
          }
          fixtures.push({ name, row: { bypass: { kind: 'Value', value: bypass } }, expected })
          reference.push({ name, bypass, expected })
        }
      }
    }
    const table = catalog.tables.find((t) => t.name === 'literal_inputs')!
    for (const [name, expression] of Object.entries({
      eager_domain: "CASE WHEN bypass THEN true ELSE ('(1,x)'::saved_pair).n=1 END",
      eager_null: "CASE WHEN bypass THEN true ELSE ('(,x)'::saved_pair).n=1 END",
      eager_overflow: "CASE WHEN bypass THEN true ELSE ('(2147483648,x,y)'::saved_pair).n=1 END",
      lazy_input: 'CASE WHEN bypass THEN true ELSE (payload::saved_pair).n>5 END',
      varchar_output: "CASE WHEN bypass THEN true ELSE (payload::saved_pair)::varchar(3)='(6,' END",
      padded_output:
        "CASE WHEN bypass THEN true ELSE (payload::saved_pair)::char(12)::text='(6,x)' END",
      padded_input: 'CASE WHEN bypass THEN true ELSE ((payload::char(20))::saved_pair).n>5 END',
      constant_pruned: "CASE WHEN true THEN true ELSE ('(6,x)'::saved_pair).n>5 END",
    })) {
      targets.push({
        name,
        expression: lowerTableCheck(
          table,
          { type: 'check', name, definition: `CHECK(${expression})` },
          catalog.enums,
          catalog.domains,
          'source',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
      })
      await pg.exec(`CREATE TABLE oracle_${name}(payload text,bypass bool)`)
      for (const bypass of [false, true])
        for (const payload of [null, '(1,x)', '(6,x)', '(2147483648,x,y)']) {
          await pg.exec(`TRUNCATE oracle_${name}`)
          await pg.query(`INSERT INTO oracle_${name} VALUES($1,$2)`, [payload, bypass])
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${expression}) value FROM oracle_${name}`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (e) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          fixtures.push({
            name,
            row: {
              payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
              bypass: { kind: 'Value', value: bypass },
            },
            expected,
          })
          reference.push({ name, payload, bypass, expected })
        }
    }
    for (const type of ['duration', 'inherited_duration']) {
      const duration = catalog.tables.find((t) => t.name === type + '_inputs')!,
        constraint = duration.constraints.find((c) => c.name === 'valid')!
      for (const origin of ['source', 'stored'] as const) {
        const name = type + '_' + origin
        targets.push({
          name,
          expression: lowerTableCheck(
            duration,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: { schema: 'public', kind: 'table', owner: duration.name, constraint: origin },
        })
        for (const payload of ['(1,x)', '(1.5,x)', '(0,x)', '(,x)']) {
          let expected: Outcome = { kind: 'True' }
          try {
            await pg.query(`INSERT INTO ${type}_inputs VALUES($1,false)`, [payload])
          } catch (e) {
            const code = (e as { code: string }).code
            expected =
              code === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          if (expected.kind === 'True') {
            const result = (
              await pg.query<{ value: boolean | null }>(
                `SELECT extract(hour FROM ($1::text::${type}).value)>=1 value`,
                [payload],
              )
            ).rows[0]!.value
            if (result === null) expected = { kind: 'Null' }
          }
          fixtures.push({
            name,
            row: {
              payload: { kind: 'Value', value: payload },
              bypass: { kind: 'Value', value: false },
            },
            expected,
          })
        }
      }
    }
    const group = prepareCheckRustGroup(targets, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, targets[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    await mkdir('artifacts/composite-text-literals', { recursive: true })
    await writeFile(
      'artifacts/composite-text-literals/plans.json',
      JSON.stringify(targets, null, 2),
    )
    await runCheckParity(
      root,
      'compositetextliterals',
      group,
      targets.map((t) => t.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-text-literals/report.json',
      JSON.stringify({ fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
