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
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const [pattern, subject] of [
    ['^a', 'a'],
    ['^a', '\na'],
    ['a$', 'a\n'],
    ['^$', '\n'],
    ['^a$', '\na\n'],
    ['^a.b$', 'a\nb'],
    ['^a.b$', 'a😀b'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const punctuation of '.^$*+?|()[]{}\\') {
    inputs.push({
      pattern: `\\${punctuation}`,
      subject: `a${punctuation}b`,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
  for (const [pattern, subject] of [
    ['a\\.b', 'za.b'],
    ['^a\\.$', 'a.'],
    ['\\^a', 'z^a'],
    ['a\\$', 'za$'],
    ['a\\\\b', 'za\\b'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a[bc]d', 'zabd'],
      ['a[bc]d', 'zacd'],
      ['a[bc]d', 'zaed'],
      ['[ab][ab]', 'ba'],
      ['[.]', '.'],
      ['[a^b]', '^'],
      ['[😀β]', 'β'],
      ['[A]', 'a'],
      ['[a\n]', '\n'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['[^ab]', 'c'],
      ['[^ab]', 'a'],
      ['[^ab]', '\n'],
      ['a[^b]c', 'a\nc'],
      ['a[^b]c', 'abc'],
      ['[^A]', 'a'],
      ['[^😀β]', 'a'],
      ['[^😀β]', 'β'],
      ['[^\n]', '\n'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['[a-c]', 'b'],
      ['[a-c]', 'B'],
      ['[A-C]', 'b'],
      ['[A-Z]', 'K'],
      ['[a-z]', 'Å'],
      ['[a-z]', '😀'],
      ['[0-9]', '5'],
      ['[a-cx-z]', 'y'],
      ['[a-cx-z]', 'm'],
      ['[^b-d]', 'c'],
      ['[^b-d]', 'A'],
      ['[^b-d]', '\n'],
      ['a[1-3]b', 'a2b'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['[-]', '-'],
      ['[-]', 'a'],
      ['[-a]', 'a'],
      ['[-a]', '-'],
      ['[a-]', '-'],
      ['[a-b-]', 'b'],
      ['[a-b-]', '-'],
      ['[]]', ']'],
      ['[]]', 'a'],
      ['[]a]', 'a'],
      ['[]a]', ']'],
      ['[^]]', ']'],
      ['[^]]', '\n'],
      ['[^-]', '-'],
      ['[^-]', '\n'],
      ['[]-]', '-'],
      ['[]-]', ']'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['\\A', 'a'],
      ['\\Z', 'a\n'],
      ['\\Aa', 'a'],
      ['\\Aa', '\na'],
      ['a\\Z', 'a'],
      ['a\\Z', 'a\n'],
      ['\\A😀\\Z', '😀'],
      ['\\A😀\\Z', 'a😀'],
      ['\\A^a', 'a'],
      ['a$\\Z', 'a\n'],
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
  [
    '^a',
    '\na',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'sensitive' },
  ],
  [
    '[ab]',
    'zba',
    3,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  [
    '[^ab]',
    'zac',
    3,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  [
    '[a-c]',
    'zac',
    3,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  [
    '[]a]',
    'za]',
    3,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  [
    '\\A',
    'a',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
  ],
  [
    '\\Z',
    'a\n',
    2,
    { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'sensitive' },
  ],
]) {
  inputs.push({ pattern, subject, start, options })
}
for (const [pattern, subject, start, newline, caseSensitive] of [
  ['', '', 1, 'ordinary', true],
  ['^$', '', 1, 'ordinary', true],
  ['\\A\\Z', '', 1, 'ordinary', true],
  ['\\A\\Z', '\n', 1, 'anchors', true],
  ['^$', '\n', 1, 'anchors', true],
  ['^$', '\n', 2, 'anchors', true],
  ['^b', 'a\nb', 1, 'sensitive', true],
  ['^b', 'a\nb', 3, 'sensitive', true],
  ['^b', 'a\nb', 3, 'ordinary', true],
  ['\\Ab', 'a\nb', 3, 'sensitive', true],
  ['b$', 'a\nb\n', 3, 'sensitive', true],
  ['b\\Z', 'a\nb\n', 3, 'sensitive', true],
  ['\\Z', '😀\n', 2, 'ordinary', true],
  ['\\Z', '😀\n', 3, 'ordinary', true],
  ['a$', '😀a\n', 2, 'sensitive', true],
  ['a\\Z', '😀a\n', 2, 'sensitive', true],
  ['[a-c]', '😀B', 2, 'ordinary', false],
  ['[a-c]', '😀B', 2, 'ordinary', true],
  ['[^a]', '😀\n', 2, 'sensitive', true],
  ['[^a]', '😀\n', 2, 'ordinary', true],
  ['[a-b-]', '😀-', 2, 'ordinary', true],
  ['[]a]', '😀]', 2, 'ordinary', true],
  ['\\A😀\\Z', '😀', 2, 'ordinary', true],
  ['\\.', '😀.', 2, 'ordinary', true],
]) {
  inputs.push({
    pattern,
    subject,
    start,
    options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
  })
}
for (const [pattern, subject, start, newline] of [
  ['\\m', '', 1, 'ordinary'],
  ['\\Y', '', 1, 'ordinary'],
  ['\\y', 'a', 1, 'ordinary'],
  ['\\y', 'a', 2, 'ordinary'],
  ['\\Y', 'ab', 2, 'ordinary'],
  ['\\ma', 'éa', 1, 'ordinary'],
  ['\\ma', 'ba', 2, 'ordinary'],
  ['\\ma', '_a', 1, 'ordinary'],
  ['\\M', 'a_', 1, 'ordinary'],
  ['\\M', 'aé', 1, 'ordinary'],
  ['\\M', 'ab', 2, 'ordinary'],
  ['\\Y', 'é', 1, 'ordinary'],
  ['\\y', 'é', 1, 'ordinary'],
  ['\\M', 'a\n', 1, 'sensitive'],
  ['\\m', '\na', 2, 'anchors'],
  ['a\\M', 'a\n', 1, 'stop'],
  ['a\\Y', 'ab', 1, 'ordinary'],
  ['a\\Y', 'a-', 1, 'ordinary'],
  ['\\yA', '_A', 1, 'ordinary'],
  ['\\yA', '-A', 1, 'ordinary'],
  ['\\m5', 'x5', 1, 'ordinary'],
  ['\\m5', '-5', 1, 'ordinary'],
  ['\\M', '5-', 1, 'ordinary'],
  ['\\M', '5_', 1, 'ordinary'],
  ['\\Y', '😀', 1, 'ordinary'],
  ['\\ma', '😀a', 1, 'ordinary'],
  ['\\ma', '😀a', 2, 'ordinary'],
]) {
  inputs.push({
    pattern,
    subject,
    start,
    options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
  })
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const [pattern, subject] of [
    ['\\d', 'x5'],
    ['\\d', '٤'],
    ['\\D', '5é'],
    ['\\s', 'x\n'],
    ['\\s', '\u000b'],
    ['\\S', '\nA'],
    ['\\w', '-A'],
    ['\\w', '_'],
    ['\\w', 'é'],
    ['\\W', 'Aé'],
    ['\\W', '\n'],
    ['a\\db', 'a5b'],
    ['a\\Sb', 'a-b'],
    ['\\w\\d', '_5'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const [pattern, subject] of [
    ['\\a', 'x\u0007'],
    ['\\b', 'x\u0008'],
    ['\\B', 'x\\'],
    ['\\e', 'x\u001b'],
    ['\\f', 'x\f'],
    ['\\n', 'x\n'],
    ['\\r', 'x\r'],
    ['\\t', 'x\t'],
    ['\\v', 'x\v'],
    ['a\\nb', 'a\nb'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const [pattern, subject] of [
    ['[\\d]', 'a5'],
    ['[\\D]', '5é'],
    ['[\\s]', 'a\n'],
    ['[\\S]', '\nA'],
    ['[\\w]', '-A'],
    ['[\\W]', 'Aé'],
    ['[^\\d]', '5a'],
    ['[^\\D]', 'a5'],
    ['[a\\d]', '5'],
    ['[\\d\\w]', '_'],
    ['[\\d-]', '-'],
    ['[^\\d\\D]', 'a'],
  ]) {
    inputs.push({
      pattern,
      subject,
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline },
    })
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a*', 'aaab'],
      ['a*', 'bbb'],
      ['a+', 'baaab'],
      ['a+', 'bbb'],
      ['a?', 'baa'],
      ['a?b', 'ab'],
      ['a?b', 'b'],
      ['a*b', 'aaab'],
      ['a+b', 'baaab'],
      ['a.*b', 'a\nb'],
      ['a.*b', 'axbxb'],
      ['[ab]*c', 'abbc'],
      ['[^b]+', 'aaab'],
      ['\\d+', 'a123b'],
      ['\\w?', 'a_'],
      ['^a+$', 'aaa'],
      ['a*b*', 'aabb'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a|b', 'ba'],
      ['a|b', 'ca'],
      ['ab|a', 'ab'],
      ['a|ab', 'ab'],
      ['a*|b+', 'bbb'],
      ['a*|b+', 'aaab'],
      ['|a', 'a'],
      ['a|', 'ba'],
      ['[a|b]|c', 'c'],
      ['\\||b', 'a|b'],
      ['^a|b$', 'b\n'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a*?', 'aaa'],
      ['a+?', 'aaa'],
      ['a??', 'aaa'],
      ['a*?b', 'aaab'],
      ['a+?b', 'aaab'],
      ['a??b', 'ab'],
      ['a*?b+', 'aaabbb'],
      ['a+?b|c', 'aaab'],
      ['\\d+?', 'a123b'],
      ['[ab]*?', 'abba'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a{2}', 'baaab'],
      ['a{2}', 'bab'],
      ['a{1,3}', 'aaaa'],
      ['a{2,4}b', 'aaaab'],
      ['a{0,2}ab', 'aaab'],
      ['a{2,}b', 'aaaab'],
      ['a{2,}b', 'ab'],
      ['a{1,3}?b', 'aaab'],
      ['a{0,2}?b', 'aab'],
      ['\\d{2,3}', 'x1234'],
      ['a{0}', 'bbb'],
      ['a{255}', 'aaa'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a{foo}', 'za{foo}'],
      ['a{ 1 , 2 }b', 'a{ 1 , 2 }b'],
      ['a}', 'za}'],
      ['a{', 'za{'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['a b c', 'zabc'],
      ['a# comment\nb', 'ab'],
      ['a[ #]b', 'za#b'],
      ['a[ #]b', 'za b'],
      ['a\tb', 'ab'],
      ['a|ab', 'ab'],
      ['^ a $', 'a'],
      ['a+ # comment\nb', 'aaab'],
      ['a { 2 , 3 } b', 'aaab'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: true, newline },
      })
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['a+b', 'aaab'],
      ['a|bc', 'xbc'],
      ['[a-c]+', 'zabc'],
      ['a.*b', 'a\nb'],
      ['^a{1,3}b$', 'aab'],
      ['a b', 'ab'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'extended', caseSensitive: true, expanded, newline },
      })
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['a*b', 'aaab'],
      ['[a-c]*b', 'aaab'],
      ['a.*b', 'a\nb'],
      ['^ab$', 'ab'],
      ['a b', 'ab'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'basic', caseSensitive: true, expanded, newline },
      })
    }
  }
}
for (const syntax of ['basic', 'extended']) {
  for (const expanded of [false, true]) {
    for (const [pattern, subject] of [
      ['a\\+b', 'za+b'],
      ['a\\.b', 'za.b'],
      ['a\\|b', 'za|b'],
      ['a\\?b', 'za?b'],
      ['a\\^b', 'za^b'],
      ['a\\$b', 'za$b'],
      ['a\\*b', 'za*b'],
      ['a\\[b', 'za[b'],
      ['a\\]b', 'za]b'],
      ['a\\\\b', 'za\\b'],
      ...(syntax === 'extended'
        ? [
            ['a\\(b', 'za(b'],
            ['a\\)b', 'za)b'],
            ['a\\{b', 'za{b'],
            ['a\\}b', 'za}b'],
          ]
        : []),
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax, caseSensitive: true, expanded, newline: 'ordinary' },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['[é-ê]+', 'zéê'],
      ['[α-γ]+', 'zαβγ'],
      ['[^é-ê]+', 'éabc'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
  for (const caseSensitive of [true, false]) {
    for (const [pattern, subject] of [
      ['[[:digit:]]{1,2}a', 'z12a'],
      ['[[:alpha:]]+[0-9]', 'zAb2'],
      ['[a-z][[:upper:]]', 'aB'],
      ['[[:space:]]a', '\na'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
      })
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['(ab)c', 'zabc'],
      ['a((b)c)', 'zabc'],
      ['(a)b(c)', 'zabc'],
      ['a(b*)c', 'zabbbc'],
      ['(a)|bc', 'xbc'],
      ['()a', 'za'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive: true, expanded, newline },
      })
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['(a|ab)b', 'zabb'],
      ['a(b|bc)', 'zabc'],
      ['(ab|a)c', 'zabc'],
      ['(a|b)c', 'zbc'],
      ['a(|b)c', 'zabc'],
      ['a(b|)c', 'zabc'],
    ]) {
      inputs.push({
        pattern,
        subject,
        options: { syntax: 'advanced', caseSensitive: true, expanded, newline },
      })
    }
  }
}

function flags(options) {
  const newline = { ordinary: '', sensitive: 'n', stop: 'p', anchors: 'w' }[options.newline]
  const syntax = { literal: 'q', basic: 'b', extended: '', advanced: '' }[options.syntax]
  return `${syntax}${options.expanded ? 'x' : ''}${options.caseSensitive ? '' : 'i'}${newline}`
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
    const pattern = input.options.syntax === 'extended' ? `(?e)${input.pattern}` : input.pattern
    const result = await pg.query(sql, [
      input.subject,
      pattern,
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
