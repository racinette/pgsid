import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const targets = [
  { name: 'boolean', type: 'bool', values: [null, false, true] },
  {
    name: 'real',
    type: 'float4',
    values: [null, '0', '-0', 'NaN', 'Infinity', '-Infinity', '1.23456789', '1.5'],
  },
  {
    name: 'double',
    type: 'float8',
    values: [null, '0', '-0', 'NaN', 'Infinity', '-Infinity', '1.2345678901234567', '1.5'],
  },
  {
    name: 'uuid',
    type: 'uuid',
    values: [null, '00000000-0000-0000-0000-000000000000', '550E8400-E29B-41D4-A716-446655440000'],
  },
  { name: 'oid', type: 'oid', values: [null, '0', '42', '4294967295'] },
  { name: 'small', type: 'int2', values: [null, -32768, -1, 0, 32767] },
  { name: 'integer', type: 'int4', values: [null, -2147483648, -1, 0, 2147483647] },
  {
    name: 'large',
    type: 'int8',
    values: [null, '-9223372036854775808', '0', '9007199254740993', '9223372036854775807'],
  },
  {
    name: 'number',
    type: 'numeric',
    values: [
      null,
      '0',
      '-0.000',
      '1.2300',
      '-9007199254740993.123456789',
      '1e100',
      '1e-100',
      'NaN',
      'Infinity',
      '-Infinity',
    ],
  },
  {
    name: 'text',
    type: 'text',
    values: [
      null,
      '',
      'true',
      'null',
      '1.2300',
      '[1,2]',
      '{"a":1}',
      'a  ',
      '雪😊',
      '\b\f\n\r\t\u0001"\\',
    ],
  },
  { name: 'varchar', type: 'varchar', values: [null, '', 'abc  ', '雪😊'] },
  { name: 'padded', type: 'char(5)', values: [null, '', 'abc', '雪😊', '12345'] },
  {
    name: 'json',
    type: 'json',
    values: [
      null,
      'null',
      'false',
      '0.000',
      '1e2',
      '"雪😊"',
      '{"a":1,"a":2}',
      '{"aa":1,"é":2}',
      '[true,null,{"n":1.2300}]',
      '"\\u0000"',
      '"\\u96ea"',
      '1e131072',
    ],
  },
  {
    name: 'jsonb',
    type: 'jsonb',
    values: [
      null,
      'null',
      'false',
      '0.000',
      '1e2',
      '"雪😊"',
      '{"aa":1,"é":2}',
      '[true,null,{"n":1.2300}]',
    ],
  },
] as const

it('matches typed scalar to_jsonb conversion, polymorphic binding and state propagation in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-conversion-'))
  const known = (value: string | number | bigint | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN conversion_number AS numeric; CREATE DOMAIN conversion_number_nested AS conversion_number; CREATE DOMAIN conversion_text AS text',
    )
    const expressions: Record<string, string> = {}
    for (const target of targets) {
      expressions['convert_' + target.name] =
        `to_jsonb(v_${target.name}) IS NOT DISTINCT FROM expected`
      expressions['qualified_' + target.name] =
        `pg_catalog.to_jsonb(v_${target.name}) IS NOT DISTINCT FROM expected`
      expressions['guard_' + target.name] =
        `CASE WHEN bypass THEN true ELSE to_jsonb(v_${target.name}) IS NOT DISTINCT FROM expected END`
      expressions['null_' + target.name] =
        `(to_jsonb(v_${target.name}) IS NULL) IS NOT DISTINCT FROM expected_null`
    }
    expressions.domain = 'to_jsonb(v_domain) IS NOT DISTINCT FROM expected'
    expressions.domain_text = 'to_jsonb(v_domain_text) IS NOT DISTINCT FROM expected'
    expressions.selected =
      'to_jsonb(CASE WHEN bypass THEN v_number ELSE v_domain END) IS NOT DISTINCT FROM expected'
    expressions.coalesced =
      'COALESCE(to_jsonb(v_number),to_jsonb(v_domain)) IS NOT DISTINCT FROM expected'
    expressions.extracted = "to_jsonb(v_json)->'a' IS NOT DISTINCT FROM expected"
    expressions.nested = 'to_jsonb(to_jsonb(v_text)) IS NOT DISTINCT FROM expected'
    expressions.counted = `to_jsonb(regexp_count(v_text COLLATE "C",'a')) IS NOT DISTINCT FROM expected`
    expressions.literal_integer = "to_jsonb(123)='123'::jsonb"
    expressions.literal_bigint = "to_jsonb(9007199254740993)='9007199254740993'::jsonb"
    expressions.literal_large_numeric = "to_jsonb(9223372036854775808)='9223372036854775808'::jsonb"
    expressions.literal_numeric = "to_jsonb(1.2300)='1.2300'::jsonb"
    expressions.literal_text = "to_jsonb('123'::text)='\"123\"'::jsonb"
    expressions.literal_null = 'to_jsonb(NULL::int4) IS NULL'
    expressions.literal_nan = `to_jsonb('NaN'::real)='"NaN"'::jsonb`
    expressions.literal_infinity = `to_jsonb('Infinity'::float8)='"Infinity"'::jsonb`
    expressions.literal_zero = `to_jsonb('-0'::float8)='0'::jsonb`
    await pg.exec(
      `CREATE TABLE jsonb_conversion_inputs(${targets.map((t) => `v_${t.name} ${t.type}`).join(',')},v_domain conversion_number_nested,v_domain_text conversion_text,expected jsonb,expected_null bool,bypass bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const floatRendering: unknown[] = []
    for (const setting of [-3, 0, 1, 3]) {
      await pg.exec(`SET extra_float_digits=${setting}`)
      floatRendering.push(
        (
          await pg.query(
            `SELECT to_jsonb(1.23456789::real)::text real,to_jsonb(1.2345678901234567::float8)::text double`,
          )
        ).rows[0],
      )
    }
    expect(new Set(floatRendering.map((row) => JSON.stringify(row))).size).toBeGreaterThan(1)
    await pg.exec('RESET extra_float_digits')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_conversion_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    for (const value of ["'ambiguous'", 'NULL']) {
      await expect(pg.query(`SELECT to_jsonb(${value})`)).rejects.toMatchObject({ code: '42804' })
      const untyped = lowerTableCheck(
        table,
        { name: 'untyped', type: 'check', definition: `CHECK(to_jsonb(${value}) IS NULL)` },
        [],
        catalog.domains,
      )!
      expect(hasUncertain(portableCheckAtoms(untyped.expression))).toBe(true)
    }
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const [i, p] of plans.entries())
      expect(hasUncertain(p.expression), constraints[i]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name + ('reason' in c ? ':' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({
          name: name + suffix,
          row: {
            ...Object.fromEntries(targets.map((t) => ['v_' + t.name, known(null)])),
            v_domain: known(null),
            v_domain_text: known(null),
            expected: known(null),
            expected_null: known(false),
            bypass: known(false),
            ...row,
          },
          expected,
        })
    }
    for (const target of targets)
      for (const value of target.values) {
        let expected: string | null = null,
          state: string | undefined
        const input = (
          await pg.query<{ input: string | null }>(
            target.name === 'padded'
              ? `SELECT pg_catalog.bpcharout($1::${target.type})::text input`
              : `SELECT $1::${target.type}::text input`,
            [value],
          )
        ).rows[0]!.input
        try {
          expected = (
            await pg.query<{ output: string | null }>(
              `SELECT to_jsonb($1::${target.type})::text output`,
              [value],
            )
          ).rows[0]!.output
        } catch (e) {
          state = (e as { code: string }).code
        }
        let payload: string | number | bigint | boolean | null =
          target.name === 'large'
            ? input === null
              ? null
              : BigInt(input)
            : ['boolean', 'small', 'integer'].includes(target.name)
              ? value
              : input
        if (target.name === 'real' || target.name === 'double') {
          const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${target.name === 'real' ? 'float4send' : 'float8send'}($1::${target.type}),'hex') wire`,
              [value],
            )
          ).rows[0]!.wire
          payload =
            wire === null
              ? null
              : target.name === 'real'
                ? Buffer.from(wire, 'hex').readInt32BE()
                : Buffer.from(wire, 'hex').readBigInt64BE()
        }
        if (target.name === 'oid') payload = input === null ? null : BigInt(input)
        const row: Row = {
          ['v_' + target.name]: known(payload),
          expected: known(expected),
          expected_null: known(input === null),
          bypass: known(false),
        }
        const outcome: Outcome =
          (target.name === 'json' && value === '"\\u96ea"') ||
          ((target.name === 'real' || target.name === 'double') &&
            value !== null &&
            !['0', '-0', 'NaN', 'Infinity', '-Infinity'].includes(String(value)))
            ? { kind: 'Unknown' }
            : state
              ? error(state)
              : { kind: 'True' }
        for (const prefix of ['convert_', 'qualified_', 'guard_', 'null_'])
          add(prefix + target.name, row, outcome)
        add('guard_' + target.name, { ...row, bypass: known(true) }, { kind: 'True' })
        if (!state && outcome.kind === 'True')
          add(
            'convert_' + target.name,
            { ...row, expected: known('["different"]') },
            { kind: 'False' },
          )
        if (target.name === 'number') {
          for (const name of ['domain', 'selected', 'coalesced'])
            add(name, { ...row, v_domain: known(input) }, outcome)
        }
        if (target.name === 'text') {
          for (const name of ['domain_text', 'nested'])
            add(name, { ...row, v_domain_text: known(input) }, outcome)
        }
        oracle.push({ target: target.name, value, input, expected, state, outcome })
      }
    for (const target of targets) {
      for (const state of [{ kind: 'Unknown' } as const, error('22003')]) {
        for (const prefix of ['convert_', 'qualified_', 'guard_', 'null_'])
          add(
            prefix + target.name,
            {
              ['v_' + target.name]: state,
              expected: known('null'),
              expected_null: known(false),
              bypass: known(false),
            },
            state,
          )
        add(
          'guard_' + target.name,
          { ['v_' + target.name]: state, bypass: known(true) },
          { kind: 'True' },
        )
      }
    }
    add(
      'coalesced',
      { v_number: known(null), v_domain: known('1.2300'), expected: known('1.2300') },
      { kind: 'True' },
    )
    add(
      'coalesced',
      { v_number: known('2'), v_domain: error('22012'), expected: known('2') },
      { kind: 'True' },
    )
    add(
      'selected',
      { bypass: known(true), v_number: known('2'), v_domain: error('22012'), expected: known('2') },
      { kind: 'True' },
    )
    add('counted', { v_text: known('aba'), expected: known('2') }, { kind: 'True' })
    add('counted', { v_text: known(null), expected: known(null) }, { kind: 'True' })
    add('counted', { v_text: error('22003'), expected: known('2') }, error('22003'))
    add('extracted', { v_json: known('{"a":1,"a":2}'), expected: known('2') }, { kind: 'True' })
    add(
      'nested',
      { v_text: known('"\\u96ea"'), expected: known('"\\\"\\\\u96ea\\\""') },
      { kind: 'True' },
    )
    for (const name of [
      'literal_integer',
      'literal_bigint',
      'literal_large_numeric',
      'literal_numeric',
      'literal_text',
      'literal_null',
      'literal_nan',
      'literal_infinity',
      'literal_zero',
    ])
      add(name, {}, { kind: 'True' })
    await mkdir('artifacts/jsonb-conversion', { recursive: true })
    await writeFile(
      'artifacts/jsonb-conversion/oracle.json',
      JSON.stringify(
        { cases: oracle, floatRendering, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_conversion',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
