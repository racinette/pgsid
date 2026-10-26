import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
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

const input = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}
const styles = ['postgres', 'postgres_verbose', 'sql_standard', 'iso_8601'] as const

it('formats interval components in every style through scalar, container and JSON output with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-interval-output-')),
    packet = 'artifacts/goal-checks/interval-output-active',
    profiles = [...styles, undefined],
    outputs: Record<string, string> = {
      scalar: 'value::text',
      domain: 'domain_value::text',
      parsed: 'payload::interval::text',
      width: 'value::varchar(15)::text',
      literal: "'-1 mons +2 days -3.000004 seconds'::interval::text",
      array: 'ARRAY[value,NULL]::text',
      record: 'ROW(value,ARRAY[value,NULL])::interval_packet::text',
      range: "interval_span(value,value,'[]')::text",
      multirange: "interval_set(interval_span(value,value,'[]'))::text",
      json: 'to_jsonb(value)::text',
      json_bundle:
        'json_build_array(to_json(value),to_jsonb(value),jsonb_build_object(VARIADIC ARRAY[value,value]))::text',
      presence: "CASE WHEN value::text IS NULL THEN 'null' ELSE 'present' END",
    },
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    await pg.exec(
      `CREATE DOMAIN interval_domain AS interval;CREATE TYPE interval_packet AS(v interval,a interval[]);CREATE TYPE interval_span AS RANGE(subtype=interval,multirange_type_name=interval_set);CREATE TABLE interval_output_values(value interval,domain_value interval_domain,payload text,expected text COLLATE "C",bypass boolean,${Object.entries(
        outputs,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(outputs))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE interval_output_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'interval_output_values')!,
      names: string[] = [],
      groups = profiles.map((intervalStyle) =>
        prepareCheckRustGroup(
          Object.entries(outputs).flatMap(([operation, sql]) =>
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
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
              }
            }),
          ),
          {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
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
    const signed = (n: number | bigint) => (n >= 0 ? '+' + n : String(n)),
      source = (months: number, days: number, time: bigint) =>
        `${signed(months)} mons ${signed(days)} days ${signed(time)} microseconds`,
      basic: (string | null)[] = [
        null,
        'infinity',
        '-infinity',
        source(0, 0, 0n),
        source(14, 3, 14706123456n),
        source(-14, -3, -14706123456n),
        source(-14, 3, -14706123456n),
        source(1, -2, 3000004n),
        source(0, 0, -1n),
        source(-2147483648, 2147483647, -9223372036854775808n),
        source(2147483647, -2147483648, 9223372036854775807n),
      ],
      matrix: (string | null)[] = [...basic]
    for (const months of [-14, -12, -1, 0, 1, 12, 14])
      for (const days of [-2, -1, 0, 1, 2])
        for (const time of [-61000001n, -1000000n, -1n, 0n, 1n, 1000000n, 61000001n])
          matrix.push(source(months, days, time))
    for (const [operation, sql] of Object.entries(outputs))
      for (const payload of operation === 'scalar' ? matrix : basic) {
        const wire = (
            await pg.query<{ wire: string | null }>(
              "SELECT encode(interval_send($1::text::interval),'hex') wire",
              [payload],
            )
          ).rows[0]!.wire,
          b = wire === null ? null : Buffer.from(wire, 'hex'),
          cell =
            b === null
              ? null
              : { time: b.readBigInt64BE(0), days: b.readInt32BE(8), months: b.readInt32BE(12) },
          params: (string | boolean | null)[] = [payload, 'safe', false],
          from =
            'FROM(SELECT $1::text::interval value,$1::text::interval_domain domain_value,$1::text payload,$2::text COLLATE "C" expected,$3::boolean bypass) q',
          observations = new Map<string, { output: string | null; outcome: Outcome }>()
        for (const style of styles) {
          await pg.exec(`SET IntervalStyle=${style}`)
          try {
            const output = (
              await pg.query<{ output: string | null }>(`SELECT (${sql}) output ${from}`, params)
            ).rows[0]!.output
            observations.set(style, { output, outcome: { kind: 'True' } })
          } catch (cause) {
            observations.set(style, { output: null, outcome: failure(cause) })
          }
        }
        const invariant =
          new Set([...observations.values()].map((v) => JSON.stringify(v))).size === 1
        for (const profile of profiles) {
          await pg.exec(`SET IntervalStyle=${profile ?? 'postgres'}`)
          const reference = observations.get(profile ?? 'postgres')!
          for (const expectedText of [reference.output, 'wrong']) {
            params[1] = expectedText
            let expected: Outcome
            try {
              const answer = (
                await pg.query<{ answer: boolean }>(
                  `SELECT (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected answer ${from}`,
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
                  `INSERT INTO oracle_${operation} VALUES($1::text::interval,$1::text::interval_domain,$1,$2,$3)`,
                  params,
                )
              } catch (cause) {
                rejected = (cause as { code: string }).code
              }
              expect(rejected, operation).toBe(
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
              payload,
              profile: profile ?? 'missing',
              expectedText,
              invariant,
              expected,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `${profile ?? 'missing'}_${operation}_${origin}`,
                row: {
                  value: input(cell),
                  domain_value: input(cell),
                  payload: input(payload),
                  expected: input(expectedText),
                  bypass: input(false),
                },
                expected: !profile && !invariant ? { kind: 'Unknown' } : expected,
              })
          }
        }
      }
    for (const operation of Object.keys(outputs))
      for (const profile of profiles)
        for (const origin of ['source', 'stored']) {
          const name = `${profile ?? 'missing'}_${operation}_${origin}`,
            row: Row = {
              value: { kind: 'Unknown' },
              domain_value: { kind: 'Unknown' },
              payload: { kind: 'Unknown' },
              expected: input('safe'),
              bypass: input(true),
            }
          fixtures.push({ name, row, expected: { kind: 'True' } })
          if (['scalar', 'domain', 'parsed'].includes(operation)) {
            fixtures.push({
              name,
              row: { ...row, bypass: input(false) },
              expected: { kind: 'Unknown' },
            })
            const error: Input = { kind: 'Error', value: { state: parseInt('22015', 36) } }
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
        { inserts, fixtures: fixtures.length, checks: names.length, styles },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'interval_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
