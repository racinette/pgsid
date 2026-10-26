import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { isTemporalContextComparison } from '../../src/sql-semantics/temporal-casts.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/temporal-comparison-active'
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && isTemporalContextComparison(fn),
)
const byIdentity = new Map(functions.map((fn) => [callableIdentity(fn), fn]))
const argument = (type: string) =>
  type === 'pg_catalog.date' ? 'd' : type === 'pg_catalog.timestamptz' ? 'z' : 's'
const operations = [
  ...functions.map((fn) => ({
    name: fn.rustName,
    sql: `pg_catalog.${fn.name}(${fn.args.map(argument).join(',')})`,
    fn,
  })),
  ...builtinCallables().flatMap((op) => {
    if (op.kind !== 'operator') return []
    const fn = byIdentity.get(op.implementation)
    return fn
      ? [
          {
            name: 'operator_' + fn.rustName,
            sql: `${argument(op.args[0]!)} OPERATOR(pg_catalog.${op.name}) ${argument(op.args[1]!)}`,
            fn,
          },
        ]
      : []
  }),
]
const compositions = {
  distinct: 'd IS DISTINCT FROM z',
  not_distinct: 's IS NOT DISTINCT FROM z',
  nullif_date: 'NULLIF(d,z) IS NULL',
  nullif_timestamp: 'NULLIF(s,z) IS NULL',
  simple_case: 'CASE s WHEN z THEN true ELSE false END',
  between: 'd BETWEEN z AND z',
  array_element: '(ARRAY[s::comparison_local,NULL])[1] < z',
  record_field: '(ROW(d,s)::comparison_record).local < z',
  coalesce: 'COALESCE(s=z,false)',
  row_distinct: '(d,z) IS DISTINCT FROM (z,d)',
}
type Form = { name: string; sql: string; fn?: FunctionMetadata }
const profiles = [
  { session: 'UTC', full: true },
  { session: 'America/New_York', full: true },
  { session: 'Australia/Lord_Howe' },
  { session: 'Europe/Dublin' },
  { session: 'Pacific/Guam' },
  { session: '167.999' },
  { session: '-167.999' },
  { session: '-0.0002777777777777778' },
  { session: 'abc3bcd2,m3.2.0,m11.1.0' },
  { session: 'UTC', missing: true },
  { session: 'ComparisonBoundaryMin', missing: true, boundary: true, offset: -2147483648 },
  { session: 'ComparisonBoundaryMax', missing: true, boundary: true, offset: 2147483647 },
]
const selectedForms = (profile: (typeof profiles)[number]): Form[] =>
  profile.boundary
    ? operations.filter(
        (op) => !op.name.startsWith('operator_') && /_(cmp|eq|ne|lt)_/u.test(op.fn.name),
      )
    : profile.full
      ? [...operations, ...Object.entries(compositions).map(([name, sql]) => ({ name, sql }))]
      : profile.missing
        ? operations
        : operations.filter(
            (op) => !op.name.startsWith('operator_') && /_(cmp|lt)_/u.test(op.fn.name),
          )
const known = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const sqlError = (code: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const expression = (form: Form) =>
  `CASE WHEN bypass THEN true ELSE (${form.sql}) IS NOT DISTINCT FROM ${form.fn?.result === 'pg_catalog.int4' ? 'expected_int' : 'expected_bool'} END`
const setup = `SET TimeZone='UTC';
  CREATE DOMAIN comparison_local AS timestamp;
  CREATE TYPE comparison_record AS (day date,local timestamp);
  CREATE TABLE comparison_inputs(id serial,d date,s timestamp,z timestamptz);
  INSERT INTO comparison_inputs(d,s,z) VALUES
    ('2000-01-01','2000-01-01','2000-01-01+00'),
    ('1999-12-31','1999-12-31 23:59:59.999999','1999-12-31 23:59:59.999999+00'),
    ('2000-01-01','2000-01-01 00:00:00.000001','2000-01-01+00'),
    ('1999-12-31','1999-12-31 23:59:59.999999','1999-12-31 23:59:59.999998+00'),
    ('2021-03-14','2021-03-14 02:30','2021-03-14 07:30+00'),
    ('2021-11-07','2021-11-07 01:30','2021-11-07 05:30+00'),
    ('2021-11-07','2021-11-07 01:30','2021-11-07 06:30+00'),
    ('1880-07-01','1880-07-01 12:34:56.789012','1880-07-01 12:34:56.789012+00'),
    ('2040-07-01','2040-07-01 12:34:56','2040-07-01 12:34:56+00'),
    ('2100-01-01','2100-01-01','2000-01-01+00'),
    ('1900-01-01','1900-01-01','2000-01-01+00'),
    ('4714-11-24 BC','4714-11-24 BC','4714-11-24 BC'),
    ('294276-12-31','294276-12-31 23:59:59.999999','294276-12-31 23:59:59.999999+00'),
    ('294277-01-01','2000-01-01','294276-12-31 23:59:59.999999+00'),
    ('5874897-12-31','2000-01-01','infinity'),
    ('infinity','infinity','infinity'),
    ('-infinity','-infinity','-infinity'),
    ('infinity','infinity','-infinity'),
    ('-infinity','-infinity','infinity'),
    ('2000-01-01','2000-01-01','infinity'),
    ('2000-01-01','2000-01-01','-infinity'),
    ('infinity','infinity','2000-01-01+00'),
    ('-infinity','-infinity','2000-01-01+00'),
    (NULL,NULL,'2000-01-01+00'),
    ('2000-01-01','2000-01-01',NULL),
    (NULL,NULL,NULL),
    ('294277-01-01',timestamp '294276-12-31 23:59:59.999999'::timestamp(0),timestamptz '294276-12-31 23:59:59.999999+00'::timestamptz(0)),
    ('294276-12-31',timestamp '294276-12-31 23:59:59.999999'::timestamp(0),'infinity'),
    ('294276-12-31',timestamp '294276-12-31 23:59:59.999999'::timestamp(0),'-infinity');
  SET TimeZone='-167.999';
  INSERT INTO comparison_inputs(d,s,z) SELECT z::date,(z::date)::timestamp,z FROM comparison_inputs WHERE id=12;
  INSERT INTO comparison_inputs(d,s,z) SELECT d,s,'infinity' FROM comparison_inputs WHERE id=30;
  INSERT INTO comparison_inputs(d,s,z) SELECT d,s,'-infinity' FROM comparison_inputs WHERE id=30;
  SET TimeZone='UTC';
  INSERT INTO comparison_inputs(d,s,z) VALUES('1999-12-31','1999-12-31 23:59:59.999999','2000-01-01 00:00:00.999999+00');
  INSERT INTO comparison_inputs(d,s,z) SELECT date '2100-01-01',timestamp '2100-01-01',timestamptz '2100-01-01 00:00+00'+(n::text||' seconds')::interval FROM(VALUES(-2147483648::bigint),(-2147483647::bigint),(2147483647::bigint),(2147483648::bigint))v(n);`

it('matches native mixed temporal callbacks and operators, finite overflow ordering, projected storage, lazy composition and conditional timezone facts', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-temporal-comparison-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    expect(functions).toHaveLength(28)
    expect(operations).toHaveLength(52)
    await pg.exec(setup)
    const columns =
      'd date,s timestamp,z timestamptz,expected_bool boolean,expected_int integer,bypass boolean'
    await pg.exec(
      `CREATE TABLE comparison_checks(${columns},${selectedForms(profiles[0]!)
        .map((form) => `CONSTRAINT "${form.name}" CHECK(${expression(form)})`)
        .join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'comparison_checks')!,
      inputs = (
        await pg.query<{ id: number; d: string | null; s: string | null; z: string | null }>(
          "SELECT id,encode(date_send(d),'hex') d,encode(timestamp_send(s),'hex') s,encode(timestamptz_send(z),'hex') z FROM comparison_inputs ORDER BY id",
        )
      ).rows.map((input) => ({
        id: input.id,
        d: input.d === null ? null : Buffer.from(input.d, 'hex').readInt32BE(),
        s: input.s === null ? null : Buffer.from(input.s, 'hex').readBigInt64BE(),
        z: input.z === null ? null : Buffer.from(input.z, 'hex').readBigInt64BE(),
      }))
    expect(inputs).toHaveLength(37)
    expect(inputs[26]!.s).toBe(9223371331200000000n)
    expect(inputs[29]!.d).toBe(-2451552)
    expect(inputs[29]!.s).toBe(-211814092800000000n)
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        selectedForms(profile).flatMap((form) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${form.name}_${origin}`
            names.push(name)
            const lowered = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === form.name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${expression(form)})` : undefined,
            )!.expression
            expect(hasUncertain(lowered), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: portableCheckAtoms(lowered),
            }
          }),
        ),
        { timeZone: profile.missing ? undefined : profile.session },
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
    group.checks.forEach((c, i) => expect(c.kind, names[i]).toBe('supported'))
    for (const [index, profile] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      const forms = selectedForms(profile)
      for (const [i, form] of forms.entries())
        await pg.exec(`CREATE TABLE oracle_${i}(${columns},CHECK(${expression(form)}));`)
      if (profile.boundary) {
        const bytes = Buffer.alloc(69)
        bytes.write('TZif', 0)
        bytes.writeInt32BE(1, 32)
        bytes.writeInt32BE(2, 36)
        bytes.writeInt32BE(8, 40)
        bytes.writeInt32BE(1577836800, 44)
        bytes[48] = 1
        bytes.writeInt32BE(profile.offset!, 55)
        bytes[60] = 4
        bytes.write('UTC\0XST\0', 61)
        pg.Module.FS.writeFile('/pglite/share/postgresql/timezone/' + profile.session, bytes)
      }
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      const selected = inputs.filter((input) => (profile.boundary ? input.id > 33 : input.id <= 33))
      for (const input of selected)
        for (const [formIndex, form] of forms.entries()) {
          let output: boolean | number | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: boolean | number | null }>(
                `SELECT (${form.sql}) value FROM comparison_inputs WHERE id=$1`,
                [input.id],
              )
            ).rows[0]!.value
          } catch (e) {
            expect((e as { code: string }).code).toBe('22008')
            error = sqlError('22008')
          }
          let defer = false
          if (profile.missing && !error && form.fn) {
            const localType = form.fn.args.find((t) => t !== 'pg_catalog.timestamptz')!,
              local =
                localType === 'pg_catalog.date'
                  ? input.d === null
                    ? null
                    : BigInt(input.d) * 86400000000n
                  : input.s,
              localInfinity =
                localType === 'pg_catalog.date'
                  ? input.d === -2147483648 || input.d === 2147483647
                  : input.s === -9223372036854775808n || input.s === 9223372036854775807n,
              instantInfinity =
                input.z === -9223372036854775808n || input.z === 9223372036854775807n,
              earlyOverflow =
                localType === 'pg_catalog.date' && input.d !== null && input.d >= 106751983,
              far =
                local !== null &&
                input.z !== null &&
                local > -9221224553206775808n &&
                local < 9221224553206775807n &&
                (local - input.z > 2147483648000000n || input.z - local > 2147483648000000n),
              equality = /_(eq|ne)_/u.test(form.fn.name),
              unequal =
                local !== null &&
                input.z !== null &&
                (((local % 1000000n) + 1000000n) % 1000000n !==
                  ((input.z % 1000000n) + 1000000n) % 1000000n ||
                  input.z === 9223371331200000000n ||
                  (local - input.z) / 1000000n <
                    (localType === 'pg_catalog.date' ? -2147483647n : -2147483648n) ||
                  (local - input.z) / 1000000n >
                    (localType === 'pg_catalog.date' ? 2147483648n : 2147483647n))
            defer =
              local !== null &&
              input.z !== null &&
              !localInfinity &&
              !instantInfinity &&
              !earlyOverflow &&
              !far &&
              !(equality && unequal)
          }
          const numeric = form.fn?.result === 'pg_catalog.int4',
            targets = [output, numeric ? Number(output ?? 0) + 17 : output === true ? false : true]
          for (const target of targets) {
            const reference: Outcome = error ?? { kind: output === target ? 'True' : 'False' }
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${formIndex} SELECT d,s,z,$1::boolean,$2::integer,false FROM comparison_inputs WHERE id=$3`,
                [numeric ? null : target, numeric ? target : null, input.id],
              )
            } catch (e) {
              code = (e as { code: string }).code
            }
            expect(code, `${index}/${input.id}/${form.name}`).toBe(
              reference.kind === 'Error'
                ? '22008'
                : reference.kind === 'False'
                  ? input.id >= 30 && input.id <= 32
                    ? '22008'
                    : '23514'
                  : undefined,
            )
            const expected: Outcome = defer ? { kind: 'Unknown' } : reference
            native.push({
              profile: index,
              input: input.id,
              form: form.name,
              target,
              reference,
              expected,
              databaseSqlstate: code,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `p${index}_${form.name}_${origin}`,
                row: {
                  d: known(input.d),
                  s: known(input.s),
                  z: known(input.z),
                  expected_bool: known(numeric ? null : (target as boolean | null)),
                  expected_int: known(numeric ? (target as number | null) : null),
                  bypass: known(false),
                },
                expected,
              })
          }
        }
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            base: Row = {
              d: known(0),
              s: known(0n),
              z: known(0n),
              expected_bool: known(true),
              expected_int: known(0),
              bypass: known(false),
            }
          if (form.fn) {
            const [left, right] = form.fn.args.map(argument)
            for (const field of [left!, right!])
              for (const state of [{ kind: 'Unknown' } as Input, sqlError('22012') as Input])
                fixtures.push({
                  name,
                  row: { ...base, [field]: state },
                  expected: state as Outcome,
                })
            fixtures.push({
              name,
              row: {
                ...base,
                [left!]: sqlError('22003') as Input,
                [right!]: sqlError('22012') as Input,
              },
              expected: sqlError('22003'),
            })
          }
          fixtures.push({
            name,
            row: {
              ...base,
              d: sqlError('22003') as Input,
              s: sqlError('22003') as Input,
              z: sqlError('22012') as Input,
              bypass: known(true),
            },
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
          functions: functions.length,
          operators: operations.length - functions.length,
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
    await runCheckParity(root, 'temporal_context_comparison', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
