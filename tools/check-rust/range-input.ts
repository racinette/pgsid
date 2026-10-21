import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

export type RangeInputCell =
  | { kind: 'Null' | 'Unknown' | 'Float4UnspecifiedNan' | 'Float8UnspecifiedNan' }
  | { kind: 'Error'; value: { state: number } }
  | { kind: 'Int2' | 'Int4' | 'Date' | 'Float4' | 'InternalChar'; value: number }
  | {
      kind:
        | 'Int8'
        | 'Timestamp'
        | 'Timestamptz'
        | 'Float8'
        | 'Time'
        | 'Money'
        | 'Oid'
        | 'Xid8'
        | 'PgLsn'
        | 'Tid'
      value: bigint
    }
  | { kind: 'Numeric' | 'Text' | 'Bit' | 'Bytea'; value: string }
  | { kind: 'Bool'; value: boolean }
  | { kind: 'Timetz'; value: { time: bigint; zone: number } }
  | { kind: 'Interval'; value: { time: bigint; days: number; months: number } }
  | {
      kind: 'Network'
      value: {
        family: number
        prefix: number
        word0: number
        word1: number
        word2: number
        word3: number
        word4: number
        word5: number
        word6: number
        word7: number
      }
    }
  | {
      kind: 'Macaddr' | 'Macaddr8'
      value: { word0: number; word1: number; word2: number; word3: number }
    }
  | {
      kind: 'Uuid'
      value: {
        word0: number
        word1: number
        word2: number
        word3: number
        word4: number
        word5: number
        word6: number
        word7: number
      }
    }

const cellRecords = {
  Timetz: 'TimetzPayload',
  Interval: 'IntervalPayload',
  Network: 'NetworkAddress',
  Macaddr: 'MacAddress',
  Macaddr8: 'MacAddress',
  Uuid: 'Uuid',
} as const

export function rangeRustCell(cell: RangeInputCell): string {
  if (!('value' in cell)) return `ArrayElement::${cell.kind}`
  if (cell.kind === 'Error') return `ArrayElement::Error(make_sql_error(${cell.value.state}))`
  const scalar = (value: string | number | bigint | boolean) =>
    typeof value === 'string'
      ? `${rustStringLiteral(value)}.to_owned()`
      : String(value) + (typeof value === 'bigint' ? 'i64' : '')
  const value =
    typeof cell.value === 'object'
      ? `${cellRecords[cell.kind as keyof typeof cellRecords]} {${Object.entries(cell.value)
          .map(([name, value]) => `${name}:${scalar(value)}`)
          .join(',')}}`
      : scalar(cell.value)
  return `ArrayElement::${cell.kind}(${value})`
}

export function rangeGoCell(cell: RangeInputCell): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  const scalar = (value: string | number | bigint | boolean): GoExpression =>
    typeof value === 'string'
      ? go.string(value)
      : typeof value === 'boolean'
        ? go.ident(String(value))
        : go.number(value)
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
              : typeof cell.value === 'object'
                ? go.composite(
                    runtime(cellRecords[cell.kind as keyof typeof cellRecords]),
                    Object.entries(cell.value).map(([name, value]) =>
                      go.keyValue(name[0]!.toUpperCase() + name.slice(1), scalar(value)),
                    ),
                  )
                : scalar(cell.value),
          ),
        ]
      : []),
  ])
}

export type RangeInputPayload = {
  typeName: string
  elementType: string
  elementKind: number
  support?: { comparison: number; canonical: number }
  empty: boolean
  lowerInclusive: boolean
  upperInclusive: boolean
  bounds: RangeInputCell[]
}

export function rangeRustInput(payload: RangeInputPayload): string {
  const cells = payload.bounds.map(rangeRustCell)
  return `make_coerced_range_value(RangePayload {type_name:${rustStringLiteral(payload.typeName)}.to_owned(),element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},support:${payload.support ? `RangeSupport {comparison:${payload.support.comparison},canonical:${payload.support.canonical}}` : `range_builtin_support(${rustStringLiteral(payload.typeName)},${rustStringLiteral(payload.elementType)},${payload.elementKind})`},empty:${payload.empty},lower_inclusive:${payload.lowerInclusive},upper_inclusive:${payload.upperInclusive},bounds:vec![${cells.join(',')}]})`
}

export function rangeGoInput(payload: RangeInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.call(runtime('MakeCoercedRangeValue'), [
    go.composite(runtime('RangePayload'), [
      go.keyValue('TypeName', go.string(payload.typeName)),
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
              go.string(payload.typeName),
              go.string(payload.elementType),
              go.number(payload.elementKind),
            ]),
      ),
      go.keyValue('Empty', go.ident(String(payload.empty))),
      go.keyValue('LowerInclusive', go.ident(String(payload.lowerInclusive))),
      go.keyValue('UpperInclusive', go.ident(String(payload.upperInclusive))),
      go.keyValue(
        'Bounds',
        go.composite(go.slice(runtime('ArrayElement')), payload.bounds.map(rangeGoCell)),
      ),
    ]),
  ])
}

export type RangeSupportFactory = {
  rangeBuiltinSupport(
    typeName: string,
    elementType: string,
    kind: number,
  ): { comparison: number; canonical: number }
}

export function rangeTypescriptInput(payload: RangeInputPayload, runtime: RangeSupportFactory) {
  return {
    ...payload,
    support:
      payload.support ??
      runtime.rangeBuiltinSupport(payload.typeName, payload.elementType, payload.elementKind),
  }
}
