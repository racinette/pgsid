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

import {
  expressions,
  invalid,
  deferred,
  validationCases,
  shapes,
} from './jsonpath-grammar-cases.js'

const projection = String.raw`
const PARSE_PROBE_NAMES: &[&str] = &["none","root","current","last","string","number","variable","null","true","false","key","any_key","any_array","index","subscript","descendant","filter","exists","not","is_unknown","plus","minus","add","sub","mul","div","mod","eq","ne","lt","le","gt","ge","and","or","starts","regex"];
fn parse_probe_error(error: u32) -> String {
 if error == 0 { return "ok".to_owned(); };
 if error == JSONPATH_SCAN_SYNTAX { return "42601".to_owned(); };
 if error == JSONPATH_SCAN_SURROGATE { return "22P02".to_owned(); };
 if error == JSONPATH_SCAN_ZERO { return "22P05".to_owned(); };
 if error == JSONPATH_PARSE_RANGE { return "22003".to_owned(); };
 if error == JSONPATH_PARSE_UNSUPPORTED { return "0A000".to_owned(); };
 "unexpected".to_owned()
}
pub fn parse_probe(input: &str) -> String { let tree = jsonpath_parse(input); parse_probe_error(tree.error) }
pub fn parse_probe_requirement(input: &str) -> String {
 let tree = jsonpath_parse(input);
 if tree.requires_regex_validation { if tree.requires_numeric_validation { return "both".to_owned(); }; return "regex".to_owned(); };
 if tree.requires_numeric_validation { return "numeric".to_owned(); };
 "none".to_owned()
}
pub fn parse_probe_validation(input: &str) -> String {
 let tree = jsonpath_parse(input);
 let mut output = String::new();
 let mut index: usize = 0;
 while index < tree.validation.len() {
  let node = tree.nodes[tree.validation[index]];
  if node.kind == JSONPATH_NODE_NUMBER { output.push_str("number{"); } else { output.push_str("regex{"); };
  let mut position = node.text_start;
  while position < node.text_end {
   if node.kind == JSONPATH_NODE_NUMBER { output.push(tree.source[position]); } else { output.push(tree.text[position]); };
   position += 1;
  }
  output.push_str("};"); index += 1;
 }
 output
}
fn parse_probe_integer(input: i32) -> String {
 let mut value = input;
 let mut output = String::new();
 if value < 0 { output.push('-'); value = 0 - value; };
 let mut digits: Vec<char> = Vec::new();
 if value == 0 { digits.push('0'); };
 while value > 0 { digits.push(char::from_u32((48 + value % 10) as u32).unwrap_or(' ')); value = value / 10; }
 let mut position = digits.len();
 while position > 0 { position = position - 1; output.push(digits[position]); }
 output
}
fn parse_probe_node(tree: &JsonpathParseTree, index: usize) -> String {
 let node = tree.nodes[index];
 let mut output = String::new();
 if node.kind >= JSONPATH_NODE_METHOD {
  output.push_str("method:");
  let position = usize::try_from(node.kind - JSONPATH_NODE_METHOD).unwrap_or(0);
  output.push_str(JSONPATH_SCAN_KEYWORDS[position]);
 } else {
  let position = usize::try_from(node.kind).unwrap_or(0);
  output.push_str(PARSE_PROBE_NAMES[position]);
 };
 if node.kind == JSONPATH_NODE_NUMBER || node.kind == JSONPATH_NODE_KEY || node.kind == JSONPATH_NODE_STRING || node.kind == JSONPATH_NODE_VARIABLE || node.kind == JSONPATH_NODE_REGEX {
  output.push('{');
  let mut position = node.text_start;
  while position < node.text_end {
   let mut character = ' ';
   if node.kind == JSONPATH_NODE_NUMBER { character = tree.source[position]; } else { character = tree.text[position]; };
   output.push(character); position += 1;
  }
  if node.kind == JSONPATH_NODE_REGEX { output.push(';'); let flags = parse_probe_integer(node.flags); output.push_str(flags.as_str()); };
  output.push('}');
 };
 if node.kind == JSONPATH_NODE_DESCENDANT {
  output.push('{'); let first = parse_probe_integer(node.first); output.push_str(first.as_str());
  output.push(','); let last = parse_probe_integer(node.last); output.push_str(last.as_str()); output.push('}');
 };
 if node.left > 0 {
  output.push('('); let left = parse_probe_node(tree,node.left); output.push_str(left.as_str());
  if node.right > 0 { output.push(','); let right = parse_probe_node(tree,node.right); output.push_str(right.as_str()); };
  output.push(')');
 };
 if node.next > 0 { output.push('>'); let next = parse_probe_node(tree,node.next); output.push_str(next.as_str()); };
 output
}
pub fn parse_probe_shape(input: &str) -> String {
 let tree = jsonpath_parse(input);
 if tree.error != 0 { return parse_probe_error(tree.error); };
 let mut output = String::new();
 if tree.lax { output.push_str("lax:"); } else { output.push_str("strict:"); };
 let shape = parse_probe_node(&tree,tree.root); output.push_str(shape.as_str()); output
}
`

describe('CHECK JSONPath grammar and query graph foundation', () => {
  it('matches PostgreSQL grammar and scope while retaining deferred literal validation', async () => {
    const scanner = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/jsonpath_scan.rs',
      'utf8',
    )
    const tables = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/jsonpath_tables.generated.rs',
      'utf8',
    )
    const parser = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/jsonpath_parse.rs',
      'utf8',
    )
    await promisify(execFile)(process.execPath, [
      'tools/check-jsonpath-grammar/generate.mjs',
      '--check',
    ])
    const source = scanner + tables + parser + projection
    const packaged = assembleCheckRust({ source: '', callables: [] })
    for (const [name, text] of [
      ['jsonpath_scan.rs', scanner],
      ['jsonpath_tables.generated.rs', tables],
      ['jsonpath_parse.rs', parser],
    ]) {
      expect(
        packaged.modules
          .flatMap((module) => module.files)
          .find((file) => file.path.endsWith('/' + name))?.source,
      ).toBe(text)
    }
    expect(valueRepresentation('pg_catalog.jsonpath').represented).toBe(false)
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context.exports as {
      parseProbe(input: string): string
      parseProbeShape(input: string): string
      parseProbeRequirement(input: string): string
      parseProbeValidation(input: string): string
    }
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-parse-'))
    const run = promisify(execFile)
    const cases: { input: string; expected: string }[] = []
    const oracle: unknown[] = []
    try {
      for (const input of [...new Set([...expressions, ...invalid])]) {
        const result = await pg
          .query<{ value: string }>('SELECT $1::jsonpath::text value', [input])
          .then(
            (result) => ({ value: result.rows[0]!.value, error: 'ok' }),
            (error: { code: string; message: string }) => ({
              value: null,
              error: error.code,
              message: error.message,
            }),
          )
        expect(functions.parseProbe(input), input + ' ' + JSON.stringify(result)).toBe(result.error)
        cases.push({ input, expected: result.error })
        oracle.push({ input, ...result })
      }
      for (const { input, error, requirement } of deferred) {
        await expect(pg.query('SELECT $1::jsonpath', [input])).rejects.toMatchObject({
          code: error,
        })
        expect(functions.parseProbe(input), input).toBe('ok')
        expect(functions.parseProbeRequirement(input), input).toBe(requirement)
        cases.push({ input, expected: 'ok' })
        oracle.push({ input, error, deferred: requirement })
      }
      for (const { input, shape, canonical } of shapes) {
        expect(functions.parseProbeShape(input), input).toBe(shape)
        const result = await pg.query<{ value: string }>('SELECT $1::jsonpath::text value', [input])
        expect(result.rows[0]!.value, input).toBe(canonical)
        oracle.push({ input, shape, canonical })
      }
      const long = '('.repeat(1000) + '$' + ')'.repeat(1000)
      expect(functions.parseProbe(long)).toBe('ok')
      cases.push({ input: long, expected: 'ok' })
      const chain = '$' + '.a'.repeat(3000)
      expect(functions.parseProbe(chain)).toBe('ok')
      cases.push({ input: chain, expected: 'ok' })
      const extraCases = [
        ...shapes.map(({ input, shape }) => ({ input, expected: shape, fn: 'shape' })),
        ...deferred.map(({ input, requirement }) => ({
          input,
          expected: requirement,
          fn: 'requirement',
        })),
        { input: '$', expected: 'none', fn: 'requirement' },
        { input: '1', expected: 'numeric', fn: 'requirement' },
        { input: '$ ? (@ == 1 && @ like_regex "a")', expected: 'both', fn: 'requirement' },
        ...validationCases.map(({ input, validation }) => ({
          input,
          expected: validation,
          fn: 'validation',
        })),
      ]
      for (const { input, error, grammar, validation } of validationCases) {
        await expect(pg.query('SELECT $1::jsonpath', [input])).rejects.toMatchObject({
          code: error,
        })
        expect(functions.parseProbe(input), input).toBe(grammar)
        cases.push({ input, expected: grammar })
        oracle.push({ input, postgresError: error, grammarStatus: grammar, validation })
      }
      const rustExtra = extraCases
        .map(
          ({ input, expected, fn }) =>
            `assert_eq!(parse_probe_${fn}(${rustStringLiteral(input)}),${rustStringLiteral(expected)});`,
        )
        .join('\n')
      for (const { input, expected, fn } of extraCases) {
        expect(
          (fn === 'shape'
            ? functions.parseProbeShape
            : fn === 'validation'
              ? functions.parseProbeValidation
              : functions.parseProbeRequirement)(input),
          input,
        ).toBe(expected)
      }
      const goExtra = (prefix: string) =>
        extraCases
          .map(
            ({ input, expected, fn }) =>
              `if got := ${prefix}ParseProbe${fn === 'shape' ? 'Shape' : fn === 'validation' ? 'Validation' : 'Requirement'}(${JSON.stringify(input)}); got != ${JSON.stringify(expected)} {t.Fatalf("extra input %q: got %q",${JSON.stringify(input)},got)}`,
          )
          .join('\n')
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module jsonpathparse\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        `package generated
import "testing"
func TestParser(t *testing.T) {
${cases.map(({ input, expected }) => `if got := ParseProbe(${JSON.stringify(input)}); got != ${JSON.stringify(expected)} { t.Fatalf("input %q: got %q", ${JSON.stringify(input)}, got) }`).join('\n')}
${goExtra('')}
}`,
      )
      await writeFile(
        join(directory, 'scan.rs'),
        source +
          `
#[test] fn scan_cases() {
${cases.map(({ input, expected }) => `assert_eq!(parse_probe(${rustStringLiteral(input)}),${rustStringLiteral(expected)});`).join('\n')}
${rustExtra}
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
          {
            name: 'checkruntime',
            dependencies: [],
            files: [
              { path: 'jsonpath_scan.rs', source: scanner },
              { path: 'jsonpath_tables.generated.rs', source: tables },
              { path: 'jsonpath_parse.rs', source: parser },
              { path: 'probe.rs', source: projection },
            ],
          },
          {
            name: 'pg_catalog',
            dependencies: ['checkruntime'],
            files: [
              {
                path: 'probe.rs',
                source: 'pub fn path_parse_probe(input: &str) -> String { parse_probe(input) }',
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
                  'pub fn evaluate_check_parse(input: &str) -> String { path_parse_probe(input) }',
              },
            ],
          },
        ],
      }
      const split = transpileCheckRustFiles(graph, 'jsonpathparse/split/pg_catalog')
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
import ("testing"; runtime "jsonpathparse/split/checkruntime")
func TestParser(t *testing.T) {
${cases.map(({ input, expected }) => `if got := EvaluateCheckParse(${JSON.stringify(input)}); got != ${JSON.stringify(expected)} { t.Fatalf("input %q: got %q", ${JSON.stringify(input)}, got) }`).join('\n')}
${goExtra('runtime.')}
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
const {evaluateCheckParse} = require(${JSON.stringify(join(directory, 'javascript', 'checks.js'))});
const cases = require(${JSON.stringify(join(directory, 'cases.json'))});
for (const {input,expected} of cases) { if (evaluateCheckParse(input) !== expected) throw new Error(input); }
const runtime = require(${JSON.stringify(join(directory, 'javascript', 'checkruntime', 'runtime.js'))});
for (const {input,expected,fn} of ${JSON.stringify(extraCases)}) { if (runtime[fn === 'shape' ? 'parseProbeShape' : fn === 'validation' ? 'parseProbeValidation' : 'parseProbeRequirement'](input) !== expected) throw new Error(input); }
`,
      ])
      writeCheckRustSources(join(directory, 'split.rs'), graph)
      await appendFile(
        join(directory, 'split.rs'),
        `
#[test] fn scan_cases() {
${cases.map(({ input, expected }) => `assert_eq!(evaluate_check_parse(${rustStringLiteral(input)}),${rustStringLiteral(expected)});`).join('\n')}
${rustExtra}
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

      await mkdir('artifacts/jsonpath-parser', { recursive: true })
      await writeFile(
        'artifacts/jsonpath-parser/oracle.json',
        JSON.stringify(
          {
            scope:
              'Grammar and owned query graph only. Numeric and regex validation remain explicit prerequisites; public values and SQL evaluation are not admitted.',
            fixtures: cases.length,
            additionalTargetFixtures: extraCases.length,
            shapeCases: shapes.length,
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
