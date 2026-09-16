import { join, dirname } from 'node:path'
import ts from 'typescript'
import type { CatalogSnapshot, ColumnInfo, TableInfo, ViewInfo } from '../../catalog/types.js'
import type { Config, JsonSchemaDocument, TypeImport } from '../../config/schema.js'
import { interpretValueLineage } from '../../query/value-lineage.js'
import type { SchemaRelationAnalyses } from '../../schema-analysis.js'
import {
  exportModifier,
  factory,
  importDeclarations,
  intersectionType,
  nullableType,
  printFile,
  propertyName,
  unionType,
} from './ast.js'
import { typescriptJsonSchemaBindings } from './json-schema-bindings.js'
import {
  resolveTypescriptColumnType,
  resolveTypescriptDomainBase,
  typeName,
  type ResolvedTypescriptType,
} from './type-mapping.js'
import {
  createTypescriptJsonSchemaGraphs,
  renderTypescriptJsonSchemaArtifacts,
} from './jsonschemas.js'
import { importedTypescriptType, type TypescriptTypeContext } from './type-mapping.js'
import { typescriptModuleSpecifier } from './paths.js'
import { resolveTypescriptValueType } from './value-type.js'

export interface TypescriptSchemaArtifact {
  path: string
  content: string
}

export interface TypescriptSchemaDiagnostic {
  code: 'generated-name-collision' | 'invalid-type-mapping'
  severity: 'error'
  message: string
}

export interface TypescriptSchemaArtifacts {
  artifacts: readonly TypescriptSchemaArtifact[]
  diagnostics: readonly TypescriptSchemaDiagnostic[]
}

export interface RenderTypescriptSchemaArtifactsOptions {
  relations?: SchemaRelationAnalyses
  jsonSchemasDirectory?: string
  emitJsonSchemaTypes?: boolean
}

export function renderTypescriptSchemaArtifacts(
  catalog: CatalogSnapshot,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  outDir: string,
  options: RenderTypescriptSchemaArtifactsOptions = {},
): TypescriptSchemaArtifacts {
  const target = config.sql.codegen?.typescript
  if (!target?.schema) return { artifacts: [], diagnostics: [] }
  const diagnostics: TypescriptSchemaDiagnostic[] = []
  const artifacts: TypescriptSchemaArtifact[] = [
    { path: join(outDir, 'helpers.d.ts'), content: printFile(helperDeclarations()) },
  ]
  let context: TypescriptTypeContext
  try {
    context = {
      jsonSchemaReference: (name) =>
        importedTypescriptType(
          typescriptModuleSpecifier(
            join(outDir, 'public', 'tables.d.ts'),
            join(
              options.jsonSchemasDirectory ?? join(dirname(outDir), 'jsonschemas'),
              'index.d.ts',
            ),
          ),
          name,
        ),
      jsonSchemaTypes: createTypescriptJsonSchemaGraphs(config, schemas),
    }
    if (options.emitJsonSchemaTypes !== false)
      artifacts.push(
        ...renderTypescriptJsonSchemaArtifacts(
          config,
          schemas,
          options.jsonSchemasDirectory ?? join(dirname(outDir), 'jsonschemas'),
        ),
      )
  } catch (error) {
    return {
      artifacts: [],
      diagnostics: [
        {
          code: 'invalid-type-mapping',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
  const schemaNames = new Set([
    ...catalog.tables.filter((item) => item.relkind !== 'S').map((item) => item.schema),
    ...catalog.views.map((item) => item.schema),
    ...catalog.materializedViews.map((item) => item.schema),
    ...catalog.enums.map((item) => item.schema),
    ...catalog.domains.map((item) => item.schema),
  ])
  for (const schema of [...schemaNames].sort(compareText)) {
    try {
      const tables = catalog.tables.filter((item) => item.schema === schema && item.relkind !== 'S')
      const views = [...catalog.views, ...catalog.materializedViews].filter(
        (item) => item.schema === schema,
      )
      const enums = catalog.enums.filter((item) => item.schema === schema)
      const domains = catalog.domains.filter((item) => item.schema === schema)
      assertUniqueNames([...tables, ...views], schema, 'relation')
      assertUniqueNames(enums, schema, 'enum')
      assertUniqueNames(domains, schema, 'domain')

      const tableFile = renderRelations(
        schema,
        tables,
        views,
        catalog,
        config,
        schemas,
        options.relations ?? {},
        {
          ...context,
          nativeModuleSpecifier: (sourceSchema, kind) =>
            sourceSchema === schema
              ? `./${kind === 'domain' ? 'domains' : 'enums'}.js`
              : `../${schemaDirectory(sourceSchema)}/${kind === 'domain' ? 'domains' : 'enums'}.js`,
        },
      )
      const enumFile = printFile(
        enums
          .sort(byName)
          .map((item) =>
            factory.createTypeAliasDeclaration(
              [exportModifier],
              typeName(item.name),
              undefined,
              union(
                item.values.map((value) =>
                  factory.createLiteralTypeNode(factory.createStringLiteral(value)),
                ),
              ),
            ),
          ),
      )
      const domainImports: TypeImport[] = []
      const domainReferences = new Map<string, Set<string>>()
      const domainDeclarations = domains.sort(byName).map((item) => {
        const resolved = resolveTypescriptDomainBase(item, catalog, config, {
          nativeModuleSpecifier: (sourceSchema, kind) =>
            sourceSchema === schema
              ? `./${kind === 'domain' ? 'domains' : 'enums'}.js`
              : `../${schemaDirectory(sourceSchema)}/${kind === 'domain' ? 'domains' : 'enums'}.js`,
        })
        collectTypeDependencies(schema, [resolved], domainImports, domainReferences, 'domain')
        return factory.createTypeAliasDeclaration(
          [exportModifier],
          typeName(item.name),
          undefined,
          resolved.type,
        )
      })
      const domainFile = printFile([
        ...referenceImports(domainReferences),
        ...importDeclarations(domainImports),
        ...domainDeclarations,
      ])
      const files: [string, string][] = [
        ['tables.d.ts', tableFile],
        ['enums.d.ts', enumFile],
        ['domains.d.ts', domainFile],
      ]
      const exported = files.filter(([, content]) => content.length > 0)
      for (const [name, content] of exported) {
        artifacts.push({ path: join(outDir, schemaDirectory(schema), name), content })
      }
      artifacts.push({
        path: join(outDir, schemaDirectory(schema), 'index.d.ts'),
        content: printFile(
          exported.map(([name]) =>
            factory.createExportDeclaration(
              undefined,
              true,
              undefined,
              factory.createStringLiteral(`./${name.replace(/\.d\.ts$/u, '.js')}`),
            ),
          ),
        ),
      })
    } catch (error) {
      diagnostics.push({
        code:
          error instanceof GeneratedNameCollisionError
            ? 'generated-name-collision'
            : 'invalid-type-mapping',
        severity: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return diagnostics.length ? { artifacts: [], diagnostics } : { artifacts, diagnostics }
}

const renderRelations = (
  schema: string,
  tables: readonly TableInfo[],
  views: readonly ViewInfo[],
  catalog: CatalogSnapshot,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  analyses: SchemaRelationAnalyses,
  context: TypescriptTypeContext,
): string => {
  const imports: TypeImport[] = []
  const references = new Map<string, Set<string>>()
  const declarations: ts.Statement[] = []
  for (const relation of [...tables].sort(byName)) {
    const columns = relation.columns.map((column) => ({
      column,
      resolved: resolveTypescriptColumnType(
        schema,
        relation.name,
        column,
        catalog,
        config,
        schemas,
        context,
      ),
      alwaysNull: false,
      ...storedColumnSemantics(column, catalog),
    }))
    collectTypeDependencies(
      schema,
      columns.map((item) => item.resolved),
      imports,
      references,
    )
    declarations.push(
      factory.createTypeAliasDeclaration(
        [exportModifier],
        typeName(relation.name),
        undefined,
        factory.createTypeReferenceNode('TableTypes', [
          rowType(columns, 'select'),
          rowType(columns, 'insert'),
          rowType(columns, 'update'),
        ]),
      ),
    )
  }
  const bindings = typescriptJsonSchemaBindings(config, schemas)
  for (const relation of [...views].sort(byName)) {
    const analysis = analyses[`${schema}.${relation.name}`]
    const columns = relation.columns.map((column, index) => {
      const mapped =
        config.sql.codegen?.typescript?.mappings.column[`${schema}.${relation.name}.${column.name}`]
      const catalogType = resolveTypescriptColumnType(
        schema,
        relation.name,
        column,
        catalog,
        config,
        schemas,
        context,
      )
      const analyzed = analysis?.columns[index]
      const inferred =
        mapped === undefined && analyzed?.value
          ? resolveTypescriptValueType(
              interpretValueLineage(analyzed.value),
              config,
              bindings,
              catalog,
              context,
            )
          : null
      return {
        column,
        resolved: inferred ?? catalogType,
        notNull: analyzed?.notNull ?? column.notNull,
        alwaysNull: analyzed?.alwaysNull ?? false,
        hasDefault: column.hasDefault,
      }
    })
    collectTypeDependencies(
      schema,
      columns.map((item) => item.resolved),
      imports,
      references,
    )
    declarations.push(
      factory.createTypeAliasDeclaration(
        [exportModifier],
        typeName(relation.name),
        undefined,
        factory.createTypeReferenceNode('TableTypes', [
          viewRowType(columns, analysis?.outputPresenceGroups ?? []),
          factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
          factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
        ]),
      ),
    )
  }
  if (declarations.length === 0) return ''
  const generatedImports = [
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(
        true,
        undefined,
        factory.createNamedImports([
          factory.createImportSpecifier(false, undefined, factory.createIdentifier('TableTypes')),
        ]),
      ),
      factory.createStringLiteral('../helpers.js'),
      undefined,
    ),
    ...referenceImports(references),
    ...importDeclarations(imports),
  ]
  return printFile([...generatedImports, ...declarations])
}

const rowType = (
  columns: readonly {
    column: ColumnInfo
    resolved: ResolvedTypescriptType
    notNull: boolean
    alwaysNull: boolean
    hasDefault: boolean
  }[],
  operation: 'select' | 'insert' | 'update',
): ts.TypeNode => {
  const members: ts.TypeElement[] = []
  for (const { column, resolved, notNull, alwaysNull, hasDefault } of columns) {
    const excluded =
      operation !== 'select' && (column.generated !== 'none' || column.identity === 'always')
    if (excluded) continue
    const optional =
      operation === 'update' ||
      (operation === 'insert' && (hasDefault || column.identity === 'byDefault' || !notNull))
    members.push(
      factory.createPropertySignature(
        undefined,
        propertyName(column.name),
        optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        selectedColumnType({ resolved, notNull, alwaysNull }),
      ),
    )
  }
  return factory.createTypeLiteralNode(members)
}

const viewRowType = (
  columns: readonly {
    column: ColumnInfo
    resolved: ResolvedTypescriptType
    notNull: boolean
    alwaysNull: boolean
    hasDefault: boolean
  }[],
  groups: readonly { columns: number[]; discriminants: number[] }[],
): ts.TypeNode => {
  const flat = rowType(columns, 'select')
  const refinements = groups.map((group) => {
    const present = factory.createTypeLiteralNode(
      group.columns.map((index) => {
        const column = columns[index]!
        const type = selectedColumnType(column)
        return factory.createPropertySignature(
          undefined,
          propertyName(column.column.name),
          undefined,
          group.discriminants.includes(index) ? withoutNull(type) : type,
        )
      }),
    )
    const absent = factory.createTypeLiteralNode(
      group.columns.map((index) =>
        factory.createPropertySignature(
          undefined,
          propertyName(columns[index]!.column.name),
          undefined,
          factory.createLiteralTypeNode(factory.createNull()),
        ),
      ),
    )
    return unionType([present, absent])
  })
  return intersectionType([flat, ...refinements])
}

const selectedColumnType = (column: {
  resolved: ResolvedTypescriptType
  notNull: boolean
  alwaysNull: boolean
}): ts.TypeNode =>
  column.alwaysNull
    ? factory.createLiteralTypeNode(factory.createNull())
    : nullableType(column.resolved.type, column.notNull)

const withoutNull = (type: ts.TypeNode): ts.TypeNode => {
  if (!ts.isUnionTypeNode(type)) return type
  const members = type.types.filter(
    (member) =>
      !(ts.isLiteralTypeNode(member) && member.literal.kind === ts.SyntaxKind.NullKeyword),
  )
  return members.length
    ? unionType(members)
    : factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
}

const collectTypeDependencies = (
  currentSchema: string,
  types: readonly ResolvedTypescriptType[],
  imports: TypeImport[],
  references: Map<string, Set<string>>,
  localKind?: 'domain' | 'enum',
): void => {
  for (const resolved of types) {
    imports.push(...resolved.imports)
    if (!resolved.reference) continue
    if (resolved.reference.schema === currentSchema && resolved.reference.kind === localKind) {
      continue
    }
    const suffix = resolved.reference.kind === 'domain' ? 'domains' : 'enums'
    const module =
      resolved.reference.schema === currentSchema
        ? `./${suffix}.js`
        : `../${schemaDirectory(resolved.reference.schema)}/${suffix}.js`
    const names = references.get(module) ?? new Set<string>()
    names.add(typeName(resolved.reference.name))
    references.set(module, names)
  }
}

const storedColumnSemantics = (
  column: ColumnInfo,
  catalog: CatalogSnapshot,
): { notNull: boolean; hasDefault: boolean } => {
  let notNull = column.notNull
  let hasDefault = column.hasDefault
  let oid = column.typeOid
  const seen = new Set<number>()
  while (!seen.has(oid)) {
    seen.add(oid)
    const domain = catalog.domains.find((item) => item.oid === oid)
    if (!domain) break
    notNull ||= domain.notNull
    hasDefault ||= domain.default !== null
    oid = domain.baseTypeOid
  }
  return { notNull, hasDefault }
}

const referenceImports = (
  references: ReadonlyMap<string, ReadonlySet<string>>,
): ts.ImportDeclaration[] =>
  [...references]
    .sort(([left], [right]) => compareText(left, right))
    .map(([module, names]) =>
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          true,
          undefined,
          factory.createNamedImports(
            [...names]
              .sort(compareText)
              .map((name) =>
                factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
              ),
          ),
        ),
        factory.createStringLiteral(module),
        undefined,
      ),
    )

const helperDeclarations = (): ts.Statement[] => {
  const parameters = ['Select', 'Insert', 'Update'].map((name) =>
    factory.createTypeParameterDeclaration(undefined, name),
  )
  const table = factory.createInterfaceDeclaration(
    [exportModifier],
    'TableTypes',
    parameters,
    undefined,
    ['select', 'insert', 'update'].map((name, index) =>
      factory.createPropertySignature(
        [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
        name,
        undefined,
        factory.createTypeReferenceNode(parameters[index]!.name),
      ),
    ),
  )
  const infer = (name: string, property: string): ts.TypeAliasDeclaration =>
    factory.createTypeAliasDeclaration(
      [exportModifier],
      name,
      [
        factory.createTypeParameterDeclaration(
          undefined,
          'Table',
          factory.createTypeReferenceNode('TableTypes', [
            factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
            factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
            factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
          ]),
        ),
      ],
      factory.createIndexedAccessTypeNode(
        factory.createTypeReferenceNode('Table'),
        factory.createLiteralTypeNode(factory.createStringLiteral(property)),
      ),
    )
  return [
    table,
    infer('InferSelect', 'select'),
    infer('InferInsert', 'insert'),
    infer('InferUpdate', 'update'),
  ]
}

const union = (members: readonly ts.TypeNode[]): ts.TypeNode =>
  members.length === 0
    ? factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
    : members.length === 1
      ? members[0]!
      : factory.createUnionTypeNode(members)

class GeneratedNameCollisionError extends Error {}

const assertUniqueNames = (
  values: readonly { name: string }[],
  schema: string,
  kind: string,
): void => {
  const names = new Map<string, string>()
  for (const value of values) {
    const generated = typeName(value.name)
    const previous = names.get(generated)
    if (previous) {
      throw new GeneratedNameCollisionError(
        `${kind} names ${JSON.stringify(previous)} and ${JSON.stringify(value.name)} in schema ${JSON.stringify(schema)} both generate ${generated}`,
      )
    }
    names.set(generated, value.name)
  }
}

const byName = <T extends { name: string }>(left: T, right: T): number =>
  compareText(left.name, right.name)
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const schemaDirectory = (schema: string): string =>
  encodeURIComponent(schema).replaceAll('.', '%2E')
