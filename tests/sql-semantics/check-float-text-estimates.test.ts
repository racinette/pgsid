import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { go, printGoFile, type GoStatement } from '../../src/codegen/go/ast.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)
const values = [
  '',
  ' ',
  '+',
  '-',
  '.',
  '1',
  '1.',
  '1.5',
  '.5',
  '+.5',
  '-.5',
  '01',
  '-0',
  '-0.0',
  '-0e9999',
  '1e3',
  '1E+3',
  '1e-3',
  '1e',
  '1e+',
  '1e309',
  '-1e309',
  '1e-400',
  '-1e-400',
  '5e-324',
  '-5e-324',
  '2.4703282292062327e-324',
  '2.4703282292062328e-324',
  '1.7976931348623158e308',
  '1.7976931348623159e308',
  'NaN',
  'nan',
  'NAN',
  '+NaN',
  '-nan',
  'Inf',
  'INF',
  'iNf',
  'Infinity',
  '+Infinity',
  '-infinity',
  '0x1p0',
  '1_0',
  '1 0',
  '1\n',
  '\n1',
  '1\r',
  '1\t',
  '1\0',
  '😀',
  '１２',
  '1e9999999999999999999999',
  '-1e-9999999999999999999999',
]

describe('CHECK floating-point text estimates', () => {
  it('preserves Rust parsing and PostgreSQL exponential scale estimates in every target', async () => {
    const source = await readFile('tools/check-transpiler/float_text_estimate_smoke.rs', 'utf8')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-float-text-estimate-'))
    try {
      await writeFile(join(directory, 'float_parse.rs'), source)
      await writeFile(
        join(directory, 'oracle.rs'),
        `include!("float_parse.rs");\nfn main(){\n${values.map((value) => `println!("{:016x}", parsed(${rustStringLiteral(value)}).to_bits());`).join('\n')}\n}\n`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        join(directory, 'oracle.rs'),
        '-o',
        join(directory, 'oracle'),
      ])
      const oracle = (await run(join(directory, 'oracle'), [])).stdout
        .trim()
        .split('\n')
        .map((value) => BigInt('0x' + value))
      expect(oracle).toHaveLength(53)
      const buffer = new ArrayBuffer(8),
        view = new DataView(buffer)
      const expected = oracle.map((bits) => {
        view.setBigUint64(0, bits)
        return view.getFloat64(0)
      })
      const precision: { value: string; display: number; scale: number }[] = []
      const pg = await PGlite.create()
      try {
        for (const value of [
          '0',
          '1',
          '-1',
          '2',
          '-2',
          '10',
          '-10',
          '22.5',
          '100.0000',
          '-100',
          '1000',
          '-1000',
          '-2000',
          '-6000',
          '1e-100',
          '1e-16383',
          '-1e100',
        ]) {
          const row = (
            await pg.query<{ value: string; display: number; scale: number }>(
              'SELECT $1::numeric::text value,scale($1::numeric) display,scale(exp($1::numeric)) scale',
              [value],
            )
          ).rows[0]!
          precision.push(row)
        }
      } finally {
        await pg.close()
      }
      expect(precision).toHaveLength(17)
      const generated = transpileCheckRust(source)
      const context = createContext({ exports: {} })
      runInContext(
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
        context,
      )
      const functions = context.exports as {
        parsed(value: string): number
        expScaleHint(value: string, display: number): number
      }
      for (const [index, value] of values.entries())
        expect(Object.is(functions.parsed(value), expected[index]), JSON.stringify(value)).toBe(
          true,
        )
      for (const row of precision)
        expect(functions.expScaleHint(row.value, row.display), row.value).toBe(row.scale)
      const fail = (label: string): GoStatement =>
        go.expression(go.call(go.selector(go.ident('t'), 'Fatal'), [go.string(label)]))
      const statements: GoStatement[] = values.map((value, index) =>
        go.if(
          Number.isNaN(expected[index])
            ? go.notEqual(
                go.call(go.selector(go.ident('math'), 'IsNaN'), [
                  go.call(go.ident('Parsed'), [go.string(value)]),
                ]),
                go.ident('true'),
              )
            : go.notEqual(
                go.call(go.ident('int64'), [
                  go.call(go.selector(go.ident('math'), 'Float64bits'), [
                    go.call(go.ident('Parsed'), [go.string(value)]),
                  ]),
                ]),
                go.number(BigInt.asIntN(64, oracle[index]!)),
              ),
          [fail(JSON.stringify(value))],
        ),
      )
      for (const row of precision)
        statements.push(
          go.if(
            go.notEqual(
              go.call(go.ident('ExpScaleHint'), [go.string(row.value), go.number(row.display)]),
              go.number(row.scale),
            ),
            [fail(row.value)],
          ),
        )
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(
        join(directory, 'runtime_test.go'),
        printGoFile({
          package: 'generated',
          imports: [{ path: 'math' }, { path: 'testing' }],
          declarations: [
            go.function(
              'TestFloatConversion',
              [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
              [],
              statements,
            ),
          ],
        }),
      )
      await run('go', ['test', join(directory, 'runtime.go'), join(directory, 'runtime_test.go')])
      await writeFile(
        join(directory, 'precision.rs'),
        `include!("float_parse.rs");\nfn main(){\n${precision.map((row) => `assert_eq!(exp_scale_hint(${rustStringLiteral(row.value)},${row.display}),${row.scale});`).join('\n')}\n}\n`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        join(directory, 'precision.rs'),
        '-o',
        join(directory, 'precision'),
      ])
      await run(join(directory, 'precision'), [])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 240000)
})
