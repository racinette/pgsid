import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

let pg: PGlite

const patterns = [
  '',
  'abc',
  'a%b_c',
  'a.b^c$d',
  '(ab|cd)',
  '[a-z]_',
  '[^]x]',
  '[[:digit:]]',
  'a\\%b',
  'a\\_b',
  'a\\"b\\"c',
  'a\\"b\\"c\\"d',
  'a\\',
  'é😀中',
  '[a\\]b]',
]

const escapeModes = [undefined, '', '\\', '#', '😀', '##'] as const

describe('SIMILAR TO pattern conversion', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
  })

  afterAll(async () => {
    await pg.close()
  })

  it('matches PostgreSQL conversion and SQLSTATE for escape forms in every target', async () => {
    await pg.exec('CREATE TABLE similar_patterns (unused boolean)')
    const table = (await snapshotCatalog(pg)).tables.find(
      (item) => item.name === 'similar_patterns',
    )!
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'::text`
    const checks: { name: string; sql: string; expected: Outcome }[] = []
    for (const pattern of patterns) {
      for (const escape of escapeModes) {
        const call = `pg_catalog.similar_to_escape(${escape === undefined ? quote(pattern) : `${quote(pattern)}, ${quote(escape)}`})`
        let expected: Outcome
        let sql = `${call} IS NULL`
        try {
          const result = await pg.query<{ translated: string }>(`SELECT ${call} AS translated`)
          sql = `${call} = ${quote(result.rows[0]!.translated)}`
          expected = { kind: 'True' }
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string')
            throw error
          expected = { kind: 'Error', value: { state: Number.parseInt(error.code, 36) } }
        }
        checks.push({ name: `pattern_${checks.length}`, sql, expected })
      }
    }
    const group = prepareCheckRustGroup(
      checks.map(({ name, sql }) => ({
        expression: lowerTableCheck(table, { name, type: 'check', definition: `CHECK (${sql})` })!
          .expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
      })),
      { serverEncoding: 'UTF8' },
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind === 'unsupported' ? check.reason : check.kind, checks[index]!.sql).toBe(
        'supported',
      )
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-similar-conversion-'))
    try {
      await runCheckParity(
        directory,
        'similar_conversion',
        group,
        checks.map(({ name }) => name),
        checks.map(({ name, expected }) => ({ name, row: {}, expected })),
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 180_000)
})
