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

it('matches native query input-window boundaries across chunks and markup frames in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-query-buffer-'))
  const packet = 'artifacts/goal-checks/xml-query-policy-active',
    known = (value: string | boolean): Input => ({ kind: 'Value', value })
  try {
    await pg.exec(
      "CREATE FUNCTION pg_temp.query_buffer_xml(cstring) RETURNS xml LANGUAGE internal IMMUTABLE STRICT AS 'textin'",
    )
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'query_buffer',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: BoolValue) -> CheckOutcome { let result=query_buffer_probe(input,expected); check_from_bool(result) }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const schema = source.modules.find((m) => m.name === 'pg_catalog')!
    const path = 'crates/check-evaluator/src/operations/pg_catalog/xml_query_stream.rs'
    const stream = schema.files.find((f) => f.path === path)!
    expect(stream.source).toContain('const XML_QUERY_BUFFER_LIMIT: i64 = 10000000i64;')
    stream.source = stream.source.replace(
      'const XML_QUERY_BUFFER_LIMIT: i64 = 10000000i64;',
      'const XML_QUERY_BUFFER_LIMIT: i64 = 8000i64;',
    )
    stream.source += `
pub fn query_buffer_probe(input: TextValue, expected: BoolValue) -> BoolValue {
 if let TextValue::Value(text)=input { if let BoolValue::Value(wanted)=expected {
  let source=XmlSource { characters: text.as_str().chars().collect() };
  return BoolValue::Value(xml_query_stream_valid(&source)==wanted);
 };}; BoolValue::Unknown
}
`
    const inputs = [
      { name: 'input', rustName: 'input', type: 'pg_catalog.text', rustType: 'TextValue' },
      { name: 'expected', rustName: 'expected', type: 'pg_catalog.bool', rustType: 'BoolValue' },
    ]
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const dtd = (name: string) => `<!DOCTYPE r [<!ATTLIST ${name} a NMTOKENS #IMPLIED>]>`
    const shapes: [string, (spaces: string) => string, boolean?][] = [
      ['root-empty', (s) => dtd('r') + `<r a="${s}"/>`],
      ['root-content', (s) => dtd('r') + `<r a="${s}">x</r>`],
      ['root-trailing-space', (s) => dtd('r') + `<r a="${s}"/>` + ' '.repeat(4000)],
      ['root-comment', (s) => dtd('r') + `<r a="${s}"><!--${'z'.repeat(200)}--></r>`],
      ['prefixed-comment', (s) => '<!--' + 'z'.repeat(200) + '-->' + dtd('r') + `<r a="${s}"/>`],
      ['child-empty', (s) => dtd('c') + `<r><c a="${s}"/></r>`],
      ['child-prefix', (s) => dtd('c') + `<r>${'x'.repeat(200)}<c a="${s}"/></r>`],
      ['child-unicode-prefix', (s) => dtd('c') + `<r>${'é'.repeat(200)}<c a="${s}"/></r>`],
      ['prolog-space', (s) => s + '<r/>'],
      ['epilog-space', (s) => '<r/>' + s],
      ['root-tag-space', (s) => '<r' + s + '/>'],
      ['closing-tag-space', (s) => '<r></r' + s + '>'],
      ['instruction-space', (s) => '<?p' + s + '?><r/>'],
      ['subset-leading-space', (s) => '<!DOCTYPE r [' + s + ']><r/>'],
      ['subset-trailing-space', (s) => '<!DOCTYPE r [<!ELEMENT r EMPTY>' + s + ']><r/>'],
      ['default-value', (s) => '<!DOCTYPE r [<!ATTLIST r a CDATA "' + s + '">]><r/>', true],
      ['entity-value', (s) => '<!DOCTYPE r [<!ENTITY e "' + s + '">]><r/>', true],
      ['parameter-value', (s) => '<!DOCTYPE r [<!ENTITY % e "' + s + '">%e;]><r/>', true],
      ['complex-comment', (s) => '<!--é' + s + '--><r/>', true],
      ['complex-comment-prefix', (s) => '<!--' + 'z'.repeat(20) + 'é' + s + '--><r/>', true],
      ['cdata', (s) => '<r><![CDATA[' + s + ']]></r>', true],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [name, build, tokenBounded] of shapes)
      for (const delta of [
        -200, -120, -80, -64, -60, -56, -55, -54, -53, -52, -51, -50, -40, 0, 100, 300,
      ]) {
        if (tokenBounded && delta > -40) continue
        const native = build(' '.repeat(10000000 + delta))
        let expected = true,
          detail = ''
        try {
          await pg.query("SELECT xpath_exists('true()',pg_temp.query_buffer_xml($1::cstring))", [
            native,
          ])
        } catch (error) {
          expect((error as { code: string }).code).toBe('2200M')
          detail = (error as { detail?: string }).detail ?? ''
          expect(detail).toContain('Buffer size limit exceeded')
          expected = false
        }
        const compact = build(' '.repeat(8000 + delta))
        reference.push({
          name,
          delta,
          nativeBytes: Buffer.byteLength(native),
          compactBytes: Buffer.byteLength(compact),
          removedBytes: 9992000,
          expected,
          detail: detail.slice(0, 120),
        })
        fixtures.push({
          name: 'matches',
          row: { input: known(compact), expected: known(expected) },
          expected: { kind: 'True' },
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/buffer-boundary-reference.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          nativeLimit: 10000000,
          testLimit: 8000,
          chunkBytes: 4000,
          removedChunks: 2498,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xmlquerybuffer', group, ['matches'], fixtures)
    console.info('XML query input-window parity', {
      fixtures: fixtures.length,
      shapes: shapes.length,
      nativeLimit: 10000000,
      testLimit: 8000,
      removedChunks: 2498,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
