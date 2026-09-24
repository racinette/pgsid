import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { EvalExpressionBackend } from '../../../sql-semantics/eval-expressions.js'
import type { EmittedEvalExpression } from '../../../sql-semantics/eval-expressions.js'
import { compilePostgresRegex } from '../../../sql-semantics/regex/compiler.js'
import { parseRegexpLikeFlags } from '../../../sql-semantics/regex/flags.js'
import { REGEX_ENGINE_PROFILES } from '../../../sql-semantics/regex/profiles.generated.js'

const call = (name: string, operands: readonly ts.Expression[] = []): ts.Expression =>
  factory.createCallExpression(identifier(name), undefined, operands)

function sqlValueType(type: string): { type: ts.TypeNode; helpers: readonly string[] } {
  if (type === 'pg_catalog.bool')
    return { type: factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword), helpers: [] }
  if (/^pg_catalog\.int[248]$/.test(type) || type === 'pg_catalog."char"')
    return { type: factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword), helpers: [] }
  if (/^pg_catalog\.float[48]$/.test(type))
    return { type: factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), helpers: [] }
  const named =
    type === 'pg_catalog."numeric"'
      ? 'SqlDecimal'
      : type === 'pg_catalog.uuid'
        ? 'SqlUuid'
        : type === 'pg_catalog."json"'
          ? 'SqlJson'
          : type === 'pg_catalog.jsonb'
            ? 'SqlJsonb'
            : type === 'pg_catalog.date'
              ? 'SqlDate'
              : type === 'pg_catalog."time"'
                ? 'SqlTime'
                : type === 'pg_catalog."timestamp"'
                  ? 'SqlTimestamp'
                  : type === 'pg_catalog.timestamptz'
                    ? 'SqlTimestamptz'
                    : type === 'pg_catalog.timetz'
                      ? 'SqlTimeTz'
                      : type === 'pg_catalog."interval"'
                        ? 'SqlInterval'
                        : type.startsWith('enum:')
                          ? 'SqlEnum'
                          : type.startsWith('array:')
                            ? 'SqlArray'
                            : null
  if (named) return { type: factory.createTypeReferenceNode(named), helpers: [named] }
  if (
    [
      'pg_catalog.text',
      'pg_catalog."varchar"',
      'pg_catalog.bpchar',
      'pg_catalog.name',
      'pg_catalog.bytea',
      'pg_catalog."bit"',
      'pg_catalog.varbit',
    ].includes(type)
  )
    return { type: factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), helpers: [] }
  throw new Error(`Unsupported partial SQL value type: ${type}`)
}

const uncertain = (type: string): ts.Expression =>
  factory.createCallExpression(identifier('evalValueUncertain'), [sqlValueType(type).type], [])

const lifted = (operand: EmittedEvalExpression<ts.Expression>): ts.Expression =>
  operand.effect === 'partial' ? operand.expression : call('evalValueCertain', [operand.expression])

const thunk = (expression: ts.Expression): ts.ArrowFunction =>
  factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    expression,
  )

export const typescriptEvalBackend: EvalExpressionBackend<ts.Expression> = {
  certain: (_type, expression) => ({
    expression: call('evalValueCertain', [expression]),
    helpers: ['evalValueCertain'],
  }),
  uncertain: (type) => ({
    expression: uncertain(type),
    helpers: ['evalValueUncertain', ...sqlValueType(type).helpers],
  }),
  call: (type, operands, emitTotal) => {
    const statements: ts.Statement[] = operands.map((operand, index) =>
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              identifier(`argument${index}`),
              undefined,
              undefined,
              operand.expression,
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    )
    const raw = operands.map((operand, index) => {
      const variable = identifier(`argument${index}`)
      if (operand.effect === 'partial') {
        statements.push(
          factory.createIfStatement(
            factory.createPrefixUnaryExpression(
              ts.SyntaxKind.ExclamationToken,
              factory.createPropertyAccessExpression(variable, 'certain'),
            ),
            factory.createBlock([factory.createReturnStatement(uncertain(type))], true),
          ),
        )
      }
      return {
        type: operand.type,
        expression:
          operand.effect === 'partial'
            ? factory.createPropertyAccessExpression(variable, 'value')
            : variable,
      }
    })
    const result = emitTotal(raw)
    if (result.value.type !== type) throw new Error('Partial callable result type mismatch')
    statements.push(
      factory.createReturnStatement(call('evalValueCertain', [result.value.expression])),
    )
    const expression = factory.createCallExpression(
      factory.createParenthesizedExpression(
        factory.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          factory.createBlock(statements, true),
        ),
      ),
      undefined,
      [],
    )
    return {
      expression,
      helpers: [
        ...result.helpers,
        'evalValueCertain',
        'evalValueUncertain',
        ...sqlValueType(type).helpers,
      ],
    }
  },
  logic: (operation, operands) => ({
    expression: call(
      operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
      operation === 'not'
        ? [lifted(operands[0]!)]
        : operands.map((operand) => thunk(lifted(operand))),
    ),
    helpers: [
      operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
      ...(operands.some((operand) => operand.effect === 'total') ? ['evalValueCertain'] : []),
    ],
  }),
  nullTest: (operand, negated) => ({
    expression: call('evalValueNullTest', [
      lifted(operand),
      negated ? factory.createTrue() : factory.createFalse(),
    ]),
    helpers: ['evalValueNullTest', ...(operand.effect === 'total' ? ['evalValueCertain'] : [])],
  }),
  coalesce: (type, operands) => ({
    expression: factory.createCallExpression(
      identifier('evalValueCoalesce'),
      [sqlValueType(type).type],
      operands.map((operand) => thunk(lifted(operand))),
    ),
    helpers: [
      'evalValueCoalesce',
      ...sqlValueType(type).helpers,
      ...(operands.some((operand) => operand.effect === 'total') ? ['evalValueCertain'] : []),
    ],
  }),
  case: (type, branches, otherwise) => ({
    expression: factory.createCallExpression(
      identifier('evalValueCase'),
      [sqlValueType(type).type],
      [
        thunk(lifted(otherwise)),
        ...branches.map((branch) =>
          factory.createArrayLiteralExpression([
            thunk(lifted(branch.when)),
            thunk(lifted(branch.then)),
          ]),
        ),
      ],
    ),
    helpers: [
      'evalValueCase',
      ...sqlValueType(type).helpers,
      ...([otherwise, ...branches.flatMap((branch) => [branch.when, branch.then])].some(
        (operand) => operand.effect === 'total',
      )
        ? ['evalValueCertain']
        : []),
    ],
  }),
  regexCount: (operands, pattern, flags) => {
    const dynamic = pattern === undefined || (operands.length === 4 && flags === undefined)
    const parsedFlags = !dynamic ? parseRegexpLikeFlags(flags ?? '') : undefined
    const compiled =
      !dynamic && parsedFlags?.kind === 'valid'
        ? compilePostgresRegex(pattern, REGEX_ENGINE_PROFILES.ecmascript, parsedFlags.options)
        : undefined
    const mode = dynamic
      ? 'dynamic'
      : parsedFlags?.kind === 'invalid'
        ? 'invalid-flags'
        : compiled!.kind
    const statements: ts.Statement[] = operands.map((operand, index) =>
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              identifier(`argument${index}`),
              undefined,
              undefined,
              operand.expression,
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    )
    for (const [index, operand] of operands.entries())
      if (operand.effect === 'partial')
        statements.push(
          factory.createIfStatement(
            factory.createPrefixUnaryExpression(
              ts.SyntaxKind.ExclamationToken,
              factory.createPropertyAccessExpression(identifier(`argument${index}`), 'certain'),
            ),
            factory.createBlock(
              [factory.createReturnStatement(uncertain('pg_catalog.int4'))],
              true,
            ),
          ),
        )
    const raw = (index: number): ts.Expression => {
      const operand = operands[index]
      if (!operand)
        return index === 2 ? factory.createBigIntLiteral('1n') : factory.createStringLiteral('')
      const value = identifier(`argument${index}`)
      return operand.effect === 'partial'
        ? factory.createPropertyAccessExpression(value, 'value')
        : value
    }
    statements.push(
      factory.createReturnStatement(
        call(dynamic ? 'evalRegexCountDynamic' : 'evalRegexCount', [
          raw(0),
          raw(1),
          raw(2),
          raw(3),
          factory.createStringLiteral(mode),
          factory.createStringLiteral(compiled?.kind === 'supported' ? compiled.source : ''),
          factory.createStringLiteral(
            compiled?.kind === 'supported' ? compiled.flags.join('') : '',
          ),
        ]),
      ),
    )
    return {
      expression: factory.createCallExpression(
        factory.createParenthesizedExpression(
          factory.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            factory.createBlock(statements, true),
          ),
        ),
        undefined,
        [],
      ),
      helpers: [
        dynamic ? 'evalRegexCountDynamic' : 'evalRegexCount',
        ...(operands.some((operand) => operand.effect === 'partial') ? ['evalValueUncertain'] : []),
      ],
    }
  },
}
