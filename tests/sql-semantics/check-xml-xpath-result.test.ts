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

it('copies XPath result nodes with namespace, entity and storage/output provenance in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-result-'))
  const packet = 'artifacts/goal-checks/xml-xpath-result-active',
    known = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_result_hex(v xml,p text,wire bool) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
   SELECT count(*)::text||'|'||coalesce(string_agg(CASE WHEN wire THEN encode(xml_send(x),'hex') ELSE encode(convert_to(x::text,'UTF8'),'hex') END,E'\n'ORDER BY n),'') FROM unnest(xpath(p,v,ARRAY[ARRAY['p','urn:p'],ARRAY['q','urn:q'],ARRAY['u','urn:u']])) WITH ORDINALITY t(x,n) $fn$;
   CREATE TEMP TABLE xpath_result_source(v xml);
   CREATE TEMP TABLE xpath_result_checked(v xml,p text,wire bool,expected text,CHECK(pg_temp.xpath_result_hex(v,p,wire)=expected));`)
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_result',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expression: TextValue, expected: TextValue, projection: Int4Value) -> CheckOutcome { let result=xpath_result_probe(input,expression,expected,projection); check_from_bool(result) }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_result.rs'))!.source += `
  pub fn xpath_result_probe(input: TextValue, expression: TextValue, expected: TextValue, projection: Int4Value) -> BoolValue {
   if let TextValue::Error(error)=input {return BoolValue::Error(error);}; if let TextValue::Null=input {return BoolValue::Null;};
   if let TextValue::Value(raw)=input {if let TextValue::Value(path)=expression {if let Int4Value::Value(mode)=projection {
    let text=xml_query_content(raw.as_str());
    if xml_query_well_formed(text.as_str())==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
    let document=xpath_document_parse(text.as_str());let tree=document.tree;let graph=document.graph;
    if graph.ids.valid==false || xml_query_names_valid(&tree)==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
    let program=xpath_compile_with_limit(path.as_str(),5000);let mut namespaces=xpath_namespaces_empty();
    namespaces=xpath_namespaces_push(namespaces,"p","urn:p");namespaces=xpath_namespaces_push(namespaces,"q","urn:q");namespaces=xpath_namespaces_push(namespaces,"u","urn:u");
    let powers=xpath_powers_empty();let result=xpath_evaluate(&program,&tree,&graph,&namespaces,&powers);
    if result.state<0 {return BoolValue::Error(make_sql_error(1687400));};
    if result.state!=0 || result.kind!=XPATH_KIND_NODES {return BoolValue::Unknown;};
    let mut output=text_number(result.nodes.values.len() as i32,10);output.push('|');let mut index: usize=0;
    while index<result.nodes.values.len() {
     let value=xpath_node_to_xml(&tree,&graph,result.nodes.values[index]);
     let mut encoded=TextValue::Unknown;
     if mode==1 {
      let bytes=xml_to_bytea_utf8(value);
      if let ByteaValue::Error(error)=bytes {return BoolValue::Error(error);};
      if let ByteaValue::Value(hex)=bytes {encoded=TextValue::Value(hex);};
     } else {
      let text=xml_to_text(value);
      if let TextValue::Error(error)=text {return BoolValue::Error(error);};
      if let TextValue::Value(value)=text {
       let characters: Vec<char>=value.as_str().chars().collect();let mut cursor: usize=0;let mut hex=String::new();
       while cursor<characters.len() {let bytes=bytea_utf8_character(String::new(),characters[cursor]);hex.push_str(bytes.as_str());cursor+=1;}
       encoded=TextValue::Value(hex);
      };
     };
     let mut valid=false;
     if let TextValue::Value(hex)=encoded {if index>0 {output.push('\\n');};output.push_str(hex.as_str());valid=true;};
     if valid==false {return BoolValue::Unknown;};index+=1;
    }
    return sql__pg_catalog__texteq__aet8(TextValue::Value(output),expected);
   };};}; BoolValue::Unknown
  }
  `
    const inputs = ['input', 'expression', 'expected', 'projection'].map((name) => ({
      name,
      rustName: name,
      type: name === 'projection' ? 'pg_catalog.int4' : 'pg_catalog.text',
      rustType: name === 'projection' ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const samples: (string | null)[] = [
      null,
      '',
      ' ',
      'text',
      '<a/><b/>',
      '<a/>text',
      '<p:r/>',
      '<r/>',
      '<r a=""/>',
      '<r><a></a><a/><b>é😊&amp;&lt;&gt;&#13;</b><![CDATA[é<&]]><!--é--><?p?><?p   ?></r>',
      '<r xmlns="urn:d" xmlns:p="urn:p" xmlns:q="urn:q"><a p:x="v"><p:b q:y="w"/></a></r>',
      '<r xmlns:p="urn:p" xmlns:q="urn:q"><a><p:b q:y="w"/></a></r>',
      '<r xmlns:p="urn:p"><a xmlns:p="urn:q"><p:b/></a></r>',
      '<r xmlns="urn:d"><a xmlns=""><b/></a></r>',
      '<r xmlns:p="urn:p"><a xml:lang="en" p:x="v"/></r>',
      '<r xmlns:p="urn:p" xmlns:q="urn:q"><a xmlns:u="urn:u" q:z="q" p:x="p"><u:b p:y="y"/></a></r>',
      '<r a="&quot;&apos;&amp;&lt;&gt;&#13;&#10;&#9;">&#13;\n\t</r>',
      '<?xml version="1.1" standalone="yes"?><r>é</r>',
      '<?xml version="1.0" encoding="ISO-8859-1"?><r>é</r>',
      '<?xml version="1.0"?><r>é</r>',
      '<!--before--><?p?><r/><?q   ?><!--after-->',
      '<!DOCTYPE r [<!ENTITY e "a&amp;b"><!ATTLIST r a CDATA "default">]><r a="&e;&amp;&#38;&#xD;&#xA;&#x9;">&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "<a/>text">]><r>&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "">]><r>a&e;b</r>',
      '<!DOCTYPE r [<!ATTLIST r a NMTOKENS #IMPLIED><!ENTITY e " x  y ">]><r a=" a  &e;  b "/>',
      '<!DOCTYPE r [<!ATTLIST r xmlns:p CDATA "urn:p">]><r><p:a/></r>',
      '<!DOCTYPE r [<!ELEMENT r (a)><!ELEMENT a EMPTY><!ATTLIST r a CDATA "&quot;&amp;"><!NOTATION gif SYSTEM "a">]><r><a/></r>',
    ]
    for (const value of ['&amp;', '&#38;', '&e;', '&quot;&amp;', '&#13;&#10;&#9;', 'é😊', ' a  b '])
      samples.push(`<!DOCTYPE r [<!ENTITY e "a&amp;b"><!ATTLIST r a CDATA "${value}">]><r/>`)
    samples.push(
      '<!DOCTYPE r [<?p?><?q   ?>]><r/>',
      '<r xmlns:p="urn:p?a&amp;b"><a p:x="v"/></r>',
      '<r xmlns:p="urn:p" xmlns:q="urn:p"><a><p:b/><q:c/></a></r>',
      '<!DOCTYPE r [<!ATTLIST r xmlns:p CDATA "http://www.w3.org/XML/1998/namespace">]><r><p:a/></r>',
      '<r xmlns:xml="http://www.w3.org/XML/1998/namespace"><xml:a xml:x="v"/></r>',
      '<!DOCTYPE r [<!--before--><?inside   ?><!ENTITY e "x">]><r><a/>&e;</r>',
      '<!DOCTYPE r [<!ENTITY e "x"><?inside   ?><!--after-->]><r><a/>&e;</r>',
      '<!DOCTYPE r [<!--only a comment-->]><r/>',
    )
    samples.push(
      '<r>' +
        Array.from(
          { length: 1000 },
          (_, index) => `<p:a xmlns:p="urn:${index}" p:x="${index}"/>`,
        ).join('') +
        '</r>',
    )
    const paths = [
      '/',
      '/*',
      '/*/*',
      '/*/*/*',
      '/*/@*',
      '//@*',
      '//text()',
      '//comment()',
      '//processing-instruction()',
      '//node()',
      '/*/namespace::*',
      '/*/*/namespace::*',
      '//a',
      '//a/..',
      '//a/../..',
      '//p:*',
      '//@*|//text()|//comment()',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0
    for (const input of samples) {
      await pg.exec('TRUNCATE xpath_result_source')
      await pg.query('INSERT INTO xpath_result_source VALUES($1::xml)', [input])
      const encoded = (
        await pg.query<{ raw: string | null }>(
          "SELECT encode(convert_to(v::text,'UTF8'),'hex')raw FROM xpath_result_source",
        )
      ).rows[0]!.raw
      const raw = encoded === null ? null : Buffer.from(encoded, 'hex').toString('utf8')
      for (const path of raw !== null && raw.length > 20000
        ? ['/', '/*', '/*/*[1]', '/*/*[last()]']
        : paths)
        for (const mode of [0, 1]) {
          let expected = '',
            outcome: Outcome = { kind: 'True' }
          try {
            const result = (
              await pg.query<{ value: string | null }>(
                'SELECT pg_temp.xpath_result_hex(v,$1,$2)value FROM xpath_result_source',
                [path, mode === 1],
              )
            ).rows[0]!.value
            if (result === null) outcome = { kind: 'Null' }
            else expected = result
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
            errors++
          }
          const row: Row = {
            input: raw === null ? { kind: 'Null' } : known(raw),
            expression: known(path),
            expected: known(expected),
            projection: known(mode),
          }
          fixtures.push({ name: 'matches', row, expected: outcome })
          reference.push({ input, path, mode, expected, outcome })
          if (outcome.kind === 'True') {
            await pg.query(
              'INSERT INTO xpath_result_checked SELECT v,$1,$2,$3 FROM xpath_result_source',
              [path, mode === 1, expected],
            )
            inserts++
            await expect(
              pg.query(
                'INSERT INTO xpath_result_checked SELECT v,$1,$2,$3 FROM xpath_result_source',
                [path, mode === 1, expected + '00'],
              ),
            ).rejects.toMatchObject({ code: '23514' })
            inserts++
            fixtures.push({
              name: 'matches',
              row: { ...row, expected: known(expected + '00') },
              expected: { kind: 'False' },
            })
          } else if (outcome.kind === 'Error') {
            await expect(
              pg.query(
                'INSERT INTO xpath_result_checked SELECT v,$1,$2,$3 FROM xpath_result_source',
                [path, mode === 1, expected],
              ),
            ).rejects.toMatchObject({
              code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
            inserts++
          }
        }
    }
    fixtures.push(
      {
        name: 'matches',
        row: {
          input: { kind: 'Unknown' },
          expression: known('/'),
          expected: known(''),
          projection: known(0),
        },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'matches',
        row: {
          input: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          expression: { kind: 'Unknown' },
          expected: { kind: 'Unknown' },
          projection: { kind: 'Unknown' },
        },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/node-reference.json',
      JSON.stringify(
        {
          samples: samples.length,
          paths: paths.length,
          fixtures: fixtures.length,
          inserts,
          errors,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathresult', group, ['matches'], fixtures)
    console.info('XPath XML node result parity', {
      samples: samples.length,
      paths: paths.length,
      fixtures: fixtures.length,
      inserts,
      errors,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
