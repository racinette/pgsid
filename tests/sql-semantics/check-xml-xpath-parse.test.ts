import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches native XPath compilation independently of reached runtime errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-parse-'))
  const known = (value: string | boolean | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_parser',
      constraint: 'compiles',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, expected: BoolValue, limit: Int4Value, reason: Int4Value) -> CheckOutcome {
      let result = xpath_parser_probe(input,expected,limit,reason); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_parse.rs'))!.source += `
pub fn xpath_parser_probe(input: TextValue, expected: BoolValue, limit: Int4Value, reason: Int4Value) -> BoolValue {
 if let TextValue::Error(error) = input { return BoolValue::Error(error); };
 if let BoolValue::Error(error) = expected { return BoolValue::Error(error); };
 if let TextValue::Null = input { return BoolValue::Null; };
 if let TextValue::Value(value) = input {
  if let Int4Value::Value(maximum) = limit {
   if let Int4Value::Value(fault) = reason {
    let program = xpath_parse_frontend(value.as_str(),maximum);
    if program.budget.fault > 0 { return BoolValue::Unknown; };
    if let BoolValue::Value(wanted) = expected { return BoolValue::Value(program.valid == wanted && program.budget.fault == fault); };
   };
  };
 };
 BoolValue::Unknown
}
`
    const inputs = [
      { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
      { name: 'expected', type: 'pg_catalog.bool', rustName: 'expected', rustType: 'BoolValue' },
      { name: 'limit', type: 'pg_catalog.int4', rustName: 'limit', rustType: 'Int4Value' },
      { name: 'reason', type: 'pg_catalog.int4', rustName: 'reason', rustType: 'Int4Value' },
    ]
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const expressions = new Set([
      '',
      ' ',
      'unknown(',
      'true(',
      'concat(1,',
      'concat(1, ',
      'unknown(1',
      'concat(1,)',
      '/',
      '//',
      '/r',
      'r',
      '*',
      '@*',
      '@a',
      '@node()',
      '..',
      '.',
      './r',
      '../@a',
      'r//a',
      '//r/@p:a',
      'p:*',
      'node()',
      'text()',
      'comment()',
      'processing-instruction()',
      'processing-instruction("x")',
      'processing-instruction(1)',
      'node(1)',
      'r[1][last()]',
      '.[1]',
      '..[1]',
      '(r)[1]',
      '(r|a)[1]/@x',
      '/r/(a)',
      '(1)/a',
      '1/a',
      'r/unknown()',
      'unknown()',
      'p:f()',
      'p:node()',
      '$x',
      '$p:x',
      '$p :x',
      'p :f()',
      'p :a',
      'p :*',
      'p: *',
      'p : a',
      '@p :a',
      'attribute::p :a',
      'child :: a',
      'a :: b',
      'child::p :a',
      'r/p :a',
      'r/@p :a',
      'p\n:a',
      'p\t:a',
      '1e2',
      '.5e2',
      '1.e-2',
      '1E+2',
      '1e',
      '1e+',
      '1e-',
      '1e--2',
      '1e2.5',
      '0x10',
      'NaN',
      'Infinity',
      '1[2]',
      '+1',
      '--1',
      '-a|b',
      'a|-b',
      'a|(-b)',
      'a*-b',
      '1and2',
      '1or0',
      '2div1',
      '2mod1',
      'a andb',
      'a divb',
      'a* b',
      'concat("a",)',
      'foo(,1)',
      'foo(1,,2)',
      'foo()',
      'foo(1,2,3)',
      'foo(unknown(),$x,r[a=b])',
      '"a\\b"',
      '"a\nb"',
      '"a\vb"',
      '"a\fb"',
      '"\ufffe"',
      '"\uffff"',
      "'a''b'",
      '"unterminated',
      'r[true()]//a',
      'r[',
      'r[]',
      'r[1',
      'r[1]]',
      '(1) or true() or (2',
      '1) or true() or (2',
      '雪',
      '😊',
      'p:😊',
      '_x',
      'a-b',
      'a.b',
      'a:b:c',
      'a:',
      '*:a',
    ])
    for (const axis of [
      'child',
      'attribute',
      'self',
      'parent',
      'descendant',
      'descendant-or-self',
      'ancestor',
      'ancestor-or-self',
      'following-sibling',
      'preceding-sibling',
      'following',
      'preceding',
      'namespace',
      'Child',
      'unknown',
    ])
      for (const test of ['*', 'p:*', 'node()', 'text()', 'a[1]', "processing-instruction('p')"])
        expressions.add(axis + '::' + test)
    const atoms = ['r', '@a', '/', '1', '.5', '"x"', 'true()', 'unknown()', '$v', '(r|a)[1]']
    for (const left of atoms)
      for (const operator of [
        'or',
        'and',
        '=',
        '!=',
        '<',
        '<=',
        '>',
        '>=',
        '+',
        '-',
        '*',
        'div',
        'mod',
        '|',
      ])
        for (const right of ['r', '1', '-2', '"x"'])
          expressions.add(left + ' ' + operator + ' ' + right)
    const rules = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/xml_xpath_names.rs',
      'utf8',
    )
    const boundary = new Set<number>([0x1f60a, 0x10000, 0x0370, 0x0300])
    for (const block of rules.matchAll(
      /const XPATH_NAME_(?:START|EXTRA)_RANGES: &\[i32\] = &\[([\s\S]*?)\];/gu,
    )) {
      const numbers = [...block[1]!.matchAll(/\d+/gu)].map((m) => Number(m[0]))
      for (let i = 0; i < numbers.length; i += 2)
        for (const code of [numbers[i]! - 1, numbers[i]!, numbers[i + 1]!, numbers[i + 1]! + 1])
          if (code >= 32 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff))
            boundary.add(code)
    }
    for (const code of boundary) {
      const character = String.fromCodePoint(code)
      expressions.add(character + 'x')
      expressions.add('x' + character)
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const cases = [...expressions].map((expression) => ({ expression, limit: 5000 }))
    for (const limit of [500, 1000, 5000]) {
      const boundary = limit / 10
      for (const depth of [0, boundary - 2, boundary - 1, boundary, boundary + 1])
        for (const expression of [
          '('.repeat(depth) + 'true()' + ')'.repeat(depth),
          'unknown('.repeat(depth) + '1' + ')'.repeat(depth),
          '/r['.repeat(depth) + 'true()' + ']'.repeat(depth),
          '('.repeat(depth) + '@' + ')'.repeat(depth),
          '#' + '('.repeat(depth) + 'true()' + ')'.repeat(depth),
        ])
          cases.push({ expression, limit })
    }
    for (const count of [1000, 10000]) {
      cases.push({ expression: '-'.repeat(count) + '1', limit: 5000 })
      cases.push({
        expression: Array(count + 1)
          .fill('1')
          .join('+'),
        limit: 5000,
      })
    }
    for (const { expression, limit } of cases) {
      let valid = true,
        reason = 0
      try {
        expect(
          (
            await pg.query<{ value: boolean }>('SELECT xpath_exists($1,$2::xml) value', [
              'true() or ' +
                '('.repeat((5000 - limit) / 10) +
                expression +
                ')'.repeat((5000 - limit) / 10),
              '<r/>',
            ])
          ).rows[0]!.value,
        ).toBe(true)
      } catch (error) {
        expect((error as { code: string }).code, expression).toBe('10608')
        if ((error as { detail?: string }).detail?.includes('Recursion limit exceeded'))
          reason = -26
        valid = false
      }
      fixtures.push({
        name: 'compiles',
        row: {
          input: known(expression),
          expected: known(valid),
          limit: known(limit),
          reason: known(reason),
        },
        expected: { kind: 'True' },
      })
      reference.push({ expression, limit, valid, reason })
    }
    for (const depth of [0, 1, 48, 49, 50, 99, 499])
      fixtures.push({
        name: 'compiles',
        row: {
          input: known('('.repeat(depth) + 'true()' + ')'.repeat(depth)),
          expected: known(true),
          limit: known(0),
          reason: known(0),
        },
        expected: depth >= 50 ? { kind: 'Unknown' } : { kind: 'True' },
      })
    fixtures.push(
      {
        name: 'compiles',
        row: {
          input: { kind: 'Null' },
          expected: known(true),
          limit: known(5000),
          reason: known(0),
        },
        expected: { kind: 'Null' },
      },
      {
        name: 'compiles',
        row: {
          input: { kind: 'Unknown' },
          expected: known(true),
          limit: known(5000),
          reason: known(0),
        },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'compiles',
        row: {
          input: { kind: 'Error', value: { state: parseInt('22023', 36) } },
          expected: { kind: 'Unknown' },
          limit: known(5000),
          reason: known(0),
        },
        expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      },
    )
    const packet = 'artifacts/goal-checks/xml-xpath-compile-steps-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/parse-reference.json',
      JSON.stringify({ reference, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(root, 'xpathparse', group, ['compiles'], fixtures)
    console.info('XPath parser parity', {
      expressions: expressions.size,
      cases: cases.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
