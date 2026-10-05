import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'

const run = promisify(execFile)
const definitions = {
  positive: 'amount > 0',
  exact: 'amount > 9007199254740992',
  same: 'amount = other',
  mixed: 'amount > small',
  reversed: 'small < amount',
  limits: 'amount BETWEEN -9223372036854775808 AND 9223372036854775807',
  in_list: 'amount IN (0, 9007199254740993, NULL)',
  scalar_case: '(CASE WHEN flag THEN amount ELSE 0 END) > small',
  simple_case: 'CASE amount WHEN 0 THEN false WHEN 9007199254740993 THEN flag ELSE true END',
  null_test: 'amount IS NULL',
}
type Row = {
  amount?: bigint | null
  other?: bigint | null
  small?: number | null
  flag?: boolean | null
}
const rows: Row[] = [
  { amount: -9223372036854775808n, other: 0n, small: -2147483648, flag: true },
  { amount: 9223372036854775807n, other: 9223372036854775807n, small: 2147483647, flag: true },
  { amount: 9007199254740992n, other: 9007199254740993n, small: 1, flag: true },
  { amount: 9007199254740993n, other: 9007199254740992n, small: 1, flag: true },
  { amount: 0n, other: 0n, small: 0, flag: false },
  { amount: null, other: null, small: null, flag: null },
  {},
]

it.each([true, false])(
  'preserves exact int8 values through table and domain validators (Rust=%s)',
  async (rust) => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-int8-validator-'))
    try {
      await pg.exec(`CREATE DOMAIN public.positive_bigint AS bigint CONSTRAINT positive CHECK(VALUE > 0);
      CREATE TABLE public.int8_checks (amount bigint, other bigint, small int4, flag bool, ${Object.entries(
        definitions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(', ')});
      CREATE TABLE int8_inputs (amount bigint, other bigint, small int4, flag bool)`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((item) => item.name === 'int8_checks')!
      const domains = catalog.domains.filter((item) => item.name === 'positive_bigint')
      const expected: Record<string, boolean | null | undefined>[] = []
      for (const row of rows.slice(0, -1)) {
        await pg.exec('TRUNCATE int8_inputs')
        await pg.query('INSERT INTO int8_inputs VALUES ($1,$2,$3,$4)', [
          row.amount?.toString() ?? null,
          row.other?.toString() ?? null,
          row.small,
          row.flag,
        ])
        const result: Record<string, boolean | null | undefined> = {}
        for (const [name, sql] of Object.entries(definitions))
          result[name] = (
            await pg.query<{ value: boolean | null }>(`SELECT (${sql}) AS value FROM int8_inputs`)
          ).rows[0]!.value
        expected.push(result)
      }
      expected.push(Object.fromEntries(Object.keys(definitions).map((name) => [name, undefined])))
      const typescript = renderTypescriptSchemaCheckArtifacts([table], domains, domains, {}, rust)
      const go = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        domains,
        domains,
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
        undefined,
        'int8-production',
        rust,
      )
      if (rust)
        for (const name of Object.keys(definitions)) {
          expect(typescript.checks).toMatch(new RegExp(`"${name}", \\(\\) => checkRustOutcome`))
          expect(go.checks).toMatch(new RegExp(`"${name}", checkRustOutcome`))
        }
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
      ]).catch((error: { message: string; signal: string; stdout: string; stderr: string }) => {
        throw new Error(`${error.message} (${error.signal})\n${error.stdout}${error.stderr}`)
      })
      const generated = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
      for (const [index, row] of rows.entries()) {
        const result = generated.evaluatePublicInt8ChecksChecks(row) as {
          constraint: string
          result: { certain: boolean; value?: boolean | null }
        }[]
        expect(
          Object.fromEntries(
            result.map(({ constraint, result }) => [
              constraint,
              result.certain ? result.value : undefined,
            ]),
          ),
        ).toEqual(expected[index])
        const domainResult = generated.evaluatePublicPositiveBigintDomainChecks(
          Object.hasOwn(row, 'amount') ? { value: row.amount } : {},
        )
        const value =
          row.amount === undefined ? undefined : row.amount === null ? null : row.amount > 0n
        expect(domainResult[0].result).toEqual(
          value === undefined ? { certain: false } : { certain: true, value },
        )
      }
      for (const row of rows.slice(0, -1)) {
        const stringRow = {
          ...row,
          amount: row.amount?.toString() ?? null,
          other: row.other?.toString() ?? null,
        }
        expect(generated.evaluatePublicInt8ChecksChecks(stringRow)).toEqual(
          generated.evaluatePublicInt8ChecksChecks(row),
        )
        expect(
          generated.evaluatePublicPositiveBigintDomainChecks({ value: stringRow.amount }),
        ).toEqual(generated.evaluatePublicPositiveBigintDomainChecks({ value: row.amount }))
      }
      if (rust) {
        for (const value of [
          9007199254740992,
          NaN,
          Infinity,
          0.5,
          'invalid',
          '9223372036854775808',
          '-9223372036854775809',
          9223372036854775808n,
          -9223372036854775809n,
        ]) {
          const positive = generated
            .evaluatePublicInt8ChecksChecks({ amount: value })
            .find((check: { constraint: string }) => check.constraint === 'positive')
          expect(positive.result).toEqual({ certain: false })
        }
        const positive = generated
          .evaluatePublicInt8ChecksChecks({ amount: 42 })
          .find((check: { constraint: string }) => check.constraint === 'positive')
        expect(positive.result).toEqual({ certain: true, value: true })
      }
      await writeFile(join(directory, 'go.mod'), 'module int8-production\n\ngo 1.25\n')
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
          'PublicInt8ChecksCheckInput{' +
          Object.entries(row)
            .map(([name, value]) => {
              const type = name === 'small' ? 'int32' : name === 'flag' ? 'bool' : 'int64'
              return `${name[0]!.toUpperCase() + name.slice(1)}: ${value === null ? `NullCheckValue[*${type}]()` : `KnownCheckValue(ptr(${type}(${value})))`}`
            })
            .join(', ') +
          '}',
      )
      const assertions = expected.flatMap((row, index) =>
        Object.entries(row).map(
          ([name, value]) =>
            `if result := results[${index}]["${name}"]; ${value === undefined ? 'result.Certain' : value === null ? '!result.Certain || result.Value.Valid' : `!result.Certain || !result.Value.Valid || result.Value.Value != ${value}`} {t.Fatalf("${index} ${name}: %+v",result)}`,
        ),
      )
      const domainRows = rows.map((row) =>
        row.amount === undefined
          ? 'PublicPositiveBigintCheckInput{}'
          : `PublicPositiveBigintCheckInput{Value: ${row.amount === null ? 'NullCheckValue[*int64]()' : `KnownCheckValue(ptr(int64(${row.amount})))`}}`,
      )
      const domainAssertions = rows.map(
        (row, index) =>
          `if result := domainResults[${index}]; ${row.amount === undefined ? 'result.Certain' : row.amount === null ? '!result.Certain || result.Value.Valid' : `!result.Certain || !result.Value.Valid || result.Value.Value != ${row.amount > 0n}`} {t.Fatalf("domain ${index}: %+v", result)}`,
      )
      await writeFile(
        join(directory, 'checks_test.go'),
        `package checks
import "testing"
func ptr[T any](value T)*T{return &value}
func TestInt8(t *testing.T){
rows:=[]PublicInt8ChecksCheckInput{${goRows.join(', ')}}
results:=[]map[string]EvalBool{}
for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range EvaluatePublicInt8ChecksChecks(row){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}
domainRows:=[]PublicPositiveBigintCheckInput{${domainRows.join(', ')}}
domainResults:=[]EvalBool{}
for _,row:=range domainRows{domainResults=append(domainResults,EvaluatePublicPositiveBigintDomainChecks(row)[0].Result)}
${domainAssertions.join('\n')}
}`,
      )
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
)
