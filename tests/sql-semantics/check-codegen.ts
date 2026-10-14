import type { TableInfo } from '../../src/catalog/types.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'
import { goName } from '../../src/codegen/go/names.js'

export type GoCheckCase = {
  name: string
  table: TableInfo
  row: Record<string, unknown>
  nullViaValue?: boolean
  floatColumns?: readonly string[]
  pointColumns?: readonly string[]
  lineColumns?: readonly string[]
  lsegColumns?: readonly string[]
  boxColumns?: readonly string[]
  numericColumns?: readonly string[]
  timeColumns?: readonly string[]
  timetzColumns?: readonly string[]
  intervalColumns?: readonly string[]
  dateColumns?: readonly string[]
  timestampColumns?: readonly string[]
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
  let jsonUsed = false
  let floatUsed = false
  const fatal = (message: string, ...args: GoExpression[]): GoStatement =>
    go.expression(go.call(go.selector(t, 'Fatalf'), [go.string(message), ...args]))
  const expect = (actual: GoExpression, expected: GoExpression, label: string): GoStatement =>
    go.if(go.notEqual(actual, expected), [fatal(label + ': got %v', actual)])
  const body = cases.map((item) => {
    const {
      name,
      table,
      row,
      nullViaValue,
      numericColumns,
      floatColumns,
      pointColumns,
      lineColumns,
      lsegColumns,
      boxColumns,
      timeColumns,
      timetzColumns,
      intervalColumns,
      dateColumns,
      timestampColumns,
      timestamptzColumns,
      results,
    } = item
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
      if (options.dateRuntime && boxColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        const box = value as { highX: bigint; highY: bigint; lowX: bigint; lowY: bigint } | null
        const wrapped = go.call(
          go.selector(go.ident('checkruntime'), box === null ? 'BoxNull' : 'MakeBoxBits'),
          box === null
            ? []
            : [
                go.number(box.highX),
                go.number(box.highY),
                go.number(box.lowX),
                go.number(box.lowY),
              ],
        )
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (options.dateRuntime && lsegColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        const lseg = value as { x1: bigint; y1: bigint; x2: bigint; y2: bigint } | null
        const wrapped = go.call(
          go.selector(go.ident('checkruntime'), lseg === null ? 'LsegNull' : 'MakeLsegBits'),
          lseg === null
            ? []
            : [go.number(lseg.x1), go.number(lseg.y1), go.number(lseg.x2), go.number(lseg.y2)],
        )
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (options.dateRuntime && lineColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        const line = value as { a: bigint; b: bigint; c: bigint } | null
        const wrapped = go.call(
          go.selector(go.ident('checkruntime'), line === null ? 'LineNull' : 'MakeLineBits'),
          line === null ? [] : [go.number(line.a), go.number(line.b), go.number(line.c)],
        )
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (options.dateRuntime && pointColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        const point = value as { x: bigint; y: bigint } | null
        const wrapped = go.call(
          go.selector(go.ident('checkruntime'), point === null ? 'PointNull' : 'MakePointBits'),
          point === null ? [] : [go.number(point.x), go.number(point.y)],
        )
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (options.dateRuntime && floatColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        floatUsed = true
        const fixture = value as { bits: number | bigint; single: boolean }
        const number = go.call(
          go.selector(go.ident('checkruntime'), fixture.single ? 'Float4Number' : 'Float8Number'),
          [go.number(fixture.bits)],
        )
        statements.push(
          go.expression(
            go.call(go.ident('setFloatFixture'), [number, go.address(go.selector(field, 'V'))]),
          ),
        )
        continue
      }
      if (
        options.dateRuntime &&
        (timeColumns?.includes(column.name) ||
          timetzColumns?.includes(column.name) ||
          intervalColumns?.includes(column.name))
      ) {
        dateRuntimeUsed = true
        const prefix = timeColumns?.includes(column.name)
          ? 'Time'
          : timetzColumns?.includes(column.name)
            ? 'Timetz'
            : 'Interval'
        const parts = value as
          | bigint
          | { time: bigint; zone: number }
          | { time: bigint; months: number; days: number }
          | null
        const args =
          parts === null
            ? []
            : typeof parts === 'bigint'
              ? [go.number(parts)]
              : 'zone' in parts
                ? [go.number(parts.time), go.number(parts.zone)]
                : [go.number(parts.months), go.number(parts.days), go.number(parts.time)]
        const wrapped = go.call(
          go.selector(
            go.ident('checkruntime'),
            parts === null ? prefix + 'Null' : 'Make' + prefix + 'Value',
          ),
          args,
        )
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (options.dateRuntime && numericColumns?.includes(column.name)) {
        dateRuntimeUsed = true
        const wrapped =
          value === null
            ? go.call(go.selector(go.ident('checkruntime'), 'NumericNull'))
            : go.call(go.selector(go.ident('checkruntime'), 'MakeNumericValue'), [
                go.string(String(value)),
              ])
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
        continue
      }
      if (
        options.dateRuntime &&
        (column.typeName === 'timestamp without time zone' ||
          timestampColumns?.includes(column.name))
      ) {
        dateRuntimeUsed = true
        const wrapped =
          value === null
            ? go.call(go.selector(go.ident('checkruntime'), 'TimestampNull'))
            : go.call(go.selector(go.ident('checkruntime'), 'MakeTimestampValue'), [
                go.number(BigInt(String(value))),
              ])
        statements.push(go.assign([go.selector(field, 'V')], [wrapped], '='))
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
      jsonUsed = true
      const encoded =
        value instanceof Uint8Array
          ? JSON.stringify(Buffer.from(value).toString('base64'))
          : typeof value === 'bigint'
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
      if (!result.certain || result.error)
        statements.push(
          expect(
            go.notEqual(go.selector(check, 'Message'), go.string('')),
            go.ident('true'),
            constraint + ' diagnostic presence',
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
  const source = printGoFile({
    package: packageName,
    imports: [
      { path: 'testing' },
      ...(jsonUsed ? [{ path: 'encoding/json' }] : []),
      ...(floatUsed ? [{ path: 'reflect' }] : []),
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
  return (
    source +
    (floatUsed
      ? `
func setFloatFixture[T any](number float64, target *T) {
  value := reflect.ValueOf(target).Elem()
  if value.Kind() == reflect.Pointer {
    value.Set(reflect.New(value.Type().Elem()))
    value = value.Elem()
  }
  value.SetFloat(number)
}
`
      : '')
  )
}
