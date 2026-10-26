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
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}

it('shares explicit bytea output through scalar casts, containers and JSON with native INSERT and missing-context parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-bytea-output-')),
    packet = 'artifacts/goal-checks/bytea-output-active',
    profiles = ['hex', 'escape', undefined] as const,
    profileName = (value: string | undefined) => value ?? 'missing',
    outputs: Record<string, string> = {
      scalar: 'value::text',
      domain: 'domain_value::text',
      parsed: 'payload::bytea::text',
      varchar: 'value::varchar(8)::text',
      padded: 'value::char(20)::text',
      selected: '(CASE WHEN choose_value THEN value ELSE NULL::bytea END)::text',
      coalesced: "COALESCE(value,'\\x005c7fff'::bytea)::text",
      literal: "'\\x005c7fff'::bytea::text",
      array: 'ARRAY[value,NULL::bytea]::text',
      record: 'ROW(value,ARRAY[value,NULL::bytea])::bytea_packet::text',
      range: "bytea_span(value,value,'[]')::text",
      json: 'to_json(value)::text',
      jsonb: 'to_jsonb(value)::text',
      json_bundle:
        'json_build_array(to_json(ARRAY[value,NULL]),row_to_json(ROW(value,ARRAY[value,NULL])::bytea_packet),json_build_object(VARIADIC ARRAY[value,value]))::text',
      jsonb_bundle:
        'jsonb_build_array(to_jsonb(ARRAY[value,NULL]),to_jsonb(ROW(value,ARRAY[value,NULL])::bytea_packet),jsonb_build_object(VARIADIC ARRAY[value,value]))::text',
      json_key: 'json_build_object(value,value)::text',
      jsonb_key: 'jsonb_build_object(value,value)::text',
      lazy: 'CASE WHEN choose_value THEN expected ELSE set_byte(value,1/divisor,1)::text END',
      error: 'set_byte(value,1/divisor,1)::text',
    },
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    await pg.exec(`CREATE DOMAIN bytea_domain AS bytea;
      CREATE TYPE bytea_packet AS(v bytea,a bytea[]);
      CREATE TYPE bytea_span AS RANGE(subtype=bytea);
      CREATE TABLE bytea_output_values(payload text,value bytea,domain_value bytea_domain,expected text COLLATE "C",choose_value boolean,divisor integer,bypass boolean,
      ${Object.entries(outputs)
        .map(
          ([name, sql]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`)
    for (const [name, sql] of Object.entries(outputs))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE bytea_output_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'bytea_output_values')!,
      names: string[] = [],
      groups = profiles.map((byteaOutput) =>
        prepareCheckRustGroup(
          Object.entries(outputs).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `${profileName(byteaOutput)}_${operation}_${origin}`
              names.push(name)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: profileName(byteaOutput),
                  constraint: name,
                },
                expression: lowerTableCheck(
                  table,
                  table.constraints.find((c) => c.name === operation)!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
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
            ...(byteaOutput === undefined ? {} : { byteaOutput }),
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
    group.checks.forEach((check, i) =>
      expect(check.kind, names[i] + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      ),
    )
    const baseValues = [
      null,
      '',
      '00',
      '01',
      '1f',
      '20',
      '22',
      '27',
      '5c',
      '7e',
      '7f',
      '80ff',
      '615c0062',
      Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0')).join(''),
    ]
    for (const [operation, sql] of Object.entries(outputs)) {
      const values = ['scalar', 'parsed'].includes(operation)
        ? [...baseValues, ...Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))]
        : baseValues
      const candidates = [
        ...values.map((value) => ({
          value,
          choose: true,
          divisor: 1,
          payload: value === null ? null : '\\x' + value,
        })),
        { value: '00615cff', choose: false, divisor: 0, payload: '\\x00615cff' },
        { value: '00615cff', choose: true, divisor: 0, payload: '\\x00615cff' },
        { value: '00615cff', choose: true, divisor: 1, payload: '\\xGG' },
      ]
      for (const candidate of candidates) {
        const row: Row = {
            value: input(candidate.value),
            domain_value: input(candidate.value),
            payload: input(candidate.payload),
            expected: input('safe'),
            choose_value: input(candidate.choose),
            divisor: { kind: 'Value', value: candidate.divisor },
            bypass: input(false),
          },
          params = [
            candidate.payload,
            candidate.value === null ? null : '\\x' + candidate.value,
            'safe',
            candidate.choose,
            candidate.divisor,
            false,
          ],
          from =
            'FROM (SELECT $1::text payload,$2::text::bytea value,$2::text::bytea_domain domain_value,$3::text COLLATE "C" expected,$4::boolean choose_value,$5::integer divisor,$6::boolean bypass) q',
          observations = new Map<string, { output: string | null; outcome: Outcome }>()
        for (const setting of ['hex', 'escape']) {
          await pg.exec(`SET bytea_output=${setting}`)
          try {
            const output = (
              await pg.query<{ output: string | null }>(`SELECT (${sql}) output ${from}`, params)
            ).rows[0]!.output
            observations.set(setting, { output, outcome: { kind: 'True' } })
          } catch (cause) {
            observations.set(setting, { output: null, outcome: failure(cause) })
          }
        }
        const invariant =
          JSON.stringify(observations.get('hex')) === JSON.stringify(observations.get('escape'))
        for (const profile of profiles) {
          await pg.exec(`SET bytea_output=${profile ?? 'hex'}`)
          const reference = observations.get(profile ?? 'hex')!
          for (const expectedText of [reference.output, 'wrong']) {
            params[2] = expectedText
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
            if (profile !== undefined) {
              let rejected: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${operation} VALUES($1,$2::text::bytea,$2::text::bytea_domain,$3,$4,$5,$6)`,
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
            const local =
              profile === undefined && !invariant ? { kind: 'Unknown' as const } : expected
            native.push({
              operation,
              candidate,
              profile: profileName(profile),
              expectedText,
              invariant,
              expected,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `${profileName(profile)}_${operation}_${origin}`,
                row: { ...row, expected: input(expectedText) },
                expected: local,
              })
          }
        }
      }
      for (const profile of profiles)
        for (const origin of ['source', 'stored']) {
          const name = `${profileName(profile)}_${operation}_${origin}`,
            row: Row = {
              value: { kind: 'Unknown' },
              domain_value: { kind: 'Unknown' },
              payload: { kind: 'Unknown' },
              expected: input('safe'),
              choose_value: input(true),
              divisor: { kind: 'Value', value: 1 },
              bypass: input(true),
            }
          fixtures.push({ name, row, expected: { kind: 'True' } })
          if (['scalar', 'domain', 'parsed'].includes(operation)) {
            fixtures.push({
              name,
              row: { ...row, bypass: input(false) },
              expected: { kind: 'Unknown' },
            })
            const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
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
    await runCheckParity(root, 'bytea_output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)

it('recovers bounded bytea output nullness without the setting and preserves reached errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-bytea-output-nullness-'))
  try {
    const expressions: Record<string, string> = {
      direct: '(value::text IS NOT NULL) IS NOT DISTINCT FROM expected',
      parsed: '(payload::bytea::text IS NOT NULL) IS NOT DISTINCT FROM expected',
      selected:
        '(CASE WHEN bypass THEN NULL::text ELSE value::text END IS NOT NULL) IS NOT DISTINCT FROM expected',
      error: '(set_byte(value,1/divisor,1)::text IS NOT NULL) IS NOT DISTINCT FROM expected',
    }
    await pg.exec(
      `CREATE TABLE output_nullness(value bytea,payload text,expected boolean,bypass boolean,divisor integer,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'output_nullness')!,
      plans = Object.entries(expressions).flatMap(([operation, sql]) =>
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
    for (const [operation, sql] of Object.entries(expressions))
      for (const value of [null, '', '00', '015c7f80ff'])
        for (const bypass of [false, true])
          for (const divisor of [0, 1]) {
            let expected: Outcome
            const present = value !== null && !(operation === 'selected' && bypass),
              payload = value === null ? null : '\\x' + value
            try {
              const answer = (
                await pg.query<{ answer: boolean }>(
                  `SELECT (${sql}) answer FROM (SELECT $1::text::bytea value,$1::text payload,$2::boolean expected,$3::boolean bypass,$4::integer divisor) q`,
                  [payload, present, bypass, divisor],
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
                  value: input(value),
                  payload: input(payload),
                  expected: input(present),
                  bypass: input(bypass),
                  divisor: { kind: 'Value', value: divisor },
                },
                expected,
              })
          }
    for (const operation of ['direct', 'parsed'])
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: operation + '_' + origin,
          row: { value: { kind: 'Unknown' }, payload: { kind: 'Unknown' }, expected: input(true) },
          expected: { kind: 'Unknown' },
        })
    await runCheckParity(
      root,
      'bytea_output_nullness',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)
