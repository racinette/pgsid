import ts from 'typescript'
import type { Config, JsonSchemaDocument, TypeImport } from '../../config/schema.js'
import type { QueryAnalysisItem } from '../../query-analysis.js'
import {
  interpretValueLineage,
  type DatabaseColumn,
  type ValueLineage,
} from '../../query/value-lineage.js'
import { resolveJsonSchemaLineage, type JsonSchemaLineage } from '../shared/json-schema-lineage.js'
import {
  asyncModifier,
  exportModifier,
  factory,
  importDeclarations,
  intersectionType,
  nullableType,
  parseType,
  printFile,
  propertyName,
  unionType,
} from './ast.js'
import { typescriptTypeFromJsonSchemaLineage } from './json-schema.js'
import { typescriptJsonSchemaBindings } from './json-schema-bindings.js'
import { typescriptJsonSchemaLineageValidatorDeclaration } from './json-schema-validator.js'
import { resolveTypescriptPgType } from './type-mapping.js'

export type TypescriptQueryDiagnosticCode =
  | 'duplicate-output-name'
  | 'generated-name-collision'
  | 'invalid-type-mapping'
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
  typeDeclarations: ts.Statement[]
  wrapper: ts.FunctionDeclaration
  imports: TypeImport[]
  wrapperImports: string[]
}

interface ResolvedType {
  type: ts.TypeNode
  imports: TypeImport[]
  lineage?: JsonSchemaLineage
}

interface RenderedValidator {
  statement: ts.Statement
  name: string
  column: string
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
    try {
      const query = renderQuery(analysis, config, bindings, diagnostics)
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
    return { types: null, wrappers: null, diagnostics }
  }

  const types = printFile([
    ...importDeclarations(rendered.flatMap((query) => query.imports)),
    ...rendered.flatMap((query) => query.typeDeclarations),
  ])
  const wrapperNames = [...new Set(rendered.flatMap((query) => query.wrapperImports))]
  const wrappers = printFile([
    ...(wrapperNames.length
      ? [namedImport(wrapperNames, options.typesModuleSpecifier ?? './types.js')]
      : []),
    queryableDeclaration(),
    ...rendered.map((query) => query.wrapper),
  ])
  return { types, wrappers, diagnostics }
}

const renderQuery = (
  analysis: QueryAnalysisItem,
  config: Config,
  bindings: ReturnType<typeof typescriptJsonSchemaBindings>,
  diagnostics: TypescriptQueryDiagnostic[],
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
  const rowTypes = outputNames.map((name, index) => {
    const resolved = resolveOutputType(
      outputTypes[index] ?? 'unknown',
      semanticLineage?.[index],
      config,
      bindings,
    )
    imports.push(...resolved.imports)
    const claim = analysis.contract.outputs[index]
    const type = claim?.alwaysNull
      ? factory.createLiteralTypeNode(factory.createNull())
      : nullableType(resolved.type, claim?.notNull ?? false)
    if (resolved.lineage) {
      try {
        const validatorName = `is${queryName}${pascalCase(name)}${index + 1}`
        const statement = typescriptJsonSchemaLineageValidatorDeclaration(
          validatorName,
          factory.createIndexedAccessTypeNode(
            factory.createTypeReferenceNode(`${queryName}Row`),
            factory.createLiteralTypeNode(factory.createStringLiteral(name)),
          ),
          resolved.lineage,
          { nullable: !(claim?.notNull ?? false) },
        )
        if (statement) validators.push({ statement, name: validatorName, column: name })
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
    const resolved = resolveTypescriptPgType(parameterTypes[index] ?? 'unknown', config)
    imports.push(...resolved.imports)
    return nullableType(resolved.type, param.notNull)
  })
  const sqlName = `${functionName}Sql`
  const typeDeclarations: ts.Statement[] = [
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
    renderParams(queryName, analysis, paramTypes),
    renderRow(queryName, outputNames, rowTypes, analysis.contract.outputPresenceGroups),
    ...validators.map((validator) => validator.statement),
  ]
  return {
    typeDeclarations,
    wrapper: renderWrapper(analysis, queryName, functionName, sqlName, validators),
    imports,
    wrapperImports: [
      sqlName,
      `${queryName}Params`,
      ...(analysis.query.definition.command === 'exec' ||
      analysis.query.definition.command === 'execrows'
        ? []
        : [`${queryName}Row`]),
      ...validators.map((validator) => validator.name),
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

const resolveOutputType = (
  pgType: string,
  value: ValueLineage | undefined,
  config: Config,
  bindings: ReturnType<typeof typescriptJsonSchemaBindings>,
): ResolvedType => {
  if (value) {
    const lineage = resolveJsonSchemaLineage(value, bindings)
    if (lineage.alternatives.length || lineage.complete) {
      return { type: typescriptTypeFromJsonSchemaLineage(lineage), imports: [], lineage }
    }
    const column = directColumn(value)
    if (column) {
      const mapping = config.sql.codegen?.typescript?.mappings.column[columnKey(column)]
      if (mapping && (typeof mapping === 'string' || 'type' in mapping)) {
        return typeof mapping === 'string'
          ? { type: parseType(mapping), imports: [] }
          : { type: parseType(mapping.type), imports: [...(mapping.imports ?? [])] }
      }
    }
  }
  return resolveTypescriptPgType(pgType, config)
}

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
): ts.FunctionDeclaration => {
  const named = analysis.query.definition.parameters
  const parameters = [
    factory.createParameterDeclaration(
      undefined,
      undefined,
      'db',
      undefined,
      factory.createTypeReferenceNode('Queryable'),
    ),
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
  const values = named.length
    ? factory.createArrayLiteralExpression(
        [...named]
          .sort((left, right) => left.index - right.index)
          .map((parameter) =>
            factory.createElementAccessExpression(
              factory.createIdentifier('params'),
              factory.createStringLiteral(parameter.name),
            ),
          ),
      )
    : analysis.contract.params.length
      ? factory.createArrayLiteralExpression([
          factory.createSpreadElement(factory.createIdentifier('params')),
        ])
      : factory.createArrayLiteralExpression()
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
      ...validatorStatements(validators, analysis.query.name),
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
              ...validatorStatements(validators, analysis.query.name),
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
    factory.createBlock(statements, true),
  )
}

const validatorStatements = (
  validators: readonly RenderedValidator[],
  queryName: string,
): ts.Statement[] =>
  validators.map((validator) =>
    factory.createIfStatement(
      factory.createPrefixUnaryExpression(
        ts.SyntaxKind.ExclamationToken,
        factory.createCallExpression(factory.createIdentifier(validator.name), undefined, [
          factory.createElementAccessExpression(
            factory.createIdentifier('row'),
            factory.createStringLiteral(validator.column),
          ),
        ]),
      ),
      factory.createThrowStatement(
        factory.createNewExpression(factory.createIdentifier('TypeError'), undefined, [
          factory.createStringLiteral(`Invalid ${queryName}.${validator.column}`),
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

const namedImport = (names: readonly string[], module: string): ts.ImportDeclaration =>
  factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      false,
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
