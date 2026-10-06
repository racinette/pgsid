import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
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

const expressions = {
  equal: 'raw::timestamp = anchor',
  greater: 'raw::pg_catalog."timestamp" > anchor',
  null_test: 'raw::timestamp IS NULL',
  between:
    "raw::timestamp BETWEEN TIMESTAMP '1999-12-31 23:59:59Z' AND TIMESTAMP '2000-02-29 00:00:00Z'",
  membership: "raw::timestamp IN (TIMESTAMP '2000-01-01 00:00:00+00', TIMESTAMP 'infinity', NULL)",
  lazy: 'CASE WHEN flag THEN true ELSE raw::timestamp = anchor END',
  regex_guard: `CASE WHEN (raw COLLATE "C") ~ '^skip$' THEN true ELSE raw::timestamp = anchor END`,
  scalar_case:
    "(CASE WHEN flag THEN raw::timestamp ELSE TIMESTAMP '2000-01-01 00:00:00+00' END) = anchor",
  text_case: "(CASE WHEN flag THEN raw ELSE '2000-01-01 00:00:00Z' END)::timestamp = anchor",
  literal: "anchor = ' 2000-1-1 00:00:00+00 ad '::timestamp",
  typed_text_literal: "anchor = ('2000-01-01 00:00:00Z'::text)::timestamp",
  bc_literal: "anchor >= TIMESTAMP '4714-11-24 00:00:00Z bc'",
  infinity_literal: "anchor < TIMESTAMP '+INFINITY'",
}
const supportedText = [
  '2000-01-01',
  ' 2000-1-1 ad ',
  '0001-01-01 BC',
  '4714-11-24 BC',
  '4714-11-23 BC',
  '294276-12-31',
  '294277-01-01',
  '0000-01-01',
  '1900-02-29',
  '2000-01-01 00:00:00',
  '2000-01-01T00:00',
  '2000-01-01 00:00:00.000001',
  '1999-12-31 23:59:59.999999',
  '2000-01-01 24:00',
  '2000-01-01 24:00:00.000001',
  '2000-01-01 23:59:60.000001',
  null,
  '',
  ' \t\r\n\v\f ',
  '2000-01-01 00:00:00Z',
  '2000-01-01T00:00:00z',
  '2000-01-01 00:00+00',
  ' 2000-1-1 0:0:0+00 ad ',
  '00002000-01-01 00:00:00+00',
  '1999-12-31 23:59:59.999999Z',
  '2000-01-01 00:00:00.000001Z',
  '2000-01-01 00:00:00.1Z',
  '2000-01-01 00:00:00.12345Z',
  '2000-01-01 00:00:00.123456Z',
  '2000-01-01 01:00:00+01',
  '1999-12-31 19:00:00-05',
  '2000-01-01 05:30:00+0530',
  '2000-01-01 05:30:00+05:30',
  '1999-12-31 20:30:00-03:30',
  '2000-01-01 00:00:01+00:00:01',
  '1999-12-31 23:59:59-00:00:01',
  '2000-01-01 00:00:00+15:59:59',
  '2000-01-01 00:00:00-15:59:59',
  '2000-01-01 00:00:00+1',
  '2000-01-01 00:00:00+001',
  '2000-01-01 00:00:00+1:2:3',
  '2000-01-01 00:00:00+00bc',
  '2000-01-01 00:00:00 Z',
  '2000-01-01 24:00:00Z',
  '2000-01-01 23:59:60Z',
  '2000-01-01 12:34:60.5Z',
  '0001-01-01 00:00:00Z',
  '0001-01-01 00:00:00Z BC',
  '0001-02-29 00:00:00+00 BC',
  '0044-03-15 12:00:00Z bC',
  '4714-11-24 00:00:00Z BC',
  '4714-11-23 23:59:59.999999-00:00:01 BC',
  '4714-11-23 23:59:59.999999Z BC',
  '4714-11-24 00:00:00+00:00:01 BC',
  '294276-12-31 23:59:59.999999Z',
  '294277-01-01 00:00:00+00:00:01',
  '294277-01-01 00:00:00Z',
  '294277-01-01 24:00:00-15:59:59',
  '2285-06-04 23:47:34.740992Z',
  '2285-06-04 23:47:34.740993Z',
  '99999999999999999999-01-01 00:00:00Z',
  '0000-01-01 00:00:00Z',
  '1900-02-29 00:00:00Z',
  '2000-13-01 00:00:00Z',
  '2000-01-32 00:00:00Z',
  '2000-04-31 00:00:00Z',
  '2000-01-01 25:00:00Z',
  '2000-01-01 24:00:00.000001Z',
  '2000-01-01 23:60:00Z',
  '2000-01-01 00:00:61Z',
  '2000-01-01 23:59:60.000001Z',
  '2000-01-01 00:00:00+16',
  '2000-01-01 00:00:00+00:60',
  '2000-01-01 00:00:00+00:00:60',
  '2000-01-01 25:00:00+16',
  '2000-01-01 00:60:00+16',
  '2000-01-01 00:00:61+16',
  '2000-01-01 24:00:00.000001+16',
  '2000-13-01 00:00:00+16',
  '999999999999999999-01-01 00:00:00+16',
  '2000-01-01 999999999999999999:00:00+16',
  '2000-01-01 00:00:00+00:999999999999999999',
  'infinity',
  '+INFINITY',
  ' -infinity ',
  'infinity BC',
]
const unsupportedText = [
  'today',
  'tomorrow',
  'yesterday',
  'now',
  'epoch',
  '2000-01-01 00:00:00 America/New_York',
  '2000-01-01 00:00:00 UTC',
  '01/02/2000 00:00:00+00',
  'January 1, 2000 00:00:00+00',
  '20000101 000000+00',
  '2000-01-01 00:00:00.1234567Z',
  '2000-01-01 00:00:00.0000005Z',
  '2000-01-01 23:59:59.9999999Z',
]
const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const run = promisify(execFile)

describe('Rust text-to-timestamp CHECK casts', () => {
  let pg: PGlite
  let directory: string
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-timestamp-text-'))
    await pg.exec(`CREATE TABLE timestamp_text_checks (
      raw text, anchor timestamp, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')}
    )`)
    table = (await snapshotCatalog(pg)).tables.find(
      (table) => table.name === 'timestamp_text_checks',
    )!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const prepare = (sql: string) =>
    prepareCheckRustGroup([
      {
        expression: lowerTableCheck(table, {
          name: 'probe',
          type: 'check',
          definition: `CHECK (${sql})`,
        })!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
      },
    ])

  it('emits casts and literals through the same shared Rust parser', () => {
    const cast = prepare('raw::timestamp = anchor')
    expect(cast.checks[0]!.kind).toBe('supported')
    expect(cast.evaluatorSource).toContain('timestamp_from_text(input_raw.clone())')
    expect(prepare("anchor = TIMESTAMP '2000-01-01 00:00:00+00'").evaluatorSource).toContain(
      'timestamp_from_text(',
    )
    expect(prepare('raw::timestamp IS NULL').checks[0]!.kind).toBe('supported')
    expect(prepare('flag::timestamp IS NULL').evaluatorSource).not.toContain('timestamp_from_text(')
    expect(prepare('anchor::timestamptz = anchor').evaluatorSource).not.toContain(
      'timestamp_from_text(',
    )
    const expression = lowerTableCheck(table, {
      name: 'probe',
      type: 'check',
      definition: 'CHECK (raw::timestamp IS NULL)',
    })!.expression
    expect(JSON.stringify(portableCheckAtoms(expression))).toContain('text-to-timestamp')
  })

  it('matches PGlite in Rust and both targets, preserving unknowns, errors, and lazy branches', async () => {
    const names = Object.keys(expressions)
    const group = prepareCheckRustGroup(
      names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === name)!,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle = async (raw: string | null, flag: boolean) => {
      const row: Row = { raw: input(raw), anchor: input(0n), flag: input(flag) }
      for (const [name, sql] of Object.entries(expressions)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT $1::text raw, TIMESTAMP '2000-01-01 00:00:00+00' anchor, $2::bool flag) candidate`,
              [raw, flag],
            )
          ).rows[0]!.value
          expected = outcome(result)
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: Number.parseInt((error as { code: string }).code, 36) },
          }
        }
        fixtures.push({ name, row, expected })
      }
    }
    for (const [style, zone] of [
      ['MDY', 'UTC'],
      ['DMY', 'America/New_York'],
      ['YMD', 'Asia/Kathmandu'],
    ]) {
      await pg.exec(`SET DateStyle = 'ISO, ${style}'; SET TimeZone = '${zone}'`)
      for (const raw of supportedText) {
        await oracle(raw, false)
        await oracle(raw, true)
        if (raw !== null) {
          try {
            const hex = (
              await pg.query<{ binary: string }>(
                "SELECT encode(timestamp_send($1::timestamp), 'hex') AS binary",
                [raw],
              )
            ).rows[0]!.binary
            fixtures.push({
              name: 'equal',
              row: {
                raw: input(raw),
                anchor: input(Buffer.from(hex, 'hex').readBigInt64BE()),
                flag: input(false),
              },
              expected: { kind: 'True' },
            })
          } catch (error) {
            expect(['22007', '22008', '22009']).toContain((error as { code: string }).code)
          }
        }
      }
      for (const raw of unsupportedText) {
        if (style === 'MDY') await pg.query('SELECT $1::timestamp', [raw])
        for (const name of ['equal', 'greater', 'null_test', 'between', 'membership'])
          fixtures.push({
            name,
            row: { raw: input(raw), anchor: input(0n), flag: input(false) },
            expected: { kind: 'Unknown' },
          })
      }
    }
    for (const raw of [
      'not a timestamp',
      '2000-01-01 junk',
      'λ',
      '2'.repeat(129) + '-01-01',
      '2000-01-01T00:00:00ZBC',
      '2000-01-01T00:00:00ZAD',
      'infinitybc',
    ])
      fixtures.push({
        name: 'null_test',
        row: { raw: input(raw), anchor: input(0n), flag: input(false) },
        expected: { kind: 'Unknown' },
      })
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22012', 36) } }
    for (const raw of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      const row: Row = { raw, anchor: input(0n), flag: input(false) }
      fixtures.push({
        name: 'equal',
        row,
        expected: raw.kind === 'Null' ? { kind: 'Null' } : (raw as Outcome),
      })
      fixtures.push({
        name: 'null_test',
        row,
        expected: raw.kind === 'Null' ? { kind: 'True' } : (raw as Outcome),
      })
      fixtures.push({
        name: 'lazy',
        row: { ...row, flag: input(true) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'scalar_case',
        row: { ...row, flag: input(false) },
        expected: { kind: 'True' },
      })
    }
    fixtures.push({
      name: 'equal',
      row: { raw: error, anchor: { kind: 'Unknown' }, flag: input(false) },
      expected: error,
    })
    fixtures.push({
      name: 'equal',
      row: { raw: { kind: 'Unknown' }, anchor: { kind: 'Null' }, flag: input(false) },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'regex_guard',
      row: { raw: input('skip'), anchor: input(0n), flag: input(false) },
      expected: { kind: 'True' },
    })
    const unknowns = prepareCheckRustGroup(
      [
        ['session_literal', "anchor = TIMESTAMP 'now'"],
        ['precision_cast', 'raw::timestamp(3) = anchor'],
      ].map(([name, sql]) => ({
        expression: lowerTableCheck(table, {
          name: name!,
          type: 'check',
          definition: `CHECK (${sql})`,
        })!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name! },
      })),
    )
    await mkdir(join(directory, 'literals'))
    await runCheckParity(
      join(directory, 'literals'),
      'timestamptextliterals',
      unknowns,
      ['session_literal', 'precision_cast'],
      ['session_literal', 'precision_cast'].map((name) => ({
        name,
        row: { anchor: input(0n), raw: input('2000-01-01 00:00:00.000001Z') },
        expected: { kind: 'Unknown' },
      })),
    )
    await runCheckParity(directory, 'timestamptext', group, names, fixtures)
  }, 120_000)

  it('checks real INSERTs through the generated Go and TypeScript public row APIs', async () => {
    await pg.exec(`CREATE TABLE timestamp_text_rows (
      raw text, anchor timestamp, skip bool,
      CONSTRAINT parsed_timestamp CHECK (CASE WHEN skip THEN true ELSE raw::timestamp >= anchor END)
    )`)
    const catalog = await snapshotCatalog(pg)
    const rows = catalog.tables.find((table) => table.name === 'timestamp_text_rows')!
    const root = join(directory, 'public-api')
    await mkdir(root)
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    const ts = renderTypescriptSchemaCheckArtifacts([rows], catalog.domains)
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
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const { evaluatePublicTimestampTextRowsChecks: evaluate } = await import(
      pathToFileURL(join(root, 'js/checks.js')).href
    )
    const cases: GoCheckCase[] = []
    for (const [raw, skip, code, result] of [
      ['2000-01-01', false, null, { certain: true, value: true }],
      ['1999-12-31', false, '23514', { certain: true, value: false }],
      ['2000-01-01 00:00:00', false, null, { certain: true, value: true }],
      ['2000-01-01 00:00:00Z', false, null, { certain: true, value: true }],
      ['1999-12-31 23:00:00-01', false, '23514', { certain: true, value: false }],
      ['2000-01-01 01:00:00+01', false, null, { certain: true, value: true }],
      ['2000-01-01 00:00:00.000001Z', false, null, { certain: true, value: true }],
      ['1999-12-31 23:59:59Z', false, '23514', { certain: true, value: false }],
      ['1999-12-31 23:59:59.999999Z', false, '23514', { certain: true, value: false }],
      ['1900-02-29 00:00:00Z', false, '22008', { certain: true, error: '22008' }],
      ['', false, '22007', { certain: true, error: '22007' }],
      ['2000-01-01 00:00:00+16', false, '22009', { certain: true, error: '22009' }],
      ['2000-01-01 00:00:00.0000005Z', false, null, { certain: false }],
      [null, false, null, { certain: true, value: null }],
      ['1900-02-29 00:00:00Z', true, null, { certain: true, value: true }],
      ['2000-01-01 00:00:00 America/New_York', false, null, { certain: false }],
    ] as const) {
      await pg.exec('BEGIN')
      try {
        await pg.query(
          "INSERT INTO timestamp_text_rows VALUES ($1, TIMESTAMP '2000-01-01 00:00:00+00', $2)",
          [raw, skip],
        )
        expect(code).toBeNull()
      } catch (error) {
        expect((error as { code: string }).code).toBe(code)
      } finally {
        await pg.exec('ROLLBACK')
      }
      const wrapped = { raw, anchor: runtime.makeTimestampValue(0n), skip }
      expect(evaluate(wrapped)[0].result).toEqual(result)
      cases.push({
        name: `${raw ?? 'NULL'}:${skip}`,
        table: rows,
        row: { raw, anchor: 0n, skip },
        timestampColumns: ['anchor'],
        results: [{ constraint: 'parsed_timestamp', result }],
      })
    }
    expect(evaluate({ anchor: runtime.makeTimestampValue(0n), skip: false })[0].result).toEqual({
      certain: false,
    })
    expect(runtime.timestampFromText(runtime.makeTextValue('2000-01-01 00:00:00Z'))).toEqual({
      kind: 'Value',
      value: 0n,
    })
    const goRoot = join(root, 'go')
    await mkdir(goRoot)
    const generated = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(goRoot, 'schema'),
      'timestamptextrows/schema',
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(goRoot, 'go.mod'),
      'module timestamptextrows\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(goRoot, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(goRoot, 'schema/public/checks_test.go'),
      renderGoCheckTests('public', cases, {
        dateRuntime: 'timestamptextrows/schema/public/checkrust/checkruntime',
      }),
    )
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: goRoot,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)
})
