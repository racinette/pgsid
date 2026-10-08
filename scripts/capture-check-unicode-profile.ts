import { PGlite } from '@electric-sql/pglite'
import { writeFile } from 'node:fs/promises'

const pg = await PGlite.create()
try {
  const result = await pg.query<{ encoding: string; unicode: string; icu: string | null }>(
    "SELECT current_setting('server_encoding') AS encoding, unicode_version() AS unicode, icu_unicode_version() AS icu",
  )
  await writeFile(
    new URL('../vendor/postgresql-unicode/database-profile.json', import.meta.url),
    JSON.stringify(result.rows[0], null, 2) + '\n',
  )
} finally {
  await pg.close()
}
