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
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const profiles = ['UTC', 'America/New_York', 'Europe/Dublin', '<UTC>-02', '<Etc/UTC>-02', undefined]
const forms = {
  direct: "encode(timestamptz_send(date_trunc(unit,v,zone)),'hex')",
  nested:
    "encode(timestamptz_send((ARRAY[date_trunc(unit,v,zone)::zone_trunc_domain,NULL])[1]),'hex')",
}
it('resolves explicit truncation zones before unit decoding with source/stored, nested and native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-temporal-zone-lookup-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    const source = await readFile('vendor/postgresql-timezone/Default', 'utf8'),
      abbreviations = source
        .split('\n')
        .map((l) => l.split('#')[0]!.trim().split(/\s+/u)[0]!)
        .filter(Boolean)
    expect(
      (
        await pg.query<{ v: string }>(
          "SELECT pg_read_file('/pglite/share/postgresql/timezonesets/Default') v",
        )
      ).rows[0]!.v,
    ).toBe(source)
    expect(abbreviations).toHaveLength(195)
    await pg.exec(
      `CREATE DOMAIN zone_trunc_domain AS timestamptz; CREATE TABLE zone_trunc(v timestamptz,unit text,zone text,expected text COLLATE "C",bypass bool,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE trunc_oracle_${name}(LIKE zone_trunc);ALTER TABLE trunc_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'zone_trunc')!,
      groups = profiles.map((timeZone, index) =>
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
                    c.enums,
                    c.domains,
                    origin,
                    c.rangeTypes,
                    c.compositeTypeGraph,
                    origin === 'source'
                      ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                      : undefined,
                  )!.expression,
                ),
              }
            }),
          ),
          {
            timeZone,
            timeZoneAbbreviations: 'Default',
            maxIdentifierBytes: 63,
            serverEncoding: 'UTF8',
            defaultCollation: 'C',
          },
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
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
    group.checks.forEach((g, i) => expect(g.kind, names[i]).toBe('supported'))
    for (const [index, session] of profiles.entries()) {
      await pg.exec("SET TimeZone='GMT'")
      await pg.query("SELECT set_config('TimeZone',$1,false)", [session ?? 'UTC'])
      const cases: [string | null, string | null, string | null][] = [
        ...[
          'UTC',
          'Etc/UTC',
          'GMT',
          'EST',
          'EDT',
          'MSK',
          'MSD',
          'America/New_York',
          '+02',
          '',
        ].flatMap((z) =>
          ['day', 'hour', 'timezone', 'nonsense'].flatMap((unit) =>
            ['2024-03-10 07:30:00+00', '2024-11-03 06:30:00+00', 'infinity', null].map(
              (v) => [v, unit, z] as [string | null, string, string],
            ),
          ),
        ),
        ['2000-01-01', null, ''],
        ['2000-01-01', 'day', null],
      ]
      if (index === 0)
        for (const zone of abbreviations)
          for (const v of ['1880-07-01 12:34:56+00', '2015-07-01 12:34:56+00'])
            cases.push([v, 'day', zone])
      for (const [v, unit, zone] of cases) {
        const wire = (
            await pg.query<{ v: string | null }>(
              "SELECT encode(timestamptz_send($1::timestamptz),'hex') v",
              [v],
            )
          ).rows[0]!.v,
          timestamp = wire === null ? null : Buffer.from(wire, 'hex').readBigInt64BE()
        for (const [operation, sql] of Object.entries(forms)) {
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ v: string | null }>(
                `SELECT (${sql}) v FROM(SELECT $1::timestamptz v,$2::text unit,$3::text zone)s`,
                [v, unit, zone],
              )
            ).rows[0]!.v
          } catch (e) {
            const code = (e as { code: string }).code
            expect(code).toMatch(/^[A-Z0-9]{5}$/u)
            error = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const reference: Outcome = bypass
                ? { kind: 'True' }
                : (error ?? { kind: output === expectedText ? 'True' : 'False' })
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO trunc_oracle_${operation} VALUES($1::timestamptz,$2::text,$3::text,$4::text,$5::bool)`,
                  [v, unit, zone, expectedText, bypass],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${v}/${unit}/${zone}/${operation}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const expected: Outcome =
                !bypass && v !== null && unit !== null && zone !== null && !session
                  ? { kind: 'Unknown' }
                  : reference
              native.push({
                profile: index,
                v,
                unit,
                zone,
                operation,
                reference,
                expected,
                bypass,
                expectedText,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    v: known(timestamp),
                    unit: known(unit),
                    zone: known(zone),
                    expected: known(expectedText),
                    bypass: known(bypass),
                  },
                  expected,
                })
            }
        }
      }
    }
    for (const name of names) {
      const base: Row = {
        v: known(0n),
        unit: known('day'),
        zone: known('UTC'),
        expected: known('x'),
        bypass: known(false),
      }
      for (const field of ['v', 'unit', 'zone'])
        for (const state of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[]) {
          fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: { ...base, [field]: state, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
    }
    await mkdir('artifacts/goal-checks/temporal-zone-lookup-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/temporal-zone-lookup-active/native.json',
      JSON.stringify(native, null, 2) + '\n',
    )
    await runCheckParity(root, 'temporal_zone_lookup', group, names, fixtures)
    await writeFile(
      'artifacts/goal-checks/temporal-zone-lookup-active/summary.json',
      JSON.stringify(
        {
          inserts: native.length,
          fixtures: fixtures.length,
          checks: names.length,
          profiles: profiles.length,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('witnesses forced abbreviation offsets and distinct infinity lookup order in native timezone consumers', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec("SET TimeZone='Europe/Dublin'")
    expect(
      (
        await pg.query(
          `SELECT timezone('GMT',t)=timestamp '2015-07-01 12:34:56' forced, timezone('Europe/Dublin',t)=timestamp '2015-07-01 13:34:56' full_zone,date_trunc('day',t,'GMT')=timestamptz '2015-06-30 23:00+00' truncated FROM(SELECT timestamptz '2015-07-01 12:34:56+00' t)s`,
        )
      ).rows,
    ).toEqual([{ forced: true, full_zone: true, truncated: true }])
    await pg.exec("SET TimeZone='UTC'")
    expect(
      (
        await pg.query(
          `SELECT timezone('MSD',t)=timestamp '2015-07-01 16:34:56' forced,timezone('Europe/Moscow',t)=timestamp '2015-07-01 15:34:56' full_zone,timezone('MSD',timestamp '2015-07-01 12:34:56')=timestamptz '2015-07-01 08:34:56+00' attached FROM(SELECT timestamptz '2015-07-01 12:34:56+00' t)s`,
        )
      ).rows,
    ).toEqual([{ forced: true, full_zone: true, attached: true }])
    expect(
      (
        await pg.query(
          `SELECT timezone('MSK',t)=timestamp '2000-07-01 15:34:56' forced,timezone('Europe/Moscow',t)=timestamp '2000-07-01 16:34:56' full_zone,date_trunc('day',t,'MSK')=timestamptz '2000-06-30 20:00+00' truncated,timezone('MSK',timestamp '2000-07-01 12:34:56')=timestamptz '2000-07-01 09:34:56+00' attached FROM(SELECT timestamptz '2000-07-01 12:34:56+00' t)s`,
        )
      ).rows,
    ).toEqual([{ forced: true, full_zone: true, truncated: true, attached: true }])
    for (const sign of ['infinity', '-infinity']) {
      expect(
        (
          await pg.query(
            'SELECT timezone($1::text,$2::timestamp)=$2::timestamptz attached,timezone($1::text,$2::timestamptz)=$2::timestamp projected',
            ['', sign],
          )
        ).rows,
      ).toEqual([{ attached: true, projected: true }])
      await expect(
        pg.query("SELECT date_trunc('day',$1::timestamptz,'')", [sign]),
      ).rejects.toMatchObject({ code: '22023' })
    }
  } finally {
    await pg.close()
  }
})

it('preserves accepted maximum POSIX clock forms when explicit arithmetic reuses fixed timezone profiles', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-zone-offset-boundary-')
  try {
    const expressions = {
      add: "encode(timestamptz_send(date_add(v,interval '1 month',zone)),'hex') IS NOT DISTINCT FROM expected",
      subtract:
        "encode(timestamptz_send(date_subtract(v,interval '1 month',zone)),'hex') IS NOT DISTINCT FROM expected",
    }
    await pg.exec(
      `CREATE TABLE zone_offset_boundary(v timestamptz,zone text,expected text COLLATE "C",${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'zone_offset_boundary')!,
      names: string[] = [],
      group = prepareCheckRustGroup(
        Object.entries(expressions).flatMap(([name, sql]) =>
          (['source', 'stored'] as const).map((origin) => {
            const constraint = name + '_' + origin
            names.push(constraint)
            return {
              identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint },
              expression: portableCheckAtoms(
                lowerTableCheck(
                  table,
                  table.constraints.find((k) => k.name === name)!,
                  c.enums,
                  c.domains,
                  origin,
                  c.rangeTypes,
                  c.compositeTypeGraph,
                  origin === 'source' ? `CHECK(${sql})` : undefined,
                )!.expression,
              ),
            }
          }),
        ),
        {
          timeZone: 'UTC',
          timeZoneAbbreviations: 'Default',
          maxIdentifierBytes: 63,
          serverEncoding: 'UTF8',
          defaultCollation: 'C',
        },
      ),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const zone of ['+167:59:60', '-167:59:60', '+168:00', '-168:00'])
      for (const v of ['2001-01-25 23:30+00', '2001-01-31 23:30+00', 'infinity', null]) {
        const wire = (
            await pg.query<{ v: string | null }>(
              "SELECT encode(timestamptz_send($1::timestamptz),'hex') v",
              [v],
            )
          ).rows[0]!.v,
          timestamp = wire === null ? null : Buffer.from(wire, 'hex').readBigInt64BE()
        for (const operation of ['add', 'subtract']) {
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ v: string | null }>(
                `SELECT encode(timestamptz_send(date_${operation}($1::timestamptz,interval '1 month',$2)),'hex') v`,
                [v, zone],
              )
            ).rows[0]!.v
          } catch (e) {
            const code = (e as { code: string }).code
            expect(code).toBe('22023')
            error = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          for (const expectedText of [output, 'wrong'])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: operation + '_' + origin,
                row: { v: known(timestamp), zone: known(zone), expected: known(expectedText) },
                expected: error ?? { kind: output === expectedText ? 'True' : 'False' },
              })
        }
      }
    await runCheckParity(root, 'zone_offset_boundary', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})
