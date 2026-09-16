import { join } from 'node:path'
import type {
  CatalogSnapshot,
  ColumnInfo,
  DomainInfo,
  TableInfo,
  ViewInfo,
} from '../../catalog/types.js'
import type { Config, GoTypeImport, JsonSchemaDocument } from '../../config/schema.js'
import { interpretValueLineage } from '../../query/value-lineage.js'
import type { SchemaRelationAnalyses } from '../../schema-analysis.js'
import { go, printGoFile, type GoDeclaration, type GoField } from './ast.js'
import {
  usesGoNullStructs,
  renderGoNulls,
  goNullsOutDir,
  goJsonNulls,
  goNullsImportPath,
} from './nulls.js'
import { normalizeGoImports } from './imports.js'
import {
  goJsonSchemasOutDir,
  referencedGoJsonSchemas,
  renderGoJsonSchemaArtifacts,
} from './jsonschemas.js'
import {
  assertUniqueGoNames,
  GeneratedGoNameCollisionError,
  goName,
  goPackageName,
  goSchemaDirectory,
  assertUniqueGoSchemaDirectories,
} from './names.js'
import {
  createGoTypeContext,
  type GoTypeContext,
  nullableGoType,
  addGoNullImport,
  resolveGoColumnType,
  resolveGoDomainBase,
  resolveGoPgType,
  resolveGoValueType,
  type ResolvedGoType,
} from './type-mapping.js'

export interface GoSchemaArtifacts {
  artifacts: readonly { path: string; content: string }[]
  diagnostics: readonly {
    code: 'generated-name-collision' | 'invalid-type-mapping'
    severity: 'error'
    message: string
  }[]
}

export function renderGoSchemaArtifacts(
  catalog: CatalogSnapshot,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  outDir: string,
  importPath: string,
  relations: SchemaRelationAnalyses = {},
): GoSchemaArtifacts {
  const target = config.sql.codegen?.go
  if (!target?.schema) return { artifacts: [], diagnostics: [] }
  try {
    const jsonArtifacts = renderGoJsonSchemaArtifacts(
      referencedGoJsonSchemas(config),
      schemas,
      goJsonSchemasOutDir(outDir),
      { nulls: goJsonNulls(config), nullsImportPath: goNullsImportPath(importPath) },
    )
    const artifacts: { path: string; content: string }[] = []
    const dependencies = new Map<string, string[]>()
    const scopes: string[] = [
      ...new Set(
        [
          ...catalog.enums,
          ...catalog.domains,
          ...catalog.compositeTypes,
          ...schemaRelations(catalog),
        ].map((item) => item.schema),
      ),
    ].sort(compareText)
    assertUniqueGoSchemaDirectories(scopes, target.schema.names)
    for (const scope of scopes) {
      const context = createGoTypeContext(importPath, config, catalog, scope)
      const declarations: GoDeclaration[] = []
      const imports: GoTypeImport[] = []
      const named = [
        ...catalog.enums
          .filter((item) => item.schema === scope)
          .map((item) => ({
            source: `enum ${item.schema}.${item.name}`,
            generated: goName(item.name),
          })),
        ...(target.domains
          ? catalog.domains
              .filter((item) => item.schema === scope)
              .map((item) => ({
                source: `domain ${item.schema}.${item.name}`,
                generated: goName(item.name),
              }))
          : []),
        ...catalog.compositeTypes
          .filter((item) => item.schema === scope)
          .map((item) => ({
            source: `composite ${item.schema}.${item.name}`,
            generated: goName(item.name),
          })),
        ...schemaRelations(catalog)
          .filter((item) => item.schema === scope)
          .map((item) => ({
            source: `relation ${item.schema}.${item.name}`,
            generated: goName(item.name),
          })),
      ]
      assertUniqueGoNames(named, 'generated Go type')

      for (const enumeration of catalog.enums
        .filter((item) => item.schema === scope)
        .sort(byQualifiedName)) {
        const typeName = goName(enumeration.name)
        declarations.push(go.type(typeName, go.ident('string')))
        assertUniqueGoNames(
          enumeration.values.map((value) => ({
            source: value,
            generated: `${typeName}${goName(value)}`,
          })),
          `enum ${enumeration.schema}.${enumeration.name} value`,
        )
        for (const value of enumeration.values) {
          declarations.push(
            go.const(`${typeName}${goName(value)}`, go.string(value), go.ident(typeName)),
          )
        }
      }
      if (target.domains) {
        for (const domain of orderedDomains(catalog.domains).filter(
          (item) => item.schema === scope,
        )) {
          const resolved = resolveGoDomainBase(domain, catalog, config, context)
          imports.push(...resolved.imports)
          addGoNullImport(imports, config, context, resolved.type)
          declarations.push(go.type(goName(domain.name), resolved.type))
        }
      }
      for (const composite of catalog.compositeTypes
        .filter((item) => item.schema === scope)
        .sort(byQualifiedName)) {
        assertUniqueGoNames(
          composite.attributes.map((attribute) => ({
            source: attribute.name,
            generated: goName(attribute.name),
          })),
          `attribute in composite ${composite.schema}.${composite.name}`,
        )
        const fields = composite.attributes.map((attribute) => {
          const resolved = resolveGoPgType(
            attribute.typeName,
            config,
            catalog,
            composite.schema,
            attribute.typeOid,
            context,
          )
          imports.push(...resolved.imports)
          addGoNullImport(imports, config, context, nullableGoType(resolved.type, false, config))
          return {
            names: [goName(attribute.name)],
            type: nullableGoType(resolved.type, false, config),
            tag: `db:${JSON.stringify(attribute.name)}`,
          }
        })
        declarations.push(go.type(goName(composite.name), go.struct(fields)))
      }
      for (const table of [...catalog.tables]
        .filter((item) => item.relkind !== 'S' && item.schema === scope)
        .sort(byQualifiedName)) {
        const fields = tableFields(table, catalog, config, imports, context)
        declarations.push(go.type(goName(table.name), go.struct(fields)))
      }
      for (const view of [...catalog.views, ...catalog.materializedViews]
        .filter((item) => item.schema === scope)
        .sort(byQualifiedName)) {
        const fields = viewFields(view, catalog, config, schemas, relations, imports, context)
        declarations.push(go.type(goName(view.name), go.struct(fields)))
      }

      const directory = goSchemaDirectory(scope, target.schema.names)
      assertUniqueGoNames(
        declarations.map((declaration) => ({
          source: declaration.name,
          generated: declaration.name,
        })),
        `declaration in Go schema package ${scope ?? 'JSON Schemas'}`,
      )
      const currentPath = `${importPath.replace(/\/$/u, '')}/${directory}`
      const normalizedImports = normalizeGoImports(imports)
      dependencies.set(
        currentPath,
        normalizedImports.map((item) => item.path),
      )
      if (declarations.length)
        artifacts.push({
          path: join(outDir, directory, 'schema.go'),
          content: printGoFile({
            package: goPackageName(directory),
            imports: normalizedImports,
            declarations,
          }),
        })
    }
    assertAcyclicPackages(dependencies)
    return {
      artifacts: [
        ...artifacts,
        ...jsonArtifacts,
        ...(usesGoNullStructs(config)
          ? [{ path: join(goNullsOutDir(outDir), 'null.go'), content: renderGoNulls() }]
          : []),
      ],
      diagnostics: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      artifacts: [],
      diagnostics: [
        {
          code:
            error instanceof GeneratedGoNameCollisionError
              ? 'generated-name-collision'
              : 'invalid-type-mapping',
          severity: 'error',
          message,
        },
      ],
    }
  }
}

const tableFields = (
  table: TableInfo,
  catalog: CatalogSnapshot,
  config: Config,
  imports: GoTypeImport[],
  context: GoTypeContext,
): GoField[] => {
  assertUniqueFields(table.columns, `${table.schema}.${table.name}`)
  return table.columns.map((column) => {
    const resolved = resolveGoColumnType(table.schema, table.name, column, catalog, config, context)
    imports.push(...resolved.imports)
    addGoNullImport(
      imports,
      config,
      context,
      nullableGoType(resolved.type, storedNotNull(column, catalog), config),
    )
    return field(column, resolved, storedNotNull(column, catalog), config)
  })
}

const viewFields = (
  view: ViewInfo,
  catalog: CatalogSnapshot,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  relations: SchemaRelationAnalyses,
  imports: GoTypeImport[],
  context: GoTypeContext,
): GoField[] => {
  assertUniqueFields(view.columns, `${view.schema}.${view.name}`)
  const analysis = relations[`${view.schema}.${view.name}`]
  return view.columns.map((column, index) => {
    const mapped =
      config.sql.codegen?.go?.mappings.column[`${view.schema}.${view.name}.${column.name}`]
    const inferred =
      mapped === undefined && analysis?.columns[index]?.value
        ? resolveGoValueType(
            interpretValueLineage(analysis.columns[index]!.value!),
            config,
            schemas,
            catalog,
            context,
          )
        : null
    const resolved =
      inferred ?? resolveGoColumnType(view.schema, view.name, column, catalog, config, context)
    imports.push(...resolved.imports)
    addGoNullImport(
      imports,
      config,
      context,
      nullableGoType(resolved.type, analysis?.columns[index]?.notNull ?? column.notNull, config),
    )
    return field(column, resolved, analysis?.columns[index]?.notNull ?? column.notNull, config)
  })
}

const field = (
  column: ColumnInfo,
  resolved: ResolvedGoType,
  notNull: boolean,
  config: Config,
): GoField => ({
  names: [goName(column.name)],
  type: nullableGoType(resolved.type, notNull, config),
  tag: `db:${JSON.stringify(column.name)}`,
})

const storedNotNull = (column: ColumnInfo, catalog: CatalogSnapshot): boolean => {
  if (column.notNull) return true
  let oid = column.typeOid
  const seen = new Set<number>()
  while (!seen.has(oid)) {
    seen.add(oid)
    const domain = catalog.domains.find((item) => item.oid === oid)
    if (!domain) return false
    if (domain.notNull) return true
    oid = domain.baseTypeOid
  }
  return false
}

const orderedDomains = (domains: readonly DomainInfo[]): DomainInfo[] => {
  const result: DomainInfo[] = []
  const remaining = new Map(domains.map((domain) => [domain.oid, domain]))
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((domain) => !remaining.has(domain.baseTypeOid))
      .sort(byQualifiedName)
    if (ready.length === 0) return [...result, ...remaining.values()].sort(byQualifiedName)
    for (const domain of ready) {
      result.push(domain)
      remaining.delete(domain.oid)
    }
  }
  return result
}

const assertUniqueFields = (columns: readonly ColumnInfo[], relation: string): void =>
  assertUniqueGoNames(
    columns.map((column) => ({ source: column.name, generated: goName(column.name) })),
    `column in ${relation}`,
  )

const schemaRelations = (catalog: CatalogSnapshot): { schema: string; name: string }[] => [
  ...catalog.tables.filter((item) => item.relkind !== 'S'),
  ...catalog.views,
  ...catalog.materializedViews,
]

const byQualifiedName = <T extends { schema: string; name: string }>(left: T, right: T): number =>
  compareText(`${left.schema}.${left.name}`, `${right.schema}.${right.name}`)

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const assertAcyclicPackages = (dependencies: ReadonlyMap<string, readonly string[]>): void => {
  const done = new Set<string>()
  const visit = (path: string, stack: readonly string[]): void => {
    if (stack.includes(path))
      throw new Error(
        `Generated Go schema packages have an import cycle: ${[...stack, path].join(' -> ')}`,
      )
    if (done.has(path) || !dependencies.has(path)) return
    for (const dependency of dependencies.get(path)!) visit(dependency, [...stack, path])
    done.add(path)
  }
  for (const path of dependencies.keys()) visit(path, [])
}
