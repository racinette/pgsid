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

export interface ResolvedFunctionIdentity {
  schema: string
  name: string
  argTypes: readonly string[]
  resultType: string
  variadic: boolean
}

export type ValueOperation =
  | {
      kind: 'json-access'
      path: readonly (string | number)[]
      result: 'json' | 'text'
      operator?: ResolvedOperatorIdentity
      syntax: 'operator' | 'function' | 'subscript'
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
      resolution: ResolvedFunctionIdentity | null
    }
  | {
      kind: 'subscript'
    }
  | {
      kind: 'array-access'
      slice: boolean
    }
  | {
      kind: 'choice'
      form: 'case' | 'coalesce' | 'union' | 'intersect' | 'except' | 'values' | 'write-path'
    }
  | {
      kind: 'assignment'
      target: DatabaseColumn
      source: 'insert' | 'update' | 'merge' | 'default' | 'generated'
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
      value: string | number | boolean | null
    })
  | (LineageBase & {
      kind: 'parameter'
      number: number
    })
  | (LineageBase & {
      kind: 'row-absence'
      image: 'old' | 'new' | 'source'
      /** The value this path would have carried had the row existed. */
      origin: ValueLineage
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

export interface WriteValueLineage {
  target: DatabaseColumn
  source: 'insert' | 'update' | 'merge'
  value: ValueLineage
  partial: boolean
}

export interface ValueLineageCatalog {
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null
  viewAsts: ReadonlyMap<string, Node>
  resolveColumnTypeName(schema: string, table: string, column: string): string | null
  resolveCanonicalTypeName(typeName: string): string
  resolveOperatorIdentity(
    schema: string | undefined,
    name: string,
    leftType: string | null,
    rightType: string,
  ): ResolvedOperatorIdentity | null
  resolveFunctionIdentity(
    schema: string | undefined,
    name: string,
    argTypes: readonly (string | null)[],
  ): ResolvedFunctionIdentity | null
  resolveGenerationExpr(schema: string, table: string, column: string): Node | null
  resolveColumnDefaultExpr(schema: string, table: string, column: string): Node | null
}

export const VALUE_LINEAGE_CATALOG_ONLY = [
  'resolveFunctionIdentity',
  'resolveOperatorIdentity',
  'resolveColumnDefaultExpr',
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
  star?: BoundColumn[]
  ctes: Map<string, BoundColumn[]>
  outer: Scope | null
}

interface ExpressionResult {
  value: ValueLineage
  staticPath?: { path: (string | number)[]; operandType: string }
}

interface DmlTarget {
  relation: ResolvedTable
  alias: string
  explicitAlias: boolean
  base: BoundColumn[]
}

interface WritePath {
  old: BoundColumn[]
  new: BoundColumn[]
  plain: BoundColumn[]
  source?: BoundColumn[]
  sourceIsAbsent?: boolean
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

/** Parse the one-dimensional text-array spelling commonly used by `#>`/`#>>`. */
const postgresTextArrayPath = (input: string): string[] | null => {
  if (!input.startsWith('{') || !input.endsWith('}')) return null
  if (input === '{}') return []
  const result: string[] = []
  let value = ''
  let quoted = false
  let escaped = false
  let wasQuoted = false
  const push = (): boolean => {
    const segment = wasQuoted ? value : value.trim()
    if (!wasQuoted && segment.toUpperCase() === 'NULL') return false
    result.push(segment)
    value = ''
    wasQuoted = false
    return true
  }
  for (let index = 1; index < input.length - 1; index++) {
    const char = input[index]!
    if (escaped) {
      value += char
      escaped = false
    } else if (char === '\\') {
      escaped = true
    } else if (char === '"') {
      quoted = !quoted
      wasQuoted = true
    } else if (!quoted && char === ',') {
      if (!push()) return null
    } else if (!quoted && (char === '{' || char === '}')) {
      return null
    } else {
      value += char
    }
  }
  return quoted || escaped || !push() ? null : result
}

export function analyzeValueLineage(
  statement: Node,
  catalog: ValueLineageCatalog,
  options?: ValueLineageOptions,
): OutputValueLineage[] {
  return traceValueLineage(statement, catalog, options).map((output) => ({
    name: output.name,
    value: interpretValueLineage(output.value),
  }))
}

/** Preserve the expression calls exactly as the parsed query composed them. */
export function traceValueLineage(
  statement: Node,
  catalog: ValueLineageCatalog,
  options?: ValueLineageOptions,
): OutputValueLineage[] {
  return new ValueLineageAnalyzer(catalog, options).analyzeStatement(statement, null)
}

export function traceStatementValueLineage(
  statement: Node,
  catalog: ValueLineageCatalog,
  options?: ValueLineageOptions,
): { outputs: OutputValueLineage[]; writes: WriteValueLineage[] } {
  const analyzer = new ValueLineageAnalyzer(catalog, options)
  const outputs = analyzer.analyzeStatement(statement, null)
  return { outputs, writes: analyzer.writes }
}

export interface ValueLineageOptions {
  /** Canonical PostgreSQL parameter type names, indexed from `$1`. */
  parameterTypes?: readonly string[]
}

class ValueLineageAnalyzer {
  readonly writes: WriteValueLineage[] = []
  constructor(
    private readonly catalog: ValueLineageCatalog,
    private readonly options?: ValueLineageOptions,
  ) {}

  analyzeStatement(statement: Node, outer: Scope | null): OutputValueLineage[] {
    const record = statement as unknown as Record<string, Record<string, unknown> | undefined>
    if (record['SelectStmt']) return this.analyzeSelect(record['SelectStmt'], outer)
    if (record['InsertStmt']) return this.analyzeInsert(record['InsertStmt'], outer)
    if (record['UpdateStmt']) return this.analyzeUpdate(record['UpdateStmt'], outer)
    if (record['DeleteStmt']) return this.analyzeDelete(record['DeleteStmt'], outer)
    if (record['MergeStmt']) return this.analyzeMerge(record['MergeStmt'], outer)
    throw new UnsupportedValueLineageError(nodeTag(statement))
  }

  private emptyScope(outer: Scope | null): Scope {
    return { bindings: new Map(), visible: [], ctes: new Map(), outer }
  }

  private dmlTarget(relationNode: unknown): DmlTarget {
    const relation = relationNode as {
      schemaname?: string
      relname?: string
      alias?: { aliasname?: string }
    }
    if (!relation.relname) throw new UnsupportedValueLineageError('dml-target')
    const resolved = this.catalog.resolveTable(relation.schemaname, relation.relname)
    if (!resolved) throw new UnsupportedValueLineageError(`relation:${relation.relname}`)
    return {
      relation: resolved,
      alias: relation.alias?.aliasname ?? relation.relname,
      explicitAlias: relation.alias?.aliasname !== undefined,
      base: this.relationColumns(resolved),
    }
  }

  private bindColumns(
    scope: Scope,
    alias: string,
    columns: BoundColumn[],
    options?: { relation?: ResolvedTable; explicitAlias?: boolean; visible?: boolean },
  ): void {
    scope.bindings.set(alias, {
      alias,
      explicitAlias: options?.explicitAlias ?? true,
      ...(options?.relation ? { relation: options.relation } : {}),
      columns,
    })
    if (options?.visible) scope.visible.push(...columns)
  }

  private bindTarget(
    scope: Scope,
    target: DmlTarget,
    columns: BoundColumn[],
    visible = true,
  ): void {
    this.bindColumns(scope, target.alias, columns, {
      relation: target.relation,
      explicitAlias: target.explicitAlias,
      visible,
    })
  }

  private targetColumn(target: DmlTarget, name: string): DatabaseColumn {
    return { schema: target.relation.schema, relation: target.relation.name, column: name }
  }

  private assigned(
    target: DmlTarget,
    name: string,
    input: ValueLineage,
    source: Extract<ValueOperation, { kind: 'assignment' }>['source'],
    partial = false,
  ): ValueLineage {
    if (source === 'insert' || source === 'update' || source === 'merge')
      this.writes.push({ target: this.targetColumn(target, name), source, value: input, partial })
    return {
      kind: 'transform',
      operation: { kind: 'assignment', target: this.targetColumn(target, name), source },
      inputs: [input],
      resolvedType: this.catalog.resolveColumnTypeName(
        target.relation.schema,
        target.relation.name,
        name,
      ),
    }
  }

  private absent(target: DmlTarget, image: 'old' | 'new', name: string): ValueLineage {
    const origin = target.base.find((column) => column.name === name)?.value ?? unknown()
    return {
      kind: 'row-absence',
      image,
      origin,
      resolvedType: this.catalog.resolveColumnTypeName(
        target.relation.schema,
        target.relation.name,
        name,
      ),
    }
  }

  private absentRow(target: DmlTarget, image: 'old' | 'new'): BoundColumn[] {
    return target.relation.columns.map((name) => ({
      name,
      value: this.absent(target, image, name),
    }))
  }

  private writeChoice(values: readonly ValueLineage[]): ValueLineage {
    if (values.length === 1) return values[0]!
    return {
      kind: 'transform',
      operation: { kind: 'choice', form: 'write-path' },
      inputs: values,
      resolvedType: commonType(values),
    }
  }

  private valuesChoice(values: readonly ValueLineage[]): ValueLineage {
    if (values.length === 1) return values[0]!
    return {
      kind: 'transform',
      operation: { kind: 'choice', form: 'values' },
      inputs: values,
      resolvedType: commonType(values),
    }
  }

  private combineRows(paths: readonly BoundColumn[][]): BoundColumn[] {
    const first = paths[0] ?? []
    return first.map((column, index) => ({
      name: column.name,
      value: this.writeChoice(paths.map((path) => path[index]!.value)),
    }))
  }

  private returningNames(returning: unknown): { old: string; new: string } {
    let old = 'old'
    let next = 'new'
    const clause = returning as { options?: Node[] } | undefined
    for (const optionNode of clause?.options ?? []) {
      const option = (optionNode as { ReturningOption?: { option?: string; value?: string } })
        .ReturningOption
      if (!option?.value) continue
      if (option.option === 'RETURNING_OPTION_OLD') old = option.value
      if (option.option === 'RETURNING_OPTION_NEW') next = option.value
    }
    return { old, new: next }
  }

  private analyzeReturning(
    returning: unknown,
    scope: Scope,
    target: DmlTarget,
    path: WritePath,
    options?: { mergeStar?: BoundColumn[] },
  ): OutputValueLineage[] {
    const clause = returning as { exprs?: Node[] } | undefined
    if (!clause) return []
    const names = this.returningNames(returning)
    this.bindColumns(scope, names.old, path.old)
    this.bindColumns(scope, names.new, path.new)
    this.bindTarget(scope, target, path.plain, false)
    scope.visible.unshift(...(options?.mergeStar ?? path.plain))
    scope.star = options?.mergeStar ?? path.plain
    return (clause.exprs ?? []).flatMap((node) => this.analyzeTarget(node, scope))
  }

  private valuesRows(node: unknown): Node[][] {
    return ((node as Node[] | undefined) ?? []).map(
      (row) => (row as { List?: { items?: Node[] } }).List?.items ?? [],
    )
  }

  private assignmentExpression(node: Node, scope: Scope, multiColumnIndex?: number): ValueLineage {
    const multi = (node as { MultiAssignRef?: { source?: Node; colno?: number } }).MultiAssignRef
    if (!multi?.source) return this.analyzeExpression(node, scope).value
    const index = multiColumnIndex ?? Math.max(0, (multi.colno ?? 1) - 1)
    const row = (multi.source as { RowExpr?: { args?: Node[] } }).RowExpr
    const selected = row?.args?.[index]
    if (selected) return this.analyzeExpression(selected, scope).value
    const subselect = (multi.source as { SubLink?: { subselect?: Node } }).SubLink?.subselect
    if (subselect) return this.analyzeStatement(subselect, scope)[index]?.value ?? unknown()
    return this.analyzeExpression(multi.source, scope).value
  }

  private applyAssignments(
    target: DmlTarget,
    base: BoundColumn[],
    targets: Node[],
    scope: Scope,
    source: 'update' | 'merge',
  ): BoundColumn[] {
    const replacements = new Map<string, ValueLineage>()
    for (const targetNode of targets) {
      const res = (
        targetNode as { ResTarget?: { name?: string; val?: Node; indirection?: unknown[] } }
      ).ResTarget
      if (!res?.name || !res.val) continue
      if ((res.val as Record<string, unknown>)['SetToDefault']) {
        replacements.set(res.name, this.defaultValue(target, res.name, scope))
        continue
      }
      replacements.set(
        res.name,
        this.assigned(
          target,
          res.name,
          this.assignmentExpression(res.val, scope),
          source,
          Boolean(res.indirection?.length),
        ),
      )
    }
    return base.map((column) => ({
      name: column.name,
      value: replacements.get(column.name) ?? column.value,
    }))
  }

  private generatedRow(target: DmlTarget, row: BoundColumn[]): BoundColumn[] {
    const scope = this.emptyScope(null)
    this.bindTarget(scope, target, row)
    return row.map((column) => {
      const expr = this.catalog.resolveGenerationExpr(
        target.relation.schema,
        target.relation.name,
        column.name,
      )
      if (!expr) return column
      return {
        name: column.name,
        value: this.assigned(
          target,
          column.name,
          this.analyzeExpression(expr, scope).value,
          'generated',
        ),
      }
    })
  }

  private defaultValue(target: DmlTarget, name: string, scope: Scope): ValueLineage {
    const expr = this.catalog.resolveColumnDefaultExpr(
      target.relation.schema,
      target.relation.name,
      name,
    )
    const input = expr ? this.analyzeExpression(expr, scope).value : unknown()
    return this.assigned(target, name, input, 'default')
  }

  private analyzeUpdate(
    update: Record<string, unknown>,
    outer: Scope | null,
  ): OutputValueLineage[] {
    const target = this.dmlTarget(update['relation'])
    const scope = this.emptyScope(outer)
    this.registerCtes(update['withClause'], scope)
    this.bindTarget(scope, target, target.base)
    const sourceVisible: BoundColumn[] = []
    for (const item of (update['fromClause'] as Node[] | undefined) ?? []) {
      const columns = this.bindFromItem(item, scope)
      scope.visible.push(...columns)
      sourceVisible.push(...columns)
    }
    let next = this.applyAssignments(
      target,
      target.base,
      (update['targetList'] as Node[] | undefined) ?? [],
      scope,
      'update',
    )
    next = this.generatedRow(target, next)

    const returningScope = this.emptyScope(outer)
    returningScope.ctes = scope.ctes
    for (const [alias, binding] of scope.bindings) {
      if (alias !== target.alias) returningScope.bindings.set(alias, binding)
    }
    returningScope.visible.push(...sourceVisible)
    return this.analyzeReturning(update['returningClause'], returningScope, target, {
      old: target.base,
      new: next,
      plain: next,
    })
  }

  private analyzeDelete(
    update: Record<string, unknown>,
    outer: Scope | null,
  ): OutputValueLineage[] {
    const target = this.dmlTarget(update['relation'])
    const scope = this.emptyScope(outer)
    this.registerCtes(update['withClause'], scope)
    this.bindTarget(scope, target, target.base)
    const sourceVisible: BoundColumn[] = []
    for (const item of (update['usingClause'] as Node[] | undefined) ?? []) {
      const columns = this.bindFromItem(item, scope)
      scope.visible.push(...columns)
      sourceVisible.push(...columns)
    }
    const returningScope = this.emptyScope(outer)
    returningScope.ctes = scope.ctes
    for (const [alias, binding] of scope.bindings) {
      if (alias !== target.alias) returningScope.bindings.set(alias, binding)
    }
    returningScope.visible.push(...sourceVisible)
    return this.analyzeReturning(update['returningClause'], returningScope, target, {
      old: target.base,
      new: this.absentRow(target, 'new'),
      plain: target.base,
    })
  }

  private insertColumns(insert: Record<string, unknown>, target: DmlTarget): string[] {
    const explicit = ((insert['cols'] as Node[] | undefined) ?? [])
      .map((node) => (node as { ResTarget?: { name?: string } }).ResTarget?.name)
      .filter((name): name is string => name !== undefined)
    return explicit.length ? explicit : target.relation.columns
  }

  private analyzeInsertSource(
    insert: Record<string, unknown>,
    target: DmlTarget,
    scope: Scope,
  ): Map<string, ValueLineage> {
    const names = this.insertColumns(insert, target)
    const partialColumns = new Set(
      ((insert['cols'] as Node[] | undefined) ?? []).flatMap((node) => {
        const res = (node as { ResTarget?: { name?: string; indirection?: unknown[] } }).ResTarget
        return res?.name && res.indirection?.length ? [res.name] : []
      }),
    )
    const selectNode = insert['selectStmt'] as Node | undefined
    const select = (selectNode as { SelectStmt?: Record<string, unknown> } | undefined)?.SelectStmt
    const rows = this.valuesRows(select?.['valuesLists'])
    const result = new Map<string, ValueLineage>()
    if (rows.length) {
      names.forEach((name, index) => {
        const defaults = rows.map((row) => {
          const node = row[index]
          return !node || Boolean((node as Record<string, unknown>)['SetToDefault'])
        })
        if (defaults.every(Boolean)) {
          result.set(name, this.defaultValue(target, name, scope))
          return
        }
        const inputs = rows.map((row) => {
          const node = row[index]
          if (!node || (node as Record<string, unknown>)['SetToDefault']) {
            return this.defaultValue(target, name, scope)
          }
          return this.analyzeExpression(node, scope).value
        })
        result.set(
          name,
          this.assigned(
            target,
            name,
            this.valuesChoice(inputs),
            'insert',
            partialColumns.has(name),
          ),
        )
      })
      return result
    }
    if (selectNode) {
      const outputs = this.analyzeStatement(selectNode, scope)
      names.forEach((name, index) => {
        const output = outputs[index]?.value ?? unknown()
        result.set(name, this.assigned(target, name, output, 'insert', partialColumns.has(name)))
      })
    }
    return result
  }

  private completeInsertRow(
    target: DmlTarget,
    explicit: Map<string, ValueLineage>,
    scope: Scope,
    source: 'insert' | 'merge' = 'insert',
  ): BoundColumn[] {
    let row = target.relation.columns.map((name) => ({
      name,
      value: explicit.get(name) ?? this.defaultValue(target, name, scope),
    }))
    if (source === 'merge') {
      row = row.map((column) => {
        const explicitValue = explicit.get(column.name)
        if (!explicitValue) return column
        const input =
          explicitValue.kind === 'transform' && explicitValue.operation.kind === 'assignment'
            ? explicitValue.inputs[0]!
            : explicitValue
        return { name: column.name, value: this.assigned(target, column.name, input, 'merge') }
      })
    }
    return this.generatedRow(target, row)
  }

  private analyzeInsert(
    insert: Record<string, unknown>,
    outer: Scope | null,
  ): OutputValueLineage[] {
    const target = this.dmlTarget(insert['relation'])
    const sourceScope = this.emptyScope(outer)
    this.registerCtes(insert['withClause'], sourceScope)
    const proposed = this.completeInsertRow(
      target,
      this.analyzeInsertSource(insert, target, sourceScope),
      sourceScope,
    )
    const conflict = insert['onConflictClause'] as
      { action?: string; targetList?: Node[] } | undefined
    const paths: WritePath[] = [
      {
        old: this.absentRow(target, 'old'),
        new: proposed,
        plain: proposed,
      },
    ]
    if (conflict?.action === 'ONCONFLICT_UPDATE') {
      const conflictScope = this.emptyScope(outer)
      conflictScope.ctes = sourceScope.ctes
      this.bindTarget(conflictScope, target, target.base)
      this.bindColumns(conflictScope, 'excluded', proposed)
      let next = this.applyAssignments(
        target,
        target.base,
        conflict.targetList ?? [],
        conflictScope,
        'update',
      )
      next = this.generatedRow(target, next)
      paths.push({ old: target.base, new: next, plain: next })
    }
    const combined: WritePath = {
      old: this.combineRows(paths.map((path) => path.old)),
      new: this.combineRows(paths.map((path) => path.new)),
      plain: this.combineRows(paths.map((path) => path.plain)),
    }
    const returningScope = this.emptyScope(outer)
    returningScope.ctes = sourceScope.ctes
    return this.analyzeReturning(insert['returningClause'], returningScope, target, combined)
  }

  private sourceAbsent(columns: BoundColumn[]): BoundColumn[] {
    return columns.map((column) => {
      return {
        name: column.name,
        value: {
          kind: 'row-absence',
          image: 'source',
          origin: column.value,
          resolvedType: column.value.resolvedType,
        },
      }
    })
  }

  private analyzeMerge(insert: Record<string, unknown>, outer: Scope | null): OutputValueLineage[] {
    const target = this.dmlTarget(insert['relation'])
    const scope = this.emptyScope(outer)
    this.registerCtes(insert['withClause'], scope)
    this.bindTarget(scope, target, target.base)
    const sourceNode = insert['sourceRelation'] as Node | undefined
    const source = sourceNode ? this.bindFromItem(sourceNode, scope) : []
    scope.visible.push(...source)
    const paths: WritePath[] = []
    for (const armNode of (insert['mergeWhenClauses'] as Node[] | undefined) ?? []) {
      const arm = (
        armNode as {
          MergeWhenClause?: {
            matchKind?: string
            commandType?: string
            targetList?: Node[]
            values?: Node[]
          }
        }
      ).MergeWhenClause
      if (!arm || arm.commandType === 'CMD_NOTHING') continue
      const sourceRow =
        arm.matchKind === 'MERGE_WHEN_NOT_MATCHED_BY_SOURCE' ? this.sourceAbsent(source) : source
      const sourceIsAbsent = arm.matchKind === 'MERGE_WHEN_NOT_MATCHED_BY_SOURCE'
      if (arm.commandType === 'CMD_DELETE') {
        paths.push({
          old: target.base,
          new: this.absentRow(target, 'new'),
          plain: target.base,
          source: sourceRow,
          sourceIsAbsent,
        })
        continue
      }
      if (arm.commandType === 'CMD_INSERT') {
        const names = (arm.targetList ?? [])
          .map((node) => (node as { ResTarget?: { name?: string } }).ResTarget?.name)
          .filter((name): name is string => name !== undefined)
        const explicit = new Map<string, ValueLineage>()
        names.forEach((name, index) => {
          const value = arm.values?.[index]
          if (value)
            explicit.set(
              name,
              this.assigned(target, name, this.analyzeExpression(value, scope).value, 'merge'),
            )
        })
        const next = this.completeInsertRow(target, explicit, scope, 'merge')
        paths.push({
          old: this.absentRow(target, 'old'),
          new: next,
          plain: next,
          source: sourceRow,
          sourceIsAbsent,
        })
        continue
      }
      if (arm.commandType === 'CMD_UPDATE') {
        let next = this.applyAssignments(target, target.base, arm.targetList ?? [], scope, 'merge')
        next = this.generatedRow(target, next)
        paths.push({ old: target.base, new: next, plain: next, source: sourceRow, sourceIsAbsent })
      }
    }
    if (!paths.length) return []
    const combined: WritePath = {
      old: this.combineRows(paths.map((path) => path.old)),
      new: this.combineRows(paths.map((path) => path.new)),
      plain: this.combineRows(paths.map((path) => path.plain)),
      source: this.combineRows(paths.map((path) => path.source ?? source)),
    }
    const returningScope = this.emptyScope(outer)
    returningScope.ctes = scope.ctes
    for (const [alias, binding] of scope.bindings) {
      if (alias === target.alias) continue
      this.bindColumns(
        returningScope,
        alias,
        binding.columns.map((column) => ({
          name: column.name,
          value: this.writeChoice(
            paths.map((path) =>
              path.sourceIsAbsent ? this.sourceAbsent([column])[0]!.value : column.value,
            ),
          ),
        })),
        { relation: binding.relation, explicitAlias: binding.explicitAlias },
      )
    }
    return this.analyzeReturning(insert['returningClause'], returningScope, target, combined, {
      mergeStar: [...(combined.source ?? []), ...combined.plain],
    })
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
    const values = this.valuesRows(select['valuesLists'])
    if (values.length) return this.analyzeValues(values, scope)

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
      const sourceColumns = cte ?? this.readRelationColumns(relation!)
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
      | {
          larg?: Node
          rarg?: Node
          jointype?: string
          usingClause?: Node[]
          isNatural?: boolean
        }
      | undefined
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
        if (join.jointype === 'JOIN_RIGHT') {
          merged.push({ name, value: rightColumn.value })
          continue
        }
        if (join.jointype !== 'JOIN_FULL') {
          merged.push({ name, value: leftColumn.value })
          continue
        }
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

  private readRelationColumns(relation: ResolvedTable): BoundColumn[] {
    if (relation.kind !== 'view' && relation.kind !== 'materialized-view') {
      return this.relationColumns(relation)
    }
    const definition = this.catalog.viewAsts.get(`${relation.schema}.${relation.name}`)
    if (!definition) return this.relationColumns(relation)
    const outputs = this.analyzeStatement(definition, null)
    const stored = this.relationColumns(relation)
    return relation.columns.map((name, index) => ({
      name,
      value: outputs[index]?.value ?? stored[index]!.value,
    }))
  }

  private analyzeTarget(targetNode: Node, scope: Scope): OutputValueLineage[] {
    const target = (targetNode as { ResTarget?: { name?: string; val?: Node } }).ResTarget
    if (!target?.val) return []
    const star = this.starQualifier(target.val)
    if (star !== null) {
      const columns =
        star === '' ? (scope.star ?? scope.visible) : (scope.bindings.get(star)?.columns ?? [])
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
    const parameter = record['ParamRef'] as { number?: number } | undefined
    if (parameter) {
      const number = parameter.number ?? 0
      return {
        value: {
          kind: 'parameter',
          number,
          resolvedType: this.options?.parameterTypes?.[number - 1] ?? null,
        },
      }
    }

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
      const args = call.args ?? []
      const inputs = args.map((argument) => this.analyzeExpression(argument, scope).value)
      const name = qualifiedName(call.funcname)
      const resolution = this.catalog.resolveFunctionIdentity(
        name.schema,
        name.name,
        inputs.map((input) => input.resolvedType),
      )
      return {
        value: {
          kind: 'transform',
          operation: { kind: 'function', function: name, resolution },
          inputs,
          resolvedType: resolution?.resultType ?? null,
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
    const staticPath = this.staticPath(expression.rexpr, name.name)
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
    if (input.resolvedType?.endsWith('[]')) {
      const parts = indirection.indirection ?? []
      const indices = parts.map(
        (part) =>
          (part as { A_Indices?: { uidx?: Node; lidx?: Node; is_slice?: boolean } }).A_Indices,
      )
      if (!indices.length || indices.some((index) => !index))
        return this.opaque('A_Indirection', [input])
      const slice = indices.some((index) => index?.is_slice)
      return {
        value: {
          kind: 'transform',
          operation: { kind: 'array-access', slice },
          inputs: [
            input,
            ...indices.flatMap((index) =>
              [index?.lidx, index?.uidx]
                .filter((node): node is Node => !!node)
                .map((node) => this.analyzeExpression(node, scope).value),
            ),
          ],
          resolvedType: slice ? input.resolvedType : input.resolvedType.slice(0, -2),
        },
      }
    }
    if (input.resolvedType !== 'jsonb') return this.opaque('A_Indirection', [input])
    const indices: ValueLineage[] = []
    for (const item of indirection.indirection ?? []) {
      const index = (item as { A_Indices?: { uidx?: Node; lidx?: Node } }).A_Indices
      if (!index?.uidx || index.lidx) return this.opaque('A_Indirection', [input])
      indices.push(this.analyzeExpression(index.uidx, scope).value)
    }
    return {
      value: {
        kind: 'transform',
        operation: { kind: 'subscript' },
        inputs: [input, ...indices],
        resolvedType: 'jsonb',
      },
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
    const value = constant.isnull
      ? null
      : constant.ival
        ? (constant.ival.ival ?? 0)
        : constant.fval
          ? Number(constant.fval.fval)
          : constant.boolval
            ? (constant.boolval.boolval ?? false)
            : constant.sval
              ? (constant.sval.sval ?? '')
              : null
    return {
      value: { kind: 'literal', value, resolvedType },
      ...(staticPath ? { staticPath } : {}),
    }
  }

  private staticSegment(node: Node): string | number | null {
    return this.literal((node as { A_Const?: unknown }).A_Const).staticPath?.path[0] ?? null
  }

  private staticPath(node: Node, operatorName?: string): ExpressionResult['staticPath'] {
    const literal = (node as { A_Const?: unknown }).A_Const
    if (literal) {
      const result = this.literal(literal).staticPath
      if (
        result &&
        typeof result.path[0] === 'string' &&
        (operatorName === '#>' || operatorName === '#>>')
      ) {
        const path = postgresTextArrayPath(result.path[0])
        if (path) return { path, operandType: 'text[]' }
      }
      return result
    }
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

const staticLineagePath = (value: ValueLineage): (string | number)[] | null => {
  if (value.kind === 'literal') {
    return typeof value.value === 'string' || typeof value.value === 'number' ? [value.value] : null
  }
  if (value.kind === 'transform' && value.operation.kind === 'cast' && value.inputs.length === 1) {
    return staticLineagePath(value.inputs[0]!)
  }
  if (
    value.kind !== 'transform' ||
    value.operation.kind !== 'opaque' ||
    value.operation.nodeType !== 'A_ArrayExpr'
  ) {
    return null
  }
  const path = value.inputs.flatMap((input) => staticLineagePath(input) ?? [])
  return path.length === value.inputs.length ? path : null
}

const interpretedJsonAccess = (
  input: ValueLineage,
  path: readonly (string | number)[],
  result: 'json' | 'text',
  syntax: 'operator' | 'function' | 'subscript',
  operator?: ResolvedOperatorIdentity,
): ValueLineage => {
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

// These functions select a statically named field or array position. JSONPath
// functions deliberately stay as generic function calls: interpreting their
// path language belongs to PostgreSQL, not this pass.
const JSON_FUNCTION_RESULTS: Readonly<Record<string, 'json' | 'text'>> = {
  json_array_element: 'json',
  json_array_element_text: 'text',
  json_extract_path: 'json',
  json_extract_path_text: 'text',
  json_object_field: 'json',
  json_object_field_text: 'text',
  jsonb_array_element: 'json',
  jsonb_array_element_text: 'text',
  jsonb_extract_path: 'json',
  jsonb_extract_path_text: 'text',
  jsonb_object_field: 'json',
  jsonb_object_field_text: 'text',
}

export function interpretValueLineage(value: ValueLineage): ValueLineage {
  if (value.kind === 'row-absence') {
    return { ...value, origin: interpretValueLineage(value.origin) }
  }
  if (value.kind !== 'transform') return value
  const inputs = value.inputs.map(interpretValueLineage)

  if (value.operation.kind === 'operator') {
    const resolution = value.operation.resolution
    const rawPath = inputs[1] ? staticLineagePath(inputs[1]) : null
    const path =
      resolution?.rightType === 'text[]' && rawPath?.length === 1 && typeof rawPath[0] === 'string'
        ? postgresTextArrayPath(rawPath[0])
        : rawPath
    if (
      inputs[0] &&
      path &&
      resolution?.schema === 'pg_catalog' &&
      ['->', '->>', '#>', '#>>'].includes(resolution.name) &&
      (resolution.leftType === 'json' || resolution.leftType === 'jsonb')
    ) {
      const result = resolution.name.endsWith('>>') || resolution.name === '->>' ? 'text' : 'json'
      return interpretedJsonAccess(inputs[0], path, result, 'operator', resolution)
    }
  }

  if (value.operation.kind === 'function') {
    const resolution = value.operation.resolution
    const result =
      resolution?.schema === 'pg_catalog' ? JSON_FUNCTION_RESULTS[resolution.name] : undefined
    const path = inputs.slice(1).flatMap((input) => staticLineagePath(input) ?? [])
    if (inputs[0] && result && path.length === inputs.length - 1) {
      return interpretedJsonAccess(inputs[0], path, result, 'function')
    }
  }

  if (value.operation.kind === 'subscript') {
    const path = inputs.slice(1).flatMap((input) => staticLineagePath(input) ?? [])
    if (inputs[0] && path.length === inputs.length - 1) {
      return interpretedJsonAccess(inputs[0], path, 'json', 'subscript')
    }
  }

  return { ...value, inputs }
}
