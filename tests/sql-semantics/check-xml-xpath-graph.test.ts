import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

const leaf = `self::text() | self::comment() | self::processing-instruction() | self::node()[count(. | ../@*)=count(../@*) or count(. | ../namespace::*)=count(../namespace::*)]`
const description = `concat(name(.),'~',local-name(.),'~',namespace-uri(.),'~',name(..),'~',count(ancestor::node()),'~',string(${leaf}))`
const namespaces = `XMLNAMESPACES('urn:p' AS p,'urn:q' AS q)`

it('matches finite XPath selections through shared entity declaration graphs in Rust and both targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-graph-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_graph',
      constraint: 'selected',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: TextValue, owner: Int4Value, step: TextValue, position: Int4Value, after: TextValue, after_position: Int4Value) -> CheckOutcome {
      let result = xpath_graph_probe(input,expected,owner,step,position,after,after_position); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.find((file) => file.path.endsWith('/xml_xpath_walk.rs'))!.source += String.raw`
fn xpath_graph_describe(tree: &XmlTree, graph: &XPathGraph, value: XPathReference) -> String {
 if value.kind < 0 { return String::new(); };
 let name = xpath_reference_name(tree,value); let parent = xpath_reference_parent(tree,value);
 let mut parent_name = String::new();
 if parent.kind >= 0 { let parent = xpath_reference_name(tree,parent); parent_name = parent.qualified; };
 let test = XPathNodeTest { kind: 2, principal: 1, name: String::new(), uri: String::new(), prefixed: false, valid: true };
 let ancestors = xpath_graph_axis_test(tree,graph,value,7,&test);
 let count = int4_to_text(Int4Value::Value(ancestors.values.len() as i32));
 let text = xpath_reference_leaf(tree,value);
 let mut output = name.qualified; output.push('~'); output.push_str(name.local.as_str()); output.push('~'); output.push_str(name.namespace.as_str()); output.push('~'); output.push_str(parent_name.as_str()); output.push('~');
 if let TextValue::Value(count_text) = count { output.push_str(count_text.as_str()); };
 output.push('~'); output.push_str(text.as_str()); output
}

fn xpath_graph_selected(tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, context: XPathReference, expression: &str, position: i32) -> XPathSelection {
 let program = xpath_compile(expression);
 let root = program.nodes[program.root];
 let test = xpath_node_test(&program,root,namespaces);
 let selected = xpath_graph_axis_test(tree,graph,context,root.operation,&test);
 xpath_sequence_position(&selected,position)
}

pub fn xpath_graph_probe(input: TextValue, expected: TextValue, owner: Int4Value, step: TextValue, position: Int4Value, after: TextValue, after_position: Int4Value) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let Int4Value::Value(wanted) = owner {
   if let Int4Value::Value(selected_position) = position {
    if let Int4Value::Value(next_position) = after_position {
     if let TextValue::Value(expression) = step {
      if let TextValue::Value(after_expression) = after {
       let input = xml_query_content(raw.as_str());
       if xml_query_well_formed(input.as_str()) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
       let document = xpath_document_parse(input.as_str()); let tree = document.tree; let graph = document.graph;
       if xml_query_names_valid(&tree) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
       let mut namespaces = xpath_namespaces_empty(); namespaces = xpath_namespaces_push(namespaces,"p","urn:p"); namespaces = xpath_namespaces_push(namespaces,"q","urn:q");
       let mut context = xpath_reference_node(0); let mut ordinal: i32 = 0;
       while ordinal < wanted && context.kind >= 0 {
        let next = xml_query_following_node(&tree,context.node);
        if next == 0 { context = XPathReference { kind: -1, node: 0, index: 0 }; }
        else { context = xpath_reference_node(next); };
        ordinal = ordinal + 1;
       }
       let selected = xpath_graph_selected(&tree,&graph,&namespaces,context,expression.as_str(),selected_position);
       if selected.known == false { return BoolValue::Unknown; };
       let mut result = selected;
       if after_expression.as_str() != "" { result = xpath_graph_selected(&tree,&graph,&namespaces,selected.value,after_expression.as_str(),next_position); };
       if result.known == false { return BoolValue::Unknown; };
       let text = xpath_graph_describe(&tree,&graph,result.value); let actual = TextValue::Value(text);
       return sql__pg_catalog__texteq__aet8(actual,expected);
      };
     };
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = [
      'input',
      'expected',
      'owner',
      'step',
      'position',
      'after',
      'after_position',
    ].map((name) => ({
      name,
      rustName: name,
      type: ['owner', 'position', 'after_position'].includes(name)
        ? 'pg_catalog.int4'
        : 'pg_catalog.text',
      rustType: ['owner', 'position', 'after_position'].includes(name) ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const samples = [
      { input: '<!DOCTYPE r [<!ENTITY e "x">]><r><a/>&e;<b/></r>', text: true, elementCycle: true },
      {
        input:
          '<!DOCTYPE r [<!ENTITY e \'<hidden k="v">text<c/></hidden>tail\'>]><r><a/>&e;<b/></r>',
        text: true,
        elementCycle: true,
      },
      { input: '<!DOCTYPE r [<!ENTITY e "">]><r><a/>&e;<b/></r>', text: false, elementCycle: true },
      {
        input: '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r><a/>&f;<b/>&e;<c/></r>',
        text: true,
        elementCycle: false,
      },
      {
        input: '<!DOCTYPE r [<!ENTITY e "&f;"><!ENTITY f "<hidden/>text">]><r><a/>&e;<b/></r>',
        text: true,
        elementCycle: true,
      },
      {
        input:
          '<!--before--><!DOCTYPE r [<!--in-dtd--><?inside value?><!ENTITY e "<hidden/>text">]><r><a/>&e;<b/></r><?after value?>',
        text: true,
        elementCycle: true,
      },
      {
        input: '<!DOCTYPE r [<!ENTITY e "x">]><r a="&e;"><a/><b/></r>',
        text: false,
        elementCycle: true,
      },
      {
        input: '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r a="&f;"><a/><b/></r>',
        text: true,
        elementCycle: true,
      },
      {
        input:
          '<!DOCTYPE r [<!ENTITY e \'<p:hidden xmlns:p="urn:p" p:k="v"><q:c xmlns:q="urn:q"/></p:hidden>text\'>]><r xmlns:p="urn:outer"><a/>&e;<b/></r>',
        text: true,
        elementCycle: true,
      },
      {
        input:
          '<!DOCTYPE r [<!ENTITY % declarations \'<!ENTITY e "<hidden/>text">\'>%declarations;]><r><a/>&e;<b/></r>',
        text: true,
        elementCycle: true,
      },
      {
        input:
          '<!--before--><!DOCTYPE r [<!--in-dtd--><?inside value?><!ELEMENT r ANY><!ATTLIST r a CDATA #IMPLIED>]><r><a/><b/></r>',
        text: false,
        elementCycle: true,
      },
      {
        input:
          '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY unused "<unprepared/>">]><r><a/>&e;<b/>&e;<c/></r>',
        text: true,
        elementCycle: true,
      },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_graph_description(v xml,path text) RETURNS text
      LANGUAGE SQL IMMUTABLE STRICT AS $fn$
      SELECT COALESCE((SELECT string_agg(description,chr(10)) FROM
        XMLTABLE(${namespaces},path PASSING v COLUMNS description text PATH '${description.replaceAll("'", "''")}')x),'')
      $fn$;
      CREATE TEMP TABLE xpath_graph_checked(v xml,path text,wanted text,
        CHECK(pg_temp.xpath_graph_description(v,path)=wanted));`)
    for (const sample of samples) {
      await mkdir('artifacts/goal-checks/xml-xpath-graph-active', { recursive: true })
      await writeFile(
        'artifacts/goal-checks/xml-xpath-graph-active/native-current.json',
        JSON.stringify({ sample }, null, 2) + '\n',
      )
      const owners = (
        await pg.query<{ ordinal: number; name: string }>(
          `SELECT ordinal,name FROM (SELECT $1::xml v)src,
        XMLTABLE('/ | //node()' PASSING v COLUMNS ordinal FOR ORDINALITY,name text PATH 'name(.)')x`,
          [sample.input],
        )
      ).rows
      const cases: {
        owner: number
        step: string
        position: number
        after: string
        afterPosition: number
        path: string
      }[] = []
      for (const owner of owners) {
        if (!['a', 'b', 'c', 'r', ''].includes(owner.name)) continue
        const context = `((/ | //node())[${owner.ordinal}])`
        const steps = [
          'following::node()',
          'following::*',
          'preceding::node()',
          'preceding::*',
          'ancestor::node()',
          'child::node()',
        ]
        if (!sample.elementCycle) steps.splice(steps.indexOf('following::*'), 1)
        if (sample.text) steps.push('following::text()')
        for (const step of steps)
          for (const position of [1, 2, 3, 5, 9, 17]) {
            const base = `${context}/${step}[${position}]`
            cases.push({
              owner: owner.ordinal - 1,
              step,
              position,
              after: '',
              afterPosition: 0,
              path: base,
            })
            if (position === 1)
              for (const after of [
                'parent::node()',
                'ancestor::node()',
                'attribute::*',
                'namespace::*',
                'child::node()',
              ])
                for (const afterPosition of [1, 2])
                  cases.push({
                    owner: owner.ordinal - 1,
                    step,
                    position,
                    after,
                    afterPosition,
                    path: `(${base})/${after}[${afterPosition}]`,
                  })
          }
      }
      const rows = (
        await pg.query<{ id: number; output: string | null }>(
          `SELECT id::int,output FROM (SELECT $1::xml v)src,
        unnest($2::text[]) WITH ORDINALITY paths(expression,id)
        CROSS JOIN LATERAL(SELECT string_agg(description,chr(10))output FROM
          XMLTABLE(${namespaces},expression PASSING v COLUMNS description text PATH '${description.replaceAll("'", "''")}')x)result ORDER BY id`,
          [sample.input, cases.map((c) => c.path)],
        )
      ).rows
      expect(rows).toHaveLength(cases.length)
      for (const [index, result] of rows.entries()) {
        const item = cases[index]!
        expect(result.id).toBe(index + 1)
        const row: Row = {
          input: value(sample.input),
          expected: value(result.output ?? ''),
          owner: value(item.owner),
          step: value(item.step),
          position: value(item.position),
          after: value(item.after),
          after_position: value(item.afterPosition),
        }
        fixtures.push({ name: 'selected', row, expected: { kind: 'True' } })
        reference.push({ input: sample.input, ...item, expected: result.output ?? '' })
        if (item.owner === 2 && item.position === 1 && item.after === '') {
          await pg.query('INSERT INTO xpath_graph_checked VALUES($1::xml,$2,$3)', [
            sample.input,
            item.path,
            result.output ?? '',
          ])
          const wrong = 'different\n' + (result.output ?? '')
          await expect(
            pg.query('INSERT INTO xpath_graph_checked VALUES($1::xml,$2,$3)', [
              sample.input,
              item.path,
              wrong,
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          fixtures.push({
            name: 'selected',
            row: { ...row, expected: value(wrong) },
            expected: { kind: 'False' },
          })
          inserts += 2
        }
      }
    }
    const base = fixtures[0]!.row
    const prefixInput =
      '<!DOCTYPE r [<!ENTITY e "x"><!ENTITY f "&e;y">]><r><a/><prefix/>&f;<b/></r>'
    const prefixPath = '/*/a/following::*[1]'
    const prefixExpected = (
      await pg.query<{ description: string }>(
        `SELECT description FROM (SELECT $1::xml v)src,
         XMLTABLE($2 PASSING v COLUMNS description text PATH '${description.replaceAll("'", "''")}')x`,
        [prefixInput, prefixPath],
      )
    ).rows[0]!.description
    const prefixRow: Row = {
      ...base,
      input: value(prefixInput),
      owner: value(2),
      step: value('following::*'),
      position: value(1),
      after: value(''),
      after_position: value(0),
      expected: value(prefixExpected),
    }
    fixtures.push({ name: 'selected', row: prefixRow, expected: { kind: 'True' } })
    reference.push({ input: prefixInput, path: prefixPath, expected: prefixExpected })
    fixtures.push({
      name: 'selected',
      row: { ...prefixRow, position: value(2) },
      expected: { kind: 'Unknown' },
    })
    const nonterminating = {
      input: '<!DOCTYPE r [<!ENTITY e \"x\"><!ENTITY f \"&e;y\">]><r><a/>&f;<b/></r>',
      step: 'following::*',
      owner: 2,
      position: 1,
    }
    fixtures.push({
      name: 'selected',
      row: {
        ...base,
        input: value(nonterminating.input),
        owner: value(nonterminating.owner),
        step: value(nonterminating.step),
        position: value(nonterminating.position),
        after: value(''),
        after_position: value(0),
      },
      expected: { kind: 'Unknown' },
    })
    fixtures.push(
      { name: 'selected', row: { ...base, input: { kind: 'Null' } }, expected: { kind: 'Null' } },
      {
        name: 'selected',
        row: { ...base, input: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'selected',
        row: { ...base, input: { kind: 'Error', value: { state: parseInt('22023', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      },
    )
    const packet = 'artifacts/goal-checks/xml-xpath-graph-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/graph-reference.json',
      JSON.stringify(
        {
          samples: samples.length,
          reference,
          fixtures: fixtures.length,
          inserts,
          resourceClassifications: 2,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathgraph', group, ['selected'], fixtures).catch(
      async (error: unknown) => {
        await cp(join(root, 'go/pg_catalog/operations.go'), packet + '/failed-operations.go').catch(
          () => undefined,
        )
        throw error
      },
    )
    console.info('XPath graph parity', {
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
