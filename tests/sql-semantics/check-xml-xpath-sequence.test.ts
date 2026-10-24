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

it('converts XPath scalars and sequences while keeping existence, shape and output context separate in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-sequence-'))
  const packet = 'artifacts/goal-checks/float-output-active'
  const known = (value: string | number | boolean): Input => ({ kind: 'Value', value })
  try {
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_sequence_result(v xml,p text,mode int) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
      SELECT CASE WHEN mode=3 THEN xpath_exists(p,v,ARRAY[ARRAY['p','urn:p']])::text
       WHEN mode=2 THEN cardinality(xpath(p,v,ARRAY[ARRAY['p','urn:p']]))::text
       ELSE (SELECT count(*)::text||'|'||coalesce(string_agg(CASE WHEN mode=1 THEN encode(xml_send(x),'hex') ELSE encode(convert_to(x::text,'UTF8'),'hex') END,E'\n'ORDER BY n),'') FROM unnest(xpath(p,v,ARRAY[ARRAY['p','urn:p']]))WITH ORDINALITY t(x,n)) END $fn$;
      CREATE TEMP TABLE xpath_sequence_checked(v xml,p text,mode int,expected text,CHECK(pg_temp.xpath_sequence_result(v,p,mode)=expected));`)
    const names = ['matches', 'synthetic']
    const entries = names.map((constraint) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'xpath_sequence', constraint }),
    )
    const evaluatorSource = `pub fn ${entries[0]}(input: TextValue, expression: TextValue, projection: Int4Value, extra: Int4Value, available: BoolValue, expected: TextValue) -> CheckOutcome {
      let value=xpath_sequence_probe(input,expression,projection,extra,available,expected);check_from_bool(value)
    }
    pub fn ${entries[1]}(code: Int4Value, expected: TextValue) -> CheckOutcome {let value=xpath_sequence_synthetic(code,expected);check_from_bool(value)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_result.rs'))!.source += `
pub fn xpath_sequence_diagnostic(input: &XPathXmlResult) -> String {
 let mut output=text_signed_number(input.state as i64);output.push('|');
 if input.shaped {output.push_str("true");}else{output.push_str("false");};output.push('|');
 let length=text_number(input.values.len() as i32,10);output.push_str(length.as_str());output
}
pub fn xpath_sequence_encode(input: XPathXmlResult, mode: i32) -> TextValue {
 if input.state==XPATH_RESULT_SQL_ERROR {return TextValue::Error(input.error);};
 if input.state<0 {return TextValue::Error(make_sql_error(1687400));};
 if input.state!=0 {return TextValue::Unknown;};
 let mut output=text_number(input.values.len() as i32,10);output.push('|');let mut index: usize=0;
 while index<input.values.len() {
  let value=input.values[index].clone();let mut encoded=TextValue::Unknown;
  if mode==1 {
   let bytes=xml_to_bytea_utf8(value);
   if let ByteaValue::Error(error)=bytes {return TextValue::Error(error);};
   if let ByteaValue::Value(hex)=bytes {encoded=TextValue::Value(hex);};
  }else{
   let text=xml_to_text(value);
   if let TextValue::Error(error)=text {return TextValue::Error(error);};
   if let TextValue::Value(raw)=text {
    let characters: Vec<char>=raw.as_str().chars().collect();let mut cursor: usize=0;let mut hex=String::new();
    while cursor<characters.len() {let bytes=bytea_utf8_character(String::new(),characters[cursor]);hex.push_str(bytes.as_str());cursor+=1;}
    encoded=TextValue::Value(hex);
   };
  };
  let mut valid=false;
  if let TextValue::Value(hex)=encoded {if index>0 {output.push('\\n');};output.push_str(hex.as_str());valid=true;};
  if valid==false {return TextValue::Unknown;};index+=1;
 }
 TextValue::Value(output)
}
pub fn xpath_sequence_probe(input: TextValue, expression: TextValue, projection: Int4Value, extra: Int4Value, available: BoolValue, expected: TextValue) -> BoolValue {
 if let TextValue::Error(error)=input {return BoolValue::Error(error);};if let TextValue::Null=input {return BoolValue::Null;};
 if let TextValue::Value(raw)=input {if let TextValue::Value(path)=expression {if let Int4Value::Value(mode)=projection {if let Int4Value::Value(precision)=extra {if let BoolValue::Value(present)=available {
  let text=xml_query_content(raw.as_str());
  if xml_query_well_formed(text.as_str())==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
  let document=xpath_document_parse(text.as_str());let tree=document.tree;let graph=document.graph;
  if graph.ids.valid==false || xml_query_names_valid(&tree)==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
  let program=xpath_compile_with_limit(path.as_str(),5000);let mut namespaces=xpath_namespaces_empty();
  namespaces=xpath_namespaces_push(namespaces,"p","urn:p");
  let powers=xpath_powers_empty();let result=xpath_evaluate(&program,&tree,&graph,&namespaces,&powers);
  if mode==2 {
   let count=xpath_result_count(&result);
   if let Int4Value::Error(error)=count {return BoolValue::Error(error);};
   if let Int4Value::Value(value)=count {let text=text_number(value,10);return sql__pg_catalog__texteq__aet8(TextValue::Value(text),expected);};return BoolValue::Unknown;
  };
  if mode==3 {
   let exists=xpath_result_exists(&result);
   if let BoolValue::Error(error)=exists {return BoolValue::Error(error);};
   if let BoolValue::Value(value)=exists {let mut text=make_text_value("false");if value {text=make_text_value("true");};return sql__pg_catalog__texteq__aet8(text,expected);};return BoolValue::Unknown;
  };
  let converted=xpath_result_to_xml(result,&tree,&graph,precision,present);
  if mode==4 {let diagnostic=xpath_sequence_diagnostic(&converted);return sql__pg_catalog__texteq__aet8(TextValue::Value(diagnostic),expected);};
  let output=xpath_sequence_encode(converted,mode);return sql__pg_catalog__texteq__aet8(output,expected);
 };};};};};BoolValue::Unknown
}
pub fn xpath_sequence_synthetic(code: Int4Value, expected: TextValue) -> BoolValue {
 if let Int4Value::Value(which)=code {
  let document=xpath_document_parse("<!DOCTYPE r [<!NOTATION n SYSTEM 'n'><!NOTATION m SYSTEM 'm'>]><r/>");
  let mut tree=document.tree;let graph=document.graph;
  let mut value=xpath_value_empty(XPATH_KIND_NODES,which);
  if which==10 {tree=xml_tree_unsupported(tree);value=xpath_value_single(XPathReference {kind:0,node:0,index:0});};
  if which==11 {value=xpath_value_empty(999,0);};
  if which==12 {
   let mut values: Vec<XPathReference>=Vec::new();
   values.push(XPathReference {kind:0,node:0,index:0});
   values.push(XPathReference {kind:0,node:1,index:0});
   let nodes=XPathSequence {values,cyclic:false,cycle:0};value=xpath_value_nodes(nodes);
  };
  let result=xpath_result_to_xml(value,&tree,&graph,1,true);
  let text=xpath_sequence_diagnostic(&result);return sql__pg_catalog__texteq__aet8(TextValue::Value(text),expected);
 };BoolValue::Unknown
}
`
    const inputs = [
      ['input', 'TextValue', 'pg_catalog.text'],
      ['expression', 'TextValue', 'pg_catalog.text'],
      ['projection', 'Int4Value', 'pg_catalog.int4'],
      ['extra', 'Int4Value', 'pg_catalog.int4'],
      ['available', 'BoolValue', 'pg_catalog.bool'],
      ['expected', 'TextValue', 'pg_catalog.text'],
    ].map(([name, rustType, type]) => ({
      name: name!,
      rustName: name!,
      rustType: rustType!,
      type: type!,
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [
        { kind: 'supported', entryName: entries[0]!, inputs },
        {
          kind: 'supported',
          entryName: entries[1]!,
          inputs: [
            { name: 'code', rustName: 'code', rustType: 'Int4Value', type: 'pg_catalog.int4' },
            inputs[5]!,
          ],
        },
      ],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const base =
      '<r a="&quot;&amp;&lt;&gt;&#13;&#10;&#9;">é😊<x/><x>3</x><![CDATA[<&]]><!--c--><?p?></r>'
    const scalars = [
      'true()',
      'false()',
      'boolean(//missing)',
      '0',
      '-0',
      '1',
      '10',
      '1000000',
      '1000000000000000',
      '1 div 3',
      '-1 div 3',
      '1 div 10',
      '1 div 10000',
      '1 div 100000',
      '1 div 1000000000000000',
      '9999999999999999 div 3',
      '0 div 0',
      '1 div 0',
      '-1 div 0',
      "number('bad')",
      'count(//x)',
      'sum(//x)',
      "''",
      "'&<>\"'",
      "'é😊'",
      'string(//@a)',
      'string(//missing)',
      "concat('a','&<>','b')",
      'string(1 div 3)',
      "concat('a','\r\n\t','b')",
      "concat('a','\u0001','b')",
    ]
    const cases: { input: string; path: string; scalar: boolean }[] = scalars.map((path) => ({
      input: base,
      path,
      scalar: true,
    }))
    for (const input of [
      base,
      '<r/>',
      '<r xmlns:p="urn:p"><p:x/><p:x>text</p:x></r>',
      '<!DOCTYPE r [<!ENTITY e "text">]><r>&e;<x/></r>',
      '<!DOCTYPE r [<!ELEMENT r ANY><!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r><x/></r>',
      '<!DOCTYPE r [<?inside?>]><r/>',
    ])
      for (const path of [
        '/',
        '/*',
        '//x',
        '//missing',
        '//text()',
        '//@*',
        '//node()',
        '//p:x',
        '//@*|//text()',
        '/*/namespace::*',
      ])
        cases.push({ input, path, scalar: false })
    for (const path of ['', '(', 'bad()', '$missing', 'p:x', '/r['])
      cases.push({ input: base, path, scalar: false })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0,
      contextDependent = 0,
      notationContext = 0
    const add = (row: Row, expected: Outcome) => fixtures.push({ name: 'matches', row, expected })
    for (const item of cases) {
      const settings = item.scalar ? Array.from({ length: 19 }, (_, i) => i - 15) : [1]
      const outputs = [new Set<string>(), new Set<string>()]
      let failed = false
      for (const extra of settings) {
        await pg.exec(`SET extra_float_digits=${extra}`)
        for (const mode of [0, 1, 2, 3]) {
          if (extra !== settings[0] && mode >= 2) continue
          let output = '',
            outcome: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ value: string }>(
                'SELECT pg_temp.xpath_sequence_result($1::xml,$2,$3)value',
                [item.input, item.path, mode],
              )
            ).rows[0]!.value
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
            errors++
            if (mode === 2 && (error as { code: string }).code === '53200') continue
          }
          const row: Row = {
            input: known(item.input),
            expression: known(item.path),
            projection: known(mode),
            extra: known(extra),
            available: known(true),
            expected: known(output),
          }
          const notation = item.input.includes('<!NOTATION m') && mode < 2 && item.path === '/'
          add(row, notation ? { kind: 'Unknown' } : outcome)
          if (notation) notationContext++
          reference.push({ ...item, extra, mode, output, outcome, notation })
          if (mode < 2 && outcome.kind === 'True') outputs[mode]!.add(output)
          if (mode < 2 && outcome.kind === 'Error') failed = true
          if (notation) continue
          if (outcome.kind === 'True') {
            await pg.query('INSERT INTO xpath_sequence_checked VALUES($1::xml,$2,$3,$4)', [
              item.input,
              item.path,
              mode,
              output,
            ])
            inserts++
            await expect(
              pg.query('INSERT INTO xpath_sequence_checked VALUES($1::xml,$2,$3,$4)', [
                item.input,
                item.path,
                mode,
                output + 'wrong',
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            inserts++
            add(
              { ...row, expected: known(output + 'wrong') },
              notation ? { kind: 'Unknown' } : { kind: 'False' },
            )
          } else if (outcome.kind === 'Error') {
            await expect(
              pg.query('INSERT INTO xpath_sequence_checked VALUES($1::xml,$2,$3,$4)', [
                item.input,
                item.path,
                mode,
                output,
              ]),
            ).rejects.toMatchObject({
              code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
            inserts++
          }
        }
      }
      if (item.scalar && !failed)
        for (const mode of [0, 1]) {
          const dependent = outputs[mode]!.size > 1
          if (dependent) contextDependent++
          add(
            {
              input: known(item.input),
              expression: known(item.path),
              projection: known(mode),
              extra: known(0),
              available: known(false),
              expected: known([...outputs[mode]!][0]!),
            },
            dependent ? { kind: 'Unknown' } : { kind: 'True' },
          )
          add(
            {
              input: known(item.input),
              expression: known(item.path),
              projection: known(4),
              extra: known(0),
              available: known(false),
              expected: known(`${dependent ? 6 : 0}|true|1`),
            },
            { kind: 'True' },
          )
        }
    }
    for (const [path, expected] of [
      ['//missing', '0|true|0'],
      ["''", '0|true|1'],
      ['/', '7|true|1'],
      ['/*', '0|true|1'],
    ])
      add(
        {
          input: known('<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>'),
          expression: known(path!),
          projection: known(4),
          extra: known(1),
          available: known(true),
          expected: known(expected!),
        },
        { kind: 'True' },
      )
    for (const code of [-15, -1, 1, 2, 3, 4])
      fixtures.push({
        name: 'synthetic',
        row: { code: known(code), expected: known(`${code}|false|0`) },
        expected: { kind: 'True' },
      })
    for (const [code, output] of [
      [10, '3|true|1'],
      [11, '3|false|0'],
      [12, '5|false|0'],
    ] as const)
      fixtures.push({
        name: 'synthetic',
        row: { code: known(code), expected: known(output) },
        expected: { kind: 'True' },
      })
    const row: Row = {
      input: known(base),
      expression: known('/'),
      projection: known(0),
      extra: known(1),
      available: known(true),
      expected: known(''),
    }
    add({ ...row, input: { kind: 'Null' } }, { kind: 'Null' })
    add({ ...row, input: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add(
      { ...row, input: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    )
    expect(contextDependent).toBeGreaterThan(0)
    expect(notationContext).toBe(2)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/sequence-reference.json',
      JSON.stringify(
        {
          cases: cases.length,
          fixtures: fixtures.length,
          inserts,
          errors,
          contextDependent,
          notationContext,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathsequence', group, names, fixtures)
    console.info('XPath scalar/sequence parity', {
      cases: cases.length,
      fixtures: fixtures.length,
      inserts,
      errors,
      contextDependent,
      notationContext,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
