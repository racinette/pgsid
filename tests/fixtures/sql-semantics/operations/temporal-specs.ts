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
const timestamptz = (value: string | null): Operand =>
  temporal('pg_catalog.timestamptz', 'timestamptz', value)
const timetz = (value: string | null): Operand => temporal('pg_catalog.timetz', 'timetz', value)
const interval = (value: string | null): Operand =>
  temporal('pg_catalog."interval"', 'interval', value)
const integer = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : value}::int4`,
  expression: { kind: 'integer', type: 'pg_catalog.int4', value },
})
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `${quote(value)}::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
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

for (const [index, value] of [
  null,
  '2020-01-02 03:04:05',
  '2020-01-02 03:04:05+00',
  '2020-01-02 03:04:05+01',
  '2020-01-02 03:04:05-05',
  '2020-01-02 03:04:05+05:30',
  '2020-01-02 03:04:05+0530',
  '2020-01-02 03:04:05Z',
  '2020-01-02 03:04:05 UTC',
  '2020-01-02T03:04:05+00',
  '2020-01-02 24:00:00+00',
  '2020-01-02 03:04:05.123456+00',
  'infinity',
  '-infinity',
  '0001-01-01 00:00:00 BC',
].entries())
  add(`timestamptz input ${index}`, timestamptz(value))
for (const [index, value] of [
  'not-a-timestamptz',
  '2020-01-02 03:04:05+16',
  '2020-01-02 12:60:00+00',
].entries())
  add(`timestamptz invalid ${index}`, timestamptz(value))

for (const [index, value] of [
  null,
  '12:00:00',
  '12:00:00+00',
  '12:00:00+01',
  '12:00:00-05:30',
  '12:00:00Z',
  '12:00+00',
  '24:00:00+00',
  '12:00:00+00:00:01',
].entries())
  add(`timetz input ${index}`, timetz(value))
for (const [index, value] of [
  'not-a-timetz',
  '12:60:00+00',
  '12:00:00+16',
  '12:00:00+00:60',
].entries())
  add(`timetz invalid ${index}`, timetz(value))

const instant = timestamptz('2020-01-01 12:00:00+00')
const shifted = timestamptz('2020-01-01 13:00:00+01')
const laterInstant = timestamptz('2020-01-01 13:00:00+00')
const timestamptzNil = timestamptz(null)
const timestamptzInf = timestamptz('infinity')
for (const [index, [left, right]] of (
  [
    [instant, laterInstant],
    [laterInstant, instant],
    [instant, instant],
    [instant, shifted],
    [timestamptzInf, instant],
    [timestamptzNil, instant],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`timestamptz operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`timestamptz function ${operation}`, `timestamptz_${operation}`, [instant, laterInstant])
  callable(`timestamptz function ${operation} null`, `timestamptz_${operation}`, [
    timestamptzNil,
    laterInstant,
  ])
  callable(`timestamptz operator boundary ${name}`, name, [timestamptzInf, instant], true)
}
for (const [index, [left, right]] of (
  [
    [instant, shifted],
    [instant, laterInstant],
    [timestamptzNil, instant],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`timestamptz cmp ${index}`, 'timestamptz_cmp', [left, right])

const utcNoon = timetz('12:00:00+00')
const offsetNoon = timetz('13:00:00+01')
const utcEvening = timetz('18:00:00+00')
const timetzNil = timetz(null)
for (const [index, [left, right]] of (
  [
    [utcNoon, utcEvening],
    [utcEvening, utcNoon],
    [utcNoon, utcNoon],
    [utcNoon, offsetNoon],
    [timetzNil, utcNoon],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`timetz operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation] of [['eq'], ['ne'], ['lt'], ['le'], ['gt'], ['ge']] as const) {
  callable(`timetz function ${operation}`, `timetz_${operation}`, [utcNoon, utcEvening])
  callable(`timetz function ${operation} null`, `timetz_${operation}`, [timetzNil, utcEvening])
}
for (const [index, [left, right]] of (
  [
    [utcNoon, utcNoon],
    [utcNoon, offsetNoon],
    [timetzNil, utcNoon],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`timetz cmp ${index}`, 'timetz_cmp', [left, right])

callable('timestamptz finite', 'isfinite', [instant])
callable('timestamptz finite infinity', 'isfinite', [timestamptzInf])
callable('timestamptz finite null', 'isfinite', [timestamptzNil])
callable('make timestamptz', 'make_timestamptz', [
  integer('2020'),
  integer('1'),
  integer('2'),
  integer('3'),
  integer('4'),
  float(5.5),
])

add('timestamptz coalesce', {
  sql: `COALESCE((${timestamptzNil.sql}), (${instant.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog.timestamptz',
    operands: [timestamptzNil.expression, instant.expression],
  },
})
add('timetz case', {
  sql: `CASE WHEN true THEN (${utcEvening.sql}) ELSE (${utcNoon.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog.timetz',
    branches: [
      {
        when: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
        then: utcEvening.expression,
      },
    ],
    otherwise: utcNoon.expression,
  },
})

const stamp = timestamp('2020-06-15 12:34:56.123456')
const stampNinf = timestamp('-infinity')
const wall = time('12:34:56.123456')
const zoneWall = timetz('12:34:56.123456+01:30')
const span = interval('1 year 2 mons 3 days 04:05:06.7')
const spanNeg = interval('-13 mons')
const field = (value: string | null): Operand => text(value)

for (const unit of [
  'microsecond',
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'month',
  'quarter',
  'week',
  'year',
  'decade',
  'century',
  'millennium',
  'julian',
  'isoyear',
  'dow',
  'isodow',
  'doy',
  'epoch',
  'YEAR',
  'microseconds',
])
  callable(`extract timestamp ${unit}`, 'extract', [field(unit), stamp])
callable('extract timestamp timezone', 'extract', [field('timezone'), stamp])
callable('extract timestamp null field', 'extract', [field(null), stamp])
callable('extract timestamp null value', 'extract', [field('year'), timestampNil])
callable('extract timestamp infinity year', 'extract', [field('year'), timestampInf])
callable('extract timestamp infinity hour', 'extract', [field('hour'), timestampInf])
callable('extract timestamp ninfinity epoch', 'extract', [field('epoch'), stampNinf])
callable('extract timestamp bogus', 'extract', [field('bogus'), stamp])
callable('extract timestamp now', 'extract', [field('now'), stamp])
callable('date_part timestamp year', 'date_part', [field('year'), stamp])
callable('date_part timestamp second', 'date_part', [field('second'), stamp])
callable('date_part timestamp epoch', 'date_part', [field('epoch'), stamp])
callable('date_part timestamp infinity hour', 'date_part', [field('hour'), timestampInf])

callable('extract date year', 'extract', [field('year'), late])
callable('extract date epoch', 'extract', [field('epoch'), late])
callable('extract date dow', 'extract', [field('dow'), late])
callable('extract date hour', 'extract', [field('hour'), late])
callable('extract date infinity year', 'extract', [field('year'), dateInf])
callable('extract date infinity month', 'extract', [field('month'), dateInf])
callable('extract date ninfinity julian', 'extract', [field('julian'), dateNinf])
callable('extract date null', 'extract', [field('year'), dateNil])
callable('date_part date year', 'date_part', [field('year'), late])
callable('date_part date hour', 'date_part', [field('hour'), late])
callable('date_part date infinity hour', 'date_part', [field('hour'), dateInf])

callable('extract time hour', 'extract', [field('hour'), wall])
callable('extract time second', 'extract', [field('second'), wall])
callable('extract time epoch', 'extract', [field('epoch'), wall])
callable('extract time timezone', 'extract', [field('timezone'), wall])
callable('extract time day', 'extract', [field('day'), wall])
callable('extract time null', 'extract', [field('hour'), timeNil])
callable('date_part time millisecond', 'date_part', [field('millisecond'), wall])

callable('extract timetz timezone', 'extract', [field('timezone'), zoneWall])
callable('extract timetz timezone_hour', 'extract', [field('timezone_hour'), zoneWall])
callable('extract timetz timezone_minute', 'extract', [field('timezone_minute'), zoneWall])
callable('extract timetz epoch', 'extract', [field('epoch'), zoneWall])
callable('extract timetz hour', 'extract', [field('hour'), zoneWall])
callable('extract timetz null', 'extract', [field('timezone'), timetzNil])
callable('date_part timetz timezone', 'date_part', [field('timezone'), zoneWall])

callable('extract interval year', 'extract', [field('year'), span])
callable('extract interval month', 'extract', [field('month'), span])
callable('extract interval day', 'extract', [field('day'), span])
callable('extract interval hour', 'extract', [field('hour'), span])
callable('extract interval second', 'extract', [field('second'), span])
callable('extract interval week', 'extract', [field('week'), span])
callable('extract interval quarter', 'extract', [field('quarter'), span])
callable('extract interval quarter neg', 'extract', [field('quarter'), spanNeg])
callable('extract interval epoch', 'extract', [field('epoch'), span])
callable('extract interval infinity hour', 'extract', [field('hour'), intervalInf])
callable('extract interval infinity month', 'extract', [field('month'), intervalInf])
callable('extract interval null', 'extract', [field('year'), intervalNil])
callable('date_part interval epoch', 'date_part', [field('epoch'), span])

callable('extract timestamptz hour', 'extract', [field('hour'), instant])
callable('extract timestamptz timezone', 'extract', [field('timezone'), instant])
callable('extract timestamptz epoch', 'extract', [field('epoch'), instant])
callable('extract timestamptz null', 'extract', [field('hour'), timestamptzNil])
callable('date_part timestamptz year', 'date_part', [field('year'), instant])

for (const unit of [
  'microsecond',
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'month',
  'quarter',
  'week',
  'year',
  'decade',
  'century',
  'millennium',
])
  callable(`date_trunc timestamp ${unit}`, 'date_trunc', [field(unit), stamp])
callable('date_trunc timestamp infinity year', 'date_trunc', [field('year'), timestampInf])
callable('date_trunc timestamp week boundary', 'date_trunc', [
  field('week'),
  timestamp('2021-01-01 15:00:00'),
])
callable('date_trunc timestamp epoch', 'date_trunc', [field('epoch'), stamp])
callable('date_trunc timestamp null', 'date_trunc', [field('day'), timestampNil])
callable('date_trunc timestamptz day', 'date_trunc', [field('day'), instant])
callable('date_trunc timestamptz hour', 'date_trunc', [field('hour'), instant])
for (const unit of ['year', 'month', 'day', 'hour', 'second', 'millennium'])
  callable(`date_trunc interval ${unit}`, 'date_trunc', [field(unit), span])
callable('date_trunc interval week', 'date_trunc', [field('week'), span])
callable('date_trunc interval infinity year', 'date_trunc', [field('year'), intervalInf])
callable('date_trunc interval null', 'date_trunc', [field('day'), intervalNil])
callable('extract date bc year', 'extract', [field('year'), date('0001-01-01 BC')])
callable('date_trunc timestamp bc millennium', 'date_trunc', [
  field('millennium'),
  timestamp('0001-01-01 BC'),
])

export const temporalSpecs: readonly ExpressionSpec[] = specs
