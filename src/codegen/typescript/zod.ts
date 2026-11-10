import ts from 'typescript'
import type { CatalogSnapshot, ColumnInfo, TableInfo } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { OutputCheckCases, OutputLiterals } from '../../query/check-cases.js'
import type { SchemaDomainLiterals, SchemaRelationAnalyses } from '../../schema-analysis.js'
import { arrayDimensionsMapping } from '../shared/array-dimensions.js'
import { exportModifier, factory, identifier, printFile } from './ast.js'
import { codecStatements, encodeExpression } from './query.js'
import { typescriptArrayDimensions, typescriptCodec, typescriptCodecNames } from './sql/codecs.js'
import { typeName } from './type-mapping.js'

// zod v4 schemas for each table's select, insert and update shapes. Fields take exactly the values
// the generated queries send: booleans, safe integers, bigints, text, enum labels and CHECK
// literals natively, every other shape through the query codec's own encoder. CHECKs apply as a
// refinement the caller adds to whichever shape it picked, `.partial()` and `.pick()` included,
// since a column left out of a row leaves the checks reading it undecided.

const helpers = `function pgsidAccepts(encode: () => unknown): boolean {
  try {
    encode()
    return true
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}
function pgsidDomain(evaluate: (row: never) => readonly { result: { certain: boolean; value?: boolean | null; error?: string } }[], value: unknown): boolean {
  try {
    return evaluate({ value } as never).every(({ result }) => !(result.certain && ('error' in result || result.value === false)))
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}
function pgsidChecked<S extends z.ZodType>(schema: S, evaluate: (row: never) => readonly { constraint: string; message?: string; result: { certain: boolean; value?: boolean | null; error?: string } }[]): S {
  return schema.superRefine((row, context) => {
    for (const check of evaluate(row as never)) {
      if ('error' in check.result && check.result.error)
        context.addIssue({ code: 'custom', message: check.message ?? 'SQL evaluation failed', params: { code: check.result.error, constraint: check.constraint } })
      else if (check.result.certain && check.result.value === false)
        context.addIssue({ code: 'custom', message: 'new row violates check constraint "' + check.constraint + '"', params: { code: '23514', constraint: check.constraint } })
    }
  })
}`

const parsedHelpers = (): ts.Statement[] => {
  const parsed = ts.createSourceFile('zod.ts', helpers, ts.ScriptTarget.ES2022, true)
  const synthesize = (node: ts.Node): void => {
    ts.forEachChild(node, synthesize)
    ts.setTextRange(node, { pos: -1, end: -1 })
  }
  for (const statement of parsed.statements) synthesize(statement)
  return [...parsed.statements]
}

const z = (member: string, args: ts.Expression[] = []): ts.Expression =>
  factory.createCallExpression(
    factory.createPropertyAccessExpression(identifier('z'), member),
    undefined,
    args,
  )

const method = (target: ts.Expression, member: string, args: ts.Expression[] = []) =>
  factory.createCallExpression(
    factory.createPropertyAccessExpression(target, member),
    undefined,
    args,
  )

const literal = (kind: OutputLiterals['kind'], value: string): ts.Expression => {
  if (kind === 'string') return factory.createStringLiteral(value)
  if (kind === 'boolean') return value === 'true' ? factory.createTrue() : factory.createFalse()
  const negative = value.startsWith('-')
  const magnitude = negative ? value.slice(1) : value
  const number =
    kind === 'bigint'
      ? factory.createBigIntLiteral(`${magnitude}n`)
      : factory.createNumericLiteral(magnitude)
  return negative ? factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, number) : number
}

const literalSchema = (literals: OutputLiterals): ts.Expression =>
  literals.kind === 'string'
    ? z('enum', [
        factory.createArrayLiteralExpression(
          literals.values.map((value) => factory.createStringLiteral(value)),
        ),
      ])
    : literals.values.length === 1
      ? z('literal', [literal(literals.kind, literals.values[0]!)])
      : z('union', [
          factory.createArrayLiteralExpression(
            literals.values.map((value) => z('literal', [literal(literals.kind, value)])),
          ),
        ])

interface Column {
  column: ColumnInfo
  notNull: boolean
  defaulted: boolean
}

export function renderTypescriptZodSchemas(input: {
  schema: string
  tables: readonly TableInfo[]
  catalog: CatalogSnapshot
  config: Config
  relations: SchemaRelationAnalyses
  // The tables and domains with a CHECK evaluator in checks.ts.
  evaluated: readonly { kind: 'table' | 'domain'; schema: string; name: string }[]
  // The literals each domain's CHECKs admit, keyed `schema.name`.
  domains: SchemaDomainLiterals
  storedSemantics: (column: ColumnInfo) => { notNull: boolean; hasDefault: boolean }
}): string {
  if (input.tables.length === 0) return ''
  const mappings = input.config.sql.codegen?.typescript?.mappings.column ?? {}
  const encoders = new Set<string>()
  const domainEvaluators = new Set<string>()
  let custom = false
  const declarations: ts.Statement[] = []
  const evaluators: string[] = []
  for (const table of [...input.tables].sort((left, right) => compare(left.name, right.name))) {
    const tableType = typeName(table.name)
    const analysis = input.relations[`${table.schema}.${table.name}`]
    const columns: Column[] = table.columns.map((column) => {
      const semantics = input.storedSemantics(column)
      return {
        column,
        notNull: semantics.notNull,
        defaulted: semantics.hasDefault || column.identity === 'byDefault',
      }
    })
    const field = (
      { column }: Column,
      index: number,
      cases: OutputCheckCases | undefined,
      operation: 'select' | 'insert' | 'update',
    ): ts.Expression => {
      const key = `${table.schema}.${table.name}.${column.name}`
      const mapping = mappings[key]
      const domain = input.catalog.domains.find((item) => item.oid === column.typeOid)
      const literals =
        cases?.literals[index] ??
        (domain ? input.domains[`${domain.schema}.${domain.name}`] : undefined) ??
        undefined
      // A domain's own CHECKs decide its values, as domain input does.
      const domainEvaluator =
        domain &&
        input.evaluated.some(
          (item) =>
            item.kind === 'domain' && item.schema === domain.schema && item.name === domain.name,
        )
          ? `evaluate${typeName(`${domain.schema}_${domain.name}`)}DomainChecks`
          : null
      if (domainEvaluator) domainEvaluators.add(domainEvaluator)
      const enumType = input.catalog.enums.find((item) => item.oid === column.typeOid)
      const codec = typescriptArrayDimensions(
        typescriptCodec(column.typeName, input.catalog),
        arrayDimensionsMapping(mapping)?.dimensions,
        `sql.codegen.typescript.mappings.column[${JSON.stringify(key)}].dimensions`,
      )
      // A domain's values are branded, so only a check typed as the column's own type yields them.
      if (!domain) {
        if (literals) return literalSchema(literals)
        if (enumType) return literalSchema({ kind: 'string', values: enumType.values })
        if (codec.kind === 'scalar') {
          const native = { Bool: 'boolean', Int: 'int', Bigint: 'bigint', Text: 'string' }[
            codec.name as string
          ]
          if (native) return z(native)
        }
      }
      custom = true
      for (const name of typescriptCodecNames(codec, 'encode')) encoders.add(name)
      const value = identifier('value')
      const accepted = factory.createCallExpression(identifier('pgsidAccepts'), undefined, [
        factory.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          undefined,
          encodeExpression(codec, value, factory.createStringLiteral(column.name)),
        ),
      ])
      const domainChecked = (expression: ts.Expression): ts.Expression =>
        domainEvaluator
          ? factory.createLogicalAnd(
              expression,
              factory.createCallExpression(identifier('pgsidDomain'), undefined, [
                identifier(domainEvaluator),
                value,
              ]),
            )
          : expression
      const allowed = literals
        ? factory.createLogicalAnd(
            method(
              factory.createArrayLiteralExpression(
                literals.values.map((item) => literal(literals.kind, item)),
              ),
              'includes',
              [
                factory.createAsExpression(
                  value,
                  factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
                ),
              ],
            ),
            accepted,
          )
        : accepted
      const helper =
        operation === 'select'
          ? 'InferSelect'
          : operation === 'insert'
            ? 'InferInsert'
            : 'InferUpdate'
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(identifier('z'), 'custom'),
        [
          factory.createTypeReferenceNode('NonNullable', [
            factory.createIndexedAccessTypeNode(
              factory.createTypeReferenceNode(helper, [
                factory.createTypeReferenceNode(
                  factory.createQualifiedName(identifier('tables'), tableType),
                ),
              ]),
              factory.createLiteralTypeNode(factory.createStringLiteral(column.name)),
            ),
          ]),
        ],
        [
          factory.createArrowFunction(
            undefined,
            undefined,
            [factory.createParameterDeclaration(undefined, undefined, value)],
            undefined,
            undefined,
            factory.createLogicalAnd(
              factory.createLogicalAnd(
                factory.createStrictInequality(value, factory.createNull()),
                factory.createStrictInequality(value, identifier('undefined')),
              ),
              domainChecked(allowed),
            ),
          ),
          factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
              'error',
              factory.createStringLiteral(`Expected a ${column.typeName} value`),
            ),
          ]),
        ],
      )
    }
    for (const operation of ['select', 'insert', 'update'] as const) {
      const cases = operation === 'select' ? analysis?.outputCases : analysis?.writeCases
      const properties = columns.flatMap((item, index) => {
        if (
          operation !== 'select' &&
          (item.column.generated !== 'none' || item.column.identity === 'always')
        )
          return []
        let schema = field(item, index, cases, operation)
        if (!item.notNull) schema = method(schema, 'nullable')
        if (operation === 'update' || (operation === 'insert' && (item.defaulted || !item.notNull)))
          schema = method(schema, 'optional')
        return [
          factory.createPropertyAssignment(factory.createStringLiteral(item.column.name), schema),
        ]
      })
      declarations.push(
        factory.createVariableStatement(
          [exportModifier],
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                `${lowerFirst(tableType)}${upperFirst(operation)}Schema`,
                undefined,
                undefined,
                z('object', [factory.createObjectLiteralExpression(properties, true)]),
              ),
            ],
            ts.NodeFlags.Const,
          ),
        ),
      )
    }
    if (
      input.evaluated.some(
        (item) => item.kind === 'table' && item.schema === table.schema && item.name === table.name,
      )
    ) {
      const evaluator = `evaluate${typeName(`${table.schema}_${table.name}`)}Checks`
      evaluators.push(evaluator)
      const schemaType = factory.createTypeReferenceNode('S')
      declarations.push(
        factory.createFunctionDeclaration(
          [exportModifier],
          undefined,
          `with${tableType}Checks`,
          [
            factory.createTypeParameterDeclaration(
              undefined,
              'S',
              factory.createTypeReferenceNode(
                factory.createQualifiedName(identifier('z'), 'ZodType'),
                [factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword)],
              ),
            ),
          ],
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              'schema',
              undefined,
              schemaType,
            ),
          ],
          schemaType,
          factory.createBlock([
            factory.createReturnStatement(
              factory.createCallExpression(identifier('pgsidChecked'), undefined, [
                identifier('schema'),
                identifier(evaluator),
              ]),
            ),
          ]),
        ),
      )
    }
  }
  const imports: ts.Statement[] = [
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(
        false,
        undefined,
        factory.createNamedImports([
          factory.createImportSpecifier(false, undefined, identifier('z')),
        ]),
      ),
      factory.createStringLiteral('zod/v4'),
    ),
    ...(custom
      ? [
          factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              true,
              undefined,
              factory.createNamedImports(
                ['InferInsert', 'InferSelect', 'InferUpdate'].map((name) =>
                  factory.createImportSpecifier(false, undefined, identifier(name)),
                ),
              ),
            ),
            factory.createStringLiteral('../helpers.js'),
          ),
          factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              true,
              undefined,
              factory.createNamespaceImport(identifier('tables')),
            ),
            factory.createStringLiteral('./tables.js'),
          ),
        ]
      : []),
    ...(evaluators.length || domainEvaluators.size
      ? [
          factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamedImports(
                [...evaluators, ...[...domainEvaluators].sort()].map((name) =>
                  factory.createImportSpecifier(false, undefined, identifier(name)),
                ),
              ),
            ),
            factory.createStringLiteral('./checks.js'),
          ),
        ]
      : []),
  ]
  const runtime = parsedHelpers().filter(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      ((statement.name?.text === 'pgsidAccepts' && custom) ||
        (statement.name?.text === 'pgsidDomain' && domainEvaluators.size > 0) ||
        (statement.name?.text === 'pgsidChecked' && evaluators.length > 0)),
  )
  return printFile([...imports, ...codecStatements(encoders), ...runtime, ...declarations])
}

const lowerFirst = (value: string): string => value.charAt(0).toLowerCase() + value.slice(1)
const upperFirst = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)
const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)
