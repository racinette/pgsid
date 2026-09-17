import ts from 'typescript'
import type { JsonSchemaDocument } from '../../config/schema.js'
import { exportModifier, factory as f, identifier as id, parseType } from './ast.js'
import type { TypescriptJsonSchemaTypes } from './json-schema-types.js'
import {
  deepEqualDeclaration,
  hasOwnDeclaration,
  typescriptJsonSchemaCheckExpression,
} from './json-schema-validator.js'
import { diagnosticHelperDeclarations } from './validation-diagnostics.js'

export interface JsonSchemaLocation {
  pointer: string
  schema: JsonSchemaDocument
}

export function typescriptJsonSchemaLocations(document: JsonSchemaDocument): JsonSchemaLocation[] {
  const locations: JsonSchemaLocation[] = []
  const visit = (value: unknown, pointer: string): void => {
    if (
      typeof value !== 'boolean' &&
      (value === null || typeof value !== 'object' || Array.isArray(value))
    )
      return
    const schema = value as JsonSchemaDocument
    locations.push({ schema, pointer })
    if (typeof schema === 'boolean') return
    for (const keyword of [
      'properties',
      'patternProperties',
      '$defs',
      'definitions',
      'dependentSchemas',
      'dependencies',
    ]) {
      const children = schema[keyword]
      if (children && typeof children === 'object' && !Array.isArray(children))
        for (const [key, child] of Object.entries(children))
          visit(child, `${pointer}/${keyword}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
      const children = schema[keyword]
      if (Array.isArray(children))
        children.forEach((child, index) => visit(child, `${pointer}/${keyword}/${index}`))
    }
    for (const keyword of [
      'items',
      'additionalItems',
      'additionalProperties',
      'unevaluatedProperties',
      'unevaluatedItems',
      'contains',
      'not',
      'if',
      'then',
      'else',
      'propertyNames',
    ])
      visit(schema[keyword], `${pointer}/${keyword}`)
  }
  visit(document, '')
  return locations
}

export function typescriptJsonSchemaValidatorGraph(
  document: JsonSchemaDocument,
  graph: TypescriptJsonSchemaTypes,
  type: (name: string) => ts.TypeNode,
): ts.Statement[] {
  const locations = typescriptJsonSchemaLocations(document)
  const nodes: JsonSchemaDocument[] = []
  const indices = new Map<JsonSchemaDocument, number>()
  const index = (schema: JsonSchemaDocument): number => {
    const existing = indices.get(schema)
    if (existing !== undefined) return existing
    const next = nodes.length
    indices.set(schema, next)
    nodes.push(schema)
    return next
  }
  for (const location of locations) index(location.schema)
  const named = graph.declarations.map((entry) => ({
    entry,
    index: index(
      typeof entry.schema === 'object' &&
        typeof entry.sourceSchema === 'object' &&
        JSON.stringify(entry.schema) === JSON.stringify(entry.sourceSchema)
        ? entry.sourceSchema
        : entry.schema,
    ),
  }))
  const helpers = new Set(['_check', '_probe', '_union', '_include'])
  const patterns = new Map<string, { name: string; expression: ts.NewExpression }>()
  const stateful = <T extends ts.Node>(node: T): T => {
    const result = ts.transform(node, [
      (context) => {
        const visit: ts.Visitor = (node) => {
          if (
            ts.isNewExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'RegExp'
          ) {
            const key = JSON.stringify(
              node.arguments?.map((argument) =>
                ts.isStringLiteral(argument) ? argument.text : '',
              ),
            )
            let pattern = patterns.get(key)
            if (!pattern) {
              pattern = { name: `_pattern${patterns.size}`, expression: node }
              patterns.set(key, pattern)
            }
            return id(pattern.name)
          }
          let visited = ts.visitEachChild(node, visit, context)
          if (ts.isArrowFunction(visited)) {
            const body = visited.body
            const unused = (name: ts.BindingName): ts.BindingName => {
              if (ts.isIdentifier(name))
                return usesIdentifier([body], name.text) ? name : id(`_${name.text}`)
              if (ts.isArrayBindingPattern(name))
                return f.updateArrayBindingPattern(
                  name,
                  name.elements.map((element) =>
                    ts.isBindingElement(element)
                      ? f.updateBindingElement(
                          element,
                          element.dotDotDotToken,
                          element.propertyName,
                          unused(element.name),
                          element.initializer,
                        )
                      : element,
                  ),
                )
              return name
            }
            visited = f.updateArrowFunction(
              visited,
              visited.modifiers,
              visited.typeParameters,
              visited.parameters.map((parameter) =>
                f.updateParameterDeclaration(
                  parameter,
                  parameter.modifiers,
                  parameter.dotDotDotToken,
                  unused(parameter.name),
                  parameter.questionToken,
                  parameter.type,
                  parameter.initializer,
                ),
              ),
              visited.type,
              visited.equalsGreaterThanToken,
              body,
            )
          }
          if (
            ts.isCallExpression(visited) &&
            ts.isIdentifier(visited.expression) &&
            helpers.has(visited.expression.text)
          )
            return f.updateCallExpression(visited, visited.expression, visited.typeArguments, [
              ...visited.arguments,
              id('_issues'),
            ])
          return visited
        }
        return (node) => ts.visitNode(node, visit) as T
      },
    ])
    const transformed = result.transformed[0] as T
    result.dispose()
    return transformed
  }
  const dependencies = nodes.map(() => new Set<number>())
  const plans = nodes.flatMap((schema, nodeIndex) =>
    [false, true].map((diagnostic) => {
      const predicate = stateful(
        typescriptJsonSchemaCheckExpression(
          schema,
          document,
          diagnostic,
          (child, value, _document, path) => {
            const childIndex = indices.get(child)
            if (childIndex === undefined) return undefined
            dependencies[nodeIndex]!.add(childIndex)
            return call(
              id(`${diagnostic ? '_validate' : '_is'}${childIndex}`),
              diagnostic ? [value, path, id('_active'), id('_issues')] : [value, id('_active')],
            )
          },
        ),
      )
      return { predicate, diagnostic, nodeIndex }
    }),
  )
  const isRecursive = (start: number): boolean => {
    const visited = new Set<number>()
    const reachesStart = (node: number): boolean => {
      if (visited.has(node)) return false
      visited.add(node)
      return [...dependencies[node]!].some((next) => next === start || reachesStart(next))
    }
    return reachesStart(start)
  }
  const checks = plans.map(({ predicate, diagnostic, nodeIndex }) => {
    const recursive = isRecursive(nodeIndex)
    const cycle = diagnostic
      ? call(id('_check'), [
          f.createFalse(),
          id('value'),
          id('path'),
          string('$ref'),
          string('acyclic value'),
          id('_issues'),
        ])
      : f.createFalse()
    return fn(
      `${diagnostic ? '_validate' : '_is'}${nodeIndex}`,
      [
        parameter(
          recursive || usesIdentifier([predicate], 'value') ? 'value' : '_value',
          unknown(),
        ),
        ...(diagnostic
          ? [
              parameter(
                recursive || usesIdentifier([predicate], 'path') ? 'path' : '_path',
                pathType(),
              ),
            ]
          : []),
        parameter('_active', activeType()),
        ...(diagnostic ? [parameter('_issues', issuesType())] : []),
      ],
      boolean(),
      recursive
        ? [
            constant(
              'active',
              f.createBinaryExpression(
                call(member(id('_active'), 'get'), [f.createNumericLiteral(nodeIndex)]),
                ts.SyntaxKind.QuestionQuestionToken,
                f.createNewExpression(id('Set'), [unknown()], []),
              ),
            ),
            f.createIfStatement(
              call(member(id('active'), 'has'), [id('value')]),
              f.createReturnStatement(cycle),
            ),
            statement(
              call(member(id('_active'), 'set'), [f.createNumericLiteral(nodeIndex), id('active')]),
            ),
            statement(call(member(id('active'), 'add'), [id('value')])),
            f.createTryStatement(
              f.createBlock([f.createReturnStatement(predicate)], true),
              undefined,
              f.createBlock([statement(call(member(id('active'), 'delete'), [id('value')]))], true),
            ),
          ]
        : [f.createReturnStatement(predicate)],
    )
  })
  const validators = nodes.map((_, nodeIndex) =>
    constant(
      `_schema${nodeIndex}`,
      f.createObjectLiteralExpression(
        [
          f.createPropertyAssignment(
            'is',
            arrow(
              [parameter('value', unknown())],
              boolean(),
              call(id(`_is${nodeIndex}`), [id('value'), newActive()]),
            ),
          ),
          f.createPropertyAssignment(
            'validate',
            arrow(
              [parameter('value', unknown())],
              resultType(),
              f.createBlock(
                [
                  constant('_issues', f.createArrayLiteralExpression(), issuesType()),
                  constant(
                    'valid',
                    call(id(`_validate${nodeIndex}`), [
                      id('value'),
                      f.createArrayLiteralExpression(),
                      newActive(),
                      id('_issues'),
                    ]),
                  ),
                  f.createReturnStatement(
                    f.createObjectLiteralExpression([
                      f.createShorthandPropertyAssignment('valid'),
                      f.createPropertyAssignment('issues', id('_issues')),
                    ]),
                  ),
                ],
                true,
              ),
            ),
          ),
        ],
        true,
      ),
    ),
  )
  const declarations = [
    f.createImportDeclaration(
      undefined,
      f.createImportClause(
        true,
        undefined,
        f.createNamedImports([
          f.createImportSpecifier(false, id('ValidationIssue'), id('_ValidationIssue')),
          f.createImportSpecifier(false, id('ValidationResult'), id('_ValidationResult')),
        ]),
      ),
      string('./pgsid/validation.js'),
    ),
    f.createImportDeclaration(
      undefined,
      f.createImportClause(
        false,
        undefined,
        f.createNamedImports(
          [...helpers, '_hasOwn', '_deepEqual']
            .filter((name) => usesIdentifier(checks, name))
            .map((name) => f.createImportSpecifier(false, undefined, id(name))),
        ),
      ),
      string('./pgsid/json-schema.js'),
    ),
    ...checks,
    ...validators,
    constant(
      'schemaValidators',
      f.createObjectLiteralExpression(
        locations.map(({ schema, pointer }) =>
          f.createPropertyAssignment(string(pointer), id(`_schema${indices.get(schema)!}`)),
        ),
        true,
      ),
      undefined,
      true,
    ),
    ...named.flatMap(({ entry, index }) =>
      [false, true].map((diagnostic) =>
        fn(
          `${diagnostic ? 'validate' : 'is'}${entry.name}`,
          [parameter('value', unknown())],
          diagnostic
            ? resultType()
            : f.createTypePredicateNode(undefined, 'value', type(entry.name)),
          [
            f.createReturnStatement(
              call(member(id(`_schema${index}`), diagnostic ? 'validate' : 'is'), [id('value')]),
            ),
          ],
          true,
        ),
      ),
    ),
  ]
  return [
    ...declarations.filter(ts.isImportDeclaration),
    ...[...patterns.values()].map(({ name, expression }) => constant(name, expression)),
    ...declarations.filter((declaration) => !ts.isImportDeclaration(declaration)),
  ]
}

export function typescriptJsonSchemaValidationHelpers(): ts.Statement[] {
  const helpers = new Set(['_check', '_probe', '_union', '_include'])
  const diagnostics = diagnosticHelperDeclarations()
    .filter(ts.isFunctionDeclaration)
    .map((helper) => {
      const result = ts.transform(helper, [
        (context) => {
          const visit: ts.Visitor = (node) => {
            const visited = ts.visitEachChild(node, visit, context)
            return ts.isCallExpression(visited) &&
              ts.isIdentifier(visited.expression) &&
              helpers.has(visited.expression.text)
              ? f.updateCallExpression(visited, visited.expression, visited.typeArguments, [
                  ...visited.arguments,
                  id('_issues'),
                ])
              : visited
          }
          return (node) => ts.visitNode(node, visit) as ts.FunctionDeclaration
        },
      ])
      const transformed = result.transformed[0] as ts.FunctionDeclaration
      result.dispose()
      return f.updateFunctionDeclaration(
        transformed,
        [exportModifier],
        transformed.asteriskToken,
        transformed.name,
        transformed.typeParameters,
        [...transformed.parameters, parameter('_issues', issuesType())],
        transformed.type,
        transformed.body,
      )
    })
  return [
    f.createImportDeclaration(
      undefined,
      f.createImportClause(
        true,
        undefined,
        f.createNamedImports([
          f.createImportSpecifier(false, id('ValidationIssue'), id('_ValidationIssue')),
        ]),
      ),
      string('./validation.js'),
    ),
    ...[hasOwnDeclaration(), deepEqualDeclaration()].map((declaration) =>
      f.updateVariableStatement(declaration, [exportModifier], declaration.declarationList),
    ),
    ...diagnostics,
  ]
}

const usesIdentifier = (nodes: readonly ts.Node[], name: string): boolean => {
  const visit = (node: ts.Node): boolean =>
    (ts.isIdentifier(node) && node.text === name) || (ts.forEachChild(node, visit) ?? false)
  return nodes.some(visit)
}

const string = (value: string) => f.createStringLiteral(value)
const unknown = () => f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
const boolean = () => f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
const pathType = () => parseType('readonly (string | number)[]')
const activeType = () => parseType('Map<number, Set<unknown>>')
const issuesType = () => f.createArrayTypeNode(f.createTypeReferenceNode('_ValidationIssue'))
const resultType = () => f.createTypeReferenceNode('_ValidationResult')
const member = (value: ts.Expression, key: string) => f.createPropertyAccessExpression(value, key)
const call = (value: ts.Expression, args: readonly ts.Expression[]) =>
  f.createCallExpression(value, undefined, args)
const statement = (value: ts.Expression) => f.createExpressionStatement(value)
const parameter = (name: string, type: ts.TypeNode) =>
  f.createParameterDeclaration(undefined, undefined, name, undefined, type)
const newActive = () =>
  f.createNewExpression(
    id('Map'),
    [f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), parseType('Set<unknown>')],
    [],
  )
const constant = (name: string, value: ts.Expression, type?: ts.TypeNode, exported = false) =>
  f.createVariableStatement(
    exported ? [exportModifier] : undefined,
    f.createVariableDeclarationList(
      [f.createVariableDeclaration(name, undefined, type, value)],
      ts.NodeFlags.Const,
    ),
  )
const fn = (
  name: string,
  parameters: ts.ParameterDeclaration[],
  type: ts.TypeNode,
  body: ts.Statement[],
  exported = false,
) =>
  f.createFunctionDeclaration(
    exported ? [exportModifier] : undefined,
    undefined,
    name,
    undefined,
    parameters,
    type,
    f.createBlock(body, true),
  )
const arrow = (parameters: ts.ParameterDeclaration[], type: ts.TypeNode, body: ts.ConciseBody) =>
  f.createArrowFunction(
    undefined,
    undefined,
    parameters,
    type,
    f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body,
  )
