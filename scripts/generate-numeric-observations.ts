import { readFile, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { format } from 'prettier'
import { numericSpecs } from '../tests/fixtures/sql-semantics/operations/numeric-specs.js'
import { observeSql } from '../tests/support/postgres/observe.js'
import { PG18_BUILTINS_VERSION } from '../src/postgres/builtins/groups.generated.js'

const pg = await PGlite.create()
try {
  const version = await pg.query<{ server_version_num: string }>('SHOW server_version_num')
  if (Number(version.rows[0]!.server_version_num) !== PG18_BUILTINS_VERSION)
    throw new Error('Unexpected PostgreSQL version')
  const expected: Record<string, Awaited<ReturnType<typeof observeSql>>> = {}
  for (const fixture of numericSpecs) {
    if (Object.hasOwn(expected, fixture.name)) throw new Error(`Duplicate fixture: ${fixture.name}`)
    expected[fixture.name] = await observeSql(pg, fixture.sql, fixture.expression.type)
  }
  const output = await format(
    `import type { SqlObservation } from '../../../support/postgres/observe.js'\nexport const numericObservations: Readonly<Record<string, SqlObservation>> = ${JSON.stringify(expected, null, 2)}\n`,
    { parser: 'typescript', singleQuote: true, semi: false, printWidth: 96 },
  )
  const path = new URL(
    '../tests/fixtures/sql-semantics/operations/numeric-observations.generated.ts',
    import.meta.url,
  )
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')) !== output)
      throw new Error('Numeric observations need regeneration')
  } else await writeFile(path, output)
  process.stdout.write(`Checked ${numericSpecs.length} numeric observations\n`)
} finally {
  await pg.close()
}
