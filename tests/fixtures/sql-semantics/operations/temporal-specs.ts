import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type {
  FloatType,
  SqlExpression,
  TemporalType,
} from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}

const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`

const temporal = (type: TemporalType, sqlType: string, value: string | null): Operand => ({
  sql: value === null ? `NULL::${sqlType}` : `${quote(value)}::${sqlType}`,
  expression: { kind: 'temporal', type, value },
})
const date = (value: string | null): Operand => temporal('pg_catalog.date', 'date', value)
const time = (value: string | null): Operand => temporal('pg_catalog."time"', 'time', value)
const timestamp = (value: string | null): Operand =>
  temporal('pg_catalog."timestamp"', 'timestamp', value)
const interval = (value: string | null): Operand =>
  temporal('pg_catalog."interval"', 'interval', value)
const integer = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : value}::int4`,
  expression: { kind: 'integer', type: 'pg_catalog.int4', value },
})
const float = (value: number | null): Operand => {
  const view = new DataView(new ArrayBuffer(8))
  if (value !== null) view.setFloat64(0, value)
  return {
    sql: `${value === null ? 'NULL' : quote(String(value))}::float8`,
    expression: {
      kind: 'float',
      type: 'pg_catalog.float8' satisfies FloatType,
      bits:
        value === null
          ? null
          : Array.from(new Uint8Array(view.buffer), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join(''),
    },
  }
}

function add(name: string, operand: Operand): Operand {
  specs.push({ name, ...operand })
  return operand
}

function callable(
  name: string,
  callableName: string,
  operands: Operand[],
  operator = false,
): Operand {
  const signature = `${operator ? 'operator' : 'function'}:["pg_catalog","${callableName}"](${operands.map((operand) => operand.expression.type).join(',')})`
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  return add(name, {
    sql: operator
      ? `((${operands[0]!.sql}) ${callableName} (${operands[1]!.sql}))`
      : `pg_catalog.${callableName}(${operands.map((operand) => `(${operand.sql})`).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      signature,
      type: metadata.result,
      operands: operands.map((operand) => operand.expression),
    },
  })
}

for (const [index, value] of [
  null,
  '2020-01-02',
  ' 2020-01-02',
  '2024-1-5',
  '2024-02-29',
  '0001-01-01',
  'infinity',
  '+infinity',
  '-infinity',
].entries())
  add(`date input ${index}`, date(value))
for (const [index, value] of ['', 'not-a-date', '2023-02-29', '2024-02-30'].entries())
  add(`date invalid ${index}`, date(value))

for (const [index, value] of [
  null,
  '00:00:00',
  '12:34',
  '12:34:56',
  '12:34:56.1',
  '12:34:56.123456',
  '24:00:00',
].entries())
  add(`time input ${index}`, time(value))
for (const [index, value] of ['12:60:00', '24:00:01', 'not-a-time'].entries())
  add(`time invalid ${index}`, time(value))

for (const [index, value] of [
  null,
  '2020-01-02',
  '2020-01-02 03:04:05',
  '2020-01-02T03:04:05',
  '2020-01-02 24:00:00',
  'infinity',
  '-infinity',
].entries())
  add(`timestamp input ${index}`, timestamp(value))
add('timestamp invalid', timestamp('not-a-timestamp'))

for (const [index, value] of [
  null,
  '0',
  '1 year',
  '2 months',
  '3 days',
  '04:05:06',
  '1 year 2 mons 3 days 04:05:06',
  '1 week',
  'infinity',
  '-infinity',
].entries())
  add(`interval input ${index}`, interval(value))
add('interval invalid', interval('not-an-interval'))

const early = date('2020-01-01')
const late = date('2020-01-02')
const dateNil = date(null)
const dateInf = date('infinity')
const dateNinf = date('-infinity')
for (const [index, [left, right]] of (
  [
    [early, late],
    [late, early],
    [early, early],
    [dateInf, early],
    [dateNinf, early],
    [dateNil, early],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`date operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`date function ${operation}`, `date_${operation}`, [early, late])
  callable(`date function ${operation} null`, `date_${operation}`, [dateNil, late])
  callable(`date operator boundary ${name}`, name, [dateInf, dateNinf], true)
}
for (const [index, [left, right]] of (
  [
    [early, early],
    [early, late],
    [dateInf, dateNinf],
    [dateNil, early],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`date cmp ${index}`, 'date_cmp', [left, right])

const noon = time('12:00:00')
const evening = time('18:00:00')
const timeNil = time(null)
const midnight = time('24:00:00')
for (const [index, [left, right]] of (
  [
    [noon, evening],
    [evening, noon],
    [noon, noon],
    [midnight, noon],
    [timeNil, noon],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`time operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`time function ${operation}`, `time_${operation}`, [noon, evening])
  callable(`time function ${operation} null`, `time_${operation}`, [timeNil, evening])
  callable(`time operator boundary ${name}`, name, [midnight, noon], true)
}
for (const [index, [left, right]] of (
  [
    [noon, noon],
    [noon, evening],
    [timeNil, noon],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`time cmp ${index}`, 'time_cmp', [left, right])

const morning = timestamp('2020-01-02 03:04:05')
const later = timestamp('2020-01-03 00:00:00')
const timestampNil = timestamp(null)
const timestampInf = timestamp('infinity')
for (const [index, [left, right]] of (
  [
    [morning, later],
    [later, morning],
    [morning, morning],
    [timestampInf, morning],
    [timestampNil, morning],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`timestamp operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`timestamp function ${operation}`, `timestamp_${operation}`, [morning, later])
  callable(`timestamp function ${operation} null`, `timestamp_${operation}`, [timestampNil, later])
  callable(`timestamp operator boundary ${name}`, name, [timestampInf, morning], true)
}
for (const [index, [left, right]] of (
  [
    [morning, morning],
    [morning, later],
    [timestampNil, morning],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`timestamp cmp ${index}`, 'timestamp_cmp', [left, right])

const year = interval('1 year')
const days360 = interval('360 days')
const month = interval('1 mon')
const days30 = interval('30 days')
const intervalNil = interval(null)
const intervalInf = interval('infinity')
for (const [index, [left, right]] of (
  [
    [year, days360],
    [month, days30],
    [year, month],
    [intervalInf, year],
    [intervalNil, year],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`interval operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`interval function ${operation}`, `interval_${operation}`, [year, month])
  callable(`interval function ${operation} null`, `interval_${operation}`, [intervalNil, month])
  callable(`interval operator boundary ${name}`, name, [intervalInf, year], true)
}
for (const [index, [left, right]] of (
  [
    [year, days360],
    [year, month],
    [intervalNil, year],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`interval cmp ${index}`, 'interval_cmp', [left, right])

callable('date finite', 'isfinite', [early])
callable('date finite infinity', 'isfinite', [dateInf])
callable('date finite null', 'isfinite', [dateNil])
callable('timestamp finite', 'isfinite', [morning])
callable('timestamp finite infinity', 'isfinite', [timestampInf])
callable('interval finite', 'isfinite', [year])
callable('interval finite infinity', 'isfinite', [intervalInf])

callable('make date', 'make_date', [integer('2020'), integer('1'), integer('2')])
callable('make date bc', 'make_date', [integer('-1'), integer('1'), integer('1')])
callable('make date invalid', 'make_date', [integer('2023'), integer('2'), integer('29')])
callable('make time', 'make_time', [integer('12'), integer('34'), float(56.5)])
callable('make time overflow', 'make_time', [integer('24'), integer('0'), float(0.1)])
callable('make timestamp', 'make_timestamp', [
  integer('2020'),
  integer('1'),
  integer('2'),
  integer('3'),
  integer('4'),
  float(5.5),
])
callable('make interval', 'make_interval', [
  integer('1'),
  integer('2'),
  integer('0'),
  integer('3'),
  integer('4'),
  integer('5'),
  float(6.5),
])

add('date null test', {
  sql: `(${dateNil.sql}) IS NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: false,
    operand: dateNil.expression,
  },
})
add('date case', {
  sql: `CASE WHEN true THEN (${late.sql}) ELSE (${early.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog.date',
    branches: [
      { when: { kind: 'boolean', type: 'pg_catalog.bool', value: true }, then: late.expression },
    ],
    otherwise: early.expression,
  },
})
add('date coalesce', {
  sql: `COALESCE((${dateNil.sql}), (${late.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog.date',
    operands: [dateNil.expression, late.expression],
  },
})
add('time case', {
  sql: `CASE WHEN true THEN (${evening.sql}) ELSE (${noon.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog."time"',
    branches: [
      { when: { kind: 'boolean', type: 'pg_catalog.bool', value: true }, then: evening.expression },
    ],
    otherwise: noon.expression,
  },
})
add('timestamp coalesce', {
  sql: `COALESCE((${timestampNil.sql}), (${morning.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog."timestamp"',
    operands: [timestampNil.expression, morning.expression],
  },
})
add('interval case', {
  sql: `CASE WHEN false THEN (${year.sql}) ELSE (${month.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog."interval"',
    branches: [
      { when: { kind: 'boolean', type: 'pg_catalog.bool', value: false }, then: year.expression },
    ],
    otherwise: month.expression,
  },
})

export const temporalSpecs: readonly ExpressionSpec[] = specs
