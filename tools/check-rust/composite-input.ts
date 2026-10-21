import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rangeGoCell, type RangeInputCell } from './range-input.js'

export type CompositeInputCell =
  | RangeInputCell
  | { kind: 'Composite'; value: CompositeInputPayload }
  | {
      kind: 'Array'
      value: {
        elementType: string
        elementKind: number
        dimensions: { lower: number; length: number }[]
        elements: CompositeInputCell[]
        nullBitmap: { kind: 'Value'; value: boolean }
      }
    }

export interface CompositeInputPayload {
  typeName: string
  fields: CompositeInputCell[]
}

const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)

export function compositeGoCell(cell: CompositeInputCell): GoExpression {
  if (cell.kind === 'Composite')
    return go.composite(runtime('ArrayElement'), [
      go.keyValue('Kind', runtime('ArrayElementComposite')),
      go.keyValue('Composite', compositeGoPayload(cell.value)),
    ])
  if (cell.kind === 'Array')
    return go.composite(runtime('ArrayElement'), [
      go.keyValue('Kind', runtime('ArrayElementArray')),
      go.keyValue(
        'Array',
        go.composite(runtime('ArrayPayload'), [
          go.keyValue('ElementType', go.string(cell.value.elementType)),
          go.keyValue('ElementKind', go.number(cell.value.elementKind)),
          go.keyValue(
            'Dimensions',
            go.composite(
              go.slice(runtime('ArrayDimension')),
              cell.value.dimensions.map((d) =>
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
              cell.value.elements.map(compositeGoCell),
            ),
          ),
          go.keyValue(
            'NullBitmap',
            go.composite(runtime('BoolValue'), [
              go.keyValue('Kind', runtime('BoolValue' + cell.value.nullBitmap.kind)),
              ...(cell.value.nullBitmap.kind === 'Value'
                ? [go.keyValue('Value', go.ident(String(cell.value.nullBitmap.value)))]
                : []),
            ]),
          ),
        ]),
      ),
    ])
  return rangeGoCell(cell)
}

export function compositeGoPayload(payload: CompositeInputPayload): GoExpression {
  return go.composite(runtime('CompositePayload'), [
    go.keyValue('TypeName', go.string(payload.typeName)),
    go.keyValue(
      'Fields',
      go.composite(go.slice(runtime('ArrayElement')), payload.fields.map(compositeGoCell)),
    ),
  ])
}

export function compositeGoInput(payload: CompositeInputPayload | null): GoExpression {
  return go.composite(runtime('CompositeValue'), [
    go.keyValue('Kind', runtime(payload === null ? 'CompositeValueNull' : 'CompositeValueValue')),
    ...(payload === null ? [] : [go.keyValue('Value', compositeGoPayload(payload))]),
  ])
}
