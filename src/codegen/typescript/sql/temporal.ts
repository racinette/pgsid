import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_TEMPORAL } from '../../../postgres/builtins/temporal.generated.js'
import {
  temporalArithmeticFunctions,
  temporalArithmeticOperators,
} from '../../../sql-semantics/temporal-arithmetic-bindings.js'

function call<M extends CallableMetadata>(helper: string): CallableEmitter<M, ts.Expression> {
  return {
    helpers: [helper],
    emit: (metadata, operands) => ({
      type: metadata.result,
      expression: factory.createCallExpression(
        identifier(helper),
        undefined,
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
  ['timestamptz', 'pg_catalog.timestamptz', 'timestamptz'],
  ['timetz', 'pg_catalog.timetz', 'timetz'],
  ['interval', 'pg_catalog."interval"', 'interval'],
] as const

export const typescriptTemporalOperators = {
  ...Object.fromEntries(
    types.flatMap(([prefix, type]) =>
      comparisons.map(([operator, name]) => [
        `operator:["pg_catalog","${operator}"](${type},${type})`,
        call(`${prefix}${name}`),
      ]),
    ),
  ),
  ...Object.fromEntries(
    temporalArithmeticOperators.map(([signature, helper]) => [signature, call(helper)]),
  ),
} as OperatorBindings<typeof PG18_TEMPORAL, ts.Expression>

export const typescriptTemporalFunctions = {
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
  'function:["pg_catalog","isfinite"](pg_catalog.timestamptz)': call('timestamptzFinite'),
  'function:["pg_catalog","isfinite"](pg_catalog."interval")': call('intervalFinite'),
  'function:["pg_catalog","make_date"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4)':
    call('makeDate'),
  'function:["pg_catalog","make_time"](pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeTime'),
  'function:["pg_catalog","make_timestamp"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeTimestamp'),
  'function:["pg_catalog","make_timestamptz"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeTimestamptz'),
  'function:["pg_catalog","make_interval"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.float8)':
    call('makeInterval'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog."timestamp")':
    call('extractTimestamp'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog.timestamptz)':
    call('extractTimestamptz'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog.date)': call('extractDate'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog."time")': call('extractTime'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog.timetz)': call('extractTimetz'),
  'function:["pg_catalog","extract"](pg_catalog.text,pg_catalog."interval")':
    call('extractInterval'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog."timestamp")':
    call('datePartTimestamp'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog.timestamptz)':
    call('datePartTimestamptz'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog.date)': call('datePartDate'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog."time")': call('datePartTime'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog.timetz)': call('datePartTimetz'),
  'function:["pg_catalog","date_part"](pg_catalog.text,pg_catalog."interval")':
    call('datePartInterval'),
  'function:["pg_catalog","date_trunc"](pg_catalog.text,pg_catalog."timestamp")':
    call('dateTruncTimestamp'),
  'function:["pg_catalog","date_trunc"](pg_catalog.text,pg_catalog.timestamptz)':
    call('dateTruncTimestamptz'),
  'function:["pg_catalog","date_trunc"](pg_catalog.text,pg_catalog."interval")':
    call('dateTruncInterval'),
  ...Object.fromEntries(
    temporalArithmeticFunctions.map(([signature, helper]) => [signature, call(helper)]),
  ),
} as FunctionBindings<typeof PG18_TEMPORAL, ts.Expression>
