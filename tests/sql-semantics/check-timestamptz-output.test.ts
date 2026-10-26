import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}

it('renders timestamptz across declared zones, DateStyles, containers and JSON with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-timestamptz-output-')),
    packet = 'artifacts/goal-checks/timestamptz-output-active',
    styles: NonNullable<CheckExecutionContext['dateStyle']>[] = [
      { format: 'ISO', order: 'MDY' },
      { format: 'SQL', order: 'MDY' },
      { format: 'SQL', order: 'DMY' },
      { format: 'Postgres', order: 'MDY' },
      { format: 'Postgres', order: 'DMY' },
      { format: 'German', order: 'DMY' },
    ],
    profiles: Pick<CheckExecutionContext, 'timeZone' | 'dateStyle'>[] = [
      ...['UTC', 'America/New_York', 'Europe/Paris'].flatMap((timeZone) =>
        styles.map((dateStyle) => ({ timeZone, dateStyle })),
      ),
      ...[
        'Asia/Kathmandu',
        'Europe/Dublin',
        'Australia/Lord_Howe',
        'Pacific/Apia',
        'EST',
        'Etc/GMT+12',
        '+02',
        'UTC+5:30',
        'ABC3DEF3,M3.2.0,M11.1.0',
      ].flatMap((timeZone) =>
        [styles[0]!, styles[4]!].map((dateStyle) => ({ timeZone, dateStyle })),
      ),
      { timeZone: 'America/New_York' },
      { dateStyle: styles[0]! },
      {},
    ],
    forms: Record<string, string> = {
      scalar: 'value::text',
      domain: 'domain_value::text',
      parsed: 'payload::timestamptz::text',
      width: 'value::varchar(13)::text',
      literal: "'2001-02-03T01:02:03Z'::timestamptz::text",
      array: 'ARRAY[value,NULL]::text',
      record: 'ROW(value,ARRAY[value,NULL])::output_record::text',
      range: "tstzrange(value,value,'[]')::text",
      multirange: "tstzmultirange(tstzrange(value,value,'[]'))::text",
      json: 'to_jsonb(value)::text',
      json_bundle: "json_build_array(value,ARRAY[value,NULL],tstzrange(value,value,'[]'))::text",
      key: 'json_build_object(value,0)::text',
      presence: '(value::text IS NOT NULL)::text',
    },
    samples: (string | null)[] = [
      null,
      '-infinity',
      'infinity',
      '2000-01-01T00:00:00Z',
      '1999-12-31T23:59:59.999999Z',
      '0001-02-03T01:02:03Z BC',
      '4714-11-24T00:00:00Z BC',
      '294276-12-31T23:59:59.999999Z',
      '1880-01-01T00:00:00Z',
      '1944-01-01T00:00:00Z',
      '2024-03-10T06:59:59.999999Z',
      '2024-03-10T07:00:00Z',
      '2024-11-03T05:59:59.999999Z',
      '2024-11-03T06:00:00Z',
      '2050-01-01T00:00:00Z',
      '2050-07-01T00:00:00Z',
      '10000-07-01T00:00:00Z',
    ],
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    await pg.exec(
      `CREATE DOMAIN output_domain AS timestamptz;CREATE TYPE output_record AS(v timestamptz,a timestamptz[]);CREATE TABLE output_values(value timestamptz,domain_value output_domain,payload text,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE output_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'output_values')!,
      groups = profiles.map((profile, index) =>
        prepareCheckRustGroup(
          Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `profile_${index}_${operation}_${origin}`
              names.push(name)
              const expression = lowerTableCheck(
                t,
                t.constraints.find((k) => k.name === operation)!,
                c.enums,
                c.domains,
                origin,
                c.rangeTypes,
                c.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                  : undefined,
              )!.expression
              expect(hasUncertain(expression), name).toBe(false)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: 'output_values',
                  constraint: name,
                },
                expression,
              }
            }),
          ),
          { ...profile, defaultCollation: 'C', serverEncoding: 'UTF8' },
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables: [], requiresRegex: false }),
        requiresRegex: false,
      }
    group.checks.forEach((k, i) =>
      expect(k.kind, names[i] + ('reason' in k ? ':' + k.reason : '')).toBe('supported'),
    )
    for (const [operation, sql] of Object.entries(forms))
      for (const value of operation === 'literal' ? [samples[0]!] : samples) {
        const cell =
          value === null
            ? null
            : Buffer.from(
                (
                  await pg.query<{ wire: string }>(
                    "SELECT encode(timestamptz_send($1::timestamptz),'hex') wire",
                    [value],
                  )
                ).rows[0]!.wire,
                'hex',
              ).readBigInt64BE()
        for (const [index, profile] of profiles.entries()) {
          await pg.query(
            "SELECT set_config('TimeZone',$1,false),set_config('DateStyle',$2,false)",
            [
              profile.timeZone ?? 'UTC',
              profile.dateStyle
                ? `${profile.dateStyle.format},${profile.dateStyle.order}`
                : 'ISO,MDY',
            ],
          )
          let output: string | null = null,
            observation: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ output: string | null }>(
                `SELECT (${sql}) output FROM(SELECT $1::timestamptz value,$1::output_domain domain_value,$1::text payload)q`,
                [value],
              )
            ).rows[0]!.output
          } catch (cause) {
            observation = failure(cause)
          }
          for (const expectedText of [output, 'wrong']) {
            const finite =
                operation === 'literal' ||
                (value !== null && value !== 'infinity' && value !== '-infinity'),
              json = ['json', 'key'].includes(operation),
              missing =
                finite &&
                operation !== 'presence' &&
                (!profile.timeZone || (!profile.dateStyle && !json)),
              expected: Outcome =
                observation.kind === 'Error'
                  ? observation
                  : { kind: expectedText === output ? 'True' : 'False' }
            if (profile.timeZone && profile.dateStyle) {
              let rejected: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${operation} VALUES($1::timestamptz,$1::output_domain,$1,$2,false)`,
                  [value, expectedText],
                )
              } catch (cause) {
                rejected = (cause as { code: string }).code
              }
              expect(rejected, `${operation} ${value} ${JSON.stringify(profile)}`).toBe(
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : expected.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
            }
            native.push({ operation, value, index, profile, expectedText, expected, missing })
            const row: Row = {
              value: input(cell),
              domain_value: input(cell),
              payload: input(value),
              expected: input(expectedText),
              bypass: input(false),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `profile_${index}_${operation}_${origin}`,
                row,
                expected: missing ? { kind: 'Unknown' } : expected,
              })
          }
        }
      }
    for (const name of names) {
      fixtures.push({
        name,
        row: {
          value: { kind: 'Unknown' },
          domain_value: { kind: 'Unknown' },
          payload: { kind: 'Unknown' },
          expected: input('safe'),
          bypass: input(true),
        },
        expected: { kind: 'True' },
      })
      if (!name.includes('_literal_'))
        for (const state of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[]) {
          fixtures.push({
            name,
            row: {
              value: state,
              domain_value: state,
              payload: state,
              expected: input('reference'),
              bypass: input(false),
            },
            expected: state as Outcome,
          })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          checks: names.length,
          profiles: profiles.length,
          samples: samples.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'timestamptz_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)

it('matches numeric TimeZone settings, POSIX offset signs and clipped labels at calendar boundaries', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-timestamptz-offset-output-')),
    profiles = [
      '+00',
      '-00',
      '2.5',
      '.5',
      '-02:30',
      '+02:30:00',
      '15:59',
      '-167.999',
      'ABCDEFGHIJKLMNO3',
      '<+05:30>-5:30',
    ].flatMap((timeZone) =>
      [false, true].map((postgres) => ({
        timeZone,
        dateStyle: {
          format: postgres ? ('Postgres' as const) : ('ISO' as const),
          order: 'DMY' as const,
        },
      })),
    ),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = []
  try {
    await pg.exec(
      'CREATE TABLE numeric_output(value timestamptz,expected text COLLATE "C",CHECK(value::text COLLATE "C" IS NOT DISTINCT FROM expected))',
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'numeric_output')!,
      k = t.constraints.find((k) => k.type === 'check')!,
      expression = lowerTableCheck(t, k, c.enums, c.domains)!.expression
    expect(hasUncertain(expression)).toBe(false)
    const groups = profiles.map((profile, index) => {
        const name = `numeric_${index}`
        names.push(name)
        return prepareCheckRustGroup(
          [
            {
              expression,
              identity: {
                schema: 'public',
                kind: 'table',
                owner: 'numeric_output',
                constraint: name,
              },
            },
          ],
          { ...profile, defaultCollation: 'C' },
        )
      }),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables: [] }),
        requiresRegex: false,
      }
    for (const [index, profile] of profiles.entries()) {
      await pg.query("SELECT set_config('TimeZone',$1,false),set_config('DateStyle',$2,false)", [
        profile.timeZone,
        `${profile.dateStyle.format},${profile.dateStyle.order}`,
      ])
      for (const value of [
        '2000-01-01T00:00:00Z',
        '4714-11-24T00:00:00Z BC',
        '294276-12-31T23:59:59.999999Z',
      ]) {
        const native = (
          await pg.query<{ output: string; wire: string }>(
            "SELECT ($1::timestamptz)::text output,encode(timestamptz_send($1::timestamptz),'hex') wire",
            [value],
          )
        ).rows[0]!
        for (const expected of [native.output, 'wrong']) {
          let code: string | undefined
          try {
            await pg.query('INSERT INTO numeric_output VALUES($1::timestamptz,$2)', [
              value,
              expected,
            ])
          } catch (cause) {
            code = (cause as { code: string }).code
          }
          expect(code, `${value} ${JSON.stringify(profile)}`).toBe(
            expected === native.output ? undefined : '23514',
          )
          fixtures.push({
            name: names[index]!,
            row: {
              value: input(Buffer.from(native.wire, 'hex').readBigInt64BE()),
              expected: input(expected),
            },
            expected: { kind: expected === native.output ? 'True' : 'False' },
          })
        }
      }
    }
    await runCheckParity(root, 'timestamptz_numeric_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
