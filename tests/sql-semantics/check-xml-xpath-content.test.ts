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

it('matches XPath node string values through document, namespace and shared entity graphs in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-content-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_content',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: TextValue, owner: Int4Value, step: TextValue, position: Int4Value) -> CheckOutcome {
   let result = xpath_content_probe(input,expected,owner,step,position); check_from_bool(result)
  }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_content.rs'))!.source += String.raw`
pub fn xpath_content_probe(input: TextValue, expected: TextValue, owner: Int4Value, step: TextValue, position: Int4Value) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let Int4Value::Value(wanted) = owner {
   if let Int4Value::Value(selected_position) = position {
    if let TextValue::Value(expression) = step {
     let input = xml_query_content(raw.as_str());
     if xml_query_well_formed(input.as_str()) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
     let document = xpath_document_parse(input.as_str()); let tree = document.tree; let graph = document.graph;
     if xml_query_names_valid(&tree) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
     let mut context = xpath_reference_node(0); let mut ordinal: i32 = 0;
     while ordinal < wanted && context.kind >= 0 {
      let next = xml_query_following_node(&tree,context.node);
      if next == 0 { context = XPathReference { kind: -1, node: 0, index: 0 }; } else { context = xpath_reference_node(next); };
      ordinal = ordinal+1;
     }
     if expression.as_str() != "" {
      let program = xpath_compile(expression.as_str()); let root = program.nodes[program.root];
      let namespaces = xpath_namespaces_empty(); let test = xpath_node_test(&program,root,&namespaces);
      let sequence = xpath_graph_axis_test(&tree,&graph,context,root.operation,&test);
      let selected = xpath_sequence_position(&sequence,selected_position);
      if selected.known == false { return BoolValue::Unknown; };
      context = selected.value;
     };
     let mut text = String::new();
     if context.kind >= 0 { text = xpath_reference_string(&tree,&graph,context); };
     let actual = TextValue::Value(text); return sql__pg_catalog__texteq__aet8(actual,expected);
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'expected', 'owner', 'step', 'position'].map((name) => ({
      name,
      rustName: name,
      type: ['owner', 'position'].includes(name) ? 'pg_catalog.int4' : 'pg_catalog.text',
      rustType: ['owner', 'position'].includes(name) ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const samples = [
      '<r/>',
      '<!--outside--><r a="x&#10;y" b="x &amp; y">one<![CDATA[two]]>three<![CDATA[]]><a>inner</a><!--comment--><?p value?>tail</r><?after outside?>',
      '<r xmlns="urn:r" xmlns:p="urn:p" p:a="値"><p:c xmlns:p="urn:other">雪😊</p:c><c xmlns="">文</c></r>',
      '<!DOCTYPE r [<!ENTITY e "x">]><r>&e;&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r><a/>&f;<b/>&e;<c/></r>',
      '<!DOCTYPE r [<!ENTITY e "&f;"><!ENTITY f "<hidden/>text">]><r><a/>&e;<b/></r>',
      '<!--before--><!DOCTYPE r [<!--dtd--><?inside value?><!ENTITY e "<hidden>text<c/></hidden>tail">]><r><a/>&e;<b/></r>',
      '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r a="&f;"><a/><b/></r>',
      '<!DOCTYPE r [<!ENTITY e "x"><!ATTLIST r a CDATA "&e;">]><r/>',
      '<!DOCTYPE r [<!ENTITY e "urn:p"><!ATTLIST r xmlns:p CDATA "&e;">]><r><p:a/></r>',
      '<!DOCTYPE r [<!ENTITY e ""><!ENTITY f "x">]><r>a&e;b&f;c</r>',
      '<!DOCTYPE r [<!ENTITY % defs \'<!ENTITY e "<hidden/>text">\'>%defs;]><r><a/>&e;<b/></r>',
      '<!DOCTYPE r [<!ENTITY e "&#38;amp; &lt; &#x1f60a;">]><r><a/>&e;<b/></r>',
      '<!DOCTYPE r [<!ENTITY e " x &#10; y "><!ATTLIST r a NMTOKENS #IMPLIED>]><r a="&e;"/>',
    ]
    for (const type of ['CDATA', 'NMTOKENS', 'ID'])
      for (const attribute of [
        ' x   y ',
        ' pre  &e;  post ',
        '&e;',
        '&#10; a &#x9; b ',
        'x&#13;y',
        'x&#13;&#10;y',
        'x\ry',
        'x\r\ny',
        '&#38;#13;',
        '&amp;#13;',
        '&f;',
      ])
        samples.push(
          `<!DOCTYPE r [<!ENTITY e " x &#10; y "><!ENTITY f "&e; z "><!ATTLIST r a ${type} #IMPLIED>]><r a="${attribute}"/>`,
        )
    for (const entity of ['x&#13;y', 'x&#13;&#10;y', 'x\ry', 'x\r\ny', '&#38;#13;', '&amp;#13;'])
      samples.push(`<!DOCTYPE r [<!ENTITY e "${entity}">]><r a="&e;"/>`)
    for (const body of [
      '<r>&e;</r>',
      '<r a="&e;">&e;</r>',
      '<r>&e;<c a="&e;"/></r>',
      '<r a="&f;">&e;</r>',
      '<r>&f;<c a="&e;"/></r>',
    ])
      samples.push(`<!DOCTYPE r [<!ENTITY e "x&#13;y"><!ENTITY f "&e;z">]>${body}`)
    for (const uri of ['&e;', '&#117;rn:p', ' x   y ', 'urn:a&amp;b', 'urn:a&lt;b'])
      samples.push(
        `<!DOCTYPE r [<!ENTITY e "urn:p"><!ATTLIST r xmlns:p CDATA "${uri}">]><r><p:a/></r>`,
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_string(v xml,path text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
   SELECT value FROM XMLTABLE('/' PASSING v COLUMNS value text PATH ('string('||path||')'))x $fn$;
   CREATE TEMP TABLE xpath_content_checked(v xml,path text,wanted text,CHECK(pg_temp.xpath_string(v,path)=wanted));`)
    for (const input of samples) {
      const owners = (
        await pg.query<{ ordinal: number; attributes: number; namespaces: number }>(
          `SELECT ordinal,attributes,namespaces FROM (SELECT $1::xml v)s,
    XMLTABLE('/ | //node()' PASSING v COLUMNS ordinal FOR ORDINALITY,attributes int PATH 'count(@*)',namespaces int PATH 'count(namespace::*)')x`,
          [input],
        )
      ).rows
      const cases: { owner: number; step: string; position: number; path: string }[] = []
      for (const owner of owners) {
        const context = `((/ | //node())[${owner.ordinal}])`
        cases.push({ owner: owner.ordinal - 1, step: '', position: 0, path: context })
        for (const [step, count] of [
          ['attribute::*', owner.attributes],
          ['namespace::*', owner.namespaces],
        ] as const)
          for (let position = 1; position <= count; position++)
            cases.push({
              owner: owner.ordinal - 1,
              step,
              position,
              path: `${context}/${step}[${position}]`,
            })
        for (const step of ['following::node()', 'preceding::node()'])
          for (const position of [1, 2, 3])
            cases.push({
              owner: owner.ordinal - 1,
              step,
              position,
              path: `${context}/${step}[${position}]`,
            })
      }
      const rows = (
        await pg.query<{ id: number; value: string }>(
          `SELECT id::int,value FROM (SELECT $1::xml v)s,unnest($2::text[])WITH ORDINALITY paths(expression,id),
    XMLTABLE('/' PASSING v COLUMNS value text PATH ('string('||expression||')'))x ORDER BY id`,
          [input, cases.map((c) => c.path)],
        )
      ).rows
      expect(rows).toHaveLength(cases.length)
      for (const [index, result] of rows.entries()) {
        const item = cases[index]!
        const row: Row = {
          input: value(input),
          expected: value(result.value),
          owner: value(item.owner),
          step: value(item.step),
          position: value(item.position),
        }
        fixtures.push({ name: 'matches', row, expected: { kind: 'True' } })
        reference.push({ input, ...item, expected: result.value })
        if (item.step === '') {
          await pg.query('INSERT INTO xpath_content_checked VALUES($1::xml,$2,$3)', [
            input,
            item.path,
            result.value,
          ])
          const wrong = 'different\n' + result.value
          await expect(
            pg.query('INSERT INTO xpath_content_checked VALUES($1::xml,$2,$3)', [
              input,
              item.path,
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
    const packet = 'artifacts/goal-checks/xml-xpath-values-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/content-reference.json',
      JSON.stringify(
        { samples: samples.length, reference, fixtures: fixtures.length, inserts },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathcontent', group, ['matches'], fixtures)
    console.info('XPath content parity', {
      samples: samples.length,
      cases: reference.length,
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
