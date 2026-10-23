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

it('preserves XPath-visible nodes, namespace identities and sibling navigation in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-query-tree-'))
  const value = (value: string | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const modes = [
    'nodes',
    'text',
    'elements',
    'comments',
    'instructions',
    'attributes',
    'names',
    'attribute_names',
    'leaf_values',
  ]
  try {
    await pg.exec(`CREATE TEMP TABLE query_tree_source(v xml);
      CREATE TEMP TABLE query_tree_checked(v xml,expected int4,
        CHECK((xpath('count(//node())',v))[1]::text::int4=expected));`)
    const entries = modes.map((constraint) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'xml_query_tree', constraint }),
    )
    const evaluatorSource = entries
      .map(
        (entry, mode) => `pub fn ${entry}(input: TextValue, expected: TextValue) -> CheckOutcome {
      let result = xml_query_tree_probe(input,expected,${mode}); check_from_bool(result)
    }`,
      )
      .join('\n')
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_query_tree.rs'))!.source += String.raw`
pub fn xml_query_tree_probe(input: TextValue, expected: TextValue, mode: i32) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  let input = xml_query_content(raw.as_str());
  if xml_well_formed(input.as_str(),true) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
  let tree = xml_tree_parse(input.as_str(),true,true);
  if xml_query_names_valid(&tree) == false { return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT)); };
  let mut count: i32 = 0; let mut output = String::new(); let mut first = true;
  let mut cursor = xml_query_following_node(&tree,0);
  while cursor > 0 {
   let node = tree.nodes[cursor];
   if mode == 0 || (mode == 1 && (node.kind == 2 || node.kind == 3)) || (mode == 2 && node.kind == 1) || (mode == 3 && node.kind == 4) || (mode == 4 && node.kind == 5) { count = count + 1; };
   if mode == 6 {
    if first == false { output.push('\n'); }; first = false;
    let name = xml_query_node_name(&tree,cursor);
    let parent = xml_query_node_name(&tree,node.parent);
    let before = xml_query_previous(&tree,cursor); let previous = xml_query_node_name(&tree,before);
    let after = xml_query_next(&tree,cursor); let next = xml_query_node_name(&tree,after);
    output.push_str(name.qualified.as_str()); output.push('~'); output.push_str(name.local.as_str()); output.push('~'); output.push_str(name.namespace.as_str()); output.push('~'); output.push_str(parent.qualified.as_str()); output.push('~'); output.push_str(previous.qualified.as_str()); output.push('~'); output.push_str(next.qualified.as_str());
   };
   if mode == 8 && node.kind != 1 {
    if first == false { output.push('\n'); }; first = false;
    let text = xml_tree_text(&tree,node.value); output.push_str(text.as_str());
   };
   let mut index = node.attribute_start;
   while index < node.attribute_end {
    let attribute = tree.attributes[index];
    if xml_query_namespace_attribute(&tree,attribute.name) == false {
     if mode == 5 { count = count + 1; };
     if mode == 7 {
      if first == false { output.push('\n'); }; first = false;
      let name = xml_query_expand_name(&tree,cursor,attribute.name,true); let parent = xml_query_node_name(&tree,cursor);
      output.push_str(name.qualified.as_str()); output.push('~'); output.push_str(name.local.as_str()); output.push('~'); output.push_str(name.namespace.as_str()); output.push('~'); output.push_str(parent.qualified.as_str());
     };
    };
    index += 1;
   }
   cursor = xml_query_following_node(&tree,cursor);
  }
  let mut actual = TextValue::Value(output);
  if mode < 6 { actual = int4_to_text(Int4Value::Value(count)); };
  return sql__pg_catalog__texteq__aet8(actual,expected);
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'expected'].map((name) => ({
      name,
      type: 'pg_catalog.text',
      rustName: name,
      rustType: 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const samples = [
      null,
      '',
      'plain',
      '<a/><b/>',
      '<r/>',
      '<r> <a/> </r>',
      '<r>a<![CDATA[b]]>c<![CDATA[]]>d</r>',
      '<r>a&amp;b&#32;c<!--comment--><?p    x?><a/>tail</r>',
      '\n<!--outside--><r/>\n<?p x?>',
      '<r xmlns="urn:r" xmlns:p="urn:p" p:a="x" plain="v"><p:c xmlns:p="urn:q" p:a="y"/><c xmlns="" xml:lang="en"/></r>',
      '<é xmlns:p="urn:文" p:属性="v">雪</é>',
      '<é xmlns:p="urn:unicode" p:属性="v">雪</é>',
      '<?xml version="1.0" encoding=""?><r/>',
      '\ufeff<r>é</r>',
      '\ufeff<?xml version="1.0"?><r>é</r>',
      '\ufeff<?xml version="1.0" encoding="ISO-8859-1"?><r>é</r>',
      '<!DOCTYPE r [<!ENTITY e "x"><!ATTLIST r a CDATA "value">]><r>&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "<a/>x">]><r>t&e;u</r>',
      '<!DOCTYPE r [<!ENTITY e "">]><r>a&e;b</r>',
      '<!DOCTYPE r [<!ATTLIST r xmlns CDATA "urn:r" xmlns:p CDATA "urn:p" p:x CDATA "default">]><r/>',
      '<!DOCTYPE r [<!ATTLIST r a NMTOKENS " x  y ">]><r a=" x  y "/>',
      '<!DOCTYPE r [<!ELEMENT r (a)><!ELEMENT a EMPTY>]><r> <a/> </r>',
      '<!DOCTYPE r [<!NOTATION a SYSTEM "a"><!NOTATION b SYSTEM "b">]><r/>',
      '<p:r/>',
      '<r p:a="x"/>',
      '<r xmlns:p=""/>',
      '<r xmlns:xml="wrong"/>',
      '<r xmlns="http://www.w3.org/XML/1998/namespace"/>',
      '<r xmlns:p="urn:p" xmlns:q="urn:p" p:a="x" q:a="y"/>',
      '<p:1r/>',
      '<r p:1a="x"/>',
      '<!DOCTYPE r [<!ENTITY e "<p:a/>">]><r xmlns:p="urn:p">&e;</r>',
      '<!DOCTYPE r [<!ENTITY e \'<p:a xmlns:p="urn:own"/>\'>]><r>&e;</r>',
      '<!DOCTYPE r [<!ENTITY e \'<a p:b="x"/>\'>]><r>&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "&f;"><!ENTITY f "<p:a/>">]><r xmlns:p="urn:p">&e;</r>',
    ]
    for (const uri of [
      'relative',
      '',
      'abc:def',
      'http://example/with%20space',
      'urn:%GG',
      'urn:a%',
      'urn:é',
      'urn:a&b',
      'urn:one|two',
      'http://[bad]/',
      'http://[::1]/',
      'urn:',
      'a:b#c',
      'a:b#c#d',
      'urn:a b',
      ':x',
      '1x:y',
      'http://example:bad/x',
      'http://',
      'a/b',
      'a?b',
      'http://x:/',
      'http://x:2147483647/',
      'http://x:2147483648/',
      'http://1.2.3.4abc/',
      'http://1.2.3.25zA/',
      'http://x/#a[b]',
      'http://x/?a[b]',
    ])
      for (const prefix of ['', ':p'])
        samples.push(`<r xmlns${prefix}="${uri.replaceAll('&', '&amp;')}"/>`)
    const countQueries = [
      'count(//node())',
      'count(//text())',
      'count(//*)',
      'count(//comment())',
      'count(//processing-instruction())',
      'count(//@*)',
    ]
    const namedNodes = `SELECT CASE WHEN v IS NULL THEN NULL ELSE (SELECT COALESCE(string_agg(concat_ws('~',COALESCE(name,''),COALESCE(local,''),COALESCE(uri,''),COALESCE(parent,''),COALESCE(previous,''),COALESCE(next,'')),chr(10) ORDER BY ordinal),'')
      FROM XMLTABLE('//node()' PASSING v COLUMNS ordinal FOR ORDINALITY,name text PATH 'name(.)',local text PATH 'local-name(.)',uri text PATH 'namespace-uri(.)',parent text PATH 'name(..)',previous text PATH 'name(preceding-sibling::node()[1])',next text PATH 'name(following-sibling::node()[1])') x) END value FROM query_tree_source`
    const namedAttributes = `SELECT CASE WHEN v IS NULL THEN NULL ELSE (SELECT COALESCE(string_agg(concat_ws('~',COALESCE(name,''),COALESCE(local,''),COALESCE(uri,''),COALESCE(parent,'')),chr(10) ORDER BY ordinal),'')
      FROM XMLTABLE('//@*' PASSING v COLUMNS ordinal FOR ORDINALITY,name text PATH 'name(.)',local text PATH 'local-name(.)',uri text PATH 'namespace-uri(.)',parent text PATH 'name(..)') x) END value FROM query_tree_source`
    const leaves = `SELECT CASE WHEN v IS NULL THEN NULL ELSE (SELECT COALESCE(string_agg(COALESCE(value,''),chr(10) ORDER BY ordinal),'') FROM XMLTABLE('//node()[not(self::*)]' PASSING v COLUMNS ordinal FOR ORDINALITY,value text PATH 'string(.)') x) END value FROM query_tree_source`
    let inserts = 0
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const sample of samples) {
      await pg.exec('TRUNCATE query_tree_source')
      await pg.query(
        sample?.startsWith('\ufeff<?xml')
          ? 'INSERT INTO query_tree_source VALUES(XMLPARSE(DOCUMENT $1))'
          : 'INSERT INTO query_tree_source VALUES($1::xml)',
        [sample],
      )
      const encoded = (
        await pg.query<{ value: string | null }>(
          "SELECT encode(convert_to(v::text,'UTF8'),'hex') value FROM query_tree_source",
        )
      ).rows[0]!.value
      const raw = encoded === null ? null : Buffer.from(encoded, 'hex').toString('utf8')
      for (const [mode, name] of modes.entries()) {
        let expected: string | null = null,
          outcome: Outcome = { kind: sample === null ? 'Null' : 'True' }
        try {
          expected =
            mode < 6
              ? (
                  await pg.query<{ value: string | null }>(
                    'SELECT (xpath($1,v))[1]::text value FROM query_tree_source',
                    [countQueries[mode]],
                  )
                ).rows[0]!.value
              : (
                  await pg.query<{ value: string | null }>(
                    mode === 6 ? namedNodes : mode === 7 ? namedAttributes : leaves,
                  )
                ).rows[0]!.value
        } catch (error) {
          expect((error as { code: string }).code).toBe('2200M')
          outcome = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        if (mode === 0) {
          const insert = pg.query(
            'INSERT INTO query_tree_checked SELECT v,$1 FROM query_tree_source',
            [expected === null ? null : Number(expected)],
          )
          if (outcome.kind === 'Error')
            await expect(insert).rejects.toMatchObject({ code: '2200M' })
          else await insert
          inserts++
          if (expected !== null && outcome.kind !== 'Error') {
            const wrong = Number(expected) + 1
            await expect(
              pg.query('INSERT INTO query_tree_checked SELECT v,$1 FROM query_tree_source', [
                wrong,
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            fixtures.push({
              name,
              row: { input: value(raw), expected: value(String(wrong)) },
              expected: { kind: 'False' },
            })
            inserts++
          }
        }
        fixtures.push({
          name,
          row: { input: value(raw), expected: value(expected) },
          expected: outcome,
        })
        reference.push({ sample, name, expected, outcome })
      }
    }
    for (const name of modes)
      fixtures.push(
        {
          name,
          row: { input: { kind: 'Unknown' }, expected: value('') },
          expected: { kind: 'Unknown' },
        },
        {
          name,
          row: {
            input: { kind: 'Error', value: { state: parseInt('22023', 36) } },
            expected: { kind: 'Unknown' },
          },
          expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
        },
      )
    const packet = 'artifacts/goal-checks/xml-xpath-tree-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/tree-reference.json',
      JSON.stringify({ reference, fixtures: fixtures.length, inserts }, null, 2) + '\n',
    )
    await runCheckParity(root, 'xmlquerytree', group, modes, fixtures)
    console.info('XML query tree parity', {
      fixtures: fixtures.length,
      modes: modes.length,
      samples: samples.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
