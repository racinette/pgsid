import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
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

const wire = (type: string, sql: string) =>
  `encode(${type === 'float8' ? 'float8send' : type + '_send'}(${sql}),'hex')`
const forms: Record<string, string> = {
  wire: wire('timestamp', 'v'),
  array_wire: wire('timestamp', '(ARRAY[v,NULL])[1]'),
  record_wire: wire('timestamp', '(ROW(v,ARRAY[v,NULL])::stored_stamp_record).v'),
  domain_wire: wire('timestamp', 'v::stored_stamp_domain'),
  scale: wire('timestamp', 'v::timestamp(0)'),
  present: '(v IS NOT NULL)::text',
  finite: 'isfinite(v)::text',
  compare: "(v<TIMESTAMP '4714-11-24 BC')::text",
  difference: wire('interval', 'v-v'),
  date: wire('date', 'v::date'),
  time: wire('time', 'v::time'),
  rendered: 'v::text',
  cells: 'ARRAY[v,NULL]::text',
  record_text: 'ROW(v,ARRAY[v,NULL])::stored_stamp_record::text',
  output_present: '(v::text IS NOT NULL)::text',
  reparsed: wire('timestamp', 'v::text::timestamp'),
  json: 'to_jsonb(v)::text',
  json_array: 'to_jsonb(ARRAY[v,NULL])::text',
  json_record: 'to_jsonb(ROW(v,ARRAY[v,NULL])::stored_stamp_record)::text',
  xml: 'xmlelement(name stamp,v)::text',
  attach: wire('timestamptz', 'v::timestamptz'),
  named_zone: wire('timestamptz', "timezone('Etc/GMT+12',v)"),
  numeric_zone: wire('timestamptz', "timezone('-48',v)"),
  interval_zone: wire('timestamptz', "timezone(interval '-48 hours',v)"),
  add_zero: wire('timestamp', "v+interval '0'"),
  add_hours: wire('timestamp', "v+interval '48 hours'"),
  subtract_hours: wire('timestamp', "v-interval '48 hours'"),
  add_days: wire('timestamp', "v+interval '2 days'"),
  subtract_days: wire('timestamp', "v-interval '2 days'"),
  add_month: wire('timestamp', "v+interval '1 month'"),
  add_infinity: wire('timestamp', "v+interval 'infinity'"),
  age: wire('interval', 'age(v,v)'),
  epoch: 'extract(epoch from v)::text',
  year: 'extract(year from v)::text',
  timezone: 'extract(timezone from v)::text',
  bad_extract: 'extract(ago from v)::text',
  legacy_epoch: wire('float8', "date_part('epoch',v)"),
  legacy_year: wire('float8', "date_part('year',v)"),
  ...Object.fromEntries(
    ['microseconds', 'second', 'week', 'month', 'century', 'timezone', 'nonsense'].map((unit) => [
      'trunc_' + unit,
      wire('timestamp', `date_trunc('${unit}',v)`),
    ]),
  ),
  bin: wire('timestamp', "date_bin(interval '1 second',v,v)"),
  bin_shift: wire('timestamp', "date_bin(interval '48 hours',v,TIMESTAMP '4714-11-24 BC')"),
  within: "pg_catalog.in_range(v,v,interval '48 hours',true,true)::text",
}
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}

it('preserves stored timestamps across scalar and container consumers with native calendar errors and clock-only recovery', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-timestamp-storage-')),
    packet = 'artifacts/goal-checks/timestamp-storage-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    await pg.exec(`CREATE DOMAIN stored_stamp_domain AS timestamp CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
      CREATE TYPE stored_stamp_record AS(v timestamp,a timestamp[]);
      CREATE TABLE stored_stamp_values(v timestamp,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')});
      CREATE TABLE stamp_inputs(id serial,v timestamp)`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE stored_stamp_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    for (const zone of ['UTC', 'Etc/GMT+12', '-48', '-72', '-96', '-120', '-144', '-167.999']) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      await pg.exec(
        "INSERT INTO stamp_inputs(v) VALUES((('4714-11-24T00:00:00Z BC'::timestamptz)::date)::timestamp)",
      )
    }
    await pg.exec("SET TimeZone='UTC';SET DateStyle='ISO,MDY'")
    await pg.exec(
      "INSERT INTO stamp_inputs(v) VALUES(NULL),('infinity'),('-infinity'),('2000-01-01'),('294276-12-31 23:59:59.999999'),(('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0))",
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'stored_stamp_values')!,
      groups = [true, false].map((context, profile) =>
        prepareCheckRustGroup(
          Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `p${profile}_${operation}_${origin}`
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
                  owner: t.name,
                  constraint: name,
                },
                expression,
              }
            }),
          ),
          {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            ...(context
              ? { timeZone: 'UTC', dateStyle: { format: 'ISO' as const, order: 'MDY' as const } }
              : {}),
          },
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      callables = [...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!))],
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables }),
        requiresRegex: false,
      },
      samples = (
        await pg.query<{ id: number; wire: string | null }>(
          "SELECT id,encode(timestamp_send(v),'hex') wire FROM stamp_inputs ORDER BY id",
        )
      ).rows
    group.checks.forEach((check, i) =>
      expect(check.kind, names[i] + ('reason' in check ? ':' + check.reason : '')).toBe(
        'supported',
      ),
    )
    for (const { id, wire } of samples) {
      const payload = wire === null ? null : Buffer.from(wire, 'hex').readBigInt64BE(),
        finite =
          payload !== null && payload !== -9223372036854775808n && payload !== 9223372036854775807n,
        below = finite && payload! < -211813488000000000n
      for (const [operation, sql] of Object.entries(forms)) {
        let output: string | null = null,
          observation: Outcome = { kind: 'True' }
        try {
          output = (
            await pg.query<{ output: string | null }>(
              `SELECT (${sql}) output FROM stamp_inputs WHERE id=$1`,
              [id],
            )
          ).rows[0]!.output
        } catch (cause) {
          observation = failure(cause)
        }
        for (const expectedText of [output, 'wrong'])
          for (const bypass of [false, true]) {
            const reference: Outcome = bypass
              ? { kind: 'True' }
              : observation.kind === 'Error'
                ? observation
                : { kind: output === expectedText ? 'True' : 'False' }
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${operation} SELECT v,$1::text,$2::boolean FROM stamp_inputs WHERE id=$3`,
                [expectedText, bypass, id],
              )
            } catch (cause) {
              code = (cause as { code: string }).code
            }
            expect(code, `${id}/${operation}`).toBe(
              reference.kind === 'Error'
                ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                : reference.kind === 'False'
                  ? below
                    ? '22008'
                    : '23514'
                  : undefined,
            )
            native.push({
              id,
              wire,
              operation,
              expectedText,
              bypass,
              reference,
              insertState: code ?? null,
            })
            for (const profile of [0, 1])
              for (const origin of ['source', 'stored']) {
                const missing =
                    profile === 1 &&
                    finite &&
                    !below &&
                    ['rendered', 'cells', 'record_text', 'reparsed', 'attach'].includes(operation),
                  expected: Outcome = !bypass && missing ? { kind: 'Unknown' } : reference
                fixtures.push({
                  name: `p${profile}_${operation}_${origin}`,
                  row: { v: known(payload), expected: known(expectedText), bypass: known(bypass) },
                  expected,
                })
              }
          }
      }
    }
    for (const name of names)
      for (const state of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        fixtures.push({
          name,
          row: { v: state, expected: known('reference'), bypass: known(false) },
          expected: state as Outcome,
        })
        fixtures.push({
          name,
          row: { v: state, expected: known('reference'), bypass: known(true) },
          expected: { kind: 'True' },
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        {
          inserts: native.length,
          fixtures: fixtures.length,
          checks: names.length,
          samples: samples.length,
          forms: Object.keys(forms).length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'timestamp_storage', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('admits projected and rounded timestamp rows, containers and captured constants through public adapters', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-timestamp-storage-public-')),
    run = promisify(execFile),
    context = {
      timeZone: 'UTC',
      defaultCollation: 'C' as const,
      serverEncoding: 'UTF8' as const,
      dateStyle: { format: 'ISO' as const, order: 'MDY' as const },
    },
    definitions = ['timestamp', 'timestamptz'].map((type, index) => {
      const owner = index === 0 ? 'public_stored_stamps' : 'public_stored_instants',
        scalar = index === 0 ? 'stamp' : 'instant',
        expressions = {
          wire: wire(type, 'v'),
          array_wire: wire(type, '(ARRAY[v,NULL])[1]'),
          record_wire: wire(type, `(ROW(v,ARRAY[v,NULL])::${owner}_record).v`),
          domain_wire: wire(type, `v::${owner}_domain`),
          literal: wire(
            type,
            `${type.toUpperCase()}(0) '294276-12-31 23:59:59.999999${type === 'timestamptz' ? '+00' : ''}'`,
          ),
          rendered: 'v::text',
          json: 'to_jsonb(v)::text',
          presence: '(v IS NOT NULL)::text',
        }
      return { type, owner, scalar, expressions }
    })
  try {
    for (const { type, owner, expressions } of definitions) {
      await pg.exec(`CREATE TYPE ${owner}_record AS(v ${type},a ${type}[]);CREATE DOMAIN ${owner}_domain AS ${type} CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
     CREATE TABLE ${owner}(v ${type},expected text COLLATE "C",bypass boolean,${Object.entries(
       expressions,
     )
       .map(
         ([name, sql]) =>
           `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
       )
       .join(',')});
     CREATE TABLE ${owner}_inputs(id serial,v ${type})`)
      if (type === 'timestamp')
        for (const zone of ['-48', '-167.999']) {
          await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
          await pg.exec(
            `INSERT INTO ${owner}_inputs(v) VALUES((('4714-11-24T00:00:00Z BC'::timestamptz)::date)::timestamp)`,
          )
        }
      await pg.exec("SET TimeZone='UTC';SET DateStyle='ISO,MDY'")
      await pg.exec(
        `INSERT INTO ${owner}_inputs(v) VALUES(NULL),('infinity'),('-infinity'),('2000-01-01'),(${type.toUpperCase()}(0) '294276-12-31 23:59:59.999999${type === 'timestamptz' ? '+00' : ''}')`,
      )
    }
    const catalog = await snapshotCatalog(pg),
      tables = catalog.tables.filter((t) => definitions.some((d) => d.owner === t.name)),
      ts = renderTypescriptSchemaCheckArtifacts(tables, catalog.domains, [], {
        executionContext: context,
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
        compositeTypeGraph: catalog.compositeTypeGraph,
      })
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
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
      join(root, 'js'),
      join(root, 'checks.ts'),
    ])
    const validators = await import(pathToFileURL(join(root, 'js/checks.js')).href),
      cases: GoCheckCase[] = []
    for (const { type, owner, expressions } of definitions) {
      const table = tables.find((t) => t.name === owner)!,
        samples = (
          await pg.query<{ id: number; wire: string | null }>(
            `SELECT id,encode(${type}_send(v),'hex') wire FROM ${owner}_inputs ORDER BY id`,
          )
        ).rows,
        evaluate =
          validators[
            type === 'timestamp'
              ? 'evaluatePublicPublicStoredStampsChecks'
              : 'evaluatePublicPublicStoredInstantsChecks'
          ]!
      for (const { id, wire } of samples)
        for (const expectedText of [wire, 'wrong'])
          for (const bypass of [false, true]) {
            const value = wire === null ? null : Buffer.from(wire, 'hex').readBigInt64BE(),
              results = []
            for (const [constraint, sql] of Object.entries(expressions)) {
              let outcome: Outcome = { kind: 'True' }
              try {
                const answer = (
                  await pg.query<{ answer: boolean }>(
                    `SELECT CASE WHEN $2::boolean THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM $1::text COLLATE "C" END answer FROM ${owner}_inputs WHERE id=$3`,
                    [expectedText, bypass, id],
                  )
                ).rows[0]!.answer
                outcome = { kind: answer ? 'True' : 'False' }
              } catch (cause) {
                outcome = failure(cause)
              }
              results.push({
                constraint,
                result:
                  outcome.kind === 'Error'
                    ? {
                        certain: true as const,
                        error: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
                      }
                    : { certain: true as const, value: outcome.kind === 'True' },
              })
            }
            const row = {
                v: value === null ? null : { kind: 'Value', value },
                expected: expectedText,
                bypass,
              },
              actual = evaluate(row)
            for (const expected of results)
              expect(
                actual.find((k: { constraint: string }) => k.constraint === expected.constraint)
                  ?.result,
                `${owner}/${id}/${expected.constraint}`,
              ).toEqual(expected.result)
            cases.push({
              name: `${owner}/${id}/${expectedText}/${bypass}`,
              table,
              row: { v: value, expected: expectedText, bypass },
              results: results.sort((a, b) =>
                a.constraint < b.constraint ? -1 : a.constraint > b.constraint ? 1 : 0,
              ),
            })
          }
    }
    const goRoot = join(root, 'go')
    await mkdir(goRoot)
    const generated = renderGoSchemaArtifacts(
      { ...catalog, tables },
      parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    checks: ${JSON.stringify(context)}\n    go:\n      schema: { outDir: schema }\n`,
      ),
      {},
      join(goRoot, 'schema'),
      'timestamp_storage/schema',
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(goRoot, 'go.mod'),
      'module timestamp_storage\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(goRoot, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(goRoot, 'schema/public/checks_test.go'),
      renderGoCheckTests('public', cases, {
        dateRuntime: 'timestamp_storage/schema/public/checkrust/checkruntime',
      }),
    )
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: goRoot,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((cause: { stdout: string; stderr: string }) => {
      throw new Error(cause.stdout + cause.stderr, { cause })
    })
    await writeFile(
      'artifacts/goal-checks/timestamp-storage-active/public-summary.json',
      JSON.stringify(
        { rows: cases.length, checksPerRow: 8, types: definitions.map((d) => d.type) },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
