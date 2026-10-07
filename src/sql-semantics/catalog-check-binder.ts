import { parseSync } from 'libpg-query'
import type { ColumnInfo, DomainInfo, EnumInfo } from '../catalog/types.js'
import { PG18_BUILTIN_GROUPS } from '../postgres/builtins/groups.generated.js'
import { builtinCast, builtinMetadata } from '../postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { EvalExpression } from './eval-expressions.js'
import type { EvalBoolExpression } from './check-expressions.js'
import {
  combineCollations,
  defaultCollation,
  supportsTextCallableCollation,
  type BoundCollation,
} from './collation.js'
import {
  enumType,
  isBinaryTextRelabel,
  isBinaryBitRelabel,
  enumEqualityOperation,
  type ScalarType,
  type SqlExpression,
} from './expressions.js'

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null
const strings = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const names = value.map((entry) => fields(fields(entry)?.['String'])?.['sval'])
  return names.every((name): name is string => typeof name === 'string') ? names : null
}

export type CheckColumn = Pick<ColumnInfo, 'name' | 'typeName' | 'collationIsC' | 'isRowType'> &
  Partial<
    Pick<ColumnInfo, 'typeOid' | 'collationDeterministic' | 'collationIsDefault' | 'collationOid'>
  >

export function catalogEnumDefinition(
  name: string,
  enums: readonly EnumInfo[],
  oid?: number,
  domains: readonly DomainInfo[] = [],
): EnumInfo | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const definition = enums.find((item) => item.oid === oid)
    if (definition) return definition
    const domain = domains.find((item) => item.oid === oid)
    if (!domain) break
    oid = domain.baseTypeOid
  }
  if (oid !== undefined) return null
  try {
    const parsed = parseSync(`SELECT NULL::${name}`)
    const select = fields(fields(parsed.stmts?.[0]?.stmt)?.['SelectStmt'])
    const targets = select?.['targetList']
    const target = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget']) : null
    const cast = fields(fields(target?.['val'])?.['TypeCast'])
    const type = fields(cast?.['typeName'])
    if (Array.isArray(type?.['arrayBounds']) && type['arrayBounds'].length) return null
    const names = strings(type?.['names'])
    const matches = enums.filter((item) =>
      names?.length === 2
        ? item.schema === names[0] && item.name === names[1]
        : names?.length === 1 && item.name === names[0],
    )
    return matches.length === 1 ? matches[0]! : null
  } catch {
    return null
  }
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
    numeric: 'pg_catalog."numeric"',
    decimal: 'pg_catalog."numeric"',
    inet: 'pg_catalog.inet',
    cidr: 'pg_catalog.cidr',
    uuid: 'pg_catalog.uuid',
    macaddr: 'pg_catalog.macaddr',
    macaddr8: 'pg_catalog.macaddr8',
    bytea: 'pg_catalog.bytea',
    bit: 'pg_catalog."bit"',
    '"bit"': 'pg_catalog."bit"',
    varbit: 'pg_catalog.varbit',
    'bit varying': 'pg_catalog.varbit',
    date: 'pg_catalog.date',
    timestamp: 'pg_catalog."timestamp"',
    'timestamp without time zone': 'pg_catalog."timestamp"',
    timestamptz: 'pg_catalog.timestamptz',
    'timestamp with time zone': 'pg_catalog.timestamptz',
    text: 'pg_catalog.text',
    'character varying': 'pg_catalog."varchar"',
    varchar: 'pg_catalog."varchar"',
    character: 'pg_catalog.bpchar',
    bpchar: 'pg_catalog.bpchar',
  }
  if (/^(?:numeric|decimal)\(/u.test(name)) return 'pg_catalog."numeric"'
  if (/^bit\(\d+\)$/u.test(name)) return 'pg_catalog."bit"'
  if (/^(?:bit varying|varbit)\(\d+\)$/u.test(name)) return 'pg_catalog.varbit'
  if (name.startsWith('character varying(')) return 'pg_catalog."varchar"'
  if (name.startsWith('character(')) return 'pg_catalog.bpchar'
  if (/^timestamp\(\d+\) without time zone$/u.test(name)) return 'pg_catalog."timestamp"'
  if (/^timestamp\(\d+\) with time zone$/u.test(name)) return 'pg_catalog.timestamptz'
  return names[name] ?? null
}

export function catalogDateType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogTemporalType(name, oid, domains) === 'pg_catalog.date'
}

function catalogBaseScalarType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): ScalarType | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const domain = domains.find((domain) => domain.oid === oid)
    if (!domain) break
    name = domain.baseTypeName
    oid = domain.baseTypeOid
  }
  return catalogScalarType(name)
}

export function catalogNumericType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog."numeric"'
}

export function catalogTemporalType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): 'pg_catalog.date' | 'pg_catalog."timestamp"' | 'pg_catalog.timestamptz' | null {
  const type = catalogBaseScalarType(name, oid, domains)
  return type === 'pg_catalog.date' ||
    type === 'pg_catalog."timestamp"' ||
    type === 'pg_catalog.timestamptz'
    ? type
    : null
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
  collation?: BoundCollation
  enum?: EnumInfo
}
const unknown: Bound = { type: null, value: null }

const literalValue = (literal: Literal, type: ScalarType): SqlExpression | null => {
  if (
    (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'bit', type, value: literal.value }
  if (type === 'pg_catalog.uuid' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'uuid', type, value: literal.value }
  if (type === 'pg_catalog.bytea') {
    if (literal.kind === 'null') return { kind: 'bytea', type, value: null }
    return null
  }
  if (
    (type === 'pg_catalog.date' ||
      type === 'pg_catalog."timestamp"' ||
      type === 'pg_catalog.timestamptz') &&
    (literal.kind === 'null' || literal.kind === 'string')
  ) {
    return { kind: 'temporal', type, value: literal.value }
  }
  if (
    (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'network', type, value: literal.value }
  if (
    (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'mac', type, value: literal.value }
  if (type === 'pg_catalog."numeric"') return { kind: 'decimal', type, value: literal.value }
  if (literal.kind === 'null') {
    if (type === 'pg_catalog.bool') return { kind: 'boolean', type, value: null }
    if (
      type === 'pg_catalog.text' ||
      type === 'pg_catalog."varchar"' ||
      type === 'pg_catalog.bpchar'
    )
      return { kind: 'text', type, value: null }
    if (/^pg_catalog\.int[248]$/u.test(type))
      return {
        kind: 'integer',
        type: type as 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8',
        value: null,
      }
    return null
  }
  if (
    literal.kind === 'string' &&
    (type === 'pg_catalog.text' || type === 'pg_catalog."varchar"' || type === 'pg_catalog.bpchar')
  )
    return { kind: 'text', type, value: literal.value }
  if (
    literal.kind === 'integer' &&
    (type === 'pg_catalog.int2' || type === 'pg_catalog.int4' || type === 'pg_catalog.int8')
  ) {
    const integer = BigInt(literal.value!)
    const limit =
      type === 'pg_catalog.int2'
        ? 32767n
        : type === 'pg_catalog.int4'
          ? 2147483647n
          : 9223372036854775807n
    return integer >= -limit - 1n && integer <= limit
      ? { kind: 'integer', type, value: literal.value }
      : null
  }
  return null
}
const materialize = (
  bound: Bound,
  type: ScalarType,
  definition = bound.enum,
): EvalExpression | null => {
  if (
    type === 'pg_catalog."numeric"' &&
    bound.value?.kind === 'certain' &&
    bound.value.expression.kind === 'integer'
  ) {
    const constant = bound.value.expression
    if (
      constant.type === 'pg_catalog.int2' ||
      constant.type === 'pg_catalog.int4' ||
      constant.type === 'pg_catalog.int8'
    ) {
      const checked = literalValue(
        { kind: constant.value === null ? 'null' : 'integer', value: constant.value },
        constant.type,
      )
      return checked
        ? { kind: 'certain', expression: { kind: 'decimal', type, value: constant.value } }
        : null
    }
  }
  if (bound.literal) {
    if (type === 'pg_catalog.bytea' && bound.literal.kind === 'string')
      return {
        kind: 'text-to-bytea',
        type,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }
    if (type.startsWith('enum:') && definition && enumType(definition) === type) {
      const value = bound.literal.value
      return bound.literal.kind === 'null' ||
        (bound.literal.kind === 'string' && value !== null && definition.values.includes(value))
        ? {
            kind: 'certain',
            expression: { kind: 'enum', type: enumType(definition), enum: definition, value },
          }
        : null
    }
    const expression = literalValue(bound.literal, type)
    return expression ? { kind: 'certain', expression } : null
  }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    isBinaryBitRelabel(bound.type, type)
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type === 'pg_catalog.cidr' &&
    type === 'pg_catalog.inet' &&
    bound.value &&
    builtinCast(bound.type, type)?.method === 'b'
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(bound.type) &&
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(type) &&
    builtinCast(bound.type, type)?.context === 'i'
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    isMacType(bound.type) &&
    isMacType(type)
  ) {
    const cast = builtinCast(bound.type, type)
    if (cast?.context === 'i' && cast.method === 'f' && cast.implementation !== null)
      return {
        kind: 'call',
        call: { kind: 'cast', signature: cast.implementation, type },
        operands: [bound.value],
      }
  }
  return bound.type === type ? bound.value : null
}

type ResolvedCallable = {
  signature: string
  item: BuiltinCallable
  operands: EvalExpression[]
  collation?: BoundCollation
}
const boundType = (arg: Bound): ScalarType | null =>
  arg.type ?? (arg.literal?.kind === 'integer' ? 'pg_catalog.int4' : null)
const isIntegerType = (type: string | null): boolean =>
  type !== null && /^pg_catalog\.int[248]$/u.test(type)

const materializeInteger = (arg: Bound, target: ScalarType): EvalExpression | null => {
  const source = boundType(arg)
  const value = materialize(arg, source ?? target)
  if (!value || source === null || source === target) return value
  const cast = builtinCast(source, target)
  return cast?.context === 'i' && cast.method === 'f' && cast.implementation !== null
    ? {
        kind: 'call',
        call: { kind: 'cast', signature: cast.implementation, type: target },
        operands: [value],
      }
    : null
}

const isMacType = (type: string | null): boolean =>
  type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8'

const macCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  return types.length && types.every(isMacType) ? types[0] : undefined
}

const bitCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  return types.length && types.every((type) => isBinaryBitRelabel(type, type))
    ? types[0]
    : undefined
}

const networkCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  if (
    !types.length ||
    types.some((type) => type !== 'pg_catalog.inet' && type !== 'pg_catalog.cidr')
  )
    return undefined
  return types.includes('pg_catalog.inet') ? 'pg_catalog.inet' : 'pg_catalog.cidr'
}

const integerCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.map(boundType)
  if (!types.some(isIntegerType)) return undefined
  if (types.some((type) => type !== null && !isIntegerType(type))) return undefined
  let selected: ScalarType | null = null
  for (const type of types) {
    if (type === null || type === selected) continue
    if (
      selected === null ||
      (builtinCast(selected, type)?.context === 'i' && builtinCast(type, selected)?.context !== 'i')
    )
      selected = type
  }
  return selected ?? undefined
}

const integerCandidate = (
  kind: 'operator' | 'function',
  name: string,
  args: readonly Bound[],
): ResolvedCallable | null | undefined => {
  const types = args.map(boundType)
  if (
    !types.some(isIntegerType) ||
    types.some((type) => type !== null && !isIntegerType(type)) ||
    args.some((arg, index) => types[index] === null && arg.literal?.kind !== 'null')
  )
    return undefined
  const matches = callables.filter(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      item.args.length === args.length &&
      item.args.every((target, index) => {
        const source = types[index]!
        return source === null || source === target || builtinCast(source, target)?.context === 'i'
      }),
  )
  let exactTypes = types
  if (kind === 'operator' && types.length === 2 && types.includes(null)) {
    const known = types.find((type) => type !== null)!
    exactTypes = types.map((type) => type ?? known)
  }
  const exact = matches.filter(({ item }) =>
    item.args.every((type, index) => type === exactTypes[index]),
  )
  const scores = matches.map(
    ({ item }) => item.args.filter((type, index) => type === types[index]).length,
  )
  const maximum = Math.max(-1, ...scores)
  const best = exact.length ? exact : matches.filter((_, index) => scores[index] === maximum)
  if (best.length !== 1) return null
  const selected = best[0]!
  if (!selected.item.args.every(isIntegerType) || !catalogScalarType(selected.item.result))
    return null
  const operands = args.map((arg, index): EvalExpression | null => {
    const target = selected.item.args[index]! as ScalarType
    return materializeInteger(arg, target)
  })
  return operands.every((value): value is EvalExpression => value !== null)
    ? { ...selected, operands }
    : null
}

const candidate = (
  kind: 'operator' | 'function',
  name: string,
  args: readonly Bound[],
): ResolvedCallable | null => {
  const integer = integerCandidate(kind, name, args)
  if (integer !== undefined) return integer
  const collation = combineCollations(args.map((arg) => arg.collation))
  const matches = callables.flatMap(({ signature, item }) => {
    if (
      item.kind !== kind ||
      item.schema !== 'pg_catalog' ||
      item.name !== name ||
      item.args.length !== args.length ||
      !catalogScalarType(item.result.slice('pg_catalog.'.length).replaceAll('"', ''))
    )
      return []
    if (
      item.args.some((type) =>
        ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type),
      ) &&
      !supportsTextCallableCollation(signature, collation?.kind)
    )
      return []
    const definition = args.find((arg) => arg.enum)?.enum
    const enumCall = item.args.includes('pg_catalog.anyenum')
    if (enumCall && (!definition || !enumEqualityOperation(signature))) return []
    const operands = args.map((arg, index) =>
      isIntegerType(item.args[index]!)
        ? materializeInteger(arg, item.args[index]! as ScalarType)
        : materialize(
            arg,
            item.args[index] === 'pg_catalog.anyenum'
              ? enumType(definition!)
              : (item.args[index]! as ScalarType),
            definition,
          ),
    )
    return operands.every((value): value is EvalExpression => value !== null)
      ? [{ signature, item, operands: operands as EvalExpression[], collation }]
      : []
  })
  const types = args.map(boundType)
  const exact = matches.filter(({ item }) =>
    item.args.every((type, index) => type === types[index]),
  )
  if (exact.length === 1) return exact[0]!
  if (kind === 'operator' && args.length === 2) {
    const known = types.filter((type) => type !== null)
    if (known.length === 1 && args.some((arg, index) => types[index] === null && arg.literal)) {
      const assumed = matches.filter(({ item }) => item.args.every((type) => type === known[0]))
      if (assumed.length === 1) return assumed[0]!
    }
  }
  if (
    kind === 'operator' &&
    types.includes('pg_catalog.varbit') &&
    types.every((type) => type !== null && isBinaryBitRelabel(type, type))
  ) {
    const preferred = matches.filter(({ item }) =>
      item.args.every((type) => type === 'pg_catalog.varbit'),
    )
    if (preferred.length === 1) return preferred[0]!
  }
  return matches.length === 1 ? matches[0]! : null
}

const containsColumn = (node: unknown): boolean => {
  if (Array.isArray(node)) return node.some(containsColumn)
  const wrapper = fields(node)
  return (
    wrapper !== null &&
    (wrapper['ColumnRef'] !== undefined || Object.values(wrapper).some(containsColumn))
  )
}
const arrayConstructor = (
  node: unknown,
): { members: unknown[]; type: ScalarType | null } | null => {
  const wrapper = fields(node)
  if (!wrapper) return null
  const cast = fields(wrapper['TypeCast'])
  if (cast) {
    const typeName = fields(cast['typeName'])
    const names = strings(typeName?.['names'])
    const bounds = typeName?.['arrayBounds']
    if (
      !names ||
      (names.length > 1 && names[0] !== 'pg_catalog') ||
      !Array.isArray(bounds) ||
      bounds.length !== 1
    )
      return null
    const type = catalogScalarType(names.at(-1)!)
    const inner = arrayConstructor(cast['arg'])
    return type && inner && (!inner.type || inner.type === type) ? { ...inner, type } : null
  }
  const array = fields(wrapper['A_ArrayExpr'])
  const members = array?.['elements']
  return Array.isArray(members) && members.length > 0 ? { members, type: null } : null
}

export function bindCatalogCheck(
  columns: readonly CheckColumn[],
  root: unknown,
  specialForms: readonly ((node: unknown) => {
    expression: EvalBoolExpression
    inputs: readonly string[]
  } | null)[],
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
): { expression: EvalBoolExpression; inputs: readonly string[] } {
  const inputs = new Set<string>()
  const bind = (node: unknown, expectedType?: ScalarType): Bound => {
    const wrapper = fields(node)
    if (!wrapper) return unknown
    const coalesce = fields(wrapper['CoalesceExpr'])
    if (coalesce) {
      const nodes = coalesce['args']
      if (!Array.isArray(nodes) || !nodes.length) return unknown
      const args = nodes.map((arg) => bind(arg))
      if (args.some((arg) => !arg.value && !arg.literal)) return unknown
      const integerType = integerCommonType(args)
      const typed = args.flatMap((arg) => (arg.type ? [arg.type] : []))
      const textTypes = ['pg_catalog.text', 'pg_catalog."varchar"']
      const networkType = networkCommonType(args)
      const bitType = bitCommonType(args)
      const macType = macCommonType(args)
      const type = integerType ?? networkType ?? macType ?? bitType ?? typed[0] ?? 'pg_catalog.text'
      if (
        integerType === undefined &&
        networkType === undefined &&
        macType === undefined &&
        bitType === undefined &&
        typed.some(
          (other) => other !== type && !(textTypes.includes(type) && textTypes.includes(other)),
        )
      )
        return unknown
      const definition = args.find((arg) => arg.enum)?.enum
      const operands = args.map((arg, index): EvalExpression | null =>
        type === 'pg_catalog.bool' && arg.type === 'pg_catalog.bool'
          ? { kind: 'check', type, expression: lower(nodes[index]) }
          : integerType === undefined
            ? materialize(arg, type, definition)
            : materializeInteger(arg, type),
      )
      if (!operands.every((value): value is EvalExpression => value !== null)) return unknown
      return {
        type,
        ...(definition ? { enum: definition } : {}),
        ...(['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
          ? { collation: combineCollations(args.map((arg) => arg.collation)) }
          : {}),
        value: { kind: 'coalesce', type, operands },
      }
    }
    const caseExpression = fields(wrapper['CaseExpr'])
    if (caseExpression) {
      const args = caseExpression['args']
      if (!Array.isArray(args) || !args.length) return unknown
      const branches = args.map((item) => fields(fields(item)?.['CaseWhen']))
      if (branches.some((branch) => !branch || !branch['expr'] || !branch['result'])) return unknown
      const results = branches.map((branch) => bind(branch!['result']))
      const otherwise = caseExpression['defresult']
        ? bind(caseExpression['defresult'])
        : ({ type: null, value: null, literal: { kind: 'null', value: null } } as Bound)
      const arms = [...results, otherwise]
      const integerType = integerCommonType([otherwise, ...results])
      const typed = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
      const networkType = networkCommonType(arms)
      const bitType = bitCommonType([otherwise, ...results])
      const macType = macCommonType([otherwise, ...results])
      const type =
        integerType ??
        networkType ??
        macType ??
        bitType ??
        expectedType ??
        typed[0] ??
        (arms.some((arm) => arm.literal?.kind === 'integer')
          ? 'pg_catalog.int4'
          : 'pg_catalog.text')
      if (
        integerType === undefined &&
        networkType === undefined &&
        macType === undefined &&
        bitType === undefined &&
        typed.some((other) => other !== type)
      )
        return unknown
      const definition = arms.find((arm) => arm.enum)?.enum
      const values = arms.map((arm) =>
        integerType === undefined
          ? materialize(arm, type, definition)
          : materializeInteger(arm, type),
      )
      if (type !== 'pg_catalog.bool' && values.some((value) => !value)) return unknown
      const collation = ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
        type,
      )
        ? combineCollations(arms.map((arm) => arm.collation))
        : undefined
      const scrutinee = caseExpression['arg'] === undefined ? null : bind(caseExpression['arg'])
      let simple: Extract<EvalExpression, { kind: 'case' }>['scrutinee']
      let equalities: Extract<EvalExpression, { kind: 'case' }>['branches'][number]['equality'][] =
        []
      let conditions: EvalExpression[]
      if (scrutinee) {
        const matches = branches.map((branch) => bind(branch!['expr'], scrutinee.type ?? undefined))
        const compareType =
          scrutinee.type ??
          matches.find((match) => match.type)?.type ??
          (scrutinee.literal?.kind === 'integer' ? 'pg_catalog.int4' : 'pg_catalog.text')
        const value = materialize(scrutinee, compareType)
        if (!value) return unknown
        const resolved = matches.map((match) =>
          candidate('operator', '=', [
            { ...scrutinee, type: compareType, value, literal: undefined },
            match,
          ]),
        )
        if (resolved.some((match) => !match)) return unknown
        simple = { expression: resolved[0]!.operands[0]! }
        equalities = resolved.map((match) => ({
          kind: 'operator',
          signature: match!.signature,
          type: 'pg_catalog.bool',
          collation: match!.collation?.kind,
        }))
        conditions = resolved.map((match) => match!.operands[1]!)
      } else {
        conditions = branches.map((branch) => ({
          kind: 'check',
          type: 'pg_catalog.bool',
          expression: lower(branch!['expr']),
        }))
      }
      return {
        type,
        ...(definition ? { enum: definition } : {}),
        collation,
        value: {
          kind: 'case',
          type,
          ...(simple ? { scrutinee: simple } : {}),
          branches: results.map((_, index) => ({
            ...(simple ? { equality: equalities[index]! } : {}),
            when: conditions[index]!,
            then:
              type === 'pg_catalog.bool'
                ? {
                    kind: 'check',
                    type: 'pg_catalog.bool',
                    expression: lower(branches[index]!['result']),
                  }
                : values[index]!,
          })),
          otherwise:
            type === 'pg_catalog.bool'
              ? caseExpression['defresult']
                ? {
                    kind: 'check',
                    type: 'pg_catalog.bool',
                    expression: lower(caseExpression['defresult']),
                  }
                : {
                    kind: 'certain',
                    expression: { kind: 'boolean', type: 'pg_catalog.bool', value: null },
                  }
              : values.at(-1)!,
        },
      }
    }
    if (fields(wrapper['BoolExpr']))
      return {
        type: 'pg_catalog.bool',
        value: { kind: 'check', type: 'pg_catalog.bool', expression: lower(node) },
      }
    const cast = fields(wrapper['TypeCast'])
    if (cast) {
      const castType = fields(cast['typeName'])
      const names = strings(castType?.['names'])
      const bounds = castType?.['arrayBounds']
      if (Array.isArray(bounds) && bounds.length) return unknown
      const definitions = enums.filter((item) =>
        names?.length === 2
          ? item.schema === names[0] && item.name === names[1]
          : names?.length === 1 && item.name === names[0],
      )
      const definition =
        definitions.length === 1
          ? definitions[0]
          : definitions.find((item) => enumType(item) === expectedType)
      if (definition) {
        const type = enumType(definition)
        const operand = bind(cast['arg'])
        const value = materialize(operand, type, definition)
        return value ? { type, value, enum: definition } : unknown
      }
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const type = names ? catalogScalarType(names.at(-1)!) : null
      if (!type) return unknown
      if (
        (type === 'pg_catalog.timestamptz' ||
          type === 'pg_catalog."timestamp"' ||
          type === 'pg_catalog."numeric"' ||
          type === 'pg_catalog."varchar"' ||
          type === 'pg_catalog.bpchar') &&
        Array.isArray(castType?.['typmods']) &&
        castType['typmods'].length
      )
        return unknown
      const operand = bind(cast['arg'])
      if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') {
        const modifiers = castType?.['typmods']
        let width = -1
        if (Array.isArray(modifiers) && modifiers.length) {
          if (modifiers.length !== 1) return unknown
          const constant = fields(fields(modifiers[0])?.['A_Const'])
          const length = fields(constant?.['ival'])?.['ival']
          if (
            typeof length !== 'number' ||
            !Number.isInteger(length) ||
            length <= 0 ||
            length > 2147483640
          )
            return unknown
          width = length
        }
        let value: EvalExpression | null = null
        const source = boundType(operand)
        if (isIntegerType(source)) {
          const conversion = source ? builtinCast(source, type) : null
          if (conversion?.method !== 'f' || !conversion.implementation) return unknown
          const input = materialize(operand, source!)
          if (!input) return unknown
          return {
            type,
            value: {
              kind: 'call',
              call: { kind: 'function', signature: conversion.implementation, type },
              operands: [
                input,
                {
                  kind: 'certain',
                  expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(width) },
                },
              ],
            },
          }
        }
        if (
          (!operand.type && operand.literal) ||
          operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"'
        ) {
          const text = materialize(operand, 'pg_catalog.text')
          if (text) value = { kind: 'text-to-bit', type, operand: text }
        } else if (operand.type === 'pg_catalog."bit"' || operand.type === 'pg_catalog.varbit') {
          value = materialize(operand, type)
        }
        if (!value) return unknown
        if (width === -1) return { type, value }
        const conversion = builtinCast(type, type)
        if (conversion?.method !== 'f' || !conversion.implementation) return unknown
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              value,
              {
                kind: 'certain',
                expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(width) },
              },
              {
                kind: 'certain',
                expression: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
              },
            ],
          },
        }
      }
      if (
        operand.type === 'pg_catalog."bit"' &&
        (type === 'pg_catalog.int4' || type === 'pg_catalog.int8') &&
        operand.value
      ) {
        const conversion = builtinCast(operand.type, type)
        return conversion?.method === 'f' && conversion.implementation
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (
        (operand.type === 'pg_catalog."bit"' || operand.type === 'pg_catalog.varbit') &&
        type === 'pg_catalog.text' &&
        operand.value
      )
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'bit-to-text', type, operand: operand.value },
        }
      if (
        (operand.type === 'pg_catalog.inet' || operand.type === 'pg_catalog.cidr') &&
        type === 'pg_catalog.text' &&
        operand.value
      ) {
        const conversion = builtinCast(operand.type, type)
        if (conversion?.method !== 'f' || !conversion.implementation) return unknown
        const implementation = builtinMetadata(conversion.implementation)
        if (implementation.kind !== 'function' || implementation.args.length !== 1) return unknown
        const value = materialize(operand, implementation.args[0]! as ScalarType)
        return value
          ? {
              type,
              collation: defaultCollation,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [value],
              },
            }
          : unknown
      }
      if (operand.type === 'pg_catalog.uuid' && type === 'pg_catalog.text' && operand.value)
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'uuid-to-text', type, operand: operand.value },
        }
      if (
        type === 'pg_catalog.bytea' &&
        (operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"' ||
          operand.type === 'pg_catalog.bpchar') &&
        operand.value
      ) {
        const text =
          operand.type === 'pg_catalog.bpchar'
            ? operand.value
            : materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-bytea', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.uuid' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-uuid', type, operand: text } } : unknown
      }
      if (isMacType(operand.type) && type === 'pg_catalog.text' && operand.value)
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'mac-to-text', type, operand: operand.value },
        }
      if (isMacType(operand.type) && isMacType(type) && operand.type !== type && operand.value) {
        const cast = builtinCast(operand.type!, type)
        return cast?.method === 'f' && cast.implementation !== null
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: cast.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (
        (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-mac', type, operand: text } } : unknown
      }
      if (operand.type === 'pg_catalog.cidr' && type === 'pg_catalog.inet' && operand.value)
        return { type, value: materialize(operand, type) }
      if (operand.type === 'pg_catalog.inet' && type === 'pg_catalog.cidr' && operand.value) {
        const conversion = builtinCast(operand.type, type)
        return conversion?.method === 'f' && conversion.implementation !== null
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (operand.type && operand.value && isBinaryBitRelabel(operand.type, type))
        return { type, value: materialize(operand, type) }
      if (operand.type && operand.value && isBinaryTextRelabel(operand.type, type))
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'cast', signature: null, type },
            operands: [operand.value],
          },
          collation: operand.collation ?? defaultCollation,
        }
      if (
        (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-network', type, operand: text } } : unknown
      }
      if (type === 'pg_catalog.date' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-date', type, operand: operand.value },
        }
      if (type === 'pg_catalog."timestamp"' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-timestamp', type, operand: operand.value },
        }
      if (type === 'pg_catalog.timestamptz' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-timestamptz', type, operand: operand.value },
        }
      if (
        (type === 'pg_catalog.int2' || type === 'pg_catalog.int4' || type === 'pg_catalog.int8') &&
        operand.literal?.kind === 'string' &&
        typeof operand.literal.value === 'string' &&
        /^-?(?:0|[1-9][0-9]*)$/u.test(operand.literal.value)
      ) {
        const integer = BigInt(operand.literal.value)
        const limit =
          type === 'pg_catalog.int2'
            ? 32767n
            : type === 'pg_catalog.int4'
              ? 2147483647n
              : 9223372036854775807n
        if (integer >= -limit - 1n && integer <= limit)
          return {
            type,
            value: {
              kind: 'certain',
              expression: { kind: 'integer', type, value: integer.toString() },
            },
          }
      }
      const expression = materialize(operand, type)
      if (expression)
        return {
          type,
          value: expression,
          ...(['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
            ? { collation: operand.collation ?? defaultCollation }
            : {}),
        }
      const source =
        operand.type ?? (operand.literal?.kind === 'integer' ? 'pg_catalog.int4' : null)
      if (source) {
        const value = materialize(operand, source)
        if (!value) return unknown
        const conversion = builtinCast(source, type)
        if (
          conversion?.method === 'f' &&
          conversion.implementation !== null &&
          builtinMetadata(conversion.implementation).args.length === 1 &&
          builtinMetadata(conversion.implementation).volatility === 'i'
        )
          return {
            type,
            value: {
              kind: 'call',
              call: { kind: 'cast', signature: conversion.implementation, type },
              operands: [value],
            },
            ...(['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
              ? { collation: operand.collation ?? defaultCollation }
              : {}),
          }
      }
      return unknown
    }
    const constant = fields(wrapper['A_Const'])
    if (constant) {
      if (constant['isnull'] === true)
        return { type: null, value: null, literal: { kind: 'null', value: null } }
      const bitNode = fields(constant['bsval'])
      const bit = bitNode?.['bsval']
      if (typeof bit === 'string')
        return {
          type: 'pg_catalog."bit"',
          value: {
            kind: 'certain',
            expression: { kind: 'bit', type: 'pg_catalog."bit"', value: bit },
          },
        }
      const stringNode = fields(constant['sval'])
      if (stringNode) {
        const string = stringNode['sval'] ?? ''
        if (typeof string === 'string')
          return {
            type: null,
            value: null,
            literal: { kind: 'string', value: string },
            collation: defaultCollation,
          }
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
        if (integer >= -9223372036854775808n && integer <= 9223372036854775807n)
          return {
            type: 'pg_catalog.int8',
            literal: { kind: 'integer', value: float },
            value: {
              kind: 'certain',
              expression: { kind: 'integer', type: 'pg_catalog.int8', value: float },
            },
          }
      }
      if (typeof float === 'string')
        return {
          type: 'pg_catalog."numeric"',
          value: {
            kind: 'certain',
            expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value: float },
          },
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
      const definition =
        column && catalogEnumDefinition(column.typeName, enums, column.typeOid, domains)
      if (definition) {
        inputs.add(column.name)
        const type = enumType(definition)
        return {
          type,
          enum: definition,
          value: { kind: 'input', type, name: column.name, enum: definition },
        }
      }
      const type = column && catalogBaseScalarType(column.typeName, column.typeOid, domains)
      if (type) {
        inputs.add(column.name)
        return {
          type,
          value: { kind: 'input', type, name: column.name },
          ...(type === 'pg_catalog.text' ||
          type === 'pg_catalog."varchar"' ||
          type === 'pg_catalog.bpchar'
            ? {
                collation: {
                  kind:
                    column.collationIsC === true
                      ? ('C' as const)
                      : column.collationDeterministic === true
                        ? ('deterministic' as const)
                        : ('other' as const),
                  identity:
                    column.collationIsC === true
                      ? 'C'
                      : column.collationIsDefault === true
                        ? 'default'
                        : (column.collationOid ?? `column:${column.name}`),
                  ...(column.collationIsDefault === true ? { default: true as const } : {}),
                },
              }
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
        collation: {
          kind:
            (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
              ? 'C'
              : 'other',
          identity:
            (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
              ? 'C'
              : `explicit:${JSON.stringify(names)}`,
          explicit: true,
        },
      }
    }
    const operator = fields(wrapper['A_Expr'])
    if (
      operator &&
      ['AEXPR_BETWEEN', 'AEXPR_NOT_BETWEEN', 'AEXPR_BETWEEN_SYM', 'AEXPR_NOT_BETWEEN_SYM'].includes(
        String(operator['kind']),
      )
    ) {
      const bounds = fields(fields(operator['rexpr'])?.['List'])?.['items']
      if (!Array.isArray(bounds) || bounds.length !== 2 || operator['lexpr'] === undefined)
        return unknown
      const negated = String(operator['kind']).startsWith('AEXPR_NOT_')
      const symmetric = String(operator['kind']).endsWith('_SYM')
      const compare = (name: string, bound: unknown): unknown => ({
        A_Expr: {
          kind: 'AEXPR_OP',
          name: [{ String: { sval: name } }],
          lexpr: operator['lexpr'],
          rexpr: bound,
        },
      })
      const range = (low: unknown, high: unknown): unknown => ({
        BoolExpr: {
          boolop: negated ? 'OR_EXPR' : 'AND_EXPR',
          args: [compare(negated ? '<' : '>=', low), compare(negated ? '>' : '<=', high)],
        },
      })
      const forward = range(bounds[0], bounds[1])
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'check',
          type: 'pg_catalog.bool',
          expression: lower(
            symmetric
              ? {
                  BoolExpr: {
                    boolop: negated ? 'AND_EXPR' : 'OR_EXPR',
                    args: [forward, range(bounds[1], bounds[0])],
                  },
                }
              : forward,
          ),
        },
      }
    }
    if (
      operator &&
      ['AEXPR_IN', 'AEXPR_OP_ANY', 'AEXPR_OP_ALL'].includes(String(operator['kind']))
    ) {
      const names = strings(operator['name'])
      if (!names || (names.length > 1 && names[0] !== 'pg_catalog')) return unknown
      const name = names.at(-1)
      const operation = name === '=' ? 'or' : name === '<>' ? 'and' : null
      if (
        !operation ||
        (operator['kind'] === 'AEXPR_OP_ANY' && name !== '=') ||
        (operator['kind'] === 'AEXPR_OP_ALL' && name !== '<>')
      )
        return unknown
      const list = fields(fields(operator['rexpr'])?.['List'])?.['items']
      const array =
        operator['kind'] === 'AEXPR_IN'
          ? Array.isArray(list) && list.length > 0
            ? { members: list, type: null }
            : null
          : arrayConstructor(operator['rexpr'])
      if (!array) return unknown
      const subject = bind(operator['lexpr'])
      const members = array.members.map((member) => bind(member))
      const type =
        array.type ??
        subject.type ??
        members.find((member) => member.type)?.type ??
        ([subject, ...members].some((member) => member.literal?.kind === 'integer')
          ? 'pg_catalog.int4'
          : 'pg_catalog.text')
      const value = materialize(subject, type)
      if (!value) return unknown
      const collation = combineCollations([subject, ...members].map((member) => member.collation))
      const resolved = members.map((member) =>
        candidate('operator', name!, [
          { ...subject, type, value, literal: undefined, collation },
          { ...member, type, value: materialize(member, type), literal: undefined, collation },
        ]),
      )
      if (resolved.some((member) => !member)) return unknown
      const first = resolved[0]!
      if (resolved.some((member) => member!.signature !== first.signature)) return unknown
      let groups: EvalExpression[][]
      if (operator['kind'] === 'AEXPR_IN') {
        const withColumns = array.members.map(containsColumn)
        const constants = resolved.flatMap((member, index) =>
          !withColumns[index] ? [member!.operands[1]!] : [],
        )
        groups =
          constants.length > 1
            ? [
                constants,
                ...resolved.flatMap((member, index) =>
                  withColumns[index] ? [[member!.operands[1]!]] : [],
                ),
              ]
            : resolved.map((member) => [member!.operands[1]!])
      } else {
        groups = [resolved.map((member) => member!.operands[1]!)]
      }
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'membership',
          type: 'pg_catalog.bool',
          subject: first.operands[0]!,
          groups,
          operation,
          comparison: {
            kind: 'operator',
            signature: first.signature,
            type: 'pg_catalog.bool',
            collation: collation?.kind,
          },
        },
      }
    }
    if (operator && ['AEXPR_OP', 'AEXPR_LIKE', 'AEXPR_ILIKE'].includes(String(operator['kind']))) {
      const names = strings(operator['name'])
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      if (!name || operator['rexpr'] === undefined) return unknown
      if (operator['lexpr'] === undefined)
        return name === '+' || name === '-' || name === '~'
          ? bindCall('operator', name, [operator['rexpr']])
          : unknown
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
      if (nullTest['nulltesttype'] !== 'IS_NULL' && nullTest['nulltesttype'] !== 'IS_NOT_NULL')
        return unknown
      const names = strings(fields(fields(nullTest['arg'])?.['ColumnRef'])?.['fields'])
      const column = names?.length === 1 ? columns.find((item) => item.name === names[0]) : null
      if (
        column?.isRowType === false &&
        (!catalogScalarType(column.typeName) ||
          catalogTemporalType(column.typeName, column.typeOid, domains) !== null)
      ) {
        inputs.add(column.name)
        return {
          type: 'pg_catalog.bool',
          value: {
            kind: 'input-null-test',
            type: 'pg_catalog.bool',
            name: column.name,
            negated: nullTest['nulltesttype'] === 'IS_NOT_NULL',
          },
        }
      }
      const operand = bind(nullTest['arg'])
      if (!operand.value) return unknown
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
    let args = nodes.map((node) => bind(node))
    const enumArgument = args.find((arg) => arg.enum)
    if (enumArgument?.type)
      args = args.map((arg, index) =>
        arg.value || arg.literal ? arg : bind(nodes[index], enumArgument.type!),
      )
    if (args.some((arg) => !arg.value && !arg.literal)) return unknown
    if (
      kind === 'function' &&
      (name === 'macaddr' || name === 'macaddr8' || name === 'uuid') &&
      args.length === 1 &&
      args[0]!.literal
    ) {
      const type = ('pg_catalog.' + name) as
        'pg_catalog.macaddr' | 'pg_catalog.macaddr8' | 'pg_catalog.uuid'
      const value = materialize(args[0]!, type)
      return value ? { type, value } : unknown
    }
    if (
      kind === 'function' &&
      name === 'text' &&
      args.length === 1 &&
      (isMacType(args[0]!.type) ||
        args[0]!.type === 'pg_catalog.uuid' ||
        args[0]!.type === 'pg_catalog."bit"' ||
        args[0]!.type === 'pg_catalog.varbit') &&
      args[0]!.value
    )
      return {
        type: 'pg_catalog.text',
        collation: defaultCollation,
        value: {
          kind:
            args[0]!.type === 'pg_catalog.uuid'
              ? 'uuid-to-text'
              : isMacType(args[0]!.type)
                ? 'mac-to-text'
                : 'bit-to-text',
          type: 'pg_catalog.text',
          operand: args[0]!.value,
        },
      }
    const resolved = candidate(kind, name, args)
    if (!resolved) {
      if (
        kind === 'function' &&
        ['inet', 'cidr', 'macaddr', 'macaddr8', 'uuid', 'bit', 'varbit', 'bytea'].includes(name) &&
        args.length === 1
      ) {
        const type = (name === 'bit' ? 'pg_catalog."bit"' : 'pg_catalog.' + name) as
          | 'pg_catalog.inet'
          | 'pg_catalog.cidr'
          | 'pg_catalog.macaddr'
          | 'pg_catalog.macaddr8'
          | 'pg_catalog.uuid'
          | 'pg_catalog.bytea'
          | 'pg_catalog."bit"'
          | 'pg_catalog.varbit'
        const operand = args[0]!
        if (
          operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"' ||
          (type === 'pg_catalog.bytea' && operand.type === 'pg_catalog.bpchar')
        ) {
          const text =
            operand.type === 'pg_catalog.bpchar'
              ? operand.value
              : materialize(operand, 'pg_catalog.text')
          return text
            ? type === 'pg_catalog.bytea'
              ? { type, value: { kind: 'text-to-bytea', type, operand: text } }
              : type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit'
                ? { type, value: { kind: 'text-to-bit', type, operand: text } }
                : type === 'pg_catalog.uuid'
                  ? { type, value: { kind: 'text-to-uuid', type, operand: text } }
                  : type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8'
                    ? { type, value: { kind: 'text-to-mac', type, operand: text } }
                    : { type, value: { kind: 'text-to-network', type, operand: text } }
            : unknown
        }
        const value = materialize(operand, type)
        return value ? { type, value } : unknown
      }
      return unknown
    }
    const type = resolved.item.result as ScalarType
    const collation = resolved.collation
    return {
      type,
      collation: ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
        ? (collation ?? defaultCollation)
        : undefined,
      value: {
        kind: 'call',
        call: { kind, signature: resolved.signature, type, collation: collation?.kind },
        operands: resolved.operands,
      },
    }
  }
  const lower = (node: unknown): EvalBoolExpression => {
    const wrapper = fields(node)
    if (!wrapper) return { kind: 'uncertain' }
    const caseExpression = fields(wrapper['CaseExpr'])
    if (caseExpression) {
      if (caseExpression['arg'] !== undefined) {
        const value = bind(node, 'pg_catalog.bool')
        return value.type === 'pg_catalog.bool' && value.value
          ? { kind: 'eval-scalar', expression: value.value }
          : { kind: 'uncertain' }
      }
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
