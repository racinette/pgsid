import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import {
  compositeRustInput,
  compositeGoCell,
  compositeTypescriptInput,
  type CompositeInputPayload,
} from './composite-input.js'
import {
  arrayGoInput,
  arrayRustInput,
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from './array-input.js'
import {
  multirangeRustInput,
  multirangeGoInput,
  multirangeTypescriptInput,
  type MultirangeInputPayload,
} from './multirange-input.js'

export type RangeJsonbPayload = {
  characters: string[]
  nodes: {
    kind: number
    child: number
    next: number
    keyStart: number
    keyEnd: number
    textStart: number
    textEnd: number
  }[]
  root: number
}

export type RangeInputCell =
  | { kind: 'Composite'; value: CompositeInputPayload }
  | { kind: 'Range'; value: RangeInputPayload }
  | { kind: 'Multirange'; value: MultirangeInputPayload }
  | { kind: 'Array'; value: OwnedArrayInputPayload }
  | { kind: 'Jsonb'; value: RangeJsonbPayload }
  | { kind: 'Json'; value: { source: string; kind: number; depth: number } }
  | { kind: 'Enum'; value: { ordinal: number; labelOid: bigint } }
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
  Json: 'JsonPayload',
  Enum: 'EnumPayload',
  Timetz: 'TimetzPayload',
  Interval: 'IntervalPayload',
  Network: 'NetworkAddress',
  Macaddr: 'MacAddress',
  Macaddr8: 'MacAddress',
  Uuid: 'Uuid',
} as const

export function rangeRustCell(cell: RangeInputCell): string {
  if (cell.kind === 'Composite')
    return `array_element_from_composite(${compositeRustInput(cell.value)})`
  if (cell.kind === 'Range') return `array_element_from_range(${rangeRustInput(cell.value)})`
  if (cell.kind === 'Multirange')
    return `array_element_from_multirange(${multirangeRustInput(cell.value)})`
  if (cell.kind === 'Array') return `array_element_from_array(${arrayRustInput(cell.value)})`
  if (!('value' in cell)) return `ArrayElement::${cell.kind}`
  if (cell.kind === 'Error') return `ArrayElement::Error(make_sql_error(${cell.value.state}))`
  if (cell.kind === 'Jsonb') {
    const nodes = cell.value.nodes.map(
      (node) =>
        `JsonbNode {${Object.entries(node)
          .map(
            ([key, value]) =>
              `${key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase())}:${value}`,
          )
          .join(',')}}`,
    )
    return `ArrayElement::Jsonb(JsonbPayload {characters:${rustStringLiteral(cell.value.characters.join(''))}.chars().collect(),nodes:vec![${nodes.join(',')}],root:${cell.value.root}})`
  }
  const scalar = (value: string | number | bigint | boolean) =>
    typeof value === 'string'
      ? `${rustStringLiteral(value)}.to_owned()`
      : String(value) + (typeof value === 'bigint' ? 'i64' : '')
  const value =
    typeof cell.value === 'object'
      ? `${cellRecords[cell.kind as keyof typeof cellRecords]} {${Object.entries(cell.value)
          .map(
            ([name, value]) =>
              `${name.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase())}:${scalar(value)}`,
          )
          .join(',')}}`
      : scalar(cell.value)
  return `ArrayElement::${cell.kind}(${value})`
}

export function rangeGoCell(cell: RangeInputCell): GoExpression {
  if (cell.kind === 'Composite') return compositeGoCell(cell)
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  if (cell.kind === 'Range')
    return go.call(runtime('ArrayElementFromRange'), [rangeGoInput(cell.value)])
  if (cell.kind === 'Multirange')
    return go.call(runtime('ArrayElementFromMultirange'), [multirangeGoInput(cell.value)])
  if (cell.kind === 'Array')
    return go.call(runtime('ArrayElementFromArray'), [arrayGoInput(cell.value)])
  if (cell.kind === 'Jsonb')
    return go.composite(runtime('ArrayElement'), [
      go.keyValue('Kind', runtime('ArrayElementJsonb')),
      go.keyValue(
        'Jsonb',
        go.composite(runtime('JsonbPayload'), [
          go.keyValue(
            'Characters',
            go.call(go.slice(go.ident('rune')), [go.string(cell.value.characters.join(''))]),
          ),
          go.keyValue(
            'Nodes',
            go.composite(
              go.slice(runtime('JsonbNode')),
              cell.value.nodes.map((node) =>
                go.composite(
                  runtime('JsonbNode'),
                  Object.entries(node).map(([key, value]) =>
                    go.keyValue(key[0]!.toUpperCase() + key.slice(1), go.number(value)),
                  ),
                ),
              ),
            ),
          ),
          go.keyValue('Root', go.number(cell.value.root)),
        ]),
      ),
    ])
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

export type RangeInputBoundProfile = {
  typeName: string
  kind: number
  comparison: number
  canonical?: number
  missingComparison: boolean
  elementType: string
  child: number
  enumLabels: string
  enumCount: number
}

export type RangeInputPayload = {
  typeName: string
  elementType: string
  elementKind: number
  enumLabels?: string
  enumCount?: number
  boundProfile?: { nodes: RangeInputBoundProfile[] }
  support?: { comparison: number; canonical: number }
  empty: boolean
  lowerInclusive: boolean
  upperInclusive: boolean
  bounds: RangeInputCell[]
}

export function rangeRustInput(payload: RangeInputPayload): string {
  const cells = payload.bounds.map(rangeRustCell)
  const profile = (payload.boundProfile?.nodes ?? [])
    .map(
      (node) =>
        `RangeBoundProfile {type_name:${rustStringLiteral(node.typeName)}.to_owned(),kind:${node.kind},comparison:${node.comparison},canonical:${node.canonical ?? 1},missing_comparison:${node.missingComparison},element_type:${rustStringLiteral(node.elementType)}.to_owned(),child:${node.child},enum_labels:${rustStringLiteral(node.enumLabels)}.to_owned(),enum_count:${node.enumCount}}`,
    )
    .join(',')
  return `make_coerced_range_value(RangePayload {bound_profile:RangeBoundContext {nodes:vec![${profile}]},enum_labels:${rustStringLiteral(payload.enumLabels ?? '')}.to_owned(),enum_count:${payload.enumCount ?? -1},type_name:${rustStringLiteral(payload.typeName)}.to_owned(),element_type:${rustStringLiteral(payload.elementType)}.to_owned(),element_kind:${payload.elementKind},support:${payload.support ? `RangeSupport {comparison:${payload.support.comparison},canonical:${payload.support.canonical}}` : `range_builtin_support(${rustStringLiteral(payload.typeName)},${rustStringLiteral(payload.elementType)},${payload.elementKind})`},empty:${payload.empty},lower_inclusive:${payload.lowerInclusive},upper_inclusive:${payload.upperInclusive},bounds:vec![${cells.join(',')}]})`
}

export function rangeGoInput(payload: RangeInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.call(runtime('MakeCoercedRangeValue'), [
    go.composite(runtime('RangePayload'), [
      go.keyValue('TypeName', go.string(payload.typeName)),
      go.keyValue('ElementType', go.string(payload.elementType)),
      go.keyValue('ElementKind', go.number(payload.elementKind)),
      go.keyValue('EnumLabels', go.string(payload.enumLabels ?? '')),
      go.keyValue('EnumCount', go.number(payload.enumCount ?? -1)),
      go.keyValue(
        'BoundProfile',
        go.composite(runtime('RangeBoundContext'), [
          go.keyValue(
            'Nodes',
            go.composite(
              go.slice(runtime('RangeBoundProfile')),
              (payload.boundProfile?.nodes ?? []).map((node) =>
                go.composite(runtime('RangeBoundProfile'), [
                  go.keyValue('TypeName', go.string(node.typeName)),
                  go.keyValue('Kind', go.number(node.kind)),
                  go.keyValue('Comparison', go.number(node.comparison)),
                  go.keyValue('Canonical', go.number(node.canonical ?? 1)),
                  go.keyValue('MissingComparison', go.ident(String(node.missingComparison))),
                  go.keyValue('ElementType', go.string(node.elementType)),
                  go.keyValue('Child', go.number(node.child)),
                  go.keyValue('EnumLabels', go.string(node.enumLabels)),
                  go.keyValue('EnumCount', go.number(node.enumCount)),
                ]),
              ),
            ),
          ),
        ]),
      ),
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
    bounds: payload.bounds.map((cell): RangeInputCell =>
      cell.kind === 'Composite'
        ? { kind: 'Composite', value: compositeTypescriptInput(cell.value, runtime) }
        : cell.kind === 'Range'
          ? { kind: 'Range', value: rangeTypescriptInput(cell.value, runtime) }
          : cell.kind === 'Multirange'
            ? { kind: 'Multirange', value: multirangeTypescriptInput(cell.value, runtime) }
            : cell.kind === 'Array'
              ? { kind: 'Array', value: arrayTypescriptInput(cell.value, runtime) }
              : cell,
    ),
    enumLabels: payload.enumLabels ?? '',
    enumCount: payload.enumCount ?? -1,
    boundProfile: {
      nodes: (payload.boundProfile?.nodes ?? []).map((node) => ({
        ...node,
        canonical: node.canonical ?? 1,
      })),
    },
    support:
      payload.support ??
      runtime.rangeBuiltinSupport(payload.typeName, payload.elementType, payload.elementKind),
  }
}
