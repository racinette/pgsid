import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
import { valueRepresentation } from '../../scripts/check-measurements/probes.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { expressions, invalid, deferred, validationCases } from './jsonpath-grammar-cases.js'

it('validates UTF8 JSONPath literals in order with exact numbers and explicit regex collation', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-literals-'))
  const value = (input: string): Input => ({ kind: 'Value', value: input })
  const error = (state: string): Outcome & Input => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    const settings = await pg.query<{ encoding: string; collation: string }>(
      "SELECT current_setting('server_encoding') encoding, datcollate collation FROM pg_database WHERE datname=current_database()",
    )
    expect(settings.rows[0]!.encoding).toBe('UTF8')
    expect(settings.rows[0]!.collation).toBe('C')
    const inputs = [
      { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
    ]
    const names = ['utf8_c', 'utf8_unknown_c', 'numeric']
    const entries = names.map((constraint) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'jsonpath_literals',
        constraint,
      }),
    )
    const evaluatorSource = `
pub fn ${entries[0]}(input: TextValue) -> CheckOutcome {
 let result = jsonpath_validate_utf8(input, true); check_from_bool(result)
}
pub fn ${entries[1]}(input: TextValue) -> CheckOutcome {
 let result = jsonpath_validate_utf8(input, false); check_from_bool(result)
}
pub fn ${entries[2]}(input: TextValue, expected: TextValue) -> CheckOutcome {
 let result = jsonpath_numeric_probe(input, expected); check_from_bool(result)
}
`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [],
      requiresRegex: true,
    })
    const operation = source.modules.find((module) => module.name === 'pg_catalog')!
    const implementation = operation.files.find((file) => file.path.endsWith('/jsonpath_input.rs'))!
    implementation.source += `
pub fn jsonpath_numeric_probe(input: TextValue, expected: TextValue) -> BoolValue {
 if let TextValue::Value(value) = input {
  let normalized = jsonpath_numeric_literal(value.as_str());
  if let TextValue::Error(error) = normalized { return BoolValue::Error(error); };
  if let TextValue::Value(actual) = normalized {
   if let TextValue::Value(wanted) = expected { return BoolValue::Value(actual == wanted); };
  };
 };
 BoolValue::Unknown
}
`
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: entries.map((entryName, index) => ({
        kind: 'supported',
        entryName,
        inputs:
          index === 2
            ? [
                ...inputs,
                {
                  name: 'expected',
                  type: 'pg_catalog.text',
                  rustName: 'expected',
                  rustType: 'TextValue',
                },
              ]
            : inputs,
      })),
      evaluatorSource,
      source,
      requiresRegex: true,
    }
    expect(valueRepresentation('pg_catalog.jsonpath').represented).toBe(true)
    const scalar = assembleCheckRust({ source: '', callables: [] })
    expect(scalar.modules.find((module) => module.name === 'regex_engine')).toBeUndefined()
    expect(
      scalar.modules
        .flatMap((module) => module.files)
        .some((file) => file.path.endsWith('/jsonpath_input.rs')),
    ).toBe(false)
    expect(
      scalar.modules
        .find((module) => module.name === 'checkruntime')!
        .files.some((file) => file.path.endsWith('/jsonpath.rs')),
    ).toBe(true)
    expect(
      scalar.modules
        .find((module) => module.name === 'pg_catalog')!
        .files.filter((file) => file.path.includes('/jsonpath_'))
        .map((file) => file.path.split('/').at(-1)),
    ).toEqual([
      'jsonpath_calendar.rs',
      'jsonpath_names.rs',
      'jsonpath_output.rs',
      'jsonpath_parse.rs',
      'jsonpath_scan.rs',
      'jsonpath_tables.generated.rs',
      'jsonpath_template.rs',
      'jsonpath_temporal.rs',
      'jsonpath_value.rs',
    ])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle: unknown[] = []
    const extra = [
      '1e131071',
      '1e131072',
      '1e-16383',
      '1e-16384',
      '0e1073741823',
      '0e1073741824',
      '1e131072 ")"',
      '1e131072 + )',
      String.raw`1e131072 "\u0000"`,
      String.raw`$ like_regex "[" "\u0000"`,
      '$ like_regex "[" && 1e131072 == 1',
      '1e131072 + $ like_regex "["',
      '1e131072 + $ like_regex "[" flag "z"',
      '$.decimal(1e131072,1,2)',
      '$.decimal(99999999999999999999,1,2)',
      ...['', 'i', 's', 'm', 'ism', 'q', 'qismx'].flatMap((flag) => [
        `$ like_regex "a.*b" flag "${flag}"`,
        `$ like_regex "[a-z]+" flag "${flag}"`,
        `$ like_regex "[" flag "${flag}"`,
      ]),
      ...[
        '(',
        ')',
        '[z-a]',
        '[[:bogus:]]',
        '(?=a)',
        '(?:a)',
        '(a)\\\\1',
        'a{2,1}',
        'a{256}',
        '\\\\d+',
        'é',
        '[é-ÿ]',
      ].map((pattern) => `$ like_regex "${pattern}"`),
    ]
    for (const input of [
      ...new Set([
        ...expressions,
        ...invalid,
        ...deferred.map((item) => item.input),
        ...validationCases.map((item) => item.input),
        ...extra,
      ]),
    ]) {
      const expected = await pg
        .query<{ accepted: boolean }>('SELECT octet_length($1::jsonpath::text)>=0 accepted', [
          input,
        ])
        .then(
          (result) => ({ kind: result.rows[0]!.accepted ? 'True' : 'False' }) as Outcome,
          (failure: { code: string }) => error(failure.code),
        )
      fixtures.push({ name: 'utf8_c', row: { input: value(input) }, expected })
      oracle.push({ input, expected })
    }
    const normalized = [
      '0',
      '123',
      '1_234',
      '1.',
      '1.e2',
      '.01',
      '0.1_2',
      '1.2300',
      '1e+2',
      '1.2E-2',
      '1e1_0',
      '0.000e2',
      '0e1073741823',
      '0x000',
      '0xFF',
      '0Xf_f',
      '0o17',
      '0O7_7',
      '0b101',
      '0B1_0',
      '0x8000000000000000',
      '0xffffffffffffffff',
      '0x10000000000000000',
      '0x' + '0'.repeat(10000) + 'f',
      '0x' + 'f'.repeat(512),
      '0o' + '7'.repeat(512),
      '0b' + '1'.repeat(1024),
    ]
    for (let index = 0; index < 36; index++) {
      const integer = (1n << BigInt(index + 50)) + BigInt(index * 7919 + 1)
      for (const [radix, prefix] of [
        [2, '0b'],
        [8, '0o'],
        [16, '0x'],
      ] as const) {
        const digits = integer.toString(radix)
        normalized.push(prefix + digits, prefix + Array.from(digits).join('_'))
      }
    }
    for (const input of normalized) {
      const result = await pg.query<{ value: string }>('SELECT $1::jsonpath::text value', [input])
      const expected = result.rows[0]!.value
      fixtures.push({
        name: 'numeric',
        row: { input: value(input), expected: value(expected) },
        expected: { kind: 'True' },
      })
      oracle.push({ numeric: input, normalized: expected })
    }
    for (const name of ['utf8_c', 'utf8_unknown_c']) {
      for (const [input, expected] of [
        [{ kind: 'Null' }, { kind: 'Null' }],
        [{ kind: 'Unknown' }, { kind: 'Unknown' }],
        [error('22012'), error('22012')],
      ] as [Input, Outcome][])
        fixtures.push({ name, row: { input }, expected })
    }
    const limited = '$ like_regex "' + '(?='.repeat(65) + 'a' + ')'.repeat(65) + '"'
    const admitted = await pg.query<{ accepted: boolean }>(
      'SELECT octet_length($1::jsonpath::text)>0 accepted',
      [limited],
    )
    expect(admitted.rows[0]!.accepted).toBe(true)
    fixtures.push({ name: 'utf8_c', row: { input: value(limited) }, expected: { kind: 'Unknown' } })
    oracle.push({
      input: limited,
      postgres: { kind: 'True' },
      local: { kind: 'Unknown' },
      requirement: 'Existing regex compiler assertion-depth limit',
    })
    for (const [input, expected] of [
      ['$', { kind: 'True' }],
      ['1', { kind: 'True' }],
      ['$ like_regex "a"', { kind: 'Unknown' }],
      ['$ like_regex "["', { kind: 'Unknown' }],
      ['$ like_regex "[" flag "q"', { kind: 'True' }],
      ['$ like_regex "[" flag "qsmxi"', { kind: 'True' }],
      ['$ like_regex "a" flag "x"', error('0A000')],
      ['1e131072 + $ like_regex "["', error('22003')],
      ['$ like_regex "[" && 1e131072==1', { kind: 'Unknown' }],
      ['$ like_regex "[" flag "z"', error('42601')],
      ['? "$"', error('42601')],
    ] as [string, Outcome][])
      fixtures.push({ name: 'utf8_unknown_c', row: { input: value(input) }, expected })
    await runCheckParity(directory, 'jsonpathliteralparity', group, names, fixtures)
    await mkdir('artifacts/jsonpath-literals', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-literals/oracle.json',
      JSON.stringify(
        {
          scope:
            'Private UTF8/C literal validation foundation. No SQL JSONPath binder, row adapters or query execution admission.',
          settings: settings.rows[0],
          fixtures: fixtures.length,
          referenceCases: oracle.length,
          normalizationCases: normalized.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          oracle,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
