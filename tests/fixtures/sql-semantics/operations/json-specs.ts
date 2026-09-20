import { arrayType, type SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}

const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`
const catalogType = (type: string): string =>
  type === arrayType('pg_catalog.text') ? 'pg_catalog._text' : type

const json = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::json' : `${quote(value)}::json`,
  expression: { kind: 'json', type: 'pg_catalog."json"', value },
})
const jsonb = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::jsonb' : `${quote(value)}::jsonb`,
  expression: { kind: 'jsonb', type: 'pg_catalog.jsonb', value },
})
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `${quote(value)}::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
})
const integer = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : value}::int4`,
  expression: { kind: 'integer', type: 'pg_catalog.int4', value },
})
const textArray = (values: readonly (string | null)[] | null): Operand => ({
  sql:
    values === null
      ? 'NULL::text[]'
      : values.length === 0
        ? 'ARRAY[]::text[]'
        : `ARRAY[${values.map((value) => (value === null ? 'NULL' : quote(value))).join(',')}]::text[]`,
  expression: {
    kind: 'array',
    type: arrayType('pg_catalog.text'),
    elementType: 'pg_catalog.text',
    dimensions: values === null || values.length === 0 ? [] : [values.length],
    lowerBounds: values === null || values.length === 0 ? [] : [1],
    elements: values?.map((value) => text(value).expression) ?? null,
  },
})

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
  const signature = `${operator ? 'operator' : 'function'}:["pg_catalog","${callableName}"](${operands.map((operand) => catalogType(operand.expression.type)).join(',')})`
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  const variadic = metadata.kind !== 'operator' && metadata.variadic
  return add(name, {
    sql: operator
      ? `((${operands[0]!.sql}) ${callableName} (${operands[1]!.sql}))`
      : `pg_catalog.${callableName}(${operands
          .map((operand, index) =>
            variadic && index === operands.length - 1
              ? `VARIADIC (${operand.sql})`
              : `(${operand.sql})`,
          )
          .join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      signature,
      type: metadata.result,
      operands: operands.map((operand) => operand.expression),
    },
  })
}

function coerce(
  name: string,
  type: 'pg_catalog."json"' | 'pg_catalog.jsonb' | 'pg_catalog.text',
  operand: Operand,
): Operand {
  return add(name, {
    sql: `(${operand.sql})::${type === 'pg_catalog."json"' ? 'json' : type === 'pg_catalog.jsonb' ? 'jsonb' : 'text'}`,
    expression: { kind: 'json-coercion', type, operand: operand.expression },
  })
}

const accepted = [
  null,
  'null',
  'true',
  'false',
  '0',
  '1.2300',
  '1e2',
  '"hi"',
  '[]',
  '{}',
  '[1, null, 3]',
  '{"b":2,"a":1}',
  '{"a":1,"a":2}',
  ' { "a" : 1 } ',
  '{"aa":1,"b":2}',
  '"\\u0041"',
  '"a\\/b"',
  '"\\uD83D\\uDE00"',
  '9007199254740993',
  '-0',
] as const
for (const [index, value] of accepted.entries()) {
  add(`json input ${index}`, json(value))
  add(`jsonb input ${index}`, jsonb(value))
}

for (const [index, value] of ['', '01', 'truee', '[1,]', '{a:1}', '1 2'].entries()) {
  add(`json invalid input ${index}`, json(value))
  add(`jsonb invalid input ${index}`, jsonb(value))
}
for (const [index, value] of ['"\\uD800"', '"\\u0000"', '"a\\u0000b"'].entries()) {
  add(`json unicode input ${index}`, json(value))
  add(`jsonb unicode invalid ${index}`, jsonb(value))
}

const object = json('{"a":1,"b":[2,3],"c":null}')
const objectb = jsonb('{"a":1,"b":[2,3],"c":null}')
const array = json('[10,20,30]')
const arrayb = jsonb('[10,20,30]')
const scalar = json('1')
const scalarb = jsonb('1')
const nil = json(null)
const nilb = jsonb(null)
const duplicate = json('{"a":1,"a":2}')
const whitespace = json(' { "a" : 1 } ')

callable('json typeof object', 'json_typeof', [object])
callable('json typeof array', 'json_typeof', [array])
callable('json typeof scalar', 'json_typeof', [scalar])
callable('json typeof null value', 'json_typeof', [json('null')])
callable('json typeof sql null', 'json_typeof', [nil])
callable('json typeof whitespace array', 'json_typeof', [json('  [1]')])
callable('jsonb typeof object', 'jsonb_typeof', [objectb])
callable('jsonb typeof number', 'jsonb_typeof', [scalarb])
callable('jsonb typeof json null', 'jsonb_typeof', [jsonb('null')])
callable('jsonb typeof sql null', 'jsonb_typeof', [nilb])

callable('json array length', 'json_array_length', [array])
callable('json array length nested', 'json_array_length', [json('[[1],2]')])
callable('json array length empty', 'json_array_length', [json('[]')])
callable('json array length object', 'json_array_length', [json('{}')])
callable('json array length scalar', 'json_array_length', [scalar])
callable('jsonb array length', 'jsonb_array_length', [arrayb])
callable('jsonb array length scalar', 'jsonb_array_length', [scalarb])
callable('jsonb array length object', 'jsonb_array_length', [objectb])

for (const [index, key] of ['a', 'b', 'c', 'missing', '', null].entries()) {
  callable(`json object field ${index}`, '->', [object, text(key)], true)
  callable(`json object field text ${index}`, '->>', [object, text(key)], true)
  callable(`jsonb object field ${index}`, '->', [objectb, text(key)], true)
  callable(`jsonb object field text ${index}`, '->>', [objectb, text(key)], true)
  callable(`json object field fn ${index}`, 'json_object_field', [object, text(key)])
  callable(`json object field text fn ${index}`, 'json_object_field_text', [object, text(key)])
  callable(`jsonb object field fn ${index}`, 'jsonb_object_field', [objectb, text(key)])
  callable(`jsonb object field text fn ${index}`, 'jsonb_object_field_text', [objectb, text(key)])
}

callable('json object field duplicate', '->', [duplicate, text('a')], true)
callable('json object field whitespace', '->', [whitespace, text('a')], true)
callable('json object field on array', '->', [array, text('a')], true)
callable('jsonb object field on array', '->', [arrayb, text('a')], true)
callable('json object field on scalar', '->', [scalar, text('a')], true)
callable('jsonb object field on scalar', '->', [scalarb, text('a')], true)

for (const [index, subscript] of ['0', '1', '2', '-1', '-4', null].entries()) {
  callable(`json array element ${index}`, '->', [array, integer(subscript)], true)
  callable(`json array element text ${index}`, '->>', [array, integer(subscript)], true)
  callable(`jsonb array element ${index}`, '->', [arrayb, integer(subscript)], true)
  callable(`jsonb array element text ${index}`, '->>', [arrayb, integer(subscript)], true)
  callable(`json array element fn ${index}`, 'json_array_element', [array, integer(subscript)])
  callable(`json array element text fn ${index}`, 'json_array_element_text', [
    array,
    integer(subscript),
  ])
  callable(`jsonb array element fn ${index}`, 'jsonb_array_element', [arrayb, integer(subscript)])
  callable(`jsonb array element text fn ${index}`, 'jsonb_array_element_text', [
    arrayb,
    integer(subscript),
  ])
}

callable('json array element of null', '->', [json('[1, null, 3]'), integer('1')], true)
callable('json array element text of null', '->>', [json('[1, null, 3]'), integer('1')], true)
callable('json array element on object', '->', [object, integer('0')], true)
callable('json array element on scalar', '->', [scalar, integer('0')], true)
callable('jsonb array element on object', '->', [objectb, integer('0')], true)
callable('jsonb array element on scalar', '->', [scalarb, integer('0')], true)
callable('jsonb array element text on string', '->>', [jsonb('"hi"'), integer('0')], true)
callable('json array element text on string', '->>', [json('"hi"'), integer('0')], true)
callable('jsonb array element negative scalar', '->', [scalarb, integer('-1')], true)

const nested = json('{"a":{"b":[1,2,3]}}')
const nestedb = jsonb('{"a":{"b":[1,2,3]}}')
for (const [index, path] of [
  ['a'],
  ['a', 'b'],
  ['a', 'b', '1'],
  ['a', 'b', '-1'],
  ['missing'],
  ['a', 'missing'],
  [],
  ['01'],
  ['+1'],
].entries()) {
  const operand = textArray(path)
  callable(`json path ${index}`, '#>', [nested, operand], true)
  callable(`json path text ${index}`, '#>>', [nested, operand], true)
  callable(`jsonb path ${index}`, '#>', [nestedb, operand], true)
  callable(`jsonb path text ${index}`, '#>>', [nestedb, operand], true)
  callable(`json extract path ${index}`, 'json_extract_path', [nested, operand])
  callable(`json extract path text ${index}`, 'json_extract_path_text', [nested, operand])
  callable(`jsonb extract path ${index}`, 'jsonb_extract_path', [nestedb, operand])
  callable(`jsonb extract path text ${index}`, 'jsonb_extract_path_text', [nestedb, operand])
}

callable('json path array index', '#>', [array, textArray(['1'])], true)
callable('json path leading zero index', '#>', [array, textArray(['01'])], true)
callable('jsonb path leading zero index', '#>', [arrayb, textArray(['01'])], true)
callable('json path object numeric key', '#>', [json('{"1":"a"}'), textArray(['1'])], true)
callable('json path null element', '#>', [nested, textArray([null])], true)
callable('json path sql null', '#>', [nested, textArray(null)], true)
callable('jsonb path on scalar', '#>', [jsonb('"hi"'), textArray(['0'])], true)
callable('json path on scalar', '#>', [json('"hi"'), textArray(['0'])], true)

const lefts = [
  jsonb('null'),
  jsonb('""'),
  jsonb('0'),
  jsonb('false'),
  jsonb('[]'),
  jsonb('{}'),
  jsonb('[1]'),
  jsonb('[1,2]'),
  jsonb('[2]'),
  jsonb('{"a":1}'),
  jsonb('{"b":1}'),
  jsonb('{"aa":1}'),
  jsonb('{"b":1,"aa":1}'),
  jsonb('"abc"'),
  jsonb('"z"'),
  jsonb('"B"'),
  jsonb('"a"'),
  jsonb('1.0'),
  jsonb('100'),
  jsonb(null),
]
for (const [index, [left, right]] of (
  [
    [lefts[0]!, lefts[1]!],
    [lefts[1]!, lefts[2]!],
    [lefts[2]!, lefts[3]!],
    [lefts[3]!, lefts[4]!],
    [lefts[4]!, lefts[0]!],
    [lefts[4]!, lefts[5]!],
    [lefts[6]!, lefts[7]!],
    [lefts[8]!, lefts[7]!],
    [lefts[9]!, lefts[10]!],
    [lefts[11]!, lefts[10]!],
    [lefts[13]!, lefts[14]!],
    [lefts[15]!, lefts[16]!],
    [lefts[17]!, lefts[18]!],
    [lefts[19]!, lefts[6]!],
    [lefts[6]!, lefts[6]!],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`jsonb operator ${operation} ${index}`, operation, [left, right], true)
  callable(`jsonb cmp ${index}`, 'jsonb_cmp', [left, right])
}
callable('jsonb function eq', 'jsonb_eq', [lefts[6]!, lefts[7]!])
callable('jsonb function ne', 'jsonb_ne', [lefts[6]!, lefts[7]!])
callable('jsonb function lt', 'jsonb_lt', [lefts[6]!, lefts[7]!])
callable('jsonb function le', 'jsonb_le', [lefts[6]!, lefts[7]!])
callable('jsonb function gt', 'jsonb_gt', [lefts[6]!, lefts[7]!])
callable('jsonb function ge', 'jsonb_ge', [lefts[6]!, lefts[7]!])

for (const [index, [left, right]] of (
  [
    [jsonb('1'), jsonb('1')],
    [jsonb('[1]'), jsonb('1')],
    [jsonb('1'), jsonb('[1]')],
    [jsonb('[1,2]'), jsonb('[1,1]')],
    [jsonb('{"a":[1,2]}'), jsonb('{"a":[1]}')],
    [jsonb('[1]'), jsonb('[]')],
    [jsonb('[]'), jsonb('[1]')],
    [jsonb('{"a":1}'), jsonb('{}')],
    [jsonb('{}'), jsonb('{}')],
    [jsonb('[null]'), jsonb('null')],
    [jsonb('null'), jsonb('[null]')],
    [jsonb('false'), jsonb('false')],
    [jsonb('true'), jsonb('false')],
    [jsonb('[[1]]'), jsonb('[[1]]')],
    [jsonb('[1]'), jsonb('[[1]]')],
    [jsonb(null), jsonb('1')],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  callable(`jsonb contains ${index}`, '@>', [left, right], true)
  callable(`jsonb contained ${index}`, '<@', [right, left], true)
  callable(`jsonb contains fn ${index}`, 'jsonb_contains', [left, right])
  callable(`jsonb contained fn ${index}`, 'jsonb_contained', [right, left])
}

for (const [index, [value, key]] of (
  [
    [jsonb('{"a":1}'), 'a'],
    [jsonb('{"a":1}'), 'b'],
    [jsonb('["a",1]'), 'a'],
    [jsonb('["a",1]'), '1'],
    [jsonb('"hello"'), 'hello'],
    [jsonb('true'), 'true'],
    [jsonb('{"":"x"}'), ''],
    [jsonb('[""]'), ''],
    [jsonb(null), 'a'],
  ] satisfies readonly (readonly [Operand, string])[]
).entries()) {
  callable(`jsonb exists ${index}`, '?', [value, text(key)], true)
  callable(`jsonb exists fn ${index}`, 'jsonb_exists', [value, text(key)])
}

for (const [index, keys] of [['a'], ['a', 'b'], ['b'], [], [null], ['b', 'a']].entries()) {
  callable(`jsonb exists all ${index}`, '?&', [jsonb('{"a":1}'), textArray(keys)], true)
  callable(`jsonb exists any ${index}`, '?|', [jsonb('{"a":1}'), textArray(keys)], true)
  callable(`jsonb exists all fn ${index}`, 'jsonb_exists_all', [jsonb('{"a":1}'), textArray(keys)])
  callable(`jsonb exists any fn ${index}`, 'jsonb_exists_any', [jsonb('{"a":1}'), textArray(keys)])
}

for (const [index, value] of [null, '1', '{"b":2,"a":1}', 'not-json', '"\\u0000"'].entries()) {
  coerce(`json from text ${index}`, 'pg_catalog."json"', text(value))
  coerce(`jsonb from text ${index}`, 'pg_catalog.jsonb', text(value))
}
for (const [index, value] of [null, '1', ' { "a" : 1 } ', '{"a":1,"a":2}'].entries()) {
  coerce(`json to text ${index}`, 'pg_catalog.text', json(value))
  coerce(`jsonb to text ${index}`, 'pg_catalog.text', jsonb(value))
  coerce(`json to jsonb ${index}`, 'pg_catalog.jsonb', json(value))
  coerce(`jsonb to json ${index}`, 'pg_catalog."json"', jsonb(value))
}

add('json null test', {
  sql: `(${nil.sql}) IS NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: false,
    operand: nil.expression,
  },
})
add('jsonb null test', {
  sql: `(${nilb.sql}) IS NOT NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: true,
    operand: nilb.expression,
  },
})
add('json case', {
  sql: `CASE WHEN true THEN (${object.sql}) ELSE (${array.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog."json"',
    branches: [
      {
        when: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
        then: object.expression,
      },
    ],
    otherwise: array.expression,
  },
})
add('jsonb case', {
  sql: `CASE WHEN false THEN (${objectb.sql}) ELSE (${arrayb.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog.jsonb',
    branches: [
      {
        when: { kind: 'boolean', type: 'pg_catalog.bool', value: false },
        then: objectb.expression,
      },
    ],
    otherwise: arrayb.expression,
  },
})
add('json coalesce', {
  sql: `COALESCE((${nil.sql}), (${object.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog."json"',
    operands: [nil.expression, object.expression],
  },
})
add('jsonb coalesce', {
  sql: `COALESCE((${nilb.sql}), (${objectb.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog.jsonb',
    operands: [nilb.expression, objectb.expression],
  },
})

export const jsonSpecs: readonly ExpressionSpec[] = specs
