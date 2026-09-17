import ts from 'typescript'
import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { JsonSchemaLineage, JsonSchemaAlternative } from '../shared/json-schema-lineage.js'
import { exportModifier, factory, identifier, parseType, printNode } from './ast.js'
import { diagnosticHelperDeclarations, validationResultType } from './validation-diagnostics.js'

export interface GenerateTypescriptJsonSchemaValidatorOptions {
  document?: JsonSchemaDocument
  nullable?: boolean
  diagnostic?: boolean
  helpers?: ts.Expression
  schemaPredicate?: (
    schema: JsonSchemaDocument,
    document: JsonSchemaDocument,
    value: ts.Expression,
  ) => ts.Expression | undefined
  schemaValidation?: GenerateTypescriptJsonSchemaValidatorOptions['schemaPredicate']
  predicate?: (
    alternative: JsonSchemaAlternative,
    value: ts.Expression,
  ) => ts.Expression | undefined
  validation?: (
    alternative: JsonSchemaAlternative,
    value: ts.Expression,
  ) => ts.Expression | undefined
}

export class UnsupportedJsonSchemaError extends Error {
  constructor(readonly keyword: string) {
    super(`Unsupported JSON Schema assertion: ${keyword}`)
    this.name = 'UnsupportedJsonSchemaError'
  }
}

interface ValidatorReference {
  name: string
  predicate: ts.Expression
}
interface ValidatorContext {
  documents: Map<JsonSchemaDocument, Map<string, ValidatorReference>>
  references: ValidatorReference[]
  diagnostic: boolean
  sharedHelpers?: ts.Expression
  delegate?: (
    schema: JsonSchemaDocument,
    value: ts.Expression,
    document: JsonSchemaDocument,
    path: ts.Expression,
  ) => ts.Expression | undefined
}
const validatorContext = (diagnostic = false): ValidatorContext => ({
  documents: new Map(),
  references: [],
  diagnostic,
})

const delegatedContext = (
  options: Pick<
    GenerateTypescriptJsonSchemaValidatorOptions,
    'diagnostic' | 'schemaPredicate' | 'schemaValidation' | 'helpers'
  >,
): ValidatorContext => {
  const context = validatorContext(options.diagnostic)
  context.sharedHelpers = options.helpers
  if (options.schemaPredicate || options.schemaValidation)
    context.delegate = (schema, value, document, path) => {
      if (context.diagnostic) {
        const result = options.schemaValidation?.(schema, document, value)
        return result ? call(identifier('_include'), [result, path]) : undefined
      }
      return options.schemaPredicate?.(schema, document, value)
    }
  return context
}

export function typescriptJsonSchemaCheckExpression(
  schema: JsonSchemaDocument,
  document: JsonSchemaDocument,
  diagnostic: boolean,
  delegate: NonNullable<ValidatorContext['delegate']>,
): ts.Expression {
  const context = validatorContext(diagnostic)
  let root = true
  context.delegate = (...args) => {
    if (root) {
      root = false
      return undefined
    }
    return delegate(...args)
  }
  return compile(schema, identifier('value'), document, new Set(), context, identifier('path'))
}

export function typescriptJsonSchemaValidatorDeclaration(
  name: string,
  type: ts.TypeNode | string,
  schema: JsonSchemaDocument,
  options: GenerateTypescriptJsonSchemaValidatorOptions = {},
): ts.FunctionDeclaration {
  const context = delegatedContext(options)
  const value = identifier('value')
  const predicate = compile(schema, value, options.document ?? schema, new Set(), context)
  return validatorDeclaration(
    name,
    typeof type === 'string' ? parseType(type) : type,
    options.nullable ? or([equal(value, factory.createNull()), predicate]) : predicate,
    context,
  )
}

export function typescriptJsonSchemaLineageValidatorDeclaration(
  name: string,
  type: ts.TypeNode | string,
  lineage: JsonSchemaLineage,
  options: Pick<
    GenerateTypescriptJsonSchemaValidatorOptions,
    | 'nullable'
    | 'predicate'
    | 'diagnostic'
    | 'validation'
    | 'schemaPredicate'
    | 'schemaValidation'
    | 'helpers'
  > = {},
): ts.FunctionDeclaration | null {
  if (
    !lineage.complete ||
    lineage.alternatives.length === 0 ||
    lineage.alternatives.some((alternative) => !alternative.runtimeValidation)
  ) {
    return null
  }
  const context = delegatedContext(options)
  const value = identifier('value')
  const path = factory.createArrayLiteralExpression()
  const predicates = lineage.alternatives.map((alternative) => {
    if (alternative.representation === 'text')
      return assertion(context, value, path, 'type', 'string', typePredicate(value, 'string'))
    if (context.diagnostic) {
      const result = options.validation?.(alternative, value)
      if (result) return call(identifier('_include'), [result, path])
    } else {
      const predicate = options.predicate?.(alternative, value)
      if (predicate) return predicate
    }
    return compile(alternative.schema, value, alternative.document, new Set(), context)
  })
  const predicate = alternatives(context, value, path, 'anyOf', predicates)
  return validatorDeclaration(
    name,
    typeof type === 'string' ? parseType(type) : type,
    options.nullable ? or([equal(value, factory.createNull()), predicate]) : predicate,
    context,
  )
}

export function generateTypescriptJsonSchemaValidator(
  name: string,
  type: string,
  schema: JsonSchemaDocument,
  options: GenerateTypescriptJsonSchemaValidatorOptions = {},
): string {
  return printNode(typescriptJsonSchemaValidatorDeclaration(name, type, schema, options))
}

export function generateTypescriptJsonSchemaLineageValidator(
  name: string,
  type: string,
  lineage: JsonSchemaLineage,
  options: Pick<
    GenerateTypescriptJsonSchemaValidatorOptions,
    | 'nullable'
    | 'predicate'
    | 'diagnostic'
    | 'validation'
    | 'schemaPredicate'
    | 'schemaValidation'
    | 'helpers'
  > = {},
): string | null {
  const declaration = typescriptJsonSchemaLineageValidatorDeclaration(name, type, lineage, options)
  return declaration ? printNode(declaration) : null
}

const validatorDeclaration = (
  name: string,
  type: ts.TypeNode,
  predicate: ts.Expression,
  context: ValidatorContext,
): ts.FunctionDeclaration => {
  const includedResult = (expression: ts.Expression): ts.Expression | undefined =>
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === '_include'
      ? expression.arguments[0]
      : undefined
  const delegated = context.diagnostic
    ? (includedResult(predicate) ??
      (ts.isBinaryExpression(predicate) &&
      predicate.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
      includedResult(predicate.right)
        ? factory.createConditionalExpression(
            predicate.left,
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createObjectLiteralExpression([
              factory.createPropertyAssignment('valid', factory.createTrue()),
              factory.createPropertyAssignment('issues', factory.createArrayLiteralExpression()),
            ]),
            factory.createToken(ts.SyntaxKind.ColonToken),
            includedResult(predicate.right)!,
          )
        : undefined))
    : undefined
  const expressions = [predicate, ...context.references.map((reference) => reference.predicate)]
  const uses = (name: string): boolean => {
    const visit = (node: ts.Node): boolean =>
      (ts.isIdentifier(node) && node.text === name) || (ts.forEachChild(node, visit) ?? false)
    return expressions.some(visit)
  }
  const deepEqual = uses('_deepEqual')
  const declaration = factory.createFunctionDeclaration(
    [exportModifier],
    undefined,
    identifier(name),
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'value',
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
      ),
    ],
    context.diagnostic
      ? validationResultType()
      : factory.createTypePredicateNode(undefined, 'value', type),
    factory.createBlock(
      delegated
        ? [factory.createReturnStatement(delegated)]
        : [
            ...(context.diagnostic
              ? diagnosticHelperDeclarations().filter((statement) => {
                  const name = ts.isFunctionDeclaration(statement)
                    ? statement.name?.text
                    : '_issues'
                  if (context.sharedHelpers) return name === '_issues'
                  return (
                    name === '_issues' ||
                    (name === '_check' && (uses('_union') || context.references.length > 0)) ||
                    (name !== undefined && uses(name))
                  )
                })
              : []),
            ...(!context.sharedHelpers && (deepEqual || uses('_hasOwn'))
              ? [hasOwnDeclaration()]
              : []),
            ...(!context.sharedHelpers && deepEqual ? [deepEqualDeclaration()] : []),
            ...context.references.flatMap((reference) => referenceDeclarations(reference, context)),
            ...(context.diagnostic
              ? [
                  constant('valid', predicate),
                  factory.createReturnStatement(
                    factory.createObjectLiteralExpression([
                      factory.createShorthandPropertyAssignment('valid'),
                      factory.createPropertyAssignment('issues', identifier('_issues')),
                    ]),
                  ),
                ]
              : [factory.createReturnStatement(predicate)]),
          ],
      true,
    ),
  )
  if (!context.sharedHelpers) return declaration
  const stateful = new Set(['_check', '_probe', '_union', '_include'])
  const stateless = new Set(['_hasOwn', '_deepEqual'])
  const result = ts.transform(declaration, [
    (transform) => {
      const visit: ts.Visitor = (node) => {
        const visited = ts.visitEachChild(node, visit, transform)
        if (
          ts.isCallExpression(visited) &&
          ts.isIdentifier(visited.expression) &&
          (stateful.has(visited.expression.text) || stateless.has(visited.expression.text))
        )
          return factory.updateCallExpression(
            visited,
            property(context.sharedHelpers!, visited.expression.text),
            visited.typeArguments,
            stateful.has(visited.expression.text)
              ? [...visited.arguments, identifier('_issues')]
              : visited.arguments,
          )
        return visited
      }
      return (node) => ts.visitNode(node, visit) as ts.FunctionDeclaration
    },
  ])
  const transformed = result.transformed[0] as ts.FunctionDeclaration
  result.dispose()
  return transformed
}

const referenceDeclarations = (
  reference: ValidatorReference,
  context: ValidatorContext,
): ts.Statement[] => {
  const active = identifier(`${reference.name}Active`)
  const value = identifier('value')
  return [
    constant(
      active.text,
      factory.createNewExpression(
        identifier('Set'),
        [factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)],
        [],
      ),
    ),
    factory.createFunctionDeclaration(
      undefined,
      undefined,
      reference.name,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'value',
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        ),
        ...(context.diagnostic
          ? [
              factory.createParameterDeclaration(
                undefined,
                undefined,
                'path',
                undefined,
                parseType('readonly (string | number)[]'),
              ),
            ]
          : []),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
      factory.createBlock(
        [
          factory.createIfStatement(
            call(property(active, 'has'), [value]),
            factory.createReturnStatement(
              assertion(
                context,
                value,
                identifier('path'),
                '$ref',
                'acyclic value',
                factory.createFalse(),
              ),
            ),
          ),
          factory.createExpressionStatement(call(property(active, 'add'), [value])),
          factory.createTryStatement(
            factory.createBlock([factory.createReturnStatement(reference.predicate)], true),
            undefined,
            factory.createBlock(
              [factory.createExpressionStatement(call(property(active, 'delete'), [value]))],
              true,
            ),
          ),
        ],
        true,
      ),
    ),
  ]
}

export const hasOwnDeclaration = (): ts.VariableStatement =>
  constant(
    '_hasOwn',
    factory.createArrowFunction(
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(undefined, undefined, 'object', undefined, recordType()),
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'key',
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      call(
        property(property(property(identifier('Object'), 'prototype'), 'hasOwnProperty'), 'call'),
        [identifier('object'), identifier('key')],
      ),
    ),
  )

export const deepEqualDeclaration = (): ts.VariableStatement => {
  const left = identifier('left')
  const right = identifier('right')
  const leftRecord = identifier('leftRecord')
  const rightRecord = identifier('rightRecord')
  const keys = identifier('keys')
  return constant(
    '_deepEqual',
    factory.createArrowFunction(
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(undefined, undefined, left, undefined, unknownType()),
        factory.createParameterDeclaration(undefined, undefined, right, undefined, unknownType()),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock(
        [
          factory.createIfStatement(
            call(property(identifier('Object'), 'is'), [left, right]),
            returnBoolean(true),
          ),
          factory.createIfStatement(
            or([
              notEqual(factory.createTypeOfExpression(left), factory.createStringLiteral('object')),
              equal(left, factory.createNull()),
              notEqual(
                factory.createTypeOfExpression(right),
                factory.createStringLiteral('object'),
              ),
              equal(right, factory.createNull()),
            ]),
            returnBoolean(false),
          ),
          factory.createIfStatement(
            or([arrayIsArray(left), arrayIsArray(right)]),
            factory.createReturnStatement(
              and([
                arrayIsArray(left),
                arrayIsArray(right),
                equal(property(left, 'length'), property(right, 'length')),
                call(property(left, 'every'), [
                  arrow(
                    ['item', 'index'],
                    call(identifier('_deepEqual'), [
                      identifier('item'),
                      element(right, identifier('index')),
                    ]),
                  ),
                ]),
              ]),
            ),
          ),
          constant('leftRecord', factory.createAsExpression(left, recordType())),
          constant('rightRecord', factory.createAsExpression(right, recordType())),
          constant('keys', objectKeys(leftRecord)),
          factory.createReturnStatement(
            and([
              equal(property(keys, 'length'), property(objectKeys(rightRecord), 'length')),
              call(property(keys, 'every'), [
                arrow(
                  ['key'],
                  and([
                    call(identifier('_hasOwn'), [rightRecord, identifier('key')]),
                    call(identifier('_deepEqual'), [
                      element(leftRecord, identifier('key')),
                      element(rightRecord, identifier('key')),
                    ]),
                  ]),
                ),
              ]),
            ]),
          ),
        ],
        true,
      ),
    ),
  )
}

const compile = (
  schema: JsonSchemaDocument,
  value: ts.Expression,
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  context: ValidatorContext,
  path: ts.Expression = factory.createArrayLiteralExpression(),
  failureKeyword = 'falseSchema',
): ts.Expression => {
  const delegated =
    failureKeyword === 'falseSchema' ? context.delegate?.(schema, value, document, path) : undefined
  if (delegated) return delegated
  if (schema === true) return factory.createTrue()
  if (schema === false)
    return assertion(context, value, path, failureKeyword, false, factory.createFalse())
  assertKeywords(schema)
  const predicates: ts.Expression[] = []

  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    if (seen.has(reference)) throw new UnsupportedJsonSchemaError(`recursive ${reference}`)
    const target = localReference(reference, document)
    if (target === null) throw new UnsupportedJsonSchemaError(`$ref ${reference}`)
    const delegated = context.delegate?.(target, value, document, path)
    if (delegated) predicates.push(delegated)
    else {
      const references = context.documents.get(document) ?? new Map<string, ValidatorReference>()
      context.documents.set(document, references)
      let helper = references.get(reference)
      if (!helper) {
        helper = { name: `_ref${context.references.length + 1}`, predicate: factory.createFalse() }
        references.set(reference, helper)
        context.references.push(helper)
        helper.predicate = compile(
          target,
          identifier('value'),
          document,
          new Set([...seen, reference]),
          context,
          identifier('path'),
        )
      }
      predicates.push(call(identifier(helper.name), context.diagnostic ? [value, path] : [value]))
    }
  }
  if (schema['const'] !== undefined)
    predicates.push(
      assertion(
        context,
        value,
        path,
        'const',
        schema['const'],
        constantPredicate(value, schema['const']),
      ),
    )
  if (Array.isArray(schema['enum'])) {
    predicates.push(
      assertion(
        context,
        value,
        path,
        'enum',
        schema['enum'],
        or(schema['enum'].map((candidate) => constantPredicate(value, candidate))),
      ),
    )
  }
  const declared = schema['type']
  const typeChecks: ts.Expression[] = []
  if (typeof declared === 'string')
    typeChecks.push(
      assertion(context, value, path, 'type', declared, typePredicate(value, declared)),
    )
  else if (Array.isArray(declared)) {
    typeChecks.push(
      assertion(
        context,
        value,
        path,
        'type',
        declared,
        or(
          declared
            .filter((type): type is string => typeof type === 'string')
            .map((type) => typePredicate(value, type)),
        ),
      ),
    )
  }

  predicates.push(
    ...schemaArray(schema['allOf']).map((candidate) =>
      compile(candidate, value, document, new Set(seen), context, path),
    ),
  )
  const anyOf = schemaArray(schema['anyOf'])
  if (anyOf.length) {
    predicates.push(
      alternatives(
        context,
        value,
        path,
        'anyOf',
        anyOf.map((candidate) => compile(candidate, value, document, new Set(seen), context, path)),
      ),
    )
  }
  const oneOf = schemaArray(schema['oneOf'])
  if (oneOf.length) {
    predicates.push(
      alternatives(
        context,
        value,
        path,
        'oneOf',
        oneOf.map((candidate) => compile(candidate, value, document, new Set(seen), context, path)),
      ),
    )
  }
  const negated = schema['not']
  if (typeof negated === 'boolean' || isRecord(negated)) {
    predicates.push(
      assertion(
        context,
        value,
        path,
        'not',
        'no matching value',
        not(probe(context, compile(negated, value, document, new Set(seen), context, path))),
      ),
    )
  }
  const condition = schema['if']
  if (typeof condition === 'boolean' || isRecord(condition)) {
    const thenSchema = schema['then']
    const elseSchema = schema['else']
    predicates.push(
      factory.createConditionalExpression(
        probe(context, compile(condition, value, document, new Set(seen), context, path)),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        typeof thenSchema === 'boolean' || isRecord(thenSchema)
          ? compile(thenSchema, value, document, new Set(seen), context, path)
          : factory.createTrue(),
        factory.createToken(ts.SyntaxKind.ColonToken),
        typeof elseSchema === 'boolean' || isRecord(elseSchema)
          ? compile(elseSchema, value, document, new Set(seen), context, path)
          : factory.createTrue(),
      ),
    )
  }
  predicates.push(...compileNumber(schema, value, context, path))
  predicates.push(...compileString(schema, value, context, path))
  predicates.push(...compileArray(schema, value, document, context, path))
  predicates.push(...compileObject(schema, value, document, seen, context, path))
  return and([...typeChecks, all(context, predicates)])
}

const compileNumber = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  context: ValidatorContext,
  path: ts.Expression,
): ts.Expression[] => {
  const checks: ts.Expression[] = []
  const numeric = factory.createAsExpression(
    value,
    factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  )
  for (const [keyword, operator] of [
    ['minimum', ts.SyntaxKind.GreaterThanEqualsToken],
    ['maximum', ts.SyntaxKind.LessThanEqualsToken],
    ['exclusiveMinimum', ts.SyntaxKind.GreaterThanToken],
    ['exclusiveMaximum', ts.SyntaxKind.LessThanToken],
  ] as const) {
    const limit = schema[keyword]
    if (typeof limit === 'number')
      checks.push(
        assertion(context, value, path, keyword, limit, binary(numeric, operator, number(limit))),
      )
  }
  const multiple = schema['multipleOf']
  if (typeof multiple === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'multipleOf',
        multiple,
        call(property(identifier('Number'), 'isInteger'), [
          binary(numeric, ts.SyntaxKind.SlashToken, number(multiple)),
        ]),
      ),
    )
  }
  return checks.length
    ? [
        or([
          notEqual(factory.createTypeOfExpression(value), factory.createStringLiteral('number')),
          all(context, checks),
        ]),
      ]
    : []
}

const compileString = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  context: ValidatorContext,
  path: ts.Expression,
): ts.Expression[] => {
  const checks: ts.Expression[] = []
  const text = factory.createAsExpression(
    value,
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  )
  const length = property(
    factory.createArrayLiteralExpression([factory.createSpreadElement(text)]),
    'length',
  )
  if (typeof schema['minLength'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'minLength',
        schema['minLength'],
        binary(length, ts.SyntaxKind.GreaterThanEqualsToken, number(schema['minLength'])),
      ),
    )
  }
  if (typeof schema['maxLength'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'maxLength',
        schema['maxLength'],
        binary(length, ts.SyntaxKind.LessThanEqualsToken, number(schema['maxLength'])),
      ),
    )
  }
  const pattern = schema['pattern']
  if (typeof pattern === 'string') {
    validatePattern(pattern, 'pattern')
    checks.push(
      assertion(
        context,
        value,
        path,
        'pattern',
        pattern,
        call(property(regexp(pattern), 'test'), [text]),
      ),
    )
  }
  return checks.length
    ? [
        or([
          notEqual(factory.createTypeOfExpression(value), factory.createStringLiteral('string')),
          all(context, checks),
        ]),
      ]
    : []
}

const compileArray = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  document: JsonSchemaDocument,
  context: ValidatorContext,
  path: ts.Expression,
): ts.Expression[] => {
  const hasKeywords = [
    'prefixItems',
    'items',
    'contains',
    'minContains',
    'maxContains',
    'minItems',
    'maxItems',
    'uniqueItems',
  ].some((keyword) => schema[keyword] !== undefined)
  if (!hasKeywords) return []
  const array = factory.createAsExpression(value, factory.createArrayTypeNode(unknownType()))
  const checks: ts.Expression[] = []
  if (typeof schema['minItems'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'minItems',
        schema['minItems'],
        binary(
          property(array, 'length'),
          ts.SyntaxKind.GreaterThanEqualsToken,
          number(schema['minItems']),
        ),
      ),
    )
  }
  if (typeof schema['maxItems'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'maxItems',
        schema['maxItems'],
        binary(
          property(array, 'length'),
          ts.SyntaxKind.LessThanEqualsToken,
          number(schema['maxItems']),
        ),
      ),
    )
  }
  if (schema['uniqueItems'] === true) {
    checks.push(
      assertion(
        context,
        value,
        path,
        'uniqueItems',
        true,
        call(property(array, 'every'), [
          arrow(
            ['item', 'index', 'all'],
            equal(
              call(property(identifier('all'), 'findIndex'), [
                arrow(
                  ['candidate'],
                  call(identifier('_deepEqual'), [identifier('item'), identifier('candidate')]),
                ),
              ]),
              identifier('index'),
            ),
          ),
        ]),
      ),
    )
  }
  const prefix = schemaArray(schema['prefixItems'])
  prefix.forEach((candidate, index) => {
    checks.push(
      or([
        binary(property(array, 'length'), ts.SyntaxKind.LessThanEqualsToken, number(index)),
        compile(
          candidate,
          element(array, index),
          document,
          new Set(),
          context,
          childPath(path, number(index)),
          'prefixItems',
        ),
      ]),
    )
  })
  const items = schema['items']
  if (typeof items === 'boolean' || isRecord(items)) {
    checks.push(
      every(
        context,
        call(property(array, 'slice'), [number(prefix.length)]),
        arrow(
          context.diagnostic ? ['item', 'index'] : ['item'],
          compile(
            items,
            identifier('item'),
            document,
            new Set(),
            context,
            childPath(
              path,
              prefix.length ? add(identifier('index'), number(prefix.length)) : identifier('index'),
            ),
            'items',
          ),
        ),
      ),
    )
  }
  const contains = schema['contains']
  if (typeof contains === 'boolean' || isRecord(contains)) {
    const count = property(
      call(property(array, 'filter'), [
        arrow(
          ['item'],
          probe(context, compile(contains, identifier('item'), document, new Set(), context, path)),
        ),
      ]),
      'length',
    )
    const minimum = typeof schema['minContains'] === 'number' ? schema['minContains'] : 1
    checks.push(
      assertion(
        context,
        value,
        path,
        typeof schema['minContains'] === 'number' ? 'minContains' : 'contains',
        minimum,
        binary(count, ts.SyntaxKind.GreaterThanEqualsToken, number(minimum)),
      ),
    )
    if (typeof schema['maxContains'] === 'number') {
      checks.push(
        assertion(
          context,
          value,
          path,
          'maxContains',
          schema['maxContains'],
          binary(count, ts.SyntaxKind.LessThanEqualsToken, number(schema['maxContains'])),
        ),
      )
    }
  }
  return [or([not(arrayIsArray(value)), all(context, checks)])]
}

const compileObject = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  context: ValidatorContext,
  path: ts.Expression,
): ts.Expression[] => {
  const hasKeywords = [
    'properties',
    'patternProperties',
    'additionalProperties',
    'required',
    'dependentRequired',
    'dependentSchemas',
    'propertyNames',
    'minProperties',
    'maxProperties',
  ].some((keyword) => schema[keyword] !== undefined)
  if (!hasKeywords) return []
  const object = factory.createAsExpression(value, recordType())
  const checks: ts.Expression[] = []
  const required = Array.isArray(schema['required'])
    ? schema['required'].filter((name): name is string => typeof name === 'string')
    : []
  checks.push(
    ...required.map((name) =>
      assertion(
        context,
        element(object, name),
        childPath(path, factory.createStringLiteral(name)),
        'required',
        'present property',
        hasOwn(object, name),
      ),
    ),
  )
  const properties = isRecord(schema['properties']) ? schema['properties'] : {}
  for (const [name, schemaValue] of Object.entries(properties)) {
    if (typeof schemaValue !== 'boolean' && !isRecord(schemaValue)) continue
    checks.push(
      or([
        not(hasOwn(object, name)),
        compile(
          schemaValue,
          element(object, name),
          document,
          new Set(),
          context,
          childPath(path, factory.createStringLiteral(name)),
        ),
      ]),
    )
  }
  const patterns = isRecord(schema['patternProperties'])
    ? Object.entries(schema['patternProperties']).filter(
        (entry): entry is [string, JsonSchemaDocument] =>
          typeof entry[1] === 'boolean' || isRecord(entry[1]),
      )
    : []
  for (const [pattern] of patterns) validatePattern(pattern, `patternProperties ${pattern}`)
  if (patterns.length) {
    checks.push(
      entriesEvery(
        object,
        all(
          context,
          patterns.map(([pattern, candidate]) =>
            or([
              not(call(property(regexp(pattern), 'test'), [identifier('key')])),
              compile(
                candidate,
                identifier('item'),
                document,
                new Set(),
                context,
                childPath(path, identifier('key')),
              ),
            ]),
          ),
        ),
        context,
      ),
    )
  }
  const additional = schema['additionalProperties']
  if (typeof additional === 'boolean' || isRecord(additional)) {
    const known = factory.createArrayLiteralExpression(
      Object.keys(properties).map((name) => factory.createStringLiteral(name)),
    )
    const matched = or(
      patterns.map(([pattern]) => call(property(regexp(pattern), 'test'), [identifier('key')])),
    )
    checks.push(
      entriesEvery(
        object,
        or([
          call(property(known, 'includes'), [identifier('key')]),
          matched,
          compile(
            additional,
            identifier('item'),
            document,
            new Set(),
            context,
            childPath(path, identifier('key')),
            'additionalProperties',
          ),
        ]),
        context,
      ),
    )
  }
  const propertyNames = schema['propertyNames']
  if (typeof propertyNames === 'boolean' || isRecord(propertyNames)) {
    checks.push(
      every(
        context,
        objectKeys(object),
        arrow(
          ['key'],
          compile(
            propertyNames,
            identifier('key'),
            document,
            new Set(),
            context,
            childPath(path, identifier('key')),
            'propertyNames',
          ),
        ),
      ),
    )
  }
  const dependentRequired = isRecord(schema['dependentRequired']) ? schema['dependentRequired'] : {}
  for (const [name, dependencies] of Object.entries(dependentRequired)) {
    if (!Array.isArray(dependencies)) continue
    checks.push(
      or([
        not(hasOwn(object, name)),
        all(
          context,
          dependencies
            .filter((dependency): dependency is string => typeof dependency === 'string')
            .map((dependency) =>
              assertion(
                context,
                element(object, dependency),
                childPath(path, factory.createStringLiteral(dependency)),
                'dependentRequired',
                name,
                hasOwn(object, dependency),
              ),
            ),
        ),
      ]),
    )
  }
  const dependentSchemas = isRecord(schema['dependentSchemas']) ? schema['dependentSchemas'] : {}
  for (const [name, dependent] of Object.entries(dependentSchemas)) {
    if (typeof dependent !== 'boolean' && !isRecord(dependent)) continue
    checks.push(
      or([
        not(hasOwn(object, name)),
        compile(dependent, value, document, new Set(seen), context, path),
      ]),
    )
  }
  if (typeof schema['minProperties'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'minProperties',
        schema['minProperties'],
        binary(
          property(objectKeys(object), 'length'),
          ts.SyntaxKind.GreaterThanEqualsToken,
          number(schema['minProperties']),
        ),
      ),
    )
  }
  if (typeof schema['maxProperties'] === 'number') {
    checks.push(
      assertion(
        context,
        value,
        path,
        'maxProperties',
        schema['maxProperties'],
        binary(
          property(objectKeys(object), 'length'),
          ts.SyntaxKind.LessThanEqualsToken,
          number(schema['maxProperties']),
        ),
      ),
    )
  }
  return [
    factory.createConditionalExpression(
      typePredicate(value, 'object'),
      factory.createToken(ts.SyntaxKind.QuestionToken),
      all(context, checks),
      factory.createToken(ts.SyntaxKind.ColonToken),
      factory.createTrue(),
    ),
  ]
}

const typePredicate = (value: ts.Expression, type: string): ts.Expression => {
  if (type === 'null') return equal(value, factory.createNull())
  if (type === 'boolean' || type === 'string') {
    return equal(factory.createTypeOfExpression(value), factory.createStringLiteral(type))
  }
  if (type === 'number') {
    return and([
      equal(factory.createTypeOfExpression(value), factory.createStringLiteral('number')),
      call(property(identifier('Number'), 'isFinite'), [value]),
    ])
  }
  if (type === 'integer') {
    return and([
      equal(factory.createTypeOfExpression(value), factory.createStringLiteral('number')),
      call(property(identifier('Number'), 'isInteger'), [value]),
    ])
  }
  if (type === 'array') return arrayIsArray(value)
  if (type === 'object') {
    return and([
      equal(factory.createTypeOfExpression(value), factory.createStringLiteral('object')),
      notEqual(value, factory.createNull()),
      not(arrayIsArray(value)),
    ])
  }
  throw new UnsupportedJsonSchemaError(`type ${type}`)
}

const constantPredicate = (value: ts.Expression, constantValue: JsonValue): ts.Expression =>
  constantValue !== null && typeof constantValue === 'object'
    ? call(identifier('_deepEqual'), [value, jsonExpression(constantValue)])
    : call(property(identifier('Object'), 'is'), [value, jsonExpression(constantValue)])

const jsonExpression = (value: JsonValue): ts.Expression => {
  if (value === null) return factory.createNull()
  if (typeof value === 'string') return factory.createStringLiteral(value)
  if (typeof value === 'number') return number(value)
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse()
  if (Array.isArray(value)) return factory.createArrayLiteralExpression(value.map(jsonExpression))
  return factory.createObjectLiteralExpression(
    Object.entries(value).map(([name, item]) =>
      factory.createPropertyAssignment(factory.createStringLiteral(name), jsonExpression(item)),
    ),
  )
}

const assertion = (
  context: ValidatorContext,
  value: ts.Expression,
  path: ts.Expression,
  keyword: string,
  expected: JsonValue,
  predicate: ts.Expression,
): ts.Expression =>
  context.diagnostic
    ? call(identifier('_check'), [
        predicate,
        value,
        path,
        factory.createStringLiteral(keyword),
        jsonExpression(expected),
      ])
    : predicate

const childPath = (path: ts.Expression, key: ts.Expression): ts.Expression =>
  factory.createArrayLiteralExpression(
    ts.isArrayLiteralExpression(path)
      ? [...path.elements, key]
      : [factory.createSpreadElement(path), key],
  )

const probe = (context: ValidatorContext, predicate: ts.Expression): ts.Expression =>
  context.diagnostic ? call(identifier('_probe'), [arrow([], predicate)]) : predicate

const all = (context: ValidatorContext, predicates: readonly ts.Expression[]): ts.Expression =>
  context.diagnostic && predicates.length > 1
    ? call(property(factory.createArrayLiteralExpression(predicates), 'every'), [
        arrow(['valid'], identifier('valid')),
      ])
    : and(predicates)

const every = (
  context: ValidatorContext,
  array: ts.Expression,
  predicate: ts.ArrowFunction,
): ts.Expression =>
  context.diagnostic
    ? call(property(call(property(array, 'map'), [predicate]), 'every'), [
        arrow(['valid'], identifier('valid')),
      ])
    : call(property(array, 'every'), [predicate])

const alternatives = (
  context: ValidatorContext,
  value: ts.Expression,
  path: ts.Expression,
  keyword: 'anyOf' | 'oneOf',
  predicates: readonly ts.Expression[],
): ts.Expression => {
  if (context.diagnostic && (predicates.length > 1 || keyword === 'oneOf'))
    return call(identifier('_union'), [
      factory.createArrayLiteralExpression(predicates.map((predicate) => arrow([], predicate))),
      value,
      path,
      factory.createStringLiteral(keyword),
    ])
  if (keyword === 'anyOf') return or(predicates)
  const matches = predicates.map((predicate) => call(identifier('Number'), [predicate]))
  return equal(matches.slice(1).reduce<ts.Expression>(add, matches[0]!), number(1))
}

const and = (values: readonly ts.Expression[]): ts.Expression => {
  const useful = values.filter((value) => value.kind !== ts.SyntaxKind.TrueKeyword)
  if (useful.some((value) => value.kind === ts.SyntaxKind.FalseKeyword))
    return factory.createFalse()
  return useful.length === 0 ? factory.createTrue() : useful.reduce(logicalAnd)
}

const or = (values: readonly ts.Expression[]): ts.Expression => {
  const useful = values.filter((value) => value.kind !== ts.SyntaxKind.FalseKeyword)
  if (useful.some((value) => value.kind === ts.SyntaxKind.TrueKeyword)) return factory.createTrue()
  return useful.length === 0 ? factory.createFalse() : useful.reduce(logicalOr)
}

const logicalAnd = (left: ts.Expression, right: ts.Expression): ts.Expression =>
  binary(left, ts.SyntaxKind.AmpersandAmpersandToken, right)
const logicalOr = (left: ts.Expression, right: ts.Expression): ts.Expression =>
  binary(left, ts.SyntaxKind.BarBarToken, right)
const add = (left: ts.Expression, right: ts.Expression): ts.Expression =>
  binary(left, ts.SyntaxKind.PlusToken, right)
const equal = (left: ts.Expression, right: ts.Expression): ts.Expression =>
  binary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)
const notEqual = (left: ts.Expression, right: ts.Expression): ts.Expression =>
  binary(left, ts.SyntaxKind.ExclamationEqualsEqualsToken, right)
const binary = (
  left: ts.Expression,
  operator: ts.BinaryOperator,
  right: ts.Expression,
): ts.BinaryExpression => factory.createBinaryExpression(left, operator, right)
const not = (value: ts.Expression): ts.Expression =>
  factory.createPrefixUnaryExpression(ts.SyntaxKind.ExclamationToken, value)
const call = (expression: ts.Expression, args: readonly ts.Expression[]): ts.CallExpression =>
  factory.createCallExpression(expression, undefined, args)
const property = (expression: ts.Expression, name: string): ts.PropertyAccessExpression =>
  factory.createPropertyAccessExpression(expression, name)
const element = (
  expression: ts.Expression,
  key: string | number | ts.Expression,
): ts.ElementAccessExpression =>
  factory.createElementAccessExpression(
    expression,
    typeof key === 'string'
      ? factory.createStringLiteral(key)
      : typeof key === 'number'
        ? factory.createNumericLiteral(key)
        : key,
  )
const number = (value: number): ts.Expression =>
  value < 0
    ? factory.createPrefixUnaryExpression(
        ts.SyntaxKind.MinusToken,
        factory.createNumericLiteral(-value),
      )
    : factory.createNumericLiteral(value)
const arrayIsArray = (value: ts.Expression): ts.Expression =>
  call(property(identifier('Array'), 'isArray'), [value])
const objectKeys = (value: ts.Expression): ts.Expression =>
  call(property(identifier('Object'), 'keys'), [value])
const hasOwn = (object: ts.Expression, key: string): ts.Expression =>
  call(identifier('_hasOwn'), [object, factory.createStringLiteral(key)])
const regexp = (pattern: string): ts.Expression =>
  factory.createNewExpression(identifier('RegExp'), undefined, [
    factory.createStringLiteral(pattern),
    factory.createStringLiteral('u'),
  ])
const arrow = (parameters: readonly string[], body: ts.ConciseBody): ts.ArrowFunction =>
  factory.createArrowFunction(
    undefined,
    undefined,
    parameters.map((name) => factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body,
  )
const entriesEvery = (
  object: ts.Expression,
  predicate: ts.Expression,
  context: ValidatorContext,
): ts.Expression =>
  every(
    context,
    call(property(identifier('Object'), 'entries'), [object]),
    factory.createArrowFunction(
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          factory.createArrayBindingPattern([
            factory.createBindingElement(undefined, undefined, 'key'),
            factory.createBindingElement(undefined, undefined, 'item'),
          ]),
        ),
      ],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      predicate,
    ),
  )
const constant = (name: string, initializer: ts.Expression): ts.VariableStatement =>
  factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(name, undefined, undefined, initializer)],
      ts.NodeFlags.Const,
    ),
  )
const returnBoolean = (value: boolean): ts.ReturnStatement =>
  factory.createReturnStatement(value ? factory.createTrue() : factory.createFalse())
const unknownType = (): ts.KeywordTypeNode =>
  factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
const recordType = (): ts.TypeReferenceNode =>
  factory.createTypeReferenceNode('Record', [
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    unknownType(),
  ])

const validatePattern = (pattern: string, keyword: string): void => {
  try {
    new RegExp(pattern, 'u')
  } catch {
    throw new UnsupportedJsonSchemaError(keyword)
  }
}

const isRecord = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const schemaArray = (value: JsonValue | undefined): JsonSchemaDocument[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is JsonSchemaDocument => typeof item === 'boolean' || isRecord(item),
      )
    : []

const localReference = (
  reference: string,
  document: JsonSchemaDocument,
): JsonSchemaDocument | null => {
  if (reference === '#') return document
  if (!reference.startsWith('#/')) return null
  let current: JsonValue = document
  for (const encoded of reference.slice(2).split('/')) {
    if (!isRecord(current)) return null
    const next: JsonValue | undefined = current[encoded.replaceAll('~1', '/').replaceAll('~0', '~')]
    if (next === undefined) return null
    current = next
  }
  return typeof current === 'boolean' || isRecord(current) ? current : null
}

const ANNOTATION_KEYWORDS = new Set([
  '$anchor',
  '$comment',
  '$defs',
  '$id',
  '$schema',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',
  'default',
  'deprecated',
  'description',
  'examples',
  'format',
  'readOnly',
  'title',
  'writeOnly',
])

const ASSERTION_KEYWORDS = new Set([
  '$ref',
  'additionalProperties',
  'allOf',
  'anyOf',
  'const',
  'contains',
  'dependentRequired',
  'dependentSchemas',
  'else',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'if',
  'items',
  'maxContains',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minContains',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'multipleOf',
  'not',
  'oneOf',
  'pattern',
  'patternProperties',
  'prefixItems',
  'properties',
  'propertyNames',
  'required',
  'then',
  'type',
  'uniqueItems',
])

const assertKeywords = (schema: { [key: string]: JsonValue }): void => {
  for (const keyword of Object.keys(schema)) {
    if (!ANNOTATION_KEYWORDS.has(keyword) && !ASSERTION_KEYWORDS.has(keyword)) {
      throw new UnsupportedJsonSchemaError(keyword)
    }
  }
}
