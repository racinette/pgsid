import type { Config, JsonSchemaDocument, TargetTypeMapping, TypeImport } from '../config/schema.js'
import type { QueryAnalysisItem } from '../query-analysis.js'
import {
  interpretValueLineage,
  type DatabaseColumn,
  type ValueLineage,
} from '../query/value-lineage.js'
import {
  resolveJsonSchemaLineage,
  typescriptJsonSchemaBindings,
  type JsonSchemaLineage,
} from './json-schema-lineage.js'
import { renderTypescriptJsonSchemaLineage } from './typescript-json-schema.js'
import { generateTypescriptJsonSchemaLineageValidator } from './typescript-json-schema-validator.js'

export type TypescriptQueryDiagnosticCode =
  | 'duplicate-output-name'
  | 'generated-name-collision'
  | 'json-schema-validator'
  | 'output-type-shape'
  | 'parameter-type-shape'

export interface TypescriptQueryDiagnostic {
  code: TypescriptQueryDiagnosticCode
  severity: 'warning' | 'error'
  queryId: string
  message: string
}

export interface RenderTypescriptQueryArtifactsOptions {
  typesModuleSpecifier?: string
}

export interface TypescriptQueryArtifacts {
  types: string | null
  wrappers: string | null
  diagnostics: readonly TypescriptQueryDiagnostic[]
}

interface RenderedQuery {
  typeDeclarations: string[]
  wrapper: string
  imports: TypeImport[]
}

interface ResolvedType {
  type: string
  imports: TypeImport[]
  lineage?: JsonSchemaLineage
}

interface RenderedValidator {
  source: string
  name: string
  column: string
}

const DEFAULT_TYPES: Readonly<Record<string, string>> = {
  bool: 'boolean',
  boolean: 'boolean',
  bytea: 'Buffer',
  date: 'Date',
  float4: 'number',
  float8: 'number',
  int2: 'number',
  int4: 'number',
  int8: 'string',
  integer: 'number',
  json: 'unknown',
  jsonb: 'unknown',
  numeric: 'string',
  real: 'number',
  smallint: 'number',
  text: 'string',
  timestamp: 'Date',
  timestamptz: 'Date',
  uuid: 'string',
}

const TYPE_ALIASES: Readonly<Record<string, string>> = {
  bigint: 'int8',
  boolean: 'bool',
  'character varying': 'varchar',
  'double precision': 'float8',
  integer: 'int4',
  real: 'float4',
  smallint: 'int2',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
}

export function renderTypescriptQueryArtifacts(
  analyses: readonly QueryAnalysisItem[],
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  options: RenderTypescriptQueryArtifactsOptions = {},
): TypescriptQueryArtifacts {
  const diagnostics: TypescriptQueryDiagnostic[] = []
  const target = config.sql.codegen?.typescript
  if (!target) return { types: null, wrappers: null, diagnostics }
  const bindings = typescriptJsonSchemaBindings(config, schemas)
  const ordered = [...analyses].sort(
    (left, right) => left.query.definition.sourceStart - right.query.definition.sourceStart,
  )
  const names = new Set<string>()
  const rendered: RenderedQuery[] = []
  for (const analysis of ordered) {
    const generatedName = pascalCase(analysis.query.name)
    if (names.has(generatedName)) {
      diagnostics.push({
        code: 'generated-name-collision',
        severity: 'error',
        queryId: analysis.query.id,
        message: `Query name ${JSON.stringify(analysis.query.name)} collides as ${generatedName}`,
      })
      continue
    }
    names.add(generatedName)
    const query = renderQuery(analysis, config, bindings, diagnostics)
    if (query) rendered.push(query)
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { types: null, wrappers: null, diagnostics }
  }

  const imports = renderImports(rendered.flatMap((query) => query.imports))
  const typeBody = rendered.flatMap((query) => query.typeDeclarations).join('\n\n')
  const types = joinSections(imports, typeBody)
  const moduleSpecifier = options.typesModuleSpecifier ?? './types.js'
  const imported = rendered.flatMap((query) => importedNames(query.wrapper))
  const wrapperImport = imported.length
    ? `import { ${[...new Set(imported)].join(', ')} } from ${JSON.stringify(moduleSpecifier)}`
    : ''
  const wrappers = joinSections(
    wrapperImport,
    queryableDeclaration(),
    rendered.map((q) => q.wrapper).join('\n\n'),
  )
  return { types: `${types}\n`, wrappers: `${wrappers}\n`, diagnostics }
}

const renderQuery = (
  analysis: QueryAnalysisItem,
  config: Config,
  bindings: ReturnType<typeof typescriptJsonSchemaBindings>,
  diagnostics: TypescriptQueryDiagnostic[],
): RenderedQuery | null => {
  const queryName = pascalCase(analysis.query.name)
  const functionName = camelCase(analysis.query.name)
  const outputNames = analysis.description?.columns ?? analysis.contract.outputs.map((o) => o.name)
  const duplicates = outputNames.filter((name, index) => outputNames.indexOf(name) !== index)
  if (duplicates.length) {
    diagnostics.push({
      code: 'duplicate-output-name',
      severity: 'error',
      queryId: analysis.query.id,
      message: `Duplicate output name ${JSON.stringify(duplicates[0])}; add an SQL alias`,
    })
    return null
  }

  const outputTypes = positionalTypes(
    analysis,
    analysis.description?.columnTypes,
    outputNames.length,
    'output-type-shape',
    diagnostics,
  )
  const parameterTypes = positionalTypes(
    analysis,
    analysis.description?.parameterTypes,
    analysis.contract.params.length,
    'parameter-type-shape',
    diagnostics,
  )
  const semanticLineage = analysis.rawLineage?.map((output) => interpretValueLineage(output.value))
  const imports: TypeImport[] = []
  const validators: RenderedValidator[] = []
  const rowTypes = outputNames.map((name, index) => {
    const resolved = resolveOutputType(
      outputTypes[index] ?? 'unknown',
      semanticLineage?.[index],
      config,
      bindings,
    )
    imports.push(...resolved.imports)
    const claim = analysis.contract.outputs[index]
    const type = claim?.alwaysNull ? 'null' : nullable(resolved.type, claim?.notNull ?? false)
    if (resolved.lineage) {
      try {
        const validatorName = `is${queryName}${pascalCase(name)}${index + 1}`
        const validator = generateTypescriptJsonSchemaLineageValidator(
          validatorName,
          `${queryName}Row[${JSON.stringify(name)}]`,
          resolved.lineage,
          { nullable: !(claim?.notNull ?? false) },
        )
        if (validator) {
          validators.push({
            source: validator,
            name: validatorName,
            column: name,
          })
        }
      } catch (error) {
        diagnostics.push({
          code: 'json-schema-validator',
          severity: 'error',
          queryId: analysis.query.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return type
  })

  const paramTypes = analysis.contract.params.map((param, index) => {
    const resolved = resolvePgType(parameterTypes[index] ?? 'unknown', config)
    imports.push(...resolved.imports)
    return nullable(resolved.type, param.notNull)
  })
  const params = renderParams(queryName, analysis, paramTypes)
  const row = renderRow(queryName, outputNames, rowTypes, analysis.contract.outputPresenceGroups)
  const sqlName = `${functionName}Sql`
  const declarations = [
    `export const ${sqlName} = ${JSON.stringify(analysis.query.definition.sql)}`,
    params,
    row,
  ]
  declarations.push(...validators.map((validator) => validator.source))
  return {
    typeDeclarations: declarations,
    wrapper: renderWrapper(analysis, queryName, functionName, sqlName, validators),
    imports,
  }
}

const positionalTypes = (
  analysis: QueryAnalysisItem,
  types: readonly string[] | undefined,
  length: number,
  code: 'output-type-shape' | 'parameter-type-shape',
  diagnostics: TypescriptQueryDiagnostic[],
): readonly string[] => {
  if (!types) return Array.from({ length }, () => 'unknown')
  if (types.length === length) return types
  diagnostics.push({
    code,
    severity: 'error',
    queryId: analysis.query.id,
    message: `Expected ${length} described types but received ${types.length}`,
  })
  return Array.from({ length }, () => 'unknown')
}

const resolveOutputType = (
  pgType: string,
  value: ValueLineage | undefined,
  config: Config,
  bindings: ReturnType<typeof typescriptJsonSchemaBindings>,
): ResolvedType => {
  if (value) {
    const lineage = resolveJsonSchemaLineage(value, bindings)
    if (lineage.alternatives.length || lineage.complete) {
      return { type: renderTypescriptJsonSchemaLineage(lineage), imports: [], lineage }
    }
    const column = directColumn(value)
    if (column) {
      const mapping = config.sql.codegen?.typescript?.mappings.column[columnKey(column)]
      if (mapping && (typeof mapping === 'string' || 'type' in mapping)) return mapped(mapping)
    }
  }
  return resolvePgType(pgType, config)
}

const resolvePgType = (pgType: string, config: Config): ResolvedType => {
  const mappings = config.sql.codegen?.typescript?.mappings.pgType ?? {}
  const base = pgType.endsWith('[]') ? pgType.slice(0, -2) : pgType
  const unqualified = base.split('.').at(-1)?.replaceAll('"', '') ?? base
  const alias = TYPE_ALIASES[unqualified] ?? unqualified
  const mapping = mappings[pgType] ?? mappings[base] ?? mappings[`pg_catalog.${alias}`]
  if (mapping) {
    const resolved = mapped(mapping)
    return pgType.endsWith('[]') ? { ...resolved, type: `(${resolved.type})[]` } : resolved
  }
  const type = DEFAULT_TYPES[alias] ?? DEFAULT_TYPES[base] ?? 'unknown'
  return { type: pgType.endsWith('[]') ? `(${type})[]` : type, imports: [] }
}

const mapped = (mapping: TargetTypeMapping): ResolvedType =>
  typeof mapping === 'string'
    ? { type: mapping, imports: [] }
    : { type: mapping.type, imports: mapping.imports ?? [] }

const directColumn = (value: ValueLineage): DatabaseColumn | null =>
  value.kind === 'column'
    ? value.column
    : value.kind === 'row-absence'
      ? directColumn(value.origin)
      : null

const columnKey = (column: DatabaseColumn): string =>
  `${column.schema}.${column.relation}.${column.column}`

const renderParams = (
  queryName: string,
  analysis: QueryAnalysisItem,
  types: readonly string[],
): string => {
  const named = analysis.query.definition.parameters
  if (named.length) {
    const names = new Map(named.map((parameter) => [parameter.index, parameter.name]))
    const flat = objectType(
      types.map((type, index) => [names.get(index + 1) ?? `$${index + 1}`, type]),
    )
    const groups = analysis.contract.paramRejectionSets.map((group) =>
      unionType(
        group.map((required) =>
          objectType(
            group.map((number) => [
              names.get(number) ?? `$${number}`,
              number === required
                ? withoutNull(types[number - 1] ?? 'unknown')
                : (types[number - 1] ?? 'unknown'),
            ]),
          ),
        ),
      ),
    )
    return `export type ${queryName}Params = ${intersectionType([flat, ...groups])}`
  }
  const tuple = (members: readonly string[]): string => `readonly [${members.join(', ')}]`
  const groups = analysis.contract.paramRejectionSets.map((group) =>
    unionType(
      group.map((required) =>
        tuple(types.map((type, index) => (index + 1 === required ? withoutNull(type) : type))),
      ),
    ),
  )
  return `export type ${queryName}Params = ${intersectionType([tuple(types), ...groups])}`
}

const renderRow = (
  queryName: string,
  names: readonly string[],
  types: readonly string[],
  groups: QueryAnalysisItem['contract']['outputPresenceGroups'],
): string => {
  const flat = objectType(names.map((name, index) => [name, types[index] ?? 'unknown']))
  const refinements = groups.map((group) => {
    const present = objectType(
      group.columns.map((index) => [
        names[index] ?? '',
        group.discriminants.includes(index)
          ? withoutNull(types[index] ?? 'unknown')
          : (types[index] ?? 'unknown'),
      ]),
    )
    const absent = objectType(group.columns.map((index) => [names[index] ?? '', 'null']))
    return unionType([present, absent])
  })
  return `export type ${queryName}Row = ${intersectionType([flat, ...refinements])}`
}

const renderWrapper = (
  analysis: QueryAnalysisItem,
  queryName: string,
  functionName: string,
  sqlName: string,
  validators: readonly RenderedValidator[],
): string => {
  const named = analysis.query.definition.parameters
  const args = named.length
    ? `db: Queryable, params: ${queryName}Params`
    : analysis.contract.params.length
      ? `db: Queryable, ...params: ${queryName}Params`
      : 'db: Queryable'
  const values = named.length
    ? `[${[...named]
        .sort((a, b) => a.index - b.index)
        .map((p) => `params[${JSON.stringify(p.name)}]`)
        .join(', ')}]`
    : analysis.contract.params.length
      ? '[...params]'
      : '[]'
  if (analysis.query.definition.command === 'exec') {
    return `export async function ${functionName}(${args}): Promise<void> {\n  await db.query(${sqlName}, ${values})\n}`
  }
  if (analysis.query.definition.command === 'execrows') {
    return `export async function ${functionName}(${args}): Promise<number> {\n  const result = await db.query(${sqlName}, ${values})\n  return result.rowCount ?? 0\n}`
  }
  const checks = validators.map(
    (validator) =>
      `if (!${validator.name}(row[${JSON.stringify(validator.column)}])) throw new TypeError(${JSON.stringify(`Invalid ${analysis.query.name}.${validator.column}`)})`,
  )
  const validate = checks.length ? `\n    ${checks.join('\n    ')}` : ''
  if (analysis.query.definition.command === 'one') {
    return `export async function ${functionName}(${args}): Promise<${queryName}Row | undefined> {\n  const result = await db.query(${sqlName}, ${values})\n  const row = result.rows[0]\n  if (row === undefined) return undefined${validate.replaceAll('    ', '  ')}\n  return row as ${queryName}Row\n}`
  }
  return `export async function ${functionName}(${args}): Promise<${queryName}Row[]> {\n  const result = await db.query(${sqlName}, ${values})\n  return result.rows.map((row) => {${validate}\n    return row as ${queryName}Row\n  })\n}`
}

const importedNames = (wrapper: string): string[] => {
  const names = new Set<string>()
  for (const match of wrapper.matchAll(
    /\b[A-Z][A-Za-z0-9_]*(?:Params|Row)\b|\b[a-z][A-Za-z0-9_]*Sql\b|\bis[A-Z][A-Za-z0-9_]*\b/gu,
  ))
    names.add(match[0])
  return [...names]
}

const renderImports = (imports: readonly TypeImport[]): string =>
  [...new Set(imports.map(renderImport))].sort().join('\n')

const renderImport = (value: TypeImport): string => {
  if ('default' in value) return `import ${value.default} from ${JSON.stringify(value.from)}`
  if ('namespace' in value)
    return `import * as ${value.namespace} from ${JSON.stringify(value.from)}`
  return `import { ${value.name}${value.as ? ` as ${value.as}` : ''} } from ${JSON.stringify(value.from)}`
}

const queryableDeclaration = (): string =>
  `export interface Queryable {\n  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>\n}`

const objectType = (fields: readonly (readonly [string, string])[]): string =>
  `{ ${fields.map(([name, type]) => `${JSON.stringify(name)}: ${type}`).join('; ')} }`

const unionType = (types: readonly string[]): string =>
  types.length === 1 ? types[0]! : types.map((type) => `(${type})`).join(' | ')

const intersectionType = (types: readonly string[]): string =>
  types.length === 1 ? types[0]! : types.map((type) => `(${type})`).join(' & ')

const nullable = (type: string, notNull: boolean): string =>
  notNull || type === 'null' ? type : `${parenthesize(type)} | null`

const withoutNull = (type: string): string =>
  type
    .split(' | ')
    .filter((member) => member !== 'null')
    .join(' | ') || 'never'

const parenthesize = (type: string): string => (type.includes(' | ') ? `(${type})` : type)

const words = (name: string): string[] => name.split(/[^A-Za-z0-9]+/u).filter(Boolean)
const pascalCase = (name: string): string =>
  words(name)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join('')
const camelCase = (name: string): string => {
  const pascal = pascalCase(name)
  return `${pascal[0]?.toLowerCase() ?? ''}${pascal.slice(1)}`
}

const joinSections = (...sections: string[]): string => sections.filter(Boolean).join('\n\n')
