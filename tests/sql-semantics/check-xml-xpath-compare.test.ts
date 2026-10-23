import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

type Operand = { kind: number; raw: string; nodes: readonly string[] }
const quoted = (s: string) => `'${s.replaceAll("'", "''")}'`
const escaped = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('\r', '&#13;')
const expression = (v: Operand, side: 'a' | 'b') =>
  v.kind === 1
    ? `/r/${side}/n`
    : v.kind === 2
      ? v.raw + '()'
      : v.kind === 3
        ? `number(${quoted(v.raw)})`
        : quoted(v.raw)
const document = (a: Operand, b: Operand) =>
  `<r><a>${a.nodes.map((s) => `<n>${escaped(s)}</n>`).join('')}</a><b>${b.nodes.map((s) => `<n>${escaped(s)}</n>`).join('')}</b></r>`

it('matches XPath scalar conversions and existential comparisons without confusing missing numeric facts with traversal requirements', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-compare-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    await pg.exec('SET extra_float_digits=3')
    const powers = (
      await pg.query<{ bits: string }>(
        `SELECT encode(float8send((xpath('number('||quote_literal('1e'||n)||')','<r/>'::xml))[1]::text::float8),'hex')bits FROM generate_series(-323,308)n ORDER BY n`,
      )
    ).rows
    expect(powers).toHaveLength(632)
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_compare',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, a: TextValue, b: TextValue, ak: Int4Value, bk: Int4Value, op: Int4Value, profile: Int4Value, expected: TextValue) -> CheckOutcome {
      let result = xpath_comparison_probe(input,a,b,ak,bk,op,profile,expected); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_compare.rs'))!.source += `
const XPATH_COMPARISON_SQLSTATE: u32 = 1687400;
const XPATH_COMPARE_POWER_BITS: &[i64] = &[${powers.map((p) => BigInt.asIntN(64, BigInt('0x' + p.bits)).toString() + 'i64').join(',')}];
fn xpath_compare_test_powers() -> XPathPowers {
 let mut result = xpath_powers_empty(); let mut index: usize = 0;
 while index < XPATH_COMPARE_POWER_BITS.len() { result = xpath_powers_push(result,XPATH_COMPARE_POWER_BITS[index]); index += 1; } result
}
fn xpath_compare_test_value(tree: &XmlTree, powers: &XPathPowers, side: i32, kind: i32, raw: &str) -> XPathValue {
 if kind == 1 {
  let root = xml_query_child(tree,0); let mut context = xml_query_child(tree,root);
  if side == 1 { context = xml_query_next(tree,context); };
  let found = xpath_local_axis(tree,xpath_reference_node(context),1);
  return xpath_value_nodes(XPathSequence {values:found.values,cyclic:false,cycle:0});
 };
 if kind == 2 { return xpath_value_boolean(raw == "true"); };
 if kind == 3 { return xpath_number_text(raw,powers); };
 xpath_value_string(raw.to_owned())
}
pub fn xpath_comparison_probe(input: TextValue, a: TextValue, b: TextValue, ak: Int4Value, bk: Int4Value, op: Int4Value, profile: Int4Value, expected: TextValue) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let TextValue::Value(at) = a {
   if let TextValue::Value(bt) = b {
    if let Int4Value::Value(a_kind) = ak {
     if let Int4Value::Value(b_kind) = bk {
      if let Int4Value::Value(operation) = op {
       if let Int4Value::Value(facts) = profile {
        let document = xpath_document_parse(raw.as_str()); let tree = document.tree; let graph = document.graph;
        let mut powers = xpath_powers_empty(); if facts == 1 { powers = xpath_compare_test_powers(); };
        let mut left = xpath_compare_test_value(&tree,&powers,0,a_kind,at.as_str());
        let mut right = xpath_compare_test_value(&tree,&powers,1,b_kind,bt.as_str());
        if facts == 2 { let values: Vec<XPathReference> = Vec::new(); left = xpath_value_nodes(XPathSequence {values,cyclic:true,cycle:0}); };
        if facts == 3 { left = xpath_value_fault(5); };
        if facts == 4 { right = xpath_value_fault(5); };
        let mut result = xpath_value_empty(XPATH_KIND_BOOLEAN,0);
        if operation == 10 { result = xpath_value_to_boolean(&left); }
        else if operation == 11 { result = xpath_value_to_string(left,&tree,&graph); }
        else if operation == 12 { result = xpath_value_to_number(left,&tree,&graph,&powers); }
        else { result = xpath_values_compare(&left,&right,operation,&tree,&graph,&powers); };
        if result.state < 0 { return BoolValue::Error(make_sql_error(XPATH_COMPARISON_SQLSTATE)); };
        if result.state != 0 { return BoolValue::Unknown; };
        let mut output = String::new();
        if result.kind == XPATH_KIND_BOOLEAN { if result.boolean { output = "true".to_owned(); } else { output = "false".to_owned(); }; }
        else if result.kind == XPATH_KIND_STRING { output = result.text; }
        else {
         let number = f64::from_bits(result.number as u64);
         if number != number { output = "NaN".to_owned(); } else { output = text_signed_number(result.number); };
        };
        return sql__pg_catalog__texteq__aet8(TextValue::Value(output),expected);
       };
      };
     };
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'a', 'b', 'ak', 'bk', 'op', 'profile', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: ['ak', 'bk', 'op', 'profile'].includes(name) ? 'pg_catalog.int4' : 'pg_catalog.text',
      rustType: ['ak', 'bk', 'op', 'profile'].includes(name) ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_scalar_text(v xml,p text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
      SELECT result FROM XMLTABLE('/' PASSING v COLUMNS result text PATH p)x $fn$;
      CREATE FUNCTION pg_temp.xpath_comparison_result(v xml,p text,mode int) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
      SELECT CASE WHEN mode=12 THEN CASE WHEN n::text='NaN' THEN 'NaN' ELSE (('x'||encode(float8send(n),'hex'))::bit(64)::bigint)::text END ELSE pg_temp.xpath_scalar_text(v,p) END
      FROM (SELECT CASE WHEN mode=12 THEN (xpath(p,v))[1]::text::float8 ELSE 0 END n)s $fn$;
      CREATE TEMP TABLE xpath_comparison_checked(v xml,p text,mode int,wanted text,CHECK(pg_temp.xpath_comparison_result(v,p,mode)=wanted));`)
    const nodeValues = [
      [],
      [''],
      ['0'],
      ['1'],
      ['2', '10'],
      ['1', '2'],
      ['x', 'NaN'],
      ['1e-1', '0.1'],
      ['1e23', '100000000000000000000000'],
      ['-0', '0'],
      ['2', '2'],
    ]
    const operands: Operand[] = [
      ...nodeValues.map((nodes) => ({ kind: 1, raw: '', nodes })),
      ...['true', 'false'].map((raw) => ({ kind: 2, raw, nodes: [] })),
      ...['0', '-0', '1', '-2', '0.1', '1e-1', '1e23', '0e9999'].map((raw) => ({
        kind: 3,
        raw,
        nodes: [],
      })),
      ...['', '0', '1', '2', 'x', '0.1', 'NaN', '雪'].map((raw) => ({ kind: 4, raw, nodes: [] })),
    ]
    const operations = [
      [3, '='],
      [4, '!='],
      [5, '<'],
      [6, '<='],
      [7, '>'],
      [8, '>='],
    ] as const
    const cases: {
      a: Operand
      b: Operand
      op: number
      input: string
      path: string
      profile: number
      unknown?: boolean
    }[] = []
    for (const a of operands)
      for (const b of operands)
        for (const [op, symbol] of operations)
          cases.push({
            a,
            b,
            op,
            input: document(a, b),
            path: `${expression(a, 'a')} ${symbol} ${expression(b, 'b')}`,
            profile: 1,
          })
    for (const a of operands)
      for (const [op, name] of [
        [10, 'boolean'],
        [11, 'string'],
        [12, 'number'],
      ] as const)
        cases.push({
          a,
          b: operands[0]!,
          op,
          input: document(a, operands[0]!),
          path: `${name}(${expression(a, 'a')})`,
          profile: 1,
        })
    const missingNumber: Operand = { kind: 3, raw: '1e-1', nodes: [] },
      zero: Operand = { kind: 3, raw: '0', nodes: [] },
      nan: Operand = { kind: 3, raw: '0e9999', nodes: [] }
    for (const [a, b, op, unknown] of [
      [missingNumber, zero, 3, true],
      [missingNumber, zero, 7, true],
      [nan, missingNumber, 3, false],
      [missingNumber, nan, 4, false],
      [operands[0]!, missingNumber, 3, false],
      [{ kind: 1, raw: '', nodes: ['0', '1e-1'] }, zero, 3, false],
      [{ kind: 1, raw: '', nodes: ['x', '1e-1'] }, zero, 4, false],
      [{ kind: 1, raw: '', nodes: ['x', '1e-1'] }, zero, 3, true],
    ] as const) {
      const symbol = operations.find(([n]) => n === op)![1]
      cases.push({
        a,
        b,
        op,
        input: document(a, b),
        path: `${expression(a, 'a')} ${symbol} ${expression(b, 'b')}`,
        profile: 0,
        unknown,
      })
    }
    const expected = (
      await pg.query<{ id: number; value: string }>(
        `SELECT id::int,pg_temp.xpath_comparison_result(v::xml,p,mode) value FROM unnest($1::text[],$2::text[],$3::int[])WITH ORDINALITY t(v,p,mode,id) ORDER BY id`,
        [cases.map((c) => c.input), cases.map((c) => c.path), cases.map((c) => c.op)],
      )
    ).rows
    expect(expected).toHaveLength(cases.length)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    for (const [index, item] of cases.entries()) {
      const row: Row = {
        input: value(item.input),
        a: value(item.a.raw),
        b: value(item.b.raw),
        ak: value(item.a.kind),
        bk: value(item.b.kind),
        op: value(item.op),
        profile: value(item.profile),
        expected: value(expected[index]!.value),
      }
      reference.push({ ...item, expected: expected[index]!.value, fixtureIndex: fixtures.length })
      fixtures.push({ name: 'matches', row, expected: { kind: item.unknown ? 'Unknown' : 'True' } })
      if (index % 211 === 0) {
        await pg.query('INSERT INTO xpath_comparison_checked VALUES($1::xml,$2,$3,$4)', [
          item.input,
          item.path,
          item.op,
          expected[index]!.value,
        ])
        const wrong = 'different\n' + expected[index]!.value
        await expect(
          pg.query('INSERT INTO xpath_comparison_checked VALUES($1::xml,$2,$3,$4)', [
            item.input,
            item.path,
            item.op,
            wrong,
          ]),
        ).rejects.toMatchObject({ code: '23514' })
        fixtures.push({
          name: 'matches',
          row: { ...row, expected: value(wrong) },
          expected: { kind: 'False' },
        })
        inserts += 2
      }
    }
    const base = fixtures[0]!.row
    for (const op of [3, 4, 5, 10, 11, 12])
      fixtures.push({
        name: 'matches',
        row: { ...base, profile: value(2), op: value(op) },
        expected: { kind: 'Unknown' },
      })
    for (const op of [3, 4, 5, 10, 11, 12])
      fixtures.push({
        name: 'matches',
        row: {
          ...base,
          a: value('0e9999'),
          b: value('0e9999'),
          ak: value(3),
          bk: value(3),
          op: value(op),
          profile: value(3),
        },
        expected: { kind: 'Error', value: { state: parseInt('10608', 36) } },
      })
    for (const op of [3, 4, 5])
      fixtures.push({
        name: 'matches',
        row: {
          ...base,
          a: value('0e9999'),
          b: value('0e9999'),
          ak: value(3),
          bk: value(3),
          op: value(op),
          profile: value(4),
        },
        expected: { kind: 'Error', value: { state: parseInt('10608', 36) } },
      })
    fixtures.push(
      { name: 'matches', row: { ...base, input: { kind: 'Null' } }, expected: { kind: 'Null' } },
      {
        name: 'matches',
        row: { ...base, input: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'matches',
        row: { ...base, input: { kind: 'Error', value: { state: parseInt('22023', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      },
    )
    const packet = 'artifacts/goal-checks/xml-xpath-eval-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/comparison-reference.json',
      JSON.stringify(
        {
          operands: operands.length,
          cases: cases.length,
          fixtures: fixtures.length,
          inserts,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathcompare', group, ['matches'], fixtures)
    console.info('XPath comparison parity', {
      operands: operands.length,
      cases: cases.length,
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
