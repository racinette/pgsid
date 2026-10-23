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

const axes = [
  'child',
  'attribute',
  'self',
  'parent',
  'descendant',
  'descendant-or-self',
  'ancestor',
  'ancestor-or-self',
  'following-sibling',
  'preceding-sibling',
  'following',
  'preceding',
  'namespace',
]
const descriptor = `concat(name(.),'~',local-name(.),'~',namespace-uri(.),'~',name(..),'~',count(ancestor::node()),'~',count(preceding::node()),'~',count(preceding-sibling::node()),'~',count(. | ../@*)=count(../@*),'~',count(. | ../namespace::*)=count(../namespace::*))`
const nativeNamespaces = `ARRAY[ARRAY['p','urn:p'],ARRAY['q','urn:p'],ARRAY['u','urn:u']]`
const nativeXmlNamespaces = `XMLNAMESPACES('urn:p' AS p,'urn:p' AS q,'urn:u' AS u)`

it('matches XPath axis positions and node tests over regular, attribute and namespace contexts without entity references in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-axes-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_axes',
      constraint: 'positions',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: TextValue, owner: Int4Value, context_kind: Int4Value, context_position: Int4Value, step: TextValue) -> CheckOutcome {
      let result = xpath_axes_probe(input,expected,owner,context_kind,context_position,step); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.find((file) => file.path.endsWith('/xml_xpath_axes.rs'))!.source += String.raw`
const SQLSTATE_XPATH_PROBE_ERROR: u32 = 1687400;
fn xpath_axes_describe(tree: &XmlTree, graph: &XPathGraph, value: XPathReference) -> String {
 let name = xpath_reference_name(tree,value);
 let parent = xpath_reference_parent(tree,value);
 let mut parent_name = String::new();
 if parent.kind >= 0 { let named = xpath_reference_name(tree,parent); parent_name = named.qualified; };
 let test = XPathNodeTest { kind: 2, principal: 1, name: String::new(), uri: String::new(), prefixed: false, valid: true };
 let ancestors = xpath_graph_axis_test(tree,graph,value,7,&test); let preceding = xpath_graph_axis_test(tree,graph,value,12,&test); let siblings = xpath_graph_axis_test(tree,graph,value,10,&test);
 let ancestor_count = int4_to_text(Int4Value::Value(ancestors.values.len() as i32));
 let preceding_count = int4_to_text(Int4Value::Value(preceding.values.len() as i32));
 let sibling_count = int4_to_text(Int4Value::Value(siblings.values.len() as i32));
 let mut output = name.qualified;
 output.push('~'); output.push_str(name.local.as_str()); output.push('~'); output.push_str(name.namespace.as_str()); output.push('~'); output.push_str(parent_name.as_str());
 if let TextValue::Value(text) = ancestor_count { output.push('~'); output.push_str(text.as_str()); };
 if let TextValue::Value(text) = preceding_count { output.push('~'); output.push_str(text.as_str()); };
 if let TextValue::Value(text) = sibling_count { output.push('~'); output.push_str(text.as_str()); };
 output.push('~'); if value.kind == 1 { output.push_str("true"); } else { output.push_str("false"); };
 output.push('~'); if value.kind == 2 { output.push_str("true"); } else { output.push_str("false"); };
 output
}

pub fn xpath_axes_probe(input: TextValue, expected: TextValue, owner: Int4Value, context_kind: Int4Value, context_position: Int4Value, step: TextValue) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let Int4Value::Value(wanted) = owner {
   if let Int4Value::Value(kind) = context_kind {
    if let Int4Value::Value(position) = context_position {
     if let TextValue::Value(expression) = step {
      let input = xml_query_content(raw.as_str());
      if xml_well_formed(input.as_str(),true) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
      let document = xpath_document_parse(input.as_str()); let tree = document.tree; let graph = document.graph;
      if xml_query_names_valid(&tree) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
      let mut context = xpath_reference_node(0); let mut ordinal: i32 = 0;
      while ordinal < wanted && context.kind >= 0 {
       let next = xml_query_following_node(&tree,context.node);
       if next == 0 { context = XPathReference { kind: -1, node: 0, index: 0 }; }
       else { context = xpath_reference_node(next); };
       ordinal = ordinal + 1;
      }
      if kind != 0 {
       let mut axis: i32 = 2; if kind == 2 { axis = 13; };
       let candidates = xpath_local_axis(&tree,context,axis);
       let index = usize::try_from(position-1).unwrap_or(0);
       context = XPathReference { kind: -1, node: 0, index: 0 };
       if position > 0 && index < candidates.values.len() { context = candidates.values[index]; };
      };
      let program = xpath_compile(expression.as_str());
      let root = program.nodes[program.root];
      if program.valid == false || root.kind != XPATH_STEP { return BoolValue::Error(make_sql_error(SQLSTATE_XPATH_PROBE_ERROR)); };
      let mut namespaces = xpath_namespaces_empty();
      namespaces = xpath_namespaces_push(namespaces,"p","urn:replaced");
      namespaces = xpath_namespaces_push(namespaces,"p","urn:p");
      namespaces = xpath_namespaces_push(namespaces,"q","urn:p");
      namespaces = xpath_namespaces_push(namespaces,"u","urn:u");
      namespaces = xpath_namespaces_push(namespaces,"e","");
      namespaces = xpath_namespaces_push(namespaces,"xml","urn:ignored");
      let test = xpath_node_test(&program,root,&namespaces);
      if test.valid == false { return BoolValue::Error(make_sql_error(SQLSTATE_XPATH_PROBE_ERROR)); };
      let selected = xpath_graph_axis_test(&tree,&graph,context,root.operation,&test);
      if selected.cyclic { return BoolValue::Unknown; };
      let mut output = String::new(); let mut index: usize = 0;
      while index < selected.values.len() {
       if index > 0 { output.push('\n'); };
       let text = xpath_axes_describe(&tree,&graph,selected.values[index]); output.push_str(text.as_str()); index += 1;
      }
      let actual = TextValue::Value(output);
      return sql__pg_catalog__texteq__aet8(actual,expected);
     };
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'expected', 'owner', 'context_kind', 'context_position', 'step'].map(
      (name) => ({
        name,
        type:
          name === 'owner' || name.startsWith('context_') ? 'pg_catalog.int4' : 'pg_catalog.text',
        rustName: name,
        rustType: name === 'owner' || name.startsWith('context_') ? 'Int4Value' : 'TextValue',
      }),
    )
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const samples = [
      '<r/>',
      '<!--before--><r a="1" b="2"><a x="3"><i/>t<j/></a><b y="4"><k/></b><c/><!--tail--></r><?after x?>',
      '<r xmlns="urn:r" xmlns:p="urn:p" xmlns:z="urn:z"><c xmlns="" xmlns:p="urn:u" xmlns:q="urn:p" a="x"><d p:x="a" q:x="b"/><p:e/></c></r>',
      '<r xmlns:p="urn:p" xmlns:xml="http://www.w3.org/XML/1998/namespace" xml:lang="en"><p:a p:x="x" q="v"/><a xmlns:p="urn:u"/><p:a/></r>',
      '<r>one<![CDATA[two]]>three<![CDATA[]]><a/><!--c--><?p x?><?q y?>tail</r>',
      '<!DOCTYPE r [<!ATTLIST r xmlns:p CDATA "urn:p" plain CDATA "ignored">]><r><p:a/><b/></r>',
      '<雪 xmlns:p="urn:p" p:属性="値"><😊/>é&amp;&lt;<雪/></雪>',
    ]
    for (const [prefix, uri] of [
      ['p', ''],
      ['xml', 'wrong'],
      ['xmlns', 'urn:p'],
      ['1p', 'urn:p'],
      ['p', '&e;'],
      ['p', 'urn:a&amp;b'],
      ['p', ' x   y '],
    ])
      samples.push(
        `<!DOCTYPE r [<!ENTITY e "urn:p"><!ATTLIST r xmlns:${prefix} CDATA "${uri}">]><r/>`,
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let contextCount = 0,
      inserts = 0
    await pg.exec(`CREATE TEMP TABLE xpath_axis_checked(v xml,path text,n int,
      CHECK((xpath('count('||path||')',v,${nativeNamespaces}))[1]::text::int=n))`)
    for (const sample of samples) {
      const owners = (
        await pg
          .query<{ ordinal: number; attributes: number; namespaces: number }>(
            `SELECT ordinal,attributes,namespaces FROM (SELECT $1::xml v) src,
          XMLTABLE('/ | //node()' PASSING v COLUMNS ordinal FOR ORDINALITY,
            attributes int PATH 'count(@*)',namespaces int PATH 'count(namespace::*)') x`,
            [sample],
          )
          .catch((error: unknown) => {
            throw new Error(`Native axis reference for ${sample}`, { cause: error })
          })
      ).rows
      const contexts: { owner: number; kind: number; position: number; path: string }[] = []
      for (const owner of owners) {
        const path = `(/ | //node())[${owner.ordinal}]`
        contexts.push({ owner: owner.ordinal - 1, kind: 0, position: 0, path: `(${path})` })
        for (const [kind, count, axis] of [
          [1, owner.attributes, 'attribute'],
          [2, owner.namespaces, 'namespace'],
        ] as const)
          for (let position = 1; position <= count; position++)
            contexts.push({
              owner: owner.ordinal - 1,
              kind,
              position,
              path: `(${path}/${axis}::*[${position}])`,
            })
      }
      contextCount += contexts.length
      const cases = contexts.flatMap((context) =>
        axes.flatMap((axis) => {
          const tests = ['node()', '*']
          if (context.kind === 0 && context.owner <= 2)
            tests.push(
              'text()',
              'comment()',
              'processing-instruction()',
              "processing-instruction('p')",
              'a',
              'p:a',
              'q:*',
              'u:*',
              'xml:lang',
            )
          return tests.map((test) => ({ context, step: axis + '::' + test }))
        }),
      )
      const expressions = cases.map(({ context, step }) => context.path + '/' + step)
      const expected = (
        await pg
          .query<{ id: number; output: string | null; count: number }>(
            `SELECT id::int,output,count FROM (SELECT $1::xml v) src,
          unnest($2::text[]) WITH ORDINALITY paths(expression,id)
          CROSS JOIN LATERAL (SELECT (xpath('count('||expression||')',v,${nativeNamespaces}))[1]::text::int count) counts
          CROSS JOIN LATERAL (
            SELECT string_agg(description,chr(10) ORDER BY n) output
            FROM generate_series(1,count) n,
            XMLTABLE(${nativeXmlNamespaces},(expression||'[position()='||n||']') PASSING v
              COLUMNS description text PATH '${descriptor.replaceAll("'", "''")}') x
          ) result ORDER BY id`,
            [sample, expressions],
          )
          .catch((error: unknown) => {
            throw new Error(`Native axis reference for ${sample}`, { cause: error })
          })
      ).rows
      expect(expected).toHaveLength(cases.length)
      for (const [index, row] of expected.entries()) {
        const { context, step } = cases[index]!
        expect(row.id).toBe(index + 1)
        const data: Row = {
          input: value(sample),
          expected: value(row.output ?? ''),
          owner: value(context.owner),
          context_kind: value(context.kind),
          context_position: value(context.position),
          step: value(step),
        }
        fixtures.push({ name: 'positions', row: data, expected: { kind: 'True' } })
        reference.push({ sample, context, step, expected: row.output ?? '', count: row.count })
        if (context.owner === 1 && context.kind === 0 && step.endsWith('::node()')) {
          await pg.query('INSERT INTO xpath_axis_checked VALUES($1::xml,$2,$3)', [
            sample,
            expressions[index],
            row.count,
          ])
          await expect(
            pg.query('INSERT INTO xpath_axis_checked VALUES($1::xml,$2,$3)', [
              sample,
              expressions[index],
              row.count + 1,
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          fixtures.push({
            name: 'positions',
            row: { ...data, expected: value('different\n' + (row.output ?? '')) },
            expected: { kind: 'False' },
          })
          inserts += 2
        }
      }
    }
    const base = fixtures[0]!.row
    for (const owner of [0, 999])
      for (const step of ['child::missing:a', 'attribute::missing:*', 'namespace::missing:*']) {
        await expect(
          pg.query('SELECT xpath($1,$2::xml)', [`((/ | //node())[${owner + 1}])/${step}`, '<r/>']),
        ).rejects.toMatchObject({ code: '10608' })
        fixtures.push({
          name: 'positions',
          row: { ...base, owner: value(owner), step: value(step) },
          expected: { kind: 'Error', value: { state: parseInt('10608', 36) } },
        })
      }
    for (const step of ['child::e:*', 'child::e:r', 'attribute::e:*']) {
      expect(
        (
          await pg.query<{ count: number }>(
            "SELECT (xpath($1,$2::xml,ARRAY[ARRAY['e','']]))[1]::text::int count",
            [`count((/*)/${step})`, '<r a="x"><r/></r>'],
          )
        ).rows[0]!.count,
      ).toBe(0)
      fixtures.push({
        name: 'positions',
        row: {
          ...base,
          input: value('<r a="x"><r/></r>'),
          expected: value(''),
          owner: value(1),
          step: value(step),
        },
        expected: { kind: 'True' },
      })
    }
    fixtures.push(
      { name: 'positions', row: { ...base, input: { kind: 'Null' } }, expected: { kind: 'Null' } },
      {
        name: 'positions',
        row: { ...base, input: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'positions',
        row: { ...base, input: { kind: 'Error', value: { state: parseInt('22023', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      },
    )
    const packet = 'artifacts/goal-checks/xml-xpath-axes-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/axes-reference.json',
      JSON.stringify(
        { samples: samples.length, contextCount, inserts, reference, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathaxes', group, ['positions'], fixtures)
    console.info('XPath axes parity', {
      samples: samples.length,
      contextCount,
      cases: reference.length,
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('records native entity graph traversal and early-stop results before SQL query admission', async () => {
  const pg = await PGlite.create()
  try {
    const reference: unknown[] = []
    for (const [replacement, following, preceding, count] of [
      ['x', 'r', '', 1],
      ['<hidden/>text', 'hidden', 'hidden', 2],
    ] as const) {
      const input = `<!DOCTYPE r [<!ENTITY e "${replacement}">]><r><a/>&e;<b/></r>`
      for (const [expression, expected] of [
        ['name(/*/a/following::*[1])', following],
        ['name(/*/b/preceding::*[1])', preceding],
        ['count(/*/b/preceding::node())', String(count)],
      ]) {
        const actual = (
          await pg.query<{ value: string }>('SELECT (xpath($1,$2::xml))[1]::text value', [
            expression,
            input,
          ])
        ).rows[0]!.value
        expect(actual, expression).toBe(expected)
        reference.push({ input, expression, value: actual })
      }
    }
    await mkdir('artifacts/goal-checks/xml-xpath-axes-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-xpath-axes-active/entity-graph-reference.json',
      JSON.stringify({ targetParityPending: true, reference }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
})
