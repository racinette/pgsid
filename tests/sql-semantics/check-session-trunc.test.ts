import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/session-trunc-active'
const common: CheckExecutionContext = {
  timeZone: 'UTC',
  maxIdentifierBytes: 63,
  serverEncoding: 'UTF8',
  defaultCollation: 'C',
}
const profiles: { session: string; context: CheckExecutionContext; missingZone?: boolean }[] = [
  ...[
    'UTC',
    'America/New_York',
    'Australia/Lord_Howe',
    'Pacific/Apia',
    'Pacific/Chatham',
    'Europe/Dublin',
    'Pacific/Guam',
    'ABC3BC4,M3.2.0,M11.1.0',
    '-167.999',
    '167.999',
  ].map((session) => ({ session, context: { ...common, timeZone: session } })),
  { session: 'UTC', context: { ...common, timeZone: undefined }, missingZone: true },
  { session: 'UTC2DST', context: { ...common, timeZone: 'UTC2DST' }, missingZone: true },
  { session: 'UTC', context: { ...common, maxIdentifierBytes: undefined } },
  { session: 'UTC', context: { ...common, serverEncoding: undefined } },
]
const stamps = [
  '-infinity',
  'infinity',
  '4714-11-24 00:00:00+00 BC',
  '0001-03-01 12:34:56.789012+00 BC',
  '1880-07-01 12:34:56.789012+00',
  '1999-12-31 23:59:59.999999+00',
  '2000-02-29 12:34:56.789012+00',
  '2021-03-14 06:59:59.999999+00',
  '2021-03-14 07:00:00+00',
  '2021-11-07 05:30:45.123456+00',
  '2021-11-07 06:30:45.123456+00',
  '2021-04-03 14:45:45.123456+00',
  '2021-04-03 15:15:45.123456+00',
  '2011-12-30 09:30:00+00',
  '2011-12-30 10:30:00+00',
  '2040-11-04 06:30:45.123456+00',
  '294276-12-31 23:59:59.999999+00',
  null,
]
const units = [
  'microseconds',
  'milliseconds',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'decade',
  'century',
  'millennium',
  'timezone',
  'bogus',
  '',
  null,
]
const forms = {
  direct: "encode(timestamptz_send(date_trunc(unit_name,v)),'hex')",
  nested:
    "encode(timestamptz_send((ARRAY[date_trunc(unit_name,v)::session_trunc_domain,NULL])[1]),'hex')",
}
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const sqlError = (code: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('truncates timestamptz in declared session zones with native calendar resolution, invariant fine units, stored boundaries and partial-state INSERT parity', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-session-trunc-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  const setup = `SET TimeZone='UTC';CREATE DOMAIN session_trunc_domain AS timestamptz;
    CREATE TABLE session_inputs(id serial,v timestamptz);
    INSERT INTO session_inputs(v) VALUES ${stamps.map((v) => (v === null ? '(NULL)' : `('${v}')`)).join(',')},(('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0));
    CREATE TABLE session_trunc(v timestamptz,unit_name text,expected text COLLATE "C",bypass boolean,${Object.entries(
      forms,
    )
      .map(
        ([name, sql]) =>
          `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
      .join(',')});
    ${Object.entries(forms)
      .map(
        ([name, sql]) =>
          `CREATE TABLE trunc_oracle_${name}(LIKE session_trunc);ALTER TABLE trunc_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END);`,
      )
      .join('\n')}
    CREATE TABLE session_facets(stamp timestamp,v timestamptz,expected timestamptz,bypass boolean,
      CONSTRAINT unit_context CHECK(CASE WHEN bypass THEN true ELSE date_trunc(stamp::text,v) IS NOT DISTINCT FROM expected END),
      CONSTRAINT explicit_unit_context CHECK(CASE WHEN bypass THEN true ELSE date_trunc(stamp::text,v,'UTC') IS NOT DISTINCT FROM expected END),
      CONSTRAINT explicit_zone_context CHECK(CASE WHEN bypass THEN true ELSE date_trunc('day',v,stamp::text) IS NOT DISTINCT FROM expected END));`
  try {
    await pg.exec(setup)
    const inputs = (
      await pg.query<{ id: number; wire: string | null }>(
        "SELECT id,encode(timestamptz_send(v),'hex') wire FROM session_inputs ORDER BY id",
      )
    ).rows
    expect(inputs).toHaveLength(stamps.length + 1)
    expect(Buffer.from(inputs.at(-1)!.wire!, 'hex').readBigInt64BE()).toBe(9223371331200000000n)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'session_trunc')!,
      facetTable = catalog.tables.find((t) => t.name === 'session_facets')!
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        Object.entries(forms).flatMap(([operation, sql]) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${operation}_${origin}`
            names.push(name)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: portableCheckAtoms(
                lowerTableCheck(
                  table,
                  table.constraints.find((k) => k.name === operation)!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
              ),
            }
          }),
        ),
        profile.context,
      ),
    )
    for (const g of groups)
      expect(g.evaluatorSource).toContain('sql__pg_catalog__date_trunc__7d7s(')
    groups.push(
      prepareCheckRustGroup(
        facetTable.constraints.flatMap((k) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `facet_${k.name}_${origin}`
            names.push(name)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: facetTable.name,
                constraint: name,
              },
              expression: portableCheckAtoms(
                lowerTableCheck(
                  facetTable,
                  k,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                )!.expression,
              ),
            }
          }),
        ),
        { ...common, timeZoneAbbreviations: 'Default' },
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
    const source = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/temporal_fields.rs',
        'utf8',
      ),
      keys = [
        .../const TEMPORAL_UNIT_KEYS[^=]*= &\[([\s\S]*?)\];/u
          .exec(source)![1]!
          .matchAll(/"([^"]*)"/gu),
      ].map((m) => m[1]!)
    for (const [index, profile] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      const cases = inputs.flatMap((input) => units.map((unit) => ({ input, unit })))
      if (index === 0)
        for (const unit of [
          ...keys,
          ...keys.map((k) => k.toUpperCase()),
          'microsecondsextra',
          'millisecondsextra',
          'epoch',
          'isoyear',
          ' day',
          'day ',
        ])
          cases.push({ input: inputs[6]!, unit })
      if (profile.context.serverEncoding === undefined)
        cases.push({ input: inputs[6]!, unit: 'dáy' })
      for (const { input, unit } of cases)
        for (const [operation, sql] of Object.entries(forms)) {
          if (operation === 'nested' && ![7, 18, 19].includes(input.id)) continue
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql}) value FROM(SELECT v,$1::text unit_name FROM session_inputs WHERE id=$2)s`,
                [unit, input.id],
              )
            ).rows[0]!.value
          } catch (e) {
            const code = (e as { code: string }).code
            expect(['22008', '22023', '0A000']).toContain(code)
            error = sqlError(code)
          }
          const value =
              input.wire === null ? null : Buffer.from(input.wire, 'hex').readBigInt64BE(),
            finite =
              value !== null && value !== -9223372036854775808n && value !== 9223372036854775807n
          const fine =
            ['microseconds', 'milliseconds', 'second'].includes(unit ?? '') &&
            finite &&
            value >= -211813488000000000n + 2147483648n * 1000000n &&
            value < 9223371331200000000n - 2147483648n * 1000000n
          const invariantError =
            value === 9223371331200000000n &&
            ['microseconds', 'milliseconds', 'second'].includes(unit ?? '')
          const missingBuild =
            profile.context.maxIdentifierBytes === undefined && unit !== '' && unit !== null
          const missingEncoding = profile.context.serverEncoding === undefined && unit === 'dáy'
          const defer =
            unit !== null &&
            value !== null &&
            (missingBuild ||
              missingEncoding ||
              (profile.missingZone &&
                finite &&
                !fine &&
                !invariantError &&
                (error === undefined ||
                  (error.kind === 'Error' && error.value.state === parseInt('22008', 36)))))
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const reference: Outcome = bypass
                ? { kind: 'True' }
                : (error ?? { kind: output === expectedText ? 'True' : 'False' })
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO trunc_oracle_${operation} SELECT v,$1::text,$2::text,$3::boolean FROM session_inputs WHERE id=$4`,
                  [unit, expectedText, bypass, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${input.id}/${unit}/${operation}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const expected: Outcome = !bypass && defer ? { kind: 'Unknown' } : reference
              native.push({
                profile: index,
                input: input.id,
                unit,
                operation,
                expectedText,
                bypass,
                reference,
                expected,
                databaseSqlstate: code,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    v: known(value),
                    unit_name: known(unit),
                    expected: known(expectedText),
                    bypass: known(bypass),
                  },
                  expected,
                })
            }
        }
    }
    for (const name of names.filter((n) => n.startsWith('p'))) {
      const base: Row = {
        v: known(0n),
        unit_name: known('day'),
        expected: known('x'),
        bypass: known(false),
      }
      for (const field of ['v', 'unit_name'])
        for (const state of [{ kind: 'Unknown' }, sqlError('22012')] as Input[]) {
          fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: { ...base, [field]: state, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
      fixtures.push({
        name,
        row: { ...base, v: sqlError('22012') as Input, unit_name: sqlError('22003') as Input },
        expected: sqlError('22003'),
      })
    }
    await pg.exec("SET TimeZone='UTC'")
    for (const name of names.filter((n) => n.startsWith('facet_'))) {
      const base: Row = {
        stamp: known(0n),
        v: known(null),
        expected: known(null),
        bypass: known(false),
      }
      for (const fixture of [
        { row: base, expected: { kind: 'True' } },
        { row: { ...base, expected: known(0n) }, expected: { kind: 'False' } },
        { row: { ...base, v: known(0n) }, expected: { kind: 'Unknown' } },
        { row: { ...base, v: known(0n), bypass: known(true) }, expected: { kind: 'True' } },
        { row: { ...base, v: sqlError('22012') as Input }, expected: sqlError('22012') },
        {
          row: { ...base, stamp: sqlError('22003') as Input, v: sqlError('22012') as Input },
          expected: sqlError(name.includes('explicit_zone_context') ? '22012' : '22003'),
        },
        {
          row: { ...base, stamp: { kind: 'Unknown' } as Input },
          expected: { kind: 'True' },
        },
      ] as { row: Row; expected: Outcome }[])
        fixtures.push({ name, ...fixture })
    }
    const facetInsert = await pg.query(
      "INSERT INTO session_facets(stamp,v,expected,bypass) VALUES('2000-01-01',NULL,NULL,false) RETURNING 1 value",
    )
    expect(facetInsert.rows).toHaveLength(1)
    await expect(
      pg.query(
        "INSERT INTO session_facets(stamp,v,expected,bypass) VALUES('2000-01-01',NULL,'2000-01-01+00',false)",
      ),
    ).rejects.toMatchObject({ code: '23514' })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          inserts: native.length + 2,
          profiles: profiles.length,
          inputs: inputs.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'session_trunc', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
