import type { TsqueryConstantStorage } from '../catalog/tsquery-constant-storage.js'
import type { ArrayConstantStorage } from '../catalog/array-constant-storage.js'
import type { TsvectorConstantStorage } from '../catalog/tsvector-constant-storage.js'
import type {
  SqlCallableExpression,
  SqlExpression,
  ScalarType,
  ArrayType,
  ArrayElementType,
  OidType,
  SnapshotType,
  RangeType,
  MultirangeType,
  EnumDefinition,
} from './expressions.js'
import type { EvalBoolExpression } from './check-expressions.js'
import type { RangeCallInfo } from '../catalog/types.js'

export type EvalExpression =
  | {
      kind: 'range-constant'
      type: RangeType
      empty: boolean
      lowerInclusive: boolean
      upperInclusive: boolean
      operands: readonly EvalExpression[]
    }
  | { kind: 'multirange-constant'; type: MultirangeType; operands: readonly EvalExpression[] }
  | {
      kind: 'xml-constructor'
      type: 'pg_catalog.xml'
      operation: 'concat' | 'root' | 'pi' | 'element' | 'forest'
      operands: readonly EvalExpression[]
      name?: string
      mapped?: boolean
      standalone?: number
      named?: readonly { name: string; mapped: boolean; implicit: boolean }[]
      inputEnums?: readonly EnumDefinition[]
    }
  | {
      kind: 'xml-operation'
      type: 'pg_catalog.xml' | 'pg_catalog.text' | 'pg_catalog.bool'
      operation: 'parse' | 'cast' | 'text' | 'document' | 'serialize'
      operand: EvalExpression
      mode?: 'document' | 'content'
      indent?: boolean
    }
  | {
      kind: 'text-to-composite'
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
      xmlStorage?: true
      type: ScalarType
      operand: EvalExpression
      conversions: readonly EvalExpression[]
      literal?: true
      origin?: 'source' | 'stored'
      anonymous?: true
    }
  | { kind: 'composite-to-text'; type: 'pg_catalog.text'; operand: EvalExpression }
  | { kind: 'composite-field'; type: ScalarType; operand: EvalExpression; index: number }
  | {
      kind: 'composite-coerce'
      type: ScalarType
      operand: EvalExpression
      mapping: readonly number[] | null
    }
  | { kind: 'composite-null'; type: ScalarType }
  | {
      kind: 'composite-constructor'
      type: ScalarType
      anonymousIdentity?: string
      wholeRow?: true
      physical?: { operands: readonly EvalExpression[]; discarded: readonly number[] }
      operands: readonly EvalExpression[]
      projectable: readonly (boolean | null)[]
    }
  | {
      kind: 'captured-range-call'
      type: RangeType | MultirangeType
      callable: RangeCallInfo
      operands: readonly EvalExpression[]
      expanded: boolean
    }
  | { kind: 'check'; type: 'pg_catalog.bool'; expression: EvalBoolExpression }
  | { kind: 'input'; type: ScalarType; name: string; enum?: EnumDefinition }
  | { kind: 'certain'; expression: SqlExpression }
  | { kind: 'uncertain'; type: string; preparation?: 'constant'; reason?: 'context' }
  | {
      kind: 'domain-cast'
      type: ScalarType
      schema: string
      name: string
      notNull: boolean
      checks: readonly { name: string; expression: EvalBoolExpression }[]
      operand: EvalExpression
    }
  | {
      kind: 'text-to-enum'
      type: ScalarType
      enum: EnumDefinition
      literal: boolean
      operand: EvalExpression
    }
  | { kind: 'text-to-boolean'; type: 'pg_catalog.bool'; literal?: boolean; operand: EvalExpression }
  | {
      kind: 'boolean-logic'
      type: 'pg_catalog.bool'
      operation: 'and' | 'or' | 'not'
      operands: readonly EvalExpression[]
    }
  | {
      kind: 'array-quantifier'
      type: 'pg_catalog.bool'
      elementType: ArrayElementType
      operands: readonly [EvalExpression, EvalExpression]
      comparison: SqlCallableExpression
      any: boolean
    }
  | {
      kind: 'membership'
      type: 'pg_catalog.bool'
      subject: EvalExpression
      groups: readonly (readonly EvalExpression[])[]
      comparison: SqlCallableExpression
      // One per group when the groups compare under different collations.
      groupComparisons?: readonly SqlCallableExpression[]
      operation: 'and' | 'or'
    }
  | {
      kind: 'null-test'
      type: 'pg_catalog.bool'
      negated: boolean
      datum?: true
      operand: EvalExpression
    }
  | {
      kind: 'distinct'
      type: 'pg_catalog.bool'
      negated: boolean
      operands: readonly [EvalExpression, EvalExpression]
      comparison: SqlCallableExpression
    }
  | {
      kind: 'input-null-test'
      type: 'pg_catalog.bool'
      negated: boolean
      name: string
      // The column's enum, whose labels a reader of the value checks it against.
      enum?: EnumDefinition
    }
  | {
      kind: 'nullif'
      type: ScalarType
      operands: readonly [EvalExpression, EvalExpression]
      comparison: SqlCallableExpression
    }
  | { kind: 'coalesce'; type: ScalarType; operands: readonly EvalExpression[] }
  | {
      kind: 'array-subscript'
      type: ScalarType
      elementType: ArrayElementType
      operand: EvalExpression
      slice: boolean
      upper: readonly (EvalExpression | null)[]
      lower: readonly (EvalExpression | null)[]
    }
  | {
      kind: 'array-text-literal'
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
      xmlStorage?: true
      inputConversion?: EvalExpression
      storedInputConversion?: EvalExpression
      conversion?: EvalExpression
      moneyLiterals?: readonly { text: string; units: string }[]
      type: ArrayType
      elementType: ArrayElementType
      value: string
      enum?: EnumDefinition
      origin?: 'source' | 'stored'
    }
  | {
      kind: 'array-to-text'
      type: 'pg_catalog.text'
      elementType: ArrayElementType
      operand: EvalExpression
      output: string
      enum?: EnumDefinition
    }
  | {
      kind: 'text-to-array'
      inputConversion?: EvalExpression
      storedInputConversion?: EvalExpression
      conversion?: EvalExpression
      type: ArrayType
      elementType: ArrayElementType
      operand: EvalExpression
      enum?: EnumDefinition
    }
  | {
      kind: 'array-io-coerce'
      inputConversion?: EvalExpression
      type: ArrayType
      sourceElementType: ArrayElementType
      elementType: ArrayElementType
      input: string
      output: string
      sourceEnum?: EnumDefinition
      enum?: EnumDefinition
      modifier: number
      operand: EvalExpression
    }
  | {
      kind: 'array-coerce'
      type: ArrayType
      sourceElementType: ArrayElementType
      elementType: ArrayElementType
      conversion: SqlCallableExpression
      explicit: boolean
      modifier: number
      operand: EvalExpression
    }
  | {
      kind: 'array-domain-coerce'
      type: ArrayType
      sourceElementType: ArrayElementType
      elementType: ArrayElementType
      conversion: EvalExpression
      operand: EvalExpression
    }
  | {
      kind: 'array-typmod'
      type: ArrayType
      elementType: ArrayElementType
      modifier: number
      operand: EvalExpression
    }
  | {
      kind: 'array-constructor'
      dimensions?: readonly { lower: number; length: number }[]
      arrayStorage?: readonly ArrayConstantStorage[]
      type: ArrayType | 'pg_catalog.int2vector' | 'pg_catalog.oidvector'
      elementType: ArrayElementType
      multidimensional: boolean
      operands: readonly EvalExpression[]
    }
  | {
      kind: 'row-compare'
      type: 'pg_catalog.bool'
      strategy: 1 | 2 | 4 | 5
      pairs: readonly {
        operands: readonly [EvalExpression, EvalExpression]
        comparison: SqlCallableExpression
      }[]
    }
  | {
      kind: 'minmax'
      type: ScalarType
      operation: 'greatest' | 'least'
      operands: readonly EvalExpression[]
      comparison: SqlCallableExpression
    }
  | {
      kind: 'text-to-network'
      type: 'pg_catalog.inet' | 'pg_catalog.cidr'
      operand: EvalExpression
    }
  | {
      kind: 'text-to-mac'
      type: 'pg_catalog.macaddr' | 'pg_catalog.macaddr8'
      operand: EvalExpression
    }
  | {
      kind: 'refcursor-text-coercion'
      type: 'pg_catalog.refcursor' | 'pg_catalog.text'
      operand: EvalExpression
    }
  | { kind: 'mac-to-text'; type: 'pg_catalog.text'; operand: EvalExpression }
  | {
      kind: 'io-to-text'
      type: 'pg_catalog.text'
      operand: EvalExpression
      output: string
      enum?: EnumDefinition
    }
  | {
      kind: 'text-to-float'
      type: 'pg_catalog.float4' | 'pg_catalog.float8'
      operand: EvalExpression
    }
  | {
      kind: 'text-to-integer'
      type: 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8'
      operand: EvalExpression
      literal?: true
    }
  | {
      kind: 'text-to-numeric'
      type: 'pg_catalog."numeric"'
      operand: EvalExpression
      literal?: true
    }
  | { kind: 'text-to-point'; type: 'pg_catalog.point'; operand: EvalExpression }
  | { kind: 'text-to-line'; type: 'pg_catalog.line'; operand: EvalExpression }
  | { kind: 'text-to-lseg'; type: 'pg_catalog.lseg'; operand: EvalExpression }
  | {
      kind: 'text-to-money'
      type: 'pg_catalog.money'
      operand: EvalExpression
      moneyLiterals?: readonly { text: string; units: string }[]
    }
  | { kind: 'text-to-tsvector'; type: 'pg_catalog.tsvector'; operand: EvalExpression }
  | { kind: 'text-to-tsquery'; type: 'pg_catalog.tsquery'; operand: EvalExpression }
  | { kind: 'text-to-aclitem'; type: 'pg_catalog.aclitem'; operand: EvalExpression }
  | { kind: 'text-to-xid'; type: 'pg_catalog.xid'; operand: EvalExpression }
  | { kind: 'text-to-cid'; type: 'pg_catalog.cid'; operand: EvalExpression }
  | { kind: 'text-to-pg_lsn'; type: 'pg_catalog.pg_lsn'; operand: EvalExpression }
  | { kind: 'text-to-tid'; type: 'pg_catalog.tid'; operand: EvalExpression }
  | { kind: 'text-to-xid8'; type: 'pg_catalog.xid8'; operand: EvalExpression }
  | { kind: 'text-to-snapshot'; type: SnapshotType; operand: EvalExpression }
  | {
      kind: 'text-to-json'
      type: 'pg_catalog."json"' | 'pg_catalog.jsonb' | 'pg_catalog.jsonpath'
      operand: EvalExpression
    }
  | { kind: 'text-to-oid'; type: OidType; operand: EvalExpression }
  | { kind: 'text-to-polygon'; type: 'pg_catalog.polygon'; operand: EvalExpression }
  | { kind: 'text-to-path'; type: 'pg_catalog.path'; operand: EvalExpression }
  | {
      kind: 'text-to-vector'
      type: 'pg_catalog.int2vector' | 'pg_catalog.oidvector'
      operand: EvalExpression
      literal?: true
    }
  | {
      kind: 'text-to-range'
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
      type: RangeType
      operand: EvalExpression
      conversion?: EvalExpression
      literal?: true
      origin?: 'source' | 'stored'
    }
  | {
      kind: 'text-to-multirange'
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
      type: MultirangeType
      operand: EvalExpression
      conversion?: EvalExpression
      literal?: true
      origin?: 'source' | 'stored'
    }
  | { kind: 'text-to-circle'; type: 'pg_catalog.circle'; operand: EvalExpression }
  | { kind: 'text-to-box'; type: 'pg_catalog.box'; operand: EvalExpression }
  | { kind: 'text-to-uuid'; type: 'pg_catalog.uuid'; operand: EvalExpression }
  | { kind: 'text-to-bytea'; type: 'pg_catalog.bytea'; operand: EvalExpression }
  | { kind: 'uuid-to-text'; type: 'pg_catalog.text'; operand: EvalExpression }
  | { kind: 'bit-to-text'; type: 'pg_catalog.text'; operand: EvalExpression }
  | {
      kind: 'text-to-bit'
      type: 'pg_catalog."bit"' | 'pg_catalog.varbit'
      inputModifier?: number
      operand: EvalExpression
    }
  | {
      kind: 'text-to-clock'
      type: 'pg_catalog."time"' | 'pg_catalog.timetz'
      operand: EvalExpression
    }
  | {
      kind: 'text-to-interval'
      type: 'pg_catalog."interval"'
      operand: EvalExpression
      inputModifier?: number
    }
  | { kind: 'interval-literal'; type: 'pg_catalog."interval"'; value: string; modifier: number }
  | { kind: 'clock-to-text'; type: 'pg_catalog.text'; operand: EvalExpression }
  | { kind: 'text-to-date'; type: 'pg_catalog.date'; operand: EvalExpression }
  | { kind: 'text-to-timestamp'; type: 'pg_catalog."timestamp"'; operand: EvalExpression }
  | { kind: 'text-to-timestamptz'; type: 'pg_catalog.timestamptz'; operand: EvalExpression }
  | {
      kind: 'case'
      type: ScalarType
      scrutinee?: { expression: EvalExpression; binding?: string }
      branches: readonly {
        when: EvalExpression
        then: EvalExpression
        equality?: SqlCallableExpression
      }[]
      otherwise: EvalExpression
    }
  | {
      kind: 'call'
      call: SqlCallableExpression
      operands: readonly EvalExpression[]
      inputConversion?: EvalExpression
      strictNull?: true
    }
