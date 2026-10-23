import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches PostgreSQL XML identifier mapping at every legacy character-range boundary in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-names-'))
  try {
    const sourceText = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/xml_legacy_names.rs',
        'utf8',
      ),
      codes = new Set<number>()
    for (const table of sourceText.matchAll(
      /const XML_LEGACY_[A-Z_]+: &\[i32\] = &\[([^\]]+)\]/gs,
    )) {
      const values = table[1]!.match(/\d+/g)!.map(Number)
      for (let i = 0; i < values.length; i += 2) {
        const a = values[i]!,
          b = values[i + 1]!
        for (const n of [a - 1, a, b, b + 1])
          if (n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) codes.add(n)
      }
    }
    expect(codes.size).toBeGreaterThan(500)
    const names = new Set([
      'xmlname',
      'a b',
      'a:b',
      ':a',
      '_x0020_',
      '_X0020_',
      '😊',
      'a😊',
      '1',
      '-',
      'a\u0001',
    ])
    for (const code of codes) {
      const c = String.fromCodePoint(code)
      names.add(c)
      names.add('a' + c)
    }
    const evaluatorSource = `pub fn evaluate_check(input: TextValue, expected: TextValue) -> CheckOutcome {
    let result = xml_constructor_name_probe(input,expected); check_from_bool(result)
  }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_construct.rs'))!.source += `
pub fn xml_constructor_name_probe(input: TextValue, expected: TextValue) -> BoolValue {
 if let TextValue::Value(name) = input {
  let content = text_null();
  let value = xml_make_processing_instruction(name.as_str(),content,false,false);
  let actual = xml_to_text(value);
  if let TextValue::Value(found) = actual {
   if let TextValue::Value(wanted) = expected { return BoolValue::Value(found.as_str() == wanted.as_str()); };
  };
 }; BoolValue::Unknown
}
`
    const inputs = ['input', 'expected'].map((name) => ({
      name,
      rustName: name,
      rustType: 'TextValue',
      type: 'pg_catalog.text',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs }],
      source,
      evaluatorSource,
      requiresRegex: false,
    }
    const known = (value: string): Input => ({ kind: 'Value', value }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const name of names) {
      const literal = '"' + name.replaceAll('"', '""') + '"'
      const expected = (
        await pg.query<{ result: string }>(`SELECT xmlpi(NAME ${literal})::text result`)
      ).rows[0]!.result
      fixtures.push({
        name: 'name',
        row: { input: known(name), expected: known(expected) },
        expected: { kind: 'True' },
      })
    }
    await runCheckParity(root, 'xmlnames', group, ['name'], fixtures)
    console.info('XML name boundary parity', { boundaries: codes.size, fixtures: fixtures.length })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
