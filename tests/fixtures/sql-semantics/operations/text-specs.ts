import type { SqlExpression, TextType } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import { textSignatures } from './text-signatures.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: ExpressionSpec[] = []
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `'${value.replaceAll("'", "''")}'::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
})
const integer = (value: number | null): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::int4`,
  expression: {
    kind: 'integer',
    type: 'pg_catalog.int4',
    value: value === null ? null : String(value),
  },
})
const boolean = (value: boolean | null): Operand => ({
  sql: `${value ?? 'NULL'}::bool`,
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
})
function coerce(operand: Operand, type: TextType, length: number | null, explicit = true): Operand {
  const target = type + (length === null ? '' : `(${length})`)
  return {
    sql:
      explicit || length === null
        ? `(${operand.sql})::${target}`
        : `pg_catalog.${type === 'pg_catalog.bpchar' ? 'bpchar' : 'varchar'}((${operand.sql})::${type}, ${length + 4}, false)`,
    expression: { kind: 'text-coercion', type, length, explicit, operand: operand.expression },
  }
}
function add(name: string, operand: Operand): void {
  specs.push({ name, ...operand })
}
function callable(signature: string, operands: readonly Operand[]): Operand {
  const operator = signature.startsWith('operator:')
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  return {
    sql: operator
      ? `((${operands[0]!.sql}) COLLATE "C" ${metadata.name} (${operands[1]!.sql}) COLLATE "C")`
      : `pg_catalog."${metadata.name}"(${operands.map((o) => `(${o.sql})${['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog."varchar"'].includes(o.expression.type) ? ' COLLATE "C"' : ''}`).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      type: metadata.result,
      signature,
      collation: 'C',
      operands: operands.map((o) => o.expression),
    },
  }
}
function combinations(pools: readonly (readonly Operand[])[]): Operand[][] {
  return pools.reduce<Operand[][]>(
    (rows, pool) => rows.flatMap((row) => pool.map((value) => [...row, value])),
    [[]],
  )
}
const strings = [
  null,
  '',
  ' ',
  '  abc  ',
  'a😀é中b',
  'e\u0301',
  '\n\t',
  'abababa',
  "a'b\\c",
  '\u00a0a\u00a0',
  '\u{10000}\ue000',
].map(text)
const positions = [null, -2147483648, -5, -1, 0, 1, 2, 5, 20, 2147483647].map(integer)
const shortStrings = [null, '', ' ', 'ab', '😀é', 'aba', 'aa'].map(text)
const chars = strings.map((value) => coerce(value, 'pg_catalog.bpchar', 6))
const varchars = strings.map((value) => coerce(value, 'pg_catalog."varchar"', null))
for (const [index, value] of strings.entries()) {
  for (const type of ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'] as const) {
    for (const source of [value, chars[index]!, varchars[index]!]) {
      for (const length of type === 'pg_catalog.text' ? [null] : [null, 1, 3, 8]) {
        for (const explicit of [false, true])
          add(
            `text coercion ${index} ${source.expression.type} to ${type}/${length}/${explicit}`,
            coerce(source, type, length, explicit),
          )
      }
    }
  }
}
for (const signature of textSignatures) {
  const metadata = signature.startsWith('operator:')
    ? operatorMetadata(signature)
    : functionMetadata(signature)
  const pools = metadata.args.map((type, index): readonly Operand[] => {
    if (type === 'pg_catalog.bool') return [false, true, null].map(boolean)
    if (type === 'pg_catalog.bpchar') return chars
    if (type === 'pg_catalog."varchar"') return varchars
    if (type === 'pg_catalog.int4') {
      if (metadata.name === 'varchar' || metadata.name === 'bpchar')
        return [-2147483648, -1, 0, 3, 4, 5, 7, 12, null].map(integer)
      return metadata.name === 'repeat'
        ? [null, -2147483648, -5, -1, 0, 1, 2, 5, 20].map(integer)
        : positions
    }
    return metadata.args.length >= 3 ? (index === 0 ? strings.slice(0, 6) : shortStrings) : strings
  })
  for (const [index, operands] of combinations(pools).entries())
    add(`text utility ${signature} ${index}`, callable(signature, operands))
}
for (const type of ['pg_catalog."varchar"', 'pg_catalog.bpchar'] as const)
  for (const value of ['a  ', 'a\t', 'a\u00a0', '😀  ', '😀é', '😀\n'])
    for (const explicit of [false, true])
      add(
        `text truncation ${type}/${JSON.stringify(value)}/${explicit}`,
        coerce(text(value), type, 1, explicit),
      )
for (const type of ['pg_catalog."varchar"', 'pg_catalog.bpchar'] as const) {
  const value = coerce(text('😀a  '), type, 6)
  add(`text ${type} CASE padding`, {
    sql: `CASE WHEN true THEN (${value.sql}) ELSE NULL::${type} END`,
    expression: {
      kind: 'case',
      type,
      branches: [{ when: boolean(true).expression, then: value.expression }],
      otherwise: coerce(text(null), type, null).expression,
    },
  })
  add(`text ${type} COALESCE padding`, {
    sql: `COALESCE(NULL::${type}, (${value.sql}))`,
    expression: {
      kind: 'coalesce',
      type,
      operands: [coerce(text(null), type, null).expression, value.expression],
    },
  })
  add(`text ${type} null test`, {
    sql: `(${value.sql}) IS NULL`,
    expression: {
      kind: 'null-test',
      type: 'pg_catalog.bool',
      negated: false,
      operand: value.expression,
    },
  })
}
add(
  'text repeat allocation overflow',
  callable('function:["pg_catalog","repeat"](pg_catalog.text,pg_catalog.int4)', [
    text('😀'),
    integer(2147483647),
  ]),
)
for (const operand of [boolean(false), boolean(true), boolean(null), ...chars]) {
  const signature = `function:["pg_catalog","text"](${operand.expression.type})`
  add(`text cast ${operand.expression.type}/${operand.sql}`, {
    sql: `(${operand.sql})::text`,
    expression: { kind: 'cast', signature, type: 'pg_catalog.text', operand: operand.expression },
  })
}
add('text relabel cast', {
  sql: "'abc'::text::text",
  expression: {
    kind: 'cast',
    signature: null,
    type: 'pg_catalog.text',
    operand: text('abc').expression,
  },
})
add(
  'text char padding allocation overflow',
  callable('function:["pg_catalog","bpchar"](pg_catalog.bpchar,pg_catalog.int4,pg_catalog.bool)', [
    coerce(text('😀'), 'pg_catalog.bpchar', null),
    integer(2147483647),
    boolean(true),
  ]),
)
const likePairs: readonly (readonly [string | null, string | null])[] = [
  ['abc', 'abc'],
  ['abc', 'a%'],
  ['abc', '%c'],
  ['abc', '%b%'],
  ['abc', 'a_c'],
  ['abc', '_b_'],
  ['abc', '%'],
  ['abc', '%%'],
  ['abc', ''],
  ['', ''],
  ['', '%'],
  ['', '_'],
  ['a', '_'],
  ['ab', '_'],
  ['abc', 'ABC'],
  ['ABC', 'abc'],
  ['%', '\\%'],
  ['_', '\\_'],
  ['a%c', 'a\\%c'],
  ['a_c', 'a\\_c'],
  ['a\\c', 'a\\\\c'],
  ['abc', 'a\\'],
  ['', '\\'],
  ['é', '_'],
  ['😀', '_'],
  ['😀', '__'],
  ['e\u0301', '_'],
  ['e\u0301', '__'],
  ['a😀b', 'a_b'],
  ['a😀b', 'a__b'],
  ['abc', '%_'],
  ['ab', '%_'],
  ['a', '%_'],
  ['', '%_'],
  ['xz', 'x%z'],
  ['xaz', 'x%z'],
  ['xaaz', 'x%z'],
  ['abc', 'a%b%c'],
  ['aabbcc', 'a%b%c'],
  ['abc', '%\\'],
]
for (const [index, [value, pattern]] of likePairs.entries()) {
  add(
    `text like pair ${index}`,
    callable('operator:["pg_catalog","~~"](pg_catalog.text,pg_catalog.text)', [
      text(value),
      text(pattern),
    ]),
  )
  add(
    `text not like pair ${index}`,
    callable('operator:["pg_catalog","!~~"](pg_catalog.text,pg_catalog.text)', [
      text(value),
      text(pattern),
    ]),
  )
}
add(
  'text like bpchar padding exact',
  callable('operator:["pg_catalog","~~"](pg_catalog.bpchar,pg_catalog.text)', [
    coerce(text('abc'), 'pg_catalog.bpchar', 6),
    text('abc'),
  ]),
)
add(
  'text like bpchar padding percent',
  callable('operator:["pg_catalog","~~"](pg_catalog.bpchar,pg_catalog.text)', [
    coerce(text('abc'), 'pg_catalog.bpchar', 6),
    text('abc%'),
  ]),
)
add(
  'text like bpchar padding spaces',
  callable('operator:["pg_catalog","~~"](pg_catalog.bpchar,pg_catalog.text)', [
    coerce(text('abc'), 'pg_catalog.bpchar', 6),
    text('abc   '),
  ]),
)
const likeEscapes: readonly (readonly [string | null, string | null])[] = [
  ['a#%c', '#'],
  ['a\\%c', ''],
  ['a\\%c', '\\'],
  ['%', 'xy'],
  ['a%c', 'é'],
  ['#%', '#'],
  [null, '#'],
  ['a', null],
  ['é%c', 'é'],
]
for (const [index, [pattern, escape]] of likeEscapes.entries()) {
  add(
    `text like escape ${index}`,
    callable('function:["pg_catalog","like_escape"](pg_catalog.text,pg_catalog.text)', [
      text(pattern),
      text(escape),
    ]),
  )
}
const escaped = callable('function:["pg_catalog","like_escape"](pg_catalog.text,pg_catalog.text)', [
  text('a#%c'),
  text('#'),
])
add(
  'text like after custom escape',
  callable('function:["pg_catalog","textlike"](pg_catalog.text,pg_catalog.text)', [
    text('a%c'),
    escaped,
  ]),
)
add(
  'text like after custom escape miss',
  callable('function:["pg_catalog","textlike"](pg_catalog.text,pg_catalog.text)', [
    text('axc'),
    escaped,
  ]),
)
export const textSpecs: readonly ExpressionSpec[] = specs
