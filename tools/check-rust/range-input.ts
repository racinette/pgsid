import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

export type RangeInputCell =
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; value: { state: number } }
  | { kind: 'Int4' | 'Date'; value: number }
  | { kind: 'Int8' | 'Timestamp' | 'Timestamptz'; value: bigint }
  | { kind: 'Numeric'; value: string }

export type RangeInputPayload = {
  typeName: string
  elementType: string
  elementKind: number
  empty: boolean
  lowerInclusive: boolean
  upperInclusive: boolean
  bounds: RangeInputCell[]
}

export function rangeRustInput(payload: RangeInputPayload): string {
  const cells = payload.bounds.map((cell) => {
    if (cell.kind === 'Unknown' || cell.kind === 'Null') return `ArrayElement::${cell.kind}`
    if (cell.kind === 'Error') return `ArrayElement::Error(make_sql_error(${cell.value.state}))`
    if (!('value' in cell)) throw new Error('Missing range bound')
    const value =
      typeof cell.value === 'string'
        ? `${rustStringLiteral(cell.value)}.to_owned()`
        : String(cell.value) + (typeof cell.value === 'bigint' ? 'i64' : '')
    return `ArrayElement::${cell.kind}(${value})`
  })
  return `make_coerced_range_value(RangePayload {type_name:${rustStringLiteral(payload.typeName)}.to_owned(),element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},empty:${payload.empty},lower_inclusive:${payload.lowerInclusive},upper_inclusive:${payload.upperInclusive},bounds:vec![${cells.join(',')}]})`
}

export function rangeGoInput(payload: RangeInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.call(runtime('MakeCoercedRangeValue'), [
    go.composite(runtime('RangePayload'), [
      go.keyValue('TypeName', go.string(payload.typeName)),
      go.keyValue('ElementType', go.string(payload.elementType)),
      go.keyValue('ElementKind', go.number(payload.elementKind)),
      go.keyValue('Empty', go.ident(String(payload.empty))),
      go.keyValue('LowerInclusive', go.ident(String(payload.lowerInclusive))),
      go.keyValue('UpperInclusive', go.ident(String(payload.upperInclusive))),
      go.keyValue(
        'Bounds',
        go.composite(
          go.slice(runtime('ArrayElement')),
          payload.bounds.map((cell) =>
            go.composite(runtime('ArrayElement'), [
              go.keyValue('Kind', runtime('ArrayElement' + cell.kind)),
              ...('value' in cell
                ? [
                    go.keyValue(
                      cell.kind,
                      cell.kind === 'Error'
                        ? go.composite(runtime('SqlError'), [
                            go.keyValue('State', go.number(cell.value.state)),
                          ])
                        : typeof cell.value === 'string'
                          ? go.string(cell.value)
                          : go.number(cell.value),
                    ),
                  ]
                : []),
            ]),
          ),
        ),
      ),
    ]),
  ])
}
