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

const descriptor = `concat(name(.),'~',name(..),'~',count(ancestor::node()),'~',count(preceding-sibling::node()),'~',count(. | ../@*)=count(../@*),'~',count(. | ../namespace::*)=count(../namespace::*))`
type Selection = { code: string; path: string }

it('matches native XPath union identity and document sorting across namespace nodes, entities and sort-run boundaries in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-order-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_order',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, left: TextValue, right: TextValue, expected: TextValue, mode: Int4Value) -> CheckOutcome {
      let result = xpath_order_probe(input,left,right,expected,mode); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_order.rs'))!.source += String.raw`
fn xpath_order_describe(tree: &XmlTree, value: XPathReference) -> String {
 let named = xpath_reference_name(tree,value); let parent = xpath_reference_parent(tree,value);
 let mut parent_name = String::new();
 if parent.kind >= 0 { let name = xpath_reference_name(tree,parent); parent_name = name.qualified; };
 let test = XPathNodeTest {kind:2,principal:1,name:String::new(),uri:String::new(),prefixed:false,valid:true};
 let ancestors = xpath_local_axis_test(tree,value,7,&test); let siblings = xpath_local_axis_test(tree,value,10,&test);
 let mut output = named.qualified; output.push('~'); output.push_str(parent_name.as_str()); output.push('~');
 let depth = text_number(ancestors.values.len() as i32,10); output.push_str(depth.as_str()); output.push('~');
 let before = text_number(siblings.values.len() as i32,10); output.push_str(before.as_str()); output.push('~');
 if value.kind == 1 { output.push_str("true"); } else { output.push_str("false"); }; output.push('~');
 if value.kind == 2 { output.push_str("true"); } else { output.push_str("false"); }; output
}
fn xpath_order_read(tree: &XmlTree, graph: &XPathGraph, input: &str) -> XPathNodes {
 let source = XmlSource {characters:input.chars().collect()}; let mut result = xpath_nodes_empty();
 let mut position: usize = 0; let mut owner: i32 = 0; let mut kind: i32 = 0; let mut number: i32 = 0; let mut field: i32 = 0;
 while position <= source.characters.len() && source.characters.len() > 0 {
  let mut character = ','; if position < source.characters.len() { character = source.characters[position]; };
  if character == '.' { if field == 0 { owner = number; } else { kind = number; }; number = 0; field = field+1; }
  else if character == ',' {
   let mut context = xpath_reference_node(0); let mut ordinal: i32 = 0;
   while ordinal < owner && context.kind >= 0 {
    let next = xml_query_following_node(tree,context.node);
    if next == 0 { context = XPathReference {kind:-1,node:0,index:0}; } else { context = xpath_reference_node(next); };
    ordinal = ordinal+1;
   }
   if kind == 1 || kind == 2 {
    let mut axis: i32 = 2; if kind == 2 { axis = 13; };
    let found = xpath_local_axis(tree,context,axis);
    context = XPathReference {kind:-1,node:0,index:0};
    let index = usize::try_from(number-1).unwrap_or(0);
    if number > 0 && index < found.values.len() { context = found.values[index]; };
   } else if kind == 3 || kind == 4 {
    let mut axis: i32 = 11; if kind == 4 { axis = 12; };
    let test = XPathNodeTest {kind:2,principal:1,name:String::new(),uri:String::new(),prefixed:false,valid:true};
    let found = xpath_graph_axis_test(tree,graph,context,axis,&test); let selected = xpath_sequence_position(&found,number);
    context = selected.value;
   };
   if context.kind >= 0 { result = xpath_nodes_unique(result,context); };
   owner = 0; kind = 0; number = 0; field = 0;
  } else { number = number*10+numeric_wire_decimal_digit(character); };
  position += 1;
 }
 result
}
pub fn xpath_order_probe(input: TextValue, left: TextValue, right: TextValue, expected: TextValue, mode: Int4Value) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let TextValue::Value(a) = left {
   if let TextValue::Value(b) = right {
    if let Int4Value::Value(passes) = mode {
     let prepared = xml_query_content(raw.as_str()); let document = xpath_document_parse(prepared.as_str()); let tree = document.tree; let graph = document.graph;
     let first = xpath_order_read(&tree,&graph,a.as_str()); let second = xpath_order_read(&tree,&graph,b.as_str());
     let mut nodes = xpath_nodes_merge(first,&second,&tree); let mut pass: i32 = 0;
     while pass < passes { nodes = xpath_nodes_sort(nodes,&tree); pass = pass+1; }
     let mut output = String::new(); let mut index: usize = 0;
     while index < nodes.values.len() {
      if index > 0 { output.push('\n'); };
      let description = xpath_order_describe(&tree,nodes.values[index]); output.push_str(description.as_str()); index += 1;
     }
     return sql__pg_catalog__texteq__aet8(TextValue::Value(output),expected);
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'left', 'right', 'expected', 'mode'].map((name) => ({
      name,
      rustName: name,
      type: name === 'mode' ? 'pg_catalog.int4' : 'pg_catalog.text',
      rustType: name === 'mode' ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_order_description(v xml,p text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
      SELECT coalesce(string_agg(d,E'\n' ORDER BY n),'') FROM XMLTABLE(p PASSING v COLUMNS n FOR ORDINALITY,d text PATH '${descriptor.replaceAll("'", "''")}')x $fn$;
      CREATE TEMP TABLE xpath_order_checked(v xml,p text,wanted text,CHECK(pg_temp.xpath_order_description(v,p)=wanted));`)
    const samples = [
      '<r xmlns:p="urn:p" xmlns:q="urn:q" a="1" b="2"><c x="3"/></r>',
      '<!--before--><r>a<![CDATA[b]]>c<a x="1" y="2"><i/>tail</a><b><j/></b><!--end--><?p value?></r><?after x?>',
      '<r xmlns="urn:r" xmlns:p="urn:p"><c xmlns="" xmlns:p="urn:other" xmlns:q="urn:q"><d a="1"/><p:e/></c><f/></r>',
      '<!DOCTYPE r [<!ENTITY e "<hidden/>text">]><r><a/>&e;<b/></r>',
      '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r a="&f;"><a/>&e;<b/></r>',
      '<r xmlns:p="urn:p" xmlns:q="urn:q">' +
        Array.from({ length: 96 }, (_, i) => `<n${i} a="${i}" b="x">t${i}</n${i}>`).join('') +
        '</r>',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      largeCases = 0,
      seed = 185472
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed
    }
    for (const [sample, input] of samples.entries()) {
      const owners = (
        await pg.query<{ n: number; attrs: number; ns: number }>(
          `SELECT n,attrs,ns FROM (SELECT $1::xml v)s,XMLTABLE('/ | //node()' PASSING v COLUMNS n FOR ORDINALITY,attrs int PATH 'count(@*)',ns int PATH 'count(namespace::*)')x`,
          [input],
        )
      ).rows
      const selections: Selection[] = []
      for (const owner of owners) {
        const path = `((/ | //node())[${owner.n}])`
        selections.push({ code: `${owner.n - 1}.0.0`, path })
        for (const [kind, axis, count] of [
          [1, 'attribute', owner.attrs],
          [2, 'namespace', owner.ns],
        ] as const)
          for (let position = 1; position <= count; position++)
            selections.push({
              code: `${owner.n - 1}.${kind}.${position}`,
              path: `${path}/${axis}::*[${position}]`,
            })
        if (input.includes('<!ENTITY'))
          for (const [kind, axis] of [
            [3, 'following'],
            [4, 'preceding'],
          ] as const)
            for (const position of [1, 2, 3])
              selections.push({
                code: `${owner.n - 1}.${kind}.${position}`,
                path: `${path}/${axis}::node()[${position}]`,
              })
      }
      const cases: { left: Selection[]; right: Selection[]; mode: number; path: string }[] = []
      const add = (list: Selection[], mode = 1) => {
        const split = next() % (list.length + 1),
          left = list.slice(0, split),
          right = list.slice(split)
        const union = list.map((s) => s.path).join(' | ') || '/*[false()]'
        cases.push({ left, right, mode, path: mode === 2 ? `(${union})` : union })
      }
      add([])
      add(selections)
      add([...selections].reverse())
      const small = selections.slice(0, Math.min(selections.length, 12))
      for (const a of small)
        for (const b of small) {
          add([a, b])
          add([a, b, a], 2)
        }
      for (let i = 0; i < 50; i++) {
        const list = Array.from(
          { length: 3 + (next() % 21) },
          () => selections[next() % selections.length]!,
        )
        add(list)
        if (i % 5 === 0) add(list, 2)
      }
      if (sample === samples.length - 1) {
        for (const length of [
          31, 32, 33, 63, 64, 65, 95, 96, 127, 128, 129, 191, 192, 193, 255, 256, 257,
        ]) {
          const base = selections.slice(0, length)
          for (const list of [
            base,
            [...base].reverse(),
            [...base.slice(Math.floor(length / 2)), ...base.slice(0, Math.floor(length / 2))],
            Array.from({ length }, () => selections[next() % selections.length]!),
          ]) {
            add(list)
            add(list, 2)
            largeCases += 2
          }
        }
      }
      const expected = (
        await pg.query<{ id: number; value: string }>(
          `SELECT id::int,pg_temp.xpath_order_description($1::xml,p) value FROM unnest($2::text[])WITH ORDINALITY paths(p,id) ORDER BY id`,
          [input, cases.map((c) => c.path)],
        )
      ).rows
      expect(expected).toHaveLength(cases.length)
      for (const [index, item] of cases.entries()) {
        const row: Row = {
          input: value(input),
          left: value(item.left.map((s) => s.code).join(',')),
          right: value(item.right.map((s) => s.code).join(',')),
          expected: value(expected[index]!.value),
          mode: value(item.mode),
        }
        reference.push({
          sample,
          input,
          ...item,
          expected: expected[index]!.value,
          fixtureIndex: fixtures.length,
        })
        fixtures.push({ name: 'matches', row, expected: { kind: 'True' } })
        if (index % 37 === 0) {
          await pg.query('INSERT INTO xpath_order_checked VALUES($1::xml,$2,$3)', [
            input,
            item.path,
            expected[index]!.value,
          ])
          await expect(
            pg.query('INSERT INTO xpath_order_checked VALUES($1::xml,$2,$3)', [
              input,
              item.path,
              'different\n' + expected[index]!.value,
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          fixtures.push({
            name: 'matches',
            row: { ...row, expected: value('different\n' + expected[index]!.value) },
            expected: { kind: 'False' },
          })
          inserts += 2
        }
      }
    }
    const base = fixtures[0]!.row
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
    const packet = 'artifacts/goal-checks/xml-xpath-order-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/order-reference.json',
      JSON.stringify(
        { samples: samples.length, largeCases, inserts, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathorder', group, ['matches'], fixtures)
    console.info('XPath order parity', {
      samples: samples.length,
      cases: reference.length,
      largeCases,
      inserts,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
