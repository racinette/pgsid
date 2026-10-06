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
  equal: 'raw::date = anchor',
  greater: 'raw::pg_catalog.date > anchor',
  null_test: 'raw::date IS NULL',
  between: "raw::date BETWEEN DATE '1999-12-31' AND DATE '2000-02-29'",
  membership: "raw::date IN (DATE '2000-01-01', DATE 'infinity', NULL)",
  lazy: 'CASE WHEN flag THEN true ELSE raw::date = anchor END',
  scalar_case: "(CASE WHEN flag THEN raw::date ELSE DATE '2000-01-01' END) = anchor",
  text_case: "(CASE WHEN flag THEN raw ELSE '2000-01-01' END)::date = anchor",
  literal: "anchor = ' 2000-1-1 ad '::date",
  typed_text_literal: "anchor = ('2000-01-01'::text)::date",
  bc_literal: "anchor >= DATE '4714-11-24 bc'",
  infinity_literal: "anchor < DATE '+INFINITY'",
}
const supportedText = [
  null,
  '',
  ' \t\r\n\v\f ',
  '2000-01-01',
  '00002000-01-01',
  ' 2000-1-1 ',
  '\t2000-02-29\n',
  '1999-12-31',
  '0001-01-01',
  '0001-01-01 BC',
  '0001-02-29bc',
  '0044-03-15 bC',
  '2000-01-01 Ad',
  '4714-11-24 BC',
  '4714-11-23 BC',
  '5874897-12-31',
  '5874898-01-01',
  '99999999999999999999-01-01',
  '0000-01-01',
  '0000-01-01 BC',
  '1900-02-29',
  '2100-02-29',
  '2000-00-01',
  '2000-13-01',
  '2000-01-00',
  '2000-01-32',
  '2000-01-',
  '2000-04-31',
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
  '01-02-03',
  '01/02/2000',
  'January 1, 2000',
  '20000101',
  '2000-001',
  '2000-01-001',
  '2000-01-01 12:00',
  '2000-01-01Z',
  '2000-01--01',
  '2000-01-01-',
  'epoch',
]
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const run = promisify(execFile)

describe('Rust text-to-date CHECK casts', () => {
  let pg: PGlite
  let directory: string
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-date-text-'))
    await pg.exec(`CREATE TABLE date_text_checks (
      raw text, anchor date, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')}
    )`)
    table = (await snapshotCatalog(pg)).tables.find((table) => table.name === 'date_text_checks')!
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
    const cast = prepare('raw::date = anchor')
    expect(cast.checks[0]!.kind).toBe('supported')
    expect(cast.evaluatorSource).toContain('date_from_text(input_raw.clone())')
    expect(prepare("anchor = DATE '2000-01-01'").evaluatorSource).toContain('date_from_text(')
    expect(prepare('raw::date IS NULL').checks[0]!.kind).toBe('supported')
    expect(prepare('flag::date IS NULL').evaluatorSource).not.toContain('date_from_text(')
    const expression = lowerTableCheck(table, {
      name: 'probe',
      type: 'check',
      definition: 'CHECK (raw::date IS NULL)',
    })!.expression
    expect(JSON.stringify(portableCheckAtoms(expression))).toContain('text-to-date')
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
      const row: Row = { raw: input(raw), anchor: input(0), flag: input(flag) }
      for (const [name, sql] of Object.entries(expressions)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT $1::text raw, DATE '2000-01-01' anchor, $2::bool flag) candidate`,
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
    for (const style of ['MDY', 'DMY', 'YMD']) {
      await pg.exec(`SET DateStyle = 'ISO, ${style}'`)
      for (const raw of supportedText) {
        await oracle(raw, false)
        await oracle(raw, true)
        if (raw !== null) {
          try {
            const hex = (
              await pg.query<{ binary: string }>(
                "SELECT encode(date_send($1::date), 'hex') AS binary",
                [raw],
              )
            ).rows[0]!.binary
            fixtures.push({
              name: 'equal',
              row: {
                raw: input(raw),
                anchor: input(Buffer.from(hex, 'hex').readInt32BE()),
                flag: input(false),
              },
              expected: { kind: 'True' },
            })
          } catch (error) {
            expect(['22007', '22008']).toContain((error as { code: string }).code)
          }
        }
      }
      for (const raw of unsupportedText) {
        if (style === 'MDY') await pg.query('SELECT $1::date', [raw])
        for (const name of ['equal', 'greater', 'null_test', 'between', 'membership'])
          fixtures.push({
            name,
            row: { raw: input(raw), anchor: input(0), flag: input(false) },
            expected: { kind: 'Unknown' },
          })
      }
    }
    for (const raw of ['not a date', '2000-01-01 junk', 'λ', '2'.repeat(129) + '-01-01'])
      fixtures.push({
        name: 'null_test',
        row: { raw: input(raw), anchor: input(0), flag: input(false) },
        expected: { kind: 'Unknown' },
      })
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22012', 36) } }
    for (const raw of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      const row: Row = { raw, anchor: input(0), flag: input(false) }
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
    const unknowns = prepare("anchor = DATE 'today'")
    await mkdir(join(directory, 'literals'))
    await runCheckParity(
      join(directory, 'literals'),
      'datetextliterals',
      unknowns,
      ['probe'],
      [{ name: 'probe', row: { anchor: input(0) }, expected: { kind: 'Unknown' } }],
    )
    await runCheckParity(directory, 'datetext', group, names, fixtures)
  }, 120_000)

  it('checks real INSERTs through the generated Go and TypeScript public row APIs', async () => {
    await pg.exec(`CREATE TABLE date_text_rows (
      raw text, anchor date, skip bool,
      CONSTRAINT parsed_date CHECK (CASE WHEN skip THEN true ELSE raw::date >= anchor END)
    )`)
    const catalog = await snapshotCatalog(pg)
    const rows = catalog.tables.find((table) => table.name === 'date_text_rows')!
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
    const { evaluatePublicDateTextRowsChecks: evaluate } = await import(
      pathToFileURL(join(root, 'js/checks.js')).href
    )
    const cases: GoCheckCase[] = []
    for (const [raw, skip, code, result] of [
      ['2000-01-01', false, null, { certain: true, value: true }],
      ['1999-12-31', false, '23514', { certain: true, value: false }],
      ['1900-02-29', false, '22008', { certain: true, error: '22008' }],
      ['', false, '22007', { certain: true, error: '22007' }],
      [null, false, null, { certain: true, value: null }],
      ['1900-02-29', true, null, { certain: true, value: true }],
      ['today', false, null, { certain: false }],
    ] as const) {
      await pg.exec('BEGIN')
      try {
        await pg.query("INSERT INTO date_text_rows VALUES ($1, DATE '2000-01-01', $2)", [raw, skip])
        expect(code).toBeNull()
      } catch (error) {
        expect((error as { code: string }).code).toBe(code)
      } finally {
        await pg.exec('ROLLBACK')
      }
      const wrapped = { raw, anchor: runtime.makeDateValue(0), skip }
      expect(evaluate(wrapped)[0].result).toEqual(result)
      cases.push({
        name: `${raw ?? 'NULL'}:${skip}`,
        table: rows,
        row: { raw, anchor: 0, skip },
        results: [{ constraint: 'parsed_date', result }],
      })
    }
    expect(evaluate({ anchor: runtime.makeDateValue(0), skip: false })[0].result).toEqual({
      certain: false,
    })
    expect(runtime.dateFromText(runtime.makeTextValue('2000-01-01'))).toEqual({
      kind: 'Value',
      value: 0,
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
      'datetextrows/schema',
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(goRoot, 'go.mod'),
      'module datetextrows\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(goRoot, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(goRoot, 'schema/public/checks_test.go'),
      renderGoCheckTests('public', cases, {
        dateRuntime: 'datetextrows/schema/public/checkrust/checkruntime',
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
