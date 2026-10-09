import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)
const goString = (value: string) => JSON.stringify(value).replaceAll('\ufeff', '\\ufeff')
const rustString = (value: string) =>
  '"' +
  [...value]
    .map((character) => {
      if (character === '\\') return '\\\\'
      if (character === '"') return '\\"'
      const code = character.codePointAt(0)!
      if (code < 32 || code === 0xfeff) return `\\u{${code.toString(16)}}`
      return character
    })
    .join('') +
  '"'

describe('CHECK XML markup foundation', () => {
  it('matches PostgreSQL balanced markup in native Rust, Go and TypeScript', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-xml-markup-'))
    try {
      const samples = new Set([
        '',
        ' ',
        '\r\n\t',
        'plain',
        '<root/>',
        '<a/><b/>',
        '<a/>text',
        '<a>text<b/>tail</a>',
        '<a></a >',
        '<a / >',
        '<a>',
        '</a>',
        '<a></b>',
        '<a><b></a></b>',
        '<a><b/></a>',
        '<a/><!DOCTYPE a>',
        '<!--comment-->',
        '<!--a--b-->',
        '<!--a--->',
        '<!-- -->',
        '<!--',
        '<?target?>',
        '<?target value?>',
        '<?target?>text',
        '<?XML version="1.0"?>',
        '<?xml-stylesheet href="a"?>',
        '<?xml:a?>',
        '<?a?bad?>',
        '<?a bad<value?>',
        '<![CDATA[text]]>',
        '<a><![CDATA[<>&]]></a>',
        '<a><![CDATA[]]></a>',
        '<a>]]></a>',
        '<a><![CDATA[unterminated</a>',
        '<a x="value" y=\'other\'/>',
        '<a x="1"x="2"/>',
        '<a x="1" x="2"/>',
        '<a x="1" y="2"/>',
        '<a x="<"/>',
        '<a x="&lt;"/>',
        '<a x="&amp;"/>',
        '<a x="&apos;&quot;&gt;"/>',
        '<a x="&#60;"/>',
        '<a x="&#x3c;"/>',
        '<a x="&#X3C;"/>',
        '<a x="&#;"/>',
        '<a x="&#x;"/>',
        '<a>&unknown;</a>',
        '<a>&amp;&lt;&gt;&quot;&apos;</a>',
        '<a>&#0;</a>',
        '<a>&#xD800;</a>',
        '<a>&#x10FFFF;</a>',
        '<a>&#x110000;</a>',
        '<a>&#99999999999999999999;</a>',
        '<a>&#00000000000000000000065;</a>',
        '<a>&#x000000000000000000000041;</a>',
        '<a>&amp</a>',
        '<a>&</a>',
        '<p:root p:x="1"/>',
        '<root xmlns:xml="wrong"/>',
        '<root xmlns:a="urn:x" xmlns:b="urn:x" a:x="1" b:x="2"/>',
        '<root xmlns:a="a" xmlns:a="b"/>',
        '<root xmlns="a" xmlns="b"/>',
        '<p:root p:x="1" p:x="2"/>',
        '<p:r xmlns:p="urn:x" p:x="1" p:x="2"/>',
        '<p:r p:x="1" p:x="2" xmlns:p="urn:x"/>',
        '<r xmlns:p="urn:x"><p:r p:x="1" p:x="2"/></r>',
        '<r xmlns:p="urn:x"><a/><p:r p:x="1" p:x="2"/></r>',
        '<r><a xmlns:p="urn:x"/><p:r p:x="1" p:x="2"/></r>',
        '<r><a xmlns:p="urn:x"></a><p:r p:x="1" p:x="2"/></r>',
        '<r xml:x="1" xml:x="2"/>',
        '<r xmlns:p="" p:x="1" p:x="2"/>',
        '<r xmlns:p="wrong uri" p:x="1" p:x="2"/>',
        '<r xmlns:p="http://www.w3.org/XML/1998/namespace" p:x="1" p:x="2"/>',
        '<r xmlns:p="urn:x"><a xmlns:p="" p:x="1" p:x="2"/></r>',
        '<r xmlns:p="urn:x" xmlns:p="urn:y"/>',
        '<r xmlns="" xmlns=""/>',
        '<r xmlns:xml="wrong" xmlns:xml="wrong"/>',
        '<r xmlns:p="" xmlns:p=""/>',
        '<r :x="1" :x="2"/>',
        '<a:b:c a:b:c="1" a:b:c="2"/>',
        '<a:b:c xmlns:a="urn:x" a:b:c="1" a:b:c="2"/>',
        '<root :x="1"/>',
        '<:root/>',
        '<a:b:c/>',
        '<a :="1"/>',
        '<a:b></a:b>',
        '<é/>',
        '<😊/>',
        '<a😊/>',
        '<𐀀/>',
        '<a·/>',
        '<·/>',
        '<a\u0300/>',
        '<\u0300/>',
        '<a>\u0001</a>',
        '<a>\uffff</a>',
        '<a>\ufffe</a>',
        '<a>\t\r\n</a>',
        '<a>&#9;&#10;&#13;</a>',
        '<a>&#x1FFFE;</a>',
      ])
      for (const declaration of [
        '<!ATTLIST root value CDATA "default">',
        '<!ATTLIST root value CDATA "&missing;">',
        '<!ATTLIST root value CDATA "&label;"><!ENTITY label "later">',
        '<!ENTITY label "first"><!ATTLIST root value CDATA "&label;">',
        '<!ENTITY label SYSTEM "missing"><!ATTLIST root value CDATA "&label;">',
        '<!ATTLIST root xmlns:p CDATA "urn:test">',
        '<!ATTLIST root xmlns:p CDATA "">',
        '<!ATTLIST root xmlns:p CDATA "http://www.w3.org/XML/1998/namespace">',
        '<!ATTLIST root xmlns:p NMTOKENS "  urn:test  ">',
        '<!ATTLIST root xmlns:p NMTOKENS "&#9;">',
        '<!ATTLIST root xmlns:p NMTOKENS #IMPLIED>',
        '<!ATTLIST root xmlns:p CDATA #IMPLIED xmlns:p CDATA "urn:test">',
        '<!ATTLIST root xmlns:p CDATA "urn:test" xmlns:p CDATA #IMPLIED>',
        '<!ATTLIST root p:x CDATA "default" xmlns:p CDATA "urn:test">',
        '<!ATTLIST root p:x CDATA "default">',
        '<!ATTLIST child xmlns:p CDATA "urn:test">',
      ]) {
        for (const body of [
          '<root/>',
          '<root value="explicit"/>',
          '<root p:x="1" p:x="2"/>',
          '<root p:x="1" p:x="2" xmlns:p="urn:explicit"/>',
          '<root p:x="1" p:x="2" xmlns:p=""/>',
          '<root p:x="1" p:x="2" xmlns:p="   "/>',
          '<root p:x="1" p:x="2" xmlns:p="&#9;"/>',
          '<root><child p:x="1" p:x="2"/></root>',
          '<root>&markup;</root>',
        ]) {
          samples.add(
            `<!DOCTYPE root [${declaration}<!ENTITY markup '<child p:x="1" p:x="2"/>'>]>${body}`,
          )
        }
      }
      for (const replacement of [
        '<child p:x="1" p:x="2"/>',
        '<child p:x="1" p:x="2" xmlns:p=""/>',
        '<child p:x="1" p:x="2" xmlns:p="urn:inner"/>',
        '<child>&nested;</child>',
      ]) {
        for (const namespace of ['', ' xmlns:p="urn:outer"', ' xmlns:p=""']) {
          samples.add(
            `<!DOCTYPE root [<!ENTITY markup '${replacement}'><!ENTITY nested '<child p:x="1" p:x="2"/>'>]><root${namespace}>&markup;</root>`,
          )
        }
      }
      for (const declaration of [
        '',
        '<!ELEMENT root EMPTY>',
        '<!ELEMENT root ANY>',
        '<!ENTITY label "hello">',
        '<!ENTITY label "a\r\nb\rc">',
        '<!ENTITY label "&#13;&#10;">',
        '<!ENTITY label "<child/>">',
        '<!ENTITY label "<child>">',
        '<!ENTITY label "</root>">',
        '<!ENTITY label "&unknown;">',
        '<!ENTITY label "&amp;">',
        '<!ENTITY label "&#38;amp;">',
        '<!ENTITY label "&#60;child/>">',
        '<!ENTITY label "<![CDATA[&unknown;]]>">',
        '<!ENTITY label "<!--&unknown;-->">',
        '<!ENTITY label "&label;">',
        '<!ENTITY label "&other;"><!ENTITY other "world">',
        '<!ENTITY label "first"><!ENTITY label "second">',
        '<!ENTITY label SYSTEM "missing">',
        '<!ENTITY label SYSTEM "missing" NDATA image>',
        '<!ENTITY % declarations "<!ENTITY label \'hello\'>">%declarations;',
        '<!ENTITY % declarations "&#60;!ENTITY label \'hello\'>">%declarations;',
        '%undeclared;',
        '<!ENTITY % absent SYSTEM "missing">%absent;',
        '%undeclared;<!ENTITY label "hello">',
        '%undeclared;<!ENTITY label "<bad>">',
        '<!ENTITY label "%missing;">',
        '<!ENTITY label "%missing;&bad">',
        '<!ENTITY label "%missing;&#0;">',
        '<!ENTITY label "%missing;\u0001">',
        '<!ENTITY label "%missing;%bad">',
        '<!ENTITY % known ""><!ENTITY label "%known;">',
        '<!ENTITY label "%missing;tail"><!ENTITY other "<bad>">',
      ]) {
        for (const external of ['', ' SYSTEM "missing"']) {
          for (const standalone of [
            '',
            '<?xml version="1.0" standalone="yes"?>',
            '<?xml version="1.0" standalone="no"?>',
          ]) {
            for (const body of [
              '<root/>',
              '<root>&label;</root>',
              '<root value="&label;"/>',
              '<root>&unknown;</root>',
              '<root>&other;</root>',
            ]) {
              samples.add(`${standalone}<!DOCTYPE root${external} [${declaration}]>${body}`)
            }
          }
        }
      }
      for (const text of ['a', 'é', '😊', '\u0001', '\uffff', '&', '<', ']]>', '\\b', '\\u0001']) {
        for (const wrapper of [
          (value: string) => `<root>${value}</root>`,
          (value: string) => `<root attr="${value}"/>`,
          (value: string) => `<!--${value}-->`,
          (value: string) => `<?target ${value}?>`,
          (value: string) => `<![CDATA[${value}]]>`,
        ])
          samples.add(wrapper(text))
      }
      for (const version of ['1.0', '1.1', '1.', '1.01', '1.9', '2.0', '', 'abc', 'é', '\u0001']) {
        for (const encoding of [
          '',
          ' encoding="UTF-8"',
          ' encoding="unknown"',
          ' encoding=""',
          ' encoding="1bad"',
          ' encoding="bad space"',
        ]) {
          for (const standalone of [
            '',
            ' standalone="yes"',
            ' standalone="no"',
            ' standalone="bad"',
          ]) {
            samples.add(`<?xml version="${version}"${encoding}${standalone}?><root/>`)
          }
        }
      }
      for (const declaration of [
        '<?xml?>',
        '<?xml version="1.0"?>',
        "<?xml version = '1.0' ?>",
        '<?xml encoding="UTF-8"?>',
        '<?xml version="1.0"encoding="UTF-8"?>',
        '<?xml version="1.0"standalone="yes"?>',
        '<?xml version="1.0" standalone="yes" encoding="UTF-8"?>',
        '<?xml version="1.0" encoding="UTF-8"standalone="yes"?>',
        '<?xml version="1.0" version="1.0"?>',
        '<?xml version="1.0">',
      ]) {
        for (const suffix of ['', '<root/>', '<a/><b/>', 'text']) {
          samples.add(declaration + suffix)
          samples.add('\ufeff' + declaration + suffix)
        }
      }
      for (const count of [17, 18, 19, 20, 21]) {
        const declarations = Array.from(
          { length: count },
          (_, index) => `<!ENTITY e${index} "${index + 1 < count ? `&e${index + 1};` : 'text'}">`,
        ).join('')
        samples.add(`<!DOCTYPE root [${declarations}]><root>&e0;</root>`)
        samples.add(`<!DOCTYPE root [${declarations}]><root a="&e0;"/>`)
      }
      for (const count of [6, 7, 8]) {
        const declarations = Array.from(
          { length: count },
          (_, index) => `<!ENTITY e${index} "${index === 0 ? 't' : `&e${index - 1};`.repeat(5)}">`,
        ).join('')
        samples.add(`<!DOCTYPE root [${declarations}]><root>&e${count - 1};</root>`)
        samples.add(`<!DOCTYPE root [${declarations}]><root a="&e${count - 1};"/>`)
      }
      {
        const entities = Array.from(
          { length: 6 },
          (_, index) => `<!ENTITY e${index} "${index === 0 ? 't' : `&e${index - 1};`.repeat(5)}">`,
        ).join('')
        for (const count of [9, 10, 11, 12]) {
          samples.add(`<!DOCTYPE root [${entities}]><root a="${'&e5;'.repeat(count)}"/>`)
          samples.add(
            `<!DOCTYPE root [${entities}]><root ${Array.from({ length: count }, (_, index) => `a${index}="&e5;"`).join(' ')}/>`,
          )
          samples.add(
            `<!DOCTYPE root [${entities}]><root>${'<item a="&e5;"/>'.repeat(count)}</root>`,
          )
        }
        for (const count of [280, 287, 288, 300]) {
          samples.add(
            `<!DOCTYPE root [${entities}<!ATTLIST item a CDATA "&e5;">]><root>${'<item/>'.repeat(count)}</root>`,
          )
        }
      }
      for (const count of [17, 18, 19, 20]) {
        for (const terminal of ['<!ELEMENT root EMPTY>', '<!ENTITY label "text">']) {
          const entities = Array.from(
            { length: count },
            (_, index) =>
              `<!ENTITY % e${index} '${index === 0 ? terminal : `&#37;e${index - 1};`}'>`,
          ).join('')
          samples.add(`<!DOCTYPE root [${entities}%e${count - 1};]><root/>`)
        }
      }
      for (const count of [24999, 25000, 25001, 50000, 50001]) {
        samples.add(`<${'a'.repeat(count)}/>`)
        samples.add(`<${'é'.repeat(count)}/>`)
      }
      for (const count of [254, 255, 256, 257, 258]) {
        samples.add('<a>'.repeat(count) + '</a>'.repeat(count))
        samples.add('<a>'.repeat(count) + '<empty/>' + '</a>'.repeat(count))
        for (const replacement of ['<child/>', '<child></child>', 'text', '', '&inner;']) {
          samples.add(
            `<!DOCTYPE a [<!ENTITY label "${replacement}"><!ENTITY inner "text">]>` +
              '<a>'.repeat(count) +
              '&label;' +
              '</a>'.repeat(count),
          )
          samples.add(
            `<!DOCTYPE a [<!ENTITY label "${replacement}"><!ENTITY inner "text">]><r>&label;` +
              '<a>'.repeat(count - 1) +
              '&label;' +
              '</a>'.repeat(count - 1) +
              '</r>',
          )
        }
      }
      for (const count of [1999, 2000, 2001, 49994, 49995, 49996]) {
        const identifier = 'a'.repeat(count)
        samples.add(`<!DOCTYPE root SYSTEM "${identifier}"><root/>`)
        for (const declaration of [
          `<!ENTITY label SYSTEM "${identifier}">`,
          `<!ENTITY % label SYSTEM "${identifier}">`,
          `<!ENTITY label SYSTEM "${identifier}" NDATA image>`,
          `<!NOTATION image SYSTEM "${identifier}">`,
          `<!ENTITY label "first"><!ENTITY label SYSTEM "${identifier}">`,
          `<!ENTITY amp SYSTEM "${identifier}">`,
        ])
          samples.add(`<!DOCTYPE root [${declaration}]><root/>`)
      }
      for (const count of [49998, 49999, 50000]) {
        const identifier = 'a'.repeat(count)
        samples.add(`<!DOCTYPE root PUBLIC "${identifier}" "missing"><root/>`)
        samples.add(`<!DOCTYPE root [<!NOTATION image PUBLIC "${identifier}">]><root/>`)
      }
      const inputs = [...samples]
      const rows = (
        await pg.query<{ ordinal: number; document: boolean; content: boolean }>(
          `SELECT ordinal, xml_is_well_formed_document(input) AS document,
          xml_is_well_formed_content(input) AS content
         FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS samples(input, ordinal)`,
          [JSON.stringify(inputs)],
        )
      ).rows.map((row) => ({ ...row, input: inputs[Number(row.ordinal) - 1]! }))
      const files = [
        'xml_lexical',
        'xml_text',
        'xml_value',
        'xml_declaration',
        'xml_dtd',
        'xml_entities',
        'xml_subset',
        'xml_validation',
      ].map((name) => {
        const path = `crates/check-evaluator/src/operations/pg_catalog/${name}.rs`
        return { path, source: readFileSync(path, 'utf8') }
      })
      const harness = `
pub fn evaluate_check_markup(input: &str, document: bool) -> bool {
    xml_well_formed(input, document)
}
pub fn evaluate_check_dtd_declaration(input: &str) -> bool {
    let mut wrapped = "<!DOCTYPE root [".to_owned();
    wrapped.push_str(input);
    wrapped.push_str("]><root/>");
    xml_well_formed(wrapped.as_str(), true)
}
`
      const generated = transpileCheckRust({
        schemaVersion: 1,
        modules: [
          {
            name: 'pg_catalog',
            dependencies: [],
            files: [...files, { path: 'xml_markup_harness.rs', source: harness }],
          },
        ],
      })
      const javascript = join(directory, 'runtime.mjs')
      await writeFile(
        javascript,
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        }).outputText,
      )
      const compiled = await import(pathToFileURL(javascript).href)
      const evaluate = (
        compiled as {
          evaluateCheckMarkup(input: string, document: boolean): boolean
        }
      ).evaluateCheckMarkup
      for (const row of rows) {
        expect(evaluate(row.input, true), JSON.stringify(row.input) + ' document').toBe(
          row.document,
        )
        expect(evaluate(row.input, false), JSON.stringify(row.input) + ' content').toBe(row.content)
      }
      const declarations = new Set([
        '<!ELEMENT root EMPTY>',
        '<!ELEMENT root ANY>',
        '<!ELEMENT root (child)>',
        '<!ELEMENT root (#PCDATA)>',
        '<!ELEMENT root (#PCDATA)*>',
        '<!ELEMENT root (#PCDATA|child)*>',
        '<!ELEMENT root (#PCDATA|child)>',
        '<!ELEMENT root (a,b|c)>',
        '<!ELEMENT root ((a,b)|(c,d))>',
        '<!ELEMENT root ()>',
        '<!ELEMENT root (a,)>',
        '<!ELEMENT root (|a)>',
        '<!ELEMENT root (a??)>',
        '<!ELEMENT root ((a))>',
        '<!ATTLIST root>',
        '<!ATTLIST root name CDATA #IMPLIED>',
        '<!ATTLIST root name CDATA "value">',
        '<!ATTLIST root name CDATA #FIXED "value">',
        '<!ATTLIST root name (one|two) #REQUIRED>',
        '<!ATTLIST root name (1|2) "1">',
        '<!ATTLIST root name NOTATION (one|two) #IMPLIED>',
        '<!ATTLIST root name NOTATION (1|2) #IMPLIED>',
        '<!ATTLIST root name CDATA "<">',
        '<!ATTLIST root name CDATA "&lt;">',
        '<!ATTLIST root name CDATA "&#0;">',
        '<!ATTLIST root name CDATA #FIXED"x">',
        '<!ENTITY label "hello">',
        '<!ENTITY label "<b/>">',
        '<!ENTITY label "&unknown;">',
        '<!ENTITY label "&#0;">',
        '<!ENTITY label "&bad">',
        '<!ENTITY label "%other;">',
        '<!ENTITY % definitions "<!ELEMENT root EMPTY>">',
        '<!ENTITY %definitions "">',
        '<!ENTITY label SYSTEM "missing">',
        '<!ENTITY label SYSTEM "missing#fragment">',
        '<!ENTITY label PUBLIC "identifier" "missing">',
        '<!ENTITY label PUBLIC "identifier">',
        '<!ENTITY label PUBLIC "bad&" "missing">',
        '<!ENTITY label SYSTEM "missing" NDATA image>',
        '<!ENTITY % label SYSTEM "missing" NDATA image>',
        '<!NOTATION image SYSTEM "missing">',
        '<!NOTATION image PUBLIC "identifier">',
        '<!NOTATION image PUBLIC "identifier" "missing">',
        '<!NOTATION image PUBLIC "bad&">',
        '<!NOTATION image>',
      ])
      for (const type of [
        'CDATA',
        'ID',
        'IDREF',
        'IDREFS',
        'ENTITY',
        'ENTITIES',
        'NMTOKEN',
        'NMTOKENS',
        'BAD',
      ])
        for (const value of ['#REQUIRED', '#IMPLIED', '#FIXED "x"', '"x"'])
          declarations.add(`<!ATTLIST root name ${type} ${value}>`)
      for (const model of ['a', 'a,b', 'a|b', '(a,b),c', '(a|b),(c|d)', 'a b'])
        for (const quantifier of ['', '?', '*', '+'])
          declarations.add(`<!ELEMENT root (${model})${quantifier}>`)
      const dtdInputs = [...declarations]
      const dtdRows = (
        await pg.query<{ ordinal: number; valid: boolean }>(
          `SELECT ordinal, xml_is_well_formed_document('<!DOCTYPE root [' || declaration || ']><root/>') AS valid
         FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS items(declaration, ordinal)`,
          [JSON.stringify(dtdInputs)],
        )
      ).rows.map((row) => ({ ...row, input: dtdInputs[Number(row.ordinal) - 1]! }))
      const evaluateDtd = (
        compiled as {
          evaluateCheckDtdDeclaration(input: string): boolean
        }
      ).evaluateCheckDtdDeclaration
      for (const row of dtdRows) expect(evaluateDtd(row.input), row.input).toBe(row.valid)
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module xmlmarkup\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestMarkup(t *testing.T) {
${rows
  .flatMap((row) =>
    [true, false].map(
      (document) =>
        `if EvaluateCheckMarkup(${goString(row.input)}, ${document}) != ${document ? row.document : row.content} { t.Fatalf("%s", ${goString(row.input + (document ? ' document' : ' content'))}) }`,
    ),
  )
  .join('\n')}
${dtdRows.map((row) => `if EvaluateCheckDtdDeclaration(${goString(row.input)}) != ${row.valid} { t.Fatalf("%s", ${goString(row.input)}) }`).join('\n')}
}`,
      )
      await Promise.all(
        files.map((file) => writeFile(join(directory, basename(file.path)), file.source)),
      )
      await writeFile(
        join(directory, 'markup.rs'),
        files.map((file) => `include!(${JSON.stringify(basename(file.path))});`).join('\n') +
          harness +
          `
#[test] fn markup() {
${rows
  .flatMap((row) =>
    [true, false].map(
      (document) =>
        `assert_eq!(evaluate_check_markup(${rustString(row.input)}, ${document}), ${document ? row.document : row.content}, "{}", ${rustString(JSON.stringify(row.input) + (document ? ' document' : ' content'))});`,
    ),
  )
  .join('\n')}
${dtdRows.map((row) => `assert_eq!(evaluate_check_dtd_declaration(${rustString(row.input)}), ${row.valid}, "{}", ${rustString(row.input)});`).join('\n')}
}`,
      )
      await run('rustc', ['--test', join(directory, 'markup.rs'), '-o', join(directory, 'markup')])
      await run(join(directory, 'markup'), [])
      await run('go', ['test', './...'], { cwd: directory })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 240_000)
})
