import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { deferredIntervalContextForms } from './check-interval-input-forms.js'

const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}
const styles = ['postgres', 'postgres_verbose', 'sql_standard', 'iso_8601'] as const

it('uses interval input context across precision, domains and containers while preserving captured literals and no-context agreement', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-interval-input-context-')),
    packet = 'artifacts/goal-checks/interval-input-context-active',
    profiles = [...styles, undefined],
    values: Record<string, string> = {
      scalar: 'source::interval',
      precision: 'source::interval day to second(3)',
      domain: 'source::context_negative',
      array: '(array_source::interval[])[1]',
      array_cast: '(ARRAY[source]::interval[])[1]',
      record: '(record_source::context_record).v',
      range: 'lower(range_source::context_range)',
      multirange: 'lower(multirange_source::context_set)',
      roundtrip: '(source::interval::text)::interval',
      literal: "INTERVAL '-1 day 2 hours'",
      literal_array: `('{"-1 day 2 hours"}'::interval[])[1]`,
      literal_record: `('("-1 day 2 hours")'::context_record).v`,
      literal_range: `lower('["-1 day 2 hours","-1 day 2 hours"]'::context_range)`,
      literal_multirange: `lower('{["-1 day 2 hours","-1 day 2 hours"]}'::context_set)`,
    },
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    await pg.exec(
      `SET IntervalStyle=postgres;CREATE DOMAIN context_negative AS interval CHECK(extract(hour from VALUE)<=0);CREATE TYPE context_record AS(v interval);CREATE TYPE context_range AS RANGE(subtype=interval,multirange_type_name=context_set)`,
    )
    const outputs = Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        name,
        `encode(interval_send(${value}),'hex')`,
      ]),
    )
    await pg.exec(
      `CREATE TABLE context_input_values(source text,array_source text,record_source text,range_source text,multirange_source text,expected text COLLATE "C",bypass boolean,${Object.entries(
        outputs,
      )
        .map(
          ([name, output]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`,
    )
    for (const [name, output] of Object.entries(outputs))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE context_input_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const literalWire = (
      await pg.query<{ wire: string }>(
        "SELECT encode(interval_send(INTERVAL '-1 day 2 hours'),'hex') wire",
      )
    ).rows[0]!.wire
    await pg.exec('SET IntervalStyle=sql_standard')
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'context_input_values')!,
      names: string[] = [],
      groups = profiles.map((intervalStyle) =>
        prepareCheckRustGroup(
          Object.entries(outputs).flatMap(([operation, output]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `${intervalStyle ?? 'missing'}_${operation}_${origin}`
              names.push(name)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: intervalStyle ?? 'missing',
                  constraint: name,
                },
                expression: lowerTableCheck(
                  t,
                  t.constraints.find((k) => k.name === operation)!,
                  c.enums,
                  c.domains,
                  origin,
                  c.rangeTypes,
                  c.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
              }
            }),
          ),
          {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            arrayNulls: true,
            ...(intervalStyle ? { intervalStyle } : {}),
          },
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
    const samples: (string | null)[] = [
      ...deferredIntervalContextForms,
      null,
      '',
      '0',
      'P-1DT2H',
      '-0 day 0 hours',
      '-1 day 0 hours',
      '-0 day 2 hours',
      '-1 day +2 hours',
      '-1 day -2 hours',
      '@ -1 day 2 hours',
      '@ -1 day 2 hours ago',
      '-1-2 3 04:05:06.1234567',
      '-1 02:03.4567895',
      '-1 02:03:04.1235',
      '-1.5 days 2.5 hours',
      '-1 year 0 mons',
      '-2147483648 months 2147483648 days',
      '-2147483648 days 2147483648 months',
      '-1 microsecond 9223372036854775807 microseconds',
      '-1 second 9223372036854775808 microseconds',
      '-2147483648 months 0 days ago',
      '-1 day 1:99',
      '-1 day invalid',
      '-1 day 2 days',
      '-1.5 02:03',
      '-1 month 2 weeks',
      '-1 week 2 days',
      '-1 02:03 4',
      '-1 day 2 hours 3 minutes 4.123456 seconds',
      'infinity',
      '-infinity',
    ]
    for (const unit of [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
    ])
      for (const number of ['0', '1', '1.5', '2147483648']) samples.push(`-1 day ${number} ${unit}`)
    for (const [operation, output] of Object.entries(outputs))
      for (const source of operation.startsWith('literal') ? [null, samples[0]!] : samples) {
        const escaped =
            source === null ? '' : source.replaceAll('\\', '\\\\').replaceAll('"', '\\"'),
          array_source = source === null ? '{NULL,NULL}' : '{"' + escaped + '",NULL}',
          record_source = source === null ? '()' : '("' + escaped + '")',
          range_source = source === null ? '(,)' : '["' + escaped + '","' + escaped + '"]',
          multirange_source = '{' + range_source + '}',
          params: (string | boolean | null)[] = [
            source,
            array_source,
            record_source,
            range_source,
            multirange_source,
            null,
            false,
          ],
          from =
            'FROM(SELECT $1::text source,$2::text array_source,$3::text record_source,$4::text range_source,$5::text multirange_source,$6::text COLLATE "C" expected,$7::boolean bypass) q',
          observations = new Map<string, { wire: string | null; outcome: Outcome }>()
        for (const style of styles) {
          await pg.exec(`SET IntervalStyle=${style}`)
          try {
            const wire = operation.startsWith('literal')
              ? literalWire
              : (await pg.query<{ wire: string | null }>(`SELECT (${output}) wire ${from}`, params))
                  .rows[0]!.wire
            observations.set(style, { wire, outcome: { kind: 'True' } })
          } catch (cause) {
            observations.set(style, { wire: null, outcome: failure(cause) })
          }
        }
        const invariant =
          new Set([...observations.values()].map((v) => JSON.stringify(v))).size === 1
        for (const profile of profiles) {
          await pg.exec(`SET IntervalStyle=${profile ?? 'postgres'}`)
          const observation = observations.get(profile ?? 'postgres')!
          for (const expectedText of [observation.wire, 'wrong']) {
            params[5] = expectedText
            const expected: Outcome =
              observation.outcome.kind === 'Error'
                ? observation.outcome
                : { kind: expectedText === observation.wire ? 'True' : 'False' }
            if (profile) {
              let rejected: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${operation} VALUES($1,$2,$3,$4,$5,$6,$7)`,
                  params,
                )
              } catch (cause) {
                rejected = (cause as { code: string }).code
              }
              expect(rejected, `${operation} ${source} ${profile}`).toBe(
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : expected.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
            }
            native.push({
              operation,
              source,
              profile: profile ?? 'missing',
              expectedText,
              invariant,
              expected,
            })
            const row: Row = {
              source: input(source),
              array_source: input(array_source),
              record_source: input(record_source),
              range_source: input(range_source),
              multirange_source: input(multirange_source),
              expected: input(expectedText),
              bypass: input(false),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `${profile ?? 'missing'}_${operation}_${origin}`,
                row,
                expected: !profile && !invariant ? { kind: 'Unknown' } : expected,
              })
          }
        }
      }
    for (const name of names) {
      const row: Row = {
        source: { kind: 'Unknown' },
        array_source: { kind: 'Unknown' },
        record_source: { kind: 'Unknown' },
        range_source: { kind: 'Unknown' },
        multirange_source: { kind: 'Unknown' },
        expected: input(literalWire),
        bypass: input(true),
      }
      fixtures.push({ name, row, expected: { kind: 'True' } })
      for (const state of [
        { kind: 'Unknown' },
        { kind: 'Null' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        const literal = name.includes('_literal'),
          row: Row = {
            source: state,
            array_source: state,
            record_source: state,
            range_source: state,
            multirange_source: state,
            expected: input(literal ? literalWire : null),
            bypass: input(false),
          }
        fixtures.push({
          name,
          row,
          expected: literal || state.kind === 'Null' ? { kind: 'True' } : (state as Outcome),
        })
        fixtures.push({ name, row: { ...row, bypass: input(true) }, expected: { kind: 'True' } })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        { inserts, fixtures: fixtures.length, checks: names.length, samples: samples.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'interval_input_context', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
