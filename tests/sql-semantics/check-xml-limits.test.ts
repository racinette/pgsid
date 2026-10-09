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

describe('CHECK XML resource limits', () => {
  it('matches PostgreSQL input buffers and coalesced text nodes in Rust, Go and TypeScript', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-xml-limits-'))
    try {
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
      const harness = `pub fn evaluate_check_xml_limit(input: &str, document: bool) -> bool {
        xml_well_formed(input, document)
      }`
      const generated = transpileCheckRust({
        schemaVersion: 1,
        modules: [
          {
            name: 'pg_catalog',
            dependencies: [],
            files: [...files, { path: 'limit_harness.rs', source: harness }],
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
      const evaluate = (
        (await import(pathToFileURL(javascript).href)) as {
          evaluateCheckXmlLimit(input: string, document: boolean): boolean
        }
      ).evaluateCheckXmlLimit
      const cases: { name: string; input: () => string }[] = [
        {
          name: 'DTD default before tokenized normalization',
          input: () => `<!DOCTYPE r [<!ATTLIST r a NMTOKENS "${' '.repeat(10000001)}">]><r/>`,
        },
        {
          name: 'attribute during tokenized normalization',
          input: () =>
            `<!DOCTYPE r [<!ATTLIST r a NMTOKENS #IMPLIED>]><r a="${' '.repeat(10000001)}"/>`,
        },
        {
          name: 'borrowed attribute without decoding',
          input: () => `<r a="${'a'.repeat(10000001)}"/>`,
        },
        {
          name: 'decoded attribute over limit',
          input: () => `<r a="&#65;${'a'.repeat(10000000)}"/>`,
        },
        {
          name: 'numeric attribute buffer reserve',
          input: () => `<r a="${'a'.repeat(9999997)}&#65;"/>`,
        },
        {
          name: 'entity value at its limit',
          input: () => `<!DOCTYPE r [<!ENTITY label "${'a'.repeat(10000000)}">]><r/>`,
        },
        {
          name: 'entity value over its limit',
          input: () => `<!DOCTYPE r [<!ENTITY label "${'a'.repeat(10000001)}">]><r/>`,
        },
        {
          name: 'numeric entity buffer reserve',
          input: () => `<!DOCTYPE r [<!ENTITY label "${'a'.repeat(9999997)}&#65;">]><r/>`,
        },
        { name: 'unmodified ASCII text', input: () => `<r>${'a'.repeat(10000001)}</r>` },
        { name: 'Unicode text chunks', input: () => `<r>é${'a'.repeat(9999999)}</r>` },
        {
          name: 'numeric reference before text',
          input: () => `<r>&#65;${'a'.repeat(10000000)}</r>`,
        },
        {
          name: 'entity text coalescence',
          input: () => `<!DOCTYPE r [<!ENTITY label "a">]><r>&label;${'a'.repeat(10000000)}</r>`,
        },
        {
          name: 'CDATA at its buffer limit',
          input: () => `<r><![CDATA[${'a'.repeat(9999995)}]]></r>`,
        },
        {
          name: 'CDATA over its buffer limit',
          input: () => `<r><![CDATA[${'a'.repeat(9999996)}]]></r>`,
        },
        {
          name: 'adjacent CDATA nodes',
          input: () =>
            `<r><![CDATA[${'a'.repeat(5000000)}]]><![CDATA[${'b'.repeat(5000001)}]]></r>`,
        },
        { name: 'ASCII comment at its limit', input: () => `<!--${'a'.repeat(10000000)}--><r/>` },
        { name: 'ASCII comment over its limit', input: () => `<!--${'a'.repeat(10000001)}--><r/>` },
        {
          name: 'Unicode comment at its buffer reserve',
          input: () => `<!--é${'a'.repeat(9999993)}--><r/>`,
        },
        {
          name: 'Unicode comment over its buffer reserve',
          input: () => `<!--é${'a'.repeat(9999994)}--><r/>`,
        },
        {
          name: 'Unicode comment with a preallocated ASCII prefix',
          input: () => `<!--${'a'.repeat(9999999)}é--><r/>`,
        },
        {
          name: 'comment with a normalized final line ending',
          input: () => `<!--${'a'.repeat(9999999)}\r\n--><r/>`,
        },
        {
          name: 'processing instruction at its limit',
          input: () => `<?target ${'a'.repeat(9999995)}?><r/>`,
        },
        {
          name: 'processing instruction over its limit',
          input: () => `<?target ${'a'.repeat(9999996)}?><r/>`,
        },
      ]
      const rows: { name: string; path: string; document: boolean; content: boolean }[] = []
      for (const [index, item] of cases.entries()) {
        const input = item.input()
        const oracle = (
          await pg.query<{ document: boolean; content: boolean }>(
            'SELECT xml_is_well_formed_document($1::text) AS document, xml_is_well_formed_content($1::text) AS content',
            [input],
          )
        ).rows[0]!
        expect(evaluate(input, true), item.name + ' document').toBe(oracle.document)
        expect(evaluate(input, false), item.name + ' content').toBe(oracle.content)
        const path = join(directory, `input-${index}.xml`)
        await writeFile(path, input)
        rows.push({ name: item.name, path, ...oracle })
      }
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module xmllimits\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import ("os"; "testing")
func TestXmlLimits(t *testing.T) {
${rows
  .map(
    (row) => `{
  input, err := os.ReadFile(${JSON.stringify(row.path)}); if err != nil { t.Fatal(err) }
  if EvaluateCheckXmlLimit(string(input), true) != ${row.document} { t.Fatal(${JSON.stringify(row.name + ' document')}) }
  if EvaluateCheckXmlLimit(string(input), false) != ${row.content} { t.Fatal(${JSON.stringify(row.name + ' content')}) }
}`,
  )
  .join('\n')}
}`,
      )
      await Promise.all(
        files.map((file) => writeFile(join(directory, basename(file.path)), file.source)),
      )
      await writeFile(
        join(directory, 'runtime.rs'),
        files.map((file) => `include!(${JSON.stringify(basename(file.path))});`).join('\n') +
          harness +
          `
#[test] fn limits() {
${rows
  .map(
    (row) => `{
 let input = std::fs::read_to_string(${JSON.stringify(row.path)}).unwrap();
 assert_eq!(evaluate_check_xml_limit(&input, true), ${row.document}, ${JSON.stringify(row.name + ' document')});
 assert_eq!(evaluate_check_xml_limit(&input, false), ${row.content}, ${JSON.stringify(row.name + ' content')});
}`,
  )
  .join('\n')}
}`,
      )
      await run('rustc', [
        '-O',
        '--test',
        join(directory, 'runtime.rs'),
        '-o',
        join(directory, 'runtime'),
      ])
      await run(join(directory, 'runtime'), [])
      await run('go', ['test', '-timeout', '120s', './...'], { cwd: directory, timeout: 150000 })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600_000)
})
