import ts from 'typescript'
import { exportModifier, factory, identifier, parseType, readonlyModifier } from './ast.js'

export const validationIssueType = (): ts.TypeNode =>
  parseType(`{
    path: readonly (string | number)[];
    keyword: string;
    expected: unknown;
    received: string;
    message: string;
  }`)

export const validationResultType = (): ts.TypeNode =>
  factory.createTypeLiteralNode([
    field('valid', booleanType()),
    field('issues', factory.createArrayTypeNode(validationIssueType())),
  ])

export const diagnosticHelperDeclarations = (): ts.Statement[] => {
  const issues = identifier('_issues')
  const value = identifier('value')
  const path = identifier('path')
  const expected = identifier('expected')
  const received = identifier('received')
  const expectedText = conditional(
    equal(factory.createTypeOfExpression(expected), string('string')),
    expected,
    call(property(identifier('JSON'), 'stringify'), [expected]),
  )
  const messages = factory.createAsExpression(
    factory.createObjectLiteralExpression(
      Object.entries({
        required: 'Missing required property',
        dependentRequired: 'Missing dependent property',
        additionalProperties: 'Unexpected property',
        falseSchema: 'Value is forbidden by the schema',
        items: 'Additional array item is forbidden',
        prefixItems: 'Array item is forbidden',
        propertyNames: 'Property name is forbidden',
        uniqueItems: 'Array items must be unique',
        not: 'Value matches a forbidden schema',
        anyOf: 'No alternative matches',
        oneOf: 'Expected exactly one matching alternative',
      }).map(([keyword, message]) => factory.createPropertyAssignment(keyword, string(message))),
    ),
    parseType('Record<string, string>'),
  )
  const message = conditional(
    equal(identifier('keyword'), string('type')),
    join([string('Expected '), expectedText, string(', received '), received]),
    binary(
      factory.createElementAccessExpression(
        factory.createParenthesizedExpression(messages),
        identifier('keyword'),
      ),
      ts.SyntaxKind.QuestionQuestionToken,
      join([
        identifier('keyword'),
        string(': expected '),
        expectedText,
        string(', received '),
        received,
      ]),
    ),
  )
  const check = functionDeclaration(
    '_check',
    [
      parameter('valid', booleanType()),
      parameter('value', unknownType()),
      parameter('path', parseType('readonly (string | number)[]')),
      parameter('keyword', stringType()),
      parameter('expected', unknownType()),
    ],
    booleanType(),
    [
      factory.createIfStatement(
        identifier('valid'),
        factory.createReturnStatement(factory.createTrue()),
      ),
      constant(
        'received',
        conditional(
          equal(value, factory.createNull()),
          string('null'),
          conditional(
            call(property(identifier('Array'), 'isArray'), [value]),
            string('array'),
            factory.createTypeOfExpression(value),
          ),
        ),
      ),
      factory.createExpressionStatement(
        call(property(issues, 'push'), [
          factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
              'path',
              factory.createArrayLiteralExpression([factory.createSpreadElement(path)]),
            ),
            factory.createShorthandPropertyAssignment('keyword'),
            factory.createShorthandPropertyAssignment('expected'),
            factory.createShorthandPropertyAssignment('received'),
            factory.createPropertyAssignment('message', message),
          ]),
        ]),
      ),
      factory.createReturnStatement(factory.createFalse()),
    ],
  )
  const testType = parseType('() => boolean')
  const probe = functionDeclaration('_probe', [parameter('test', testType)], booleanType(), [
    constant('start', property(issues, 'length')),
    factory.createTryStatement(
      factory.createBlock([factory.createReturnStatement(call(identifier('test'), []))], true),
      undefined,
      factory.createBlock([assign(property(issues, 'length'), identifier('start'))], true),
    ),
  ])
  const union = functionDeclaration(
    '_union',
    [
      parameter('tests', factory.createArrayTypeNode(testType)),
      parameter('value', unknownType()),
      parameter('path', parseType('readonly (string | number)[]')),
      parameter('keyword', stringType()),
    ],
    booleanType(),
    [
      constant('start', property(issues, 'length')),
      variable('matches', factory.createNumericLiteral(0)),
      factory.createForOfStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration('test')],
          ts.NodeFlags.Const,
        ),
        identifier('tests'),
        factory.createBlock(
          [
            factory.createIfStatement(
              call(identifier('test'), []),
              factory.createBlock(
                [
                  factory.createExpressionStatement(
                    factory.createPostfixUnaryExpression(
                      identifier('matches'),
                      ts.SyntaxKind.PlusPlusToken,
                    ),
                  ),
                  factory.createIfStatement(
                    equal(identifier('keyword'), string('anyOf')),
                    factory.createBlock(
                      [
                        assign(property(issues, 'length'), identifier('start')),
                        factory.createReturnStatement(factory.createTrue()),
                      ],
                      true,
                    ),
                  ),
                ],
                true,
              ),
            ),
          ],
          true,
        ),
      ),
      factory.createIfStatement(
        equal(identifier('matches'), factory.createNumericLiteral(1)),
        factory.createBlock(
          [
            assign(property(issues, 'length'), identifier('start')),
            factory.createReturnStatement(factory.createTrue()),
          ],
          true,
        ),
      ),
      factory.createIfStatement(
        binary(
          identifier('matches'),
          ts.SyntaxKind.GreaterThanToken,
          factory.createNumericLiteral(0),
        ),
        assign(property(issues, 'length'), identifier('start')),
      ),
      factory.createReturnStatement(
        call(identifier('_check'), [
          factory.createFalse(),
          value,
          path,
          identifier('keyword'),
          conditional(
            equal(identifier('keyword'), string('oneOf')),
            string('exactly one matching alternative'),
            string('at least one matching alternative'),
          ),
        ]),
      ),
    ],
  )
  const prefixedIssues = call(property(property(identifier('result'), 'issues'), 'map'), [
    factory.createArrowFunction(
      undefined,
      undefined,
      [parameter('issue')],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createParenthesizedExpression(
        factory.createObjectLiteralExpression([
          factory.createSpreadAssignment(identifier('issue')),
          factory.createPropertyAssignment(
            'path',
            factory.createArrayLiteralExpression([
              factory.createSpreadElement(path),
              factory.createSpreadElement(property(identifier('issue'), 'path')),
            ]),
          ),
        ]),
      ),
    ),
  ])
  const include = functionDeclaration(
    '_include',
    [
      parameter('result', validationResultType()),
      parameter('path', parseType('readonly (string | number)[]')),
    ],
    booleanType(),
    [
      factory.createExpressionStatement(
        call(property(issues, 'push'), [factory.createSpreadElement(prefixedIssues)]),
      ),
      factory.createReturnStatement(property(identifier('result'), 'valid')),
    ],
  )
  return [
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            issues,
            undefined,
            factory.createArrayTypeNode(validationIssueType()),
            factory.createArrayLiteralExpression(),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    check,
    probe,
    union,
    include,
  ]
}

export const queryValidationErrorDeclarations = (): ts.Statement[] => {
  const issues = identifier('issues')
  return [
    factory.createTypeAliasDeclaration(
      [exportModifier],
      'ValidationIssue',
      undefined,
      validationIssueType(),
    ),
    factory.createClassDeclaration(
      [exportModifier],
      'QueryValidationError',
      undefined,
      [
        factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          factory.createExpressionWithTypeArguments(identifier('TypeError'), undefined),
        ]),
      ],
      [
        factory.createConstructorDeclaration(
          undefined,
          [
            factory.createParameterDeclaration(
              [readonlyModifier],
              undefined,
              'query',
              undefined,
              stringType(),
            ),
            factory.createParameterDeclaration(
              [readonlyModifier],
              undefined,
              'column',
              undefined,
              stringType(),
            ),
            factory.createParameterDeclaration(
              [readonlyModifier],
              undefined,
              'issues',
              undefined,
              parseType('readonly ValidationIssue[]'),
            ),
          ],
          factory.createBlock(
            [
              factory.createExpressionStatement(
                call(factory.createSuper(), [
                  join([
                    string('Invalid '),
                    identifier('query'),
                    string('.'),
                    identifier('column'),
                    string(': '),
                    call(
                      property(
                        call(property(issues, 'map'), [
                          factory.createArrowFunction(
                            undefined,
                            undefined,
                            [parameter('issue')],
                            undefined,
                            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                            join([
                              conditional(
                                property(property(identifier('issue'), 'path'), 'length'),
                                join([
                                  call(property(property(identifier('issue'), 'path'), 'join'), [
                                    string('.'),
                                  ]),
                                  string(': '),
                                ]),
                                string(''),
                              ),
                              property(identifier('issue'), 'message'),
                            ]),
                          ),
                        ]),
                        'join',
                      ),
                      [string('; ')],
                    ),
                  ]),
                ]),
              ),
              assign(property(factory.createThis(), 'name'), string('QueryValidationError')),
            ],
            true,
          ),
        ),
      ],
    ),
  ]
}

const field = (name: string, type: ts.TypeNode) =>
  factory.createPropertySignature(undefined, name, undefined, type)
const booleanType = () => factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
const unknownType = () => factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
const stringType = () => factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
const string = (value: string) => factory.createStringLiteral(value)
const parameter = (name: string, type?: ts.TypeNode) =>
  factory.createParameterDeclaration(undefined, undefined, name, undefined, type)
const property = (value: ts.Expression, name: string) =>
  factory.createPropertyAccessExpression(value, name)
const call = (callee: ts.Expression, args: readonly ts.Expression[]) =>
  factory.createCallExpression(callee, undefined, args)
const binary = (left: ts.Expression, kind: ts.BinaryOperator, right: ts.Expression) =>
  factory.createBinaryExpression(left, kind, right)
const equal = (left: ts.Expression, right: ts.Expression) =>
  binary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)
const join = (parts: readonly ts.Expression[]) =>
  parts.reduce((left, right) => binary(left, ts.SyntaxKind.PlusToken, right))
const conditional = (test: ts.Expression, yes: ts.Expression, no: ts.Expression) =>
  factory.createConditionalExpression(
    test,
    factory.createToken(ts.SyntaxKind.QuestionToken),
    yes,
    factory.createToken(ts.SyntaxKind.ColonToken),
    no,
  )
const assign = (left: ts.Expression, right: ts.Expression) =>
  factory.createExpressionStatement(binary(left, ts.SyntaxKind.EqualsToken, right))
const constant = (name: string, value: ts.Expression) => variable(name, value, ts.NodeFlags.Const)
const variable = (name: string, value: ts.Expression, flags = ts.NodeFlags.Let) =>
  factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(name, undefined, undefined, value)],
      flags,
    ),
  )
const functionDeclaration = (
  name: string,
  parameters: readonly ts.ParameterDeclaration[],
  type: ts.TypeNode,
  statements: readonly ts.Statement[],
) =>
  factory.createFunctionDeclaration(
    undefined,
    undefined,
    name,
    undefined,
    parameters,
    type,
    factory.createBlock(statements, true),
  )
