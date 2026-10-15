import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

it('validates raw JSON grammar and root types without decoding strings or narrowing numbers in Rust, Go and TypeScript', async () => {
  const source = await readFile('crates/check-evaluator/src/json_syntax.rs', 'utf8')
  const generated = transpileCheckRust(source)
  const context = createContext({ exports: {} })
  runInContext(
    ts.transpileModule(generated.typescript, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  const scan = (
    context.exports as {
      jsonSyntaxScan(value: string): { valid: boolean; kind: number; maxDepth: number }
    }
  ).jsonSyntaxScan
  const inputs = new Set([
    'null',
    'true',
    'false',
    '0',
    '-0',
    '-0.0',
    '1.00',
    '1e2',
    '1.230e-5',
    '9007199254740993.00',
    '1e131072',
    '1e-16384',
    '1e2147483647',
    '1e-2147483648',
    '0e2147483647',
    '1e' + '0'.repeat(5000) + '2',
    '[]',
    '{}',
    '[null,false,true,1,"é😀"]',
    '{"a":1,"a":2}',
    '{"a":{"x":1},"a":{"y":2}}',
    '{"":"empty key","雪":"😊"}',
    '"\\u0000"',
    '"\\ud800"',
    '"\\udc00"',
    '"\\ud800x"',
    '"\\ud83d\\ude00"',
    '"\\u00e9"',
    '"é😀"',
    '"\\\"\\\\\\/\\b\\f\\n\\r\\t"',
    '',
    ' ',
    '-',
    '01',
    '-01',
    '+1',
    '1.',
    '.1',
    '1e',
    '1e+',
    '1E-',
    'NaN',
    'Infinity',
    '[1,]',
    '[,1]',
    '{"a":}',
    '{"a" 1}',
    '{"a":1,}',
    '{a:1}',
    '"unterminated',
    '"bad\\x"',
    '"\\u00xz"',
    '"\\u123"',
    '\ufeff{}',
    '\u00a0{}',
    '\f{}',
    '{}\v',
    '{}[]',
    'false true',
    'True',
    'NULL',
    ' \t\r\n {"a": [1, 2]} \r\n ',
  ])
  for (let code = 1; code < 32; code++) inputs.add('"' + String.fromCodePoint(code) + '"')
  for (let code = 0; code < 32; code++)
    inputs.add('"\\u' + code.toString(16).padStart(4, '0') + '"')
  const nested = '{"a":[true,false,null,1,"x"]}'
  for (let index = 0; index < nested.length; index++) {
    inputs.add(nested.slice(0, index) + nested.slice(index + 1))
    inputs.add(nested.slice(0, index) + nested[index] + nested.slice(index))
  }
  const kinds: Record<string, number> = { null: 0, number: 3, string: 4, array: 5, object: 6 }
  const fixtures: { input: string; valid: boolean; kind: number }[] = []
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-syntax-'))
  const run = promisify(execFile)
  try {
    for (const input of inputs) {
      let valid = false
      let kind = -1
      try {
        const row = (
          await pg.query<{ kind: string; value: string }>(
            'SELECT json_typeof($1::json) AS kind,$1::json::text AS value',
            [input],
          )
        ).rows[0]!
        expect(row.value, input).toBe(input)
        valid = true
        kind = row.kind === 'boolean' ? (input.trim() === 'true' ? 2 : 1) : kinds[row.kind]!
        expect(kind, input).toBeDefined()
      } catch (error) {
        expect(error, input).toMatchObject({ code: '22P02' })
      }
      fixtures.push({ input, valid, kind })
      const actual = scan(input)
      expect({ valid: actual.valid, kind: actual.kind }, input).toEqual({ valid, kind })
    }
    const depths = [0, 1, 64, 1024, 16384]
    for (const depth of depths) {
      const result = scan('['.repeat(depth) + '0' + ']'.repeat(depth))
      expect(result.valid).toBe(true)
      expect(result.kind).toBe(depth === 0 ? 3 : 5)
      expect(result.maxDepth).toBe(depth)
    }
    await writeFile(join(directory, 'runtime.go'), generated.go)
    await writeFile(join(directory, 'go.mod'), 'module jsonsyntax\n\ngo 1.25\n')
    await writeFile(
      join(directory, 'runtime_test.go'),
      `package generated
import("testing";"strings")
func TestJSONSyntax(t *testing.T){
 for _,c:=range []struct{input string;valid bool;kind int}{${fixtures.map((f) => `{${JSON.stringify(f.input).replaceAll('\ufeff', '\\ufeff')},${f.valid},${f.kind}}`).join(',\n')}}{
  got:=JsonSyntaxScan(c.input);if got.Valid!=c.valid||got.Kind!=c.kind{t.Fatalf("syntax %q: %+v",c.input,got)}
 }
 for _,depth:=range []int{${depths.join(',')}}{got:=JsonSyntaxScan(strings.Repeat("[",depth)+"0"+strings.Repeat("]",depth));if !got.Valid||int(got.MaxDepth)!=depth{t.Fatal("depth",depth,got)}}
}`,
    )
    await writeFile(
      join(directory, 'syntax.rs'),
      source +
        `\n#[test] fn syntax(){for (input,valid,kind) in [${fixtures.map((f) => `(${rustStringLiteral(f.input)},${f.valid},${f.kind})`).join(',')}]{let got=json_syntax_scan(input);assert_eq!((got.valid,got.kind),(valid,kind),"{}",input);}for depth in [${depths.join(',')}]{let text="[".repeat(depth)+"0"+&"]".repeat(depth);let got=json_syntax_scan(text.as_str());assert!(got.valid);assert_eq!(got.max_depth,depth);}}\n`,
    )
    await run('rustc', [
      '--edition=2024',
      '--test',
      join(directory, 'syntax.rs'),
      '-o',
      join(directory, 'syntax'),
    ])
    await run(join(directory, 'syntax'), [])
    await run('go', ['test', '-p', '1', './...'], { cwd: directory }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    await writeFile(join(directory, 'runtime.ts'), generated.typescript)
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--noEmit',
      join(directory, 'runtime.ts'),
    ])
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
