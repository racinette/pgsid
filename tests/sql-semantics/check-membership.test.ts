import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'

const run = promisify(execFile)
const definitions = {
  int4_in: 'amount IN (0, 1, NULL)',
  int4_not_in: 'amount NOT IN (0, 1, NULL)',
  text_in: "note IN ('a', '😀', NULL)",
  text_not_in: "note NOT IN ('a', '😀', NULL)",
  bool_in: 'flag IN (true, NULL)',
  bool_not_in: 'flag NOT IN (true, NULL)',
  lazy_in: 'amount IN (0, other + 1)',
  lazy_not_in: 'amount NOT IN (0, other + 1)',
  mixed: 'amount IN (other + 1, 0, 1)',
  eager_in: 'amount = ANY (ARRAY[0, other + 1])',
  eager_not_in: 'amount <> ALL (ARRAY[0, other + 1])',
  computed_subject: '(amount + 1) IN (0, 1)',
  nested: "CASE WHEN amount IN (0, 1) THEN flag ELSE note NOT IN ('a', '😀') END",
  scalar: '(amount IN (0, NULL)) IS NULL',
}
type Row = {
  amount?: number | null
  other?: number | null
  flag?: boolean | null
  note?: string | null
}
type Outcome = boolean | null | undefined | '22003'
const rows: Row[] = [
  { amount: 0, other: 0, flag: true, note: 'a' },
  { amount: 2, other: 0, flag: false, note: 'z' },
  { amount: null, other: null, flag: null, note: null },
  { amount: 0, other: 2147483647, flag: true, note: '😀' },
  { amount: 2147483647, other: 0, flag: false, note: null },
  { amount: 0, note: 'a' },
]

describe('CHECK membership validators', () => {
  let pg: PGlite
  let catalog: CatalogSnapshot
  let table: TableInfo
  const expected: Record<string, Outcome>[] = []
  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(
      `CREATE TABLE public.membership_checks (amount int4, other int4, flag bool, note text COLLATE "C", ${Object.entries(
        definitions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(', ')})`,
    )
    await pg.exec(
      'CREATE TABLE membership_inputs (amount int4, other int4, flag bool, note text COLLATE "C")',
    )
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'membership_checks')!
    for (const row of rows.slice(0, -1)) {
      await pg.exec('TRUNCATE membership_inputs')
      await pg.query('INSERT INTO membership_inputs VALUES ($1,$2,$3,$4)', [
        row.amount,
        row.other,
        row.flag,
        row.note,
      ])
      const results: Record<string, Outcome> = {}
      for (const [name, sql] of Object.entries(definitions)) {
        try {
          results[name] = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM membership_inputs`,
            )
          ).rows[0]!.value
        } catch (error) {
          expect(error).toMatchObject({ code: '22003' })
          results[name] = '22003'
        }
      }
      expected.push(results)
    }
    expected.push({
      int4_in: true,
      int4_not_in: false,
      text_in: true,
      text_not_in: false,
      bool_in: undefined,
      bool_not_in: undefined,
      lazy_in: true,
      lazy_not_in: false,
      mixed: true,
      eager_in: true,
      eager_not_in: false,
      computed_subject: true,
      nested: undefined,
      scalar: false,
    })
  })
  afterAll(async () => pg.close())

  it.each([true, false])(
    'runs PostgreSQL membership semantics through validators (Rust=%s)',
    async (rust) => {
      const typescript = renderTypescriptSchemaCheckArtifacts([table], [], [], {}, rust)
      const go = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        [],
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
        undefined,
        'membership-production',
        rust,
      )
      if (rust) {
        for (const name of Object.keys(definitions)) {
          expect(typescript.checks).toMatch(
            new RegExp(`constraint: "${name}", result: checkRustOutcome`),
          )
          expect(go.checks).toMatch(
            new RegExp(`Constraint: "${name}",\\s*Result: checkRustOutcome`),
          )
        }
      }
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-membership-validator-'))
      try {
        await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
        await writeFile(join(directory, 'checks.ts'), typescript.checks)
        if (typescript.rustFiles)
          for (const artifact of checkTypescriptArtifacts(typescript.rustFiles)) {
            const path = join(directory, 'checks-rust', artifact.path)
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
          join(directory, 'js'),
          join(directory, 'checks.ts'),
        ])
        const generated = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
        for (const [index, row] of rows.entries()) {
          if (Object.values(expected[index]!).includes('22003')) {
            expect(() => generated.evaluatePublicMembershipChecksChecks(row)).toThrowError(
              expect.objectContaining({ code: '22003' }),
            )
          } else {
            const results = generated.evaluatePublicMembershipChecksChecks(row) as {
              constraint: string
              result: { certain: boolean; value?: boolean | null }
            }[]
            expect(
              Object.fromEntries(
                results.map(({ constraint, result }) => [
                  constraint,
                  result.certain ? result.value : undefined,
                ]),
              ),
            ).toEqual(expected[index])
          }
        }
        await writeFile(join(directory, 'go.mod'), 'module membership-production\n\ngo 1.24\n')
        await writeFile(join(directory, 'checks.go'), go.checks)
        if (go.rustFiles)
          for (const [name, source] of Object.entries(go.rustFiles)) {
            if (!source) continue
            const path = join(
              directory,
              'checkrust',
              name === 'checks'
                ? 'checks.go'
                : name === 'runtime'
                  ? 'checkruntime/runtime.go'
                  : name === 'language'
                    ? 'langruntime/runtime.go'
                    : name === 'regex'
                      ? 'regexengine/regex.go'
                      : 'pg_catalog/operations.go',
            )
            await mkdir(dirname(path), { recursive: true })
            await writeFile(path, source)
          }
        const goRows = rows.map(
          (row) =>
            'PublicMembershipChecksCheckInput{' +
            Object.entries(row)
              .map(([name, value]) => {
                const field = name[0]!.toUpperCase() + name.slice(1)
                const type = name === 'flag' ? 'bool' : name === 'note' ? 'string' : 'int32'
                return `${field}: ${value === null ? `NullCheckValue[*${type}]()` : `KnownCheckValue(ptr(${type}(${JSON.stringify(value)})))`}`
              })
              .join(', ') +
            '}',
        )
        const assertions = expected.flatMap((row, index) =>
          Object.entries(row).map(
            ([name, value]) =>
              `if result := results[${index}]["${name}"]; ${value === '22003' ? 'result.Value.Error != "22003"' : value === undefined ? 'result.Certain' : value === null ? '!result.Certain || result.Value.Valid' : `!result.Certain || !result.Value.Valid || result.Value.Value != ${value}`} {t.Fatalf("${index} ${name}: %+v", result)}`,
          ),
        )
        await writeFile(
          join(directory, 'checks_test.go'),
          `package checks\nimport "testing"\nfunc ptr[T any](value T) *T {return &value}\nfunc TestMembership(t *testing.T) {\nrows := []PublicMembershipChecksCheckInput{${goRows.join(', ')}}\nresults := []map[string]EvalBool{}\nfor _, row := range rows {values := map[string]EvalBool{}; for _, check := range EvaluatePublicMembershipChecksChecks(row) {values[check.Constraint] = check.Result}; results = append(results,values)}\n${assertions.join('\n')}\n}`,
        )
        await run('go', ['test', './...'], {
          cwd: directory,
          env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
        })
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
  )

  it('binds the membership subject once in fallback validators', async () => {
    const single = {
      ...table,
      constraints: table.constraints.filter((item) => item.name === 'computed_subject'),
    }
    const source = renderTypescriptSchemaCheckArtifacts([single], [], [], {}, false).checks
    const ts = await import('typescript')
    const js = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const evaluate = Function(
      'exports',
      `${js}; return evaluatePublicMembershipChecksChecks`,
    )({}) as (row: Row) => { result: { certain: boolean; value?: boolean | null } }[]
    let reads = 0
    expect(
      evaluate({
        get amount() {
          reads++
          return 0
        },
      })[0]!.result,
    ).toEqual({ certain: true, value: true })
    expect(reads).toBe(1)
  })

  it('keeps unsupported membership forms uncertain', () => {
    const host = {
      columns: [
        ...table.columns,
        { name: 'plain', typeName: 'text', collationIsC: false },
        { name: 'items', typeName: 'integer[]', collationIsC: false },
      ],
    }
    for (const sql of [
      "plain IN ('a','b')",
      'amount = ANY (items)',
      "amount = ANY ('{0,1}'::int4[])",
      'amount = ANY (ARRAY[]::int4[])',
      'amount = ANY (NULL::int4[])',
      'amount = ANY (ARRAY[[0,1],[2,3]])',
      'amount > ANY (ARRAY[0,1])',
      'amount = ALL (ARRAY[0,1])',
    ]) {
      expect(
        lowerTableCheck(host, { name: 'unsupported', type: 'check', definition: `CHECK (${sql})` })
          ?.expression,
      ).toEqual({ kind: 'uncertain' })
    }
  })
})
