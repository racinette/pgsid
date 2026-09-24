import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const outputPath = fileURLToPath(new URL('targeted-postgres-fixtures.json', import.meta.url))
const check = process.argv.slice(2).join(' ') === '--check'
if (process.argv.length > 3 || (process.argv.length === 3 && !check)) {
  throw new Error('usage: node materialize-targeted-postgres-fixtures.mjs [--check]')
}

const inputs = []
for (const caseSensitive of [true, false]) {
  for (const [pattern, subject] of [
    ['A', 'za'],
    ['Z', 'z'],
    ['Å', 'å'],
    ['K', 'K'],
    ['😀', 'a😀'],
    ['', '😀'],
    ['.', '.'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'literal', caseSensitive, expanded: false, newline: 'ordinary' },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const subject of ['', '\n', '\na', 'a\n', '😀\nβ']) {
    inputs.push({
      pattern: '.',
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a.b', 'a\nb'],
      ['a.b', 'a😀b'],
      ['A.b', 'aβb'],
      ['.a', '\na'],
      ['a.', 'a\n'],
      ['Å.😀', 'Åβ😀'],
      ['..', '😀a'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const [pattern, subject, start, options] of [
  [
    'a',
    'aAa',
    2,
    { syntax: 'literal', caseSensitive: false, expanded: false, newline: 'ordinary' },
  ],
  [
    '😀',
    'a😀😀',
    3,
    { syntax: 'literal', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  ['', '😀', 2, { syntax: 'literal', caseSensitive: true, expanded: false, newline: 'ordinary' }],
  [
    '.',
    '\n😀',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'sensitive' },
  ],
  [
    '.',
    '\n😀',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  ['.', '😀', 2, { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' }],
  [
    'a.b',
    'za😀b',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
]) {
  inputs.push({ pattern, subject, start, options })
}

function flags(options) {
  const newline = { ordinary: '', sensitive: 'n', stop: 'p', anchors: 'w' }[options.newline]
  return `${options.syntax === 'literal' ? 'q' : ''}${options.caseSensitive ? '' : 'i'}${newline}`
}

const pg = await PGlite.create()
try {
  const serverVersion = (await pg.query('show server_version')).rows[0].server_version
  const sql = `
    select
      regexp_instr(($1::text collate "C"), $2::text, $4::int, 1, 0, $3::text) as match_start,
      regexp_instr(($1::text collate "C"), $2::text, $4::int, 1, 1, $3::text) as match_end
  `
  const fixtures = []
  for (const input of inputs) {
    const result = await pg.query(sql, [
      input.subject,
      input.pattern,
      flags(input.options),
      input.start ?? 1,
    ])
    const { match_start: start, match_end: end } = result.rows[0]
    const expected =
      start === 0
        ? { kind: 'NoMatch' }
        : { kind: 'Found', value: { start: start - 1, end: end - 1 } }
    fixtures.push({ input, expected })
  }
  const output = `${JSON.stringify(
    {
      schemaVersion: 1,
      oracle: { database: 'PostgreSQL via PGlite', serverVersion, collation: 'C' },
      fixtures,
    },
    null,
    2,
  )}\n`
  if (check) {
    if (readFileSync(outputPath, 'utf8') !== output) {
      throw new Error('targeted PostgreSQL fixtures differ from PGlite output')
    }
  } else {
    writeFileSync(outputPath, output)
  }
  process.stdout.write(
    `${check ? 'checked' : 'wrote'} ${fixtures.length} targeted PostgreSQL fixtures\n`,
  )
} finally {
  await pg.close()
}
