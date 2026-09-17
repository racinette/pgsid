import { goJsonSchemaBindings } from './json-schema-bindings.js'
import { goValidationContract, goValidationSchema } from './json-schema-validation.js'
import { planJsonSchemaInputs } from '../shared/json-schema-inputs.js'
import { goExecutorDeclaration } from './executor.js'
import type { GoTypeContext } from './type-mapping.js'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config, GoTypeImport, JsonSchemaDocument } from '../../config/schema.js'
import type { QueryAnalysisItem } from '../../query-analysis.js'
import { interpretValueLineage } from '../../query/value-lineage.js'
import { go, printGoFile, type GoDeclaration, type GoField } from './ast.js'
import { normalizeGoImports } from './imports.js'
import { assertUniqueGoNames, GeneratedGoNameCollisionError, goName } from './names.js'
import {
  addGoNullImport,
  nullableGoType,
  resolveGoPgType,
  resolveGoValueType,
} from './type-mapping.js'

export interface GoQueryArtifacts {
  types: string | null
  diagnostics: readonly {
    code:
      | 'duplicate-output-name'
      | 'generated-name-collision'
      | 'invalid-type-mapping'
      | 'output-type-shape'
      | 'parameter-type-shape'
      | 'json-schema-input-unsupported'
    severity: 'error' | 'warning'
    queryId: string
    message: string
  }[]
}

export function renderGoQueryArtifacts(
  analyses: readonly QueryAnalysisItem[],
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  catalog: CatalogSnapshot | undefined,
  packageName: string,
  context?: GoTypeContext,
  options: { executor?: boolean; helperImportPath?: string } = {},
): GoQueryArtifacts {
  if (options.executor && config.sql.codegen?.go?.nulls === 'structs') {
    if (!options.helperImportPath)
      throw new Error('Go struct null executors require a helper import path')
  }
  const diagnostics: GoQueryArtifacts['diagnostics'][number][] = []
  const declarations: GoDeclaration[] = []
  const imports: GoTypeImport[] = []
  if (options.executor && config.sql.codegen?.go?.nulls === 'structs')
    imports.push({ path: options.helperImportPath!, as: 'pgsidpgx' })
  const ordered = [...analyses].sort(
    (left, right) => left.query.definition.sourceStart - right.query.definition.sourceStart,
  )
  try {
    assertUniqueGoNames(
      ordered.map((item) => ({ source: item.query.name, generated: goName(item.query.name) })),
      'query',
    )
  } catch (error) {
    diagnostics.push({
      code: 'generated-name-collision',
      severity: 'error',
      queryId: ordered[0]?.query.id ?? '<queries>',
      message: error instanceof Error ? error.message : String(error),
    })
    return { types: null, diagnostics }
  }

  for (const analysis of ordered) {
    try {
      renderQuery(
        analysis,
        config,
        schemas,
        catalog,
        declarations,
        imports,
        diagnostics,
        context,
        options.executor ?? false,
        options.helperImportPath,
      )
    } catch (error) {
      diagnostics.push({
        code:
          error instanceof GeneratedGoNameCollisionError
            ? 'generated-name-collision'
            : 'invalid-type-mapping',
        severity: 'error',
        queryId: analysis.query.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  if (diagnostics.some((item) => item.severity === 'error')) return { types: null, diagnostics }
  try {
    return {
      types: printGoFile({
        package: packageName,
        imports: normalizeGoImports(imports),
        declarations,
      }),
      diagnostics,
    }
  } catch (error) {
    return {
      types: null,
      diagnostics: [
        {
          code: 'invalid-type-mapping',
          severity: 'error',
          queryId: ordered[0]?.query.id ?? '<queries>',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
}

const renderQuery = (
  analysis: QueryAnalysisItem,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  catalog: CatalogSnapshot | undefined,
  declarations: GoDeclaration[],
  imports: GoTypeImport[],
  diagnostics: GoQueryArtifacts['diagnostics'][number][],
  context: GoTypeContext | undefined,
  executor: boolean,
  helperImportPath: string | undefined,
): void => {
  const queryName = goName(analysis.query.name)
  declarations.push(go.const(`${queryName}SQL`, go.string(analysis.query.definition.sql)))

  const parameterTypes = positionalTypes(
    analysis,
    analysis.description?.parameterTypes,
    analysis.contract.params.length,
    'parameter-type-shape',
    diagnostics,
  )
  const named = new Map(
    analysis.query.definition.parameters.map((parameter) => [parameter.index, parameter.name]),
  )
  const bindings = goJsonSchemaBindings(config, schemas)
  const inputPlan = planJsonSchemaInputs(analysis.writeLineage ?? [], bindings)
  for (const unsupported of inputPlan.unsupported)
    diagnostics.push({
      code: 'json-schema-input-unsupported',
      severity: 'warning',
      queryId: analysis.query.id,
      message: `Cannot infer JSON Schema inputs for ${unsupported.column} through this write transformation (parameters ${unsupported.parameters.map((number) => `$${number}`).join(', ')})`,
    })
  const parameterFields: GoField[] = analysis.contract.params.map((parameter, index) => {
    const destinations = inputPlan.parameters.get(index + 1) ?? []
    const destinationTypes = destinations.map((destination) =>
      resolveGoValueType(destination, config, schemas, catalog, context)!,
    )
    const destinationType = destinationTypes[0]
    const resolved = destinationType
      ? destinationTypes.every(
          (item) => JSON.stringify(item.type) === JSON.stringify(destinationType.type),
        )
        ? destinationType
        : { type: go.any(), imports: [] }
      : resolveGoPgType(
          parameterTypes[index] ?? 'unknown',
          config,
          catalog,
          undefined,
          undefined,
          context,
        )
    imports.push(...resolved.imports)
    addGoNullImport(
      imports,
      config,
      context,
      nullableGoType(resolved.type, parameter.notNull, config),
    )
    const sourceName = named.get(index + 1) ?? `param_${index + 1}`
    const validations = executor
      ? destinations.flatMap((destination) => {
          const validation = goValidationSchema(destination, bindings)
          if (!validation) return []
          return [validation.schema]
        })
      : []
    return {
      ...(validations.length
        ? {
            jsonValidation: {
              contract: goValidationContract(
                validations.length === 1 ? validations[0]! : { allOf: validations },
              ),
              query: analysis.query.name,
              column: sourceName,
            },
          }
        : {}),
      names: [goName(sourceName)],
      sqlNullable: !parameter.notNull && config.sql.codegen?.go?.nulls === 'structs',
      sqlJson:
        destinations.length > 0 || /(?:^|\.)(?:json|jsonb)$/u.test(parameterTypes[index] ?? ''),
      type: nullableGoType(resolved.type, parameter.notNull, config),
      tag: `db:${JSON.stringify(sourceName)}`,
    }
  })
  assertUniqueFields(parameterFields, analysis.query.name, 'parameter')
  declarations.push(go.type(`${queryName}Params`, go.struct(parameterFields)))
  if (parameterFields.some((field) => field.jsonValidation)) {
    if (!helperImportPath) throw new Error('Go JSON validation requires a helper import path')
    imports.push({ path: helperImportPath, as: 'pgsidpgx' })
  }

  const command = analysis.query.definition.command
  if (executor) imports.push({ path: 'context' })
  if (command === 'exec' || command === 'execrows') {
    if (executor)
      declarations.push(
        goExecutorDeclaration(
          analysis,
          parameterFields,
          [],
          config.sql.codegen?.go?.nulls === 'structs',
        ),
      )
    return
  }
  const outputNames =
    analysis.description?.columns ?? analysis.contract.outputs.map((output) => output.name)
  const duplicate = outputNames.find((name, index) => outputNames.indexOf(name) !== index)
  if (duplicate !== undefined) {
    diagnostics.push({
      code: 'duplicate-output-name',
      severity: 'error',
      queryId: analysis.query.id,
      message: `Duplicate output name ${JSON.stringify(duplicate)}; add an SQL alias`,
    })
    return
  }
  const outputTypes = positionalTypes(
    analysis,
    analysis.description?.columnTypes,
    outputNames.length,
    'output-type-shape',
    diagnostics,
  )
  const lineage = analysis.rawLineage?.map((output) => interpretValueLineage(output.value))
  const outputFields: GoField[] = outputNames.map((name, index) => {
    const resolved =
      resolveGoValueType(lineage?.[index], config, schemas, catalog, context) ??
      resolveGoPgType(
        outputTypes[index] ?? 'unknown',
        config,
        catalog,
        undefined,
        undefined,
        context,
      )
    imports.push(...resolved.imports)
    addGoNullImport(
      imports,
      config,
      context,
      nullableGoType(resolved.type, analysis.contract.outputs[index]?.notNull ?? false, config),
    )
    const validation = executor ? goValidationSchema(lineage?.[index], bindings) : undefined
    return {
      ...(validation
        ? {
            jsonValidation: {
              contract: goValidationContract(validation.schema),
              query: analysis.query.name,
              column: name,
            },
          }
        : {}),
      names: [goName(name)],
      sqlNullable:
        !(analysis.contract.outputs[index]?.notNull ?? false) &&
        config.sql.codegen?.go?.nulls === 'structs',
      type: nullableGoType(
        resolved.type,
        analysis.contract.outputs[index]?.notNull ?? false,
        config,
      ),
      tag: `db:${JSON.stringify(name)}`,
    }
  })
  if (outputFields.some((field) => field.jsonValidation)) {
    if (!helperImportPath) throw new Error('Go JSON validation requires a helper import path')
    imports.push({ path: helperImportPath, as: 'pgsidpgx' })
  }
  assertUniqueFields(outputFields, analysis.query.name, 'output')
  declarations.push(go.type(`${queryName}Row`, go.struct(outputFields)))
  if (executor)
    declarations.push(
      goExecutorDeclaration(
        analysis,
        parameterFields,
        outputFields,
        config.sql.codegen?.go?.nulls === 'structs',
      ),
    )
}

const positionalTypes = (
  analysis: QueryAnalysisItem,
  types: readonly string[] | undefined,
  length: number,
  code: 'output-type-shape' | 'parameter-type-shape',
  diagnostics: GoQueryArtifacts['diagnostics'][number][],
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

const assertUniqueFields = (fields: readonly GoField[], query: string, kind: string): void =>
  assertUniqueGoNames(
    fields.map((field) => {
      const name = field.names?.[0] ?? 'Unnamed'
      return { source: name, generated: name }
    }),
    `${kind} in query ${query}`,
  )
