import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { go, printGoFile, type GoStatement } from '../../src/codegen/go/ast.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)

describe('CHECK numeric precision estimates', () => {
  it('preserves PostgreSQL scale estimates, IEEE arithmetic and immutable record replacement in Rust and both targets', async () => {
    const source = await readFile('tools/check-transpiler/precision_estimate_smoke.rs', 'utf8')
    const cases: { digits: number; weight: number; display: number; expected: number }[] = []
    const pg = await PGlite.create()
    try {
      for (const digits of [1, 9, 1234, 9999, 10000, 99999, 10000000, 99999999])
        for (const weight of [-16, -8, 0, 4, 16, 131060]) {
          const approximate = digits * 10 ** weight
          if (approximate >= 0.9 && approximate <= 1.1) continue
          const expected = (
            await pg.query<{ scale: number }>('SELECT scale(ln($1::numeric)) scale', [
              String(digits) + 'e' + String(weight),
            ])
          ).rows[0]!.scale
          cases.push({ digits, weight, display: Math.max(0, -weight), expected })
        }
    } finally {
      await pg.close()
    }
    expect(cases).toHaveLength(46)
    const generated = transpileCheckRust(source)
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    const functions = context.exports as {
      ieeeEstimatePrimitives(): boolean
      immutableWorkRebinding(): boolean
      borrowedEstimateInput(value: string): boolean
      logarithmScaleHint(digits: number, weight: number, display: number): number
    }
    expect(functions.ieeeEstimatePrimitives()).toBe(true)
    expect(functions.immutableWorkRebinding()).toBe(true)
    expect(functions.borrowedEstimateInput('anchor')).toBe(true)
    expect(functions.borrowedEstimateInput('other')).toBe(false)
    for (const row of cases)
      expect(functions.logarithmScaleHint(row.digits, row.weight, row.display)).toBe(row.expected)
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-precision-estimates-'))
    try {
      const fail = (label: string): GoStatement =>
        go.expression(go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(label)]))
      const statements: GoStatement[] = [
        ...['IeeeEstimatePrimitives', 'ImmutableWorkRebinding'].map((name) =>
          go.if(go.notEqual(go.call(go.ident(name), []), go.ident('true')), [fail(name)]),
        ),
        go.if(
          go.notEqual(
            go.call(go.ident('BorrowedEstimateInput'), [go.string('anchor')]),
            go.ident('true'),
          ),
          [fail('borrowed comparison')],
        ),
        go.if(
          go.notEqual(
            go.call(go.ident('BorrowedEstimateInput'), [go.string('other')]),
            go.ident('false'),
          ),
          [fail('borrowed mismatch')],
        ),
        ...cases.map((row) =>
          go.if(
            go.notEqual(
              go.call(go.ident('LogarithmScaleHint'), [
                go.number(row.digits),
                go.number(row.weight),
                go.number(row.display),
              ]),
              go.number(row.expected),
            ),
            [fail(String(row.digits) + 'e' + String(row.weight))],
          ),
        ),
      ]
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module precisionestimates\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        printGoFile({
          package: 'generated',
          imports: [{ path: 'testing' }],
          declarations: [
            go.function(
              'TestPrecision',
              [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
              [],
              statements,
            ),
          ],
        }),
      )
      await writeFile(
        join(directory, 'precision.rs'),
        source +
          '\n#[test] fn estimates() {\nassert!(ieee_estimate_primitives());\nassert!(immutable_work_rebinding());\nassert!(borrowed_estimate_input("anchor"));\nassert!(!borrowed_estimate_input("other"));\n' +
          cases
            .map(
              (row) =>
                `assert_eq!(logarithm_scale_hint(${row.digits}, ${row.weight}, ${row.display}), ${row.expected});`,
            )
            .join('\n') +
          '\n}\n',
      )
      await run('rustc', [
        '--edition',
        '2021',
        '--test',
        join(directory, 'precision.rs'),
        '-o',
        join(directory, 'precision'),
      ])
      await run(join(directory, 'precision'), [])
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache', GOMAXPROCS: '2' },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
