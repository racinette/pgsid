import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
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

const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}

it('renders calendar text for every DateStyle with scalar, domain, container, JSON and native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-calendar-output-')),
    packet = 'artifacts/goal-checks/calendar-output-active',
    styles: NonNullable<CheckExecutionContext['dateStyle']>[] = (
      ['ISO', 'SQL', 'Postgres', 'German'] as const
    ).flatMap((format) => (['MDY', 'DMY', 'YMD'] as const).map((order) => ({ format, order }))),
    profiles = [...styles, undefined],
    profileName = (p: CheckExecutionContext['dateStyle']) =>
      p ? p.format.toLowerCase() + '_' + p.order.toLowerCase() : 'missing',
    types = [
      {
        name: 'day',
        type: 'date',
        range: 'daterange',
        values: [
          null,
          '-infinity',
          'infinity',
          '0001-01-01',
          '0001-02-03 BC',
          '2000-01-01',
          '2001-02-03',
          '4714-11-24 BC',
          '5874897-12-31',
        ],
      },
      {
        name: 'stamp',
        type: 'timestamp',
        range: 'tsrange',
        values: [
          null,
          '-infinity',
          'infinity',
          '0001-01-01 00:00:00',
          '0001-02-03 01:02:03.000004 BC',
          '2000-01-01 00:00:00',
          '1999-12-31 23:59:59.999999',
          '2001-02-03 01:02:03.120000',
          '4714-11-24 00:00:00 BC',
          '294276-12-31 23:59:59.999999',
        ],
      },
    ],
    forms = types.flatMap((t) =>
      Object.entries({
        scalar: 'value::text',
        domain: 'domain_value::text',
        parsed: `payload::${t.type}::text`,
        width: 'value::varchar(13)::text',
        literal: `'2001-02-03'::${t.type}::text`,
        array: 'ARRAY[value,NULL]::text',
        record: `ROW(value,ARRAY[value,NULL])::calendar_${t.name}::text`,
        range: `${t.range}(value,value,'[]')::text`,
        iso_json: 'to_jsonb(value)::text',
        json_bundle: `json_build_array(to_json(value),to_jsonb(value),to_jsonb(${t.range}(value,value,'[]')))::text`,
      }).map(([operation, sql]) => ({ ...t, name: t.name + '_' + operation, operation, sql })),
    ),
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    for (const t of types)
      await pg.exec(
        `CREATE DOMAIN domain_${t.name} AS ${t.type};CREATE TYPE calendar_${t.name} AS(v ${t.type},a ${t.type}[]);CREATE TABLE calendar_${t.name}_values(value ${t.type},domain_value domain_${t.name},payload text,expected text COLLATE "C",bypass boolean,${forms
          .filter((f) => f.type === t.type)
          .map(
            (f) =>
              `CONSTRAINT ${f.name} CHECK(CASE WHEN bypass THEN true ELSE (${f.sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
          )
          .join(',')})`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE oracle_${f.name}(LIKE calendar_${f.type === 'date' ? 'day' : 'stamp'}_values);ALTER TABLE oracle_${f.name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${f.sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      names: string[] = [],
      groups = profiles.map((dateStyle) =>
        prepareCheckRustGroup(
          forms.flatMap((f) =>
            (['source', 'stored'] as const).map((origin) => {
              const t = c.tables.find(
                  (t) => t.name === `calendar_${f.type === 'date' ? 'day' : 'stamp'}_values`,
                )!,
                k = t.constraints.find((k) => k.name === f.name)!,
                name = `${profileName(dateStyle)}_${f.name}_${origin}`
              names.push(name)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: profileName(dateStyle),
                  constraint: name,
                },
                expression: lowerTableCheck(
                  t,
                  k,
                  c.enums,
                  c.domains,
                  origin,
                  c.rangeTypes,
                  c.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${f.sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
              }
            }),
          ),
          { defaultCollation: 'C', serverEncoding: 'UTF8', ...(dateStyle ? { dateStyle } : {}) },
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables: [] }),
        requiresRegex: false,
      }
    group.checks.forEach((k, i) =>
      expect(k.kind, names[i] + ('reason' in k ? ':' + k.reason : '')).toBe('supported'),
    )
    for (const f of forms)
      for (const value of f.values) {
        const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${f.type === 'date' ? 'date_send' : 'timestamp_send'}($1::text::${f.type}),'hex') wire`,
              [value],
            )
          ).rows[0]!.wire,
          cell =
            wire === null
              ? null
              : f.type === 'date'
                ? Buffer.from(wire, 'hex').readInt32BE()
                : Buffer.from(wire, 'hex').readBigInt64BE(),
          from = `FROM (SELECT $1::text::${f.type} value,$1::text::domain_${f.type === 'date' ? 'day' : 'stamp'} domain_value,$1::text payload,$2::text COLLATE "C" expected,$3::boolean bypass) q`,
          params: (string | boolean | null)[] = [value, 'safe', false],
          observations = new Map<string, { output: string | null; outcome: Outcome }>()
        for (const style of styles) {
          await pg.exec(`SET DateStyle='${style.format},${style.order}'`)
          try {
            const output = (
              await pg.query<{ output: string | null }>(`SELECT (${f.sql}) output ${from}`, params)
            ).rows[0]!.output
            observations.set(profileName(style), { output, outcome: { kind: 'True' } })
          } catch (cause) {
            observations.set(profileName(style), { output: null, outcome: failure(cause) })
          }
        }
        const invariant =
          new Set([...observations.values()].map((o) => JSON.stringify(o))).size === 1
        for (const profile of profiles) {
          const p = profile ?? styles[0]!
          await pg.exec(`SET DateStyle='${p.format},${p.order}'`)
          const reference = observations.get(profileName(p))!
          for (const expectedText of [reference.output, 'wrong']) {
            params[1] = expectedText
            let expected: Outcome
            try {
              const answer = (
                await pg.query<{ answer: boolean }>(
                  `SELECT (${f.sql}) COLLATE "C" IS NOT DISTINCT FROM expected answer ${from}`,
                  params,
                )
              ).rows[0]!.answer
              expected = { kind: answer ? 'True' : 'False' }
            } catch (cause) {
              expected = failure(cause)
            }
            if (profile) {
              let rejected: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${f.name} VALUES($1::text::${f.type},$1::text::domain_${f.type === 'date' ? 'day' : 'stamp'},$1,$2,$3)`,
                  params,
                )
              } catch (cause) {
                rejected = (cause as { code: string }).code
              }
              expect(rejected, f.name).toBe(
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : expected.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
            }
            native.push({
              name: f.name,
              value,
              profile: profileName(profile),
              expectedText,
              expected,
              invariant,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `${profileName(profile)}_${f.name}_${origin}`,
                row: {
                  value: input(cell),
                  domain_value: input(cell),
                  payload: input(value),
                  expected: input(expectedText),
                  bypass: input(false),
                },
                expected: !profile && !invariant ? { kind: 'Unknown' } : expected,
              })
          }
        }
      }
    for (const f of forms)
      for (const profile of profiles)
        for (const origin of ['source', 'stored']) {
          const name = `${profileName(profile)}_${f.name}_${origin}`,
            row: Row = {
              value: { kind: 'Unknown' },
              domain_value: { kind: 'Unknown' },
              payload: { kind: 'Unknown' },
              expected: input('safe'),
              bypass: input(true),
            }
          fixtures.push({ name, row, expected: { kind: 'True' } })
          if (['scalar', 'domain', 'parsed'].includes(f.operation)) {
            fixtures.push({
              name,
              row: { ...row, bypass: input(false) },
              expected: { kind: 'Unknown' },
            })
            const error: Input = { kind: 'Error', value: { state: parseInt('22008', 36) } }
            fixtures.push({
              name,
              row: {
                ...row,
                value: error,
                domain_value: error,
                payload: error,
                bypass: input(false),
              },
              expected: error as Outcome,
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
          profiles: profiles.map(profileName),
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'calendar_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('retains calendar output nullness and reached parsing errors without DateStyle', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-calendar-nullness-'))
  try {
    const sqls = {
      day: '(payload::date::text IS NOT NULL) IS NOT DISTINCT FROM expected',
      stamp: '(payload::timestamp::text IS NOT NULL) IS NOT DISTINCT FROM expected',
      lazy: 'CASE WHEN bypass THEN true ELSE (payload::date::text IS NOT NULL) IS NOT DISTINCT FROM expected END',
    }
    await pg.exec(
      `CREATE TABLE calendar_nullness(payload text,expected boolean,bypass boolean,${Object.entries(
        sqls,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'calendar_nullness')!,
      plans = Object.entries(sqls).flatMap(([operation, sql]) =>
        (['source', 'stored'] as const).map((origin) => ({
          name: operation + '_' + origin,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: t.name,
            constraint: operation + '_' + origin,
          },
          expression: lowerTableCheck(
            t,
            t.constraints.find((c) => c.name === operation)!,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? `CHECK(${sql})` : undefined,
          )!.expression,
        })),
      ),
      group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [operation, sql] of Object.entries(sqls))
      for (const payload of [
        null,
        '2001-02-03',
        '0001-02-03 BC',
        'infinity',
        '-infinity',
        '2001-02-30',
        '',
      ])
        for (const bypass of [false, true]) {
          let expected: Outcome
          try {
            const answer = (
              await pg.query<{ answer: boolean }>(
                `SELECT (${sql}) answer FROM(SELECT $1::text payload,$2::boolean expected,$3::boolean bypass) q`,
                [payload, payload !== null, bypass],
              )
            ).rows[0]!.answer
            expected = { kind: answer ? 'True' : 'False' }
          } catch (cause) {
            expected = failure(cause)
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: operation + '_' + origin,
              row: {
                payload: input(payload),
                expected: input(payload !== null),
                bypass: input(bypass),
              },
              expected,
            })
        }
    await runCheckParity(
      root,
      'calendar_nullness',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)
