import ts from 'typescript'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { JsonSchemaAlternative } from '../shared/json-schema-lineage.js'
import { createTypescriptJsonSchemaGraphs } from './jsonschemas.js'
import type { Config, JsonSchemaDocument, TypeImport } from '../../config/schema.js'
import type { QueryAnalysisItem } from '../../query-analysis.js'
import { interpretValueLineage } from '../../query/value-lineage.js'
import { planArrayDimensionInputs } from '../shared/array-dimensions.js'
import { planJsonSchemaInputs } from '../shared/json-schema-inputs.js'
import {
  asyncModifier,
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
  typescriptJsonSchemaLineageValidatorDeclaration,
  type GenerateTypescriptJsonSchemaValidatorOptions,
} from './json-schema-validator.js'
import { queryValidationErrorDeclarations } from './validation-diagnostics.js'
import {
  resolveTypescriptPgType,
  importedTypescriptType,
  type TypescriptTypeContext,
} from './type-mapping.js'
import { resolveTypescriptValueType, type ResolvedTypescriptValueType } from './value-type.js'

export type TypescriptQueryDiagnosticCode =
  | 'duplicate-output-name'
  | 'generated-name-collision'
  | 'invalid-type-mapping'
  | 'json-schema-validator'
  | 'output-type-shape'
  | 'parameter-type-shape'
  | 'json-schema-input-unsupported'

export interface TypescriptQueryDiagnostic {
  code: TypescriptQueryDiagnosticCode
  severity: 'warning' | 'error'
  queryId: string
  message: string
}

export interface RenderTypescriptQueryArtifactsOptions {
  emitRuntime?: boolean
  typesModuleSpecifier?: string
  catalog?: CatalogSnapshot
  nativeModuleSpecifier?: TypescriptTypeContext['nativeModuleSpecifier']
  jsonSchemasModuleSpecifier?: string
  queryableModuleSpecifier?: string
  jsonSchemaRuntimeModuleSpecifier?: string
  jsonSchemaValidator?: (alternative: JsonSchemaAlternative) => string | undefined
  jsonSchemaValidation?: (alternative: JsonSchemaAlternative) => string | undefined
  jsonSchemaPredicate?: GenerateTypescriptJsonSchemaValidatorOptions['schemaPredicate']
  jsonSchemaDiagnostic?: GenerateTypescriptJsonSchemaValidatorOptions['schemaValidation']
}

export interface TypescriptQueryArtifacts {
  types: string | null
  runtime: string | null
  diagnostics: readonly TypescriptQueryDiagnostic[]
}

interface RenderedQuery {
  typeDeclarations: ts.Statement[]
  runtimeDeclarations: ts.Statement[]
  wrapper: ts.FunctionDeclaration
  imports: TypeImport[]
  typeNames: string[]
  usesJsonSchemaRuntime: boolean
  hasValidators: boolean
}

interface RenderedValidator {
  statements: ts.Statement[]
  name: string
  validationName: string
  column: string
  value?: ts.Expression
  parameter?: number
}

export function renderTypescriptQueryArtifacts(
  analyses: readonly QueryAnalysisItem[],
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  options: RenderTypescriptQueryArtifactsOptions = {},
): TypescriptQueryArtifacts {
  const diagnostics: TypescriptQueryDiagnostic[] = []
  const target = config.sql.codegen?.typescript
  if (!target) return { types: null, runtime: null, diagnostics }
  const bindings = typescriptJsonSchemaBindings(config, schemas)
  const context: TypescriptTypeContext = {
    inlineNative: !options.nativeModuleSpecifier,
    nativeModuleSpecifier: options.nativeModuleSpecifier,
    ...(options.jsonSchemasModuleSpecifier
      ? {
          jsonSchemaReference: (name: string) =>
            importedTypescriptType(options.jsonSchemasModuleSpecifier!, name),
          jsonSchemaTypes: createTypescriptJsonSchemaGraphs(config, schemas),
        }
      : {}),
  }
  const ordered = [...analyses].sort(
    (left, right) => left.query.definition.sourceStart - right.query.definition.sourceStart,
  )
  const names = new Set<string>()
  const runtimeNames = new Set([
    'Queryable',
    'QueryValidationError',
    'ValidationIssue',
    'pgsid',
    '_jsonSchemas',
    ...ordered.flatMap((analysis) => [
      `${pascalCase(analysis.query.name)}Params`,
      `${pascalCase(analysis.query.name)}Row`,
      camelCase(analysis.query.name),
      `${camelCase(analysis.query.name)}Sql`,
    ]),
  ])
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
    try {
      const query = renderQuery(
        analysis,
        config,
        bindings,
        diagnostics,
        options,
        context,
        runtimeNames,
      )
      if (query) rendered.push(query)
    } catch (error) {
      diagnostics.push({
        code: 'invalid-type-mapping',
        severity: 'error',
        queryId: analysis.query.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { types: null, runtime: null, diagnostics }
  }

  const types = printFile([
    ...importDeclarations(rendered.flatMap((query) => query.imports)).map((declaration) =>
      factory.updateImportDeclaration(
        declaration,
        declaration.modifiers,
        declaration.importClause
          ? factory.updateImportClause(
              declaration.importClause,
              true,
              declaration.importClause.name,
              declaration.importClause.namedBindings,
            )
          : undefined,
        declaration.moduleSpecifier,
        declaration.attributes,
      ),
    ),
    ...rendered.flatMap((query) => query.typeDeclarations),
  ])
  const typeNames = [...new Set(rendered.flatMap((query) => query.typeNames))]
  const hasValidators = rendered.some((query) => query.hasValidators)
  const runtime = printFile([
    ...(typeNames.length
      ? [namedImport(typeNames, options.typesModuleSpecifier ?? './types.js', true)]
      : []),
    ...(typeNames.length
      ? [
          factory.createExportDeclaration(
            undefined,
            true,
            factory.createNamedExports(
              typeNames.map((name) => factory.createExportSpecifier(false, undefined, name)),
            ),
            factory.createStringLiteral(options.typesModuleSpecifier ?? './types.js'),
          ),
        ]
      : []),
    ...(options.queryableModuleSpecifier
      ? [
          factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              !hasValidators,
              undefined,
              factory.createNamespaceImport(factory.createIdentifier('pgsid')),
            ),
            factory.createStringLiteral(options.queryableModuleSpecifier),
          ),
        ]
      : [queryableDeclaration()]),
    ...(hasValidators
      ? options.queryableModuleSpecifier
        ? [
            factory.createExportDeclaration(
              undefined,
              false,
              factory.createNamedExports([
                factory.createExportSpecifier(false, undefined, 'QueryValidationError'),
              ]),
              factory.createStringLiteral(options.queryableModuleSpecifier),
            ),
          ]
        : queryValidationErrorDeclarations()
      : []),
    ...(options.jsonSchemaRuntimeModuleSpecifier &&
    rendered.some((query) => query.usesJsonSchemaRuntime)
      ? [
          factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamespaceImport(factory.createIdentifier('_jsonSchemas')),
            ),
            factory.createStringLiteral(options.jsonSchemaRuntimeModuleSpecifier),
          ),
        ]
      : []),
    ...rendered.flatMap((query) => query.runtimeDeclarations),
    ...rendered.map((query) => query.wrapper),
  ])
  return { types, runtime: options.emitRuntime === false ? null : runtime, diagnostics }
}

const renderQuery = (
  analysis: QueryAnalysisItem,
  config: Config,
  bindings: ReturnType<typeof typescriptJsonSchemaBindings>,
  diagnostics: TypescriptQueryDiagnostic[],
  options: RenderTypescriptQueryArtifactsOptions,
  context: TypescriptTypeContext,
  runtimeNames: Set<string>,
): RenderedQuery | null => {
  const queryName = pascalCase(analysis.query.name)
  const functionName = camelCase(analysis.query.name)
  const outputNames =
    analysis.description?.columns ?? analysis.contract.outputs.map((output) => output.name)
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
  let usesJsonSchemaRuntime = false
  const rowTypes = outputNames.map((name, index) => {
    const resolved: ResolvedTypescriptValueType =
      resolveTypescriptValueType(
        semanticLineage?.[index],
        config,
        bindings,
        options.catalog,
        context,
      ) ??
      resolveTypescriptPgType(
        outputTypes[index] ?? 'unknown',
        config,
        options.catalog,
        undefined,
        undefined,
        context,
      )
    imports.push(...resolved.imports)
    const claim = analysis.contract.outputs[index]
    const type = claim?.alwaysNull
      ? factory.createLiteralTypeNode(factory.createNull())
      : nullableType(resolved.type, claim?.notNull ?? false)
    if (resolved.lineage && options.emitRuntime !== false) {
      try {
        const stem = `${queryName}${pascalCase(name)}`
        let suffix = ''
        let attempt = 1
        while (
          runtimeNames.has(`is${stem}${suffix}`) ||
          runtimeNames.has(`validate${stem}${suffix}`)
        )
          suffix = String(++attempt)
        const validatorName = `is${stem}${suffix}`
        const validationName = `validate${stem}${suffix}`
        const statement = typescriptJsonSchemaLineageValidatorDeclaration(
          validatorName,
          factory.createIndexedAccessTypeNode(
            factory.createTypeReferenceNode(`${queryName}Row`),
            factory.createLiteralTypeNode(factory.createStringLiteral(name)),
          ),
          resolved.lineage,
          {
            nullable: !(claim?.notNull ?? false),
            helpers: options.jsonSchemaRuntimeModuleSpecifier
              ? factory.createPropertyAccessExpression(
                  factory.createIdentifier('_jsonSchemas'),
                  'jsonSchemaHelpers',
                )
              : undefined,
            schemaPredicate: options.jsonSchemaPredicate
              ? (schema, document, value) => {
                  const result = options.jsonSchemaPredicate!(schema, document, value)
                  if (result) usesJsonSchemaRuntime = true
                  return result
                }
              : undefined,
            predicate:
              options.jsonSchemaRuntimeModuleSpecifier && options.jsonSchemaValidator
                ? (alternative, value) => {
                    const name = options.jsonSchemaValidator!(alternative)
                    if (!name) return undefined
                    usesJsonSchemaRuntime = true
                    return factory.createCallExpression(
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier('_jsonSchemas'),
                        name,
                      ),
                      undefined,
                      [value],
                    )
                  }
                : undefined,
          },
        )
        if (statement) {
          const validation = typescriptJsonSchemaLineageValidatorDeclaration(
            validationName,
            type,
            resolved.lineage,
            {
              nullable: !(claim?.notNull ?? false),
              diagnostic: true,
              helpers: options.jsonSchemaRuntimeModuleSpecifier
                ? factory.createPropertyAccessExpression(
                    factory.createIdentifier('_jsonSchemas'),
                    'jsonSchemaHelpers',
                  )
                : undefined,
              schemaValidation: options.jsonSchemaDiagnostic
                ? (schema, document, value) => {
                    const result = options.jsonSchemaDiagnostic!(schema, document, value)
                    if (result) usesJsonSchemaRuntime = true
                    return result
                  }
                : undefined,
              validation:
                options.jsonSchemaRuntimeModuleSpecifier && options.jsonSchemaValidation
                  ? (alternative, value) => {
                      const name = options.jsonSchemaValidation!(alternative)
                      if (!name) return undefined
                      usesJsonSchemaRuntime = true
                      return factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                          factory.createIdentifier('_jsonSchemas'),
                          name,
                        ),
                        undefined,
                        [value],
                      )
                    }
                  : undefined,
            },
          )!
          runtimeNames.add(validatorName)
          runtimeNames.add(validationName)
          validators.push({
            statements: [statement, validation],
            name: validatorName,
            validationName,
            column: name,
          })
          if (options.jsonSchemaRuntimeModuleSpecifier) usesJsonSchemaRuntime = true
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
  const inputPlan = planJsonSchemaInputs(analysis.writeLineage ?? [], bindings)
  const arrayInputs = planArrayDimensionInputs(
    analysis.writeLineage ?? [],
    config.sql.codegen?.typescript?.mappings.column ?? {},
    options.catalog,
  )
  const paramTypes = analysis.contract.params.map((param, index) => {
    const destinations = inputPlan.parameters.get(index + 1) ?? arrayInputs.get(index + 1) ?? []
    const destinationTypes = destinations.map((destination) =>
      resolveTypescriptValueType(destination, config, bindings, options.catalog, context)!,
    )
    const resolved = destinationTypes.length
      ? {
          type: intersectionType(destinationTypes.map((item) => item.type)),
          imports: destinationTypes.flatMap((item) => item.imports),
        }
      : resolveTypescriptPgType(
          parameterTypes[index] ?? 'unknown',
          config,
          options.catalog,
          undefined,
          undefined,
          context,
        )
    imports.push(...resolved.imports)
    return nullableType(resolved.type, param.notNull)
  })
  const inputValidators: RenderedValidator[] = []
  for (const unsupported of inputPlan.unsupported)
    diagnostics.push({
      code: 'json-schema-input-unsupported',
      severity: 'warning',
      queryId: analysis.query.id,
      message: `Cannot infer JSON Schema inputs for ${unsupported.column} through this write transformation (parameters ${unsupported.parameters.map((number) => `$${number}`).join(', ')})`,
    })
  if (options.emitRuntime !== false)
    for (const [number, destinations] of inputPlan.parameters) {
      const parameterName = analysis.query.definition.parameters.find(
        (parameter) => parameter.index === number,
      )?.name
      const value = factory.createElementAccessExpression(
        factory.createIdentifier('params'),
        parameterName
          ? factory.createStringLiteral(parameterName)
          : factory.createNumericLiteral(number - 1),
      )
      for (const destination of destinations) {
        const resolved = resolveTypescriptValueType(
          destination,
          config,
          bindings,
          options.catalog,
          context,
        )!
        const column =
          destination.kind === 'column'
            ? `${destination.column.schema}.${destination.column.relation}.${destination.column.column}`
            : ''
        const stem = `${queryName}Params${pascalCase(parameterName ?? `Param${number}`)}${pascalCase(column)}`
        let suffix = ''
        let attempt = 1
        while (
          runtimeNames.has(`is${stem}${suffix}`) ||
          runtimeNames.has(`validate${stem}${suffix}`)
        )
          suffix = String(++attempt)
        const name = `is${stem}${suffix}`
        const validationName = `validate${stem}${suffix}`
        const validatorOptions = {
          nullable: false,
          helpers: options.jsonSchemaRuntimeModuleSpecifier
            ? factory.createPropertyAccessExpression(
                factory.createIdentifier('_jsonSchemas'),
                'jsonSchemaHelpers',
              )
            : undefined,
          schemaPredicate: options.jsonSchemaPredicate
            ? (schema: JsonSchemaDocument, document: JsonSchemaDocument, value: ts.Expression) => {
                const result = options.jsonSchemaPredicate!(schema, document, value)
                if (result) usesJsonSchemaRuntime = true
                return result
              }
            : undefined,
          schemaValidation: options.jsonSchemaDiagnostic
            ? (schema: JsonSchemaDocument, document: JsonSchemaDocument, value: ts.Expression) => {
                const result = options.jsonSchemaDiagnostic!(schema, document, value)
                if (result) usesJsonSchemaRuntime = true
                return result
              }
            : undefined,
          predicate:
            options.jsonSchemaRuntimeModuleSpecifier && options.jsonSchemaValidator
              ? (alternative: JsonSchemaAlternative, value: ts.Expression) => {
                  const name = options.jsonSchemaValidator!(alternative)
                  if (!name) return undefined
                  usesJsonSchemaRuntime = true
                  return factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      factory.createIdentifier('_jsonSchemas'),
                      name,
                    ),
                    undefined,
                    [value],
                  )
                }
              : undefined,
          validation:
            options.jsonSchemaRuntimeModuleSpecifier && options.jsonSchemaValidation
              ? (alternative: JsonSchemaAlternative, value: ts.Expression) => {
                  const name = options.jsonSchemaValidation!(alternative)
                  if (!name) return undefined
                  usesJsonSchemaRuntime = true
                  return factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      factory.createIdentifier('_jsonSchemas'),
                      name,
                    ),
                    undefined,
                    [value],
                  )
                }
              : undefined,
        }
        const parameterType = factory.createIndexedAccessTypeNode(
          factory.createTypeReferenceNode(`${queryName}Params`),
          factory.createLiteralTypeNode(
            parameterName
              ? factory.createStringLiteral(parameterName)
              : factory.createNumericLiteral(number - 1),
          ),
        )
        const statement = typescriptJsonSchemaLineageValidatorDeclaration(
          name,
          parameterType,
          resolved.lineage!,
          validatorOptions,
        )
        if (!statement) continue
        const validation = typescriptJsonSchemaLineageValidatorDeclaration(
          validationName,
          parameterType,
          resolved.lineage!,
          { ...validatorOptions, diagnostic: true },
        )!
        runtimeNames.add(name)
        runtimeNames.add(validationName)
        inputValidators.push({
          name,
          validationName,
          column: parameterName ?? `$${number}`,
          value,
          parameter: number,
          statements: [statement, validation],
        })
        if (options.jsonSchemaRuntimeModuleSpecifier) usesJsonSchemaRuntime = true
      }
    }
  const sqlName = `${functionName}Sql`
  const typeDeclarations: ts.Statement[] = [
    renderParams(queryName, analysis, paramTypes),
    renderRow(queryName, outputNames, rowTypes, analysis.contract.outputPresenceGroups),
  ]
  const runtimeDeclarations: ts.Statement[] = [
    factory.createVariableStatement(
      [exportModifier],
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            sqlName,
            undefined,
            undefined,
            factory.createStringLiteral(analysis.query.definition.sql),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    ...validators.flatMap((validator) => validator.statements),
    ...inputValidators.flatMap((validator) => validator.statements),
  ]
  return {
    typeDeclarations,
    runtimeDeclarations,
    usesJsonSchemaRuntime,
    hasValidators: validators.length + inputValidators.length > 0,
    wrapper: renderWrapper(
      analysis,
      queryName,
      functionName,
      sqlName,
      validators,
      inputValidators,
      [...inputPlan.parameters.keys()],
      options.queryableModuleSpecifier
        ? factory.createTypeReferenceNode(
            factory.createQualifiedName(factory.createIdentifier('pgsid'), 'Queryable'),
          )
        : factory.createTypeReferenceNode('Queryable'),
      options.queryableModuleSpecifier
        ? factory.createPropertyAccessExpression(
            factory.createIdentifier('pgsid'),
            'QueryValidationError',
          )
        : factory.createIdentifier('QueryValidationError'),
    ),
    imports,
    typeNames: [
      `${queryName}Params`,
      ...(analysis.query.definition.command === 'exec' ||
      analysis.query.definition.command === 'execrows'
        ? []
        : [`${queryName}Row`]),
    ],
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

const renderParams = (
  queryName: string,
  analysis: QueryAnalysisItem,
  types: readonly ts.TypeNode[],
): ts.TypeAliasDeclaration => {
  const named = analysis.query.definition.parameters
  let flat: ts.TypeNode
  let groups: ts.TypeNode[]
  if (named.length) {
    const names = new Map(named.map((parameter) => [parameter.index, parameter.name]))
    flat = objectType(types.map((type, index) => [names.get(index + 1) ?? `$${index + 1}`, type]))
    groups = analysis.contract.paramRejectionSets.map((group) =>
      unionType(
        group.map((required) =>
          objectType(
            group.map((number) => [
              names.get(number) ?? `$${number}`,
              number === required ? withoutNull(types[number - 1]!) : types[number - 1]!,
            ]),
          ),
        ),
      ),
    )
  } else {
    const tuple = (members: readonly ts.TypeNode[]): ts.TypeNode =>
      factory.createTypeOperatorNode(
        ts.SyntaxKind.ReadonlyKeyword,
        factory.createTupleTypeNode(members),
      )
    flat = tuple(types)
    groups = analysis.contract.paramRejectionSets.map((group) =>
      unionType(
        group.map((required) =>
          tuple(types.map((type, index) => (index + 1 === required ? withoutNull(type) : type))),
        ),
      ),
    )
  }
  return factory.createTypeAliasDeclaration(
    [exportModifier],
    `${queryName}Params`,
    undefined,
    intersectionType([flat, ...groups]),
  )
}

const renderRow = (
  queryName: string,
  names: readonly string[],
  types: readonly ts.TypeNode[],
  groups: QueryAnalysisItem['contract']['outputPresenceGroups'],
): ts.TypeAliasDeclaration => {
  const flat = objectType(names.map((name, index) => [name, types[index]!]))
  const refinements = groups.map((group) => {
    const present = objectType(
      group.columns.map((index) => [
        names[index]!,
        group.discriminants.includes(index) ? withoutNull(types[index]!) : types[index]!,
      ]),
    )
    const absent = objectType(
      group.columns.map((index) => [
        names[index]!,
        factory.createLiteralTypeNode(factory.createNull()),
      ]),
    )
    return unionType([present, absent])
  })
  return factory.createTypeAliasDeclaration(
    [exportModifier],
    `${queryName}Row`,
    undefined,
    intersectionType([flat, ...refinements]),
  )
}

const renderWrapper = (
  analysis: QueryAnalysisItem,
  queryName: string,
  functionName: string,
  sqlName: string,
  validators: readonly RenderedValidator[],
  inputValidators: readonly RenderedValidator[],
  jsonParameters: readonly number[],
  queryableType: ts.TypeNode,
  validationError: ts.Expression,
): ts.FunctionDeclaration => {
  const named = analysis.query.definition.parameters
  const parameters = [
    factory.createParameterDeclaration(undefined, undefined, 'db', undefined, queryableType),
  ]
  if (named.length) {
    parameters.push(
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'params',
        undefined,
        factory.createTypeReferenceNode(`${queryName}Params`),
      ),
    )
  } else if (analysis.contract.params.length) {
    parameters.push(
      factory.createParameterDeclaration(
        undefined,
        factory.createToken(ts.SyntaxKind.DotDotDotToken),
        'params',
        undefined,
        factory.createTypeReferenceNode(`${queryName}Params`),
      ),
    )
  }
  const inputStatements: ts.Statement[] = []
  const jsonValue = (number: number) => factory.createIdentifier(`jsonInput${number}Value`)
  const jsonEncoded = (number: number) => factory.createIdentifier(`jsonInput${number}`)
  const constant = (name: ts.Identifier, expression: ts.Expression) =>
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(name, undefined, undefined, expression)],
        ts.NodeFlags.Const,
      ),
    )
  for (const number of jsonParameters) {
    const parameter = analysis.contract.params[number - 1]!
    const parameterName = named.find((item) => item.index === number)?.name
    const value = factory.createElementAccessExpression(
      factory.createIdentifier('params'),
      parameterName
        ? factory.createStringLiteral(parameterName)
        : factory.createNumericLiteral(number - 1),
    )
    const encoded = factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('JSON'), 'stringify'),
      undefined,
      [value],
    )
    inputStatements.push(
      constant(
        jsonEncoded(number),
        parameter.notNull
          ? encoded
          : factory.createConditionalExpression(
              factory.createBinaryExpression(
                value,
                factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                factory.createNull(),
              ),
              factory.createToken(ts.SyntaxKind.QuestionToken),
              factory.createNull(),
              factory.createToken(ts.SyntaxKind.ColonToken),
              encoded,
            ),
      ),
    )
    if (!inputValidators.some((validator) => validator.parameter === number)) continue
    inputStatements.push(
      factory.createIfStatement(
        factory.createBinaryExpression(
          jsonEncoded(number),
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createIdentifier('undefined'),
        ),
        factory.createThrowStatement(
          factory.createNewExpression(validationError, undefined, [
            factory.createStringLiteral(analysis.query.name),
            factory.createStringLiteral(parameterName ?? `$${number}`),
            factory.createArrayLiteralExpression([
              factory.createObjectLiteralExpression([
                factory.createPropertyAssignment('path', factory.createArrayLiteralExpression()),
                factory.createPropertyAssignment('keyword', factory.createStringLiteral('json')),
                factory.createPropertyAssignment(
                  'expected',
                  factory.createStringLiteral('JSON value'),
                ),
                factory.createPropertyAssignment(
                  'received',
                  factory.createStringLiteral('undefined'),
                ),
                factory.createPropertyAssignment(
                  'message',
                  factory.createStringLiteral('Value has no JSON representation'),
                ),
              ]),
            ]),
          ]),
        ),
      ),
    )
    inputStatements.push(
      constant(
        jsonValue(number),
        factory.createConditionalExpression(
          factory.createBinaryExpression(
            jsonEncoded(number),
            factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
            factory.createNull(),
          ),
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createNull(),
          factory.createToken(ts.SyntaxKind.ColonToken),
          factory.createCallExpression(
            factory.createPropertyAccessExpression(factory.createIdentifier('JSON'), 'parse'),
            undefined,
            [jsonEncoded(number)],
          ),
        ),
      ),
    )
  }
  const values =
    !jsonParameters.length && !named.length && analysis.contract.params.length
      ? factory.createArrayLiteralExpression([
          factory.createSpreadElement(factory.createIdentifier('params')),
        ])
      : factory.createArrayLiteralExpression(
          analysis.contract.params.map((_, index) => {
            const name = named.find((item) => item.index === index + 1)?.name
            const value = factory.createElementAccessExpression(
              factory.createIdentifier('params'),
              name ? factory.createStringLiteral(name) : factory.createNumericLiteral(index),
            )
            return jsonParameters.includes(index + 1) ? jsonEncoded(index + 1) : value
          }),
        )
  const query = factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('db'), 'query'),
    undefined,
    [factory.createIdentifier(sqlName), values],
  )
  const command = analysis.query.definition.command
  let returnType: ts.TypeNode
  let statements: ts.Statement[]
  if (command === 'exec') {
    returnType = factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
    statements = [factory.createExpressionStatement(factory.createAwaitExpression(query))]
  } else if (command === 'execrows') {
    returnType = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
    statements = [
      resultDeclaration(query),
      factory.createReturnStatement(
        factory.createBinaryExpression(
          factory.createPropertyAccessExpression(factory.createIdentifier('result'), 'rowCount'),
          factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
          factory.createNumericLiteral(0),
        ),
      ),
    ]
  } else if (command === 'one') {
    const rowType = factory.createTypeReferenceNode(`${queryName}Row`)
    returnType = unionType([rowType, factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)])
    statements = [
      resultDeclaration(query),
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              'row',
              undefined,
              undefined,
              factory.createElementAccessExpression(
                factory.createPropertyAccessExpression(factory.createIdentifier('result'), 'rows'),
                0,
              ),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
      factory.createIfStatement(
        factory.createBinaryExpression(
          factory.createIdentifier('row'),
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createIdentifier('undefined'),
        ),
        factory.createReturnStatement(factory.createIdentifier('undefined')),
      ),
      ...validatorStatements(validators, analysis.query.name, validationError),
      factory.createReturnStatement(
        factory.createAsExpression(factory.createIdentifier('row'), rowType),
      ),
    ]
  } else {
    const rowType = factory.createTypeReferenceNode(`${queryName}Row`)
    returnType = factory.createArrayTypeNode(rowType)
    const map = factory.createCallExpression(
      factory.createPropertyAccessExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier('result'), 'rows'),
        'map',
      ),
      undefined,
      [
        factory.createArrowFunction(
          undefined,
          undefined,
          [factory.createParameterDeclaration(undefined, undefined, 'row')],
          undefined,
          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          factory.createBlock(
            [
              ...validatorStatements(validators, analysis.query.name, validationError),
              factory.createReturnStatement(
                factory.createAsExpression(factory.createIdentifier('row'), rowType),
              ),
            ],
            true,
          ),
        ),
      ],
    )
    statements = [resultDeclaration(query), factory.createReturnStatement(map)]
  }
  return factory.createFunctionDeclaration(
    [exportModifier, asyncModifier],
    undefined,
    functionName,
    undefined,
    parameters,
    factory.createTypeReferenceNode('Promise', [returnType]),
    factory.createBlock(
      [
        ...inputStatements,
        ...inputValidators.flatMap((validator) => [
          factory.createIfStatement(
            factory.createBinaryExpression(
              jsonEncoded(validator.parameter!),
              factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
              factory.createNull(),
            ),
            factory.createBlock(
              validatorStatements(
                [{ ...validator, value: jsonValue(validator.parameter!) }],
                analysis.query.name,
                validationError,
              ),
              true,
            ),
          ),
        ]),
        ...statements,
      ],
      true,
    ),
  )
}

const validatorStatements = (
  validators: readonly RenderedValidator[],
  queryName: string,
  validationError: ts.Expression,
): ts.Statement[] =>
  validators.map((validator) =>
    factory.createIfStatement(
      factory.createPrefixUnaryExpression(
        ts.SyntaxKind.ExclamationToken,
        factory.createCallExpression(factory.createIdentifier(validator.name), undefined, [
          validator.value ??
            factory.createElementAccessExpression(
              factory.createIdentifier('row'),
              factory.createStringLiteral(validator.column),
            ),
        ]),
      ),
      factory.createThrowStatement(
        factory.createNewExpression(validationError, undefined, [
          factory.createStringLiteral(queryName),
          factory.createStringLiteral(validator.column),
          factory.createPropertyAccessExpression(
            factory.createCallExpression(
              factory.createIdentifier(validator.validationName),
              undefined,
              [
                validator.value ??
                  factory.createElementAccessExpression(
                    factory.createIdentifier('row'),
                    factory.createStringLiteral(validator.column),
                  ),
              ],
            ),
            'issues',
          ),
        ]),
      ),
    ),
  )

const resultDeclaration = (query: ts.Expression): ts.VariableStatement =>
  factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          'result',
          undefined,
          undefined,
          factory.createAwaitExpression(query),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  )

export const renderTypescriptQueryHelpers = (validationModuleSpecifier?: string): string =>
  printFile([
    queryableDeclaration(),
    ...(validationModuleSpecifier
      ? [
          factory.createExportDeclaration(
            undefined,
            false,
            factory.createNamedExports([
              factory.createExportSpecifier(false, undefined, 'QueryValidationError'),
              factory.createExportSpecifier(true, undefined, 'ValidationIssue'),
            ]),
            factory.createStringLiteral(validationModuleSpecifier),
          ),
        ]
      : queryValidationErrorDeclarations()),
  ])

const queryableDeclaration = (): ts.InterfaceDeclaration =>
  factory.createInterfaceDeclaration([exportModifier], 'Queryable', undefined, undefined, [
    factory.createMethodSignature(
      undefined,
      'query',
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'sql',
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'values',
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)),
        ),
      ],
      factory.createTypeReferenceNode('Promise', [
        factory.createTypeLiteralNode([
          factory.createPropertySignature(
            undefined,
            'rows',
            undefined,
            factory.createArrayTypeNode(
              factory.createTypeReferenceNode('Record', [
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
              ]),
            ),
          ),
          factory.createPropertySignature(
            undefined,
            'rowCount',
            factory.createToken(ts.SyntaxKind.QuestionToken),
            unionType([
              factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
              factory.createLiteralTypeNode(factory.createNull()),
            ]),
          ),
        ]),
      ]),
    ),
  ])

const namedImport = (
  names: readonly string[],
  module: string,
  typeOnly = false,
): ts.ImportDeclaration =>
  factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      typeOnly,
      undefined,
      factory.createNamedImports(
        names.map((name) =>
          factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
        ),
      ),
    ),
    factory.createStringLiteral(module),
    undefined,
  )

const objectType = (fields: readonly (readonly [string, ts.TypeNode])[]): ts.TypeNode =>
  factory.createTypeLiteralNode(
    fields.map(([name, type]) =>
      factory.createPropertySignature(undefined, propertyName(name), undefined, type),
    ),
  )

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

const words = (name: string): string[] => name.split(/[^A-Za-z0-9]+/u).filter(Boolean)
const pascalCase = (name: string): string =>
  words(name)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join('')
const camelCase = (name: string): string => {
  const pascal = pascalCase(name)
  return `${pascal[0]?.toLowerCase() ?? ''}${pascal.slice(1)}`
}
