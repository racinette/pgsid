import type { TableInfo } from '../../src/catalog/types.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'
import { goName } from '../../src/codegen/go/names.js'

export type GoCheckCase = {
  name: string
  table: TableInfo
  row: Record<string, unknown>
  nullViaValue?: boolean
  dateColumns?: readonly string[]
  timestamptzColumns?: readonly string[]
  results: {
    constraint: string
    result: { certain: boolean; value?: boolean | null; error?: string }
  }[]
}

export function renderGoCheckTests(
  packageName: string,
  cases: readonly GoCheckCase[],
  options: { dateRuntime?: string } = {},
): string {
  const t = go.ident('t')
  let dateRuntimeUsed = false
  const fatal = (message: string, ...args: GoExpression[]): GoStatement =>
    go.expression(go.call(go.selector(t, 'Fatalf'), [go.string(message), ...args]))
  const expect = (actual: GoExpression, expected: GoExpression, label: string): GoStatement =>
    go.if(go.notEqual(actual, expected), [fatal(label + ': got %v', actual)])
  const body = cases.map((item) => {
    const { name, table, row, nullViaValue, dateColumns, timestamptzColumns, results } = item
    const input = go.ident('input')
    const statements: GoStatement[] = [
      go.assign(
        [input],
        [go.composite(go.ident(goName(table.schema + '_' + table.name) + 'CheckInput'))],
      ),
    ]
    for (const column of table.columns) {
      if (!Object.hasOwn(row, column.name) || row[column.name] === undefined) continue
      const field = go.selector(input, goName(column.name))
      const value = row[column.name]
      statements.push(go.assign([go.selector(field, 'Set')], [go.ident('true')], '='))
      if (value === null && !nullViaValue) {
        statements.push(go.assign([go.selector(field, 'Null')], [go.ident('true')], '='))
        continue
      }
      if (
        options.dateRuntime &&
        (column.typeName === 'timestamp with time zone' ||
          timestamptzColumns?.includes(column.name))
      ) {
        dateRuntimeUsed = true
        const wrapped =
          value === null
            ? go.call(go.selector(go.ident('checkruntime'), 'TimestamptzNull'))
            : go.call(go.selector(go.ident('checkruntime'), 'MakeTimestamptzValue'), [
                go.number(BigInt(String(value))),
              ])
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (
        options.dateRuntime &&
        (column.typeName === 'date' || dateColumns?.includes(column.name)) &&
        (!dateColumns || dateColumns.includes(column.name))
      ) {
        dateRuntimeUsed = true
        let dateValue: GoExpression
        if (value === null) dateValue = go.call(go.selector(go.ident('checkruntime'), 'DateNull'))
        else if (typeof value === 'number')
          dateValue = go.call(go.selector(go.ident('checkruntime'), 'MakeDateValue'), [
            go.number(value),
          ])
        else {
          const match = /^(\d{4,7})-(\d{2})-(\d{2})( BC)?$/u.exec(String(value))
          if (!match) throw new Error(`Unsupported calendar fixture: ${String(value)}`)
          dateValue = go.call(go.selector(go.ident('checkruntime'), 'DateFromYmd'), [
            go.number(Number(match[1]) * (match[4] ? -1 : 1)),
            go.number(Number(match[2])),
            go.number(Number(match[3])),
          ])
        }
        statements.push(go.assign([go.selector(field, 'V')], [dateValue], '='))
        continue
      }
      const encoded =
        typeof value === 'bigint'
          ? value.toString()
          : JSON.stringify(
              column.typeName === 'date' && value !== null
                ? new Date(String(value)).toISOString()
                : value,
            )
      statements.push(
        go.if(
          go.notEqual(go.ident('err'), go.ident('nil')),
          [fatal(column.name + ': %v', go.ident('err'))],
          go.assign(
            [go.ident('err')],
            [
              go.call(go.selector(go.ident('json'), 'Unmarshal'), [
                go.call(go.slice(go.ident('byte')), [go.string(encoded)]),
                go.address(go.selector(field, 'V')),
              ]),
            ],
          ),
        ),
      )
    }
    const actualResults = go.ident('results')
    statements.push(
      go.assign(
        [actualResults],
        [
          go.call(go.ident('Evaluate' + goName(table.schema + '_' + table.name) + 'Checks'), [
            input,
          ]),
        ],
      ),
    )
    statements.push(
      expect(go.call(go.ident('len'), [actualResults]), go.number(results.length), 'CHECK count'),
    )
    for (const [index, { constraint, result }] of results.entries()) {
      const check = go.index(actualResults, go.number(index))
      const actual = go.selector(check, 'Result')
      statements.push(expect(go.selector(check, 'Constraint'), go.string(constraint), 'constraint'))
      statements.push(
        expect(
          go.selector(actual, 'Certain'),
          go.ident(String(result.certain)),
          constraint + ' certainty',
        ),
      )
      if (!result.certain) continue
      const value = go.selector(actual, 'Value')
      statements.push(
        expect(go.selector(value, 'Error'), go.string(result.error ?? ''), constraint + ' error'),
      )
      if (result.error) continue
      statements.push(
        expect(
          go.selector(value, 'Valid'),
          go.ident(String(result.value !== null)),
          constraint + ' NULL',
        ),
      )
      if (result.value !== null)
        statements.push(
          expect(
            go.selector(value, 'Value'),
            go.ident(String(result.value)),
            constraint + ' value',
          ),
        )
    }
    return go.expression(
      go.call(go.selector(t, 'Run'), [
        go.string(name),
        {
          kind: 'function-literal',
          parameters: [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
          results: [],
          body: statements,
        },
      ]),
    )
  })
  return printGoFile({
    package: packageName,
    imports: [
      { path: 'testing' },
      { path: 'encoding/json' },
      ...(dateRuntimeUsed ? [{ path: options.dateRuntime!, alias: 'checkruntime' }] : []),
    ],
    declarations: [
      go.function(
        'TestGeneratedChecks',
        [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
        [],
        body,
      ),
    ],
  })
}
