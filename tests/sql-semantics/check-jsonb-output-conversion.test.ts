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

type Target = {
  name: string
  type: string
  send?: string
  values: readonly (string | null | { sql: string })[]
  castInput?: boolean
}
const targets: readonly Target[] = [
  { name: 'name', type: 'name', values: [null, '', 'plain', '雪😊', 'x'.repeat(80), 'a"\\\n'] },
  { name: 'cursor', type: 'refcursor', values: [null, '', 'cursor name', '雪😊', 'x'.repeat(80)] },
  {
    name: 'inet',
    type: 'inet',
    values: [
      null,
      '0.0.0.0',
      '192.0.2.129/24',
      '255.255.255.255',
      '::',
      '::1',
      '::ffff:192.0.2.1',
      '2001:db8:0:1::2/64',
    ],
  },
  {
    name: 'cidr',
    type: 'cidr',
    values: [
      null,
      '0/0',
      '10/8',
      '192.0.2.0/24',
      '192.0.2.1/32',
      '::/0',
      '2001:db8::/32',
      '::ffff:192.0.2.0/120',
    ],
  },
  {
    name: 'mac',
    type: 'macaddr',
    values: [null, '00:00:00:00:00:00', 'FF:EE:DD:CC:BB:AA', '08:00:2b:01:02:03'],
  },
  {
    name: 'mac8',
    type: 'macaddr8',
    values: [null, '00:00:00:00:00:00:00:00', 'FF:EE:DD:CC:BB:AA:99:88', '08:00:2b:01:02:03'],
  },
  { name: 'bit', type: 'bit(9)', values: [null, '000000000', '101010101', '111111111'] },
  { name: 'varbit', type: 'varbit', values: [null, '', '0', '1', '101010101'] },
  {
    name: 'date',
    type: 'date',
    send: 'date_send',
    values: [
      null,
      '-infinity',
      'infinity',
      '2000-01-01',
      '1999-12-31',
      '2024-02-29',
      '0001-01-01',
      '0001-12-31 BC',
      '0100-01-02 BC',
      '10000-01-01',
      '5874897-12-31',
      { sql: "DATE '2000-01-01'-2451545" },
    ],
  },
  {
    name: 'timestamp',
    type: 'timestamp',
    send: 'timestamp_send',
    values: [
      null,
      '-infinity',
      'infinity',
      '2000-01-01 00:00:00',
      '1999-12-31 23:59:59.999999',
      '2024-02-29 12:34:56.123456',
      '2024-01-01 00:00:00.000001',
      '2024-01-01 00:00:00.100000',
      '0001-01-01 00:00:00',
      '0001-12-31 23:59:59.9 BC',
      '10000-01-01 00:00:00',
      '294276-12-31 23:59:59.999999',
      { sql: "TIMESTAMP '2000-01-01'+INTERVAL '-211813488000000000 microseconds'" },
    ],
  },
  {
    name: 'timestamptz',
    type: 'timestamptz',
    send: 'timestamptz_send',
    values: [
      null,
      '-infinity',
      'infinity',
      '2000-01-01 00:00:00+00',
      '2024-02-29 12:34:56.123456+00',
    ],
  },
  {
    name: 'time',
    type: 'time',
    send: 'time_send',
    values: [null, '00:00:00', '24:00:00', '12:34:56.123456', '00:00:00.000001', '23:59:59.999999'],
  },
  {
    name: 'timetz',
    type: 'timetz',
    send: 'timetz_send',
    values: [
      null,
      '00:00:00+00',
      '24:00:00-00',
      '12:34:56.123456+05:30',
      '00:00:00.000001-04',
      '23:59:59.999999+05:30:45',
    ],
  },
  {
    name: 'xid',
    type: 'xid',
    send: 'xidsend',
    values: [null, '0', '1', '2147483648', '4294967295'],
  },
  {
    name: 'cid',
    type: 'cid',
    send: 'cidsend',
    values: [null, '0', '1', '2147483648', '4294967295'],
  },
  {
    name: 'xid8',
    type: 'xid8',
    send: 'xid8send',
    values: [null, '0', '9223372036854775808', '18446744073709551615'],
  },
  {
    name: 'lsn',
    type: 'pg_lsn',
    send: 'pg_lsn_send',
    values: [null, '0/0', '16/B374D848', 'FFFFFFFF/FFFFFFFF'],
  },
  {
    name: 'tid',
    type: 'tid',
    send: 'tidsend',
    values: [null, '(0,0)', '(1,42)', '(4294967295,65535)'],
  },
  {
    name: 'char',
    type: '"char"',
    send: 'charsend',
    values: [null, '', 'a', '"', '\\', '\n', '\\177', '\\200', '\\377'],
  },
  {
    name: 'snapshot',
    type: 'pg_snapshot',
    castInput: true,
    values: [
      null,
      '1:10:',
      '1:10:3,5',
      '18446744073709551614:18446744073709551615:18446744073709551614',
    ],
  },
  {
    name: 'txid_snapshot',
    type: 'txid_snapshot',
    castInput: true,
    values: [
      null,
      '1:10:',
      '1:10:3,5',
      '18446744073709551614:18446744073709551615:18446744073709551614',
    ],
  },
]
const quoted = (s: string) => "'" + s.replaceAll("'", "''") + "'"
const sqlValue = (target: Target, value: Target['values'][number]) =>
  value === null
    ? 'NULL::' + target.type
    : typeof value === 'string'
      ? quoted(value) + '::' + target.type
      : value.sql

it('matches PostgreSQL scalar-output JSONB conversions, ISO dates and timestamps, temporal context boundaries and states in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-output-'))
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    const expressions: Record<string, string> = {}
    for (const target of targets) {
      const value = `v_${target.name}` + (target.castInput ? '::' + target.type : '')
      expressions['converted_' + target.name] = `to_jsonb(${value}) IS NOT DISTINCT FROM expected`
      expressions['qualified_' + target.name] =
        `pg_catalog.to_jsonb(${value}) IS NOT DISTINCT FROM expected`
      expressions['guarded_' + target.name] =
        `CASE WHEN bypass THEN true ELSE to_jsonb(${value}) IS NOT DISTINCT FROM expected END`
      expressions['null_' + target.name] =
        `(to_jsonb(${value}) IS NULL) IS NOT DISTINCT FROM expected_null`
      expressions['selected_' + target.name] =
        `to_jsonb(CASE WHEN bypass THEN ${value} ELSE ${value} END) IS NOT DISTINCT FROM expected`
      expressions['coalesced_' + target.name] =
        `COALESCE(to_jsonb(${value}),'null'::jsonb) IS NOT DISTINCT FROM expected_coalesced`
    }
    expressions.literal_date = `to_jsonb(DATE '2024-02-29')='"2024-02-29"'::jsonb`
    expressions.literal_timestamp = `to_jsonb(TIMESTAMP '1999-12-31 23:59:59.999999')='"1999-12-31T23:59:59.999999"'::jsonb`
    expressions.runtime_date = `to_jsonb(source_text::date) IS NOT DISTINCT FROM expected`
    expressions.runtime_timestamp = `to_jsonb(source_text::timestamp) IS NOT DISTINCT FROM expected`
    await pg.exec(
      `CREATE TABLE jsonb_output_conversion(${targets.map((t) => `v_${t.name} ${t.castInput ? 'text' : t.type}`).join(',')},source_text text,expected jsonb,expected_null bool,expected_coalesced jsonb,bypass bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_output_conversion')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const [i, plan] of plans.entries())
      expect(hasUncertain(plan.expression), constraints[i]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, constraints[i]!.name + ('reason' in check ? ':' + check.reason : '')).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, outcome: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({
          name: name + suffix,
          row: {
            ...Object.fromEntries(targets.map((t) => ['v_' + t.name, known(null)])),
            source_text: known(null),
            expected: known(null),
            expected_null: known(false),
            expected_coalesced: known('null'),
            bypass: known(false),
            ...row,
          },
          expected: outcome,
        })
    }
    for (const target of targets) {
      const styles = ['date', 'timestamp', 'time', 'timetz'].includes(target.name)
        ? ['ISO, MDY', 'SQL, DMY', 'Postgres, MDY', 'German, DMY']
        : ['ISO, MDY']
      const zones = target.name === 'timestamptz' ? ['UTC', 'Etc/GMT+5', 'Asia/Kathmandu'] : ['UTC']
      for (const style of styles)
        for (const zone of zones) {
          await pg.exec(`SET DateStyle=${quoted(style)};SET TimeZone=${quoted(zone)}`)
          for (const value of target.values) {
            const sql = sqlValue(target, value)
            const result = (
              await pg.query<{ source: string | null; output: string | null; wire: string | null }>(
                `SELECT (${sql})::text source,to_jsonb(${sql})::text output,${target.send ? `encode(${target.send}(${sql}),'hex')` : 'NULL::text'} wire`,
              )
            ).rows[0]!
            let payload: Extract<Input, { kind: 'Value' }>['value'] | null = result.source
            if (result.wire !== null) {
              const bytes = Buffer.from(result.wire, 'hex')
              if (target.name === 'date') payload = bytes.readInt32BE()
              else if (target.name === 'char') payload = bytes[0]!
              else if (target.name === 'xid' || target.name === 'cid')
                payload = BigInt(bytes.readUInt32BE())
              else if (target.name === 'tid')
                payload = BigInt(bytes.readUInt32BE()) * 65536n + BigInt(bytes.readUInt16BE(4))
              else if (target.name === 'timetz')
                payload = { time: bytes.readBigInt64BE(), zone: bytes.readInt32BE(8) }
              else payload = bytes.readBigInt64BE()
            }
            const deferred =
              target.name === 'timestamptz' &&
              value !== null &&
              value !== 'infinity' &&
              value !== '-infinity'
            const outcome: Outcome = { kind: deferred ? 'Unknown' : 'True' }
            const row: Row = {
              ['v_' + target.name]: known(payload),
              expected: known(result.output),
              expected_null: known(result.output === null),
              expected_coalesced: known(result.output ?? 'null'),
            }
            for (const prefix of [
              'converted_',
              'qualified_',
              'guarded_',
              'null_',
              'selected_',
              'coalesced_',
            ])
              add(prefix + target.name, row, outcome)
            add('guarded_' + target.name, { ...row, bypass: known(true) }, { kind: 'True' })
            if (!deferred)
              add(
                'converted_' + target.name,
                { ...row, expected: known('["wrong"]') },
                { kind: 'False' },
              )
            oracle.push({ target: target.name, value, style, zone, sql, ...result, deferred })
          }
        }
      for (const input of [{ kind: 'Unknown' } as const, error('22003')]) {
        for (const prefix of [
          'converted_',
          'qualified_',
          'guarded_',
          'null_',
          'selected_',
          'coalesced_',
        ])
          add(prefix + target.name, { ['v_' + target.name]: input }, input)
        add(
          'guarded_' + target.name,
          { ['v_' + target.name]: input, bypass: known(true) },
          { kind: 'True' },
        )
      }
    }
    await pg.exec("SET DateStyle='ISO, MDY';SET TimeZone='UTC'")
    for (const name of ['literal_date', 'literal_timestamp']) add(name, {}, { kind: 'True' })
    add(
      'runtime_date',
      { source_text: known('2024-02-29'), expected: known('"2024-02-29"') },
      { kind: 'True' },
    )
    add(
      'runtime_timestamp',
      {
        source_text: known('1999-12-31 23:59:59.999999'),
        expected: known('"1999-12-31T23:59:59.999999"'),
      },
      { kind: 'True' },
    )
    await mkdir('artifacts/jsonb-output-conversion', { recursive: true })
    await writeFile(
      'artifacts/jsonb-output-conversion/oracle.json',
      JSON.stringify(
        { cases: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_output_conversion',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
