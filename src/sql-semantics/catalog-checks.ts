import {
  isExpandedRowComparison,
  alignExpandedBooleanArguments,
  type ExpandedBooleanPair,
} from './row-comparison-sites.js'
import { restoreStoredTsqueryConstants } from './tsquery-constant-sites.js'
import { restoreStoredArrayConstants } from './array-constant-sites.js'
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
import {
  alignStoredRowCoercions,
  alignStoredRowConstructors,
  alignStoredRowScalars,
  alignStoredRowCalls,
  type RowCoercionSites,
  type RowConstructorBindings,
  type RowConstructorBinding,
} from './row-coercion-sites.js'
import { restoreStoredTsvectorConstants } from './tsvector-constant-sites.js'
import { alignStoredXmlConstants, restoreStoredXmlNames } from './xml-constant-sites.js'
import { alignStoredArrayConstructors } from './array-constructor-sites.js'

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
  | 'name'
  | 'type'
  | 'definition'
  | 'moneyLiterals'
  | 'coercionContext'
  | 'rowCoercionContext'
  | 'arrayConstructorContext'
  | 'arrayConstants'
  | 'tsvectorConstants'
  | 'tsqueryConstants'
  | 'xmlConstants'
>

const names = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const result = value.map((n) => fields(fields(n)?.['String'])?.['sval'])
  return result.every((n): n is string => typeof n === 'string') ? result : null
}

function alignRowFieldBindings(
  source: unknown,
  stored: unknown,
  align?: (
    source: unknown,
    stored: unknown,
    selection?: ExpandedBooleanPair['selection'],
  ) => boolean | void,
  preserveCasts = false,
): Map<unknown, RowFieldBinding> {
  const result = new Map<unknown, RowFieldBinding>()
  const visit = (
    source: unknown,
    stored: unknown,
    selection?: ExpandedBooleanPair['selection'],
  ): void => {
    if (Array.isArray(source) && Array.isArray(stored)) {
      if (source.length === stored.length) source.forEach((n, i) => visit(n, stored[i]))
      return
    }
    const a = fields(source),
      b = fields(stored)
    if (!a || !b) return
    if (align?.(source, stored, selection)) return
    const booleanArguments = alignExpandedBooleanArguments(source, stored)
    if (booleanArguments) {
      for (const pair of booleanArguments) visit(pair.source, pair.stored, pair.selection)
      return
    }
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
        const sourceArgs = call['args'],
          storedArgs = selected['args']
        let alignedArgs = storedArgs
        if (
          selected['func_variadic'] === true &&
          call['func_variadic'] !== true &&
          Array.isArray(sourceArgs) &&
          Array.isArray(storedArgs) &&
          storedArgs.length
        ) {
          const tail = fields(fields(storedArgs.at(-1))?.['A_ArrayExpr'])
          const members = tail?.['elements'] ?? []
          if (tail && Array.isArray(members)) {
            const expanded = [...storedArgs.slice(0, -1), ...members]
            if (expanded.length === sourceArgs.length) alignedArgs = expanded
          }
        }
        visit(sourceArgs, alignedArgs)
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
    if (preserveCasts && cast) {
      const sourceCast = fields(a['TypeCast']),
        normalize = (value: unknown): unknown => {
          if (Array.isArray(value)) return value.map(normalize)
          const record = fields(value)
          return record
            ? Object.fromEntries(
                Object.keys(record)
                  .filter((key) => key !== 'location')
                  .sort()
                  .map((key) => [key, normalize(record[key])]),
              )
            : value
        },
        sameType = (left: unknown, right: unknown): boolean => {
          const l = fields(left),
            r = fields(right),
            ln = names(l?.['names']),
            rn = names(r?.['names'])
          return !!(
            ln &&
            rn &&
            ln.at(-1) === rn.at(-1) &&
            (ln.length === 1 || rn.length === 1 || ln[0] === rn[0]) &&
            JSON.stringify(normalize({ ...l, names: [] })) ===
              JSON.stringify(normalize({ ...r, names: [] }))
          )
        },
        typeNames: unknown[] = []
      let inner: unknown = stored
      while (true) {
        const next = fields(fields(inner)?.['TypeCast'])
        if (!next || (sourceCast && sameType(sourceCast['typeName'], next['typeName']))) break
        typeNames.push(next['typeName'])
        inner = next['arg']
      }
      const target = fields(inner)
      if (
        typeNames.length &&
        target &&
        (sourceCast
          ? sameType(sourceCast['typeName'], fields(target['TypeCast'])?.['typeName'])
          : Object.keys(a).some((key) => key in target))
      ) {
        result.set(source, { kind: 'coercion', typeNames })
        visit(source, inner)
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
    const sourceCast = fields(a['TypeCast'])
    if (sourceCast && cast) {
      const sourceType = names(fields(sourceCast['typeName'])?.['names']),
        same = (left: string[] | null, right: string[] | null) =>
          !!left &&
          !!right &&
          left.at(-1) === right.at(-1) &&
          (left.length === 1 || right.length === 1 || left[0] === right[0]),
        innerStored = fields(fields(cast['arg'])?.['TypeCast']),
        innerSource = fields(fields(sourceCast['arg'])?.['TypeCast'])
      if (
        !same(sourceType, castNames) &&
        same(sourceType, names(fields(innerStored?.['typeName'])?.['names']))
      ) {
        visit(source, cast['arg'])
        return
      }
      if (innerSource && same(sourceType, names(fields(innerSource['typeName'])?.['names']))) {
        visit(sourceCast['arg'], stored)
        return
      }
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
  let rowFieldBindings: Map<unknown, RowFieldBinding> | undefined
  let rowCoercionSites: RowCoercionSites | undefined
  let rowConstructorBindings: RowConstructorBindings | undefined
  const xmlConstantBindings = new Map<unknown, string | null>()
  let storedCheck: Fields | null = null
  let storedSites: RowCoercionSites | undefined
  let storedConstructors: RowConstructorBindings | undefined
  const storedScalarBindings = new Map<unknown, RowFieldBinding>()
  let storedXmlConstants: ReadonlyMap<unknown, string | null> | undefined
  const nativeComparisons = new Map<unknown, { nodes: unknown[]; operation?: 'and' | 'or' }>()
  try {
    check = parseCheck(sourceDefinition ?? constraint.definition)
    if (
      literalOrigin === 'stored' &&
      (sourceDefinition === undefined || sourceDefinition === constraint.definition)
    ) {
      restoreStoredArrayConstants(
        check?.['raw_expr'],
        constraint.definition,
        constraint.arrayConstants,
      )
      restoreStoredXmlNames(check?.['raw_expr'], constraint.definition, constraint.xmlConstants)
      restoreStoredTsvectorConstants(
        check?.['raw_expr'],
        constraint.definition,
        constraint.tsvectorConstants,
      )
      restoreStoredTsqueryConstants(
        check?.['raw_expr'],
        constraint.definition,
        constraint.tsqueryConstants,
      )
    }
    const stored = sourceDefinition === undefined ? check : parseCheck(constraint.definition),
      context = constraint.rowCoercionContext
    storedCheck = stored
    if (stored && stored !== check) {
      restoreStoredArrayConstants(
        stored['raw_expr'],
        constraint.definition,
        constraint.arrayConstants,
      )
      restoreStoredXmlNames(stored['raw_expr'], constraint.definition, constraint.xmlConstants)
      restoreStoredTsvectorConstants(
        stored['raw_expr'],
        constraint.definition,
        constraint.tsvectorConstants,
      )
      restoreStoredTsqueryConstants(
        stored['raw_expr'],
        constraint.definition,
        constraint.tsqueryConstants,
      )
    }
    const capturedXml = alignStoredXmlConstants(
      stored?.['raw_expr'],
      constraint.definition,
      constraint.xmlConstants,
    )
    storedXmlConstants = capturedXml
    if (sourceDefinition === undefined || literalOrigin === 'stored')
      for (const [node, text] of capturedXml) xmlConstantBindings.set(node, text)
    const sites =
      context?.definition === constraint.definition
        ? alignStoredRowCoercions(stored?.['raw_expr'], context, compositeGraph)
        : undefined
    const constructors =
      context?.definition === constraint.definition
        ? alignStoredRowConstructors(stored?.['raw_expr'], context)
        : undefined
    if (context?.definition === constraint.definition)
      for (const [node, expression] of alignStoredRowScalars(stored?.['raw_expr'], context))
        storedScalarBindings.set(node, { kind: 'scalar', expression })
    if (context?.definition === constraint.definition)
      for (const [node, call] of alignStoredRowCalls(stored?.['raw_expr'], context))
        if (!storedScalarBindings.has(node))
          storedScalarBindings.set(node, { kind: 'call', ...call })
    storedSites = sites
    storedConstructors = constructors
    if (
      literalOrigin === 'source' &&
      (sourceDefinition !== undefined || context?.definition === constraint.definition)
    ) {
      const sourceScalarBindings = new Map<unknown, RowFieldBinding>()
      const sourceConstructors = new Map<unknown, RowConstructorBinding>()
      const aligned = new Map<unknown, readonly NonNullable<typeof context>['casts'][number][]>()
      rowFieldBindings = alignRowFieldBindings(
        check?.['raw_expr'],
        stored?.['raw_expr'],
        (source, stored, selection) => {
          const scalar = storedScalarBindings.get(stored)
          if (scalar) {
            const sourceCall = fields(fields(source)?.['FuncCall']),
              sourceArgs = sourceCall?.['args'] ?? []
            sourceScalarBindings.set(
              source,
              scalar.kind === 'call' && sourceCall && Array.isArray(sourceArgs)
                ? { ...scalar, args: sourceArgs }
                : scalar,
            )
            return scalar.kind !== 'call'
          }
          if (isExpandedRowComparison(source, stored)) {
            nativeComparisons.set(source, selection ?? { nodes: [stored] })
            return true
          }
          if (capturedXml.has(stored)) xmlConstantBindings.set(source, capturedXml.get(stored)!)
          const storedRow = fields(fields(stored)?.['RowExpr']),
            sourceRow = fields(fields(source)?.['RowExpr']),
            constructor = constructors?.get(storedRow)
          if (sourceRow && constructor)
            sourceConstructors.set(sourceRow, {
              ...constructor,
              ...(sourceDefinition !== undefined && sourceDefinition !== constraint.definition
                ? { source: true as const }
                : {}),
            })
          const casts = sites?.get(stored)
          if (casts) aligned.set(source, [...new Set([...(aligned.get(source) ?? []), ...casts])])
        },
        context?.definition === constraint.definition &&
          context.complete &&
          (context.scalars !== undefined || context.calls !== undefined),
      )
      for (const [node, scalar] of sourceScalarBindings) rowFieldBindings.set(node, scalar)
      rowCoercionSites = aligned
      rowConstructorBindings = sourceConstructors
    } else {
      rowFieldBindings = storedScalarBindings
      rowCoercionSites = sites
      rowConstructorBindings = constructors
    }
  } catch {
    return { name: constraint.name, expression: { kind: 'uncertain' }, inputs: [] }
  }
  if (check?.['contype'] !== 'CONSTR_CHECK') return null
  const bindPlan = (
    root: unknown,
    origin: 'source' | 'stored',
    bindings: ReadonlyMap<unknown, RowFieldBinding> | undefined,
    sites: RowCoercionSites | undefined,
    constructors: RowConstructorBindings | undefined,
    captured?: Map<
      unknown,
      { expression: EvalBoolExpression; inputs: readonly string[] } | undefined
    >,
  ) =>
    bindCatalogCheck(
      table.columns,
      root as Node | undefined,
      [],
      enums,
      domains,
      constraint.moneyLiterals,
      origin,
      undefined,
      undefined,
      constraint.coercionContext?.definition === constraint.definition
        ? constraint.coercionContext
        : undefined,
      undefined,
      rangeTypes,
      compositeGraph,
      table.schema && table.name ? { schema: table.schema, name: table.name } : undefined,
      bindings,
      constraint.rowCoercionContext?.definition === constraint.definition
        ? constraint.rowCoercionContext
        : undefined,
      sites,
      constraint.arrayConstructorContext?.definition === constraint.definition
        ? alignStoredArrayConstructors(
            root,
            origin === 'stored'
              ? constraint.arrayConstructorContext
              : {
                  ...constraint.arrayConstructorContext,
                  constructors: constraint.arrayConstructorContext.constructors.filter(
                    (c) => c.type === 'pg_catalog._record',
                  ),
                },
            compositeGraph,
            rangeTypes,
          )
        : undefined,
      origin === 'stored' ? storedXmlConstants : xmlConstantBindings,
      constructors,
      captured,
    )
  if (nativeComparisons.size && storedCheck) {
    const captured = new Map<
      unknown,
      { expression: EvalBoolExpression; inputs: readonly string[] } | undefined
    >(
      [...nativeComparisons.values()].flatMap(({ nodes }) =>
        nodes.map((node) => [node, undefined] as const),
      ),
    )
    if (
      constraint.rowCoercionContext?.definition === constraint.definition &&
      (constraint.rowCoercionContext.scalars !== undefined ||
        constraint.rowCoercionContext.calls !== undefined)
    )
      bindPlan(
        storedCheck['raw_expr'],
        'stored',
        storedScalarBindings,
        storedSites,
        storedConstructors,
        captured,
      )
    for (const [source, { nodes, operation }] of nativeComparisons) {
      const parts = nodes.map(
          (node) =>
            captured.get(node) ?? {
              expression: { kind: 'uncertain' } as EvalBoolExpression,
              inputs: [],
            },
        ),
        expression = parts.slice(1).reduce<EvalBoolExpression>(
          (left, right) => ({
            kind: 'eval-boolean-logic',
            operation: operation!,
            operands: [left, right.expression],
          }),
          parts[0]!.expression,
        ),
        inputs = [...new Set(parts.flatMap((part) => part.inputs))].sort()
      rowFieldBindings!.set(source, { kind: 'expression', expression, inputs })
    }
  }
  const bound = bindPlan(
    check['raw_expr'],
    literalOrigin,
    rowFieldBindings,
    rowCoercionSites,
    rowConstructorBindings,
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
