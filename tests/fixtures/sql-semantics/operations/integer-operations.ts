import { PG18_NUMERIC } from '../../../../src/postgres/builtins/numeric.generated.js'
import type {
  FunctionSignatures,
  OperatorSignatures,
} from '../../../../src/sql-semantics/signatures.js'
import type { IntegerType, SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import type { SqlObservation } from '../../../support/postgres/observe.js'
import { integer, integerWidths } from './integer-addition.js'
import type { EvaluationCase } from './integer-addition.js'

export type IntegerBinaryOperator = '+' | '-' | '*' | '=' | '<>' | '<' | '<=' | '>' | '>='

const binarySignatures = {
  'pg_catalog.int2,pg_catalog.int2': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int2,pg_catalog.int2)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int2,pg_catalog.int2)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int2,pg_catalog.int2)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int2,pg_catalog.int2)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int2,pg_catalog.int2)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int2,pg_catalog.int2)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int2,pg_catalog.int2)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int2,pg_catalog.int2)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int2,pg_catalog.int2)',
  },
  'pg_catalog.int2,pg_catalog.int4': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int2,pg_catalog.int4)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int2,pg_catalog.int4)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int2,pg_catalog.int4)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int2,pg_catalog.int4)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int2,pg_catalog.int4)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int2,pg_catalog.int4)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int2,pg_catalog.int4)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int2,pg_catalog.int4)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int2,pg_catalog.int4)',
  },
  'pg_catalog.int2,pg_catalog.int8': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int2,pg_catalog.int8)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int2,pg_catalog.int8)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int2,pg_catalog.int8)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int2,pg_catalog.int8)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int2,pg_catalog.int8)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int2,pg_catalog.int8)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int2,pg_catalog.int8)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int2,pg_catalog.int8)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int2,pg_catalog.int8)',
  },
  'pg_catalog.int4,pg_catalog.int2': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.int2)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int4,pg_catalog.int2)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int4,pg_catalog.int2)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int2)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int4,pg_catalog.int2)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int4,pg_catalog.int2)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int4,pg_catalog.int2)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int4,pg_catalog.int2)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int4,pg_catalog.int2)',
  },
  'pg_catalog.int4,pg_catalog.int4': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.int4)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int4,pg_catalog.int4)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int4,pg_catalog.int4)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int4,pg_catalog.int4)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int4,pg_catalog.int4)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int4,pg_catalog.int4)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int4,pg_catalog.int4)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int4,pg_catalog.int4)',
  },
  'pg_catalog.int4,pg_catalog.int8': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.int8)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int4,pg_catalog.int8)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int4,pg_catalog.int8)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int8)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int4,pg_catalog.int8)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int4,pg_catalog.int8)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int4,pg_catalog.int8)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int4,pg_catalog.int8)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int4,pg_catalog.int8)',
  },
  'pg_catalog.int8,pg_catalog.int2': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int2)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int8,pg_catalog.int2)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int8,pg_catalog.int2)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int8,pg_catalog.int2)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int8,pg_catalog.int2)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int8,pg_catalog.int2)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int8,pg_catalog.int2)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int8,pg_catalog.int2)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int8,pg_catalog.int2)',
  },
  'pg_catalog.int8,pg_catalog.int4': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int4)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int8,pg_catalog.int4)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int8,pg_catalog.int4)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int8,pg_catalog.int4)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int8,pg_catalog.int4)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int8,pg_catalog.int4)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int8,pg_catalog.int4)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int8,pg_catalog.int4)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int8,pg_catalog.int4)',
  },
  'pg_catalog.int8,pg_catalog.int8': {
    '+': 'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)',
    '-': 'operator:["pg_catalog","-"](pg_catalog.int8,pg_catalog.int8)',
    '*': 'operator:["pg_catalog","*"](pg_catalog.int8,pg_catalog.int8)',
    '=': 'operator:["pg_catalog","="](pg_catalog.int8,pg_catalog.int8)',
    '<>': 'operator:["pg_catalog","<>"](pg_catalog.int8,pg_catalog.int8)',
    '<': 'operator:["pg_catalog","<"](pg_catalog.int8,pg_catalog.int8)',
    '<=': 'operator:["pg_catalog","<="](pg_catalog.int8,pg_catalog.int8)',
    '>': 'operator:["pg_catalog",">"](pg_catalog.int8,pg_catalog.int8)',
    '>=': 'operator:["pg_catalog",">="](pg_catalog.int8,pg_catalog.int8)',
  },
} as const satisfies Record<
  `${IntegerType},${IntegerType}`,
  Record<IntegerBinaryOperator, OperatorSignatures<typeof PG18_NUMERIC>>
>

const unarySignatures = {
  'pg_catalog.int2': 'operator:["pg_catalog","-"](,pg_catalog.int2)',
  'pg_catalog.int4': 'operator:["pg_catalog","-"](,pg_catalog.int4)',
  'pg_catalog.int8': 'operator:["pg_catalog","-"](,pg_catalog.int8)',
} as const satisfies Record<IntegerType, OperatorSignatures<typeof PG18_NUMERIC>>

const absSignatures = {
  'pg_catalog.int2': 'function:["pg_catalog","abs"](pg_catalog.int2)',
  'pg_catalog.int4': 'function:["pg_catalog","abs"](pg_catalog.int4)',
  'pg_catalog.int8': 'function:["pg_catalog","abs"](pg_catalog.int8)',
} as const satisfies Record<IntegerType, FunctionSignatures<typeof PG18_NUMERIC>>

const castSignatures = {
  'pg_catalog.int2': {
    'pg_catalog.int2': null,
    'pg_catalog.int4': 'function:["pg_catalog","int4"](pg_catalog.int2)',
    'pg_catalog.int8': 'function:["pg_catalog","int8"](pg_catalog.int2)',
  },
  'pg_catalog.int4': {
    'pg_catalog.int2': 'function:["pg_catalog","int2"](pg_catalog.int4)',
    'pg_catalog.int4': null,
    'pg_catalog.int8': 'function:["pg_catalog","int8"](pg_catalog.int4)',
  },
  'pg_catalog.int8': {
    'pg_catalog.int2': 'function:["pg_catalog","int2"](pg_catalog.int8)',
    'pg_catalog.int4': 'function:["pg_catalog","int4"](pg_catalog.int8)',
    'pg_catalog.int8': null,
  },
} as const satisfies Record<
  IntegerType,
  Record<IntegerType, FunctionSignatures<typeof PG18_NUMERIC> | null>
>

export function binary(
  operator: IntegerBinaryOperator,
  left: SqlExpression,
  right: SqlExpression,
): SqlExpression {
  const signature =
    binarySignatures[`${left.type},${right.type}` as keyof typeof binarySignatures][operator]
  return {
    kind: 'operator',
    signature,
    type: PG18_NUMERIC[signature].result,
    operands: [left, right],
  }
}
export function negate(operand: SqlExpression): SqlExpression {
  const signature = unarySignatures[operand.type as IntegerType]
  return { kind: 'operator', signature, type: PG18_NUMERIC[signature].result, operands: [operand] }
}
export function abs(operand: SqlExpression): SqlExpression {
  const signature = absSignatures[operand.type as IntegerType]
  return { kind: 'function', signature, type: PG18_NUMERIC[signature].result, operands: [operand] }
}
export function cast(type: IntegerType, operand: SqlExpression): SqlExpression {
  return {
    kind: 'cast',
    signature: castSignatures[operand.type as IntegerType][type],
    type,
    operand,
  }
}
const literal = (type: IntegerType, value: string | null): string =>
  `(${value === null ? 'NULL' : `'${value}'`}::${type})`
const sqlNull: SqlObservation = { kind: 'null' }
const overflow: SqlObservation = { kind: 'error', code: '22003' }
const value = (value: string): SqlObservation => ({ kind: 'value', value })
const expectedInteger = (integer: bigint, type: string): SqlObservation => {
  const width = integerWidths.find((width) => width.type === type)!
  return integer < BigInt(width.min) || integer > BigInt(width.max)
    ? overflow
    : value(integer.toString())
}

export const integerArithmeticCases: readonly EvaluationCase[] = integerWidths.flatMap(
  (leftWidth) =>
    integerWidths.flatMap((rightWidth) =>
      (['+', '-', '*'] as const).flatMap((operator) => {
        const tuples: readonly (readonly [string, string | null, string | null])[] = [
          ['ordinary', '2', '3'],
          ['negative', '-2', '-3'],
          ['zero', '0', '0'],
          ['minimum left', leftWidth.min, '1'],
          ['maximum left', leftWidth.max, '1'],
          ['minimum right', '1', rightWidth.min],
          ['maximum right', '1', rightWidth.max],
          ['minimum left reversed', leftWidth.min, '-1'],
          ['minimum right reversed', '-1', rightWidth.min],
          ['maximum left reversed', leftWidth.max, '-1'],
          ['maximum right reversed', '-1', rightWidth.max],
          ['both minimum', leftWidth.min, rightWidth.min],
          ['both maximum', leftWidth.max, rightWidth.max],
          ['opposite extremes', leftWidth.max, rightWidth.min],
          ['opposite extremes reversed', leftWidth.min, rightWidth.max],
          ['negative with minimum', '-2', rightWidth.min],
          ['positive with maximum', '2', rightWidth.max],
          ['zero with minimum', '0', rightWidth.min],
          ['minimum with zero', leftWidth.min, '0'],
          ['maximum with zero', leftWidth.max, '0'],
          ['null left', null, rightWidth.max],
          ['null right', leftWidth.max, null],
          ['both null', null, null],
        ]
        return tuples.map(([name, left, right]) => {
          const expression = binary(
            operator,
            integer(leftWidth.type, left),
            integer(rightWidth.type, right),
          )
          const a = BigInt(left ?? '0'),
            b = BigInt(right ?? '0')
          const result = operator === '+' ? a + b : operator === '-' ? a - b : a * b
          return {
            name: `${leftWidth.type} ${operator} ${rightWidth.type}: ${name}`,
            sql: `${literal(leftWidth.type, left)} ${operator} ${literal(rightWidth.type, right)}`,
            expression,
            expected:
              left === null || right === null ? sqlNull : expectedInteger(result, expression.type),
          }
        })
      }),
    ),
)

export const integerUnaryCases: readonly EvaluationCase[] = integerWidths.flatMap((width) =>
  (['negate', 'abs'] as const).flatMap((operation) => {
    const inputs = ['2', '-2', '0', width.min, width.max, width.afterMin, width.beforeMax, null]
    return inputs.map((input) => ({
      name: `${width.type} ${operation}: ${input}`,
      sql:
        operation === 'abs'
          ? `abs(${literal(width.type, input)})`
          : `-(${literal(width.type, input)})`,
      expression:
        operation === 'abs' ? abs(integer(width.type, input)) : negate(integer(width.type, input)),
      expected:
        input === null
          ? sqlNull
          : expectedInteger(
              operation === 'negate'
                ? -BigInt(input)
                : BigInt(input) < 0n
                  ? -BigInt(input)
                  : BigInt(input),
              width.type,
            ),
    }))
  }),
)

export const integerComparisonCases: readonly EvaluationCase[] = integerWidths.flatMap(
  (leftWidth) =>
    integerWidths.flatMap((rightWidth) =>
      (['=', '<>', '<', '<=', '>', '>='] as const).flatMap((operator) => {
        const tuples: readonly (readonly [string, string | null, string | null])[] = [
          ['equal', '1', '1'],
          ['less', '-1', '1'],
          ['greater', '1', '-1'],
          ['extremes', leftWidth.min, rightWidth.max],
          ['extremes reversed', leftWidth.max, rightWidth.min],
          ['null left', null, '1'],
          ['null right', '1', null],
          ['both null', null, null],
          ...(leftWidth.type === 'pg_catalog.int8' && rightWidth.type === 'pg_catalog.int8'
            ? ([['adjacent unsafe integers', '9007199254740992', '9007199254740993']] as const)
            : []),
        ]
        return tuples.map(([name, left, right]) => {
          const a = BigInt(left ?? '0'),
            b = BigInt(right ?? '0')
          const compared =
            operator === '='
              ? a === b
              : operator === '<>'
                ? a !== b
                : operator === '<'
                  ? a < b
                  : operator === '<='
                    ? a <= b
                    : operator === '>'
                      ? a > b
                      : a >= b
          return {
            name: `${leftWidth.type} ${operator} ${rightWidth.type}: ${name}`,
            sql: `${literal(leftWidth.type, left)} ${operator} ${literal(rightWidth.type, right)}`,
            expression: binary(
              operator,
              integer(leftWidth.type, left),
              integer(rightWidth.type, right),
            ),
            expected: left === null || right === null ? sqlNull : value(String(compared)),
          }
        })
      }),
    ),
)

export const integerCastCases: readonly EvaluationCase[] = integerWidths.flatMap((source) =>
  integerWidths.flatMap((target) => {
    const candidates = new Set([
      '0',
      '1',
      '-1',
      source.min,
      source.max,
      target.min,
      target.max,
      target.afterMin,
      target.beforeMax,
      (BigInt(target.min) - 1n).toString(),
      (BigInt(target.max) + 1n).toString(),
      '9007199254740993',
    ])
    const inputs = [...candidates].filter(
      (input) => BigInt(input) >= BigInt(source.min) && BigInt(input) <= BigInt(source.max),
    )
    return [...inputs, null].map((input) => ({
      name: `${source.type} cast ${target.type}: ${input}`,
      sql: `${literal(source.type, input)}::${target.type}`,
      expression: cast(target.type, integer(source.type, input)),
      expected: input === null ? sqlNull : expectedInteger(BigInt(input), target.type),
    }))
  }),
)

export const integerExtendedCompositionCases: readonly EvaluationCase[] = [
  {
    name: 'abs around subtraction and multiplication',
    sql: 'abs((2::integer - 5::integer) * 3::integer)',
    expression: abs(
      binary(
        '*',
        binary('-', integer('pg_catalog.int4', '2'), integer('pg_catalog.int4', '5')),
        integer('pg_catalog.int4', '3'),
      ),
    ),
    expected: value('9'),
  },
  {
    name: 'unary minus around abs and comparison',
    sql: '-abs(-5::bigint) < -4::smallint',
    expression: binary(
      '<',
      negate(abs(integer('pg_catalog.int8', '-5'))),
      integer('pg_catalog.int2', '-4'),
    ),
    expected: value('true'),
  },
  {
    name: 'widen before multiplication avoids smallint overflow',
    sql: '(2::smallint)::integer * 16384::smallint',
    expression: binary(
      '*',
      cast('pg_catalog.int4', integer('pg_catalog.int2', '2')),
      integer('pg_catalog.int2', '16384'),
    ),
    expected: value('32768'),
  },
  {
    name: 'widen after multiplication preserves smallint overflow',
    sql: '(2::smallint * 16384::smallint)::integer',
    expression: cast(
      'pg_catalog.int4',
      binary('*', integer('pg_catalog.int2', '2'), integer('pg_catalog.int2', '16384')),
    ),
    expected: overflow,
  },
  {
    name: 'narrow intermediate bigint before mixed-width addition',
    sql: "(('2147483648'::bigint - 1::smallint)::integer) + 1::bigint",
    expression: binary(
      '+',
      cast(
        'pg_catalog.int4',
        binary('-', integer('pg_catalog.int8', '2147483648'), integer('pg_catalog.int2', '1')),
      ),
      integer('pg_catalog.int8', '1'),
    ),
    expected: value('2147483648'),
  },
  {
    name: 'narrowing error propagates through function call',
    sql: "abs(('32768'::bigint)::smallint)",
    expression: abs(cast('pg_catalog.int2', integer('pg_catalog.int8', '32768'))),
    expected: overflow,
  },
  {
    name: 'abs error propagates through comparison',
    sql: "abs('-9223372036854775808'::bigint) = 0::bigint",
    expression: binary(
      '=',
      abs(integer('pg_catalog.int8', '-9223372036854775808')),
      integer('pg_catalog.int8', '0'),
    ),
    expected: overflow,
  },
  {
    name: 'nested SQL NULL propagates through casts and abs into comparison',
    sql: 'abs((NULL::smallint)::bigint - 1::integer) >= 0::bigint',
    expression: binary(
      '>=',
      abs(
        binary(
          '-',
          cast('pg_catalog.int8', integer('pg_catalog.int2', null)),
          integer('pg_catalog.int4', '1'),
        ),
      ),
      integer('pg_catalog.int8', '0'),
    ),
    expected: sqlNull,
  },
  {
    name: 'multiplication fits near bigint square root',
    sql: '3037000499::bigint * 3037000499::bigint',
    expression: binary(
      '*',
      integer('pg_catalog.int8', '3037000499'),
      integer('pg_catalog.int8', '3037000499'),
    ),
    expected: value('9223372030926249001'),
  },
  {
    name: 'multiplication overflows just above bigint square root',
    sql: '3037000500::bigint * 3037000500::bigint',
    expression: binary(
      '*',
      integer('pg_catalog.int8', '3037000500'),
      integer('pg_catalog.int8', '3037000500'),
    ),
    expected: overflow,
  },
  {
    name: 'negative multiplication fits near bigint square root',
    sql: '(-3037000499)::bigint * (-3037000499)::bigint',
    expression: binary(
      '*',
      integer('pg_catalog.int8', '-3037000499'),
      integer('pg_catalog.int8', '-3037000499'),
    ),
    expected: value('9223372030926249001'),
  },
  {
    name: 'negative multiplication overflows just above bigint square root',
    sql: '(-3037000500)::bigint * (-3037000500)::bigint',
    expression: binary(
      '*',
      integer('pg_catalog.int8', '-3037000500'),
      integer('pg_catalog.int8', '-3037000500'),
    ),
    expected: overflow,
  },
  {
    name: 'right grouping cancels subtraction before negation',
    sql: "-('-9223372036854775808'::bigint - (-1::bigint))",
    expression: negate(
      binary(
        '-',
        integer('pg_catalog.int8', '-9223372036854775808'),
        integer('pg_catalog.int8', '-1'),
      ),
    ),
    expected: value('9223372036854775807'),
  },
  {
    name: 'left grouping overflows negation before subtraction',
    sql: "(-('-9223372036854775808'::bigint)) - (-1::bigint)",
    expression: binary(
      '-',
      negate(integer('pg_catalog.int8', '-9223372036854775808')),
      integer('pg_catalog.int8', '-1'),
    ),
    expected: overflow,
  },
]

export const integerMultiplicationBoundaryCases: readonly EvaluationCase[] = (
  [
    ['reach minimum', '2', '-4611686018427387904', value('-9223372036854775808')],
    ['reach minimum reversed', '-4611686018427387904', '2', value('-9223372036854775808')],
    ['reach maximum', '7', '1317624576693539401', value('9223372036854775807')],
    ['one above maximum', '2', '4611686018427387904', overflow],
    ['one above maximum from negatives', '-2', '-4611686018427387904', overflow],
    ['one below minimum', '3', '-3074457345618258603', overflow],
    ['one below minimum reversed', '-3074457345618258603', '3', overflow],
    ['round toward zero near minimum', '3', '-3074457345618258602', value('-9223372036854775806')],
    [
      'round toward zero near minimum reversed',
      '-3074457345618258602',
      '3',
      value('-9223372036854775806'),
    ],
  ] as const
).map(([name, left, right, expected]) => ({
  name: `bigint multiplication boundary: ${name}`,
  sql: `${literal('pg_catalog.int8', left)} * ${literal('pg_catalog.int8', right)}`,
  expression: binary('*', integer('pg_catalog.int8', left), integer('pg_catalog.int8', right)),
  expected,
}))

export const integerInputCases: readonly EvaluationCase[] = integerWidths.flatMap((width) =>
  [(BigInt(width.min) - 1n).toString(), (BigInt(width.max) + 1n).toString()].map((input) => ({
    name: `${width.type} out-of-range input: ${input}`,
    sql: literal(width.type, input),
    expression: integer(width.type, input),
    expected: overflow,
  })),
)

export const integerErrorCompositionCases: readonly EvaluationCase[] = integerWidths.flatMap(
  (width) => {
    const failed = abs(integer(width.type, width.min))
    const failedSql = `abs(${literal(width.type, width.min)})`
    const sqlNullOperand = literal(width.type, null)
    return [
      ...(['-', '*'] as const).map((operator) => ({
        name: `${width.type} ${operator}: nested right error with NULL left`,
        sql: `${sqlNullOperand} ${operator} ${failedSql}`,
        expression: binary(operator, integer(width.type, null), failed),
        expected: overflow,
      })),
      {
        name: `${width.type}: comparison left error with NULL right`,
        sql: `${failedSql} = ${sqlNullOperand}`,
        expression: binary('=', failed, integer(width.type, null)),
        expected: overflow,
      },
      {
        name: `${width.type}: comparison right error with NULL left`,
        sql: `${sqlNullOperand} = ${failedSql}`,
        expression: binary('=', integer(width.type, null), failed),
        expected: overflow,
      },
      {
        name: `${width.type}: unary minus propagates function error`,
        sql: `-(${failedSql})`,
        expression: negate(failed),
        expected: overflow,
      },
      {
        name: `${width.type}: abs propagates function error`,
        sql: `abs(${failedSql})`,
        expression: abs(failed),
        expected: overflow,
      },
      {
        name: `${width.type}: cast propagates function error`,
        sql: `(${failedSql})::bigint`,
        expression: cast('pg_catalog.int8', failed),
        expected: overflow,
      },
    ]
  },
)

export const integerOperationCases: readonly EvaluationCase[] = [
  ...integerMultiplicationBoundaryCases,
  ...integerErrorCompositionCases,
  ...integerInputCases,
  ...integerArithmeticCases,
  ...integerUnaryCases,
  ...integerComparisonCases,
  ...integerCastCases,
  ...integerExtendedCompositionCases,
]
