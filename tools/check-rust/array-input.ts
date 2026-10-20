import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import {
  multirangeGoInput,
  multirangeRustInput,
  type MultirangeInputPayload,
} from './multirange-input.js'
import {
  rangeGoInput,
  rangeRustInput,
  type RangeInputCell,
  type RangeInputPayload,
} from './range-input.js'

export type OwnedArrayInputCell =
  | RangeInputCell
  | { kind: 'Range'; value: RangeInputPayload }
  | { kind: 'Multirange'; value: MultirangeInputPayload }
  | { kind: 'Array'; value: OwnedArrayInputPayload }

export type OwnedArrayInputPayload = {
  elementType: string
  elementKind: number
  dimensions: { lower: number; length: number }[]
  elements: OwnedArrayInputCell[]
  nullBitmap: { kind: 'Unknown' } | { kind: 'Value'; value: boolean }
}

export function arrayRustInput(payload: OwnedArrayInputPayload): string {
  const elements = payload.elements.map((cell) => {
    if (cell.kind === 'Multirange')
      return `array_element_from_multirange(${multirangeRustInput(cell.value)})`
    if (cell.kind === 'Range') return `array_element_from_range(${rangeRustInput(cell.value)})`
    if (cell.kind === 'Array') return `array_element_from_array(${arrayRustInput(cell.value)})`
    if (cell.kind === 'Null' || cell.kind === 'Unknown') return `ArrayElement::${cell.kind}`
    if (cell.kind === 'Error') return `ArrayElement::Error(make_sql_error(${cell.value.state}))`
    if (!('value' in cell)) throw new Error('Missing array cell')
    const value =
      typeof cell.value === 'string'
        ? `${rustStringLiteral(cell.value)}.to_owned()`
        : String(cell.value) + (typeof cell.value === 'bigint' ? 'i64' : '')
    return `ArrayElement::${cell.kind}(${value})`
  })
  const bitmap =
    payload.nullBitmap.kind === 'Unknown'
      ? 'BoolValue::Unknown'
      : `BoolValue::Value(${payload.nullBitmap.value})`
  return `make_array_value(ArrayPayload {element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},dimensions:vec![${payload.dimensions.map((d) => `ArrayDimension {lower:${d.lower},length:${d.length}}`).join(',')}],elements:vec![${elements.join(',')}],null_bitmap:${bitmap}})`
}

export function arrayGoInput(payload: OwnedArrayInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.call(runtime('MakeArrayValue'), [
    go.composite(runtime('ArrayPayload'), [
      go.keyValue('ElementType', go.string(payload.elementType)),
      go.keyValue('ElementKind', go.number(payload.elementKind)),
      go.keyValue(
        'Dimensions',
        go.composite(
          go.slice(runtime('ArrayDimension')),
          payload.dimensions.map((d) =>
            go.composite(runtime('ArrayDimension'), [
              go.keyValue('Lower', go.number(d.lower)),
              go.keyValue('Length', go.number(d.length)),
            ]),
          ),
        ),
      ),
      go.keyValue(
        'Elements',
        go.composite(
          go.slice(runtime('ArrayElement')),
          payload.elements.map((cell) => {
            if (cell.kind === 'Multirange')
              return go.call(runtime('ArrayElementFromMultirange'), [multirangeGoInput(cell.value)])
            if (cell.kind === 'Range')
              return go.call(runtime('ArrayElementFromRange'), [rangeGoInput(cell.value)])
            if (cell.kind === 'Array')
              return go.call(runtime('ArrayElementFromArray'), [arrayGoInput(cell.value)])
            return go.composite(runtime('ArrayElement'), [
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
            ])
          }),
        ),
      ),
      go.keyValue(
        'NullBitmap',
        go.composite(runtime('BoolValue'), [
          go.keyValue('Kind', runtime('BoolValue' + payload.nullBitmap.kind)),
          ...(payload.nullBitmap.kind === 'Value'
            ? [go.keyValue('Value', go.ident(String(payload.nullBitmap.value)))]
            : []),
        ]),
      ),
    ]),
  ])
}
