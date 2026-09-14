import type { Node } from 'libpg-query'
import type { ResolvedTable } from './types.js'

export interface DatabaseColumn {
  schema: string
  relation: string
  column: string
}

export interface DatabaseType {
  schema?: string
  name: string
}

export interface QualifiedName {
  schema?: string
  name: string
}

export interface ResolvedOperatorIdentity {
  schema: string
  name: string
  leftType: string | null
  rightType: string
  resultType: string
}

export type ValueOperation =
  | {
      kind: 'json-access'
      path: readonly (string | number)[]
      result: 'json' | 'text'
      operator?: ResolvedOperatorIdentity
      syntax: 'operator' | 'subscript'
    }
  | {
      kind: 'cast'
      target: DatabaseType
    }
  | {
      kind: 'operator'
      operator: QualifiedName
      resolution: ResolvedOperatorIdentity | null
    }
  | {
      kind: 'function'
      function: QualifiedName
    }
  | {
      kind: 'choice'
      form: 'case' | 'coalesce' | 'union' | 'intersect' | 'except' | 'values'
    }
  | {
      kind: 'opaque'
      nodeType: string
    }

interface LineageBase {
  resolvedType: string | null
}

export type ValueLineage =
  | (LineageBase & {
      kind: 'column'
      column: DatabaseColumn
    })
  | (LineageBase & {
      kind: 'literal'
    })
  | (LineageBase & {
      kind: 'transform'
      operation: ValueOperation
      inputs: readonly ValueLineage[]
    })
  | (LineageBase & {
      kind: 'unknown'
    })

export interface OutputValueLineage {
  name: string
  value: ValueLineage
}

export interface ValueLineageCatalog {
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null
  resolveColumnTypeName(schema: string, table: string, column: string): string | null
  resolveCanonicalTypeName(typeName: string): string
  resolveOperatorIdentity(
    schema: string | undefined,
    name: string,
    leftType: string | null,
    rightType: string,
  ): ResolvedOperatorIdentity | null
}

export const VALUE_LINEAGE_CATALOG_ONLY = [
  'resolveOperatorIdentity',
] as const satisfies readonly (keyof ValueLineageCatalog)[]

export class UnsupportedValueLineageError extends Error {
  constructor(readonly nodeType: string) {
    super(`Unsupported value-lineage shape: ${nodeType}`)
    this.name = 'UnsupportedValueLineageError'
  }
}

interface BoundColumn {
  name: string
  value: ValueLineage
}

interface RelationBinding {
  alias: string
  explicitAlias: boolean
  relation?: ResolvedTable
  columns: BoundColumn[]
}

interface Scope {
  bindings: Map<string, RelationBinding>
  visible: BoundColumn[]
  ctes: Map<string, BoundColumn[]>
  outer: Scope | null
}

interface ExpressionResult {
  value: ValueLineage
  staticPath?: { path: (string | number)[]; operandType: string }
}

const unknown = (): ValueLineage => ({ kind: 'unknown', resolvedType: null })

const nodeTag = (node: unknown): string => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return '?'
  return Object.keys(node as object).find((key) => /^[A-Z]/.test(key)) ?? '?'
}

const stringNode = (node: unknown): string | null => {
  const value = (node as { String?: { sval?: unknown } } | undefined)?.String?.sval
  return typeof value === 'string' ? value : null
}

const qualifiedName = (nodes: unknown[] | undefined): QualifiedName => {
  const parts = (nodes ?? []).map(stringNode).filter((part): part is string => part !== null)
  return {
    ...(parts.length > 1 ? { schema: parts.at(-2) } : {}),
    name: parts.at(-1) ?? '',
  }
}

const commonType = (values: readonly ValueLineage[]): string | null => {
  const types = [...new Set(values.map((value) => value.resolvedType).filter(Boolean))]
  return types.length === 1 ? types[0]! : null
}

const BUILTIN_TYPE_ALIASES: Readonly<Record<string, string>> = {
  bool: 'boolean',
  bpchar: 'character',
  decimal: 'numeric',
  float4: 'real',
  float8: 'double precision',
  int2: 'smallint',
  int4: 'integer',
  int8: 'bigint',
  timestamptz: 'timestamp with time zone',
  timetz: 'time with time zone',
  varbit: 'bit varying',
  varchar: 'character varying',
}

export function analyzeValueLineage(
  statement: Node,
  catalog: ValueLineageCatalog,
): OutputValueLineage[] {
  return new ValueLineageAnalyzer(catalog).analyzeStatement(statement, null)
}

class ValueLineageAnalyzer {
  constructor(private readonly catalog: ValueLineageCatalog) {}

  analyzeStatement(statement: Node, outer: Scope | null): OutputValueLineage[] {
    const select = (statement as { SelectStmt?: Record<string, unknown> }).SelectStmt
    if (!select) throw new UnsupportedValueLineageError(nodeTag(statement))
    return this.analyzeSelect(select, outer)
  }

  private analyzeSelect(
    select: Record<string, unknown>,
    outer: Scope | null,
  ): OutputValueLineage[] {
    const operation = select['op'] as string | undefined
    const left = select['larg'] as Record<string, unknown> | undefined
    const right = select['rarg'] as Record<string, unknown> | undefined
    if (operation && operation !== 'SETOP_NONE' && left && right) {
      const leftOutputs = this.analyzeSelect(left, outer)
      const rightOutputs = this.analyzeSelect(right, outer)
      if (leftOutputs.length !== rightOutputs.length) {
        throw new UnsupportedValueLineageError('set-operation-column-count')
      }
      const form =
        operation === 'SETOP_UNION'
          ? 'union'
          : operation === 'SETOP_INTERSECT'
            ? 'intersect'
            : 'except'
      return leftOutputs.map((output, index) => {
        const inputs = [output.value, rightOutputs[index]!.value]
        return {
          name: output.name,
          value: {
            kind: 'transform',
            operation: { kind: 'choice', form },
            inputs,
            resolvedType: commonType(inputs),
          },
        }
      })
    }

    const scope = this.buildScope(select, outer)
    const values = select['valuesLists'] as Node[][] | undefined
    if (values?.length) return this.analyzeValues(values, scope)

    const targets = (select['targetList'] as Node[] | undefined) ?? []
    return targets.flatMap((target) => this.analyzeTarget(target, scope))
  }

  private buildScope(select: Record<string, unknown>, outer: Scope | null): Scope {
    const scope: Scope = {
      bindings: new Map(),
      visible: [],
      ctes: new Map(),
      outer,
    }
    this.registerCtes(select['withClause'], scope)
    for (const item of (select['fromClause'] as Node[] | undefined) ?? []) {
      scope.visible.push(...this.bindFromItem(item, scope))
    }
    return scope
  }

  private registerCtes(withNode: unknown, scope: Scope): void {
    const wrapper = withNode as { WithClause?: { ctes?: Node[] }; ctes?: Node[] } | undefined
    const withClause = wrapper?.WithClause ?? wrapper
    for (const node of withClause?.ctes ?? []) {
      const cte = (
        node as {
          CommonTableExpr?: { ctename?: string; ctequery?: Node; aliascolnames?: Node[] }
        }
      ).CommonTableExpr
      if (!cte?.ctename || !cte.ctequery) continue
      const outputs = this.analyzeStatement(cte.ctequery, scope)
      const aliases = (cte.aliascolnames ?? []).map(stringNode)
      scope.ctes.set(
        cte.ctename,
        outputs.map((output, index) => ({
          name: aliases[index] ?? output.name,
          value: output.value,
        })),
      )
    }
  }

  private bindFromItem(node: Node, scope: Scope): BoundColumn[] {
    const record = node as Record<string, unknown>
    const rangeVar = record['RangeVar'] as
      | {
          schemaname?: string
          relname?: string
          alias?: { aliasname?: string; colnames?: Node[] }
        }
      | undefined
    if (rangeVar?.relname) {
      const alias = rangeVar.alias?.aliasname ?? rangeVar.relname
      const cte = rangeVar.schemaname ? undefined : this.resolveCte(scope, rangeVar.relname)
      const relation = cte
        ? undefined
        : this.catalog.resolveTable(rangeVar.schemaname, rangeVar.relname)
      if (!cte && !relation) throw new UnsupportedValueLineageError(`relation:${rangeVar.relname}`)
      const sourceColumns = cte ?? this.relationColumns(relation!)
      const columnAliases = (rangeVar.alias?.colnames ?? []).map(stringNode)
      const columns = sourceColumns.map((column, index) => ({
        name: columnAliases[index] ?? column.name,
        value: column.value,
      }))
      const binding: RelationBinding = {
        alias,
        explicitAlias: rangeVar.alias?.aliasname !== undefined,
        ...(relation ? { relation } : {}),
        columns,
      }
      scope.bindings.set(alias, binding)
      return columns
    }

    const rangeSubselect = record['RangeSubselect'] as
      { subquery?: Node; alias?: { aliasname?: string; colnames?: Node[] } } | undefined
    if (rangeSubselect?.subquery && rangeSubselect.alias?.aliasname) {
      const outputs = this.analyzeStatement(rangeSubselect.subquery, scope)
      const aliases = (rangeSubselect.alias.colnames ?? []).map(stringNode)
      const columns = outputs.map((output, index) => ({
        name: aliases[index] ?? output.name,
        value: output.value,
      }))
      scope.bindings.set(rangeSubselect.alias.aliasname, {
        alias: rangeSubselect.alias.aliasname,
        explicitAlias: true,
        columns,
      })
      return columns
    }

    const join = record['JoinExpr'] as
      { larg?: Node; rarg?: Node; usingClause?: Node[]; isNatural?: boolean } | undefined
    if (join?.larg && join.rarg) {
      const left = this.bindFromItem(join.larg, scope)
      const right = this.bindFromItem(join.rarg, scope)
      const using = new Set<string>(
        (join.usingClause ?? []).map(stringNode).filter((name): name is string => name !== null),
      )
      if (join.isNatural) {
        const rightNames = new Set(right.map((column) => column.name))
        for (const column of left) if (rightNames.has(column.name)) using.add(column.name)
      }
      if (using.size === 0) return [...left, ...right]
      const merged: BoundColumn[] = []
      for (const name of using) {
        const leftColumn = left.find((column) => column.name === name)
        const rightColumn = right.find((column) => column.name === name)
        if (!leftColumn || !rightColumn) continue
        const inputs = [leftColumn.value, rightColumn.value]
        merged.push({
          name,
          value: {
            kind: 'transform',
            operation: { kind: 'choice', form: 'coalesce' },
            inputs,
            resolvedType: commonType(inputs),
          },
        })
      }
      return [
        ...merged,
        ...left.filter((column) => !using.has(column.name)),
        ...right.filter((column) => !using.has(column.name)),
      ]
    }

    const sample = record['RangeTableSample'] as { relation?: Node } | undefined
    if (sample?.relation) return this.bindFromItem(sample.relation, scope)
    throw new UnsupportedValueLineageError(nodeTag(node))
  }

  private relationColumns(relation: ResolvedTable): BoundColumn[] {
    return relation.columns.map((column) => ({
      name: column,
      value: {
        kind: 'column',
        column: { schema: relation.schema, relation: relation.name, column },
        resolvedType: this.catalog.resolveColumnTypeName(relation.schema, relation.name, column),
      },
    }))
  }

  private analyzeTarget(targetNode: Node, scope: Scope): OutputValueLineage[] {
    const target = (targetNode as { ResTarget?: { name?: string; val?: Node } }).ResTarget
    if (!target?.val) return []
    const star = this.starQualifier(target.val)
    if (star !== null) {
      const columns = star === '' ? scope.visible : (scope.bindings.get(star)?.columns ?? [])
      return columns.map((column) => ({ name: column.name, value: column.value }))
    }
    const result = this.analyzeExpression(target.val, scope)
    return [{ name: target.name ?? this.inferName(target.val), value: result.value }]
  }

  private analyzeValues(rows: Node[][], scope: Scope): OutputValueLineage[] {
    const width = rows[0]?.length ?? 0
    return Array.from({ length: width }, (_, index) => {
      const inputs = rows.map((row) => this.analyzeExpression(row[index]!, scope).value)
      return {
        name: `column${index + 1}`,
        value: {
          kind: 'transform',
          operation: { kind: 'choice', form: 'values' },
          inputs,
          resolvedType: commonType(inputs),
        },
      }
    })
  }

  private analyzeExpression(node: Node, scope: Scope): ExpressionResult {
    const record = node as Record<string, unknown>
    if (record['ColumnRef']) return { value: this.resolveColumn(record['ColumnRef'], scope) }
    if (record['A_Const']) return this.literal(record['A_Const'])

    const cast = record['TypeCast'] as
      { arg?: Node; typeName?: Record<string, unknown> } | undefined
    if (cast?.arg && cast.typeName) {
      const input = this.analyzeExpression(cast.arg, scope).value
      const target = this.typeName(cast.typeName)
      const parsedTarget =
        target.schema === 'pg_catalog' ? (BUILTIN_TYPE_ALIASES[target.name] ?? target.name) : null
      const rendered = this.catalog.resolveCanonicalTypeName(
        parsedTarget ?? `${target.schema ? `${target.schema}.` : ''}${target.name}`,
      )
      return {
        value: {
          kind: 'transform',
          operation: { kind: 'cast', target },
          inputs: [input],
          resolvedType: rendered,
        },
      }
    }

    const expression = record['A_Expr'] as
      { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node } | undefined
    if (expression && expression.kind === 'AEXPR_OP' && expression.rexpr) {
      return this.operator({ ...expression, rexpr: expression.rexpr }, scope)
    }

    const coalesce = record['CoalesceExpr'] as { args?: Node[] } | undefined
    if (coalesce) return this.choice('coalesce', coalesce.args ?? [], scope)

    const caseExpression = record['CaseExpr'] as { args?: Node[]; defresult?: Node } | undefined
    if (caseExpression) {
      const results = (caseExpression.args ?? [])
        .map((item) => (item as { CaseWhen?: { result?: Node } }).CaseWhen?.result)
        .filter((item): item is Node => item !== undefined)
      if (caseExpression.defresult) results.push(caseExpression.defresult)
      return this.choice('case', results, scope)
    }

    const call = record['FuncCall'] as { funcname?: Node[]; args?: Node[] } | undefined
    if (call) {
      const inputs = (call.args ?? []).map(
        (argument) => this.analyzeExpression(argument, scope).value,
      )
      return {
        value: {
          kind: 'transform',
          operation: { kind: 'function', function: qualifiedName(call.funcname) },
          inputs,
          resolvedType: null,
        },
      }
    }

    const subLink = record['SubLink'] as { subLinkType?: string; subselect?: Node } | undefined
    if (subLink?.subselect) {
      const outputs = this.analyzeStatement(subLink.subselect, scope)
      if (subLink.subLinkType === 'EXPR_SUBLINK' && outputs.length === 1) {
        return { value: outputs[0]!.value }
      }
      return this.opaque(
        'SubLink',
        outputs.map((output) => output.value),
      )
    }

    const indirection = record['A_Indirection'] as { arg?: Node; indirection?: Node[] } | undefined
    if (indirection?.arg) return this.indirection({ ...indirection, arg: indirection.arg }, scope)

    const inputs = this.opaqueInputs(record, scope)
    return {
      value: {
        kind: 'transform',
        operation: { kind: 'opaque', nodeType: nodeTag(node) },
        inputs,
        resolvedType: null,
      },
    }
  }

  private operator(
    expression: { name?: Node[]; lexpr?: Node; rexpr: Node },
    scope: Scope,
  ): ExpressionResult {
    const left = expression.lexpr ? this.analyzeExpression(expression.lexpr, scope) : undefined
    const right = this.analyzeExpression(expression.rexpr, scope)
    const name = qualifiedName(expression.name)
    const staticPath = this.staticPath(expression.rexpr)
    const rightType = staticPath?.operandType ?? right.value.resolvedType
    const resolution =
      rightType && (left?.value.resolvedType || !left)
        ? this.catalog.resolveOperatorIdentity(
            name.schema,
            name.name,
            left?.value.resolvedType ?? null,
            rightType,
          )
        : null
    const inputs = [...(left ? [left.value] : []), right.value]

    if (
      left &&
      staticPath &&
      resolution?.schema === 'pg_catalog' &&
      ['->', '->>', '#>', '#>>'].includes(resolution.name) &&
      (resolution.leftType === 'json' || resolution.leftType === 'jsonb')
    ) {
      const result = resolution.name.endsWith('>>') || resolution.name === '->>' ? 'text' : 'json'
      return {
        value: this.jsonAccess(left.value, staticPath.path, result, 'operator', resolution),
      }
    }

    return {
      value: {
        kind: 'transform',
        operation: { kind: 'operator', operator: name, resolution },
        inputs,
        resolvedType: resolution?.resultType ?? null,
      },
    }
  }

  private indirection(
    indirection: { arg: Node; indirection?: Node[] },
    scope: Scope,
  ): ExpressionResult {
    const input = this.analyzeExpression(indirection.arg, scope).value
    if (input.resolvedType !== 'jsonb') return this.opaque('A_Indirection', [input])
    const path: (string | number)[] = []
    for (const item of indirection.indirection ?? []) {
      const index = (item as { A_Indices?: { uidx?: Node; lidx?: Node } }).A_Indices
      if (!index?.uidx || index.lidx) return this.opaque('A_Indirection', [input])
      const segment = this.staticSegment(index.uidx)
      if (segment === null) return this.opaque('A_Indirection', [input])
      path.push(segment)
    }
    return { value: this.jsonAccess(input, path, 'json', 'subscript') }
  }

  private jsonAccess(
    input: ValueLineage,
    path: (string | number)[],
    result: 'json' | 'text',
    syntax: 'operator' | 'subscript',
    operator?: ResolvedOperatorIdentity,
  ): ValueLineage {
    if (
      input.kind === 'transform' &&
      input.operation.kind === 'json-access' &&
      input.operation.result === 'json'
    ) {
      return {
        kind: 'transform',
        operation: {
          kind: 'json-access',
          path: [...input.operation.path, ...path],
          result,
          syntax,
          ...(operator ? { operator } : {}),
        },
        inputs: input.inputs,
        resolvedType: result === 'text' ? 'text' : input.resolvedType,
      }
    }
    return {
      kind: 'transform',
      operation: {
        kind: 'json-access',
        path,
        result,
        syntax,
        ...(operator ? { operator } : {}),
      },
      inputs: [input],
      resolvedType: result === 'text' ? 'text' : input.resolvedType,
    }
  }

  private choice(form: 'case' | 'coalesce', nodes: Node[], scope: Scope): ExpressionResult {
    const inputs = nodes.map((node) => this.analyzeExpression(node, scope).value)
    return {
      value: {
        kind: 'transform',
        operation: { kind: 'choice', form },
        inputs,
        resolvedType: commonType(inputs),
      },
    }
  }

  private literal(node: unknown): ExpressionResult {
    const constant = node as {
      ival?: { ival?: number }
      fval?: { fval?: string }
      sval?: { sval?: string }
      boolval?: { boolval?: boolean }
      isnull?: boolean
    }
    let resolvedType: string | null = null
    let staticPath: ExpressionResult['staticPath']
    if (constant.ival) {
      resolvedType = 'integer'
      staticPath = { path: [constant.ival.ival ?? 0], operandType: 'integer' }
    } else if (constant.fval) resolvedType = 'numeric'
    else if (constant.boolval) resolvedType = 'boolean'
    else if (constant.sval) {
      staticPath = { path: [constant.sval.sval ?? ''], operandType: 'text' }
    }
    return { value: { kind: 'literal', resolvedType }, ...(staticPath ? { staticPath } : {}) }
  }

  private staticSegment(node: Node): string | number | null {
    return this.literal((node as { A_Const?: unknown }).A_Const).staticPath?.path[0] ?? null
  }

  private staticPath(node: Node): ExpressionResult['staticPath'] {
    const literal = (node as { A_Const?: unknown }).A_Const
    if (literal) return this.literal(literal).staticPath
    const array = (node as { A_ArrayExpr?: { elements?: Node[] } }).A_ArrayExpr
    if (!array) return undefined
    const path = (array.elements ?? []).map((element) => this.staticSegment(element))
    if (path.some((segment) => segment === null)) return undefined
    return { path: path as (string | number)[], operandType: 'text[]' }
  }

  private typeName(node: Record<string, unknown>): DatabaseType {
    const parts = ((node['names'] as Node[] | undefined) ?? [])
      .map(stringNode)
      .filter((part): part is string => part !== null)
    const array = ((node['arrayBounds'] as Node[] | undefined) ?? []).length > 0
    return {
      ...(parts.length > 1 ? { schema: parts.at(-2) } : {}),
      name: `${parts.at(-1) ?? ''}${array ? '[]' : ''}`,
    }
  }

  private resolveColumn(node: unknown, scope: Scope): ValueLineage {
    const fields = ((node as { fields?: Node[] }).fields ?? [])
      .map(stringNode)
      .filter((part): part is string => part !== null)
    if (fields.length === 1) {
      for (let current: Scope | null = scope; current; current = current.outer) {
        const matches = current.visible.filter((column) => column.name === fields[0])
        if (matches.length === 1) return matches[0]!.value
        if (matches.length > 1) return unknown()
      }
      return unknown()
    }
    if (fields.length === 2) {
      for (let current: Scope | null = scope; current; current = current.outer) {
        const binding = current.bindings.get(fields[0]!)
        const column = binding?.columns.find((candidate) => candidate.name === fields[1])
        if (column) return column.value
      }
      return unknown()
    }
    if (fields.length === 3) {
      for (let current: Scope | null = scope; current; current = current.outer) {
        for (const binding of current.bindings.values()) {
          if (
            binding.explicitAlias ||
            !binding.relation ||
            binding.relation.schema !== fields[0] ||
            binding.relation.name !== fields[1]
          ) {
            continue
          }
          const column = binding.columns.find((candidate) => candidate.name === fields[2])
          if (column) return column.value
        }
      }
    }
    return unknown()
  }

  private resolveCte(scope: Scope, name: string): BoundColumn[] | undefined {
    for (let current: Scope | null = scope; current; current = current.outer) {
      const columns = current.ctes.get(name)
      if (columns) return columns
    }
    return undefined
  }

  private opaque(nodeType: string, inputs: ValueLineage[]): ExpressionResult {
    return {
      value: {
        kind: 'transform',
        operation: { kind: 'opaque', nodeType },
        inputs,
        resolvedType: null,
      },
    }
  }

  private opaqueInputs(record: Record<string, unknown>, scope: Scope): ValueLineage[] {
    const inputs: ValueLineage[] = []
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      if (value === null || typeof value !== 'object') return
      const tag = nodeTag(value)
      if (
        [
          'ColumnRef',
          'A_Const',
          'TypeCast',
          'A_Expr',
          'CoalesceExpr',
          'CaseExpr',
          'FuncCall',
        ].includes(tag)
      ) {
        inputs.push(this.analyzeExpression(value as Node, scope).value)
        return
      }
      Object.values(value as Record<string, unknown>).forEach(visit)
    }
    Object.values(record).forEach(visit)
    return inputs
  }

  private starQualifier(node: Node): string | null {
    const fields = (node as { ColumnRef?: { fields?: Node[] } }).ColumnRef?.fields
    if (!fields?.some((field) => 'A_Star' in (field as object))) return null
    const qualifier = fields.map(stringNode).filter((part): part is string => part !== null)
    return qualifier.at(-1) ?? ''
  }

  private inferName(node: Node): string {
    const fields = (node as { ColumnRef?: { fields?: Node[] } }).ColumnRef?.fields
    if (fields) return fields.map(stringNode).filter(Boolean).at(-1) ?? ''
    const call = (node as { FuncCall?: { funcname?: Node[] } }).FuncCall
    if (call) return qualifiedName(call.funcname).name
    return '?column?'
  }
}
