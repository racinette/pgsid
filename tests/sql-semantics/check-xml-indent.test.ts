import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const literal = (s: string) => '$xml$' + s + '$xml$::xml'
const normal = [
  null,
  '',
  ' ',
  '\n',
  '<r/>',
  '<r></r>',
  '<r><a/><b><c/></b></r>',
  '<r> <a/> </r>',
  '<r> x <a/> y </r>',
  '<r><a/>tail<b/></r>',
  'a<r/>b',
  '<a/> <b/>',
  '<a/>\n<b/>',
  '<?xml version="1.0"?><r><a/></r>',
  '<?xml version="1.1" standalone="yes"?><r/>',
  '<?xml version="1.0" encoding=""?><r/>',
  '\ufeff<r/>',
  '<!-- a --><r/><?p x?>',
  '<![CDATA[a<&]]><r/>',
  '<r a="&#x9;&#xA;&#xD;&quot;&apos;&lt;&gt;&amp;">&#xD;&#xA;é😊</r>',
  '<r><![CDATA[]]><![CDATA[x]]></r>',
  '<r xml:space="preserve"> <a/> </r>',
  '<r xml:space="default"> <a/> </r>',
  '<r xmlns:p="urn:p" a="v" xmlns="urn:d" p:b="c"><p:x/></r>',
  '<r>é😊</r>',
  '<?xml version="1.0"?><r>é😊</r>',
  '<?xml version="1.0" encoding="ISO-8859-1"?><r>é😊</r>',
  '<?xml version="1.0"?>\n<r/>',
  '\n<r/>',
  ' \n<r/>\n ',
  '<r> <a/>tail</r>',
  '<r>x<a/> <b/></r>',
  '<r><a/> <b/>tail</r>',
  '<r> </r>',
  '<r>\n</r>',
  '<r>&#32;<a/></r>',
  '<r> <a/>&#32;</r>',
  '<r><![CDATA[ ]]><a/></r>',
  '<r xml:space="preserve"><a/></r>',
  '<r xml:space="preserve"><a><b/></a></r>',
  '<r xml:space="preserve"> <a xml:space="default"> <b/> </a> </r>',
  '<r xml:space="bogus"> <a/> </r>',
  '<r a="é😊">é</r>',
  '<r>" &apos; &quot; &lt; &gt; &amp;</r>',
  '<r><!--é--><?p é?><![CDATA[é\r\nx]]></r>',
  '<é 属性="文">文</é>',
  '<r xmlns:xml="http://www.w3.org/XML/1998/namespace" xml:lang="en"/>',
  '<r><a/>text<b/> <c/></r>',
  '<r><![CDATA[]]> <a/></r>',
  '<r><![CDATA[x]]> <a/></r>',
  '<r><?p    x  ?></r>',
  '\ufeff<?xml version="1.0"?><r>é</r>',
]
const doctypes = [
  '<!DOCTYPE r SYSTEM "missing"><r/>',
  '<!DOCTYPE r PUBLIC "pub" "sys"><r>é</r>',
  '<!DOCTYPE r [<!ENTITY x "<a/> text"><!ATTLIST r a CDATA "hi">]><r>&x;</r>',
  '<!DOCTYPE r [<!ELEMENT r (a,b*)><!ELEMENT a (#PCDATA)><!ELEMENT b EMPTY>]><r><a>x</a><b/></r>',
  '<!DOCTYPE r [<!ENTITY x "&#xE9;"><!ENTITY y "&x; xx">]><r>&y;</r>',
  '<!DOCTYPE r [<!ATTLIST r a NMTOKENS " x  y ">]><r/>',
  '<!DOCTYPE r [<!ENTITY % p "<!ELEMENT r EMPTY>">%p;]><r/>',
  '<!DOCTYPE r [<!ATTLIST r a CDATA "&#xE9;&amp;&quot;&apos;" b (x|y) #IMPLIED c NOTATION (one|two) #REQUIRED>]><r/>',
  '<!DOCTYPE r [<!ENTITY a \'say "hi"\'><!ENTITY b "&#xA;&amp;"><!ENTITY c SYSTEM "sys"><!NOTATION gif PUBLIC "image/gif"><!ENTITY bin SYSTEM "sys" NDATA gif>]><r>&a;&b;&c;</r>',
  '<!DOCTYPE r [<!-- c --><?p    x?><!ELEMENT r EMPTY><!ELEMENT r ANY>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r (#PCDATA|a)*><!ELEMENT a EMPTY>]><r> <a/> </r>',
  '<!DOCTYPE r [<!ELEMENT r (a)><!ELEMENT a EMPTY>]><r>&#32;<a/> </r>',
  '<!DOCTYPE r [<!ELEMENT r ANY>]><r> <a/> </r>',
  '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY e "é">]><r>&e;</r>',
  '<!DOCTYPE r [<!ATTLIST r xmlns:p CDATA "urn:p" p:x CDATA "a&amp;b">]><r/>',
  '<!DOCTYPE r [<!ATTLIST r xmlns:p CDATA "urn:p" p:x CDATA "a&amp;b">]><r xmlns:p="urn:other"/>',
  '<!DOCTYPE r [<!ATTLIST r a CDATA #FIXED "hi" id ID #IMPLIED>]><r a="other" id="one"/>',
  '<!DOCTYPE r [ ] \n><r/>',
  '<!DOCTYPE r PUBLIC "  a \n b  " "sys"><r/>',
  '<!DOCTYPE r [<!ELEMENT r (a,b,c)>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r (a,(b,c))>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r ((a,b),c)>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r ((a))>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r (a)+>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r (a*)+>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r ((a|b))?>]><r/>',
  '<!DOCTYPE r [<!ELEMENT r ((a|b),c+)>]><r/>',
  '<!DOCTYPE r [<!ENTITY e " ">]><r>&e;<a/></r>',
  '<!DOCTYPE r [<!ENTITY e "<a/> ">]><r>&e;</r>',
  '<!DOCTYPE r [<!ENTITY e " <a/>">]><r>&e;</r>',
  '<!DOCTYPE r [<!ENTITY e "<a><b/></a>">]><r>&e;<a/></r>',
  '<!DOCTYPE r [<!ENTITY e "<![CDATA[x]]> ">]><r>&e;<a/></r>',
  '<!DOCTYPE r [<!ENTITY e ""><!ENTITY f "&e;">]><r> &f;<a/> </r>',
  '<!DOCTYPE r [<!ENTITY e "&#xD;">]><r>&e;</r>',
  '<!DOCTYPE r [<!ENTITY e "&#xA;">]><r a="&e;"/>',
  '<!DOCTYPE r [<!ENTITY e "one"><!ENTITY e "two">]><r>&e;</r>',
  '<!DOCTYPE r [<!ATTLIST r a CDATA "one"><!ATTLIST r a CDATA "two">]><r/>',
  '<!DOCTYPE r [<!ATTLIST r xml:space (default|preserve) "preserve">]><r> <a/> </r>',
  '<!DOCTYPE r [<!ATTLIST r xml:space (default|preserve) "preserve">]><r xml:space="default"> <a/> </r>',
  '<!DOCTYPE r [<!ENTITY e "<p:a/>">]><r xmlns:p="urn:p">&e;</r>',
  '<!DOCTYPE r [<!ENTITY % e SYSTEM "missing">%e;]><r/>',
  '<!DOCTYPE r [<!NOTATION x SYSTEM "one"><!NOTATION x SYSTEM "two">]><r/>',
  '<!DOCTYPE r [<!ELEMENT r EMPTY><!ATTLIST r a CDATA "a&gt;b&lt;c&amp;d">]><r/>',
  '<!DOCTYPE r [<!ELEMENT r (a)><!ELEMENT a EMPTY>]><r> &#32;<a/> </r>',
]

for (const replacement of [' <a/>', '<a/> ', ' ', '&#32;<a/>', '<a> <b/> </a>'])
  for (const body of ['&e;', 'x&e;', '<b/>&e;'])
    for (const space of ['', ' xml:space="preserve"'])
      doctypes.push(`<!DOCTYPE r [<!ENTITY e "${replacement}">]><r${space}>${body}</r>`)

it.each([
  { name: 'ordinary XML', samples: normal },
  { name: 'DTD XML', samples: doctypes },
])(
  'serializes $name with INDENT through source/stored CHECKs and native INSERTs',
  async ({ name, samples }) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-xml-indent-'))
    const value = (v: string | number | boolean | null): Input =>
      v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
    try {
      const expressions = {
          content: 'XMLSERIALIZE(CONTENT v AS text INDENT)',
          document: 'XMLSERIALIZE(DOCUMENT v AS text INDENT)',
          bounded: 'XMLSERIALIZE(CONTENT v AS varchar(5) INDENT)',
          json: 'to_json(XMLSERIALIZE(CONTENT v AS text INDENT))::text',
          array: 'XMLSERIALIZE(CONTENT (ARRAY[v,NULL::xml])[1] AS text INDENT)',
          record: 'XMLSERIALIZE(CONTENT (ROW(v)::indent_packet).document AS text INDENT)',
          domain: 'XMLSERIALIZE(DOCUMENT v::indent_document AS text INDENT)',
        },
        forms = Object.entries(expressions),
        checks = forms.map(([name, expr], selector) => ({
          name,
          expr,
          sql: `CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${expr}) IS NOT DISTINCT FROM expected END`,
        }))
      await pg.exec(
        `SET xmloption=CONTENT;CREATE TYPE indent_packet AS (document xml);CREATE DOMAIN indent_document AS xml CHECK(VALUE IS DOCUMENT);CREATE TABLE xml_indent_values(v xml,selector int4,expected text,bypass bool,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')});CREATE TEMP TABLE xml_oracle(v xml);`,
      )
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'xml_indent_values')!,
        plans = checks.flatMap((c) =>
          ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: c.name + '_' + origin,
            },
            expression: lowerTableCheck(
              table,
              table.constraints.find((x) => x.name === c.name)!,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${c.sql})` : undefined,
            )!.expression,
          })),
        )
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        xmlOption: 'content',
        arrayNulls: true,
      })
      expect(
        group.checks.flatMap((c, i) =>
          c.kind === 'unsupported'
            ? [{ name: plans[i]!.identity.constraint, reason: c.reason }]
            : [],
        ),
      ).toEqual([])
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        reference: unknown[] = []
      let inserts = 0
      const inputs = samples.map((s) =>
        s === null
          ? 'NULL::xml'
          : s.startsWith('\ufeff<?xml')
            ? 'XMLPARSE(DOCUMENT $xml$' + s + '$xml$)'
            : literal(s),
      )
      if (name === 'ordinary XML')
        inputs.push(
          "xmltext(E'\\001')",
          "xmlcomment(E'\\001')",
          "xmlroot('<r/>'::xml,VERSION 'a\"b')",
        )
      for (const sql of inputs) {
        await pg.exec('TRUNCATE xml_oracle')
        await pg.exec('INSERT INTO xml_oracle VALUES(' + sql + ')')
        const encoded = (
          await pg.query<{ value: string | null }>(
            "SELECT encode(convert_to(v::text,'UTF8'),'hex') value FROM xml_oracle",
          )
        ).rows[0]!.value
        const raw = encoded === null ? null : Buffer.from(encoded, 'hex').toString('utf8')
        for (const [selector, [name, expr]] of forms.entries()) {
          let expected: string | null = null,
            outcome: Outcome = { kind: 'True' }
          try {
            expected = (
              await pg.query<{ value: string | null }>(`SELECT (${expr}) value FROM xml_oracle`)
            ).rows[0]!.value
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const row: Row = {
            v: value(raw),
            selector: value(selector),
            expected: value(expected),
            bypass: value(false),
          }
          const insert = pg.query(
            'INSERT INTO xml_indent_values SELECT v,$1,$2,false FROM xml_oracle',
            [selector, expected],
          )
          if (outcome.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
          else await insert
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: outcome })
          if (outcome.kind !== 'Error') {
            await expect(
              pg.query('INSERT INTO xml_indent_values SELECT v,$1,$2,false FROM xml_oracle', [
                selector,
                (expected ?? '') + 'wrong',
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, expected: value((expected ?? '') + 'wrong') },
                expected: { kind: 'False' },
              })
          }
          await pg.query('INSERT INTO xml_indent_values SELECT v,$1,$2,true FROM xml_oracle', [
            selector,
            expected,
          ])
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: value(true) },
              expected: { kind: 'True' },
            })
          reference.push({ name, raw, expected, outcome })
        }
      }
      const packet = 'artifacts/goal-checks/xml-indent-active'
      await mkdir(packet, { recursive: true })
      const suffix = name === 'ordinary XML' ? 'ordinary' : 'dtd'
      await writeFile(
        packet + '/' + suffix + '-reference.json',
        JSON.stringify(
          { forms: forms.length, inserts, fixtures: fixtures.length, reference },
          null,
          2,
        ) + '\n',
      )
      await writeFile(packet + '/' + suffix + '-evaluators.rs', group.evaluatorSource ?? '')
      await runCheckParity(
        root,
        'xmlindent',
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
      console.info('XML indent parity', {
        name,
        forms: forms.length,
        inserts,
        fixtures: fixtures.length,
      })
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600_000,
)
