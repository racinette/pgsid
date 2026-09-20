import type { IntegerType, SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import type { PG18_NUMERIC } from '../../../../src/postgres/builtins/numeric.generated.js'
import type { OperatorSignatures } from '../../../../src/sql-semantics/signatures.js'
import type { SqlObservation } from '../../../support/postgres/observe.js'

export interface EvaluationCase {
  setupSql?: string
  name: string
  sql: string
  expression: SqlExpression
  expected: SqlObservation
}

export const integer = (type: IntegerType, value: string | null): SqlExpression => ({
  kind: 'integer',
  type,
  value,
})

const signatures = {
  'pg_catalog.int2': 'operator:["pg_catalog","+"](pg_catalog.int2,pg_catalog.int2)',
  'pg_catalog.int4': 'operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.int4)',
  'pg_catalog.int8': 'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)',
} as const satisfies Record<IntegerType, OperatorSignatures<typeof PG18_NUMERIC>>

export const add = (
  type: IntegerType,
  left: SqlExpression,
  right: SqlExpression,
): SqlExpression => ({
  kind: 'operator',
  signature: signatures[type],
  type,
  operands: [left, right],
})

const value = (value: string): SqlObservation => ({ kind: 'value', value })
const overflow: SqlObservation = { kind: 'error', code: '22003' }
const sqlNull: SqlObservation = { kind: 'null' }

export const integerWidths = [
  { type: 'pg_catalog.int2', min: '-32768', max: '32767', beforeMax: '32766', afterMin: '-32767' },
  {
    type: 'pg_catalog.int4',
    min: '-2147483648',
    max: '2147483647',
    beforeMax: '2147483646',
    afterMin: '-2147483647',
  },
  {
    type: 'pg_catalog.int8',
    min: '-9223372036854775808',
    max: '9223372036854775807',
    beforeMax: '9223372036854775806',
    afterMin: '-9223372036854775807',
  },
] as const

export const integerAdditionCases: readonly EvaluationCase[] = integerWidths.flatMap((width) => {
  const cases: readonly [string, string | null, string | null, SqlObservation][] = [
    ['ordinary', '2', '3', value('5')],
    ['negative', '-2', '-3', value('-5')],
    ['zero', '0', '0', value('0')],
    ['maximum', width.max, '0', value(width.max)],
    ['minimum', width.min, '0', value(width.min)],
    ['reach maximum', width.beforeMax, '1', value(width.max)],
    ['reach minimum', width.afterMin, '-1', value(width.min)],
    ['cancellation', width.max, width.min, value('-1')],
    ['positive overflow', width.max, '1', overflow],
    ['negative overflow', width.min, '-1', overflow],
    ['double maximum', width.max, width.max, overflow],
    ['double minimum', width.min, width.min, overflow],
    ['null left', null, '1', sqlNull],
    ['null right', '1', null, sqlNull],
    ['both null', null, null, sqlNull],
    ['null with maximum', null, width.max, sqlNull],
  ]
  return cases.map(([name, left, right, expected]) => ({
    name: `${width.type}: ${name}`,
    sql: `(${left === null ? 'NULL' : `'${left}'`}::${width.type}) + (${right === null ? 'NULL' : `'${right}'`}::${width.type})`,
    expression: add(width.type, integer(width.type, left), integer(width.type, right)),
    expected,
  }))
})

export const integerCompositionCases: readonly EvaluationCase[] = [
  {
    name: 'right grouping cancels before outer addition',
    sql: "'9223372036854775807'::bigint + (1::bigint + (-1)::bigint)",
    expression: add(
      'pg_catalog.int8',
      integer('pg_catalog.int8', '9223372036854775807'),
      add('pg_catalog.int8', integer('pg_catalog.int8', '1'), integer('pg_catalog.int8', '-1')),
    ),
    expected: value('9223372036854775807'),
  },
  {
    name: 'left grouping overflows before cancellation',
    sql: "('9223372036854775807'::bigint + 1::bigint) + (-1)::bigint",
    expression: add(
      'pg_catalog.int8',
      add(
        'pg_catalog.int8',
        integer('pg_catalog.int8', '9223372036854775807'),
        integer('pg_catalog.int8', '1'),
      ),
      integer('pg_catalog.int8', '-1'),
    ),
    expected: overflow,
  },
  {
    name: 'nested null propagation',
    sql: '(1::integer + NULL::integer) + 2::integer',
    expression: add(
      'pg_catalog.int4',
      add('pg_catalog.int4', integer('pg_catalog.int4', '1'), integer('pg_catalog.int4', null)),
      integer('pg_catalog.int4', '2'),
    ),
    expected: sqlNull,
  },
  {
    name: 'lossless integer beyond JavaScript safe range',
    sql: "'9007199254740993'::bigint + 2::bigint",
    expression: add(
      'pg_catalog.int8',
      integer('pg_catalog.int8', '9007199254740993'),
      integer('pg_catalog.int8', '2'),
    ),
    expected: value('9007199254740995'),
  },
]
