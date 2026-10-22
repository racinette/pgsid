import { parseSync, type Node } from 'libpg-query'
import type {
  ConstraintInfo,
  DomainInfo,
  EnumInfo,
  TableInfo,
  RangeTypeInfo,
  CompositeTypeGraph,
} from '../catalog/types.js'
import type { EvalBoolExpression } from './check-expressions.js'
import { bindCatalogCheck, type CheckColumn, type RowFieldBinding } from './catalog-check-binder.js'

export interface CatalogCheckPlan {
  name: string
  expression: EvalBoolExpression
  inputs: readonly string[]
}

export interface CatalogCheckGroup {
  name: string
  kind: 'table' | 'domain'
  source: { schema: string; name: string }
  checks: readonly {
    owner: string
    source: { schema: string; name: string }
    plan: CatalogCheckPlan
  }[]
}

type Fields = Record<string, unknown>

const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null

type CheckTable = {
  columns: readonly CheckColumn[]
  schema?: string
  name?: string
}
type CheckConstraint = Pick<
  ConstraintInfo,
  'name' | 'type' | 'definition' | 'moneyLiterals' | 'coercionContext'
>

const names = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const result = value.map((n) => fields(fields(n)?.['String'])?.['sval'])
  return result.every((n): n is string => typeof n === 'string') ? result : null
}

function alignRowFieldBindings(source: unknown, stored: unknown): Map<unknown, RowFieldBinding> {
  const result = new Map<unknown, RowFieldBinding>()
  const visit = (source: unknown, stored: unknown): void => {
    if (Array.isArray(source) && Array.isArray(stored)) {
      if (source.length === stored.length) source.forEach((n, i) => visit(n, stored[i]))
      return
    }
    const a = fields(source),
      b = fields(stored)
    if (!a || !b) return
    const operator = fields(a['A_Expr']),
      negation = fields(b['BoolExpr']),
      args = negation?.['args']
    if (
      operator?.['kind'] === 'AEXPR_NOT_DISTINCT' &&
      negation?.['boolop'] === 'NOT_EXPR' &&
      Array.isArray(args) &&
      args.length === 1 &&
      fields(fields(args[0])?.['A_Expr'])?.['kind'] === 'AEXPR_DISTINCT'
    ) {
      visit(source, args[0])
      return
    }
    const call = fields(a['FuncCall']),
      selected = fields(b['FuncCall']),
      field = fields(a['A_Indirection']),
      projected = fields(b['A_Indirection']),
      sourceNames = names(call?.['funcname']),
      selectedNames = names(selected?.['funcname']),
      fieldNames = names(field?.['indirection']),
      projectedNames = names(projected?.['indirection']),
      reference = fields(a['ColumnRef']),
      referenceNames = names(reference?.['fields']),
      selectedColumn = names(fields(b['ColumnRef'])?.['fields']),
      cast = fields(b['TypeCast']),
      castNames = names(fields(cast?.['typeName'])?.['names'])
    if (
      call &&
      sourceNames?.length === 1 &&
      selectedColumn?.length === 1 &&
      sourceNames[0] === selectedColumn[0] &&
      Array.isArray(call['args']) &&
      call['args'].length === 1
    ) {
      result.set(call, { kind: 'field', name: selectedColumn[0]! })
      return
    }
    if (
      call &&
      sourceNames?.at(-1) === castNames?.at(-1) &&
      cast &&
      Array.isArray(call['args']) &&
      call['args'].length === 1
    ) {
      result.set(call, { kind: 'cast', typeName: cast['typeName'] })
      visit(call['args'][0], cast['arg'])
      return
    }
    if (
      call &&
      sourceNames?.length === 1 &&
      projected &&
      projectedNames?.length === 1 &&
      sourceNames[0] === projectedNames[0] &&
      Array.isArray(call['args']) &&
      call['args'].length === 1
    ) {
      result.set(call, { kind: 'field', name: projectedNames[0]! })
      visit(call['args'][0], projected['arg'])
      return
    }
    if (selected && selectedNames) {
      if (
        reference &&
        referenceNames &&
        referenceNames.length > 1 &&
        referenceNames.at(-1) === selectedNames.at(-1) &&
        Array.isArray(selected['args']) &&
        selected['args'].length === 1
      ) {
        result.set(reference, { kind: 'function', names: selectedNames })
        return
      }
      if (call && sourceNames?.at(-1) === selectedNames.at(-1)) {
        result.set(call, { kind: 'function', names: selectedNames })
        visit(call['args'], selected['args'])
        return
      }
      if (
        field &&
        fieldNames?.length === 1 &&
        fieldNames[0] === selectedNames.at(-1) &&
        Array.isArray(selected['args']) &&
        selected['args'].length === 1
      ) {
        result.set(field, { kind: 'function', names: selectedNames })
        visit(field['arg'], selected['args'][0])
        return
      }
    }
    if (a['TypeCast'] && !b['TypeCast']) {
      visit(fields(a['TypeCast'])?.['arg'], stored)
      return
    }
    if (b['TypeCast'] && !a['TypeCast']) {
      visit(source, fields(b['TypeCast'])?.['arg'])
      return
    }
    for (const key of Object.keys(a))
      if (key !== 'location' && key !== 'stmt_location' && key in b) visit(a[key], b[key])
  }
  visit(source, stored)
  return result
}

function parseCheck(definition: string): Fields | null {
  const parsed = parseSync(
    `ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${definition}`,
  )
  const alter = fields(fields(parsed.stmts?.[0]?.stmt)?.['AlterTableStmt'])
  const commands = alter?.['cmds']
  const command = Array.isArray(commands) ? fields(commands[0]) : null
  const body = fields(command?.['AlterTableCmd'])?.['def']
  const check = fields(fields(body)?.['Constraint'])
  const normalize = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(normalize)
    const record = fields(node)
    if (!record) return node
    const result = Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, normalize(value)]),
      ),
      indirect = fields(result['A_Indirection']),
      items = indirect?.['indirection']
    if (!indirect || !Array.isArray(items) || items.length < 2) return result
    const groups: unknown[][] = []
    for (const item of items) {
      if (fields(item)?.['String'] || !groups.length || fields(groups.at(-1)?.at(-1))?.['String'])
        groups.push([item])
      else groups.at(-1)!.push(item)
    }
    return groups.reduce<unknown>(
      (arg, group) => ({ A_Indirection: { ...indirect, arg, indirection: group } }),
      indirect['arg'],
    )
  }
  if (check) check['raw_expr'] = normalize(check['raw_expr'])
  return check
}

export function lowerTableCheck(
  table: CheckTable,
  constraint: CheckConstraint,
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
  literalOrigin: 'source' | 'stored' = 'stored',
  rangeTypes: readonly RangeTypeInfo[] = [],
  compositeGraph?: CompositeTypeGraph,
  sourceDefinition?: string,
): CatalogCheckPlan | null {
  if (constraint.type !== 'check') throw new Error('Expected a table CHECK constraint')
  let check: Fields | null
  let rowFieldBindings: ReadonlyMap<unknown, RowFieldBinding> | undefined
  try {
    check = parseCheck(sourceDefinition ?? constraint.definition)
    if (sourceDefinition !== undefined && literalOrigin === 'source')
      rowFieldBindings = alignRowFieldBindings(
        check?.['raw_expr'],
        parseCheck(constraint.definition)?.['raw_expr'],
      )
  } catch {
    return { name: constraint.name, expression: { kind: 'uncertain' }, inputs: [] }
  }
  if (check?.['contype'] !== 'CONSTR_CHECK') return null
  const bound = bindCatalogCheck(
    table.columns,
    check['raw_expr'] as Node | undefined,
    [],
    enums,
    domains,
    constraint.moneyLiterals,
    literalOrigin,
    undefined,
    undefined,
    constraint.coercionContext?.definition === constraint.definition
      ? constraint.coercionContext
      : undefined,
    undefined,
    rangeTypes,
    compositeGraph,
    table.schema && table.name ? { schema: table.schema, name: table.name } : undefined,
    rowFieldBindings,
  )
  return { name: constraint.name, ...bound }
}

export function lowerDomainCheck(
  domain: DomainInfo,
  check: DomainInfo['checks'][number],
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
  rangeTypes: readonly RangeTypeInfo[] = [],
  compositeGraph?: CompositeTypeGraph,
): CatalogCheckPlan | null {
  return lowerTableCheck(
    {
      columns: [
        {
          name: 'value',
          typeName: domain.baseTypeName,
          typeOid: domain.baseTypeOid,
          isRowType: domain.isRowType,
          collationIsC: domain.collationIsC,
          collationDeterministic: domain.collationDeterministic,
          collationIsDefault: domain.collationIsDefault,
          collationOid: domain.collationOid,
        },
      ],
    },
    { ...check, type: 'check' },
    enums,
    domains,
    'stored',
    rangeTypes,
    compositeGraph,
  )
}

export function catalogCheckGroups(
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[],
  selectedDomains: readonly DomainInfo[] = domains,
  enums: readonly EnumInfo[] = [],
  rangeTypes: readonly RangeTypeInfo[] = [],
  compositeGraph?: CompositeTypeGraph,
): CatalogCheckGroup[] {
  const groups: CatalogCheckGroup[] = []
  for (const table of tables) {
    const checks = table.constraints
      .filter((constraint) => constraint.type === 'check' && constraint.enforced)
      .flatMap((constraint) => {
        const plan = lowerTableCheck(
          table,
          constraint,
          enums,
          domains,
          'stored',
          rangeTypes,
          compositeGraph,
        )
        return plan
          ? [
              {
                owner: `${table.schema}.${table.name}`,
                source: { schema: table.schema, name: table.name },
                plan,
              },
            ]
          : []
      })
    if (checks.length)
      groups.push({
        name: `${table.schema}_${table.name}`,
        kind: 'table',
        source: { schema: table.schema, name: table.name },
        checks,
      })
  }
  const byOid = new Map(domains.map((domain) => [domain.oid, domain]))
  for (const domain of selectedDomains) {
    const chain: DomainInfo[] = []
    const seen = new Set<number>()
    let current: DomainInfo | undefined = domain
    while (current && !seen.has(current.oid)) {
      seen.add(current.oid)
      chain.push(current)
      current = byOid.get(current.baseTypeOid)
    }
    const baseTypeName = chain.at(-1)?.baseTypeName ?? domain.baseTypeName
    const checks = chain.flatMap((layer) =>
      layer.checks.flatMap((check) => {
        const plan = lowerDomainCheck(
          {
            ...layer,
            baseTypeName,
            baseTypeOid: chain.at(-1)?.baseTypeOid ?? layer.baseTypeOid,
            collationIsC: domain.collationIsC,
            collationDeterministic: domain.collationDeterministic,
            collationIsDefault: domain.collationIsDefault,
            collationOid: domain.collationOid,
          },
          check,
          enums,
          domains,
          rangeTypes,
          compositeGraph,
        )
        return plan
          ? [
              {
                owner: `${layer.schema}.${layer.name}`,
                source: { schema: layer.schema, name: layer.name },
                plan,
              },
            ]
          : []
      }),
    )
    if (checks.length)
      groups.push({
        name: `${domain.schema}_${domain.name}`,
        kind: 'domain',
        source: { schema: domain.schema, name: domain.name },
        checks,
      })
  }
  return groups
}
