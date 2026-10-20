import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import {
  rangeGoInput,
  rangeRustInput,
  rangeTypescriptInput,
  type RangeSupportFactory,
  type RangeInputPayload,
} from './range-input.js'

export type MultirangeInputRange =
  | { kind: 'Value'; value: RangeInputPayload }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; value: { state: number } }

export type MultirangeInputPayload = {
  typeName: string
  rangeType: string
  elementType: string
  elementKind: number
  support?: { comparison: number; canonical: number }
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
  return `make_coerced_multirange_value(MultirangePayload {type_name:${rustStringLiteral(payload.typeName)}.to_owned(),range_type:${rustStringLiteral(payload.rangeType)}.to_owned(),element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},support:${payload.support ? `RangeSupport {comparison:${payload.support.comparison},canonical:${payload.support.canonical}}` : `range_builtin_support(${rustStringLiteral(payload.rangeType)},${rustStringLiteral(payload.elementType)},${payload.elementKind})`},ranges:vec![${ranges.join(',')}]})`
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
        'Support',
        payload.support
          ? go.composite(runtime('RangeSupport'), [
              go.keyValue('Comparison', go.number(payload.support.comparison)),
              go.keyValue('Canonical', go.number(payload.support.canonical)),
            ])
          : go.call(runtime('RangeBuiltinSupport'), [
              go.string(payload.rangeType),
              go.string(payload.elementType),
              go.number(payload.elementKind),
            ]),
      ),
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

export function multirangeTypescriptInput(
  payload: MultirangeInputPayload,
  runtime: RangeSupportFactory,
) {
  return {
    ...payload,
    support:
      payload.support ??
      runtime.rangeBuiltinSupport(payload.rangeType, payload.elementType, payload.elementKind),
    ranges: payload.ranges.map((span) =>
      span.kind === 'Value'
        ? { kind: span.kind, value: rangeTypescriptInput(span.value, runtime) }
        : span,
    ),
  }
}
