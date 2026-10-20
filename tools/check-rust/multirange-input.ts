import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { rangeGoInput, rangeRustInput, type RangeInputPayload } from './range-input.js'

export type MultirangeInputRange =
  | { kind: 'Value'; value: RangeInputPayload }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; value: { state: number } }

export type MultirangeInputPayload = {
  typeName: string
  rangeType: string
  elementType: string
  elementKind: number
  ranges: MultirangeInputRange[]
}

export function multirangeRustInput(payload: MultirangeInputPayload): string {
  const ranges = payload.ranges.map((span) =>
    span.kind === 'Value'
      ? rangeRustInput(span.value)
      : span.kind === 'Error'
        ? `RangeValue::Error(make_sql_error(${span.value.state}))`
        : `RangeValue::${span.kind}`,
  )
  return `make_coerced_multirange_value(MultirangePayload {type_name:${rustStringLiteral(payload.typeName)}.to_owned(),range_type:${rustStringLiteral(payload.rangeType)}.to_owned(),element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},ranges:vec![${ranges.join(',')}]})`
}

export function multirangeGoInput(payload: MultirangeInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.call(runtime('MakeCoercedMultirangeValue'), [
    go.composite(runtime('MultirangePayload'), [
      go.keyValue('TypeName', go.string(payload.typeName)),
      go.keyValue('RangeType', go.string(payload.rangeType)),
      go.keyValue('ElementType', go.string(payload.elementType)),
      go.keyValue('ElementKind', go.number(payload.elementKind)),
      go.keyValue(
        'Ranges',
        go.composite(
          go.slice(runtime('RangeValue')),
          payload.ranges.map((span) =>
            span.kind === 'Value'
              ? rangeGoInput(span.value)
              : go.composite(runtime('RangeValue'), [
                  go.keyValue('Kind', runtime('RangeValue' + span.kind)),
                  ...(span.kind === 'Error'
                    ? [
                        go.keyValue(
                          'Error',
                          go.composite(runtime('SqlError'), [
                            go.keyValue('State', go.number(span.value.state)),
                          ]),
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
