import type { ColumnInfo } from '../catalog/types.js'
import { PG18_BUILTIN_GROUPS } from '../postgres/builtins/groups.generated.js'
import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { EvalExpression } from './eval-expressions.js'
import type { EvalBoolExpression } from './check-expressions.js'
import type { ScalarType, SqlExpression } from './expressions.js'

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null
const strings = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const names = value.map((entry) => fields(fields(entry)?.['String'])?.['sval'])
  return names.every((name): name is string => typeof name === 'string') ? names : null
}

export const catalogScalarType = (name: string): ScalarType | null => {
  if (name.startsWith('pg_catalog.'))
    return catalogScalarType(name.slice('pg_catalog.'.length).replaceAll('"', ''))
  const names: Record<string, ScalarType> = {
    boolean: 'pg_catalog.bool',
    bool: 'pg_catalog.bool',
    smallint: 'pg_catalog.int2',
    int2: 'pg_catalog.int2',
    integer: 'pg_catalog.int4',
    int4: 'pg_catalog.int4',
    bigint: 'pg_catalog.int8',
    int8: 'pg_catalog.int8',
    real: 'pg_catalog.float4',
    float4: 'pg_catalog.float4',
    'double precision': 'pg_catalog.float8',
    float8: 'pg_catalog.float8',
    text: 'pg_catalog.text',
    'character varying': 'pg_catalog."varchar"',
    character: 'pg_catalog.bpchar',
  }
  if (name.startsWith('character varying(')) return 'pg_catalog."varchar"'
  if (name.startsWith('character(')) return 'pg_catalog.bpchar'
  return names[name] ?? null
}

const callables = PG18_BUILTIN_GROUPS.flatMap(({ inventory }) =>
  Object.entries(inventory)
    .filter(([, item]) => !item.returnsSet)
    .map(([signature, item]) => ({ signature, item })),
)

type Literal = { kind: 'string' | 'integer' | 'null'; value: string | null }
type Bound = {
  type: ScalarType | null
  value: EvalExpression | null
  literal?: Literal
  collation?: 'C' | 'other'
}
const unknown: Bound = { type: null, value: null }

const literalValue = (literal: Literal, type: ScalarType): SqlExpression | null => {
  if (literal.kind === 'null') {
    if (type === 'pg_catalog.bool') return { kind: 'boolean', type, value: null }
    if (type === 'pg_catalog.text') return { kind: 'text', type, value: null }
    if (/^pg_catalog\.int[248]$/u.test(type))
      return { kind: 'integer', type: type as 'pg_catalog.int4', value: null }
    return null
  }
  if (literal.kind === 'string' && type === 'pg_catalog.text')
    return { kind: 'text', type, value: literal.value }
  if (literal.kind === 'integer' && type === 'pg_catalog.int4')
    return { kind: 'integer', type, value: literal.value }
  return null
}
const materialize = (bound: Bound, type: ScalarType): EvalExpression | null => {
  if (bound.literal) {
    const expression = literalValue(bound.literal, type)
    return expression ? { kind: 'certain', expression } : null
  }
  return bound.type === type ? bound.value : null
}

const candidate = (
  kind: 'operator' | 'function',
  name: string,
  args: readonly Bound[],
): { signature: string; item: BuiltinCallable; operands: EvalExpression[] } | null => {
  const matches = callables.flatMap(({ signature, item }) => {
    if (
      item.kind !== kind ||
      item.schema !== 'pg_catalog' ||
      item.name !== name ||
      item.args.length !== args.length ||
      !catalogScalarType(item.result.slice('pg_catalog.'.length).replaceAll('"', ''))
    )
      return []
    const textArgs = args.filter(
      (arg) =>
        arg.type &&
        ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(arg.type),
    )
    if (
      textArgs.length &&
      (textArgs.some((arg) => arg.collation === 'other') ||
        !textArgs.some((arg) => arg.collation === 'C'))
    )
      return []
    if (
      textArgs.some((arg) => arg.type !== 'pg_catalog.text') &&
      args.some((arg) => arg.literal?.kind === 'string')
    )
      return []
    const operands = args.map((arg, index) => materialize(arg, item.args[index]! as ScalarType))
    return operands.every((value): value is EvalExpression => value !== null)
      ? [{ signature, item, operands: operands as EvalExpression[] }]
      : []
  })
  return matches.length === 1 ? matches[0]! : null
}

export function bindCatalogCheck(
  columns: readonly Pick<ColumnInfo, 'name' | 'typeName' | 'collationIsC'>[],
  root: unknown,
  specialForms: readonly ((node: unknown) => {
    expression: EvalBoolExpression
    inputs: readonly string[]
  } | null)[],
): { expression: EvalBoolExpression; inputs: readonly string[] } {
  const inputs = new Set<string>()
  const bind = (node: unknown): Bound => {
    const wrapper = fields(node)
    if (!wrapper) return unknown
    const cast = fields(wrapper['TypeCast'])
    if (cast) {
      const names = strings(fields(cast['typeName'])?.['names'])
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const type = names ? catalogScalarType(names.at(-1)!) : null
      if (!type) return unknown
      const operand = bind(cast['arg'])
      if (
        type === 'pg_catalog.int4' &&
        operand.literal?.kind === 'string' &&
        typeof operand.literal.value === 'string' &&
        /^-?(?:0|[1-9][0-9]*)$/u.test(operand.literal.value)
      ) {
        const integer = BigInt(operand.literal.value)
        if (integer >= -2147483648n && integer <= 2147483647n)
          return {
            type,
            value: {
              kind: 'certain',
              expression: { kind: 'integer', type, value: integer.toString() },
            },
          }
      }
      if (operand.literal?.kind === 'integer' && /^pg_catalog\.int[248]$/u.test(type))
        return {
          type,
          value: {
            kind: 'certain',
            expression: {
              kind: 'integer',
              type: type as 'pg_catalog.int4',
              value: operand.literal.value,
            },
          },
        }
      const expression = materialize(operand, type)
      return expression ? { type, value: expression } : unknown
    }
    const constant = fields(wrapper['A_Const'])
    if (constant) {
      if (constant['isnull'] === true)
        return { type: null, value: null, literal: { kind: 'null', value: null } }
      const stringNode = fields(constant['sval'])
      if (stringNode) {
        const string = stringNode['sval'] ?? ''
        if (typeof string === 'string')
          return { type: null, value: null, literal: { kind: 'string', value: string } }
      }
      const integerNode = fields(constant['ival'])
      if (integerNode) {
        const integer = integerNode['ival'] ?? 0
        if (typeof integer === 'number')
          return { type: null, value: null, literal: { kind: 'integer', value: String(integer) } }
      }
      const floatNode = fields(constant['fval'])
      const float = floatNode?.['fval']
      if (typeof float === 'string' && /^-?(?:0|[1-9][0-9]*)$/u.test(float)) {
        const integer = BigInt(float)
        if (integer >= -2147483648n && integer <= 2147483647n)
          return { type: null, value: null, literal: { kind: 'integer', value: float } }
      }
      const booleanNode = fields(constant['boolval'])
      if (booleanNode) {
        const boolean = booleanNode['boolval'] ?? false
        if (typeof boolean !== 'boolean') return unknown
        return {
          type: 'pg_catalog.bool',
          value: {
            kind: 'certain',
            expression: {
              kind: 'boolean',
              type: 'pg_catalog.bool',
              value: boolean,
            },
          },
        }
      }
      return unknown
    }
    const names = strings(fields(wrapper['ColumnRef'])?.['fields'])
    if (names?.length === 1) {
      const column = columns.find((item) => item.name === names[0])
      const type = column && catalogScalarType(column.typeName)
      if (type) {
        inputs.add(column.name)
        return {
          type,
          value: { kind: 'input', type, name: column.name },
          ...(type === 'pg_catalog.text' ||
          type === 'pg_catalog."varchar"' ||
          type === 'pg_catalog.bpchar'
            ? { collation: column.collationIsC === true ? ('C' as const) : ('other' as const) }
            : {}),
        }
      }
    }
    const collate = fields(wrapper['CollateClause'])
    if (collate) {
      const inner = bind(collate['arg'])
      const names = strings(collate['collname'])
      return {
        ...inner,
        collation:
          (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
            ? 'C'
            : 'other',
      }
    }
    const operator = fields(wrapper['A_Expr'])
    if (operator?.['kind'] === 'AEXPR_OP') {
      const names = strings(operator['name'])
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      if (!name || operator['lexpr'] === undefined || operator['rexpr'] === undefined)
        return unknown
      return bindCall('operator', name, [operator['lexpr'], operator['rexpr']])
    }
    const call = fields(wrapper['FuncCall'])
    if (call) {
      const names = strings(call['funcname'])
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      const args = call['args'] ?? []
      if (name && Array.isArray(args)) return bindCall('function', name, args)
    }
    const nullTest = fields(wrapper['NullTest'])
    if (nullTest) {
      const operand = bind(nullTest['arg'])
      if (!operand.value) return unknown
      if (nullTest['nulltesttype'] !== 'IS_NULL' && nullTest['nulltesttype'] !== 'IS_NOT_NULL')
        return unknown
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'null-test',
          type: 'pg_catalog.bool',
          negated: nullTest['nulltesttype'] === 'IS_NOT_NULL',
          operand: operand.value,
        },
      }
    }
    return unknown
  }
  const bindCall = (
    kind: 'operator' | 'function',
    name: string,
    nodes: readonly unknown[],
  ): Bound => {
    const args = nodes.map(bind)
    if (args.some((arg) => !arg.value && !arg.literal)) return unknown
    const resolved = candidate(kind, name, args)
    if (!resolved) return unknown
    const type = resolved.item.result as ScalarType
    const textArgs = args.filter(
      (arg) =>
        arg.type &&
        ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(arg.type),
    )
    const collation =
      textArgs.some((arg) => arg.collation === 'C') &&
      !textArgs.some((arg) => arg.collation === 'other')
        ? ('C' as const)
        : undefined
    return {
      type,
      collation,
      value: {
        kind: 'call',
        call: { kind, signature: resolved.signature, type, collation },
        operands: resolved.operands,
      },
    }
  }
  const lower = (node: unknown): EvalBoolExpression => {
    const wrapper = fields(node)
    if (!wrapper) return { kind: 'uncertain' }
    const caseExpression = fields(wrapper['CaseExpr'])
    if (caseExpression) {
      if (caseExpression['arg'] !== undefined) return { kind: 'uncertain' }
      const args = caseExpression['args']
      if (!Array.isArray(args) || args.length === 0) return { kind: 'uncertain' }
      const branches = args.map((item) => fields(fields(item)?.['CaseWhen']))
      if (branches.some((branch) => !branch || !branch['expr'] || !branch['result']))
        return { kind: 'uncertain' }
      return {
        kind: 'eval-case',
        branches: branches.map((branch) => ({
          when: lower(branch!['expr']),
          then: lower(branch!['result']),
        })),
        otherwise: caseExpression['defresult']
          ? lower(caseExpression['defresult'])
          : {
              kind: 'certain',
              expression: { kind: 'boolean', type: 'pg_catalog.bool', value: null },
            },
      }
    }
    const bool = fields(wrapper['BoolExpr'])
    if (bool) {
      const args = bool['args']
      if (!Array.isArray(args) || !args.length) return { kind: 'uncertain' }
      if (bool['boolop'] === 'NOT_EXPR')
        return args.length === 1
          ? { kind: 'eval-boolean-logic', operation: 'not', operands: [lower(args[0])] }
          : { kind: 'uncertain' }
      const operation =
        bool['boolop'] === 'AND_EXPR' ? 'and' : bool['boolop'] === 'OR_EXPR' ? 'or' : null
      if (!operation) return { kind: 'uncertain' }
      return args.slice(1).reduce<EvalBoolExpression>(
        (left, right) => ({
          kind: 'eval-boolean-logic',
          operation,
          operands: [left, lower(right)],
        }),
        lower(args[0]),
      )
    }
    for (const form of specialForms) {
      const result = form(node)
      if (result) {
        for (const name of result.inputs) inputs.add(name)
        return result.expression
      }
    }
    const value = bind(node)
    return value.type === 'pg_catalog.bool' && value.value
      ? { kind: 'eval-scalar', expression: value.value }
      : { kind: 'uncertain' }
  }
  return { expression: lower(root), inputs: [...inputs].sort() }
}
