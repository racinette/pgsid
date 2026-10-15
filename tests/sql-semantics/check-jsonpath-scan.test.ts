import { describe, expect, it } from 'vitest'
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import {
  transpileCheckRust,
  transpileCheckRustFiles,
  checkTypescriptArtifacts,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { valueRepresentation } from '../../scripts/check-measurements/probes.js'

type Token = [kind: string, raw: string, decoded?: string]
type Fixture = { input: string; tokens?: Token[]; error?: string }
const token = (kind: string, raw = kind, decoded = ''): Token => [kind, raw, decoded]
const member = (raw: string, decoded: string, kind = 'identifier'): Fixture => ({
  input: '$.' + raw,
  tokens: [token('$'), token('.'), token(kind, raw, decoded)],
})
const nameCases = [
  ['a', 'a'],
  ['a_123', 'a_123'],
  ['a;b', 'a;b'],
  ["a'b", "a'b"],
  ['雪😊', '雪😊'],
  ['TRUE', 'TRUE'],
  ['NULL', 'NULL'],
  ['False', 'False'],
  ['a\v', 'a\v'],
  [String.raw`a\ b`, 'a b'],
  [String.raw`a\.b`, 'a.b'],
  [String.raw`a\?b`, 'a?b'],
  [String.raw`a\zb`, 'azb'],
  [String.raw`\x41\xFF`, 'Aÿ'],
  [String.raw`\u0061\u{1f60a}`, 'a😊'],
  [String.raw`\uD83D\uDE0A`, '😊'],
  [String.raw`\u{D83D}\uDE0A`, '😊'],
  [String.raw`\uD83D\u{DE0A}`, '😊'],
  [String.raw`\b\f\n\r\t\v`, '\b\f\n\r\t\v'],
] as const
const quotedCases = [
  ['', ''],
  ['a b', 'a b'],
  ['a\nb', 'a\nb'],
  ['/* unparsed */', '/* unparsed */'],
  [String.raw`\"\\\/`, '"\\/'],
  [String.raw`\xFF`, 'ÿ'],
  [String.raw`\u{10ffff}`, '\u{10ffff}'],
] as const
const keywords = [
  'is',
  'to',
  'abs',
  'lax',
  'date',
  'flag',
  'last',
  'null',
  'size',
  'time',
  'true',
  'type',
  'with',
  'false',
  'floor',
  'bigint',
  'double',
  'exists',
  'number',
  'starts',
  'strict',
  'string',
  'boolean',
  'ceiling',
  'decimal',
  'integer',
  'time_tz',
  'unknown',
  'datetime',
  'keyvalue',
  'timestamp',
  'like_regex',
  'timestamp_tz',
]
const numericCases = [
  ['0', 'integer', '0'],
  ['123', 'integer', '123'],
  ['1_234', 'integer', '1234'],
  ['0xFF', 'integer', '255'],
  ['0Xf_f', 'integer', '255'],
  ['0o17', 'integer', '15'],
  ['0O7_7', 'integer', '63'],
  ['0b101', 'integer', '5'],
  ['0B1_0', 'integer', '2'],
  ['1.', 'numeric', '1'],
  ['.01', 'numeric', '0.01'],
  ['0.1_2', 'numeric', '0.12'],
  ['1.2300', 'numeric', '1.2300'],
  ['1e+2', 'numeric', '100'],
  ['1.2E-2', 'numeric', '0.012'],
  ['1e1_0', 'numeric', '10000000000'],
] as const
const errors = [
  ['', '/*'],
  ['', '$.a/*unfinished'],
  ['', '"unterminated'],
  ['', '$."unterminated'],
  ['', '$"unterminated'],
  ['', '$.a\\'],
  ['', '$.a\\\nb'],
  ['', String.raw`$."\x"`],
  ['', String.raw`$."\x0"`],
  ['', String.raw`$."\xGG"`],
  ['', String.raw`$."\u"`],
  ['', String.raw`$."\u123"`],
  ['', String.raw`$."\u123G"`],
  ['', String.raw`$."\u{}"`],
  ['', String.raw`$."\u{1234567}"`],
  ['', String.raw`$."\u{110000}"`],
  ['', String.raw`$."\uD800\uZZZZ"`],
  ['', String.raw`$."\u0000\uZZZZ"`],
  ['', '01'],
  ['', '1_'],
  ['', '1e'],
  ['', '1e+'],
  ['', '1e-'],
  ['', '1.2x'],
  ['', '.1x'],
  ['', '123a'],
  ['', '0x'],
  ['22P02', String.raw`$."\uD800"`],
  ['22P02', String.raw`$."\uDC00"`],
  ['22P02', String.raw`$."\uD800\uD800"`],
  ['22P02', String.raw`$."\uD800\u0061"`],
  ['22P02', String.raw`$."\uD800\x41"`],
  ['22P02', String.raw`$."\uD800\u{110000}"`],
  ['22P05', String.raw`$."\u0000"`],
  ['22P05', String.raw`$."\x00"`],
  ['22P05', String.raw`$."\u{0}"`],
] as const

const projection = String.raw`
fn scan_probe_label(kind: i32) -> String {
    if kind < 256 {
        let mut result = String::new();
        result.push(char::from_u32(kind as u32).unwrap_or(' '));
        return result;
    };
    if kind == JSONPATH_SCAN_IDENT { return "identifier".to_owned(); };
    if kind == JSONPATH_SCAN_STRING { return "string".to_owned(); };
    if kind == JSONPATH_SCAN_VARIABLE { return "variable".to_owned(); };
    if kind == JSONPATH_SCAN_INT { return "integer".to_owned(); };
    if kind == JSONPATH_SCAN_NUMERIC { return "numeric".to_owned(); };
    if kind == JSONPATH_SCAN_AND { return "&&".to_owned(); };
    if kind == JSONPATH_SCAN_OR { return "||".to_owned(); };
    if kind == JSONPATH_SCAN_ANY { return "**".to_owned(); };
    if kind == JSONPATH_SCAN_LE { return "<=".to_owned(); };
    if kind == JSONPATH_SCAN_EQ { return "==".to_owned(); };
    if kind == JSONPATH_SCAN_NE { return "!=".to_owned(); };
    if kind == JSONPATH_SCAN_GE { return ">=".to_owned(); };
    "keyword".to_owned()
}
pub fn scan_probe(input: &str) -> String {
    let scan = jsonpath_scan_tokens(input);
    if scan.error == JSONPATH_SCAN_SYNTAX { return "42601".to_owned(); };
    if scan.error == JSONPATH_SCAN_SURROGATE { return "22P02".to_owned(); };
    if scan.error == JSONPATH_SCAN_ZERO { return "22P05".to_owned(); };
    let mut result = String::new();
    let mut index: usize = 0;
    while index < scan.tokens.len() {
        let token = scan.tokens[index];
        let label = scan_probe_label(token.kind);
        result.push_str(label.as_str());
        result.push(':');
        let mut position = token.start;
        while position < token.end { result.push(scan.source[position]); position += 1; }
        result.push_str("->");
        position = token.text_start;
        while position < token.text_end { result.push(scan.text[position]); position += 1; }
        result.push('\n');
        index += 1;
    }
    result
}
`

describe('CHECK JSONPath lexical foundation', () => {
  it('preserves PostgreSQL token boundaries and decoded names in Rust, Go and TypeScript', async () => {
    const fixtures: Fixture[] = [
      { input: '', tokens: [] },
      { input: ' \t\r\n\f/**/', tokens: [] },
      ...nameCases.map(([raw, decoded]) => member(raw, decoded)),
      ...quotedCases.map(([raw, decoded]) => member('"' + raw + '"', decoded, 'string')),
      ...keywords.flatMap((word) => [
        member(word, word, 'keyword'),
        member(
          word.toUpperCase(),
          word.toUpperCase(),
          ['true', 'false', 'null'].includes(word) ? 'identifier' : 'keyword',
        ),
      ]),
      member(String.raw`\u0074rue`, 'true', 'keyword'),
      ...numericCases.map(([input, kind]) => ({ input, tokens: [token(kind, input)] })),
      ...errors.map(([error, input]) => ({ input, error: error || '42601' })),
      { input: '$name', tokens: [token('variable', '$name', 'name')] },
      { input: '$123', tokens: [token('variable', '$123', '123')] },
      { input: '$true', tokens: [token('variable', '$true', 'true')] },
      { input: '$""', tokens: [token('variable', '$""', '')] },
      {
        input: String.raw`$"a\u0020b"`,
        tokens: [token('variable', String.raw`$"a\u0020b"`, 'a b')],
      },
      {
        input: '$name\\u0061',
        tokens: [token('variable', '$name', 'name'), token('identifier', '\\u0061', 'a')],
      },
      { input: '$/**/.a', tokens: [token('$'), token('.'), token('identifier', 'a', 'a')] },
      { input: '$.a/*drop*/ b', tokens: [token('$'), token('.'), token('identifier', 'b', 'b')] },
      { input: '$.a/*drop*/"b"', tokens: [token('$'), token('.'), token('string', '"b"', 'b')] },
      {
        input: '$.a/*drop*/.b',
        tokens: [token('$'), token('.'), token('.'), token('identifier', 'b', 'b')],
      },
      { input: '123abc', tokens: [token('identifier', '123abc', '123abc')] },
      { input: '0xgg', tokens: [token('identifier', '0xgg', '0xgg')] },
      { input: '.01', tokens: [token('numeric', '.01')] },
      { input: '01a', tokens: [token('identifier', '01a', '01a')] },
      { input: '0_1', tokens: [token('identifier', '0_1', '0_1')] },
      { input: '1efoo', tokens: [token('identifier', '1efoo', '1efoo')] },
      { input: '0xFFg', tokens: [token('identifier', '0xFFg', '0xFFg')] },
      ...['123é', '123😊', '1é', '0xFFé', '123ab'].map((raw) => ({
        input: '$. ' + raw,
        tokens: [token('$'), token('.'), token('identifier', raw, raw)],
      })),
      { input: '.123é', error: '42601' },
      ...['&&', '||', '**', '<=', '==', '!=', '<>', '>='].map((input) => ({
        input,
        tokens: [token(input === '<>' ? '!=' : input, input)],
      })),
      ...Array.from('?%$.[]{}()|&!=<>@#,*:-+/').map((input) => ({ input, tokens: [token(input)] })),
      { input: '/* outer /* inner */true', tokens: [token('keyword', 'true', 'true')] },
      {
        input:
          'strict $.items[1 to last, -2].**{0 to last} ? (@.price >= $limit && exists(@.name))',
        tokens: [
          token('keyword', 'strict', 'strict'),
          token('$'),
          token('.'),
          token('identifier', 'items', 'items'),
          token('['),
          token('integer', '1'),
          token('keyword', 'to', 'to'),
          token('keyword', 'last', 'last'),
          token(','),
          token('-'),
          token('integer', '2'),
          token(']'),
          token('.'),
          token('**'),
          token('{'),
          token('integer', '0'),
          token('keyword', 'to', 'to'),
          token('keyword', 'last', 'last'),
          token('}'),
          token('?'),
          token('('),
          token('@'),
          token('.'),
          token('identifier', 'price', 'price'),
          token('>='),
          token('variable', '$limit', 'limit'),
          token('&&'),
          token('keyword', 'exists', 'exists'),
          token('('),
          token('@'),
          token('.'),
          token('identifier', 'name', 'name'),
          token(')'),
          token(')'),
        ],
      },
      {
        input: 'a'.repeat(50000),
        tokens: [token('identifier', 'a'.repeat(50000), 'a'.repeat(50000))],
      },
    ]
    const scanner = await readFile('crates/check-evaluator/src/jsonpath_scan.rs', 'utf8')
    const packaged = assembleCheckRust({ source: '', callables: [] })
    expect(
      packaged.modules
        .flatMap((module) => module.files)
        .find((file) => file.path.endsWith('/jsonpath_scan.rs'))?.source,
    ).toBe(scanner)
    expect(valueRepresentation('pg_catalog.jsonpath').represented).toBe(false)
    const source = scanner + projection
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const probe = (context.exports as { scanProbe(input: string): string }).scanProbe
    const cases = fixtures.map((fixture) => ({
      input: fixture.input,
      expected:
        fixture.error ??
        fixture.tokens!.map(([kind, raw, decoded = '']) => `${kind}:${raw}->${decoded}\n`).join(''),
    }))
    for (const fixture of cases) expect(probe(fixture.input), fixture.input).toBe(fixture.expected)

    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-scan-'))
    const run = promisify(execFile)
    try {
      const oracle: unknown[] = []
      for (const [raw, decoded] of [
        ...nameCases,
        ...keywords.flatMap((word) => [
          [word, word] as const,
          [word.toUpperCase(), word.toUpperCase()] as const,
        ]),
      ]) {
        const input = '$.' + raw
        const result = await pg.query<{ value: string }>(
          'SELECT jsonb_path_query_first(jsonb_build_object($2::text,42),$1::jsonpath)::text value',
          [input, decoded],
        )
        expect(result.rows[0]!.value, input).toBe('42')
        oracle.push({ input, decoded, result: result.rows[0] })
      }
      for (const [raw, decoded] of quotedCases) {
        const input = '"' + raw + '"'
        const result = await pg.query<{ value: string }>(
          "SELECT jsonb_path_query_first('null',$1::jsonpath)#>>'{}' value",
          [input],
        )
        expect(result.rows[0]!.value, input).toBe(decoded)
        oracle.push({ input, decoded, result: result.rows[0] })
      }
      for (const [input, , expected] of numericCases) {
        const result = await pg.query<{ value: string }>('SELECT $1::jsonpath::text value', [input])
        expect(result.rows[0]!.value, input).toBe(expected)
        oracle.push({ input, result: result.rows[0] })
      }
      for (const [error, input] of errors) {
        const code = await pg.query('SELECT $1::jsonpath', [input]).then(
          () => 'accepted',
          (failure: { code: string }) => failure.code,
        )
        expect(code, input).toBe(error || '42601')
        oracle.push({ input, error: code })
      }
      for (const [input, key] of [
        ['$name', 'name'],
        ['$123', '123'],
        ['$true', 'true'],
        ['$""', ''],
        [String.raw`$"a\u0020b"`, 'a b'],
      ]) {
        const result = await pg.query<{ value: string }>(
          "SELECT jsonb_path_query_first('null',$1::jsonpath,jsonb_build_object($2::text,42))::text value",
          [input, key],
        )
        expect(result.rows[0]!.value, input).toBe('42')
        oracle.push({ input, variable: key, result: result.rows[0] })
      }
      for (const input of ['123abc', '0xgg', '01a', '0_1', '1efoo', '$.a/*drop*/.b']) {
        await expect(pg.query('SELECT $1::jsonpath', [input])).rejects.toMatchObject({
          code: '42601',
        })
        oracle.push({ input, lexicalSuccess: true, grammarError: '42601' })
      }
      for (const input of ['$.a/*drop*/ b', '$.a/*drop*/"b"']) {
        const result = await pg.query<{ value: string }>('SELECT $1::jsonpath::text value', [input])
        expect(result.rows[0]!.value).toBe('$."b"')
        oracle.push({ input, result: result.rows[0] })
      }
      for (const raw of ['123é', '123😊', '1é', '0xFFé', '123ab', '0xFFg']) {
        const input = '$. ' + raw
        const result = await pg.query<{ value: string }>(
          'SELECT jsonb_path_query_first(jsonb_build_object($2::text,42),$1::jsonpath)::text value',
          [input, raw],
        )
        expect(result.rows[0]!.value, input).toBe('42')
        oracle.push({ input, decoded: raw, result: result.rows[0] })
      }
      await expect(pg.query('SELECT $1::jsonpath', ['.123é'])).rejects.toMatchObject({
        code: '42601',
      })
      oracle.push({ input: '.123é', error: '42601' })
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module jsonpathscan\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestScanner(t *testing.T) {
${cases.map(({ input, expected }) => `if got := ScanProbe(${JSON.stringify(input)}); got != ${JSON.stringify(expected)} { t.Fatalf("input %q: got %q", ${JSON.stringify(input)}, got) }`).join('\n')}
}`,
      )
      await writeFile(
        join(directory, 'scan.rs'),
        source +
          `
#[test] fn scan_cases() {
${cases.map(({ input, expected }) => `assert_eq!(scan_probe(${rustStringLiteral(input)}),${rustStringLiteral(expected)});`).join('\n')}
}`,
      )
      await run('rustc', [
        '--edition=2021',
        '--test',
        join(directory, 'scan.rs'),
        '-o',
        join(directory, 'scan'),
      ])
      await run(join(directory, 'scan'), [])
      await run('go', ['test', './...'], { cwd: directory })
      const graph = {
        schemaVersion: 1 as const,
        modules: [
          { name: 'checkruntime', dependencies: [], files: [{ path: 'jsonpath_scan.rs', source }] },
          {
            name: 'pg_catalog',
            dependencies: ['checkruntime'],
            files: [
              {
                path: 'probe.rs',
                source: 'pub fn path_scan_probe(input: &str) -> String { scan_probe(input) }',
              },
            ],
          },
          {
            name: 'checks',
            dependencies: ['checkruntime', 'pg_catalog'],
            files: [
              {
                path: 'checks.rs',
                source:
                  'pub fn evaluate_check_scan(input: &str) -> String { path_scan_probe(input) }',
              },
            ],
          },
        ],
      }
      const split = transpileCheckRustFiles(graph, 'jsonpathscan/split/pg_catalog')
      for (const [folder, content] of [
        ['checkruntime', split.go.runtime],
        ['pg_catalog', split.go.operations],
        ['langruntime', split.go.language],
        ['', split.go.checks],
      ] as const) {
        await mkdir(join(directory, 'split', folder), { recursive: true })
        await writeFile(join(directory, 'split', folder, 'runtime.go'), content)
      }
      await writeFile(
        join(directory, 'split', 'runtime_test.go'),
        `package generated
import "testing"
func TestScanner(t *testing.T) {
${cases.map(({ input, expected }) => `if got := EvaluateCheckScan(${JSON.stringify(input)}); got != ${JSON.stringify(expected)} { t.Fatalf("input %q: got %q", ${JSON.stringify(input)}, got) }`).join('\n')}
}`,
      )
      await run('go', ['test', './split/...'], { cwd: directory })
      for (const artifact of checkTypescriptArtifacts(split.typescript)) {
        const file = join(directory, 'typescript', artifact.path)
        await mkdir(join(file, '..'), { recursive: true })
        await writeFile(file, artifact.content)
      }
      await run(process.execPath, [
        'node_modules/typescript/bin/tsc',
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'commonjs',
        '--outDir',
        join(directory, 'javascript'),
        join(directory, 'typescript', 'checks.ts'),
      ])
      await writeFile(join(directory, 'cases.json'), JSON.stringify(cases))
      await run(process.execPath, [
        '-e',
        `
const {evaluateCheckScan} = require(${JSON.stringify(join(directory, 'javascript', 'checks.js'))});
const cases = require(${JSON.stringify(join(directory, 'cases.json'))});
for (const {input,expected} of cases) { if (evaluateCheckScan(input) !== expected) throw new Error(input); }
`,
      ])
      writeCheckRustSources(join(directory, 'split.rs'), graph)
      await appendFile(
        join(directory, 'split.rs'),
        `
#[test] fn scan_cases() {
${cases.map(({ input, expected }) => `assert_eq!(evaluate_check_scan(${rustStringLiteral(input)}),${rustStringLiteral(expected)});`).join('\n')}
}`,
      )
      await run('rustc', [
        '--edition=2021',
        '--test',
        join(directory, 'split.rs'),
        '-o',
        join(directory, 'split-native'),
      ])
      await run(join(directory, 'split-native'), [])
      await mkdir('artifacts/jsonpath-scan', { recursive: true })
      await writeFile(
        'artifacts/jsonpath-scan/oracle.json',
        JSON.stringify(
          {
            scope:
              'Lexical foundation only. JSONPath grammar, numeric value admission, public values, SQL binding and execution remain pending.',
            fixtures: cases.length,
            targets: ['Rust', 'Go', 'TypeScript'],
            moduleForms: ['combined', 'split'],
            oracle,
          },
          null,
          2,
        ) + '\n',
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 120_000)
})
