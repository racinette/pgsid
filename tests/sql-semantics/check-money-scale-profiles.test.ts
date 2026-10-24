import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

it('checks every effective money scale against native numeric formulas without assuming additional installed locales', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-money-scale-profiles-')),
    packet = 'artifacts/goal-checks/money-context-active'
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const definitions = [
    {
      name: 'decimal',
      sqlType: 'numeric',
      rustType: 'NumericValue',
      call: 'sql__pg_catalog__money__z8lp',
      wire: 'sql__pg_catalog__cash_send__p2u1',
      formula: 'cash_send(($1::numeric*power(10::numeric,$2::int)/100.00)::money)',
      samples: [
        null,
        '0',
        '0.000000',
        '1.5',
        '-1.5',
        '0.00000000005',
        '-0.00000000005',
        '9223372036854775807.4',
        '-9223372036854775808.4',
        '9223372036854775807.5',
        '-9223372036854775808.5',
        'NaN',
        'Infinity',
        '-Infinity',
      ],
    },
    {
      name: 'wide',
      sqlType: 'bigint',
      rustType: 'Int8Value',
      call: 'sql__pg_catalog__money__u7ss',
      wire: 'sql__pg_catalog__cash_send__p2u1',
      formula: 'cash_send(($1::numeric*power(10::numeric,$2::int)/100.00)::money)',
      samples: [null, '0', '1', '-1', '9223372036854775807', '-9223372036854775808'],
    },
    {
      name: 'integer',
      sqlType: 'integer',
      rustType: 'Int4Value',
      call: 'sql__pg_catalog__money__2ie3',
      wire: 'sql__pg_catalog__cash_send__p2u1',
      formula: 'cash_send(($1::numeric*power(10::numeric,$2::int)/100.00)::money)',
      samples: [null, '0', '1', '-1', '2147483647', '-2147483648'],
    },
    {
      name: 'money',
      sqlType: 'money',
      rustType: 'MoneyValue',
      call: 'sql__pg_catalog__numeric__khij',
      wire: 'sql__pg_catalog__numeric_send__3mnb',
      formula:
        'numeric_send(round(($1::money)::numeric*100/round(power(10::numeric,$2::int),$2::int),$2::int))',
      samples: [
        null,
        '0',
        '0.01',
        '-0.01',
        '1.25',
        '92233720368547758.07',
        '-92233720368547758.08',
      ],
    },
  ]
  try {
    await pg.exec("SET lc_monetary='C'")
    const names = definitions.map((d) => d.name),
      checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      sources: string[] = []
    for (const d of definitions) {
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'money_profile',
        constraint: d.name,
      })
      sources.push(
        `pub fn ${entryName}(input:${d.rustType},digits:Int4Value,expected:ByteaValue)->CheckOutcome { let result=money_numeric_profile_${d.name}(input,digits,expected);check_from_bool(result) }`,
      )
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          {
            name: 'input',
            rustName: 'input',
            type:
              d.sqlType === 'numeric'
                ? 'pg_catalog."numeric"'
                : d.sqlType === 'bigint'
                  ? 'pg_catalog.int8'
                  : d.sqlType === 'integer'
                    ? 'pg_catalog.int4'
                    : 'pg_catalog.money',
            rustType: d.rustType,
          },
          { name: 'digits', rustName: 'digits', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          {
            name: 'expected',
            rustName: 'expected',
            type: 'pg_catalog.bytea',
            rustType: 'ByteaValue',
          },
        ],
      })
    }
    const evaluatorSource = sources.join('\n'),
      group = {
        checks,
        evaluatorSource,
        requiresRegex: false,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: definitions.map((d) => d.call),
        }),
      }
    group.source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/money_numeric.rs'))!.source += definitions
      .map(
        (d) =>
          `\npub fn money_numeric_profile_${d.name}(input:${d.rustType},digits:Int4Value,expected:ByteaValue)->BoolValue { if let Int4Value::Value(scale)=digits {let amount=${d.call}(input,scale);let wire=${d.wire}(amount);return sql__pg_catalog__byteaeq__z0yh(wire,expected);}; BoolValue::Unknown }`,
      )
      .join('\n')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (let digits = 0; digits <= 10; digits++)
      for (const d of definitions)
        for (const sample of d.samples) {
          let bytes: string | null = null,
            error: string | undefined
          try {
            bytes = (
              await pg.query<{ value: string | null }>(`SELECT encode(${d.formula},'hex')value`, [
                sample,
                digits,
              ])
            ).rows[0]!.value
          } catch (e) {
            error = (e as { code: string }).code
          }
          let input = known(null)
          if (sample !== null) {
            if (d.sqlType === 'money') {
              const wire = (
                await pg.query<{ value: string }>(
                  "SELECT encode(cash_send($1::money),'hex')value",
                  [sample],
                )
              ).rows[0]!.value
              input = known(BigInt.asIntN(64, BigInt('0x' + wire)))
            } else if (d.sqlType === 'numeric')
              input = known(
                (await pg.query<{ value: string }>('SELECT ($1::numeric)::text value', [sample]))
                  .rows[0]!.value,
              )
            else input = known(d.sqlType === 'bigint' ? BigInt(sample) : Number(sample))
          }
          const expected: Outcome = error
            ? { kind: 'Error', value: { state: parseInt(error, 36) } }
            : bytes === null
              ? { kind: 'Null' }
              : { kind: 'True' }
          fixtures.push({
            name: d.name,
            row: { input, digits: known(digits), expected: known(bytes) },
            expected,
          })
          reference.push({ name: d.name, sample, digits, bytes, error })
        }
    expect(fixtures).toHaveLength(363)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/scale-reference.json',
      JSON.stringify(
        {
          locale: 'C',
          oracleFractionDigits: 2,
          profileEvidence:
            'Native PostgreSQL numeric/integer formulas for effective fractional digits 0 through 10; additional locales are not assumed installed',
          fixtures: fixtures.length,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'money_scale_profiles', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
