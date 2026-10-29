import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

// Name columns carry the C collation, so their patterns use byte and ASCII case semantics.
const expressions = {
  like: 'n ~~ p',
  not_like: 'n !~~ p',
  ilike: 'n ~~* p',
  not_ilike: 'n !~~* p',
  regex: 'n ~ p',
  not_regex: 'n !~ p',
  iregex: 'n ~* p',
  not_iregex: 'n !~* p',
  like_function: 'like(n, p)',
  notlike_function: 'notlike(n, p)',
  lazy: 'CASE WHEN flag THEN true ELSE n ~* p END',
}
const rows: [string | null, string | null][] = [
  ['Abc', 'a%'],
  ['Abc', 'A%'],
  ['abc', '_b_'],
  ['ÄBC', 'ä%'],
  ['ÄBC', 'Ä%'],
  ['a%b', 'a\\%b'],
  ['', '%'],
  ['Abc', '^a'],
  ['Abc', '^[A-Z]b'],
  ['ÄBC', '^ä'],
  ['Abc', '('],
  ['x'.repeat(63), 'x%'],
  [null, 'a%'],
  ['Abc', null],
]
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('matches name LIKE, ILIKE and regex patterns under the C collation in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-name-patterns-'))
  try {
    await pg.exec(`CREATE TABLE name_patterns (n name, p text, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'name_patterns')!
    const constraints = Object.keys(expressions).flatMap((name) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        {
          ...stored,
          name: name + '_raw',
          definition: `CHECK (${expressions[name as keyof typeof expressions]})`,
        },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => {
        const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
        expect(expression.kind, constraint.name).not.toBe('uncertain')
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        }
      }),
    )
    group.checks.forEach((check, i) => expect(check.kind, constraints[i]!.name).toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [n, p] of rows)
      for (const flag of [false, true])
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${sql}) AS value FROM (SELECT $1::name n, $2::text p, $3::bool flag) candidate`,
                  [n, p, flag],
                )
              ).rows[0]!.value,
            )
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: Number.parseInt((error as { code: string }).code, 36) },
            }
          }
          for (const suffix of ['raw', 'stored'])
            fixtures.push({
              name: `${name}_${suffix}`,
              row: { n: input(n), p: input(p), flag: input(flag) },
              expected,
            })
        }
    await runCheckParity(
      directory,
      'namepatterns',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
