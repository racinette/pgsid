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

const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((cause as { code: string }).code, 36) },
})

it('connects scalar float text casts to shared rendering with explicit context, literal precision and native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-float-text-casts-')),
    packet = 'artifacts/goal-checks/float-text-casts-active',
    profiles = [-15, 0, 3, undefined] as const,
    profileName = (extra: number | undefined) =>
      extra === undefined ? 'missing' : 'p' + String(extra).replace('-', 'm'),
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  let inserts = 0
  try {
    const types = [
      {
        name: 'single',
        type: 'float4',
        values: [
          '-0',
          '0',
          '1',
          '10',
          '1.25',
          '1.23456789',
          '1e-45',
          '1.17549435e-38',
          '3.4028234e38',
          'NaN',
          'Infinity',
          '-Infinity',
          null,
        ],
      },
      {
        name: 'double',
        type: 'float8',
        values: [
          '-0',
          '0',
          '1',
          '10',
          '1.25',
          '1.2345678901234567',
          '5e-324',
          '2.2250738585072014e-308',
          '1.7976931348623157e308',
          'NaN',
          'Infinity',
          '-Infinity',
          null,
        ],
      },
    ] as const
    const forms = types.flatMap((item) => {
      const value = `payload::${item.type}`,
        outputs = {
          direct: 'value::text',
          domain: 'domain_value::text',
          parsed: `${value}::text`,
          varchar: `${value}::varchar(7)::text`,
          padded: `${value}::char(24)::text`,
          selected: `(CASE WHEN choose_value THEN value ELSE 'NaN'::${item.type} END)::text`,
          coalesce: `(COALESCE(value,'-0'::${item.type}))::text`,
          literal: `(CASE WHEN choose_value THEN 1.2345678901234567::${item.type}::text ELSE expected END)`,
          division: `(value/divisor::${item.type})::text`,
          lazy: `(CASE WHEN choose_value THEN expected ELSE (value/divisor::${item.type})::text END)`,
        }
      return Object.entries(outputs).map(([operation, output]) => ({
        ...item,
        name: item.name + '_' + operation,
        operation,
        output,
      }))
    })
    for (const item of types) {
      await pg.exec(`CREATE DOMAIN cast_${item.name} AS ${item.type};
        CREATE TABLE cast_${item.name}_values(payload text,value ${item.type},domain_value cast_${item.name},expected text COLLATE "C",choose_value boolean,divisor integer,bypass boolean,
        ${forms
          .filter((f) => f.type === item.type)
          .map(
            (f) =>
              `CONSTRAINT ${f.name} CHECK(CASE WHEN bypass THEN true ELSE (${f.output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
          )
          .join(',')})`)
    }
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE oracle_${form.name}(LIKE cast_${form.type === 'float4' ? 'single' : 'double'}_values)`,
      )
    for (const form of forms)
      await pg.exec(
        `ALTER TABLE oracle_${form.name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      groups = profiles.map((extra) =>
        prepareCheckRustGroup(
          forms.flatMap((form) => {
            const table = catalog.tables.find(
                (t) => t.name === `cast_${form.type === 'float4' ? 'single' : 'double'}_values`,
              )!,
              constraint = table.constraints.find((c) => c.name === form.name)!
            return (['source', 'stored'] as const).map((origin) => {
              const name = `${profileName(extra)}_${form.name}_${origin}`
              names.push(name)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: profileName(extra),
                  constraint: name,
                },
                expression: lowerTableCheck(
                  table,
                  constraint,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
              }
            })
          }),
          {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            ...(extra === undefined ? {} : { extraFloatDigits: extra }),
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
    group.checks.forEach((check, index) =>
      expect(check.kind, names[index] + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      ),
    )
    for (const form of forms) {
      const candidates = [
        ...form.values.map((payload) => ({ payload, source: payload, choose: true, divisor: 1 })),
        { payload: 'bad', source: '1.25', choose: true, divisor: 1 },
        { payload: '1e999', source: '1.25', choose: true, divisor: 1 },
        { payload: '1.25', source: '1.25', choose: false, divisor: 0 },
        { payload: '1.25', source: '1.25', choose: true, divisor: 0 },
      ]
      for (const candidate of candidates) {
        const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${form.type}send($1::${form.type}),'hex') wire`,
              [candidate.source],
            )
          ).rows[0]!.wire,
          bits =
            wire === null
              ? null
              : BigInt.asIntN(form.type === 'float4' ? 32 : 64, BigInt('0x' + wire)),
          row: Row = {
            payload: input(candidate.payload),
            value: input(bits),
            domain_value: input(bits),
            expected: input('safe'),
            choose_value: input(candidate.choose),
            divisor: { kind: 'Value', value: candidate.divisor },
            bypass: input(false),
          },
          from = `FROM (SELECT $1::text payload,$2::${form.type} value,$2::cast_${form.type === 'float4' ? 'single' : 'double'} domain_value,$3::text COLLATE "C" expected,$4::boolean choose_value,$5::integer divisor,$6::boolean bypass) candidate`,
          params = [
            candidate.payload,
            candidate.source,
            'safe',
            candidate.choose,
            candidate.divisor,
            false,
          ],
          observations = new Map<number, { output: string | null; outcome: Outcome }>()
        for (let extra = -15; extra <= 3; extra++) {
          await pg.exec(`SET extra_float_digits=${extra}`)
          try {
            const output = (
              await pg.query<{ output: string | null }>(
                `SELECT (${form.output}) output ${from}`,
                params,
              )
            ).rows[0]!.output
            observations.set(extra, { output, outcome: { kind: 'True' } })
          } catch (cause) {
            observations.set(extra, { output: null, outcome: failure(cause) })
          }
        }
        const invariant =
          new Set([...observations.values()].map((o) => JSON.stringify(o))).size === 1
        for (const extra of profiles) {
          await pg.exec(`SET extra_float_digits=${extra ?? 3}`)
          const observation = observations.get(extra ?? 3)!
          for (const expectedText of [observation.output, 'wrong']) {
            params[2] = expectedText
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ answer: boolean }>(
                  `SELECT (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected answer ${from}`,
                  params,
                )
              ).rows[0]!.answer
              expected = { kind: value ? 'True' : 'False' }
            } catch (cause) {
              expected = failure(cause)
            }
            if (extra !== undefined) {
              let rejected: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${form.name} VALUES($1,$2::${form.type},$2::cast_${form.type === 'float4' ? 'single' : 'double'},$3,$4,$5,$6)`,
                  params,
                )
              } catch (cause) {
                rejected = (cause as { code: string }).code
              }
              expect(rejected, form.name).toBe(
                expected.kind === 'Error'
                  ? (expected as Extract<Outcome, { kind: 'Error' }>).value.state
                      .toString(36)
                      .toUpperCase()
                      .padStart(5, '0')
                  : expected.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
            }
            const local =
                extra === undefined && !invariant ? { kind: 'Unknown' as const } : expected,
              currentRow = { ...row, expected: input(expectedText) }
            native.push({
              name: form.name,
              candidate,
              extra: extra ?? 'missing',
              invariant,
              expectedText,
              expected,
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `${profileName(extra)}_${form.name}_${origin}`,
                row: currentRow,
                expected: local,
              })
          }
        }
      }
      for (const extra of profiles)
        for (const origin of ['source', 'stored']) {
          const name = `${profileName(extra)}_${form.name}_${origin}`,
            row: Row = {
              payload: { kind: 'Unknown' },
              value: { kind: 'Unknown' },
              domain_value: { kind: 'Unknown' },
              expected: input('safe'),
              choose_value: input(true),
              divisor: { kind: 'Value', value: 1 },
              bypass: input(true),
            }
          fixtures.push({ name, row, expected: { kind: 'True' } })
          if (['direct', 'domain', 'parsed'].includes(form.operation)) {
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
                payload: error,
                value: error,
                domain_value: error,
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
    await runCheckParity(root, 'float_text_casts', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)

it('matches native plan-time folding of float literal output despite formatting context', async () => {
  const pg = await PGlite.create(),
    sql =
      'SELECT 1.2345678901234567::float4::text single_output,1.2345678901234567::float8::text double_output'
  try {
    await pg.exec('SET extra_float_digits=0')
    const low = (await pg.query<{ single_output: string; double_output: string }>(sql)).rows
    await pg.exec('PREPARE float_literal_output AS ' + sql)
    expect((await pg.query('EXECUTE float_literal_output')).rows).toEqual(low)
    await pg.exec('SET extra_float_digits=3')
    expect((await pg.query('EXECUTE float_literal_output')).rows).toEqual(low)
    const high = (await pg.query<{ single_output: string; double_output: string }>(sql)).rows
    expect(high[0]!['single_output']).not.toBe(low[0]!['single_output'])
    expect(high[0]!['double_output']).not.toBe(low[0]!['double_output'])
  } finally {
    await pg.close()
  }
})
