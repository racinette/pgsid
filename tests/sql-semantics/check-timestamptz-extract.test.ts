import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/timestamptz-extract-active'
const common: CheckExecutionContext = {
  timeZone: 'UTC',
  maxIdentifierBytes: 63,
  serverEncoding: 'UTF8',
  defaultCollation: 'C',
}
const profiles: {
  session: string
  context: CheckExecutionContext
  full?: boolean
  single?: boolean
  missingZone?: boolean
}[] = [
  ...['UTC', 'America/New_York', '-167.999', '167.999'].map((session) => ({
    session,
    context: { ...common, timeZone: session },
    full: true,
  })),
  ...[
    'Asia/Kolkata',
    'Europe/Dublin',
    'Pacific/Guam',
    '0.9338888888888889',
    'abc3bcd2,m3.2.0,m11.1.0',
  ].map((session) => ({ session, context: { ...common, timeZone: session } })),
  ...['-24', '-48', '-72', '-96', '-120', '-144'].map((session) => ({
    session,
    context: { ...common, timeZone: session },
    single: true,
  })),
  { session: 'UTC', context: { ...common, timeZone: undefined }, missingZone: true },
  { session: 'UTC', context: { ...common, maxIdentifierBytes: undefined } },
]
const stamps = [
  '-infinity',
  'infinity',
  '4714-11-24 00:00:00+00 BC',
  '0001-03-01 12:34:56.789012+00 BC',
  '1880-07-01 12:34:56.789012+00',
  '1969-12-31 23:59:59.999999+00',
  '1999-12-31 23:59:59.999999+00',
  '2000-02-29 12:34:56.789012+00',
  '2021-03-14 06:59:59.999999+00',
  '2021-03-14 07:00:00+00',
  '2021-11-07 05:30:45.123456+00',
  '2021-11-07 06:30:45.123456+00',
  '2040-07-01 12:34:56.789012+00',
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
  'julian',
  'isoyear',
  'dow',
  'isodow',
  'doy',
  'epoch',
  'timezone',
  'timezone_hour',
  'timezone_minute',
  'bogus',
  'infinity',
  'ago',
  '',
  null,
]
const forms = {
  numeric: "encode(numeric_send(pg_catalog.extract(unit_name,v)),'hex')",
  legacy: "encode(float8send(pg_catalog.date_part(unit_name,v)),'hex')",
  numeric_nested:
    "encode(numeric_send((ARRAY[pg_catalog.extract(unit_name,v)::zone_extract_number,NULL])[1]),'hex')",
  legacy_nested:
    "encode(float8send((ARRAY[pg_catalog.date_part(unit_name,v)::zone_extract_float,NULL])[1]),'hex')",
}
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const sqlError = (code: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('matches native timestamptz numeric and floating field extraction across session calendars, signed offsets, epoch thresholds, stored boundaries and missing context', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-timestamptz-extract-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  const setup = `SET TimeZone='UTC';CREATE DOMAIN zone_extract_number AS numeric;CREATE DOMAIN zone_extract_float AS float8;
    CREATE TABLE instant_inputs(id serial,v timestamptz);
    INSERT INTO instant_inputs(v) VALUES ${stamps.map((v) => (v === null ? '(NULL)' : `('${v}')`)).join(',')},(('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0));
    INSERT INTO instant_inputs(v) SELECT timestamptz '2000-01-01 00:00+00'+(m::text||' microseconds')::interval FROM(VALUES(9222425352054775806::bigint),(9222425352054775807::bigint),(9222425352054775808::bigint))s(m);
    CREATE TABLE instant_fields(v timestamptz,unit_name text,expected text COLLATE "C",bypass boolean,${Object.entries(
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
          `CREATE TABLE oracle_${name}(LIKE instant_fields);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END);`,
      )
      .join('\n')}
    CREATE TABLE raw_days(id serial,d date);CREATE TABLE day_fields(d date,unit_name text,expected text COLLATE "C",bypass boolean,CONSTRAINT day_value CHECK(CASE WHEN bypass THEN true ELSE encode(numeric_send(pg_catalog.extract(unit_name,d)),'hex') COLLATE "C" IS NOT DISTINCT FROM expected END));
    CREATE TABLE field_facets(stamp timestamp,v timestamptz,expected numeric,expected_float float8,bypass boolean,
      CONSTRAINT numeric_value CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.extract(stamp::text,v) IS NOT DISTINCT FROM expected END),
      CONSTRAINT legacy_value CHECK(CASE WHEN bypass THEN true ELSE pg_catalog.date_part(stamp::text,v) IS NOT DISTINCT FROM expected_float END));`
  try {
    await pg.exec(setup)
    const inputs = (
      await pg.query<{ id: number; wire: string | null }>(
        "SELECT id,encode(timestamptz_send(v),'hex') wire FROM instant_inputs ORDER BY id",
      )
    ).rows
    expect(inputs).toHaveLength(stamps.length + 4)
    expect(Buffer.from(inputs[15]!.wire!, 'hex').readBigInt64BE()).toBe(9223371331200000000n)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'instant_fields')!,
      dayTable = catalog.tables.find((t) => t.name === 'day_fields')!,
      facetTable = catalog.tables.find((t) => t.name === 'field_facets')!
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        Object.entries(forms).flatMap(([operation, sql]) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${operation}_${origin}`
            names.push(name)
            const expression = lowerTableCheck(
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
    groups.push(
      prepareCheckRustGroup(
        (['source', 'stored'] as const).map((origin) => {
          const name = 'date_' + origin
          names.push(name)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: dayTable.name,
              constraint: name,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                dayTable,
                dayTable.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
              )!.expression,
            ),
          }
        }),
        common,
      ),
    )
    groups.push(
      prepareCheckRustGroup(
        facetTable.constraints.flatMap((k) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = 'facet_' + k.name + '_' + origin
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
        common,
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
    const fields = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/temporal_fields.rs',
        'utf8',
      ),
      extras = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/temporal_extract.rs',
        'utf8',
      )
    const keys = [fields, extras].flatMap((s) =>
      [
        .../const TEMPORAL_(?:UNIT|EXTRACT)_KEYS[^=]*= &\[([\s\S]*?)\];/u
          .exec(s)![1]!
          .matchAll(/"([^"]*)"/gu),
      ].map((m) => m[1]!),
    )
    for (const [index, profile] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      const selected = profile.full
        ? inputs
        : profile.single
          ? [inputs[2]!]
          : inputs.filter((i) => [1, 2, 3, 5, 8, 13, 15, 16].includes(i.id))
      const cases = selected.flatMap((input) => units.map((unit) => ({ input, unit })))
      if (index === 0)
        for (const unit of [
          ...keys,
          ...keys.map((k) => k.toUpperCase()),
          'timezone_hour_extra',
          'timezone_minute_extra',
          'epoch ',
        ])
          cases.push({ input: inputs[7]!, unit })
      for (const { input, unit } of cases)
        for (const [operation, sql] of Object.entries(forms)) {
          if (operation.includes('nested') && ![8, 15, 16].includes(input.id)) continue
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql}) value FROM(SELECT v,$1::text unit_name FROM instant_inputs WHERE id=$2)s`,
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
          const defer =
            unit !== null &&
            value !== null &&
            ((profile.context.maxIdentifierBytes === undefined && unit !== '') ||
              (profile.missingZone && finite && unit !== 'epoch' && error === undefined))
          for (const expectedText of [output, 'wrong']) {
            const bypass = false
            const reference: Outcome = bypass
              ? { kind: 'True' }
              : (error ?? { kind: output === expectedText ? 'True' : 'False' })
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${operation} SELECT v,$1::text,$2::text,$3::boolean FROM instant_inputs WHERE id=$4`,
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
    for (const session of ['UTC', '-24', '-48', '-72', '-96', '-120', '-144', '-167.999']) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [session])
      await pg.exec("INSERT INTO raw_days(d) VALUES(('4714-11-24 00:00+00 BC'::timestamptz)::date)")
    }
    for (const day of (
      await pg.query<{ id: number; wire: string }>(
        "SELECT id,encode(date_send(d),'hex') wire FROM raw_days ORDER BY id",
      )
    ).rows)
      for (const unit of ['dow', 'isodow', 'week', 'isoyear', 'day', 'year', 'month', 'julian']) {
        const output = (
          await pg.query<{ value: string }>(
            "SELECT encode(numeric_send(pg_catalog.extract($1::text,d)),'hex') value FROM raw_days WHERE id=$2",
            [unit, day.id],
          )
        ).rows[0]!.value
        for (const expectedText of [output, 'wrong']) {
          let code: string | undefined
          try {
            await pg.query(
              'INSERT INTO day_fields SELECT d,$1::text,$2::text,false FROM raw_days WHERE id=$3',
              [unit, expectedText, day.id],
            )
          } catch (e) {
            code = (e as { code: string }).code
          }
          expect(code).toBe(expectedText === output ? undefined : '23514')
          native.push({
            operation: 'date',
            input: day.id,
            unit,
            expectedText,
            databaseSqlstate: code,
          })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: 'date_' + origin,
              row: {
                d: known(Buffer.from(day.wire, 'hex').readInt32BE()),
                unit_name: known(unit),
                expected: known(expectedText),
                bypass: known(false),
              },
              expected: { kind: expectedText === output ? 'True' : 'False' },
            })
        }
      }
    for (const name of names.filter((n) => n.startsWith('p'))) {
      const base: Row = {
        v: known(0n),
        unit_name: known('epoch'),
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
    for (const name of names.filter((n) => n.startsWith('facet_'))) {
      const base: Row = {
        stamp: known(0n),
        v: known(null),
        expected: known(null),
        expected_float: known(null),
        bypass: known(false),
      }
      fixtures.push(
        { name, row: base, expected: { kind: 'True' } },
        { name, row: { ...base, v: known(0n) }, expected: { kind: 'Unknown' } },
        { name, row: { ...base, v: sqlError('22012') as Input }, expected: sqlError('22012') },
        {
          name,
          row: { ...base, stamp: sqlError('22003') as Input, v: sqlError('22012') as Input },
          expected: sqlError('22003'),
        },
        {
          name,
          row: { ...base, v: sqlError('22012') as Input, bypass: known(true) },
          expected: { kind: 'True' },
        },
      )
    }
    expect(
      (
        await pg.query(
          "INSERT INTO field_facets VALUES('2000-01-01',NULL,NULL,NULL,false) RETURNING 1",
        )
      ).rows,
    ).toHaveLength(1)
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          inserts: native.length + 1,
          profiles: profiles.length,
          inputs: inputs.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'timestamptz_extract', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
