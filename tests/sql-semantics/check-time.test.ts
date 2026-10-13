import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const families = ['time', 'timetz', 'interval'] as const
type Family = (typeof families)[number]
const types = {
  time: 'pg_catalog."time"',
  timetz: 'pg_catalog.timetz',
  interval: 'pg_catalog."interval"',
} as const
const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const state = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const decode = (family: Family, hex: string | null): Input => {
  if (hex === null) return value(null)
  const bytes = Buffer.from(hex, 'hex')
  const time = bytes.readBigInt64BE()
  return value(
    family === 'time'
      ? time
      : family === 'timetz'
        ? { time, zone: bytes.readInt32BE(8) }
        : { time, days: bytes.readInt32BE(8), months: bytes.readInt32BE(12) },
  )
}

describe('time, timetz and interval CHECK values', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-clock-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('binds core catalog operations and matches binary results, states and lazy composition across targets', async () => {
    const source = (
      await Promise.all(
        ['time_core', 'time_arithmetic', 'time_send'].map((name) =>
          readFile(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
        ),
      )
    ).join('\n')
    const functions = builtinCallables()
      .filter((fn): fn is FunctionMetadata => fn.kind === 'function')
      .filter((fn) => source.includes(`fn ${fn.rustName}(`))
    expect(functions).toHaveLength(41)
    const familyOf = (type: string): Family => {
      const family = families.find((family) => types[family] === type)
      if (!family) throw new Error(`Unexpected clock type: ${type}`)
      return family
    }
    const expressions = Object.fromEntries(
      functions.map((fn) => {
        const call = `pg_catalog."${fn.name}"(${fn.args.map((type, index) => `${familyOf(type)}_${index ? 'right' : 'left'}`).join(',')})`
        return [
          fn.rustName,
          fn.result === 'pg_catalog.bool'
            ? call
            : fn.result === 'pg_catalog.int4'
              ? `${call} = expected_cmp`
              : fn.result === 'pg_catalog.bytea'
                ? `${call} = expected_bytea`
                : `${familyOf(fn.result)}_send(${call}) = expected_bytea`,
        ]
      }),
    )
    Object.assign(expressions, {
      clock_literal: "time_left >= TIME '00:00' AND time_left <= TIME '24:00'",
      zone_literal: "timetz_left <> TIMETZ '12:00+02' OR timetz_left = TIMETZ '12:00+02'",
      clock_cast: 'timetz_left::time = time_left',
      interval_cast: 'time_left::interval = interval_left',
      span_cast: 'interval_left::time = time_left',
    })
    for (const family of families)
      Object.assign(expressions, {
        [`${family}_case`]: `(CASE WHEN flag THEN ${family}_left ELSE ${family}_right END) = ${family}_right`,
        [`${family}_coalesce`]: `COALESCE(${family}_left,${family}_right) = ${family}_right`,
        [`${family}_distinct`]: `${family}_left IS DISTINCT FROM ${family}_right`,
        [`${family}_nullif`]: `NULLIF(${family}_left,${family}_right) IS NULL`,
        [`${family}_minmax`]: `GREATEST(${family}_left,${family}_right) >= LEAST(${family}_left,${family}_right)`,
        [`${family}_row`]: `ROW(${family}_left,1) <= ROW(${family}_right,2)`,
        [`${family}_lazy`]: `CASE WHEN flag THEN true ELSE ${family}_left = ${family}_right END`,
      })
    await pg.exec(`CREATE DOMAIN clock_domain AS time;
      CREATE TABLE clock_checks (
        time_left clock_domain, time_right time,
        timetz_left timetz, timetz_right timetz,
        interval_left interval, interval_right interval,
        expected_bytea bytea, expected_cmp int, flag bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'clock_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const samples = {
      time: ['00:00', '00:00:00.000001', '12:00', '23:59:59.999999', '24:00', null],
      timetz: ['00:00+15:59:59', '00:00-15:59:59', '12:00+02', '11:00+01', '24:00+00', null],
      interval: [
        '0',
        '1 month',
        '30 days',
        '1 month -30 days',
        '-1 microsecond',
        '2147483647 months',
        '-2147483648 days',
        '9223372036854.775807 seconds',
        '-9223372036854.775808 seconds',
        'infinity',
        '-infinity',
        null,
      ],
    }
    const inputs = new Map<string, Input>()
    for (const family of families)
      for (const text of samples[family]) {
        const hex = (
          await pg.query<{ hex: string | null }>(
            `SELECT encode(${family}_send($1::${types[family]}),'hex') hex`,
            [text],
          )
        ).rows[0]!.hex
        inputs.set(family + ':' + text, decode(family, hex))
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const fn of functions) {
      const aFamily = familyOf(fn.args[0]!)
      const bFamily = fn.args.length === 2 ? familyOf(fn.args[1]!) : null
      for (const a of samples[aFamily])
        for (const b of bFamily ? samples[bFamily] : [null]) {
          const call = `pg_catalog."${fn.name}"(${fn.args.map((type, i) => `$${i + 1}::${type}`).join(',')})`
          const wire =
            fn.result === 'pg_catalog.bytea'
              ? call
              : fn.result === 'pg_catalog.bool' || fn.result === 'pg_catalog.int4'
                ? null
                : `${familyOf(fn.result)}_send(${call})`
          let expected: Outcome
          const row: Row = {
            [aFamily + '_left']: inputs.get(aFamily + ':' + a)!,
            expected_cmp: value(0),
            expected_bytea: value(''),
          }
          if (bFamily) row[bFamily + '_right'] = inputs.get(bFamily + ':' + b)!
          try {
            const result = (
              await pg.query<{ result: string | number | boolean | null }>(
                `SELECT ${wire ? `encode(${wire},'hex')` : call} result`,
                bFamily ? [a, b] : [a],
              )
            ).rows[0]!.result
            expected = {
              kind:
                result === null
                  ? 'Null'
                  : fn.result === 'pg_catalog.bool'
                    ? result
                      ? 'True'
                      : 'False'
                    : 'True',
            }
            if (wire) row.expected_bytea = value(result as string | null)
            else if (fn.result === 'pg_catalog.int4')
              row.expected_cmp = value(result as number | null)
          } catch (caught) {
            expect((caught as { code: string }).code).toBe('22008')
            expected = state('22008')
          }
          add(fn.rustName, row, expected)
        }
      const row: Row = {
        [aFamily + '_left']: inputs.get(aFamily + ':' + samples[aFamily][0])!,
        expected_cmp: value(0),
        expected_bytea: value(''),
      }
      if (bFamily) row[bFamily + '_right'] = inputs.get(bFamily + ':' + samples[bFamily][0])!
      for (const input of [{ kind: 'Unknown' } as Input, state('22012')])
        add(fn.rustName, { ...row, [aFamily + '_left']: input }, input as Outcome)
      if (bFamily)
        add(
          fn.rustName,
          {
            ...row,
            [aFamily + '_left']: { kind: 'Unknown' },
            [bFamily + '_right']: state('22003'),
          },
          state('22003'),
        )
    }
    const composition = Object.keys(expressions).filter(
      (name) => !functions.some((fn) => fn.rustName === name),
    )
    for (let i = 0; i < samples.interval.length; i++) {
      const texts = families.flatMap((family) => [
        samples[family][i % samples[family].length]!,
        samples[family][(i + 1) % samples[family].length]!,
      ])
      const row: Row = { flag: value(i % 2 === 0) }
      for (const [index, family] of families.entries()) {
        row[family + '_left'] = inputs.get(family + ':' + texts[index * 2])!
        row[family + '_right'] = inputs.get(family + ':' + texts[index * 2 + 1])!
      }
      for (const name of composition) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean | null }>(
              `SELECT (${expressions[name]}) result FROM (SELECT ${families.flatMap((family, index) => [`$${index * 2 + 1}::${types[family]} ${family}_left`, `$${index * 2 + 2}::${types[family]} ${family}_right`]).join(',')}, $7::bool flag) candidate`,
              [...texts, i % 2 === 0],
            )
          ).rows[0]!.result
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (caught) {
          expect((caught as { code: string }).code).toBe('22008')
          expected = state('22008')
        }
        add(name, row, expected)
      }
    }
    for (const family of families) {
      add(
        family + '_lazy',
        {
          flag: value(true),
          [family + '_left']: state('22012'),
          [family + '_right']: { kind: 'Unknown' },
        },
        { kind: 'True' },
      )
      add(
        family + '_lazy',
        {
          flag: value(false),
          [family + '_left']: state('22012'),
          [family + '_right']: { kind: 'Unknown' },
        },
        state('22012'),
      )
    }
    await runCheckParity(
      directory,
      'clockcore',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 180_000)

  it('validates SQL-coerced clock payloads through both public APIs and preserves 24:00', async () => {
    const run = promisify(execFile)
    const publicExpressions = {
      local_equal: 'local_time = zoned_time::time',
      span_equal: 'span = local_time::interval',
      local_precision: 'local_time::time(0) = pg_catalog.time(local_time,0)',
      zoned_precision: 'zoned_time::timetz(3) = pg_catalog.timetz(zoned_time,3)',
      span_finite: 'isfinite(span)',
      local_output_roundtrip: 'local_time::text::time = local_time',
      zoned_output_roundtrip: 'zoned_time::text::timetz = zoned_time',
      span_justify: 'justify_interval(span) = span',
      local_second: 'extract(second FROM local_time) = extract(second FROM zoned_time)',
      local_legacy_second: "date_part('second',local_time) = date_part('second',zoned_time)",
      local_hash: 'time_hash(local_time) = time_hash(zoned_time::time)',
      local_seeded_hash:
        "time_hash_extended(local_time,'-9223372036854775808'::bigint) = time_hash_extended(zoned_time::time,'-9223372036854775808'::bigint)",
      span_hash: 'interval_hash(span) = interval_hash(local_time::interval)',
      span_seeded_hash:
        "interval_hash_extended(span,'9223372036854775807'::bigint) = interval_hash_extended(local_time::interval,'9223372036854775807'::bigint)",
      span_truncated: "date_trunc('second',span) = date_trunc('second',local_time::interval)",
      local_reverse_adjustment: "INTERVAL '0' + local_time = local_time + INTERVAL '0'",
      zoned_reverse_adjustment: "INTERVAL '0' + zoned_time = zoned_time + INTERVAL '0'",
      local_bucket:
        "date_bin(INTERVAL '1 hour',DATE '2000-01-01' + local_time,TIMESTAMP '2000-01-01') = DATE '2000-01-01' + date_trunc('hour',local_time::interval)",
      local_calendar_age:
        "age(DATE '2000-01-01' + local_time,TIMESTAMP '2000-01-01') = local_time::interval",
    }
    await pg.exec(
      `CREATE TABLE clock_public (local_time clock_domain,zoned_time timetz,span interval,${Object.entries(
        publicExpressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'clock_public')!
    const ts = renderTypescriptSchemaCheckArtifacts([table], catalog.domains)
    const folder = join(directory, 'public')
    await mkdir(folder)
    await writeFile(join(folder, 'package.json'), '{"type":"module"}')
    await writeFile(join(folder, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(folder, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(folder, 'js'),
      join(folder, 'checks.ts'),
    ])
    const runtime = await import(
      pathToFileURL(join(folder, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const { evaluatePublicClockPublicChecks: evaluate } = await import(
      pathToFileURL(join(folder, 'js/checks.js')).href
    )
    const cases: GoCheckCase[] = []
    for (const [local, zoned, span] of [
      ['00:00', '00:00+02', '0'],
      ['12:34:56.123456', '12:34:56.123456-05:30', '12:34:56.123456'],
      ['24:00', '24:00+15:59:59', '24 hours'],
      ['00:00', '24:00+00', '0'],
      ['00:00', '00:00+00', '1 month -30 days'],
      [null, null, null],
    ]) {
      const texts = [local, zoned, span]
      const inputs: Input[] = []
      for (const [index, family] of families.entries()) {
        const hex = (
          await pg.query<{ hex: string | null }>(
            `SELECT encode(${family}_send($1::${types[family]}),'hex') hex`,
            [texts[index]],
          )
        ).rows[0]!.hex
        inputs.push(decode(family, hex))
      }
      const row = Object.fromEntries(
        ['local_time', 'zoned_time', 'span'].map((name, index) => {
          const input = inputs[index]!
          return [name, input.kind === 'Value' ? input.value : null]
        }),
      )
      const wrapped = {
        local_time: row.local_time === null ? null : runtime.makeTimeValue(row.local_time),
        zoned_time: inputs[1],
        span: inputs[2],
      }
      const result = (
        await pg.query<Record<string, boolean | null>>(
          'SELECT ' +
            Object.entries(publicExpressions)
              .map(
                ([name, sql]) =>
                  sql
                    .replaceAll('local_time', '$1::time')
                    .replaceAll('zoned_time', '$2::timetz')
                    .replaceAll('span', '$3::interval') +
                  ' AS ' +
                  name,
              )
              .join(','),
          texts,
        )
      ).rows[0]!
      const results = evaluate(wrapped)
      for (const item of results)
        expect(item.result, `${item.constraint}: ${texts.join('/')}`).toEqual({
          certain: true,
          value: result[item.constraint as keyof typeof result],
        })
      cases.push({
        name: texts.join('/'),
        table,
        row,
        timeColumns: ['local_time'],
        timetzColumns: ['zoned_time'],
        intervalColumns: ['span'],
        results,
      })
    }
    expect(evaluate({}).every((item: GoCheckCase['results'][number]) => !item.result.certain)).toBe(
      true,
    )
    for (const invalid of [
      '24:00',
      0n,
      new Date(),
      { kind: 'Value', value: -1n },
      { kind: 'Value', value: 86400000001n },
    ])
      expect(
        evaluate({
          local_time: invalid,
          zoned_time: runtime.makeTimetzValue(0n, 0),
          span: runtime.makeIntervalValue(0, 0, 0n),
        }).find((item: GoCheckCase['results'][number]) => item.constraint === 'local_equal')!
          .result,
      ).toEqual({ certain: false })
    for (const invalid of [
      { kind: 'Value', value: { time: 0n, zone: 57600 } },
      { kind: 'Value', value: { time: 0, zone: 0 } },
    ])
      expect(
        evaluate({ local_time: runtime.makeTimeValue(0n), zoned_time: invalid }).find(
          (item: GoCheckCase['results'][number]) => item.constraint === 'local_equal',
        )!.result,
      ).toEqual({ certain: false })
    const generated = renderGoSchemaArtifacts(
      { ...catalog, tables: [table] },
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(folder, 'schema'),
      'clockpublic/schema',
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(folder, 'go.mod'),
      'module clockpublic\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(folder, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(folder, 'schema/public/checks_test.go'),
      renderGoCheckTests('public', cases, {
        dateRuntime: 'clockpublic/schema/public/checkrust/checkruntime',
      }),
    )
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: folder,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)
})
