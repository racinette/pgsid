import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const seed = 0x5eedd18
let randomState = seed
function random() {
  randomState ^= randomState << 13
  randomState ^= randomState >>> 17
  randomState ^= randomState << 5
  return randomState >>> 0
}

const base = new URL('./', import.meta.url)
const outputPath = fileURLToPath(new URL('stress-fixtures.json', base))
const positionOutputPath = fileURLToPath(new URL('stress-position-fixtures.json', base))
const extractedPath = fileURLToPath(new URL('postgres-fixtures.json', base))
const check = process.argv.slice(2).join(' ') === '--check'
if (process.argv.length > 3 || (process.argv.length === 3 && !check)) {
  throw new Error('usage: node materialize-stress-fixtures.mjs [--check]')
}

const modeProfiles = [
  { caseSensitive: true, expanded: false, newline: 'ordinary' },
  { caseSensitive: false, expanded: false, newline: 'ordinary' },
  { caseSensitive: true, expanded: true, newline: 'ordinary' },
  { caseSensitive: true, expanded: false, newline: 'sensitive' },
  { caseSensitive: false, expanded: false, newline: 'stop' },
  { caseSensitive: true, expanded: false, newline: 'anchors' },
  { caseSensitive: false, expanded: true, newline: 'sensitive' },
  { caseSensitive: false, expanded: true, newline: 'anchors' },
]
const combinedProfiles = [
  { caseSensitive: true, expanded: true, newline: 'sensitive' },
  { caseSensitive: false, expanded: true, newline: 'stop' },
  { caseSensitive: true, expanded: true, newline: 'anchors' },
  { caseSensitive: false, expanded: true, newline: 'ordinary' },
  { caseSensitive: false, expanded: false, newline: 'anchors' },
  { caseSensitive: true, expanded: false, newline: 'stop' },
  { caseSensitive: false, expanded: false, newline: 'sensitive' },
  { caseSensitive: true, expanded: true, newline: 'stop' },
]

const grammar = {
  sequence: (...parts) => parts.join(''),
  either: (left, right) => `${left}|${right}`,
  group: (part) => `(${part})`,
  repeat: (part, quantifier) => `${part}${quantifier}`,
}
const mutate = {
  truncate: (pattern) => pattern.slice(0, -1),
  duplicate: (pattern) => `${pattern}*`,
  reverseBound: (atom) => `${atom}{3,1}`,
  oversizedBound: (atom) => `${atom}{256}`,
  unknownClass: () => '[[:unknown:]]',
  trailingEscape: () => '\\',
}

const families = {
  precedence: [
    [grammar.either('a', 'ab'), ['ab', 'zab', 'ba']],
    [grammar.either('ab', 'a'), ['ab', 'aab', 'zz']],
    [grammar.sequence(grammar.group(grammar.either('a', 'ab')), 'b'), ['abb', 'ab', 'aabb']],
    ['a(b|bc)', ['abc', 'ab', 'ac']],
    ['ab|cdx', ['cdx', 'xab', 'acd']],
    ['(ab|a)c', ['abc', 'ac', 'abx']],
    ['a|bc', ['bc', 'abc', 'cb']],
    ['(a|b)c', ['ac', 'bc', 'cc']],
  ],
  repetition: [
    [grammar.sequence('a', grammar.repeat('b', '+?')), ['abbb', 'abbc', 'ac']],
    ['ab*?c', ['abbbc', 'ac', 'abb']],
    ['a{1,3}?b', ['aaaab', 'aab', 'ab']],
    ['(ab){1,3}c', ['abababc', 'abc', 'ababcx']],
    ['a*b+?', ['aaabbb', 'ab', 'aaac']],
    ['(a|ab)*b', ['aabb', 'abb', 'cc']],
    ['a{0,2}ab', ['aaab', 'aab', 'acb']],
    ['(ab|a)+?c', ['ababc', 'aac', 'abx']],
  ],
  zero_width: [
    ['^a', ['a\nb', 'ba', 'a']],
    ['b$', ['a\nb', 'bb', 'bc']],
    ['^$', ['', '\n', 'a']],
    ['a*', ['', 'bbb', 'aaab']],
    ['\\Aa', ['a', 'ba', 'a\nb']],
    ['b\\Z', ['ab', 'b\n', 'ba']],
    ['\\ma', ['-a', 'ba', 'éa']],
    ['a\\M', ['a-', 'ab', 'a\nb']],
  ],
  captures_backrefs: [
    ['(a)b\\1', ['aba', 'abb', 'zaba']],
    ['(ab|a)\\1', ['abab', 'aa', 'aba']],
    ['([ab])\\1', ['aabb', 'ab', 'bb']],
    ['(a+)(b+)\\1', ['aabbaa', 'abba', 'aabbb']],
    ['(a)?b\\1', ['aba', 'ba', 'abb']],
    ['((ab)c)\\2', ['abcab', 'abcabc', 'abca']],
    ['(a|b)c\\1', ['aca', 'bcb', 'acb']],
    ['(ab){1,2}\\1', ['abab', 'ababab', 'abac']],
  ],
  lookaround: [
    ['a(?=b)b', ['ab', 'ac', 'zab']],
    ['a(?!b).', ['ac', 'ab', 'a\nc']],
    ['(?<=a)b', ['ab', 'bb', 'a\nb']],
    ['(?<!a)b', ['bb', 'ab', 'cb']],
    ['(?=ab)a.', ['ab', 'ac', 'zab']],
    ['(?<=ab)c', ['abc', 'ac', 'zabc']],
    ['(?<!ab)c', ['abc', 'ac', 'zbc']],
    ['a(?=b|bc)bc', ['abc', 'abbc', 'ac']],
  ],
  brackets_classes: [
    ['[a-c]+', ['abc', 'dba', 'xyz']],
    ['[^a-c]+', ['xyz', 'cab', 'éz']],
    ['[[:digit:]]{1,2}a', ['12a', 'a', '3a']],
    ['[[:alpha:]]+[0-9]', ['ab3', 'é3', 'a9']],
    ['[a-z][[:upper:]]', ['aZ', 'az', 'éZ']],
    ['[a-c]|[x-z]', ['z', 'bc', 'q']],
    ['[[:space:]]a', ['\na', ' a', 'ba']],
    ['[a-z-]+', ['ab-', 'A-', 'é']],
  ],
  escaped_bounds: [
    ['a\\+b', ['a+b', 'aaab', 'ab']],
    ['\\d{2,3}', ['123', 'a12', 'ab']],
    ['a{2,4}b', ['aaaab', 'aab', 'ab']],
    ['a{0,2}?b', ['aaab', 'ab', 'aac']],
    ['\\w+\\m', ['ab-', 'éa', '---']],
    ['a\\b', ['a\\b', 'ab', 'aXb']],
    ['a{1,0}', ['aaa', 'a{1,0}', '']],
    ['a{2,', ['aa', 'a{2,', '']],
  ],
  basic: [
    ['a+b', ['a+b', 'aaab', 'ab']],
    ['a|b', ['a|b', 'a', 'b']],
    ['a\\{2,3\\}b', ['aaab', 'ab', 'aaaab']],
    ['\\(ab\\)\\1', ['abab', 'ab', 'ab1']],
    ['^ab', ['ab', 'zab', 'ab\nc']],
    ['ab$', ['ab', 'zab', 'ab\nc']],
    ['[a-c]*b', ['aacb', 'b', 'dd']],
    ['a?b', ['a?b', 'ab', 'b']],
  ],
  extended: [
    ['a+b', ['aaab', 'a+b', 'ab']],
    ['a|bc', ['bc', 'abc', 'a|bc']],
    ['(ab){2}', ['abab', 'ab', 'zabab']],
    ['a\\wb', ['awb', 'a_b', 'a\\wb']],
    ['[a-c]+', ['abc', 'dd', 'a-c']],
    ['^a.*b$', ['axxb', 'a\nb', 'zab']],
    ['(a|ab)b', ['abb', 'ab', 'aabb']],
    ['a\\+b', ['a+b', 'aaab', 'ab']],
  ],
  inline: [
    ['(?i)ab', ['AB', 'ab', 'aB']],
    ['(?c)Ab', ['AB', 'ab', 'Ab']],
    ['(?n)^b', ['a\nb', 'bb', 'ab']],
    ['(?p)a.b', ['a\nb', 'axb', 'ab']],
    ['(?w)^b', ['a\nb', 'bb', 'ab']],
    ['(?x)a # note\n b', ['ab', 'a b', 'ac']],
    ['(?b)a+b', ['a+b', 'aaab', 'ab']],
    ['(?e)a+b', ['aaab', 'a+b', 'ab']],
  ],
  unicode: [
    ['é.', ['éx', 'é\n', 'xéz']],
    ['a.c', ['aé c', 'aéc', 'a\nc']],
    ['^é+$', ['éé', 'e\u0301', 'É']],
    ['e\u0301', ['é', 'e\u0301', 'xe\u0301y']],
    ['[é-ê]+', ['éê', 'e', 'É']],
    ['.a', ['😀a', 'éa', 'a']],
    ['(é|e\u0301)b', ['éb', 'e\u0301b', 'eb']],
    ['[^a]+', ['😀é', 'aaa', 'éa']],
  ],
  invalid: [
    [mutate.truncate('(ab)'), ['ab', '', 'zab']],
    [mutate.truncate('[a-]'), ['a', 'b', '']],
    [mutate.reverseBound('a'), ['aaa', 'a{3,1}', '']],
    [mutate.duplicate('a*'), ['aaa', 'a*', '']],
    [mutate.unknownClass(), ['a', 'unknown', '']],
    [mutate.truncate('(?=a)'), ['a', 'ba', '']],
    [mutate.oversizedBound('a'), ['aaa', 'a{256}', '']],
    [mutate.trailingEscape(), ['a', '\\', '']],
  ],
  literal: [
    ['a+b', ['a+b', 'aaab', 'xa+by']],
    ['[ab]', ['[ab]', 'ab', 'x[ab]y']],
    ['^abc$', ['^abc$', 'abc', 'x^abc$y']],
    ['a.b', ['a.b', 'axb', 'xa.by']],
    ['(ab)', ['(ab)', 'ab', 'x(ab)y']],
    ['a|b', ['a|b', 'a', 'xa|by']],
    ['a{2}', ['a{2}', 'aa', 'xa{2}y']],
    ['é+', ['é+', 'éé', 'xé+y']],
  ],
  backref_unicode: [
    ['(é|e\u0301)\\1', ['éé', 'e\u0301e\u0301', 'ée\u0301']],
    ['([A-C])\\1', ['Aa', 'BB', 'Cc']],
    ['([[:digit:]])x\\1', ['1x1', '1x2', '9x9']],
    ['([ab]+)c\\1', ['abcab', 'aabcaab', 'abca']],
    ['((a|ab))\\2', ['aa', 'abab', 'aab']],
    ['([éa])\\1', ['éé', 'aa', 'éa']],
    ['(a?)(b)\\1', ['aba', 'bb', 'abb']],
    ['(a|aa)\\1', ['aaaa', 'aaa', 'aa']],
  ],
  lookaround_newline: [
    ['(?<=^a)b', ['ab', 'a\nb', 'zab']],
    ['(?<!^a)b', ['ab', 'a\nb', 'zab']],
    ['(?=a$)a', ['a\nb', 'za', 'a']],
    ['(?<=a\n)b', ['a\nb', 'ab', 'za\nb']],
    ['(?=a.b)a.b', ['a\nb', 'acb', 'ab']],
    ['(?<!\n)b', ['a\nb', 'ab', 'bb']],
    ['(?<=a|a\n)b', ['a\nb', 'ab', 'b']],
    ['(^|(?<=\n))b', ['a\nb', 'bb', 'ab']],
  ],
  expanded_interactions: [
    ['a # skip\n b', ['ab', 'a b', 'a#b']],
    ['( a | ab ) b', ['abb', 'ab', 'a b']],
    ['a [b #] c', ['a#c', 'abc', 'a c']],
    ['(?x)a#x\nb', ['ab', 'a#b', 'a b']],
    ['a\\ b', ['a b', 'ab', 'a\\ b']],
    ['a{ 1 , 2 }b', ['ab', 'aab', 'a{ 1 , 2 }b']],
    ['[a #]+b', ['a#b', 'a b', 'ab']],
    ['(?t)a b', ['a b', 'ab', 'a#b']],
  ],
  basic_interactions: [
    ['\\(ab\\)\\{1,2\\}\\1', ['abab', 'ababab', 'ab']],
    ['^a\\{1,3\\}b$', ['aaab', 'ab', 'aaaab']],
    ['[[:digit:]]\\{1,2\\}x', ['12x', '1x', '3\\{1,2\\}x']],
    ['\\(a\\)b\\1', ['aba', 'abb', 'zaba']],
    ['a+b|c', ['a+b|c', 'aaab', 'abc']],
    ['a?b', ['a?b', 'ab', 'b']],
    ['[A-C]*z', ['ABz', 'acz', 'zz']],
    ['a\\.b', ['a.b', 'axb', 'a\\.b']],
  ],
  extended_interactions: [
    ['(ab|a)+b', ['abab', 'aab', 'ab']],
    ['^a{1,3}b$', ['aaab', 'ab', 'aaaab']],
    ['a\\wb', ['awb', 'a_b', 'a\\wb']],
    ['([A-C]+)b', ['ACb', 'acb', 'bb']],
    ['a.*b', ['a\nb', 'axxb', 'ab']],
    ['ab|cd', ['abcd', 'zcd', 'ac']],
    ['(a|ab){1,2}b', ['abb', 'aabb', 'ab']],
    ['[[:alpha:]]+\\d', ['abd', 'ab3', 'éd']],
  ],
}

function flags(options) {
  const syntax = { advanced: '', basic: 'b', extended: '', literal: 'q' }[options.syntax]
  const newline = { ordinary: '', sensitive: 'n', stop: 'p', anchors: 'w' }[options.newline]
  return `${syntax}${options.caseSensitive ? '' : 'i'}${newline}${options.expanded ? 'x' : ''}`
}

function writeOrCheck(path, document) {
  const bytes = `${JSON.stringify(document, null, 2)}\n`
  if (check) {
    if (readFileSync(path, 'utf8') !== bytes) {
      throw new Error(`${path} differs from the oracle regeneration`)
    }
  } else {
    writeFileSync(path, bytes)
  }
}

const extracted = JSON.parse(readFileSync(extractedPath, 'utf8'))
const extractedTuples = new Set(extracted.fixtures.map(({ input }) => JSON.stringify(input)))
const seen = new Set()
const generated = []
for (const [family, templates] of Object.entries(families)) {
  if (templates.length !== 8) throw new Error(`${family}: expected eight templates`)
  let familyCount = 0
  const profiles =
    family.endsWith('_interactions') ||
    family === 'backref_unicode' ||
    family === 'lookaround_newline'
      ? combinedProfiles
      : modeProfiles
  for (let index = 0; index < templates.length; index++) {
    const [pattern, subjects] = templates[index]
    if (subjects.length !== 3) throw new Error(`${family}: expected three subjects`)
    const profileStart = random() % profiles.length
    for (const subject of subjects) {
      for (let variant = 0; variant < 4; variant++) {
        const profile = profiles[(profileStart + variant * 2 + index) % profiles.length]
        const syntax = family.startsWith('basic')
          ? 'basic'
          : family.startsWith('extended')
            ? 'extended'
            : family === 'literal'
              ? 'literal'
              : 'advanced'
        const options = { syntax, ...profile }
        if (syntax === 'literal') {
          options.caseSensitive = true
          options.expanded = false
          options.newline = 'ordinary'
        }
        const input = { pattern, subject, options }
        const tuple = JSON.stringify(input)
        if (seen.has(tuple) || extractedTuples.has(tuple)) continue
        seen.add(tuple)
        generated.push({ id: `${family}-${String(++familyCount).padStart(4, '0')}`, family, input })
      }
    }
  }
  const quota = family === 'literal' ? 20 : profiles === combinedProfiles ? 90 : 70
  if (familyCount < quota) {
    throw new Error(`${family}: quota missed with ${familyCount} distinct inputs`)
  }
}
if (generated.length < 1000) throw new Error(`only ${generated.length} distinct inputs`)

const pg = await PGlite.create()
const sql = `select
  regexp_instr(($1::text collate "C"), $2::text, 1, 1, 0, $3::text) as match_start,
  regexp_instr(($1::text collate "C"), $2::text, 1, 1, 1, $3::text) as match_end`
try {
  const serverVersion = (await pg.query('show server_version')).rows[0].server_version
  const basicProbe = await pg.query(sql, ['aaa', 'a+', 'e'])
  if (basicProbe.rows[0].match_start !== 0) throw new Error('public e flag changed syntax')
  const extendedProbe = await pg.query(sql, ['aaa', '(?e)a+', ''])
  if (extendedProbe.rows[0].match_start !== 1 || extendedProbe.rows[0].match_end !== 4) {
    throw new Error('(?e) did not select Extended syntax')
  }
  const extendedEscapeProbe = await pg.query(sql, ['_', '(?e)\\w', ''])
  if (extendedEscapeProbe.rows[0].match_start !== 0) {
    throw new Error('(?e) did not use Extended escape behavior')
  }
  const fixtures = []
  for (const { id, family, input } of generated) {
    const pattern = input.options.syntax === 'extended' ? `(?e)${input.pattern}` : input.pattern
    let expected
    try {
      const { rows } = await pg.query(sql, [input.subject, pattern, flags(input.options)])
      const { match_start: start, match_end: end } = rows[0]
      expected =
        start === 0
          ? { kind: 'NoMatch' }
          : { kind: 'Found', value: { start: start - 1, end: end - 1 } }
    } catch (error) {
      if (error.code !== '2201B') throw new Error(`${id}: ${error.message} (${error.code})`)
      expected = { kind: 'InvalidPattern', sqlstate: error.code }
    }
    fixtures.push({ id, family, input, expected })
  }
  const document = {
    schemaVersion: 1,
    oracle: { database: 'PostgreSQL via PGlite', serverVersion, collation: 'C' },
    generatorSeed: seed,
    fixtures,
  }
  writeOrCheck(outputPath, document)
  const counts = {}
  for (const fixture of fixtures)
    counts[fixture.expected.kind] = (counts[fixture.expected.kind] ?? 0) + 1
  process.stdout.write(
    `${check ? 'checked' : 'wrote'} ${fixtures.length} stress fixtures: ${JSON.stringify(counts)}\n`,
  )

  const positionSeeds = [
    ['a*', ['baa', 'aaaa', 'bbb']],
    ['ab', ['abab', 'zabc', 'abbb']],
    ['^a', ['a\na', 'ba\na', 'aaaa']],
    ['(?<=a)b', ['abab', 'aabb', 'bbba']],
    ['é', ['aéé', '😀éa', 'e\u0301é']],
    ['a|aa', ['aaaa', 'baaa', 'abba']],
    ['(a|aa)', ['aaaa', 'baaa', 'aaab']],
    ['(?=a)a', ['aaa', 'baa', 'aba']],
    ['^b', ['a\nb', 'bbb', 'abbb']],
    ['(é|e\u0301)', ['e\u0301é', 'éé', 'xe\u0301y']],
    ['(a)b\\1', ['abaaba', 'xabax', 'ababa']],
    ['a*?', ['aaa', 'baa', 'bbb']],
  ]
  const positionFixtures = []
  const countSql =
    'select regexp_count(($1::text collate "C"), $2::text, $3::integer, $4::text) as value'
  const offsetSql = `select
    regexp_instr(($1::text collate "C"), $2::text, $3::integer, 1, 0, $4::text) as match_start,
    regexp_instr(($1::text collate "C"), $2::text, $3::integer, 1, 1, $4::text) as match_end`
  for (const [patternIndex, [pattern, subjects]] of positionSeeds.entries()) {
    for (const [subjectIndex, subject] of subjects.entries()) {
      for (const start of [1, 2, 3, 4, 5]) {
        const profiles = patternIndex < 6 ? modeProfiles : combinedProfiles
        const options = {
          syntax: 'advanced',
          ...profiles[(patternIndex + subjectIndex + start) % profiles.length],
        }
        for (const operation of ['find', 'count']) {
          const input = { pattern, subject, options, start }
          const id = `position-${String(positionFixtures.length + 1).padStart(4, '0')}`
          let expected
          try {
            if (operation === 'find') {
              const { rows } = await pg.query(offsetSql, [subject, pattern, start, flags(options)])
              const { match_start: matchStart, match_end: matchEnd } = rows[0]
              expected =
                matchStart === 0
                  ? { kind: 'NoMatch' }
                  : { kind: 'Found', value: { start: matchStart - 1, end: matchEnd - 1 } }
            } else {
              const { rows } = await pg.query(countSql, [subject, pattern, start, flags(options)])
              expected = { kind: 'Count', value: rows[0].value }
            }
          } catch (error) {
            if (error.code !== '2201B') throw new Error(`${id}: ${error.message} (${error.code})`)
            expected = { kind: 'InvalidPattern', sqlstate: error.code }
          }
          positionFixtures.push({ id, operation, input, expected })
        }
      }
    }
  }
  writeOrCheck(positionOutputPath, {
    schemaVersion: 1,
    oracle: { database: 'PostgreSQL via PGlite', serverVersion, collation: 'C' },
    generatorSeed: seed,
    fixtures: positionFixtures,
  })
  process.stdout.write(
    `${check ? 'checked' : 'wrote'} ${positionFixtures.length} position fixtures\n`,
  )
} finally {
  await pg.close()
}
