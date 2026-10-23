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
const nativeNamespaces = `ARRAY[ARRAY['p','urn:p'],ARRAY['q','urn:q'],ARRAY['u','urn:u']]`
const xmlNamespaces = `XMLNAMESPACES('urn:p' AS p,'urn:q' AS q,'urn:u' AS u)`
const quote = (s: string) => `'${s.replaceAll("'", "''")}'`
const fault = (detail: string) => {
  const s = detail.toLowerCase()
  if (s.includes('undefined prefix') || s.includes('undefined namespace prefix')) return 19
  if (s.includes('undefined variable')) return 5
  if (s.includes('unregistered function')) return 9
  if (s.includes('invalid number of arguments')) return 12
  if (s.includes('invalid context position')) return 14
  if (s.includes('invalid context size')) return 13
  if (s.includes('invalid type')) return 11
  if (s.includes('invalid operand')) return 10
  return 0
}

it('evaluates XPath paths, predicates, scalar functions and lazy expression errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-eval-'))
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
      owner: 'xpath_eval',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expression: TextValue, expected: TextValue, projection: Int4Value, reason: Int4Value, profile: Int4Value) -> CheckOutcome {
   let result=xpath_evaluation_probe(input,expression,expected,projection,reason,profile); check_from_bool(result)
  }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_eval.rs'))!.source += `
const XPATH_EVAL_SQLSTATE: u32 = 1687400;
const XPATH_EVAL_TEST_POWER_WORDS: &[i64] = &[${powers.map((p) => BigInt.asIntN(64, BigInt('0x' + p.bits)).toString() + 'i64').join(',')}];
fn xpath_eval_test_powers() -> XPathPowers {
 let mut result=xpath_powers_empty(); let mut index: usize=0;
 while index<XPATH_EVAL_TEST_POWER_WORDS.len() { result=xpath_powers_push(result,XPATH_EVAL_TEST_POWER_WORDS[index]); index+=1; } result
}
fn xpath_eval_test_describe(tree: &XmlTree, value: XPathReference) -> String {
 let name=xpath_reference_name(tree,value); let parent=xpath_reference_parent(tree,value); let mut parent_name=String::new();
 if parent.kind>=0 { let named=xpath_reference_name(tree,parent); parent_name=named.qualified; };
 let test=XPathNodeTest {kind:2,principal:1,name:String::new(),uri:String::new(),prefixed:false,valid:true};
 let ancestors=xpath_local_axis_test(tree,value,7,&test); let siblings=xpath_local_axis_test(tree,value,10,&test);
 let mut output=name.qualified; output.push('~'); output.push_str(parent_name.as_str()); output.push('~');
 let depth=text_number(ancestors.values.len() as i32,10); output.push_str(depth.as_str()); output.push('~');
 let before=text_number(siblings.values.len() as i32,10); output.push_str(before.as_str()); output.push('~');
 if value.kind==1 {output.push_str("true");}else{output.push_str("false");}; output.push('~');
 if value.kind==2 {output.push_str("true");}else{output.push_str("false");}; output
}
pub fn xpath_evaluation_probe(input: TextValue, expression: TextValue, expected: TextValue, projection: Int4Value, reason: Int4Value, profile: Int4Value) -> BoolValue {
 if let TextValue::Error(error)=input {return BoolValue::Error(error);}; if let TextValue::Null=input {return BoolValue::Null;};
 if let TextValue::Value(raw)=input {
  if let TextValue::Value(text)=expression {
   if let Int4Value::Value(mode)=projection {
    if let Int4Value::Value(fault)=reason {
     if let Int4Value::Value(facts)=profile {
      let prepared=xml_query_content(raw.as_str());
      if xml_well_formed(prepared.as_str(),true)==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
      let document=xpath_document_parse(prepared.as_str()); let tree=document.tree; let graph=document.graph;
      if xml_query_names_valid(&tree)==false {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_XML_DOCUMENT));};
      let program=xpath_compile(text.as_str()); let mut namespaces=xpath_namespaces_empty();
      namespaces=xpath_namespaces_push(namespaces,"p","urn:p"); namespaces=xpath_namespaces_push(namespaces,"q","urn:q"); namespaces=xpath_namespaces_push(namespaces,"u","urn:u");
      let mut powers=xpath_powers_empty(); if facts==1 {powers=xpath_eval_test_powers();};
      let result=xpath_evaluate(&program,&tree,&graph,&namespaces,&powers);
      if result.state<0 {
       if fault>0 && result.state!=0-fault {return BoolValue::Value(false);};
       return BoolValue::Error(make_sql_error(XPATH_EVAL_SQLSTATE));
      };
      if result.state!=0 {return BoolValue::Unknown;};
      let mut output=String::new();
      if mode==4 {
       if result.kind!=XPATH_KIND_NODES {return BoolValue::Value(false);};
       let mut index: usize=0; while index<result.nodes.values.len() {
        if index>0 {output.push('\\n');}; let description=xpath_eval_test_describe(&tree,result.nodes.values[index]); output.push_str(description.as_str()); index+=1;
       }
      } else if result.kind==XPATH_KIND_BOOLEAN {if result.boolean {output="true".to_owned();}else{output="false".to_owned();};}
      else if result.kind==XPATH_KIND_STRING {output=result.text;}
      else if result.kind==XPATH_KIND_NUMBER {
       let number=f64::from_bits(result.number as u64); if number!=number {output="NaN".to_owned();}else{if mode==3 {output=text_signed_number(result.number);}else{output=xpath_number_string(result.number);};};
      } else {return BoolValue::Value(false);};
      return sql__pg_catalog__texteq__aet8(TextValue::Value(output),expected);
     };
    };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'expression', 'expected', 'projection', 'reason', 'profile'].map(
      (name) => ({
        name,
        rustName: name,
        type: ['projection', 'reason', 'profile'].includes(name)
          ? 'pg_catalog.int4'
          : 'pg_catalog.text',
        rustType: ['projection', 'reason', 'profile'].includes(name) ? 'Int4Value' : 'TextValue',
      }),
    )
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_eval_text(v xml,p text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
   SELECT result FROM XMLTABLE(${xmlNamespaces},'/' PASSING v COLUMNS result text PATH p)x $fn$;
   CREATE FUNCTION pg_temp.xpath_eval_nodes(v xml,p text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
   SELECT coalesce(string_agg(description,E'\n'ORDER BY n),'') FROM XMLTABLE(${xmlNamespaces},p PASSING v COLUMNS n FOR ORDINALITY,description text PATH ${quote(descriptor)})x $fn$;
   CREATE FUNCTION pg_temp.xpath_eval_result(v xml,p text,mode int) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $fn$
   SELECT CASE WHEN mode=4 THEN pg_temp.xpath_eval_nodes(v,p) WHEN mode=3 THEN CASE WHEN n::text='NaN' THEN 'NaN' ELSE (('x'||encode(float8send(n),'hex'))::bit(64)::bigint)::text END ELSE pg_temp.xpath_eval_text(v,p) END
   FROM (SELECT CASE WHEN mode=3 THEN (xpath(p,v,${nativeNamespaces}))[1]::text::float8 ELSE 0 END n)s $fn$;
   CREATE TEMP TABLE xpath_eval_checked(v xml,p text,mode int,wanted text,CHECK(pg_temp.xpath_eval_result(v,p,mode)=wanted));`)
    const samples = [
      '<r xml:lang="en-US" xmlns:p="urn:p" a="x"><a><i/></a><b xml:lang="fr"><j/></b><c xml:lang=""/></r>',
      '<r/>',
      '<!--before--><r a="1" b="2"><a n="1">1<i/>tail</a><a n="2">2<j/></a><b n="3">3</b><!--comment--><?p value?>text<![CDATA[cdata]]></r><?after x?>',
      '<r xmlns:p="urn:p" xmlns:q="urn:q" a="1" b="2"><p:c n="1">1</p:c><c n="2">2</c><q:c n="3">3</q:c></r>',
      '<r xmlns="urn:r" xmlns:p="urn:p"><c xmlns="" xmlns:p="urn:u"><d a="x"/>text</c><p:e/></r>',
      '<!DOCTYPE r [<!ENTITY e "<hidden/>text">]><r><a/>&e;<b/></r>',
    ]
    type Case = {
      input: string
      expression: string
      projection: number
      profile: number
      unknown?: boolean
      syntax?: boolean
    }
    const cases: Case[] = []
    const add = (
      input: string,
      expression: string,
      projection = 2,
      profile = 1,
      unknown = false,
      syntax = true,
    ) => cases.push({ input, expression, projection, profile, unknown, syntax })
    const paths = [
      '/',
      '.',
      '/*',
      '//*',
      '//node()',
      '//@*',
      '//*/namespace::*',
      '/*/*',
      '/*/*[1]',
      '(/*/b | descendant-or-self::*)[1]',
      '(/*/b | descendant-or-self::node()[self::*])[1]',
      '/*/*[following::node()]',
      '/*/*[following::node()][1]',
      '(/*/b/@n | /*/a/following::node()[1])[1]',
      '(/*/b/preceding::node()[1] | /*/a/following::node()[1])[1]',
      '/*[lang("en")]',
      '/*/*[lang("EN")]',
      '/*/@*[lang("en")]',
      '/*/namespace::*[lang("en")]',
      '/*/*[lang("")]',
      '(/*/namespace::* | /*/a/i/ancestor::*/*)[1]',
      '(/*/namespace::* | /*/a/i/ancestor::*/*)[last()]',
      '((/*/namespace::* | /*/a/i/ancestor::*/*))[1][1]',
      '(/*/*)[1]',
      '/*/*[last()]',
      '(/*/*)[last()]',
      '/*/*[position()=last()]',
      '/*/*[position()<3][1]',
      '/*/*[true()][2]',
      '/*/*[2][1]',
      '/*/*[false()][unknown()]',
      '/*/missing[$x]',
      '/*/*/@*',
      '/*/*/..',
      '/*/*/ancestor-or-self::node()',
      '/*/*/preceding-sibling::node()',
      '/*/*/following-sibling::node()',
      '/*/*[1]/following::node()[1]',
      '/*/*[last()]/preceding::node()[1]',
      '/*/@* | /*/namespace::*',
      '/*/namespace::* | /*/@*',
      '/* | /*/namespace::*',
      '/*/namespace::* | /*',
      '/*/namespace::p | /*/namespace::q',
      '/*/namespace::q | /*/namespace::p',
      '(/*/namespace::p | /*/namespace::q)[1]',
      '(/*/@* | /*/namespace::*)[last()]',
      '/*/p:*',
      '/*/q:*',
      '/*/*[name()="a"]',
      '/*/*[@n="2"]',
      '/*/*[number(@n)>1]',
      '/*/*[position()=1 or unknown()][1]',
      '(/*/*)[position()=1 or unknown()][1]',
    ]
    for (const input of samples)
      for (const path of paths) {
        add(input, path, 4)
        for (const [projection, fn] of [
          [1, 'boolean'],
          [2, 'string'],
          [3, 'number'],
        ] as const)
          add(input, `${fn}(${path})`, projection)
        add(input, `count(${path})`, 3)
      }
    const input = samples.find((sample) => sample.startsWith('<!--before-->'))!
    for (const expression of [
      'position()',
      'last()',
      'number()',
      'string()',
      'name()',
      'local-name()',
      'namespace-uri()',
      'true()',
      'false()',
      'count(1)',
      'name(1)',
      'sum(1)',
      'true(1)',
      'false(unknown())',
      'count(unknown())',
      'unknown($x)',
      'p:count(1)',
      'missing:count(1)',
      '$x',
      '$p:x',
      '$missing:x',
      '1[1]',
      'true()[1]',
      '(1)/a',
      '/*/missing/missing:a',
      '/*/missing[missing:a]',
      'false() and unknown()',
      'true() or $x',
      'false() or unknown()',
      'true() and unknown()',
      '0 div 0 = $x',
      'false() and (1[1])',
      'true() or count(1)',
      '-number(//@n)',
      '--number(//@n)',
      'sum(//@n)',
      'count(//* | //*)',
      'count(//@* | //@*)',
      'not(//missing)',
      'concat("a",1,true(),"雪",2)',
      'substring("12345",-1 div 0,1 div 0)',
      'substring("12345",0,3)',
      'translate("a雪😊ab","aa雪😊","Xy界")',
      'normalize-space("  a\t雪\n b\r  ")',
      'contains("雪😊","😊")',
      'starts-with("雪😊","雪")',
      'substring-before("a雪😊b","😊")',
      'substring-after("a雪😊b","雪")',
      'string-length("雪😊a")',
    ]) {
      const projection = /^(position|last|number|count|sum|--?number|string-length)\(/u.test(
        expression,
      )
        ? 3
        : 2
      add(input, expression, expression.startsWith('/*') ? 4 : projection)
    }
    const numbers = [
      '0',
      '-0',
      '1',
      '-1',
      '0.1',
      '1e23',
      '0.5e-323',
      '1 div 0',
      '-1 div 0',
      '0 div 0',
      '1e309',
      '1e-323',
    ]
    for (const a of numbers)
      for (const b of numbers)
        for (const op of ['+', '-', '*', 'div', 'mod']) add('<r/>', `(${a}) ${op} (${b})`, 3)
    for (const a of [
      ...numbers,
      '-0.5',
      '0.5',
      '0.5 - 0.00000000000000006',
      '4503599627370495',
      '-4503599627370495',
    ])
      for (const fn of ['floor', 'ceiling', 'round']) add('<r/>', `${fn}(${a})`, 3)
    for (const text of ['', 'a', '雪😊ab', '12345'])
      for (const start of [
        '-1 div 0',
        '-2',
        '-0.5',
        '0',
        '0.5',
        '1',
        '1.5',
        '3',
        '1 div 0',
        '0 div 0',
      ])
        for (const length of ['-1', '0', '1', '2.5', '1 div 0', '0 div 0'])
          add('<r/>', `substring(${quote(text)},${start},${length})`)
    let seed = 981337
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed
    }
    for (let index = 0; index < 160; index++) {
      const a = `${next() % 2 ? '-' : ''}${1 + (next() % 9)}.${next() % 1000000000}e${(next() % 632) - 323}`
      const b = `${next() % 2 ? '-' : ''}${1 + (next() % 9)}.${next() % 1000000000}e${(next() % 632) - 323}`
      add('<r/>', `(${a}) mod (${b})`, 3)
      for (const fn of ['floor', 'ceiling', 'round']) add('<r/>', `${fn}(${a})`, 3)
    }
    for (const name of [
      'true',
      'false',
      'count',
      'name',
      'string',
      'number',
      'substring',
      'concat',
      'sum',
      'floor',
      'normalize-space',
      'translate',
      'id',
      'lang',
    ])
      for (const args of ['', '1', '1,2', '1,2,3', '1,2,3,4']) {
        if (name === 'id' && args === '1') continue
        add(input, `${name}(${args})`, 2)
      }
    for (const expression of ['', '/*[', '1 +', '/(', '.[1]'])
      add(input, expression, 2, 1, false, false)
    for (const expression of [
      "number('1e-1') + $x",
      "count(number('1e-1'))",
      "number('1e-1') | /",
      "0 div 0 = number('1e-1')",
      "/missing = number('1e-1')",
    ])
      add(input, expression, 2, 0)
    add(input, "number('1e-1')", 3, 0, true)
    add(input, "lang('en')", 1)
    add(input, "id('a')", 4, 1, true)
    const large =
      '<!DOCTYPE r [<!ENTITY e "x">]><r xmlns:p="urn:p">' +
      Array.from(
        { length: 400 },
        (_, i) => `<${i === 100 ? 'target' : 'n'} k="${i}">t</${i === 100 ? 'target' : 'n'}>&e;`,
      ).join('') +
      '</r>'
    for (const expression of [
      '(/*/n[20]/@k | /*/descendant::target[unknown()])[1]',
      '(/*/n[20]/@k | /*/descendant::target[unknown()])[last()]',
      '(/*/namespace::* | /*/n[last()]/ancestor::*/*)[1]',
      '(/*/namespace::* | /*/n[last()]/ancestor::*/*)[last()]',
      '(/*/n[380]/@k | /*/n[last()]/preceding::target[unknown()])[last()]',
    ])
      add(large, expression, 4)
    for (const input of [
      '<r xmlns:p="urn:p"><e/><e><c/></e><e><d/><f/></e></r>',
      '<r xmlns:p="urn:p"><e><c/></e><e/><e><d/><f/></e></r>',
    ]) {
      for (const expression of [
        'count(/*/e[name((namespace::* | child::*)[1])="xml"])',
        'count(/*/e[name((child::* | namespace::*)[1])="xml"])',
        'count(/*/e[name((namespace::* | child::*)[last()])="p"])',
      ])
        add(input, expression, 3)
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0
    for (const [index, item] of cases.entries()) {
      let result = '',
        reason = 0,
        state = ''
      try {
        result = (
          await pg.query<{ value: string }>(
            'SELECT pg_temp.xpath_eval_result($1::xml,$2,$3) value',
            [item.input, item.expression, item.projection],
          )
        ).rows[0]!.value
      } catch (e) {
        const error = e as { code: string; message: string; detail?: string }
        state = error.code
        reason = item.syntax ? fault(error.detail ?? '') : 0
        reference.push({ error: { code: state, message: error.message, detail: error.detail } })
        errors++
        expect(['10608', '2200M']).toContain(state)
      }
      const row: Row = {
        input: value(item.input),
        expression: value(item.expression),
        expected: value(result ?? ''),
        projection: value(item.projection),
        reason: value(reason),
        profile: value(item.profile),
      }
      reference.push({ ...item, result, state, reason, fixtureIndex: fixtures.length })
      fixtures.push({
        name: 'matches',
        row,
        expected: state
          ? { kind: 'Error', value: { state: parseInt(state, 36) } }
          : { kind: item.unknown ? 'Unknown' : 'True' },
      })
      if (!state && !item.unknown && index % 47 === 0) {
        await pg.query('INSERT INTO xpath_eval_checked VALUES($1::xml,$2,$3,$4)', [
          item.input,
          item.expression,
          item.projection,
          result,
        ])
        const wrong = 'different\n' + result
        await expect(
          pg.query('INSERT INTO xpath_eval_checked VALUES($1::xml,$2,$3,$4)', [
            item.input,
            item.expression,
            item.projection,
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
      packet + '/eval-reference.json',
      JSON.stringify(
        {
          samples: samples.length,
          cases: cases.length,
          fixtures: fixtures.length,
          inserts,
          errors,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpatheval', group, ['matches'], fixtures)
    console.info('XPath AST parity', {
      samples: samples.length,
      cases: cases.length,
      fixtures: fixtures.length,
      inserts,
      errors,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
