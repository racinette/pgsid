import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_TEMPORAL } from '../../../postgres/builtins/temporal.generated.js'

function call<M extends CallableMetadata>(helper: string): CallableEmitter<M, GoExpression> {
  return {
    helpers: [helper],
    emit: (metadata, operands) => ({
      type: metadata.result,
      expression: go.call(
        go.ident(helper),
        operands.map((operand) => operand.expression),
      ),
    }),
  }
}

const comparisons = [
  ['=', 'Eq'],
  ['<>', 'Ne'],
  ['<', 'Lt'],
  ['<=', 'Le'],
  ['>', 'Gt'],
  ['>=', 'Ge'],
] as const

const types = [
  ['date', 'pg_catalog.date', 'date'],
  ['time', 'pg_catalog."time"', 'time'],
  ['timestamp', 'pg_catalog."timestamp"', 'timestamp'],
  ['interval', 'pg_catalog."interval"', 'interval'],
] as const

export const goTemporalOperators = Object.fromEntries(
  types.flatMap(([prefix, type]) =>
    comparisons.map(([operator, name]) => [
      `operator:["pg_catalog","${operator}"](${type},${type})`,
      call(`${prefix}${name}`),
    ]),
  ),
) as OperatorBindings<typeof PG18_TEMPORAL, GoExpression>

export const goTemporalFunctions = {
  ...Object.fromEntries(
    types.flatMap(([prefix, type]) => [
      ...comparisons.map(([operator, name]) => [
        `function:["pg_catalog","${prefix}_${operator === '=' ? 'eq' : operator === '<>' ? 'ne' : operator === '<' ? 'lt' : operator === '<=' ? 'le' : operator === '>' ? 'gt' : 'ge'}"](${type},${type})`,
        call(`${prefix}${name}`),
      ]),
      [`function:["pg_catalog","${prefix}_cmp"](${type},${type})`, call(`${prefix}Compare`)],
    ]),
  ),
  'function:["pg_catalog","isfinite"](pg_catalog.date)': call('dateFinite'),
  'function:["pg_catalog","isfinite"](pg_catalog."timestamp")': call('timestampFinite'),
  'function:["pg_catalog","isfinite"](pg_catalog."interval")': call('intervalFinite'),
  'function:["pg_catalog","make_date"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4)':
    call('makeDate'),
  'function:["pg_catalog","make_time"](pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeTime'),
  'function:["pg_catalog","make_timestamp"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeTimestamp'),
  'function:["pg_catalog","make_interval"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeInterval'),
} as FunctionBindings<typeof PG18_TEMPORAL, GoExpression>
