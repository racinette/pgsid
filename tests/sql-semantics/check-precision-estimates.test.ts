import { describe, expect, it } from 'vitest'
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
  it('keeps IEEE arithmetic and immutable record replacement in Rust and both targets, and rejects math-library logarithms', async () => {
    const source = await readFile('tools/check-transpiler/precision_estimate_smoke.rs', 'utf8')
    // A logarithm's last bits depend on the math library, so the dialect has none; estimates use
    // the ported library routines instead.
    for (const method of ['ln', 'log10'])
      expect(() =>
        transpileCheckRust(`pub fn estimate(value: f64) -> i32 { value.${method}() as i32 }`),
      ).toThrow()
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
    }
    expect(functions.ieeeEstimatePrimitives()).toBe(true)
    expect(functions.immutableWorkRebinding()).toBe(true)
    expect(functions.borrowedEstimateInput('anchor')).toBe(true)
    expect(functions.borrowedEstimateInput('other')).toBe(false)
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
          '\n#[test] fn estimates() {\nassert!(ieee_estimate_primitives());\nassert!(immutable_work_rebinding());\nassert!(borrowed_estimate_input("anchor"));\nassert!(!borrowed_estimate_input("other"));\n}\n',
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
        env: { ...process.env, GOMAXPROCS: '2' },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
