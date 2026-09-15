import ts from 'typescript'
import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { JsonSchemaLineage } from '../shared/json-schema-lineage.js'
import { exportModifier, factory, identifier, parseType, printNode } from './ast.js'

export interface GenerateTypescriptJsonSchemaValidatorOptions {
  document?: JsonSchemaDocument
  nullable?: boolean
}

export class UnsupportedJsonSchemaError extends Error {
  constructor(readonly keyword: string) {
    super(`Unsupported JSON Schema assertion: ${keyword}`)
    this.name = 'UnsupportedJsonSchemaError'
  }
}

export function typescriptJsonSchemaValidatorDeclaration(
  name: string,
  type: ts.TypeNode | string,
  schema: JsonSchemaDocument,
  options: GenerateTypescriptJsonSchemaValidatorOptions = {},
): ts.FunctionDeclaration {
  const value = identifier('value')
  const predicate = compile(schema, value, options.document ?? schema, new Set())
  return validatorDeclaration(
    name,
    typeof type === 'string' ? parseType(type) : type,
    options.nullable ? or([equal(value, factory.createNull()), predicate]) : predicate,
  )
}

export function typescriptJsonSchemaLineageValidatorDeclaration(
  name: string,
  type: ts.TypeNode | string,
  lineage: JsonSchemaLineage,
  options: Pick<GenerateTypescriptJsonSchemaValidatorOptions, 'nullable'> = {},
): ts.FunctionDeclaration | null {
  if (
    !lineage.complete ||
    lineage.alternatives.length === 0 ||
    lineage.alternatives.some((alternative) => !alternative.runtimeValidation)
  ) {
    return null
  }
  const value = identifier('value')
  const predicates = lineage.alternatives.map((alternative) =>
    alternative.representation === 'text'
      ? equal(factory.createTypeOfExpression(value), factory.createStringLiteral('string'))
      : compile(alternative.schema, value, alternative.document, new Set()),
  )
  return validatorDeclaration(
    name,
    typeof type === 'string' ? parseType(type) : type,
    options.nullable ? or([equal(value, factory.createNull()), or(predicates)]) : or(predicates),
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
  options: Pick<GenerateTypescriptJsonSchemaValidatorOptions, 'nullable'> = {},
): string | null {
  const declaration = typescriptJsonSchemaLineageValidatorDeclaration(name, type, lineage, options)
  return declaration ? printNode(declaration) : null
}

const validatorDeclaration = (
  name: string,
  type: ts.TypeNode,
  predicate: ts.Expression,
): ts.FunctionDeclaration =>
  factory.createFunctionDeclaration(
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
    factory.createTypePredicateNode(undefined, 'value', type),
    factory.createBlock(
      [hasOwnDeclaration(), deepEqualDeclaration(), factory.createReturnStatement(predicate)],
      true,
    ),
  )

const hasOwnDeclaration = (): ts.VariableStatement =>
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

const deepEqualDeclaration = (): ts.VariableStatement => {
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
): ts.Expression => {
  if (schema === true) return factory.createTrue()
  if (schema === false) return factory.createFalse()
  assertKeywords(schema)
  const predicates: ts.Expression[] = []

  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    if (seen.has(reference)) throw new UnsupportedJsonSchemaError(`recursive ${reference}`)
    const target = localReference(reference, document)
    if (target === null) throw new UnsupportedJsonSchemaError(`$ref ${reference}`)
    predicates.push(compile(target, value, document, new Set([...seen, reference])))
  }
  if (schema['const'] !== undefined) predicates.push(constantPredicate(value, schema['const']))
  if (Array.isArray(schema['enum'])) {
    predicates.push(or(schema['enum'].map((candidate) => constantPredicate(value, candidate))))
  }
  const declared = schema['type']
  if (typeof declared === 'string') predicates.push(typePredicate(value, declared))
  else if (Array.isArray(declared)) {
    predicates.push(
      or(
        declared
          .filter((type): type is string => typeof type === 'string')
          .map((type) => typePredicate(value, type)),
      ),
    )
  }

  predicates.push(
    ...schemaArray(schema['allOf']).map((candidate) =>
      compile(candidate, value, document, new Set(seen)),
    ),
  )
  const anyOf = schemaArray(schema['anyOf'])
  if (anyOf.length) {
    predicates.push(
      or(anyOf.map((candidate) => compile(candidate, value, document, new Set(seen)))),
    )
  }
  const oneOf = schemaArray(schema['oneOf'])
  if (oneOf.length) {
    const matches = oneOf.map((candidate) =>
      call(identifier('Number'), [compile(candidate, value, document, new Set(seen))]),
    )
    predicates.push(
      equal(
        matches.slice(1).reduce<ts.Expression>(add, matches[0]!),
        factory.createNumericLiteral(1),
      ),
    )
  }
  const negated = schema['not']
  if (typeof negated === 'boolean' || isRecord(negated)) {
    predicates.push(not(compile(negated, value, document, new Set(seen))))
  }
  const condition = schema['if']
  if (typeof condition === 'boolean' || isRecord(condition)) {
    const thenSchema = schema['then']
    const elseSchema = schema['else']
    predicates.push(
      factory.createConditionalExpression(
        compile(condition, value, document, new Set(seen)),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        typeof thenSchema === 'boolean' || isRecord(thenSchema)
          ? compile(thenSchema, value, document, new Set(seen))
          : factory.createTrue(),
        factory.createToken(ts.SyntaxKind.ColonToken),
        typeof elseSchema === 'boolean' || isRecord(elseSchema)
          ? compile(elseSchema, value, document, new Set(seen))
          : factory.createTrue(),
      ),
    )
  }
  predicates.push(...compileNumber(schema, value))
  predicates.push(...compileString(schema, value))
  predicates.push(...compileArray(schema, value, document, seen))
  predicates.push(...compileObject(schema, value, document, seen))
  return and(predicates)
}

const compileNumber = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
): ts.Expression[] => {
  const checks: ts.Expression[] = []
  for (const [keyword, operator] of [
    ['minimum', ts.SyntaxKind.GreaterThanEqualsToken],
    ['maximum', ts.SyntaxKind.LessThanEqualsToken],
    ['exclusiveMinimum', ts.SyntaxKind.GreaterThanToken],
    ['exclusiveMaximum', ts.SyntaxKind.LessThanToken],
  ] as const) {
    const limit = schema[keyword]
    if (typeof limit === 'number') checks.push(binary(value, operator, number(limit)))
  }
  const multiple = schema['multipleOf']
  if (typeof multiple === 'number') {
    checks.push(
      call(property(identifier('Number'), 'isInteger'), [
        binary(value, ts.SyntaxKind.SlashToken, number(multiple)),
      ]),
    )
  }
  return checks.length
    ? [
        or([
          notEqual(factory.createTypeOfExpression(value), factory.createStringLiteral('number')),
          and(checks),
        ]),
      ]
    : []
}

const compileString = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
): ts.Expression[] => {
  const checks: ts.Expression[] = []
  const length = property(
    factory.createArrayLiteralExpression([factory.createSpreadElement(value)]),
    'length',
  )
  if (typeof schema['minLength'] === 'number') {
    checks.push(binary(length, ts.SyntaxKind.GreaterThanEqualsToken, number(schema['minLength'])))
  }
  if (typeof schema['maxLength'] === 'number') {
    checks.push(binary(length, ts.SyntaxKind.LessThanEqualsToken, number(schema['maxLength'])))
  }
  const pattern = schema['pattern']
  if (typeof pattern === 'string') {
    validatePattern(pattern, 'pattern')
    checks.push(call(property(regexp(pattern), 'test'), [value]))
  }
  return checks.length
    ? [
        or([
          notEqual(factory.createTypeOfExpression(value), factory.createStringLiteral('string')),
          and(checks),
        ]),
      ]
    : []
}

const compileArray = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
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
      binary(
        property(array, 'length'),
        ts.SyntaxKind.GreaterThanEqualsToken,
        number(schema['minItems']),
      ),
    )
  }
  if (typeof schema['maxItems'] === 'number') {
    checks.push(
      binary(
        property(array, 'length'),
        ts.SyntaxKind.LessThanEqualsToken,
        number(schema['maxItems']),
      ),
    )
  }
  if (schema['uniqueItems'] === true) {
    checks.push(
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
    )
  }
  const prefix = schemaArray(schema['prefixItems'])
  prefix.forEach((candidate, index) => {
    checks.push(
      or([
        binary(property(array, 'length'), ts.SyntaxKind.LessThanEqualsToken, number(index)),
        compile(candidate, element(array, index), document, new Set(seen)),
      ]),
    )
  })
  const items = schema['items']
  if (typeof items === 'boolean' || isRecord(items)) {
    checks.push(
      call(property(call(property(array, 'slice'), [number(prefix.length)]), 'every'), [
        arrow(['item'], compile(items, identifier('item'), document, new Set(seen))),
      ]),
    )
  }
  const contains = schema['contains']
  if (typeof contains === 'boolean' || isRecord(contains)) {
    const count = property(
      call(property(array, 'filter'), [
        arrow(['item'], compile(contains, identifier('item'), document, new Set(seen))),
      ]),
      'length',
    )
    const minimum = typeof schema['minContains'] === 'number' ? schema['minContains'] : 1
    checks.push(binary(count, ts.SyntaxKind.GreaterThanEqualsToken, number(minimum)))
    if (typeof schema['maxContains'] === 'number') {
      checks.push(binary(count, ts.SyntaxKind.LessThanEqualsToken, number(schema['maxContains'])))
    }
  }
  return [or([not(arrayIsArray(value)), and(checks)])]
}

const compileObject = (
  schema: { [key: string]: JsonValue },
  value: ts.Expression,
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
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
  checks.push(...required.map((name) => hasOwn(object, name)))
  const properties = isRecord(schema['properties']) ? schema['properties'] : {}
  for (const [name, schemaValue] of Object.entries(properties)) {
    if (typeof schemaValue !== 'boolean' && !isRecord(schemaValue)) continue
    checks.push(
      or([
        not(hasOwn(object, name)),
        compile(schemaValue, element(object, name), document, new Set(seen)),
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
        and(
          patterns.map(([pattern, candidate]) =>
            or([
              not(call(property(regexp(pattern), 'test'), [identifier('key')])),
              compile(candidate, identifier('item'), document, new Set(seen)),
            ]),
          ),
        ),
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
          compile(additional, identifier('item'), document, new Set(seen)),
        ]),
      ),
    )
  }
  const propertyNames = schema['propertyNames']
  if (typeof propertyNames === 'boolean' || isRecord(propertyNames)) {
    checks.push(
      call(property(objectKeys(object), 'every'), [
        arrow(['key'], compile(propertyNames, identifier('key'), document, new Set(seen))),
      ]),
    )
  }
  const dependentRequired = isRecord(schema['dependentRequired']) ? schema['dependentRequired'] : {}
  for (const [name, dependencies] of Object.entries(dependentRequired)) {
    if (!Array.isArray(dependencies)) continue
    checks.push(
      or([
        not(hasOwn(object, name)),
        and(
          dependencies
            .filter((dependency): dependency is string => typeof dependency === 'string')
            .map((dependency) => hasOwn(object, dependency)),
        ),
      ]),
    )
  }
  const dependentSchemas = isRecord(schema['dependentSchemas']) ? schema['dependentSchemas'] : {}
  for (const [name, dependent] of Object.entries(dependentSchemas)) {
    if (typeof dependent !== 'boolean' && !isRecord(dependent)) continue
    checks.push(or([not(hasOwn(object, name)), compile(dependent, value, document, new Set(seen))]))
  }
  if (typeof schema['minProperties'] === 'number') {
    checks.push(
      binary(
        property(objectKeys(object), 'length'),
        ts.SyntaxKind.GreaterThanEqualsToken,
        number(schema['minProperties']),
      ),
    )
  }
  if (typeof schema['maxProperties'] === 'number') {
    checks.push(
      binary(
        property(objectKeys(object), 'length'),
        ts.SyntaxKind.LessThanEqualsToken,
        number(schema['maxProperties']),
      ),
    )
  }
  return [
    factory.createConditionalExpression(
      typePredicate(value, 'object'),
      factory.createToken(ts.SyntaxKind.QuestionToken),
      and(checks),
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
const entriesEvery = (object: ts.Expression, predicate: ts.Expression): ts.Expression =>
  call(property(call(property(identifier('Object'), 'entries'), [object]), 'every'), [
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
  ])
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
