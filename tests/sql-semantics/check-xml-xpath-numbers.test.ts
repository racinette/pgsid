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

it('matches XPath numeric input and internal string output with explicit native power facts in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-numbers-'))
  const value = (value: string | number | bigint): Input => ({ kind: 'Value', value })
  try {
    await pg.exec('SET extra_float_digits=3')
    const powers = (
      await pg.query<{ n: number; bits: string }>(
        `SELECT n,encode(float8send((xpath('number('||quote_literal('1e'||n)||')','<r/>'::xml))[1]::text::float8),'hex')bits FROM generate_series(-323,308)n ORDER BY n`,
      )
    ).rows
    expect(powers).toHaveLength(632)
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_numbers',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: TextValue, bits: Int8Value, mode: Int4Value) -> CheckOutcome {
   let result = xpath_number_probe(input,expected,bits,mode); check_from_bool(result)
  }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_number.rs'))!.source += `
const XPATH_TEST_POWER_BITS: &[i64] = &[${powers.map((p) => BigInt('0x' + p.bits).toString() + 'i64').join(',')}];
fn xpath_test_powers() -> XPathPowers {
 let mut result = xpath_powers_empty(); let mut index: usize = 0;
 while index < XPATH_TEST_POWER_BITS.len() { result = xpath_powers_push(result,XPATH_TEST_POWER_BITS[index]); index += 1; }
 result
}
pub fn xpath_number_probe(input: TextValue, expected: TextValue, bits: Int8Value, mode: Int4Value) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(raw) = input {
  if let Int8Value::Value(expected_bits) = bits {
   if let Int4Value::Value(operation) = mode {
    if operation == 2 {
     let output = xpath_number_string(expected_bits); let actual = TextValue::Value(output);
     return sql__pg_catalog__texteq__aet8(actual,expected);
    };
    let mut powers = xpath_powers_empty(); if operation == 1 { powers = xpath_test_powers(); };
    let result = xpath_number_text(raw.as_str(),&powers);
    if result.state != 0 { return BoolValue::Unknown; };
    let got = f64::from_bits(result.number as u64); let wanted = f64::from_bits(expected_bits as u64);
    if got != got && wanted != wanted { return BoolValue::Value(true); };
    return BoolValue::Value(result.number == expected_bits);
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = [
      { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
      { name: 'expected', type: 'pg_catalog.text', rustName: 'expected', rustType: 'TextValue' },
      { name: 'bits', type: 'pg_catalog.int8', rustName: 'bits', rustType: 'Int8Value' },
      { name: 'mode', type: 'pg_catalog.int4', rustName: 'mode', rustType: 'Int4Value' },
    ]
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const portable = new Set([
      '',
      '0',
      '-0',
      '1',
      '-1',
      '2147483647',
      '2147483648',
      '-2147483648',
      '0.1',
      '1.2345678901234567',
      '.5',
      '-.5',
      '1.',
      '1e',
      '1e+',
      '1e-',
      '1e0',
      '1e22',
      '1e309',
      '1e-324',
      '0e-23',
      '-0e-23',
      '0e9999',
      '-0e9999',
      'NaN',
      'Infinity',
      '+1',
      '1junk',
      '0x10',
    ])
    const unresolved = new Set(['1e-1', '1e23', '1e-23', '0.000000000000000000000001'])
    const cases = new Map<string, boolean>()
    const add = (input: string, format = false) =>
      cases.set(input, format || cases.get(input) === true)
    for (const input of [
      ...portable,
      ...unresolved,
      '-Infinity',
      '- 1',
      '1 e2',
      '1\t2',
      '1\u00a0',
      '1\u0085',
      '١',
      '😊',
      '.',
      '-.',
      '--1',
      '1e--2',
      '1_0',
      '0.12345678901234567890123456789',
      '1000000000000000000000001',
      '9007199254740993',
      '9.999999999999998',
      '10.000000000000002',
      '0.9999999999999999',
      '1.0000000000000002',
      '0.09999999999999999',
      '0.10000000000000002',
      '0.009999999999999998',
      '0.010000000000000002',
      '999999999.9999999',
      '1000000000.0000001',
      '1000000000.5',
      '2147483647.1',
      '-2147483648.1',
      '0.000009999999999999999',
      '0.000010000000000000002',
      '2.2250738585072014e-308',
      '4.9406564584124654e-324',
      '0.5e-323',
      '-0.5e-323',
      '0.75e-323',
      '1.25e-323',
      '0.' + '0'.repeat(310) + '1e300',
      '0.' + '0'.repeat(310) + '1e309',
      '9'.repeat(400),
      '1.7976931348623157e308',
      '-1.7976931348623157e308',
      '0e309',
      '1e-999999999999',
      '1e999999999999',
    ])
      add(input, true)
    const outputExponents = new Set([
      -323, -308, -100, -8, -7, -6, -5, -4, -1, 0, 1, 8, 9, 10, 22, 23, 100, 308,
    ])
    for (let n = -324; n <= 309; n++) add('1e' + n, outputExponents.has(n))
    for (let zeros = 0; zeros <= 35; zeros++)
      add('0.' + '0'.repeat(zeros) + '123456789012345678901234567890123456789', zeros % 5 === 0)
    let seed = 84723
    for (let index = 0; index < 240; index++) {
      const next = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed
      }
      const length = 1 + (next() % 60)
      let digits = ''
      for (let digit = 0; digit < length; digit++) digits += String(next() % 10)
      const split = next() % (length + 1),
        exponent = (next() % 681) - 340
      add(
        (next() % 2 ? '-' : '') +
          digits.slice(0, split) +
          '.' +
          digits.slice(split) +
          'e' +
          exponent,
        index % 31 === 0,
      )
    }
    const list = [...cases.keys()],
      expressions = list.map(
        (input) => `number(${input.includes("'") ? '"' + input + '"' : "'" + input + "'"})`,
      )
    const native = (
      await pg.query<{ id: number; bits: string; output: string }>(
        `SELECT id::int,encode(float8send((xpath(expression,'<r/>'::xml))[1]::text::float8),'hex')bits,
   (xpath('string('||expression||')','<r/>'::xml))[1]::text output FROM unnest($1::text[])WITH ORDINALITY q(expression,id) ORDER BY id`,
        [expressions],
      )
    ).rows
    expect(native).toHaveLength(list.length)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let formats = 0
    for (const [index, n] of native.entries()) {
      const input = list[index]!,
        bits = BigInt.asIntN(64, BigInt('0x' + n.bits))
      const row: Row = {
        input: value(input),
        expected: value(n.output),
        bits: value(bits),
        mode: value(1),
      }
      fixtures.push({ name: 'matches', row, expected: { kind: 'True' } })
      if (cases.get(input)) {
        fixtures.push({
          name: 'matches',
          row: { ...row, mode: value(2) },
          expected: { kind: 'True' },
        })
        formats++
      }
      if (portable.has(input))
        fixtures.push({
          name: 'matches',
          row: { ...row, mode: value(0) },
          expected: { kind: 'True' },
        })
      if (unresolved.has(input))
        fixtures.push({
          name: 'matches',
          row: { ...row, mode: value(0) },
          expected: { kind: 'Unknown' },
        })
      reference.push({
        input,
        bits: n.bits,
        output: n.output,
        format: cases.get(input),
        portable: portable.has(input),
        profileRequired: unresolved.has(input),
      })
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
    const packet = 'artifacts/goal-checks/xml-xpath-values-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/numbers-reference.json',
      JSON.stringify({ powers, reference, formats, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(root, 'xpathnumbers', group, ['matches'], fixtures)
    console.info('XPath number parity', {
      inputs: list.length,
      powers: powers.length,
      formats,
      portable: portable.size,
      profileRequired: unresolved.size,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
