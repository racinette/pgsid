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

it('checks snapshot storage and text-buffer limits without allocating oversized values in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-snapshot-limits-'))
  try {
    const sizes = (
      await pg.query<{ empty: number; one: number }>(
        "SELECT pg_column_size('1:9:'::pg_snapshot) AS empty,pg_column_size('1:9:3'::pg_snapshot) AS one",
      )
    ).rows[0]!
    const stride = sizes.one - sizes.empty
    expect({ header: sizes.empty, stride }).toEqual({ header: 24, stride: 8 })
    const maximum = Math.floor((1073741823 - sizes.empty) / stride)
    expect(maximum).toBe(134217724)
    const counts: [number, boolean][] = [
      [0, true],
      [maximum, true],
      [maximum + 1, false],
      [2147483647, false],
    ]
    const lengths: [number, number, boolean, boolean][] = [
      [0, 0, false, true],
      [1073741807, 15, false, true],
      [1073741807, 16, false, false],
      [1073741808, 1, false, false],
      [1073741806, 15, true, true],
      [1073741807, 1, true, false],
      [1073741802, 20, false, true],
      [1073741802, 20, true, false],
      [1073741823, 0, false, false],
      [2147483647, 2147483647, true, false],
    ]
    const values = await readFile('crates/check-evaluator/src/values.rs', 'utf8')
    const core = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/snapshot_core.rs',
      'utf8',
    )
    const count = values.slice(
      values.indexOf('pub fn snapshot_count_fits('),
      values.indexOf('pub fn make_snapshot_value('),
    )
    const append = core.slice(0, core.indexOf('pub fn snapshot_to_text('))
    expect(count).toContain('count <=')
    expect(append).toContain('fn snapshot_text_append_fits(')
    const source =
      count +
      append +
      '\npub fn snapshot_text_limit_probe(current:usize,digits:usize,separator:bool)->bool {snapshot_text_append_fits(current,digits,separator)}\n'
    const generated = transpileCheckRust(source),
      context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const api = context.exports as {
      snapshotCountFits(count: number): boolean
      snapshotTextLimitProbe(current: number, digits: number, separator: boolean): boolean
    }
    for (const [count, expected] of counts)
      expect(api.snapshotCountFits(count), String(count)).toBe(expected)
    for (const [current, digits, separator, expected] of lengths)
      expect(
        api.snapshotTextLimitProbe(current, digits, separator),
        current + '+' + digits + '/' + separator,
      ).toBe(expected)
    await mkdir(join(root, 'go'))
    await writeFile(join(root, 'go/go.mod'), 'module snapshotlimits\n\ngo 1.25\n')
    await writeFile(join(root, 'go/runtime.go'), generated.go)
    await writeFile(
      join(root, 'go/runtime_test.go'),
      `package generated\nimport "testing"\nfunc TestSnapshotLimits(t *testing.T){${counts.map(([n, e]) => `if SnapshotCountFits(${n})!=${e}{t.Fatal("count ${n}")}`).join(';')};${lengths.map(([n, k, s, e]) => `if SnapshotTextLimitProbe(${n},${k},${s})!=${e}{t.Fatal("text ${n}+${k}/${s}")}`).join(';')}}\n`,
    )
    await writeFile(
      join(root, 'probe.rs'),
      source +
        `\nfn main(){${counts.map(([n, e]) => `assert_eq!(snapshot_count_fits(${n}),${e});`).join('')}${lengths.map(([n, k, s, e]) => `assert_eq!(snapshot_text_limit_probe(${n},${k},${s}),${e});`).join('')}}\n`,
    )
    const run = promisify(execFile)
    await run('rustc', [
      '--edition=2024',
      '-Awarnings',
      join(root, 'probe.rs'),
      '-o',
      join(root, 'probe'),
    ])
    await run(join(root, 'probe'), [])
    await run('go', ['test', './...'], { cwd: join(root, 'go') })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
