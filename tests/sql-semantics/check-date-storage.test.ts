import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'

const run = promisify(execFile)
const forms: Record<string, string> = {
  wire: "encode(date_send(d),'hex')",
  rendered: 'd::text',
  cells: 'ARRAY[d,NULL]::text',
  record_value: 'ROW(d,ARRAY[d,NULL])::stored_date_record::text',
  selected: "encode(date_send((ROW(d,ARRAY[d,NULL])::stored_date_record).d),'hex')",
  domain_value: "encode(date_send(d::stored_date_domain),'hex')",
  reparsed: "encode(date_send((d::text)::date),'hex')",
  arithmetic: "encode(date_send(d+0),'hex')",
}
const context = {
  defaultCollation: 'C' as const,
  serverEncoding: 'UTF8' as const,
  dateStyle: { format: 'ISO' as const, order: 'MDY' as const },
}
const parameters = [
  ...['UTC', 'Etc/GMT+12', '-48', '-72', '-96', '-120', '-144', '-167.999'].map((zone) => ({
    zone,
    value: '4714-11-24T00:00:00Z BC',
  })),
  ...['2000-01-01T00:00:00Z', 'infinity', '-infinity', null].map((value) => ({
    zone: 'UTC',
    value,
  })),
]
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}
async function setup(pg: PGlite) {
  await pg.exec(
    `CREATE DOMAIN stored_date_domain AS date CHECK(VALUE<=DATE '2000-01-01');CREATE TYPE stored_date_record AS(d date,a date[]);CREATE TABLE storage_date_values(d date,expected text COLLATE "C",bypass boolean,${Object.entries(
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
      `CREATE TABLE oracle_${name}(LIKE storage_date_values);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
    )
}
async function observe(
  pg: PGlite,
  sql: string,
  value: string | null,
  expected: string | null,
): Promise<Outcome> {
  try {
    const answer = (
      await pg.query<{ answer: boolean }>(
        `SELECT (${sql}) COLLATE "C" IS NOT DISTINCT FROM $2::text COLLATE "C" answer FROM(SELECT ($1::timestamptz)::date d)q`,
        [value, expected],
      )
    ).rows[0]!.answer
    return { kind: answer ? 'True' : 'False' }
  } catch (cause) {
    return failure(cause)
  }
}

it('preserves SQL-coerced date projections before text admission while retaining native input and arithmetic errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-date-storage-')),
    packet = 'artifacts/goal-checks/date-storage-active'
  try {
    await setup(pg)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'storage_date_values')!,
      names: string[] = [],
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        (['source', 'stored'] as const).map((origin) => {
          names.push(`${name}_${origin}`)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: 'storage_date_values',
              constraint: `${name}_${origin}`,
            },
            expression: lowerTableCheck(
              t,
              t.constraints.find((k) => k.name === name)!,
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
      group = prepareCheckRustGroup(plans, context),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    group.checks.forEach((k, i) => expect(k.kind, names[i]).toBe('supported'))
    for (const { zone, value } of parameters) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      const wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(date_send(($1::timestamptz)::date),'hex') wire",
            [value],
          )
        ).rows[0]!.wire,
        days = wire === null ? null : Buffer.from(wire, 'hex').readInt32BE()
      for (const [operation, sql] of Object.entries(forms))
        for (const expected of [wire, 'wrong'])
          for (const bypass of [false, true]) {
            const outcome = bypass
              ? { kind: 'True' as const }
              : await observe(pg, sql, value, expected)
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${operation} SELECT ($1::timestamptz)::date,$2::text,$3::boolean`,
                [value, expected, bypass],
              )
            } catch (cause) {
              code = (cause as { code: string }).code
            }
            expect(code, `${operation} ${zone} ${value}`).toBe(
              outcome.kind === 'Error'
                ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                : outcome.kind === 'False'
                  ? '23514'
                  : undefined,
            )
            native.push({ operation, zone, value, days, expected, bypass, outcome })
            const row: Row = { d: input(days), expected: input(expected), bypass: input(bypass) }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: `${operation}_${origin}`, row, expected: outcome })
          }
    }
    for (const name of names)
      for (const state of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        fixtures.push({
          name,
          row: { d: state, expected: input('reference'), bypass: input(false) },
          expected: state as Outcome,
        })
        fixtures.push({
          name,
          row: { d: state, expected: input('reference'), bypass: input(true) },
          expected: { kind: 'True' },
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        { inserts: native.length, fixtures: fixtures.length, checks: names.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'date_storage', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('admits projected dates through generated public row adapters and checked record fields', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-date-storage-public-'))
  try {
    await setup(pg)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'storage_date_values')!,
      ts = renderTypescriptSchemaCheckArtifacts([t], c.domains, [], {
        executionContext: context,
        enums: c.enums,
        rangeTypes: c.rangeTypes,
        compositeTypeGraph: c.compositeTypeGraph,
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
    const { evaluatePublicStorageDateValuesChecks: evaluate } = await import(
        pathToFileURL(join(root, 'js/checks.js')).href
      ),
      cases: GoCheckCase[] = []
    for (const { zone, value } of parameters) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      const wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(date_send(($1::timestamptz)::date),'hex') wire",
            [value],
          )
        ).rows[0]!.wire,
        days = wire === null ? null : Buffer.from(wire, 'hex').readInt32BE(),
        results = []
      for (const [constraint, sql] of Object.entries(forms)) {
        const outcome = await observe(pg, sql, value, wire)
        const result =
          outcome.kind === 'Error'
            ? {
                certain: true as const,
                error: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
              }
            : { certain: true as const, value: outcome.kind === 'True' }
        results.push({ constraint, result })
      }
      const actual = evaluate({
        d: days === null ? null : { kind: 'Value', value: days },
        expected: wire,
        bypass: false,
      })
      for (const r of results)
        expect(
          actual.find((k: { constraint: string }) => k.constraint === r.constraint)!.result,
          `${zone} ${r.constraint}`,
        ).toEqual(r.result)
      cases.push({
        name: zone + ':' + value,
        table: t,
        row: { d: days, expected: wire, bypass: false },
        results: results.sort((a, b) =>
          a.constraint < b.constraint ? -1 : a.constraint > b.constraint ? 1 : 0,
        ),
      })
    }
    expect(
      evaluate({ d: { kind: 'Value', value: 0.5 }, expected: '', bypass: false })[0].result,
    ).toEqual({ certain: false })
    const goRoot = join(root, 'go')
    await mkdir(goRoot)
    const generated = renderGoSchemaArtifacts(
      c,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, serverEncoding: UTF8, dateStyle: { format: ISO, order: MDY } }\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(goRoot, 'schema'),
      'date_storage/schema',
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(goRoot, 'go.mod'),
      'module date_storage\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(goRoot, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(goRoot, 'schema/public/checks_test.go'),
      renderGoCheckTests('public', cases, {
        dateRuntime: 'date_storage/schema/public/checkrust/checkruntime',
      }),
    )
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: goRoot,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((cause: { stdout: string; stderr: string }) => {
      throw new Error(cause.stdout + cause.stderr, { cause })
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
