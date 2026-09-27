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
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['(?<=a)b', 'zab'],
      ['(?<!a)b', 'zcb'],
      ['(?<=ab)c', 'zabc'],
      ['(?<!ab)c', 'zac'],
      ['(?<=é)b', 'zéb'],
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
      ['(?=ab)a.', 'zab'],
      ['(?!b).', 'zab'],
      ['(?=a$)a', 'za'],
      ['(?=a)b', 'zab'],
      ['(?=a.b)a.b', 'za\nb'],
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
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['(a)b\\1', 'zaba'],
        ['(ab)\\1', 'zabab'],
        ['(é)x\\1', 'zéxé'],
        ['^(ab)\\1$', 'abab'],
        ['(a)bc\\1', 'zabca'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'advanced', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['(?i)ab', 'zAB'],
        ['(?c)Ab', 'zab'],
        ['(?n)^b', 'a\nb'],
        ['(?p)a.b', 'a\nb'],
        ['(?w)^b', 'a\nb'],
        ['(?x)a # note\n b', 'ab'],
        ['(?t)a b', 'za b'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'advanced', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a(?=b)b', 'zab'],
        ['a(?!b).', 'zac'],
        ['a(?=b|bc)bc', 'zabc'],
        ['ab(?=c)c', 'zabc'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'advanced', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['(ab){1,3}c', 'zababc'],
        ['a(bc){0,2}d', 'zabcbcd'],
        ['(é){2}x', 'zééx'],
        ['x(a){0,1}y', 'zxay'],
        ['(ab){0}c', 'zc'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'advanced', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const [pattern, subject] of [
      ['(ab){2}', 'zabab'],
      ['(a|ab)b', 'zabb'],
      ['(ab)c', 'zabc'],
      ['([A-C]+)b', 'zABb'],
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
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a+b', 'za+b'],
        ['a?b', 'za?b'],
        ['a|b', 'za|b'],
        ['(ab)', 'z(ab)'],
        ['a{2}b', 'za{2}b'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'basic', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a\\wb', 'zawb'],
        ['[[:alpha:]]+\\d', 'zAd'],
        ['a\\nb', 'zanb'],
        ['a\\Ab', 'zaAb'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'extended', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a\\wb', 'zawb'],
        ['a\\nb', 'zanb'],
        ['a\\Ab', 'zaAb'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'basic', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a\\{2,3\\}b', 'zaaab'],
        ['^a\\{1,3\\}b$', 'aab'],
        ['[[:digit:]]\\{1,2\\}x', 'z12x'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'basic', caseSensitive, expanded, newline },
        })
      }
    }
  }
}
for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['\\(ab\\)\\1', 'zabab'],
        ['\\(a\\)b\\1', 'zaba'],
        ['\\(é\\)x\\1', 'zéxé'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'basic', caseSensitive, expanded, newline },
        })
      }
    }
  }
}

for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['a(b)?c', 'zabc'],
        ['a(b)?c', 'zac'],
        ['a(bc)?d', 'zabcd'],
        ['a(bc)?d', 'zad'],
        ['^(ab)?c$', 'abc'],
        ['a(β)?c', 'zaβc'],
      ]) {
        for (const syntax of ['advanced', 'extended']) {
          inputs.push({
            pattern,
            subject,
            options: { syntax, caseSensitive, expanded, newline },
          })
        }
      }
    }
  }
}

for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const syntax of ['advanced', 'extended']) {
        for (const [pattern, subject] of [
          ['a(b)*c', 'zac'],
          ['a(b)*c', 'zabbbc'],
          ['a(b)+c', 'zac'],
          ['a(b)+c', 'zabbbc'],
          ['(ab)+c', 'zababc'],
          ['(β)*c', 'zββc'],
        ]) {
          inputs.push({
            pattern,
            subject,
            options: { syntax, caseSensitive, expanded, newline },
          })
        }
      }
    }
  }
}

for (const expanded of [false, true]) {
  for (const newline of ['ordinary', 'sensitive', 'stop', 'anchors']) {
    for (const caseSensitive of [true, false]) {
      for (const [pattern, subject] of [
        ['([ab])\\1', 'zaabb'],
        ['([A-C])\\1', 'zbB'],
        ['([éa])\\1', 'zéé'],
        ['a([bc])\\1', 'zabb'],
        ['(\\w)\\1', 'zaa'],
        ['(.)\\1', 'z\n\n'],
        ['([ab])x\\1y', 'zaxay'],
      ]) {
        inputs.push({
          pattern,
          subject,
          options: { syntax: 'advanced', caseSensitive, expanded, newline },
        })
      }
    }
  }
}

for (const [pattern, subject, caseSensitive, newline] of [
  ['([ab]+)c\\1', 'abcab', true, 'ordinary'],
  ['([ab]+)c\\1', 'aaacaaa', true, 'ordinary'],
  ['([ab]+)c\\1', 'abca', true, 'ordinary'],
  ['([ab]+)c\\1', 'zabcab', true, 'ordinary'],
  ['([A-C]+)x\\1', 'zABxAb', false, 'ordinary'],
  ['(\\w+)x\\1', 'zabxab', true, 'ordinary'],
  ['(.+)x\\1', 'zabxab', true, 'ordinary'],
  ['(.+)x\\1', 'z\nax\na', true, 'sensitive'],
  ['a(b*)c\\1', 'zac', true, 'ordinary'],
  ['a(b*)c\\1', 'zabbcbb', true, 'ordinary'],
  ['a(b*)c\\1', 'zabbcb', true, 'ordinary'],
  ['a([ab]*)c\\1', 'zac', true, 'ordinary'],
  ['a([ab]*)c\\1', 'zabcab', true, 'ordinary'],
  ['a(b*)c\\1x', 'zacx', true, 'ordinary'],
]) {
  inputs.push({
    pattern,
    subject,
    options: { syntax: 'advanced', caseSensitive, expanded: false, newline },
  })
}

for (const [pattern, subject] of [
  ['^(ab|cd)+$', 'abcd'],
  ['((a+?))', 'aaa'],
  ['^((a)|b)+\\2$', 'aba'],
  ['^(ab|cd)*$', 'abcd'],
  ['^(ab|cd|ef)+$', 'abcdef'],
  ['^(ab|cd)+$', 'abce'],
  ['^(ab|cd)*$', ''],
  ['^(ab|cd|ef)+$', 'efabcd'],
  ['((a|)+)+', ''],
  ['((a|)+)+', 'aaa'],
  ['^(a*)*$', ''],
  ['^(a*)*$', 'aaa'],
  ['^(a*)*$', 'ab'],
  ['^(a?)*$', 'aaaa'],
  ['^(a?)*$', 'b'],
  ['^(?:ab|c){2,3}$', 'abab'],
  ['^(?:ab|c){2,3}$', 'abc'],
  ['^(?:ab|c){2,3}$', 'ccc'],
  ['^(?:ab|c){2,3}$', 'ab'],
  ['(?:a+?){2}', 'aaa'],
  ['(a+?|ab)', 'aaa'],
  ['(a+?)b*', 'aaabb'],
  ['^((a)|b)+\\2$', 'aa'],
  ['^((a)|b)+\\2$', 'baa'],
  ['^((a)|b)*\\2$', 'aba'],
  ['^((a?)*)\\2$', ''],
  ['^((a?)*)\\2$', 'aa'],
  ['^((a)|(b))+\\2$', 'aba'],
  ['^((a)|(b))+\\3$', 'abb'],
  ['^(a|ab)\\1$', 'abab'],
  ['^(ab|a)\\1$', 'aa'],
  ['^(a{2})\\1$', 'aaaa'],
  ['(a|aa){2}\\1', 'aaa'],
  ['(a|aa){2}\\1', 'aaaa'],
  ['(a|aa){2}\\1', 'aaaaaaa'],
  ['(a|aa){1,2}?\\1', 'aaaaaa'],
  ['((a|aa){1,2})\\1', 'aaaaaa'],
  ['((a|){1,3})\\2', 'aaa'],
  ['((a|){1,3})\\2', ''],
  ['((a|b){0,3})\\2', 'abb'],
  ['(a){1,4}\\1', 'aa'],
  ['(a){1,4}\\1', 'a'],
  ['(a|aa){2,}\\1', 'aaaaaa'],
  ['(?=(ab|cd)+$)(ab|cd)+', 'abcd'],
  ['(?=(ab|cd)+$)(ab|cd)+', 'abce'],
  ['(?<=a+)b', 'zaaab'],
  ['(?<=a+)b', 'zb'],
  ['(?<!a+)b', 'zaaab'],
  ['(?<!a+)b', 'zb'],
  ['(?<=a(?=b))b', 'ab'],
  ['(?<=a(?=c))b', 'ab'],
  ['(?=(?!ab)a.)a.', 'ac'],
  ['(?=(?!ab)a.)a.', 'ab'],
  ['(?<=(?<=a)b)c', 'abc'],
  ['(?<=(?<=a)b)c', 'xbc'],
  ['(?<!a|bc)d', 'xbcd'],
  ['(?<!a|bc)d', 'xbd'],
  ['(?=(a))(a)\\1', 'aa'],
  ['(?=(a))(a)\\1', 'ab'],
  ['(?<=(a))(b)\\1', 'abb'],
  ['(?<=(a))(b)\\1', 'aba'],
  ['(?=a*)b', 'b'],
  ['(?!a*)b', 'b'],
  ['(?<=a*)b', 'b'],
  ['(?<!a*)b', 'b'],
  ['(?=a|aa)a+?', 'aaa'],
  ['(?<=^a+)b', 'aaab'],
  ['(?<=^a+)b', 'zaaab'],
  ['(?=(?:a?)*b)a*b', 'aaab'],
  ['(?<=a{1,3})b', 'aaaab'],
  ['(?!(?:ab|cd){2}$)(ab|cd)+', 'abcd'],
  ['(?!(?:ab|cd){2}$)(ab|cd)+', 'ababcd'],
  ['(a?){1,}\\1', ''],
  ['(a?){1,}\\1', 'aaa'],
  ['((a|)){1,}\\2', 'aaa'],
  ['((a|aa){1,})\\2', 'aaaaaa'],
  ['(a|aa){2}?\\1', 'aaaaaa'],
  ['(a|aa){2}?\\1', 'aaaa'],
  ['((a?)?){0,3}\\2', 'aa'],
  ['((a?)?){0,3}\\2', ''],
  ['(|()){1}\\2', ''],
  ['(()|){1}\\2', ''],
  ['((a|aa)+){1}\\2', 'aaaa'],
  ['((a|aa)*){1}\\2', 'aaaa'],
  ['((a?)?){1}\\2', 'aa'],
  ['((a*)?){1}\\2', 'aa'],
  ['((a|aa)?){1}\\2', 'aaaa'],
  ['((a|aa)?){1}\\2', 'aa'],
  ['(a|aa|aaaaa){1,3}\\1', 'aaaaaaa'],
  ['(a|aa|aaaaa){0,3}\\1', 'aaaaaaa'],
  ['(a|aa|aaaaa)+\\1', 'aaaaaaa'],
  ['(a|(a))\\2', 'aa'],
  ['((a)|a)\\2', 'aa'],
  ['(a|aa){0,2}\\1', 'aaa'],
  ['(a|aa){1,2}\\1', 'aaa'],
  ['(a|aa)*\\1', 'aaa'],
  ['(a|aa)+\\1', 'aaa'],
  ['((a)\\2){1,3}\\2', 'aaaaa'],
  ['((a)\\2){2,3}\\2', 'aaaaa'],
  ['((a|aa)\\2){1,2}\\2', 'aaaaaaa'],
  ['(()\\2){2}\\1', ''],
  ['(a+?)(a*)\\1', 'aaaaaa'],
  ['((a|aa)+?)\\2', 'aaaaaa'],
  ['(a|aa){2,2}?\\1', 'aaaaaa'],
  ['(?=(a|aa)+)(a|aa)*\\1', 'aaa'],
  ['(?i)^(ab|cd)+$', 'aBcD'],
  ['(?i)^(ab|cd)+$', 'aBcE'],
  ['(?ic)^(ab|cd)+$', 'AB'],
  ['(?ci)^(ab|cd)+$', 'AB'],
  ['(?i)^([[:lower:]]{2})\\1$', 'aBAb'],
  ['(?c)^([[:lower:]]{2})\\1$', 'aBAb'],
  ['(?i)(?<=ab)(cd|ef)+', 'zABcDEf'],
  ['(?i)(?<!ab)(cd|ef)+', 'zABcDEf'],
  ['(?n)^(a|b)+$', 'x\nab\nz'],
  ['(?p)^(a|b)+$', 'x\nab\nz'],
  ['(?w)^(a.b)+$', 'x\na\nb\nz'],
  ['(?n)^(a.b)+$', 'x\na\nb\nz'],
  ['(?ns)^(a.b)+$', 'a\nb'],
  ['(?sn)^(a.b)+$', 'a\nb'],
  ['(?m)^([^[:digit:]]+)$', '12\nab\n34'],
  ['(?s)^([^[:digit:]]+)$', 'a\nb'],
  ['(?n)^([^[:digit:]]+)$', 'a\nb'],
  ['(?x) ^ ( [[:alpha:] #]+ ) \\1 $ # final', 'a#a#'],
  ['(?x) ^ ( []#[:alpha:]]+ ) \\1 $ ', ']#a]#a'],
  ['(?xt)^(a b)+$', 'a ba b'],
  ['(?tx)^ (a b)+ $', 'abab'],
  ['***:(?i)^(ab|cd)+$', 'ABcd'],
  ['***:^(ab|cd)+$', 'abcd'],
  ['(?i)(a+?)\\1', 'AaAa'],
  ['(?i)^(a)(?=A)\\1$', 'aA'],
  ['([[:digit:]]{2})\\1', 'x1212'],
  ['([[:digit:]]{2})\\1', 'x1234'],
  ['^([[:alpha:][:digit:]_]+)$', 'Ab19_'],
  ['^([[:alpha:][:digit:]_]+)$', 'Ab19-'],
  ['^([a-c[:digit:]_]+)$', 'abc19_'],
  ['^([a-c[:digit:]_]+)$', 'd'],
  ['^([^[:alpha:]0-9]+)$', '!_😀'],
  ['^([^[:alpha:]0-9]+)$', '!a'],
  ['(?=[[:xdigit:]]{4}$)([[:digit:]]|[a-f])+', 'ab19'],
  ['(?=[[:xdigit:]]{4}$)([[:digit:]]|[a-f])+', 'ab1g'],
  ['(?<=[[:alpha:]]{2})([[:digit:]]+)', 'ab123'],
  ['(?<![[:alpha:]]{2})([[:digit:]]+)', 'ab123'],
  ['([[:space:]]+)\\1', '\t \t '],
  ['^([[:ascii:]]+)$', 'a\u007f'],
  ['^([[:ascii:]]+)$', 'é'],
  ['^([[:cntrl:]]+)$', '\u0080\u009f'],
  ['^([[:blank:]]+)$', ' \t'],
  ['^([[:blank:]]+)$', '\n'],
  ['^([[:graph:]]+)$', 'a!'],
  ['^([[:print:]]+)$', 'a! '],
  ['^([[:punct:]]+)$', '!_[]'],
  ['^([[:word:]]+)$', 'a9_'],
  ['^([[:alnum:]]+)$', 'a9_'],
  ['(?i)^([[:upper:]]+)$', 'abc'],
  ['(?c)^([[:upper:]]+)$', 'abc'],
  ['(?i)^([[:lower:]]+)$', 'ABC'],
  ['(?c)^([[:lower:]]+)$', 'ABC'],
  ['(?i)^([A-z]+)$', '_aZ'],
  ['(?i)^([Z-a]+)$', '_Az'],
  ['^([]-]+)$', ']-]'],
  ['^([\\]\\-]+)$', ']-]'],
  ['^([\\d_]+)$', '19_'],
  ['^([\\D_]+)$', 'ab_'],
  ['^([^\\D_]+)$', '123'],
  ['^([^\\D_]+)$', '_'],
  ['^([[:alpha:]\\s]+)$', 'a \t'],
  ['^([\\W]+)$', '!😀'],
  ['^([\\t-\\r]+)$', '\t\n\r'],
  ['(?b)^\\(ab\\)*$', 'abab'],
  ['(?b)^\\(ab\\)*$', 'abac'],
  ['(?b)^\\(ab\\)\\{2,3\\}$', 'ababab'],
  ['(?b)^\\(ab\\)\\{2,3\\}$', 'ab'],
  ['(?b)^\\(a*\\)\\1$', 'aaaa'],
  ['(?b)^\\(a*\\)\\1$', 'aaa'],
  ['(?b)^\\(a\\{1,3\\}\\)\\1$', 'aaaaaa'],
  ['(?b)^\\(\\(a\\)b\\)*\\2$', 'ababa'],
  ['(?b)^\\(a\\)\\12$', 'aa2'],
  ['(?b)^\\(a\\)\\12$', 'a12'],
  ['(?bi)^\\([[:lower:]]\\{2\\}\\)\\1$', 'aBAb'],
  ['(?b)^\\([[:digit:]_]\\{2,4\\}\\)$', '12_3'],
  ['(?b)^\\([[:digit:]_]\\{2,4\\}\\)$', '12_a'],
  ['(?b)^\\(a|b\\)*$', 'a|ba|b'],
  ['(?b)^\\(a|b\\)*$', 'abab'],
  ['(?b)^\\(a+?{}()\\)$', 'a+?{}()'],
  ['(?b)^\\(\\+\\?\\|\\}\\)\\1$', '+?|}+?|}'],
  ['(?b)^\\(\\d\\s\\w\\n\\0\\)$', 'dswn0'],
  ['(?b)^\\(*a\\)$', '*a'],
  ['(?b)^\\(?a\\)$', '?a'],
  ['(?b)^*a$', '*a'],
  ['(?b)^\\(^*a$\\)$', '*a'],
  ['(?b)^\\(a^b$c\\)$', 'a^b$c'],
  ['(?b)\\<\\(ab\\)\\>', 'z ab z'],
  ['(?b)\\<\\(ab\\)\\>', 'zabz'],
  ['(?b)^\\([\\d]\\)\\1$', 'dd'],
  ['(?b)^\\([\\d]\\)\\1$', '\\\\'],
  ['(?b)^\\([\\d]\\)\\1$', '11'],
  ['(?bx) ^ \\( a b \\) \\{ 2 , 3 \\} $ # comment', 'abab'],
  ['(?bn)^\\([^[:digit:]]*\\)$', '12\nab\n34'],
  ['(?e)^(ab|cd)+$', 'abcdab'],
  ['(?e)^(ab|cd)+$', 'abcda'],
  ['(?e)^((ab|cd){1,3})+$', 'abcdabcd'],
  ['(?e)^([[:alpha:]]{2}|[[:digit:]]{3})+$', 'ab123cd'],
  ['(?ei)^([[:lower:]]{2}|[[:digit:]]{3})+$', 'AB123cd'],
  ['(?e)^(ab|cd)+\\1$', 'abcd1'],
  ['(?e)^(ab|cd)+\\1$', 'abcdcd'],
  ['(?e)^(\\d\\s\\w\\n)+$', 'dswndswn'],
  ['(?e)^(\\(ab\\))+$', '(ab)(ab)'],
  ['(?e)^(a\\+b\\?)+$', 'a+b?a+b?'],
  ['(?e)^(ab|cd)+)$', 'abcd)'],
  ['(?e)^(ab|cd)+{x}$', 'abcd{x}'],
  ['(?ex) ^ ( ab | cd )+ $ # comment', 'abcd'],
  ['(?en)^(ab|cd)+$', 'x\nabcd\ny'],
  ['(?e)^([\\d]+)$', 'd\\d'],
  ['(?e)^([\\d]+)$', '123'],
  ['(?q)a+([x]){2}\\1', 'za+([x]){2}\\1z'],
  ['(?q)(?#comment)', '(?#comment)'],
  ['(?q)(?i)a', '(?i)a'],
  ['(?q)[', 'a[b'],
  ['(?q)\\', 'a\\b'],
  ['(?q)', 'abc'],
  ['(?qi)A+B', 'za+b'],
  ['(?qic)A+B', 'za+b'],
  ['(?qx) a # b ', 'z a # b z'],
  ['(?qn)a\nb', 'za\nbz'],
  ['(?q)^a$', '^a$'],
  ['(?bq)\\(ab\\)*', '\\(ab\\)*'],
  ['(?qb)^\\(ab\\)*$', 'abab'],
  ['(?eq)(ab|cd)+', '(ab|cd)+'],
  ['(?qe)^(ab|cd)+$', 'abcd'],
  ['(?be)^(ab|cd)+$', 'abcd'],
  ['(?eb)^\\(ab\\)*$', 'abab'],
  ['***=a+([x]){2}\\1', 'za+([x]){2}\\1z'],
  ['***=(?i)a', '(?i)a'],
  ['***:(?b)^\\(ab\\)*$', 'abab'],
  ['***:(?e)^(ab|cd)+$', 'abcd'],
  ['***:(?q)a+', 'za+z'],
  ['(?b)^\\(**a\\)$', '***a'],
  ['(?b)^**a$', '***a'],
  ['(?b)^\\([\\]\\)\\1$', '\\\\'],
  ['(?e)^([\\]+)$', '\\\\'],
  ['(?q)[[:invalid:]]\\z(a**', '[[:invalid:]]\\z(a**'],
  ['(?q)(?#unterminated', '(?#unterminated'],
  ['(?q)😀[a]+', 'z😀[a]+z'],
  ['(?bx)^\\( a $ # end of group\n\\)$', 'a'],
  ['(?e)^([a-z]{1,3}|[0-9]{2})+$', 'ab12c34'],
  ['^(\\d{2}|[a-f]{2})+$', '12ab34'],
  ['^(\\d{2}|[a-f]{2})+$', '12ag34'],
  ['^(\\d{2})\\1$', '1212'],
  ['^(\\D{2})\\1$', 'abab'],
  ['^(\\s+)\\1$', '\t \t '],
  ['^(\\S+)\\1$', 'abab'],
  ['^(\\W+)\\1$', '!?😀!?😀'],
  ['(?n)^(\\D+)$', 'a\nb'],
  ['(?n)^(\\W+)$', '!\n?'],
  ['(?n)^([^\\d]+)$', 'a\nb'],
  ['(?=\\d{2}\\D)(\\d+)([a-z]+)', '12abc'],
  ['(?<=\\s)(\\d+)\\y', 'a 123!'],
  ['\\m(ab|cd)+\\M', 'x abcd!'],
  ['\\m(ab|cd)+\\M', 'xabcd!'],
  ['\\y(ab|cd)+\\y', '!abcd!'],
  ['\\y(ab|cd)+\\y', '!abcdx'],
  ['\\Y(ab|cd)+\\Y', 'xabcdx'],
  ['\\Y(ab|cd)+\\Y', '!abcd!'],
  ['\\m(\\w+)\\s+\\1\\M', 'ab ab!'],
  ['(?<=\\m)(ab|cd)+(?=\\M)', '!abcd!'],
  ['(?<!\\y)(ab|cd)+', 'xabcd'],
  ['(?:\\y)*a', 'a'],
  ['(?:\\Y)*a', 'a'],
  ['(?:\\m)+a', 'a'],
  ['(?:\\m)+a', 'ba'],
  ['\\Y', ''],
  ['\\y', ''],
  ['[[:<:]](ab|cd)+[[:>:]]', '!abcd!'],
  ['[[:<:]](ab|cd)+[[:>:]]', '!abcdx'],
  ['(?b)[[:<:]]\\(ab\\)*[[:>:]]', '!abab!'],
  ['(?e)[[:<:]](ab|cd)+[[:>:]]', '!abcd!'],
  ['(?n)\\A(ab|cd)+\\Z', 'abcd'],
  ['(?n)\\A(ab|cd)+\\Z', 'x\nabcd\n'],
  ['(?n)^(ab|cd)+$', 'x\nabcd\n'],
  ['(ab|cd)+\\Z', 'abcd\n'],
  ['(?=\\A)(ab|cd)+(?=\\Z)', 'abcd'],
  ['(a\\b)\\1', 'a\ba\b'],
  ['(a\\b)\\1', 'aa'],
  ['(\\a\\e\\f\\t\\v)\\1', '\u0007\u001b\f\t\v\u0007\u001b\f\t\v'],
  ['(a\\B)\\1', 'a\\a\\'],
  ['(\\u0061|\\x62){2,3}', 'abba'],
  ['(\\U0001F600)\\1', '😀😀'],
  ['([\\u0061-\\u0063]+)\\1', 'abcabc'],
  ['([\\x61-\\x63]+)\\1', 'abcabc'],
  ['([\\U0001F600-\\U0001F601]+)\\1', '😀😁😀😁'],
  ['([\\010-\\013]+)\\1', '\b\t\n\b\t\n'],
  ['(\\c?)\\1', '\u001f\u001f'],
  ['(\\c[)\\1', '\u001b\u001b'],
  ['([\\c]-\\c_]+)\\1', '\u001d\u001f\u001d\u001f'],
  ['(?x)(\\c#) \\1 # comment', '\u0003\u0003'],
  ['(?x)(\\c ) \\1', 'abc'],
  ['(?x)(\\x61 b) \\1', 'abab'],
  ['(?x)(\\x61 # comment\n b) \\1', 'abab'],
  ['(?x)(\\x61 )+ b', 'aaab'],
  ['(?x)(\\u0061 2) \\1', 'a2a2'],
  ['(?x)(a) \\1 2', 'aa2'],
  ['(?x)(\\01 2) \\1', '\u00012\u00012'],
  ['(\\x100000061)\\1', 'aa'],
  ['([\\x100000061-\\x100000063]+)\\1', 'abcabc'],
  ['(a)\\4294967297', 'aa'],
  ['(a)\\0000000000001', 'a'],
  ['(\\uD800|\\U00110000|a)+', 'aaa'],
  ['([\\uD800-\\uDFFF]|a)+', 'aaa'],
  ['(?e)^(\\d\\m\\y\\u0061)+$', 'dmyu0061'],
  ['(?b)^\\(\\d\\m\\y\\u0061\\)*$', 'dmyu0061'],
  ['([\\12-\\15]+)\\1', '\n\r\n\r'],
  ['([\\777])\\1', '??'],
  ['(\\x800000061)\\1', 'aa'],
  ['(a)\\18446744073709551617', 'aa'],
  ['(a)\\12', 'a\n'],
  ['(a)\\12', 'aa2'],
  ['(a)\\18', 'a\u00018'],
  ['^([[.a.]]|[[.b.]])+$', 'abba'],
  ['^([[.a.]]|[[.b.]])+$', 'abc'],
  ['^([[=a=]]|[[=b=]])+$', 'abba'],
  ['^([[=a=]]|[[=b=]])+$', 'abc'],
  ['([[.a.]][[=b=]])\\1', '!abab!'],
  ['([[.a.]][[=b=]])\\1', '!abac!'],
  ['(?=[[.a.]])([[=a=]]|b)+', 'abba'],
  ['(?<=[[.a.]])([[=b=]]+)', 'abb'],
  ['(?<![[=a=]])([[.b.]]+)', 'abb'],
  ['^([[.zero.]-[.nine.]]+)$', '019'],
  ['^([[.zero.]-[.nine.]]+)$', '0a'],
  ['^([a-[.c.]]+)$', 'abc'],
  ['^([[.a.]-c]+)$', 'abc'],
  ['^([[=a=][:digit:]_]+)$', 'a9_'],
  ['^([^[=a=][:digit:]]+)$', 'b!'],
  ['^([^[=a=][:digit:]]+)$', 'b9'],
  ['(?i)^([[=a=][.b.]]+)$', 'ABab'],
  ['(?c)^([[=a=][.b.]]+)$', 'AB'],
  ['(?i)^([[=é=]]+)$', 'É'],
  ['^([[.😀.]-[.😁.]]+)$', '😀😁'],
  ['^([[.].][.hyphen.]]+)$', ']--]'],
  ['^([[.\\.]]+)$', '\\\\'],
  ['^([[=\\=]]+)$', '\\\\'],
  ['(?x) ^ ( [[. .][=number-sign=]]+ ) $', ' # #'],
  ['(?x) ^ ( [[.\\.]] ) \\1 # comment', '\\\\'],
  ['(?n)^([^[=a=]]+)$', 'b\nc'],
  ['(?n)^([[=newline=]]+)$', '\n\n'],
  ['(?b)^\\([[.a.]-[.c.]]*\\)\\1$', 'abcabc'],
  ['(?e)^([[=a=][.b.]]+)$', 'abba'],
  ['^([[=a=]-]+)$', 'a--a'],
  ['^([-a[=b=]]+)$', 'a-b'],
  ['^([[.colon.][.right-square-bracket.][.reverse-solidus.]]+)$', ':]\\'],
]) {
  inputs.push({
    family: 'composition',
    pattern,
    subject,
    options: {
      syntax: 'advanced',
      caseSensitive: true,
      expanded: false,
      newline: 'ordinary',
    },
  })
}

for (const [name, character] of [
  ['NUL', '\u0000'],
  ['SOH', '\u0001'],
  ['STX', '\u0002'],
  ['ETX', '\u0003'],
  ['EOT', '\u0004'],
  ['ENQ', '\u0005'],
  ['ACK', '\u0006'],
  ['BEL', '\u0007'],
  ['alert', '\u0007'],
  ['BS', '\b'],
  ['backspace', '\b'],
  ['HT', '\t'],
  ['tab', '\t'],
  ['LF', '\n'],
  ['newline', '\n'],
  ['VT', '\u000b'],
  ['vertical-tab', '\u000b'],
  ['FF', '\f'],
  ['form-feed', '\f'],
  ['CR', '\r'],
  ['carriage-return', '\r'],
  ['SO', '\u000e'],
  ['SI', '\u000f'],
  ['DLE', '\u0010'],
  ['DC1', '\u0011'],
  ['DC2', '\u0012'],
  ['DC3', '\u0013'],
  ['DC4', '\u0014'],
  ['NAK', '\u0015'],
  ['SYN', '\u0016'],
  ['ETB', '\u0017'],
  ['CAN', '\u0018'],
  ['EM', '\u0019'],
  ['SUB', '\u001a'],
  ['ESC', '\u001b'],
  ['IS4', '\u001c'],
  ['FS', '\u001c'],
  ['IS3', '\u001d'],
  ['GS', '\u001d'],
  ['IS2', '\u001e'],
  ['RS', '\u001e'],
  ['IS1', '\u001f'],
  ['US', '\u001f'],
  ['space', ' '],
  ['exclamation-mark', '!'],
  ['quotation-mark', '"'],
  ['number-sign', '#'],
  ['dollar-sign', '$'],
  ['percent-sign', '%'],
  ['ampersand', '&'],
  ['apostrophe', "'"],
  ['left-parenthesis', '('],
  ['right-parenthesis', ')'],
  ['asterisk', '*'],
  ['plus-sign', '+'],
  ['comma', ','],
  ['hyphen', '-'],
  ['hyphen-minus', '-'],
  ['period', '.'],
  ['full-stop', '.'],
  ['slash', '/'],
  ['solidus', '/'],
  ['zero', '0'],
  ['one', '1'],
  ['two', '2'],
  ['three', '3'],
  ['four', '4'],
  ['five', '5'],
  ['six', '6'],
  ['seven', '7'],
  ['eight', '8'],
  ['nine', '9'],
  ['colon', ':'],
  ['semicolon', ';'],
  ['less-than-sign', '<'],
  ['equals-sign', '='],
  ['greater-than-sign', '>'],
  ['question-mark', '?'],
  ['commercial-at', '@'],
  ['left-square-bracket', '['],
  ['backslash', '\\'],
  ['reverse-solidus', '\\'],
  ['right-square-bracket', ']'],
  ['circumflex', '^'],
  ['circumflex-accent', '^'],
  ['underscore', '_'],
  ['low-line', '_'],
  ['grave-accent', '`'],
  ['left-brace', '{'],
  ['left-curly-bracket', '{'],
  ['vertical-line', '|'],
  ['right-brace', '}'],
  ['right-curly-bracket', '}'],
  ['tilde', '~'],
  ['DEL', '\u007f'],
]) {
  for (const subject of [character === '\0' ? '' : character.repeat(2), 'xx']) {
    inputs.push({
      family: 'composition',
      pattern: `^([[.${name}.]][[=${name}=]])$`,
      subject,
      options: {
        syntax: 'advanced',
        caseSensitive: true,
        expanded: false,
        newline: 'ordinary',
      },
    })
  }
}

for (const [syntax, pattern, subject, overrides] of [
  ['literal', '(?i)A', '(?i)A', {}],
  ['literal', '***=a+b', '***=a+b', {}],
  ['literal', 'a # b', 'a # b', { expanded: true }],
  ['literal', 'A\nB', 'a\nb', { caseSensitive: false, newline: 'sensitive' }],
  ['basic', '(?i)a', '(?i)a', {}],
  ['extended', '(?i)a', 'a', {}],
  ['basic', '***:^(ab|cd)+$', 'abcd', {}],
  ['extended', '***:^(ab|cd)+$', 'abcd', {}],
  ['basic', '***=a+b', 'a+b', {}],
  ['extended', '***=a+b', 'a+b', {}],
  ['basic', '***:(?i)^(ab|cd)+$', 'ABcd', {}],
  ['extended', '***:(?b)^\\(ab\\)*$', 'abab', {}],
  ['advanced', '(?c)a', 'A', { caseSensitive: false }],
  ['advanced', '(?i)a', 'A', {}],
  ['advanced', '(?t)a b', 'a b', { expanded: true }],
  ['advanced', '(?x)a b', 'ab', {}],
  ['advanced', '(?s)^a.b$', 'a\nb', { newline: 'sensitive' }],
  ['advanced', '(?n)^a$', 'x\na\nx', { newline: 'ordinary' }],
  ['literal', '[a', '[a', {}],
  ['advanced', '[a', 'a', {}],
  ['basic', '***?', '***?', {}],
  ['extended', '***?', '***?', {}],
  ['literal', '***?', '***?', {}],
  ['advanced', '[[..]]', 'az', {}],
  ['advanced', '[[==]]', 'az', {}],
  ['advanced', '[[.missing.]]', 'az', {}],
  ['advanced', '[[=missing=]]', 'az', {}],
  ['advanced', '[[.Zero.]]', 'az', {}],
  ['advanced', '[[.ab.]]', 'az', {}],
  ['advanced', '[[.a=]]', 'az', {}],
  ['advanced', '[[.a.]', 'az', {}],
  ['advanced', '[[=a=]-z]', 'az', {}],
  ['advanced', '[a-[=z=]]', 'az', {}],
  ['advanced', '[[=a=]-[=z=]]', 'az', {}],
  ['advanced', '[[.z.]-[.a.]]', 'az', {}],
  ['advanced', '{2}', 'ab', {}],
  ['advanced', '{0,1}', 'ab', {}],
  ['advanced', 'a|{2}', 'a', {}],
  ['advanced', '({2})', 'ab', {}],
  ['extended', '{2}', 'ab', {}],
  ['literal', '{2}', '{2}', {}],
  ['basic', '{2}', '{2}', {}],
  ['advanced', '\\{2}', '{2}', {}],
  ['advanced', '{x}', '{x}', {}],
]) {
  inputs.push({
    family: 'api',
    pattern,
    subject,
    options: { syntax, caseSensitive: true, expanded: false, newline: 'ordinary', ...overrides },
  })
}

for (const [pattern, subject, start, overrides] of [
  ['', '', 1, {}],
  ['', '😀a', 1, {}],
  ['', '😀a', 2, {}],
  ['', '😀a', 3, {}],
  ['', '😀a', 4, {}],
  ['a*', 'baa', 1, {}],
  ['a*?', 'aaa', 1, {}],
  ['(a*?)', 'aaa', 1, {}],
  ['(a*)\\1', 'aaaa', 1, {}],
  ['(a*?)\\1', 'aaaa', 1, {}],
  ['a|', 'baa', 1, {}],
  ['a|', 'baa', 2, {}],
  ['(a|aa)\\1', 'aaaaaa', 1, {}],
  ['((a|b)*)\\1', 'abababab', 1, {}],
  ['(ab|cd)+', 'xabcd!abab?cd', 1, {}],
  ['(ab|cd)+?', 'xabcd!abab?cd', 1, {}],
  ['(a)?b\\1', 'aba ba aba', 1, {}],
  ['(a|b){2}\\1', 'abbbaa', 1, {}],
  ['(?=a)', 'aaa', 1, {}],
  ['(?<=a)', 'aaa', 1, {}],
  ['(?<=a)', 'aaa', 3, {}],
  ['(?<=a)', 'aaa', 4, {}],
  ['(?<!a)', 'aba', 1, {}],
  ['(?=a)(?=a)', 'aaa', 1, {}],
  ['a(?=a)', 'aaaa', 1, {}],
  ['(?=(ab|cd))(?:ab|cd)', 'abcdab', 1, {}],
  ['(?<=(?:ab|cd))[0-9]+', 'ab12 cd34 ef56', 1, {}],
  ['^|$', 'ab', 1, {}],
  ['^|$', 'a\nb', 1, { newline: 'sensitive' }],
  ['\\y', 'ab cd', 1, {}],
  ['\\Y', '', 1, {}],
  ['[[:<:]]|[[:>:]]', 'ab cd', 1, {}],
  ['(?n)^', 'a\nb\n', 1, {}],
  ['(😀)\\1', '😀😀!😀😀', 1, {}],
  ['(😀)\\1', '😀😀!😀😀', 2, {}],
  ['(?=😀)', '😀😀', 2, {}],
  ['([[.a.]][[=b=]])\\1', 'abab!abab', 1, {}],
  ['[[.zero.]-[.nine.]]+', '01a234', 1, {}],
  ['(?x)(a b) \\1 # comment', 'abab abab', 1, {}],
  ['(?i)(ab)\\1', 'abAB ABab', 1, {}],
  ['(ab|cd)+', 'abcd xx abab', 1, { syntax: 'extended' }],
  ['\\(ab\\)\\1', 'abab xx abab', 1, { syntax: 'basic' }],
  ['a+', 'a+a+', 1, { syntax: 'basic' }],
  ['***:(?=a)', 'aaa', 1, { syntax: 'basic' }],
  ['***=a+', 'a+a+', 1, { syntax: 'extended' }],
  ['(?b)\\(a\\)\\1', 'aaaa', 1, {}],
  ['(?q)a+', 'a+a+', 1, {}],
  ['a+', 'a+a+', 1, { syntax: 'literal' }],
  ['A😀', 'a😀A😀', 1, { syntax: 'literal', caseSensitive: false }],
  ['.', 'a\nb', 1, { newline: 'stop' }],
  ['^.$', 'a\nb', 1, { newline: 'anchors' }],
  ['[', '', 1, {}],
  ['[', '', 9, {}],
  ['a{256}', '', 9, {}],
  ['[[=a=]-z]', 'az', 1, {}],
  ['(a)\\2', 'aaaa', 1, {}],
  ['a', 'a', 1, { syntax: 'literal', expanded: true }],
  ['a', 'a', 1, { syntax: 'literal', newline: 'sensitive' }],
  ['(?=a)', 'aaa', 5, {}],
  ['z', 'aaaa', 1, {}],
]) {
  inputs.push({
    operation: 'count',
    family: 'count',
    pattern,
    subject,
    start,
    options: {
      syntax: 'advanced',
      caseSensitive: true,
      expanded: false,
      newline: 'ordinary',
      ...overrides,
    },
  })
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
  const countSql = `select regexp_count(($1::text collate "C"), $2::text, $4::int, $3::text) as count`
  const fixtures = []
  for (const { family, operation, ...input } of inputs) {
    const pattern =
      input.options.syntax === 'extended' && !input.pattern.startsWith('***')
        ? `(?e)${input.pattern}`
        : input.pattern
    let expected
    try {
      const result = await pg.query(operation === 'count' ? countSql : sql, [
        input.subject,
        pattern,
        flags(input.options),
        input.start ?? 1,
      ])
      const { match_start: start, match_end: end } = result.rows[0]
      expected =
        operation === 'count'
          ? { kind: 'Count', value: result.rows[0].count }
          : start === 0
            ? { kind: 'NoMatch' }
            : { kind: 'Found', value: { start: start - 1, end: end - 1 } }
    } catch (error) {
      if (error.code !== '2201B') throw error
      expected = { kind: 'InvalidPattern', sqlstate: error.code }
    }
    fixtures.push({
      ...(family ? { family } : {}),
      ...(operation ? { operation } : {}),
      input,
      expected,
    })
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
