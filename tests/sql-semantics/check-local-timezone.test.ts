import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/local-timezone-active'
const common: CheckExecutionContext = {
  timeZone: 'UTC',
  timeZoneAbbreviations: 'Default',
  maxIdentifierBytes: 63,
  serverEncoding: 'UTF8',
  defaultCollation: 'C',
}
const profiles: {
  session: string
  context: CheckExecutionContext
  clockDeferred?: boolean
  missingZone?: boolean
}[] = [
  ...[
    'UTC',
    'uTc',
    'GMT',
    '0',
    '2',
    '-2',
    '+02:30',
    '167.999',
    '-167.999',
    '0.9338888888888889',
    '<UTC>-02',
    '<Etc/UTC>-02',
    'abc3bcd3,m3.2.0,m11.1.0',
    '<éab>-02',
  ].map((session) => ({ session, context: { ...common, timeZone: session } })),
  ...[
    'America/New_York',
    ':America/New_York',
    'Australia/Lord_Howe',
    'Europe/Dublin',
    'Pacific/Guam',
    'abc3bcd2,m3.2.0,m11.1.0',
  ].map((session) => ({ session, context: { ...common, timeZone: session }, clockDeferred: true })),
  {
    session: 'UTC',
    context: { ...common, timeZone: undefined },
    missingZone: true,
    clockDeferred: true,
  },
  { session: 'UTC', context: { ...common, timeZoneAbbreviations: undefined } },
  {
    session: 'Etc/UTC',
    context: { ...common, timeZone: 'Etc/UTC', timeZoneAbbreviations: undefined },
    clockDeferred: true,
  },
  {
    session: '2',
    context: { ...common, timeZone: '2', timeZoneAbbreviations: undefined },
    clockDeferred: true,
  },
  { session: 'UTC', context: { ...common, maxIdentifierBytes: undefined }, clockDeferred: true },
  { session: 'UTC', context: { ...common, serverEncoding: undefined } },
  {
    session: '<éab>-02',
    context: { ...common, timeZone: '<éab>-02', serverEncoding: undefined },
    clockDeferred: true,
  },
]
const forms = {
  attach: { field: 's', sql: "encode(timestamptz_send(pg_catalog.timezone(s)),'hex')" },
  attach_syntax: { field: 's', sql: "encode(timestamptz_send(s AT LOCAL),'hex')" },
  attach_array: {
    field: 's',
    sql: "encode(timestamptz_send((ARRAY[timezone(s)::local_instant,NULL])[1]),'hex')",
  },
  project: { field: 'z', sql: "encode(timestamp_send(pg_catalog.timezone(z)),'hex')" },
  project_syntax: { field: 'z', sql: "encode(timestamp_send(z AT LOCAL),'hex')" },
  project_record: {
    field: 'z',
    sql: "encode(timestamp_send((ROW(timezone(z),NULL::timestamptz)::local_projection).stamp),'hex')",
  },
  clock: { field: 'c', sql: "encode(timetz_send(pg_catalog.timezone(c)),'hex')" },
  clock_syntax: { field: 'c', sql: "encode(timetz_send(c AT LOCAL),'hex')" },
  clock_array: {
    field: 'c',
    sql: "encode(timetz_send((ARRAY[timezone(c)::local_clock,NULL])[1]),'hex')",
  },
} as const
const stamps = [
  '-infinity',
  'infinity',
  '4714-11-24 BC',
  '0001-03-01 12:34:56.789012 BC',
  '1880-07-01 12:34:56.789012',
  '1999-12-31 23:59:59.999999',
  '2000-01-01',
  '2021-03-14 02:30',
  '2021-11-07 01:30',
  '2040-07-01 12:34:56',
  '294276-12-31 23:59:59.999999',
  null,
]
const instants = [
  '-infinity',
  'infinity',
  '4714-11-24 00:00+00 BC',
  '0001-03-01 12:34:56.789012+00 BC',
  '1880-07-01 12:34:56.789012+00',
  '1999-12-31 23:59:59.999999+00',
  '2000-01-01+00',
  '2021-03-14 07:30+00',
  '2021-11-07 05:30+00',
  '2021-11-07 06:30+00',
  '294276-12-31 23:59:59.999999+00',
  null,
]
const clocks = [
  "timetz '00:00+00'",
  "timetz '24:00+00'",
  "timetz '12:34:56.789012+05:30'",
  "timetz '00:00:00.000001-15:59:59'",
  "timetz '23:59:59.999999+15:59:59'",
  "timezone(interval '2147483647 seconds',timetz '12:34:56+00')",
  "timezone(interval '2147483648 seconds',timetz '12:34:56+00')",
  "timezone(interval '-2147483648 seconds',timetz '24:00+00')",
  "timetz '12:00-04'",
  "timetz '12:00+14'",
  "timetz '01:00+00'",
  'NULL',
]
const valueSql = (value: string | null, type: string) =>
  value === null ? `NULL::${type}` : `'${value}'::${type}`
const setup = `SET TimeZone='UTC';CREATE DOMAIN local_instant AS timestamptz;CREATE DOMAIN local_clock AS timetz;CREATE TYPE local_projection AS(stamp timestamp,instant timestamptz);
  CREATE TABLE local_inputs(id serial,kind text,s timestamp,z timestamptz,c timetz);
  INSERT INTO local_inputs(kind,s,z,c) VALUES ${stamps.map((s, i) => `('ordinary',${valueSql(s, 'timestamp')},${valueSql(instants[i]!, 'timestamptz')},${clocks[i]})`).join(',')};
  INSERT INTO local_inputs(kind,s,z,c) VALUES('rounded',timestamp '294276-12-31 23:59:59.999999'::timestamp(0),timestamptz '294276-12-31 23:59:59.999999+00'::timestamptz(0),timetz '24:00+00');
  SET TimeZone='-167.999';INSERT INTO local_inputs(kind,s,z,c) SELECT 'projected',(z::date)::timestamp,z,timetz '24:00+00' FROM local_inputs WHERE id=3;SET TimeZone='UTC';`
const known = (value: string | bigint | boolean | { time: bigint; zone: number } | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const sqlError = (code: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const constraint = (sql: string) =>
  `CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END`

it('matches local timezone functions and AT LOCAL syntax with native casts, canonical session names, timetz lookup requirements, stored values and lazy composition', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-local-timezone-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    await pg.exec(setup)
    const columns = 's timestamp,z timestamptz,c timetz,expected text COLLATE "C",bypass boolean'
    await pg.exec(
      `CREATE TABLE local_checks(${columns},${Object.entries(forms)
        .map(([name, { sql }]) => `CONSTRAINT ${name} CHECK(${constraint(sql)})`)
        .join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'local_checks')!,
      inputs = (
        await pg.query<{
          id: number
          kind: string
          s: string | null
          z: string | null
          c: string | null
        }>(
          "SELECT id,kind,encode(timestamp_send(s),'hex') s,encode(timestamptz_send(z),'hex') z,encode(timetz_send(c),'hex') c FROM local_inputs ORDER BY id",
        )
      ).rows.map((input) => ({
        id: input.id,
        kind: input.kind,
        s: input.s === null ? null : Buffer.from(input.s, 'hex').readBigInt64BE(),
        z: input.z === null ? null : Buffer.from(input.z, 'hex').readBigInt64BE(),
        c:
          input.c === null
            ? null
            : {
                time: Buffer.from(input.c, 'hex').readBigInt64BE(),
                zone: Buffer.from(input.c, 'hex').readInt32BE(8),
              },
      }))
    expect(inputs).toHaveLength(14)
    expect(inputs[12]!.s).toBe(9223371331200000000n)
    expect(inputs[13]!.s).toBe(-211814092800000000n)
    expect(inputs[6]!.c!.zone).toBe(-2147483648)
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        Object.entries(forms).flatMap(([operation, { sql }]) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${operation}_${origin}`
            names.push(name)
            const expression = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === operation)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${constraint(sql)})` : undefined,
            )!.expression
            expect(hasUncertain(expression), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: portableCheckAtoms(expression),
            }
          }),
        ),
        profile.context,
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
        requiresRegex: false,
      }
    group.checks.forEach((check, i) => expect(check.kind, names[i]).toBe('supported'))
    for (const [index, profile] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      for (const [operation, { sql }] of Object.entries(forms))
        await pg.exec(`CREATE TABLE oracle_${operation}(${columns},CHECK(${constraint(sql)}));`)
      const configured = (
        await pg.query<{ value: string }>("SELECT set_config('TimeZone',$1,false) value", [
          profile.session,
        ])
      ).rows[0]!.value
      for (const input of inputs)
        for (const [operation, { field, sql }] of Object.entries(forms)) {
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql}) value FROM local_inputs WHERE id=$1`,
                [input.id],
              )
            ).rows[0]!.value
          } catch (e) {
            expect((e as { code: string }).code).toBe('22008')
            error = sqlError('22008')
          }
          const value = input[field],
            finite =
              typeof value === 'bigint' &&
              value !== -9223372036854775808n &&
              value !== 9223372036854775807n,
            defer =
              field === 'c'
                ? profile.clockDeferred && value !== null
                : profile.missingZone &&
                  finite &&
                  !(field === 's' && (value as bigint) < -211813488000000000n)
          for (const target of [output, 'wrong']) {
            const reference: Outcome = error ?? { kind: output === target ? 'True' : 'False' }
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${operation} SELECT s,z,c,$1::text,false FROM local_inputs WHERE id=$2`,
                [target, input.id],
              )
            } catch (e) {
              code = (e as { code: string }).code
            }
            expect(code, `${index}/${input.id}/${operation}`).toBe(
              reference.kind === 'Error'
                ? '22008'
                : reference.kind === 'False'
                  ? input.kind === 'projected'
                    ? '22008'
                    : '23514'
                  : undefined,
            )
            const expected: Outcome = defer ? { kind: 'Unknown' } : reference
            native.push({
              profile: index,
              session: profile.session,
              configured,
              input: input.id,
              operation,
              target,
              reference,
              expected,
              databaseSqlstate: code,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `p${index}_${operation}_${origin}`,
                row: {
                  s: known(input.s),
                  z: known(input.z),
                  c: known(input.c),
                  expected: known(target),
                  bypass: known(false),
                },
                expected,
              })
          }
        }
      for (const [operation, { field }] of Object.entries(forms))
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${operation}_${origin}`,
            base: Row = {
              s: known(0n),
              z: known(0n),
              c: known({ time: 0n, zone: 0 }),
              expected: known('wrong'),
              bypass: known(false),
            }
          for (const state of [{ kind: 'Unknown' } as Input, sqlError('22012') as Input])
            fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: { ...base, [field]: sqlError('22012') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          inserts: native.length,
          profiles: profiles.length,
          inputs: inputs.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'local_timezone', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
