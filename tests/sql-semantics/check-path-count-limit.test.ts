import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

it('checks path concatenation count limits before allocation and avoids unsigned subtraction on oversized inputs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-path-limit-'))
  try {
    const sizes = (
      await pg.query<{ one: number; two: number }>(
        "SELECT pg_column_size('[(0,0)]'::path) one,pg_column_size('[(0,0),(1,1)]'::path) two",
      )
    ).rows[0]!
    const stride = sizes.two - sizes.one,
      header = sizes.one - stride
    expect({ stride, header }).toEqual({ stride: 16, header: 16 })
    const maximum = Math.floor((2147483647 - header) / stride)
    expect(maximum).toBe(134217726)
    const rows: [number, number, boolean][] = [
      [0, 0, true],
      [maximum, 0, true],
      [0, maximum, true],
      [maximum - 1, 1, true],
      [1, maximum - 1, true],
      [maximum, 1, false],
      [1, maximum, false],
      [maximum + 1, 0, false],
      [0, maximum + 1, false],
      [2147483647, 2147483647, false],
    ]
    const maintained = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/path_operations.rs',
      'utf8',
    )
    const prefix = maintained.slice(0, maintained.indexOf('fn path_point_transform('))
    expect(prefix).toContain('fn path_concat_fits(')
    const source =
      prefix +
      '\npub fn concat_limit_probe(left:usize,right:usize)->bool {path_concat_fits(left,right)}\n'
    const generated = transpileCheckRust(source),
      context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const api = context.exports as { concatLimitProbe(left: number, right: number): boolean }
    for (const [left, right, expected] of rows)
      expect(api.concatLimitProbe(left, right), `${left}+${right}`).toBe(expected)
    await mkdir(join(root, 'go'))
    await writeFile(join(root, 'go/go.mod'), 'module concatlimit\n\ngo 1.25\n')
    await writeFile(join(root, 'go/runtime.go'), generated.go)
    await writeFile(
      join(root, 'go/runtime_test.go'),
      `package generated\nimport "testing"\nfunc TestConcatLimit(t *testing.T){${rows.map(([left, right, expected]) => `if ConcatLimitProbe(${left},${right})!=${expected}{t.Fatal("${left}+${right}")}`).join(';')}}\n`,
    )
    await writeFile(
      join(root, 'probe.rs'),
      source +
        `\nfn main(){${rows.map(([left, right, expected]) => `assert_eq!(concat_limit_probe(${left},${right}),${expected});`).join('')}}\n`,
    )
    const run = promisify(execFile)
    await run('rustc', ['--edition=2024', join(root, 'probe.rs'), '-o', join(root, 'probe')])
    await run(join(root, 'probe'), [])
    await run('go', ['test', './...'], { cwd: join(root, 'go') })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
