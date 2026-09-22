import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { postgresRegexFeatures } from '../../src/sql-semantics/regex/features.js'
import { parsePostgresRegex } from '../../src/sql-semantics/regex/parser.js'

const validPatterns = [
  '',
  'abc',
  'a|b',
  '|a|',
  '(a)',
  '(?:a)',
  '.',
  '[abc]',
  '[^abc]',
  '[]a]',
  '[n-]',
  '[a-z[:digit:]]',
  '[[.tab.]]',
  '[[=a=]]',
  '\\n',
  '\\u1234',
  '\\U0001F600',
  '\\x41',
  '\\x123456',
  '\\101',
  '\\0',
  '\\777',
  '\\uD800',
  '\\U7ffffffe',
  '\\d\\D\\s\\S\\w\\W',
  '[\\d\\D]',
  '[\\12]',
  '(a)\\1',
  '(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)\\10',
  'a*',
  'a+?',
  'a??',
  'a{0}',
  'a{1,}',
  'a{1,2}?',
  '^a$',
  '\\Aa\\Z',
  '\\mword\\M',
  '\\yword\\Y',
  '[[:<:]]word[[:>:]]',
  '(?=a)a',
  '(?!a)b',
  '(?<=a)b',
  '(?<!a)b',
  '(?# ignored)a',
  '(?x) a  # ignored\n b',
  '(?n)^.$',
  '(?p)^.$',
  '(?w)^.$',
  '(?q)a.*',
  '***=a.*',
  '***:(?:a)',
  '(?e)(a|b)+',
  '(?e)\\d',
  '(?e))',
  '(?b)\\(a\\)\\1',
  '(?b)^a\\{1,2\\}$',
  '(?b)a\\{0\\}',
  '(?b)*a',
  '(?b)^*a',
  '(?b)a+?',
] as const

const invalidPatterns = [
  '\\',
  '*a',
  '+a',
  '?a',
  '{1}',
  'a**',
  'a{256}',
  'a{2,1}',
  'a{1',
  '(',
  ')',
  '[',
  '[z-a]',
  '[a-c-e]',
  '[[:bogus:]]',
  '[[.unknown.]]',
  '[[=a=]-z]',
  '\\q',
  '\\u123',
  '\\U7fffffff',
  '\\x',
  '\\1',
  '(?=\\1)',
  '(?=a)*',
  '[\\A]',
  '[\\1]',
  '[[:digit:]-a]',
  '(?z)a',
  '***x',
  '(?e)*a',
  '(?b)\\1',
  '(?b)\\{1\\}',
  '(?b)\\)',
] as const

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

  it.each(validPatterns)('accepts PostgreSQL pattern %j', async (pattern) => {
    expect(await postgresAccepts(pattern)).toBe(true)
    expect(parsePostgresRegex(pattern).kind).toBe('valid')
  })

  it.each(invalidPatterns)('rejects PostgreSQL pattern %j', async (pattern) => {
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
