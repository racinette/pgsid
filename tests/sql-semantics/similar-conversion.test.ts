import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { similarToEscape } from '../../src/sql-semantics/regex/similar.js'

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

  it('matches PostgreSQL conversion and SQLSTATE for escape forms', async () => {
    for (const pattern of patterns) {
      for (const escape of escapeModes) {
        let observed: { kind: 'converted'; pattern: string } | { kind: 'invalid'; sqlstate: string }
        try {
          const result = await pg.query<{ translated: string }>(
            escape === undefined
              ? 'SELECT pg_catalog.similar_to_escape($1::text) AS translated'
              : 'SELECT pg_catalog.similar_to_escape($1::text, $2::text) AS translated',
            escape === undefined ? [pattern] : [pattern, escape],
          )
          observed = { kind: 'converted', pattern: result.rows[0]!.translated }
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string')
            throw error
          observed = { kind: 'invalid', sqlstate: error.code }
        }
        expect(similarToEscape(pattern, escape), `${JSON.stringify([pattern, escape])}`).toEqual(
          observed,
        )
      }
    }
  })
})
