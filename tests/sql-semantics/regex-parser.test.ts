import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { postgresRegexFeatures } from '../../src/sql-semantics/regex/features.js'
import { parsePostgresRegex } from '../../src/sql-semantics/regex/parser.js'
import {
  invalidRegexPatterns,
  validRegexPatterns,
} from '../fixtures/sql-semantics/regex/parser-patterns.js'

let pg: PGlite

const postgresAccepts = async (pattern: string): Promise<boolean> => {
  await pg.exec('SAVEPOINT regex_pattern')
  try {
    await pg.query(`SELECT ''::text ~ $1::text`, [pattern])
    await pg.exec('RELEASE SAVEPOINT regex_pattern')
    return true
  } catch {
    await pg.exec('ROLLBACK TO SAVEPOINT regex_pattern')
    await pg.exec('RELEASE SAVEPOINT regex_pattern')
    return false
  }
}

describe('PostgreSQL regular expression parser', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec('BEGIN')
  })

  afterAll(async () => {
    await pg.exec('ROLLBACK')
    await pg.close()
  })

  it.each(validRegexPatterns)('accepts PostgreSQL pattern %j', async (pattern) => {
    expect(await postgresAccepts(pattern)).toBe(true)
    expect(parsePostgresRegex(pattern).kind).toBe('valid')
  })

  it.each(invalidRegexPatterns)('rejects PostgreSQL pattern %j', async (pattern) => {
    expect(await postgresAccepts(pattern)).toBe(false)
    expect(parsePostgresRegex(pattern)).toMatchObject({ kind: 'invalid', sqlstate: '2201B' })
  })

  it('normalizes syntax spellings into semantic nodes', () => {
    expect(parsePostgresRegex('a(?:b|c){2,3}?')).toEqual({
      kind: 'valid',
      regex: {
        kind: 'regex',
        syntax: 'advanced',
        caseSensitive: true,
        newline: 'ordinary',
        captures: 0,
        expression: {
          kind: 'concatenation',
          expressions: [
            { kind: 'literal', value: 'a' },
            {
              kind: 'repeat',
              minimum: 2,
              maximum: 3,
              preference: 'nongreedy',
              expression: {
                kind: 'group',
                capturing: false,
                expression: {
                  kind: 'alternation',
                  branches: [
                    { kind: 'literal', value: 'b' },
                    { kind: 'literal', value: 'c' },
                  ],
                },
              },
            },
          ],
        },
      },
    })
  })

  it('normalizes newline modes and absolute anchors separately', () => {
    const parsed = parsePostgresRegex('(?n)^.\\A$\\Z')
    expect(parsed).toMatchObject({
      kind: 'valid',
      regex: {
        newline: 'sensitive',
        expression: {
          kind: 'concatenation',
          expressions: [
            { kind: 'assertion', assertion: 'beginning-of-line' },
            { kind: 'any-character', includesNewline: false },
            { kind: 'assertion', assertion: 'beginning-of-string' },
            { kind: 'assertion', assertion: 'end-of-line' },
            { kind: 'assertion', assertion: 'end-of-string' },
          ],
        },
      },
    })
  })

  it('retains capture identity after syntax normalization', () => {
    expect(parsePostgresRegex('(a)(?:b)(c)\\2')).toMatchObject({
      kind: 'valid',
      regex: {
        captures: 2,
        expression: {
          expressions: [
            { kind: 'group', capturing: true, capture: 1 },
            { kind: 'group', capturing: false },
            { kind: 'group', capturing: true, capture: 2 },
            { kind: 'backreference', capture: 2 },
          ],
        },
      },
    })
  })

  it.each([
    ['abc', ['literal', 'case-sensitive', 'unicode-code-points', 'substring-search']],
    [
      '(?i)a(?:b|c){2,3}?',
      [
        'literal',
        'concatenation',
        'alternation',
        'noncapturing-group',
        'bounded-quantifier',
        'nongreedy-preference',
        'case-insensitive',
        'unicode-code-points',
        'substring-search',
      ],
    ],
    [
      '(?n)^[^a-z].$',
      [
        'concatenation',
        'any-character-excluding-newline',
        'negated-bracket-class-excluding-newline',
        'character-range',
        'beginning-of-line',
        'end-of-line',
        'case-sensitive',
        'unicode-code-points',
        'substring-search',
      ],
    ],
    [
      '(a)\\1(?=b)',
      [
        'literal',
        'concatenation',
        'capturing-group',
        'positive-lookahead',
        'backreference',
        'case-sensitive',
        'unicode-code-points',
        'substring-search',
      ],
    ],
  ] as const)('derives normalized engine features for %j', (pattern, expected) => {
    const parsed = parsePostgresRegex(pattern)
    if (parsed.kind !== 'valid') throw new Error(`Expected valid pattern ${pattern}`)
    expect(postgresRegexFeatures(parsed.regex)).toEqual(expected)
  })
})
